from rest_framework import viewsets, generics,permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
import calendar
from datetime import date
from django.db.models import Q
from rest_framework.views import APIView
from calendar import month_name
from .utils import calculate_worked_time, calculate_effective_time
from app.models import Attendance,Notification, ShiftPolicy, Employee, BreakLog,Payroll,CalendarEvent,EmpLeave
from .models import *
from .serializers import *





class CheckInAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not hasattr(user, 'role') or user.role != 'employee':
            return Response({"detail": "Unauthorized."}, status=403)

        try:
            employee = Employee.objects.get(email=user.email)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee record not found."}, status=404)

        tz = pytz.timezone('Asia/Kolkata')
        today = timezone.localdate()
        now_dt = timezone.localtime(timezone.now(), tz)

        existing = Attendance.objects.filter(employee=employee, date=today).first()
        if existing and existing.check_in:
            return Response({
                "detail": f"Already checked in at {existing.check_in.astimezone(tz).strftime('%H:%M:%S')}"
            }, status=400)

        shifts = ShiftPolicy.objects.all()
        selected_shift = None
        early_checkin_buffer = timedelta(hours=2)
        min_work_time = timedelta(hours=2)

        for shift in shifts:
            shift_start_dt = tz.localize(datetime.combine(today, shift.checkin))
            shift_end_dt = tz.localize(datetime.combine(today, shift.checkout))
            if shift.checkin > shift.checkout:
                shift_end_dt += timedelta(days=1)
            early_window_start = shift_start_dt - early_checkin_buffer
            if early_window_start <= now_dt < shift_end_dt:
                if shift_end_dt - now_dt >= min_work_time:
                    selected_shift = shift
                    break

        if not selected_shift:
            selected_shift = min(
                shifts,
                key=lambda s: (
                    (
                        tz.localize(datetime.combine(today, s.checkin)) - now_dt
                        if tz.localize(datetime.combine(today, s.checkin)) > now_dt
                        else tz.localize(datetime.combine(today + timedelta(days=1), s.checkin)) - now_dt
                    ).total_seconds()
                )
            )

        grace = selected_shift.grace()
        shift_start_dt = tz.localize(datetime.combine(today, selected_shift.checkin))
        if selected_shift.checkin > selected_shift.checkout and now_dt.time() < selected_shift.checkout:
            shift_start_dt -= timedelta(days=1)
        shift_start_with_grace = shift_start_dt + grace

        is_late = now_dt > shift_start_with_grace

        attendance = Attendance.objects.create(
            employee=employee,
            company=employee.company,
            shift=selected_shift,
            date=today,
            check_in=now_dt,
            is_present=True
        )

        serializer = EmployeeAttendanceSerializer(attendance)
        return Response({
            "detail": f"Checked in at {now_dt.strftime('%H:%M:%S')} for shift {selected_shift.shift_type}",
            "is_late": is_late,
            "attendance": serializer.data
        })


class CheckOutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not hasattr(user, 'role') or user.role != 'employee':
            return Response({"detail": "Unauthorized."}, status=403)

        try:
            employee = Employee.objects.get(email=user.email)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee not found."}, status=404)

        today = timezone.localdate()
        now_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata'))

        try:
            attendance = Attendance.objects.get(employee=employee, date=today)
        except Attendance.DoesNotExist:
            return Response({"detail": "No check-in record found for today."}, status=404)

        if attendance.check_out:
            return Response({"detail": "Already checked out today."}, status=400)

        attendance.check_out = now_dt
        attendance.calculate_work_duration()
        attendance.save()

        serializer = EmployeeAttendanceSerializer(attendance)
        return Response({
            "detail": f"Checked out at {now_dt.strftime('%H:%M:%S')}",
            "attendance": serializer.data
        })


class BreakAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        action = request.data.get('action')

        if not hasattr(user, 'role') or user.role != 'employee':
            return Response({"detail": "Unauthorized."}, status=403)

        if not action:
            return Response({"detail": "Action required."}, status=400)

        try:
            employee = Employee.objects.get(email=user.email)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee not found."}, status=404)

        today = timezone.localdate()
        now_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata'))

        attendance = Attendance.objects.filter(employee=employee, date=today).first()
        if not attendance or not attendance.check_in:
            return Response({"detail": "Cannot break without check-in."}, status=400)
        if attendance.check_out:
            return Response({"detail": "Already checked out. No break allowed."}, status=400)

        break_type = 'short' if action == 'shortbreak' else 'meal'

        # Start or end break logic
        active_break = BreakLog.objects.filter(
            employee=employee,
            end__isnull=True
        ).first()

        if not active_break:
            BreakLog.objects.create(
                employee=employee,
                break_type=break_type,
                start=now_dt
            )
            return Response({"detail": f"{break_type.capitalize()} break started."})
        else:
            active_break.end = now_dt
            active_break.save()

            duration = active_break.end - active_break.start
            attendance.calculate_work_duration()
            attendance.save()

            return Response({
                "detail": f"Break ended. Duration: {duration.total_seconds() // 60} mins",
                "break": BreakLogSerializer(active_break).data
            })



class DashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not hasattr(user, 'role') or user.role != 'employee':
            return Response({"detail": "Unauthorized. Employee role required."}, status=403)

        try:
            employee = Employee.objects.get(email=user.email)
            today = timezone.localdate()
            tz = pytz.timezone('Asia/Kolkata')
            now = timezone.localtime(timezone.now(), tz)

            attendance = Attendance.objects.filter(employee=employee, date=today).first()

            active_break = BreakLog.objects.filter(
                employee=employee,
                start__date=today,
                end__isnull=True
            ).first()

            recent_breaks = BreakLog.objects.filter(
                employee=employee,
                start__date=today,
                end__isnull=False
            ).order_by('-start')[:5]

            punch_in = attendance.check_in if attendance else None
            punch_out = attendance.check_out if attendance else None

            break_minutes = 0
            if attendance:
                breaks = BreakLog.objects.filter(attendance=attendance, end__isnull=False)
                break_minutes = sum(
                    int((b.end - b.start).total_seconds() // 60)
                    for b in breaks
                )

            is_late = False
            if attendance and punch_in and attendance.shift:
                grace = attendance.shift.grace_period or timedelta(minutes=15)
                shift_start = datetime.combine(today, attendance.shift.checkin)
                shift_start_aware = timezone.make_aware(shift_start, tz)
                if punch_in > (shift_start_aware + grace):
                    is_late = True

            overtime = None
            if attendance and punch_out and attendance.shift:
                shift_end = datetime.combine(today, attendance.shift.checkout)
                shift_end = timezone.make_aware(shift_end, tz)
                if punch_out > shift_end:
                    overtime_delta = punch_out - shift_end
                    overtime_minutes = overtime_delta.total_seconds() // 60
                    overtime = {
                        'hours': int(overtime_minutes // 60),
                        'minutes': int(overtime_minutes % 60),
                        'total': round(overtime_minutes / 60, 2)
                    }

            latest_payroll = Payroll.objects.filter(employee=employee).order_by('-payroll_date').first()
            latest_payroll_data = {
                'amount': latest_payroll.net_pay,
                'date': latest_payroll.payroll_date
            } if latest_payroll else None

            dashboard_data = {
                'employee_name': f"{employee.first_name} {employee.last_name}",

                'checkin_time': timezone.localtime(punch_in, tz).strftime('%H:%M:%S') if punch_in else None,
                'checkout_time': timezone.localtime(punch_out, tz).strftime('%H:%M:%S') if punch_out else None,
                'is_late': is_late,
                'total_worked': calculate_worked_time(punch_in, punch_out, now)[0],
                'effective_time': calculate_effective_time(punch_in, break_minutes, punch_out, now)['formatted'],
                'total_break_minutes': break_minutes,
                'shift_name': attendance.shift.shift_type if attendance and attendance.shift else 'Not assigned',
                'shift_timing': f"{attendance.shift.checkin.strftime('%H:%M')} - {attendance.shift.checkout.strftime('%H:%M')}" if attendance and attendance.shift else '--:--',
                'server_time': now.strftime('%Y-%m-%d %H:%M:%S'),
                'active_break': {
                    'type': active_break.break_type,
                    'start_time': timezone.localtime(active_break.start, tz).strftime('%H:%M:%S')
                } if active_break else None,
                'recent_breaks': [
                    {
                        'type': br.break_type,
                        'start_time': timezone.localtime(br.start, tz).strftime('%H:%M:%S'),
                        'end_time': timezone.localtime(br.end, tz).strftime('%H:%M:%S')
                    }
                    for br in recent_breaks
                ] if recent_breaks else None,
                'overtime': overtime,
                'latest_payroll': latest_payroll_data
            }

            return Response({"dashboard_data": dashboard_data})

        except Exception as e:
            return Response({"detail": f"Error: {str(e)}"}, status=500)

class NotificationListAPIView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        employee_profile = getattr(user, "employee_profile", None)
        if employee_profile:
            return Notification.objects.filter(company=employee_profile.company).order_by('-date')
        return Notification.objects.none()

class AttendanceHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        selected_month = int(request.GET.get('month', today.month))
        selected_year = int(request.GET.get('year', today.year))

        tz = pytz.timezone('Asia/Kolkata')

        try:
            employee = Employee.objects.get(email=request.user.email)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee not found."}, status=404)

        start_date = datetime(selected_year, selected_month, 1).date()
        if selected_month == 12:
            end_date = datetime(selected_year + 1, 1, 1).date() - timedelta(days=1)
        else:
            end_date = datetime(selected_year, selected_month + 1, 1).date() - timedelta(days=1)

        # Attendance records
        attendances = Attendance.objects.filter(
            employee=employee,
            date__range=(start_date, end_date)
        ).select_related('shift').prefetch_related('break_logs')

        # Approved leaves
        approved_leaves = EmpLeave.objects.filter(
            employee=employee,
            status='Approved',
            from_date__lte=end_date,
            to_date__gte=start_date
        )

        approved_leave_days = set()
        for leave in approved_leaves:
            for i in range((leave.to_date - leave.from_date).days + 1):
                approved_leave_days.add(leave.from_date + timedelta(days=i))

        # Index by date
        att_map = {att.date: att for att in attendances}

        # Monthly stats
        monthly_data = []
        stats = {
            'present': 0,
            'absent': 0,
            'leave': 0,
            'half_day': 0,
            'late': 0,
            'working_days': 0
        }

        day = start_date
        while day <= end_date:
            is_weekend = day.weekday() >= 5
            status = 'absent'
            is_late = False
            late_duration = None
            total_hours = None
            overtime_hours = None
            break_time = '-'

            att = att_map.get(day)

            if is_weekend:
                status = 'weekend'
            elif day in approved_leave_days:
                status = 'leave'
                stats['leave'] += 1
            elif att and att.check_in:
                # Calculate work duration
                check_out = att.check_out or timezone.localtime(timezone.now(), tz)
                work_duration = (check_out - att.check_in).total_seconds() / 3600

                if att.break_logs.exists():
                    total_break = sum(
                        (b.end - b.start).total_seconds()
                        for b in att.break_logs.all() if b.end and b.start
                    )
                    work_duration -= total_break / 3600

                total_hours = round(work_duration, 2)

                # Shift rules
                if att.shift:
                    grace = att.shift.grace_period or timedelta(minutes=0)
                    shift_start = timezone.make_aware(datetime.combine(day, att.shift.checkin), tz)
                    if att.check_in > (shift_start + grace):
                        is_late = True
                        late_delta = att.check_in - (shift_start + grace)
                        late_duration = str(late_delta).split('.')[0]  # Format as HH:MM:SS

                    full_day_hours = att.shift.full_day_hours()
                    half_day_hours = att.shift.half_day_hours()

                    if work_duration >= full_day_hours:
                        status = 'present'
                        stats['present'] += 1
                    elif work_duration >= half_day_hours:
                        status = 'half_day'
                        stats['half_day'] += 1
                        stats['present'] += 0.5
                        stats['absent'] += 0.5
                    else:
                        status = 'absent'
                        stats['absent'] += 1
                else:
                    status = 'present'
                    stats['present'] += 1

                if att.overtime_duration:
                    overtime_hours = round(att.overtime_duration.total_seconds() / 3600, 2)

            else:
                if not is_weekend and status not in ['leave']:
                    status = 'absent'
                    stats['absent'] += 1

            if is_late and status == 'present':
                stats['late'] += 1

            if att and att.total_work_duration:
                break_time = str(att.total_work_duration)

            monthly_data.append({
                'date': str(day),
                'day_name': day.strftime('%A'),  # NEW: Monday, Tuesday, etc.
                'check_in': att.check_in.astimezone(tz).strftime('%H:%M:%S') if att and att.check_in else '-',
                'check_out': att.check_out.astimezone(tz).strftime('%H:%M:%S') if att and att.check_out else '-',
                'shift': str(att.shift) if att and att.shift else '-',  # Or format shift times if needed
                'is_weekend': is_weekend,
                'status': status,
                'is_late': is_late,
                'late_duration': late_duration,
                'total_hours': total_hours if total_hours is not None else '-',
                'overtime_hours': overtime_hours if overtime_hours is not None else '-',
                'break_time': break_time,
            })


            if not is_weekend:
                stats['working_days'] += 1

            day += timedelta(days=1)

        return Response({
            'months': [{'value': i, 'name': month_name[i]} for i in range(1, 13)],
            'years': list(range(today.year - 5, today.year + 6)),
            'selected_month': selected_month,
            'selected_year': selected_year,
            'selected_month_name': month_name[selected_month],
            'monthly_data': monthly_data,
            'summary': stats
        })

class EmployeeCalendarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        year = int(request.GET.get('year', today.year))
        month = int(request.GET.get('month', today.month))
        day = int(request.GET.get('day', today.day))
        current_date = date(year, month, day)

        cal = calendar.Calendar(firstweekday=6)
        month_days = cal.monthdayscalendar(year, month)

        weeks = []
        for week_days in month_days:
            week = []
            for day_num in week_days:
                if day_num == 0:
                    week.append({'day': ''})
                    continue

                day_date = date(year, month, day_num)

                admin_events = CalendarEvent.objects.filter(date=day_date)
                personal_events = PersonalCalendar.objects.filter(date=day_date, created_by=request.user)

                week.append({
                    'day': day_num,
                    'date': str(day_date),
                    'admin_events': [{'id': e.id, 'title': e.title} for e in admin_events],
                    'personal_events': [{'id': e.id, 'title': e.name} for e in personal_events],
                    'is_today': day_date == today,
                    'is_selected': day_date == current_date
                })
            weeks.append(week)

        prev_month = (current_date.replace(day=1) - timedelta(days=1))
        next_month = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1)

        return Response({
            'current_date': str(current_date),
            'weeks': weeks,
            'prev_month': {'year': prev_month.year, 'month': prev_month.month},
            'next_month': {'year': next_month.year, 'month': next_month.month},
        })

    def post(self, request):
        serializer = PersonalCalendarSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk=None):
        if not pk:
            return Response({'error': 'Event ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = PersonalCalendar.objects.get(id=pk, created_by=request.user)
        except PersonalCalendar.DoesNotExist:
            return Response({'error': 'Event not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PersonalCalendarSerializer(event, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    def delete(self, request, pk=None):
            if not pk:
                return Response({'error': 'Event ID is required'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                event = PersonalCalendar.objects.get(id=pk, created_by=request.user)
                event.delete()
                return Response({'message': 'Event deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
            except PersonalCalendar.DoesNotExist:
                return Response({'error': 'Event not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)

    
class TaskListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Task.objects.none()  # Return empty queryset for docs
        
        manager = user.employee_profile
        
        if user.role != 'manager':
            return Task.objects.none()  # Or raise PermissionDenied
        
        return Task.objects.filter(created_by=manager, parent_task__isnull=True)
        
    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_authenticated or user.role != 'manager':
            raise PermissionDenied("Only managers can create tasks.")
            
        manager = user.employee_profile
        serializer.save(created_by=manager)

class TaskDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Task.objects.none()
            
        manager = user.employee_profile
        return Task.objects.filter(created_by=manager)

class TaskAssignAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskAssignmentSerializer

    def post(self, request, pk):
        user = request.user
        manager = user.employee_profile
        task = get_object_or_404(Task, id=pk, created_by=manager)

        owner_id = request.data.get('owner')
        employee_ids = request.data.get('employees', [])
        
        if user.role != 'manager':
           return Response({"detail": "Only managers can assign tasks."}, status=403)

        if str(owner_id) not in employee_ids:
            return Response({"detail": "Owner must be in employees."}, status=status.HTTP_400_BAD_REQUEST)

        TaskAssignment.objects.filter(task=task).delete()
        for emp_id in employee_ids:
            emp = get_object_or_404(Employee, id=emp_id, reporting_manager=manager)
            role = 'owner' if str(emp_id) == str(owner_id) else 'contributor'
            TaskAssignment.objects.create(task=task, employee=emp, role=role)

        return Response({"detail": "Assignments updated successfully."})


class SubTaskAssignAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        manager = getattr(user, 'employee_profile', None)
        subtask = get_object_or_404(Task, id=pk, created_by=manager)

        owner_id = request.data.get('owner')
        contributor_ids = request.data.get('contributors', [])

        if user.role != 'manager':
            return Response({"detail": "Only managers can assign tasks."}, status=403)

        if not owner_id or not contributor_ids:
            return Response({"detail": "Owner and contributors are required."}, status=status.HTTP_400_BAD_REQUEST)

        if str(owner_id) not in contributor_ids:
            return Response({"detail": "Owner must be a contributor."}, status=status.HTTP_400_BAD_REQUEST)

        TaskAssignment.objects.filter(task=subtask).delete()
        for emp_id in contributor_ids:
            emp = get_object_or_404(Employee, id=emp_id, reporting_manager=manager)
            role = 'owner' if str(emp_id) == str(owner_id) else 'contributor'
            TaskAssignment.objects.create(task=subtask, employee=emp, role=role)

        return Response({"detail": "Subtask assignments updated."})


class MyTasksAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskAssignmentSerializer

    def get_queryset(self):
        user = self.request.user
        emp = user.employee_profile
        return emp.task_assignments.select_related('task').all()


class UpdateAssignmentStatusAPIView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskAssignmentSerializer
    queryset = TaskAssignment.objects.all()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.employee != request.user.employee_profile:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        instance.status = new_status
        instance.save()

        new_task_status = instance.task.compute_status_from_assignments()
        instance.task.status = new_task_status
        instance.task.save()

        return Response({"detail": "Assignment status updated."})

class EmpLeaveListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EmpLeaveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        emp = self.request.user.employee_profile
        return EmpLeave.objects.filter(employee=emp).order_by('-created_at')

    def perform_create(self, serializer):
        emp = self.request.user.employee_profile
        serializer.save(
            company=emp.company,
            employee=emp,
            reporting_manager=emp.reporting_manager
        )

class LeaveListAPIView(generics.ListAPIView):
    serializer_class = LeaveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        emp = self.request.user.employee_profile
        return Leave.objects.filter(company=emp.company)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request  # required for dynamic count
        return context


class EmpLeaveListAPIView(generics.ListAPIView):
    serializer_class = EmpLeaveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        manager = self.request.user.employee_profile
        return EmpLeave.objects.filter(reporting_manager=manager)


class ApproveEmpLeaveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, leave_id):
        manager = request.user.employee_profile
        leave = get_object_or_404(EmpLeave, id=leave_id, reporting_manager=manager)
        if leave.status != 'Approved':
            leave.status = 'Approved'
            leave.save()
            return Response({'detail': 'Leave approved.'})
        return Response({'detail': 'Already approved.'})


class RejectEmpLeaveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, leave_id):
        manager = request.user.employee_profile
        leave = get_object_or_404(EmpLeave, id=leave_id, reporting_manager=manager)
        if leave.status != 'Rejected':
            leave.status = 'Rejected'
            leave.save()
            return Response({'detail': 'Leave rejected.'})
        return Response({'detail': 'Already rejected.'})
