from rest_framework import viewsets, generics,permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
import calendar
from datetime import date
from django.db.models import Q,Prefetch
from rest_framework.views import APIView
from calendar import month_name
from .utils import calculate_worked_time, calculate_effective_time
import re
from app.models import Attendance,Notification,LearningCorner, ShiftPolicy, Employee, BreakLog,Payroll,CalendarEvent,EmpLeave,CompanyPolicies,Level,Designation
from .models import *
from .serializers import *


class EmployeeCompanyInfoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = getattr(request.user, "employee_profile", None)
        if not employee or not employee.company:
            return Response({"detail": "No company linked."}, status=404)
        company = employee.company
        return Response({
            "company_id": company.id,
            "company_name": company.name,
            "company_logo_url": request.build_absolute_uri(company.logo.url) if company.logo else None
        })

class EmployeeIdAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            employee = Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            return Response({'detail': 'Employee profile not found.'}, status=404)
        serializer = ReportingManagerSerializer(employee)
        return Response(serializer.data)
    
class ReportingManagerAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        manager_id = request.query_params.get('manager_id')

        if manager_id:
            # Fetch reportees for given manager
            employees = Employee.objects.filter(reporting_manager_id=manager_id)
        else:
            # Fetch distinct reporting managers
            manager_ids = (
                Employee.objects.exclude(reporting_manager__isnull=True)
                .values_list('reporting_manager_id', flat=True)
                .distinct()
            )
            employees = Employee.objects.filter(id__in=manager_ids)

        serializer = ReportingManagerSerializer(employees, many=True)
        return Response(serializer.data)


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

            # Break minutes calculation (fix: always sum all breaks for today for this employee)
            breaks = BreakLog.objects.filter(
                employee=employee,
                start__date=today,
                end__isnull=False
            )
            break_minutes = sum(
                int((b.end - b.start).total_seconds() // 60)
                for b in breaks
            )

            # Late check-in logic
            is_late = False
            if attendance and punch_in and attendance.shift:
                grace = attendance.shift.grace_period or timedelta(minutes=15)
                shift_start = datetime.combine(today, attendance.shift.checkin)
                shift_start_aware = tz.localize(shift_start)

                if punch_in > (shift_start_aware + grace):
                    is_late = True

            # Overtime calculation
            overtime = None
            if attendance and punch_out and attendance.shift:
                shift_start_time = attendance.shift.checkin
                shift_end_time = attendance.shift.checkout

                shift_start_dt = datetime.combine(today, shift_start_time)
                shift_end_dt = datetime.combine(today, shift_end_time)

                # If overnight shift (e.g., 9 PM to 6 AM)
                if shift_start_time > shift_end_time:
                    shift_end_dt += timedelta(days=1)

                shift_end_aware = tz.localize(shift_end_dt)

                if punch_out > shift_end_aware:
                    overtime_delta = punch_out - shift_end_aware
                    overtime_minutes = overtime_delta.total_seconds() // 60
                    overtime = {
                        'hours': int(overtime_minutes // 60),
                        'minutes': int(overtime_minutes % 60),
                        'total': round(overtime_minutes / 60, 2)
                    }

            # Latest payroll
            latest_payroll = Payroll.objects.filter(employee=employee).order_by('-payroll_date').first()
            latest_payroll_data = {
                'amount': latest_payroll.net_pay,
                'date': latest_payroll.payroll_date
            } if latest_payroll else None

            dashboard_data = {
                'employee_name': f"{employee.first_name} {employee.last_name}",
                'employee_photo': request.build_absolute_uri(employee.photo.url) if employee.photo else None,

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
                        'type': active_break.break_config.get_break_choice_display() if active_break.break_config else None,
                        'break_config_id': active_break.break_config.id if active_break.break_config else None,
                        'start_time': timezone.localtime(active_break.start, tz).strftime('%H:%M:%S')
                    } if active_break else None,
                'recent_breaks': [
                        {
                            'type': br.break_config.get_break_choice_display() if br.break_config else None,
                            'break_config_id': br.break_config.id if br.break_config else None,
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
                if att.check_out:
                    check_out = att.check_out
                    check_in = att.check_in
                    # Get all completed breaks for this employee for this day
                    breaks = BreakLog.objects.filter(
                        employee=employee,
                        start__date=day,
                        end__isnull=False
                    )
                    total_break = sum(
                        (b.end - b.start).total_seconds()
                        for b in breaks if b.end and b.start
                    )
                    work_duration = (check_out - check_in).total_seconds() / 3600
                    work_duration -= total_break / 3600
                    total_hours = round(work_duration, 2)
                    # Shift rules
                    if att.shift:
                        grace = att.shift.grace_period or timedelta(minutes=15)
                        shift_start_naive = datetime.combine(day, att.shift.checkin)
                        shift_start_aware = tz.localize(shift_start_naive)
                        check_in_local = check_in.astimezone(tz)
                        if check_in_local > (shift_start_aware + grace):
                            is_late = True
                            late_delta = check_in_local - (shift_start_aware + grace)
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
                    break_time = f'{int(total_break // 60)} min' if total_break else '-'
                else:
                    # Checked in but not checked out: show status as 'checked_in', and calculate late
                    status = 'checked_in'
                    break_time = '-'
                    if att.shift:
                        grace = att.shift.grace_period or timedelta(minutes=15)
                        shift_start_naive = datetime.combine(day, att.shift.checkin)
                        shift_start_aware = tz.localize(shift_start_naive)
                        check_in_local = att.check_in.astimezone(tz)
                        if check_in_local > (shift_start_aware + grace):
                            is_late = True
                            late_delta = check_in_local - (shift_start_aware + grace)
                            late_duration = str(late_delta).split('.')[0]
            else:
                if not is_weekend and status not in ['leave']:
                    status = 'absent'
                    stats['absent'] += 1

            if is_late and status in ['present', 'half_day', 'checked_in']:
                stats['late'] += 1

            monthly_data.append({
                'date': str(day),
                'day_name': day.strftime('%A'),
                'check_in': att.check_in.astimezone(tz).strftime('%H:%M:%S') if att and att.check_in else '-',
                'check_out': att.check_out.astimezone(tz).strftime('%H:%M:%S') if att and att.check_out else '-',
                'shift': str(att.shift) if att and att.shift else '-',
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
                    'admin_events': [{'id': e.id, 'title': e.name} for e in admin_events],
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
            return Task.objects.none()

        # Ensure the logged-in user is linked to an employee profile
        try:
            manager = user.employee_profile
        except Employee.DoesNotExist:
            return Task.objects.none()

        # Allow listing only if they have reporting employees (manager role check)
        if not Employee.objects.filter(reporting_manager=manager).exists():
            return Task.objects.none()

        return Task.objects.filter(created_by=manager, parent_task__isnull=True)

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_authenticated:
            raise PermissionDenied("You must be logged in.")

        manager = user.employee_profile

        if not Employee.objects.filter(reporting_manager=manager).exists():
            raise PermissionDenied("Only reporting managers can create tasks.")

        serializer.save(created_by=manager, request_user=user)


class TaskDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Task.objects.none()

        manager = user.employee_profile
        # Return all tasks (including subtasks) created by this manager
        return Task.objects.filter(created_by=manager)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Update subtasks status if provided
        subtasks_data = request.data.get('subtasks', None)
        if subtasks_data:
            for subtask_data in subtasks_data:
                subtask_id = subtask_data.get('id', None)
                if subtask_id:
                    try:
                        subtask = Task.objects.get(id=subtask_id, parent_task=instance)
                        new_status = subtask_data.get('status', subtask.status)
                        if new_status != subtask.status:
                            subtask.status = new_status
                            subtask.save()
                    except Task.DoesNotExist:
                        # You can log or handle this case if needed
                        pass

        return Response(serializer.data)
class UpdateStatusByManagerAPIView(APIView):
    permission_classes = [IsAuthenticated]

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        user_employee = getattr(request.user, "employee_profile", None)

        try:
            parent_task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return Response({"detail": "Parent task not found."}, status=status.HTTP_404_NOT_FOUND)

        # Permission: Only creator (manager) can update
        if parent_task.created_by != user_employee:
            return Response({"detail": "Permission denied on parent task."}, status=status.HTTP_403_FORBIDDEN)

        # Update parent task status if provided
        parent_status = request.data.get('status')
        if parent_status:
            parent_task.status = parent_status
            parent_task.save()

        # Update subtasks statuses if provided
        subtasks_data = request.data.get('subtasks', [])
        for subtask_data in subtasks_data:
            subtask_id = subtask_data.get('id')
            subtask_status = subtask_data.get('status')
            if not (subtask_id and subtask_status):
                continue

            try:
                subtask = Task.objects.get(id=subtask_id, parent_task=parent_task)
            except Task.DoesNotExist:
                continue

            # Permission: Only creator (manager) can update subtask
            if subtask.created_by != user_employee:
                continue  # Skip subtasks not created by manager

            subtask.status = subtask_status
            subtask.save()

        serializer = TaskSerializer(parent_task, context={'request': request})
        return Response(serializer.data)

class TaskAssignAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskAssignmentSerializer

    def post(self, request, pk):
        user = request.user

        try:
            manager = user.employee_profile
        except Employee.DoesNotExist:
            return Response(
                {"detail": "You are not linked to an employee profile."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Ensure the manager created the task
        task = get_object_or_404(Task, id=pk, created_by=manager)

        owner_id = request.data.get('owner')
        employee_ids = request.data.get('employees', [])

        if str(owner_id) not in [str(eid) for eid in employee_ids]:
            return Response({"detail": "Owner must be in employees."}, status=status.HTTP_400_BAD_REQUEST)

        # Remove old assignments
        TaskAssignment.objects.filter(task=task).delete()

        # Create new assignments
        assignments = []
        for emp_id in employee_ids:
            emp = get_object_or_404(Employee, id=emp_id, reporting_manager=manager)
            role = 'owner' if str(emp_id) == str(owner_id) else 'contributor'
            assignment = TaskAssignment.objects.create(task=task, employee=emp, role=role)
            assignments.append(assignment)

        # Serialize with request context to get full avatar URL
        serializer = self.get_serializer(assignments, many=True, context={'request': request})

        return Response({
            "detail": "Assignments updated successfully.",
            "assigned_employees": serializer.data
        }, status=status.HTTP_200_OK)


class SubTaskAssignAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user

        # Ensure the logged-in user is linked to an Employee profile
        manager = getattr(user, 'employee_profile', None)
        if not manager:
            return Response({"detail": "You are not linked to an employee profile."}, status=status.HTTP_403_FORBIDDEN)

        # Ensure this subtask is created by the logged-in manager
        subtask = get_object_or_404(Task, id=pk, created_by=manager)

        owner_id = request.data.get('owner')
        contributor_ids = request.data.get('contributors', [])

        if not owner_id or not contributor_ids:
            return Response({"detail": "Owner and contributors are required."}, status=status.HTTP_400_BAD_REQUEST)

        if str(owner_id) not in [str(cid) for cid in contributor_ids]:
            return Response({"detail": "Owner must be a contributor."}, status=status.HTTP_400_BAD_REQUEST)

        # Delete existing assignments for this subtask
        TaskAssignment.objects.filter(task=subtask).delete()

        # Create assignments
        for emp_id in contributor_ids:
            emp = get_object_or_404(Employee, id=emp_id, reporting_manager=manager)
            role = 'owner' if str(emp_id) == str(owner_id) else 'contributor'
            TaskAssignment.objects.create(task=subtask, employee=emp, role=role)

        return Response({"detail": "Subtask assignments updated successfully."})
    
    def patch(self, request, pk):
            user = request.user
            manager = getattr(user, 'employee_profile', None)
            if not manager:
                return Response({"detail": "You are not linked to an employee profile."}, status=status.HTTP_403_FORBIDDEN)

            subtask = get_object_or_404(Task, id=pk, created_by=manager)
            owner_id = request.data.get('owner')
            contributor_ids = request.data.get('contributors', [])

            if not owner_id or not contributor_ids:
                return Response({"detail": "Owner and contributors are required."}, status=status.HTTP_400_BAD_REQUEST)

            if str(owner_id) not in [str(cid) for cid in contributor_ids]:
                return Response({"detail": "Owner must be a contributor."}, status=status.HTTP_400_BAD_REQUEST)

            TaskAssignment.objects.filter(task=subtask).delete()
            for emp_id in contributor_ids:
                emp = get_object_or_404(Employee, id=emp_id, reporting_manager=manager)
                role = 'owner' if str(emp_id) == str(owner_id) else 'contributor'
                TaskAssignment.objects.create(task=subtask, employee=emp, role=role)

            return Response({"detail": "Subtask assignments updated successfully."})


class MyTasksAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MyTaskSerializer

    def get_queryset(self):
        user = self.request.user
        emp = user.employee_profile

        # Filter subtasks assigned to this employee
        employee_subtasks = (
            Task.objects.filter(
                parent_task__isnull=False,
                assignments__employee=emp
            )
            .select_related('parent_task')
            .prefetch_related(
                Prefetch('assignments', queryset=TaskAssignment.objects.select_related('employee'))
            )
        )

        # Main tasks assigned to this employee OR having assigned subtasks
        queryset = (
            Task.objects.filter(
                Q(assignments__employee=emp) |
                Q(subtasks__assignments__employee=emp)
            )
            .filter(parent_task__isnull=True)  # Only main tasks
            .prefetch_related(
                Prefetch(
                    'subtasks',
                    queryset=employee_subtasks.distinct(),
                    to_attr='employee_subtasks'
                ),
                Prefetch('assignments', queryset=TaskAssignment.objects.select_related('employee'))
            )
            .select_related('created_by')
            .distinct()
        )

        return queryset


class UpdateAssignmentStatusAPIView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskAssignmentStatusUpdateSerializer
    queryset = TaskAssignment.objects.all()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        task = instance.task
        user_employee = getattr(request.user, "employee_profile", None)

        # --- Permission checks ---
        is_assigned_person = instance.employee == user_employee
        is_manager = task.created_by == user_employee
        is_owner_or_contributor = TaskAssignment.objects.filter(
            task=task, employee=user_employee
        ).exists()

        if not (is_assigned_person or is_manager or is_owner_or_contributor):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        # --- Update status ---
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # --- Recalculate task status ---
        new_task_status = task.compute_status_from_assignments()
        task.status = new_task_status
        task.save()

        return Response({"detail": "Assignment status updated."})


class EmpLeaveListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EmpLeaveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        emp = self.request.user.employee_profile
        return EmpLeave.objects.filter(employee=emp).order_by('-created_at')

    def perform_create(self, serializer):
        emp = self.request.user.employee_profile
        start_date = serializer.validated_data.get("from_date")
        end_date = serializer.validated_data.get("to_date")

        # Check if leave already exists in the given date range
        exists = EmpLeave.objects.filter(
            employee=emp,
            from_date__lte=end_date,
            to_date__gte=start_date
        ).exists()

        if exists:
            raise Exception("Leave already exists for the given dates.")

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

class CancelEmpLeaveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, leave_id):
        emp = request.user.employee_profile
        leave = get_object_or_404(EmpLeave, id=leave_id, employee=emp)

        if leave.status not in ["Pending", "Approved"]:
            return Response(
                {"detail": "Only pending or approved leaves can be cancelled."},
                status=400
            )

        if leave.status == "Pending":
            leave.delete()
            return Response({"detail": "Pending leave request cancelled and removed."})

        if leave.status == "Approved":            
            leave.status = "Cancelled"
            leave.save()
            return Response({"detail": "Approved leave has been cancelled."})
    
class EmpLearningCornerAPIView(generics.ListAPIView):
    serializer_class = EmpLearningCornerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        employee_profile = getattr(user, "employee_profile", None)
        if employee_profile:
            return LearningCorner.objects.filter(company=employee_profile.company)
        return LearningCorner.objects.none()

class EmployeeProfileAPIView(generics.RetrieveUpdateAPIView):
    queryset = Employee.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return EmployeeUpdateSerializer
        return EmployeeDetailSerializer

    def get_object(self):
        return Employee.objects.get(user=self.request.user)
    
    
class BreakLogAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = request.user.employee_profile
        configs = BreakConfig.objects.filter(company=employee.company, enabled=True)
        serializer = EmployeeBreakConfigSerializer(configs, many=True)
        return Response(serializer.data)

    def post(self, request):
        
        employee = request.user.employee_profile
        break_config_id = request.data.get("break_config_id")
        action = request.data.get("action")  # "start" or "end"

        break_config = get_object_or_404(
            BreakConfig, 
            id=break_config_id, 
            company=employee.company, 
            enabled=True
        )

        if action == "start":
            # Prevent starting a new break if one is active
            active_break = BreakLog.objects.filter(
                employee=employee, 
                end__isnull=True
            ).first()
            if active_break:
                return Response({"detail": "You already have an active break."}, status=400)

            break_log = BreakLog.objects.create(
                    employee=employee,
                    break_config=break_config,  
                    start=timezone.now()
                )
            return Response(EmployeeBreakLogSerializer(break_log).data, status=201)

        elif action == "end":
            active_break = BreakLog.objects.filter(
                employee=employee, 
                break_config=break_config, 
                end__isnull=True
            ).first()
            if not active_break:
                return Response({"detail": "No active break found."}, status=400)

            active_break.end = timezone.now()
            if active_break.start:
                diff = active_break.end - active_break.start
                active_break.duration_minutes = int(diff.total_seconds() // 60)
            active_break.save()

            return Response(EmployeeBreakLogSerializer(active_break).data)

        else:
            return Response({"detail": "Invalid action. Use 'start' or 'end'."}, status=400)

class EmployeeCompanyPoliciesAPIView(generics.ListAPIView):
    serializer_class = PolicyConfigurationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return CompanyPolicies.objects.filter(company=user.company,is_active=True)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context


class EmployeeHierarchyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def extract_level_number(self, level_name):
        match = re.search(r'(\d+)', level_name)
        return int(match.group(1)) if match else None

    def get(self, request):
        user = request.user
        try:
            employee = Employee.objects.select_related('level', 'designation', 'reporting_manager').get(user=user)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found.'}, status=404)

        # Current employee info
        current_level = employee.level
        current_designation = employee.designation

        # Reporting manager info
        reporting_manager = getattr(employee, 'reporting_manager', None)
        reportees = []
        if reporting_manager:
            # Get reportees for this manager (excluding the current employee)
            reportees_qs = Employee.objects.filter(reporting_manager=reporting_manager).exclude(id=employee.id)
            reportees = [
                {
                    'id': rep.id,
                    'name': rep.full_name,
                    'designation': rep.designation.designation_name if rep.designation else None,
                }
                for rep in reportees_qs
            ]
            manager_info = {
                'name': reporting_manager.full_name,
                'level': reporting_manager.level.level_name if reporting_manager.level else None,
                'designation': reporting_manager.designation.designation_name if reporting_manager.designation else None,
                'reportees': reportees,
            }
        else:
            # If no reporting manager (e.g., CEO), get direct reportees for this employee
            reportees_qs = Employee.objects.filter(reporting_manager=employee)
            reportees = [
                {
                    'id': rep.id,
                    'name': rep.full_name,
                    'designation': rep.designation.designation_name if rep.designation else None,
                }
                for rep in reportees_qs
            ]
            manager_info = None

        # Higher authority (next higher level by numeric order in level name)
        current_level_number = self.extract_level_number(current_level.level_name) if current_level else None
        all_levels = Level.objects.filter(company=employee.company)
        higher_levels = [
            lvl for lvl in all_levels
            if self.extract_level_number(lvl.level_name) is not None and self.extract_level_number(lvl.level_name) < current_level_number
        ] if current_level_number is not None else []

        next_higher_level = max(higher_levels, key=lambda lvl: self.extract_level_number(lvl.level_name)) if higher_levels else None

        if next_higher_level:
            # Get all designations for this level
            designations = Designation.objects.filter(level=next_higher_level)
            employees_at_level = Employee.objects.filter(company=employee.company, level=next_higher_level)
            if employees_at_level.count() == 1:
                higher_emp = employees_at_level.first()
                higher_info = {
                    'level': next_higher_level.level_name,
                    'employee_name': higher_emp.full_name,
                    'designation': higher_emp.designation.designation_name if higher_emp.designation else None,
                }
            else:
                # If multiple employees, show level and designation only
                higher_info = {
                    'level': next_higher_level.level_name,
                    'designation': designations.first().designation_name if designations.exists() else None,
                    'employee_count': employees_at_level.count(),
                }
        else:
            higher_info = None

        response_data = {
            'employee': {
                'name': employee.full_name,
                'level': current_level.level_name if current_level else None,
                'designation': current_designation.designation_name if current_designation else None,
            },
            'reporting_manager': manager_info,
            'higher_authority': higher_info,
        }
        # If the current employee has no reporting manager, add their reportees to the response
        if not reporting_manager:
            response_data['reportees'] = reportees
        return Response(response_data)