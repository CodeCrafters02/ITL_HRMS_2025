from rest_framework import viewsets, generics,permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
import calendar
from datetime import date
from django.db.models import Q, Prefetch, Max, Exists, OuterRef
from rest_framework.views import APIView
from calendar import month_name
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.pagination import PageNumberPagination

class EmployeePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
from .utils import calculate_worked_time, calculate_effective_time
import re
from app.models import (
    Attendance,
    Notification,
    LearningCorner,
    LearningCornerMedia,
    ShiftPolicy,
    Employee,
    BreakLog,
    Payroll,
    CalendarEvent,
    EmpLeave,
    CompanyPolicies,
    Level,
    Designation,
    DepartmentWiseWorkingDays,
)
from .models import *
from .serializers import *

def get_short_break_daily_quota_minutes(company):
    """
    Company-level daily short-break quota configured in Break Config.
    """
    configured_max = (
        BreakConfig.objects.filter( company=company, enabled=True,break_choice='short_break',
            max_short_break_daily_minutes__isnull=False,).aggregate(max_daily=Max('max_short_break_daily_minutes')).get('max_daily')or 0)
    return int(configured_max)


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


class EmployeeAnnouncementsAPIView(generics.ListAPIView):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        employee = getattr(self.request.user, "employee_profile", None)
        if not employee or not employee.company_id:
            return Announcement.objects.none()
        qs = Announcement.objects.filter(company_id=employee.company_id, is_active=True)
        limit = self.request.query_params.get("limit")
        if limit:
            try:
                limit_i = int(limit)
                if 0 < limit_i <= 50:
                    return qs[:limit_i]
            except Exception:
                pass
        return qs


class TimeLogMetaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = getattr(request.user, "employee_profile", None)
        if not employee or not employee.company_id:
            return Response({"detail": "No company linked."}, status=404)
        projects = Project.objects.filter(company_id=employee.company_id, is_active=True).order_by("name")
        return Response(
            {
                "projects": ProjectSerializer(projects, many=True).data,
            }
        )


class TimeLogListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = getattr(request.user, "employee_profile", None)
        if not employee:
            return Response({"detail": "Employee not found."}, status=404)
        date_str = request.query_params.get("date")
        if date_str:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except Exception:
                return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        else:
            target_date = timezone.localdate()

        qs = TimeEntry.objects.filter(employee_id=employee.id, date=target_date).select_related("project")
        return Response({"date": str(target_date), "entries": TimeEntrySerializer(qs, many=True).data})

    def post(self, request):
        employee = getattr(request.user, "employee_profile", None)
        if not employee or not employee.company_id:
            return Response({"detail": "Employee not found."}, status=404)

        ser = TimeEntryCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        entry_date = data.get("date") or timezone.localdate()
        project_id = data["project_id"]
        try:
            project = Project.objects.get(id=project_id, company_id=employee.company_id, is_active=True)
        except Project.DoesNotExist:
            return Response({"detail": "Invalid project."}, status=400)

        entry = TimeEntry.objects.create(
            employee_id=employee.id,
            date=entry_date,
            project=project,
            job_name=data.get("job_name", ""),
            description=data.get("description", ""),
            minutes=data["minutes"],
        )

        return Response(TimeEntrySerializer(entry).data, status=201)


class EmployeeGeofenceConfigAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from app.models import OfficeLocation
        user = request.user
        if not user.company:
            return Response({"detail": "No company linked."}, status=404)
        
        emp = getattr(user, 'employee_profile', None)
        is_wfh = (emp.work_location == 'home') if emp else False

        configs = OfficeLocation.objects.filter(company=user.company, is_active=True, enable_geofencing=True)
        data = []
        for config in configs:
            if config.latitude and config.longitude:
                data.append({
                    "id": config.id,
                    "name": config.name,
                    "latitude": float(config.latitude),
                    "longitude": float(config.longitude),
                    "radius": config.radius
                })
        
        # Geofencing is required only if NOT WFH and there are active configs
        geofence_required = not is_wfh and len(data) > 0

        return Response({
            "office_locations": data,
            "is_wfh": is_wfh,
            "geofence_required": geofence_required
        })


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

        # GPS Security Check (Backend validation)
        lat = request.data.get('lat')
        lon = request.data.get('lon')
        from app.utils import validate_geofence
        is_allowed, error_msg = validate_geofence(user, lat, lon, None)
        if not is_allowed:
            return Response({"detail": error_msg}, status=403)

        tz = pytz.timezone('Asia/Kolkata')
        today = timezone.localdate()
        now_dt = timezone.localtime(timezone.now(), tz)

        existing = Attendance.objects.filter(employee=employee, date=today).first()
        if existing and existing.check_in:
            return Response({
                "detail": f"Already checked in at {existing.check_in.astimezone(tz).strftime('%H:%M:%S')}"
            }, status=400)

        shifts_qs = ShiftPolicy.objects.all()
        if not shifts_qs.exists():
            return Response(
                {"detail": "No shift policy configured. Please contact HR/admin."},
                status=status.HTTP_409_CONFLICT,
            )

        shifts = list(shifts_qs)
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
            date=today,
            check_in=now_dt,
            is_present=True
        )

        # Update status to online
        employee.status = 'online'
        employee.save(update_fields=['status'])

        # If yesterday has a missing checkout, fire the morning alert asynchronously
        yesterday = today - timedelta(days=1)
        yesterday_att = Attendance.objects.filter(
            employee=employee,
            date=yesterday,
            check_in__isnull=False,
            check_out__isnull=True,
        ).first()
        if yesterday_att and 'MISSING_CHECKOUT' in (yesterday_att.remarks or ''):
            from employee.tasks import send_late_checkout_morning_alert
            send_late_checkout_morning_alert.delay(employee.id, yesterday_att.id)

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

        # GPS Security Check (Backend validation)
        lat = request.data.get('lat')
        lon = request.data.get('lon')
        from app.utils import validate_geofence
        is_allowed, error_msg = validate_geofence(user, lat, lon, None)
        if not is_allowed:
            return Response({"detail": error_msg}, status=403)

        today = timezone.localdate()
        now_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata'))

        try:
            attendance = Attendance.objects.get(employee=employee, date=today)
        except Attendance.DoesNotExist:
            return Response({"detail": "No check-in record found for today."}, status=404)

        if attendance.check_out:
            return Response({"detail": "Already checked out today."}, status=400)

        # Auto-end any active break before checkout so break duration is always captured.
        active_break = BreakLog.objects.filter(
            employee=employee,
            start__date=today,
            end__isnull=True,
        ).last()
        if active_break:
            active_break.end = now_dt
            if active_break.start:
                active_break.duration_minutes = max(0, int((active_break.end - active_break.start).total_seconds() // 60))
            active_break.save()

        attendance.check_out = now_dt
        attendance.calculate_work_duration()
        attendance.save()

        # Update status to offline
        employee.status = 'offline'
        employee.save(update_fields=['status'])

        serializer = EmployeeAttendanceSerializer(attendance)
        return Response({
            "detail": f"Checked out at {now_dt.strftime('%H:%M:%S')}",
            "attendance": serializer.data
        })

# class DashboardAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         user = request.user
#         if not hasattr(user, 'role') or user.role != 'employee':
#             return Response({"detail": "Unauthorized. Employee role required."}, status=403)

#         try:
#             # Get employee
#             employee = Employee.objects.get(email=user.email)
#             today = timezone.localdate()
#             tz = pytz.timezone('Asia/Kolkata')
#             now = timezone.localtime(timezone.now(), tz)

#             # Today's attendance
#             attendance = Attendance.objects.filter(employee=employee, date=today).first()
#             punch_in = attendance.check_in if attendance else None
#             punch_out = attendance.check_out if attendance else None

#             # Active break
#             active_break = BreakLog.objects.filter(employee=employee, start__date=today, end__isnull=True).first()

#             # Recent finished breaks
#             recent_breaks = BreakLog.objects.filter(
#                 employee=employee,
#                 start__date=today,
#                 end__isnull=False
#             ).order_by('-start')[:5]

#             # Total break minutes
#             breaks = BreakLog.objects.filter(employee=employee, start__date=today, end__isnull=False)
#             break_minutes = sum(int((b.end - b.start).total_seconds() // 60) for b in breaks)

#             # Employee's assigned shift
#             shift = getattr(employee, 'shift_assigned', None)

#             # Late check-in
#             is_late = False
#             if attendance and punch_in and shift:
#                 grace = shift.grace_period or timedelta(minutes=15)
#                 shift_start_dt = datetime.combine(today, shift.checkin)
#                 shift_start_aware = tz.localize(shift_start_dt)
#                 if punch_in > (shift_start_aware + grace):
#                     is_late = True

#             # Overtime calculation
#             overtime = None
#             if attendance and punch_out and shift:
#                 shift_start_dt = datetime.combine(today, shift.checkin)
#                 shift_end_dt = datetime.combine(today, shift.checkout)
#                 # Overnight shift
#                 if shift.checkin > shift.checkout:
#                     shift_end_dt += timedelta(days=1)
#                 shift_end_aware = tz.localize(shift_end_dt)

#                 if punch_out > shift_end_aware:
#                     overtime_delta = punch_out - shift_end_aware
#                     overtime_minutes = overtime_delta.total_seconds() // 60
#                     overtime = {
#                         'hours': int(overtime_minutes // 60),
#                         'minutes': int(overtime_minutes % 60),
#                         'total': round(overtime_minutes / 60, 2)
#                     }

#             # Latest payroll
#             latest_payroll = Payroll.objects.filter(employee=employee).order_by('-payroll_date').first()
#             latest_payroll_data = {
#                 'amount': latest_payroll.net_pay,
#                 'date': latest_payroll.payroll_date
#             } if latest_payroll else None

#             # Birthday message
#             birthday_message = None
#             if employee.date_of_birth:
#                 if employee.date_of_birth.day == today.day and employee.date_of_birth.month == today.month:
#                     birthday_message = f"Happy Birthday, {employee.first_name}! 🎉"

#             # ------------------------
#             # Attendance score calculation
#             # ------------------------
#             attendance_score = 100
#             if not attendance or not punch_in:
#                 attendance_score = 0  # absent
#             else:
#                 # Deduct for late check-in
#                 if is_late:
#                     attendance_score -= 10

#                 # Deduct for short work duration (less than 8 hours)
#                 if punch_in:
#                     end_time = punch_out or now
#                     worked_minutes = int((end_time - punch_in).total_seconds() // 60) - break_minutes
#                     worked_hours = worked_minutes / 60
#                     if worked_hours < 8:
#                         missing_hours = 8 - worked_hours
#                         attendance_score -= min((missing_hours / 0.5) * 2, 20)  # 2 points per 30 min short

#                 # Deduct for long breaks (>60 minutes)
#                 if break_minutes > 60:
#                     attendance_score -= min((break_minutes - 60) / 10, 10)  # 1 point per 10 min extra

#             attendance_score = max(int(round(attendance_score)), 0)

#             # Dashboard response
#             dashboard_data = {
#                 'employee_name': f"{employee.first_name} {employee.last_name}",
#                 'employee_photo': request.build_absolute_uri(employee.photo.url) if employee.photo else None,
#                 'checkin_time': timezone.localtime(punch_in, tz).strftime('%H:%M:%S') if punch_in else None,
#                 'checkout_time': timezone.localtime(punch_out, tz).strftime('%H:%M:%S') if punch_out else None,
#                 'is_late': is_late,
#                 'total_worked': calculate_worked_time(punch_in, punch_out, now)[0],
#                 'effective_time': calculate_effective_time(punch_in, break_minutes, punch_out, now)['formatted'],
#                 'total_break_minutes': break_minutes,
#                 'attendance_score': attendance_score,  # ✅ New field added
#                 'shift_name': shift.shift_type if shift else 'Not assigned',
#                 'shift_timing': f"{shift.checkin.strftime('%H:%M')} - {shift.checkout.strftime('%H:%M')}" if shift else '--:--',
#                 'server_time': now.strftime('%Y-%m-%d %H:%M:%S'),
#                 'active_break': {
#                     'type': active_break.break_config.get_break_choice_display() if active_break and active_break.break_config else None,
#                     'break_config_id': active_break.break_config.id if active_break and active_break.break_config else None,
#                     'start_time': timezone.localtime(active_break.start, tz).strftime('%H:%M:%S') if active_break else None
#                 } if active_break else None,
#                 'recent_breaks': [
#                     {
#                         'type': br.break_config.get_break_choice_display() if br.break_config else None,
#                         'break_config_id': br.break_config.id if br.break_config else None,
#                         'start_time': timezone.localtime(br.start, tz).strftime('%H:%M:%S'),
#                         'end_time': timezone.localtime(br.end, tz).strftime('%H:%M:%S')
#                     } for br in recent_breaks
#                 ] if recent_breaks else None,
#                 'overtime': overtime,
#                 'latest_payroll': latest_payroll_data,
#                 'birthday_message': birthday_message,
#             }

#             return Response({"dashboard_data": dashboard_data})

#         except Employee.DoesNotExist:
#             return Response({"detail": "Employee record not found."}, status=404)
#         except Exception as e:
#             return Response({"detail": f"Error: {str(e)}"}, status=500)


class DashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not hasattr(user, 'role') or user.role != 'employee':
            return Response({"detail": "Unauthorized. Employee role required."}, status=403)

        try:
            # Get employee
            employee = Employee.objects.get(email=user.email)
            tz = pytz.timezone('Asia/Kolkata')
            now = timezone.localtime(timezone.now(), tz)
            today = now.date()

            # Today's attendance
            attendance = Attendance.objects.filter(employee=employee, date=today).first()
            punch_in = attendance.check_in if attendance else None
            punch_out = attendance.check_out if attendance else None

            # Active break
            active_break = BreakLog.objects.filter(employee=employee, start__date=today, end__isnull=True).first()

            # Recent finished breaks
            recent_breaks = BreakLog.objects.filter(
                employee=employee,
                start__date=today,
                end__isnull=False
            ).order_by('-start')[:5]

            # Total completed break minutes for today
            breaks = BreakLog.objects.filter(employee=employee, start__date=today, end__isnull=False)
            break_minutes = sum(int((b.end - b.start).total_seconds() // 60) for b in breaks)
            short_break_minutes = sum(
                int((b.end - b.start).total_seconds() // 60)
                for b in breaks
                if b.break_config and b.break_config.break_choice == 'short_break'
            )
            # Active break contribution (live)
            active_break_live_minutes = 0
            if active_break and active_break.start:
                active_break_live_minutes = max(
                    0,
                    int((now - timezone.localtime(active_break.start, tz)).total_seconds() // 60),
                )
            total_break_minutes_live = break_minutes + active_break_live_minutes
            active_short_break_live_minutes = (
                active_break_live_minutes
                if active_break and active_break.break_config and active_break.break_config.break_choice == 'short_break'
                else 0
            )
            short_break_minutes_live = short_break_minutes + active_short_break_live_minutes
            short_break_quota_minutes = get_short_break_daily_quota_minutes(employee.company)

            # Employee's assigned shift
            shift = getattr(employee, 'shift_assigned', None)

            # Late check-in
            is_late = False
            if attendance and punch_in and shift:
                grace = shift.grace_period or timedelta(minutes=15)
                shift_start_dt = datetime.combine(today, shift.checkin)
                shift_start_aware = tz.localize(shift_start_dt)
                if punch_in > (shift_start_aware + grace):
                    is_late = True

            # Overtime calculation
            overtime = None
            if attendance and punch_out and shift:
                shift_start_dt = datetime.combine(today, shift.checkin)
                shift_end_dt = datetime.combine(today, shift.checkout)
                # Overnight shift
                if shift.checkin > shift.checkout:
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

            # Weekly hours calculation (Sunday to Saturday - current week only)
            # Sunday is the start of the week, Saturday is the end
            # Calculate days back to most recent Sunday
            days_since_sunday = (today.weekday() + 1) % 7  # Mon=1 day back, Tue=2, ..., Sun=0
            week_start = today - timedelta(days=days_since_sunday)  # Most recent Sunday
            week_end = week_start + timedelta(days=6)  # Following Saturday (7-day week)

            
            # Get all attendances for the week
            weekly_attendances = Attendance.objects.filter(
                employee=employee,
                date__range=[week_start, week_end],
                check_in__isnull=False
            )
            
            total_weekly_minutes = 0
            for att in weekly_attendances:
                # Only include completed attendances (checked out) in weekly total
                # Today's ongoing work will be handled separately by frontend
                if att.check_out:
                    worked_delta = att.check_out - att.check_in
                    worked_minutes = worked_delta.total_seconds() // 60
                    
                    # Subtract break time for that day
                    day_breaks = BreakLog.objects.filter(
                        employee=employee,
                        start__date=att.date,
                        end__isnull=False
                    )
                    day_break_minutes = sum(int((b.end - b.start).total_seconds() // 60) for b in day_breaks)
                    
                    effective_minutes = max(0, worked_minutes - day_break_minutes)
                    total_weekly_minutes += effective_minutes
            
            weekly_hours = round(total_weekly_minutes / 60, 2)

            # Birthday message
            birthday_message = None
            if employee.date_of_birth:
                if employee.date_of_birth.day == today.day and employee.date_of_birth.month == today.month:
                    birthday_message = f"Happy Birthday, {employee.first_name}! 🎉"

            # ------------------------
            # ✅ Today's work duration (effective time - excludes breaks)
            # ------------------------
            today_work_duration = None
            if punch_in:
                end_time = punch_out or now
                worked_minutes_today = int((end_time - punch_in).total_seconds() // 60)
                # Subtract today's break time
                effective_minutes_today = max(0, worked_minutes_today - total_break_minutes_live)
                worked_hours_today = effective_minutes_today // 60
                worked_mins_today = effective_minutes_today % 60
                today_work_duration = f"{worked_hours_today}h {worked_mins_today}m"

            # Weekly total (already calculated above with breaks subtracted)
            total_weekly_hours = int(total_weekly_minutes // 60)
            total_weekly_mins = int(total_weekly_minutes % 60)
            total_work_duration_week = f"{total_weekly_hours}h {total_weekly_mins}m"

            # Dashboard response
            dashboard_data = {
                'employee_name': f"{employee.first_name} {employee.last_name}",
                'employee_photo': request.build_absolute_uri(employee.photo.url) if employee.photo else None,
                'status': employee.status,
                'checkin_time': timezone.localtime(punch_in, tz).strftime('%H:%M:%S') if punch_in else None,
                'checkout_time': timezone.localtime(punch_out, tz).strftime('%H:%M:%S') if punch_out else None,
                'is_late': is_late,
                'total_worked': calculate_worked_time(punch_in, punch_out, now)[0],
                'effective_time': calculate_effective_time(punch_in, total_break_minutes_live, punch_out, now)['formatted'],
                'total_break_minutes': break_minutes,
                'total_break_minutes_live': total_break_minutes_live,
                'short_break_minutes': short_break_minutes,
                'short_break_minutes_live': short_break_minutes_live,
                'short_break_quota_minutes': short_break_quota_minutes,
                # Backward-compatible keys used by current dashboard UI.
                'break_quota_minutes': short_break_quota_minutes,
                'break_quota_used_percent': min(
                    100,
                    int(round((short_break_minutes_live / short_break_quota_minutes) * 100))
                ) if short_break_quota_minutes > 0 else 0,
                'today_work_duration': today_work_duration,
                'total_work_duration_week': total_work_duration_week,
                'shift_name': shift.shift_type if shift else 'Not assigned',
                'shift_timing': f"{shift.checkin.strftime('%H:%M')} - {shift.checkout.strftime('%H:%M')}" if shift else '--:--',
                'server_time': now.strftime('%Y-%m-%d %H:%M:%S'),
                'active_break': {
                    'type': active_break.break_config.get_break_choice_display() if active_break and active_break.break_config else None,
                    'break_choice': active_break.break_config.break_choice if active_break and active_break.break_config else None,
                    'break_config_id': active_break.break_config.id if active_break and active_break.break_config else None,
                    'duration_minutes': active_break.break_config.duration_minutes if active_break and active_break.break_config else None,
                    'start_time': timezone.localtime(active_break.start, tz).strftime('%H:%M:%S') if active_break else None
                } if active_break else None,
                'recent_breaks': [
                    {
                        'type': br.break_config.get_break_choice_display() if br.break_config else None,
                        'break_choice': br.break_config.break_choice if br.break_config else None,
                        'break_config_id': br.break_config.id if br.break_config else None,
                        'start_time': timezone.localtime(br.start, tz).strftime('%H:%M:%S'),
                        'end_time': timezone.localtime(br.end, tz).strftime('%H:%M:%S')
                    } for br in recent_breaks
                ] if recent_breaks else None,
                'overtime': overtime,
                'latest_payroll': latest_payroll_data,
                'birthday_message': birthday_message,
            }

            return Response({"dashboard_data": dashboard_data})

        except Employee.DoesNotExist:
            return Response({"detail": "Employee record not found."}, status=404)
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

from datetime import datetime, timedelta
from calendar import month_name
import pytz
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from app.models import Attendance, BreakLog, Employee, EmpLeave


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

        working_days_config = None
        if employee.department:
            working_days_config = DepartmentWiseWorkingDays.objects.filter(
                department=employee.department,
                company=employee.company
            ).first()

        day_aliases = {
            'mon': 'monday', 'monday': 'monday',
            'tue': 'tuesday', 'tues': 'tuesday', 'tuesday': 'tuesday',
            'wed': 'wednesday', 'wednesday': 'wednesday',
            'thu': 'thursday', 'thur': 'thursday', 'thurs': 'thursday', 'thursday': 'thursday',
            'fri': 'friday', 'friday': 'friday',
            'sat': 'saturday', 'saturday': 'saturday',
            'sun': 'sunday', 'sunday': 'sunday',
        }

        def normalize_day_name(value):
            key = str(value or '').strip().lower()
            return day_aliases.get(key, key)

        configured_working_days = working_days_config.working_days if working_days_config else []
        configured_weekend_days = working_days_config.weekend_days if working_days_config else []
        working_day_names = {
            normalize_day_name(day_name)
            for day_name in (configured_working_days if isinstance(configured_working_days, list) else [])
            if normalize_day_name(day_name)
        }
        weekend_day_names = {
            normalize_day_name(day_name)
            for day_name in (configured_weekend_days if isinstance(configured_weekend_days, list) else [])
            if normalize_day_name(day_name)
        }

        start_date = datetime(selected_year, selected_month, 1).date()
        if selected_month == 12:
            end_date = datetime(selected_year + 1, 1, 1).date() - timedelta(days=1)
        else:
            end_date = datetime(selected_year, selected_month + 1, 1).date() - timedelta(days=1)

        # Attendance records
        attendances = Attendance.objects.filter(
            employee=employee,
            date__range=(start_date, end_date)
        ).select_related('employee__shift_assigned').prefetch_related('break_logs')

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
            'missing_checkout': 0,
            'working_days': 0
        }

        day = start_date
        while day <= end_date:
            day_name = normalize_day_name(day.strftime('%A'))
            if working_day_names:
                # Prefer explicit department working-days configuration.
                is_weekend = day_name not in working_day_names
            elif weekend_day_names:
                # Fallback to explicit weekend list when working days are not configured.
                is_weekend = day_name in weekend_day_names
            else:
                # Final fallback only when no department config exists.
                is_weekend = day.weekday() >= 5
            status = None  # Don't initialize as 'absent' to avoid double counting
            is_late = False
            late_duration = None
            total_hours = None
            overtime_hours = None
            break_time = '-'
            total_break = 0

            att = att_map.get(day)

            # Get shift from employee
            shift = getattr(employee, 'shift_assigned', None)

            # Always compute completed break time when attendance exists, even on leave days.
            if att and att.check_in:
                day_breaks = BreakLog.objects.filter(
                    employee=employee,
                    start__date=day,
                    end__isnull=False
                )
                total_break = sum(
                    (b.end - b.start).total_seconds()
                    for b in day_breaks if b.end and b.start
                )
                break_time = f'{int(total_break // 60)} min' if total_break else '-'

            if is_weekend:
                status = 'weekend'
            elif day in approved_leave_days:
                status = 'leave'
                stats['leave'] += 1
            elif att and att.check_in:
                check_in = att.check_in
                check_out = att.check_out

                # Calculate work hours and breaks
                if check_out:
                    work_duration = (check_out - check_in).total_seconds() / 3600
                    work_duration -= total_break / 3600
                    total_hours = round(work_duration, 2)

                    if shift:
                        grace = shift.grace_period or timedelta(minutes=15)
                        shift_start_naive = datetime.combine(day, shift.checkin)
                        shift_start_aware = tz.localize(shift_start_naive)
                        check_in_local = check_in.astimezone(tz)

                        if check_in_local > (shift_start_aware + grace):
                            is_late = True
                            late_delta = check_in_local - (shift_start_aware + grace)
                            late_duration = str(late_delta).split('.')[0]

                        full_day_hours = shift.full_day_hours()
                        half_day_hours = shift.half_day_hours()

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
                        # No shift assigned - use default hours (8.0 full day, 4.0 half day)
                        if work_duration >= 8.0:
                            status = 'present'
                            stats['present'] += 1
                        elif work_duration >= 4.0:
                            status = 'half_day'
                            stats['half_day'] += 1
                            stats['present'] += 0.5
                            stats['absent'] += 0.5
                        else:
                            status = 'absent'
                            stats['absent'] += 1

                    if att.overtime_duration:
                        overtime_hours = round(att.overtime_duration.total_seconds() / 3600, 2)

                else:
                    # Missing checkout (incomplete record). For past days mark as 'missing_checkout'
                    # so it does not get treated as an outright 'absent'. For today, keep 'checked_in'.
                    if day < today:
                        status = 'missing_checkout'
                        stats.setdefault('missing_checkout', 0)
                        stats['missing_checkout'] += 1
                    else:
                        status = 'checked_in'
                        if shift:
                            grace = shift.grace_period or timedelta(minutes=15)
                            shift_start_naive = datetime.combine(day, shift.checkin)
                            shift_start_aware = tz.localize(shift_start_naive)
                            check_in_local = check_in.astimezone(tz)
                            if check_in_local > (shift_start_aware + grace):
                                is_late = True
                                late_delta = check_in_local - (shift_start_aware + grace)
                                late_duration = str(late_delta).split('.')[0]
            else:
                # No attendance record
                if not is_weekend and day not in approved_leave_days:
                    # Only mark as absent if it's a past working day or today
                    if day <= today:
                        status = 'absent'
                        stats['absent'] += 1
                    else:
                        # Future date - no status yet
                        status = 'no_data'

            if is_late and status in ['present', 'half_day', 'checked_in']:
                stats['late'] += 1

            monthly_data.append({
                'date': str(day),
                'day_name': day.strftime('%A'),
                'check_in': att.check_in.astimezone(tz).strftime('%H:%M:%S') if att and att.check_in else '-',
                'check_out': att.check_out.astimezone(tz).strftime('%H:%M:%S') if att and att.check_out else '-',
                'shift': str(shift) if shift else '-',
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

        # Filtering
        search = request.GET.get('search', '').lower()
        status_filter = request.GET.get('status', 'all')

        filtered_data = []
        status_label_map = {
            'present': 'present',
            'absent': 'absent',
            'leave': 'leave',
            'half_day': 'half day',
            'weekend': 'weekend',
            'checked_in': 'checked in',
            'no_data': 'no data'
        }

        for row in monthly_data:
            match_search = not search or search in row['date'].lower() or search in row['day_name'].lower() or search in status_label_map.get(row['status'], '').lower()
            match_status = status_filter == 'all' or row['status'] == status_filter
            if match_search and match_status:
                filtered_data.append(row)

        # Pagination
        try:
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 10))
        except ValueError:
            page = 1
            page_size = 10

        total_count = len(filtered_data)
        total_pages = (total_count + page_size - 1) // page_size
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_data = filtered_data[start_index:end_index]

        return Response({
            'months': [{'value': i, 'name': month_name[i]} for i in range(1, 13)],
            'years': list(range(today.year - 5, today.year + 6)),
            'selected_month': selected_month,
            'selected_year': selected_year,
            'selected_month_name': month_name[selected_month],
            'monthly_data': paginated_data,
            'count': total_count,
            'total_pages': total_pages,
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
                    'admin_events': [{'id': e.id, 'title': e.name,'description':e.description} for e in admin_events],
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
    pagination_class = EmployeePagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description']

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
    pagination_class = EmployeePagination
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'description', 'subtasks__title']
    filterset_fields = ['status', 'priority']

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

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Calculate summary statistics for ALL tasks matching the criteria (before pagination)
        # Note: Summary usually reflects the user's overall state, not just filtered view
        # But to match the frontend expectations, I'll provide global vs filtered stats
        
        user = request.user
        emp = user.employee_profile
        
        all_tasks = self.get_queryset()
        now = timezone.now().date()
        
        summary = {
            'total': all_tasks.count(),
            'done': all_tasks.filter(status='done').count(),
            'in_progress': all_tasks.filter(status__in=['inprogress', 'inreview']).count(),
            'overdue': all_tasks.exclude(status='done').filter(deadline__lt=now).count(),
        }

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['summary'] = summary
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'summary': summary
        })


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
        task.save(update_fields=['status'])

        # If this assignment is for a subtask, refresh parent rollup.
        if task.parent_task_id:
            parent_task = task.parent_task
            parent_task.status = parent_task.compute_status_from_subtasks()
            parent_task.save(update_fields=['status'])

        return Response({"detail": "Assignment status updated."})


class EmpLeaveListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EmpLeaveSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = EmployeePagination
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['reason', 'leave_type__leave_name', 'status']
    filterset_fields = ['status']

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'employee_profile') or user.employee_profile is None:
            return EmpLeave.objects.none()
        emp = user.employee_profile
        return EmpLeave.objects.filter(employee=emp).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, 'employee_profile') or user.employee_profile is None:
            raise ValidationError("You do not have an employee profile. Only employees can apply for leave.")
            
        emp = user.employee_profile
        start_date = serializer.validated_data.get("from_date")
        end_date = serializer.validated_data.get("to_date")
        leave_type = serializer.validated_data.get("leave_type")
        leave_duration = serializer.validated_data.get("leave_duration", "full_day")

        # Check if leave already exists in the given date range (ignore Rejected and Cancelled)
        exists = EmpLeave.objects.filter(
            employee=emp,
            from_date__lte=end_date,
            to_date__gte=start_date
        ).exclude(status__in=['Rejected', 'Cancelled']).exists()

        if exists:
            raise ValidationError("An active leave application (Pending or Approved) already exists for the given dates.")

        # Calculate requested leave days (half day on a single date counts as 0.5)
        span_days = (end_date - start_date).days + 1
        if leave_duration == "half_day":
            days_requested = 0.5
        else:
            days_requested = float(span_days)

        def _approved_leave_units(leave):
            if not leave.from_date or not leave.to_date:
                return 0.0
            s = (leave.to_date - leave.from_date).days + 1
            if getattr(leave, "leave_duration", None) == "half_day" and leave.from_date == leave.to_date:
                return 0.5
            return float(s)

        # Get approved leaves for this leave type
        current_year = datetime.now().year
        approved_leaves = EmpLeave.objects.filter(
            employee=emp,
            leave_type=leave_type,
            status='Approved',
            from_date__year=current_year
        )

        # Calculate total approved days used
        days_used = 0.0
        for leave in approved_leaves:
            days_used += _approved_leave_units(leave)

        # Get leave type count (available days per year)
        available_days = float(leave_type.count) if leave_type else 0.0
        remaining_days = available_days - days_used

        # Validate requested days against remaining balance
        if days_requested > remaining_days:
            raise ValidationError(
                f"Insufficient leave balance. You have {remaining_days} days remaining "
                f"for {leave_type.leave_name}, but requested {days_requested} days."
            )

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
            rejection_reason = request.data.get('rejection_reason', '')
            leave.status = 'Rejected'
            leave.rejection_reason = rejection_reason
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
    pagination_class = EmployeePagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "description"]

    def get_queryset(self):
        user = self.request.user
        employee_profile = getattr(user, "employee_profile", None)
        if not employee_profile:
            return LearningCorner.objects.none()

        qs = LearningCorner.objects.filter(company=employee_profile.company).prefetch_related("media_items")
        asset_type = (self.request.query_params.get("type") or "all").strip().lower()
        if asset_type == "image":
            qs = qs.filter(
                Q(image__isnull=False) & ~Q(image="")
                | Exists(
                    LearningCornerMedia.objects.filter(
                        learning_corner_id=OuterRef("pk"),
                        media_type=LearningCornerMedia.MEDIA_IMAGE,
                    )
                )
            ).distinct()
        elif asset_type == "video":
            qs = qs.filter(
                Q(video__isnull=False) & ~Q(video="")
                | Exists(
                    LearningCornerMedia.objects.filter(
                        learning_corner_id=OuterRef("pk"),
                        media_type=LearningCornerMedia.MEDIA_VIDEO,
                    )
                )
            ).distinct()
        elif asset_type == "document":
            qs = qs.filter(
                Q(document__isnull=False) & ~Q(document="")
                | Exists(
                    LearningCornerMedia.objects.filter(
                        learning_corner_id=OuterRef("pk"),
                        media_type=LearningCornerMedia.MEDIA_DOCUMENT,
                    )
                )
            ).distinct()
        return qs.order_by("-id")

class EmployeeProfileAPIView(generics.RetrieveUpdateAPIView):
    queryset = Employee.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        # Use detailed serializer for GET to return all fields
        if self.request.method == 'GET':
            return EmployeeDetailSerializer
        # Use update serializer for PUT/PATCH to restrict editable fields
        elif self.request.method in ['PUT', 'PATCH']:
            return EmployeeUpdateSerializer
        return EmployeeDetailSerializer

    def get_object(self):
        try:
            return Employee.objects.get(user=self.request.user)
        except Employee.DoesNotExist:
            # Fallback for users (Master/Admin) who don't have an Employee profile yet
            user = self.request.user
            return Employee(
                user=user,
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
            )


class EmployeeProfileByIdAPIView(generics.RetrieveAPIView):
    queryset = Employee.objects.all()
    serializer_class = EmployeeDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'employee_id'
    lookup_url_kwarg = 'employee_id'


class BreakLogAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = request.user.employee_profile
        configs = BreakConfig.objects.filter(company=employee.company, enabled=True)
        serializer = EmployeeBreakConfigSerializer(configs, many=True)
        return Response(serializer.data)

    def post(self, request):
        employee = request.user.employee_profile
        action = request.data.get("action")  # "start" or "end"
        today = timezone.localdate()

        attendance = Attendance.objects.filter(employee=employee, date=today).first()
        if not attendance or not attendance.check_in:
            return Response({"detail": "You must check in before using breaks."}, status=400)
        if attendance.check_out:
            return Response({"detail": "Breaks are not allowed after checkout."}, status=400)

        if action == "start":
            break_config_id = request.data.get("break_config_id")
            if not break_config_id:
                return Response({"detail": "break_config_id is required to start a break."}, status=400)
                
            break_config = get_object_or_404(
                BreakConfig, 
                id=break_config_id, 
                company=employee.company, 
                enabled=True
            )

            # Prevent starting a new break if one is active
            active_break = BreakLog.objects.filter(
                employee=employee, 
                end__isnull=True
            ).first()
            if active_break:
                return Response({"detail": "You already have an active break."}, status=400)

            # Allow only one meal break per day per employee.
            if break_config.break_choice == 'meal_break':
                meal_break_exists_today = BreakLog.objects.filter(
                    employee=employee,
                    start__date=today,
                    break_config__break_choice='meal_break',
                ).exists()
                if meal_break_exists_today:
                    return Response(
                        {"detail": "Meal break already used for today. Only one meal break is allowed per day."},
                        status=400,
                    )

            # Enforce quota only for short breaks.
            if break_config.break_choice == 'short_break':
                short_break_quota_minutes = get_short_break_daily_quota_minutes(employee.company)
                completed_short_break_minutes = sum(
                    int((b.end - b.start).total_seconds() // 60)
                    for b in BreakLog.objects.filter(
                        employee=employee,
                        start__date=today,
                        end__isnull=False,
                        break_config__break_choice='short_break',
                    )
                )
                requested_short_break_minutes = int(break_config.duration_minutes or 0)
                projected_short_break_minutes = completed_short_break_minutes + requested_short_break_minutes

                if short_break_quota_minutes > 0 and completed_short_break_minutes >= short_break_quota_minutes:
                    return Response(
                        {
                            "detail": (
                                f"Daily short-break quota exceeded "
                                f"({completed_short_break_minutes}/{short_break_quota_minutes} mins)."
                            )
                        },
                        status=400,
                    )
                if short_break_quota_minutes > 0 and projected_short_break_minutes > short_break_quota_minutes:
                    remaining = max(0, short_break_quota_minutes - completed_short_break_minutes)
                    return Response(
                        {
                            "detail": (
                                f"Cannot start this short break. Remaining short-break quota is {remaining} mins, "
                                f"but selected break is {requested_short_break_minutes} mins."
                            )
                        },
                        status=400,
                    )

            break_log = BreakLog.objects.create(
                employee=employee,
                attendance=attendance,
                break_config=break_config,  
                start=timezone.now()
            )

            # Update status to away when break starts
            employee.status = 'away'
            employee.save(update_fields=['status'])

            return Response(EmployeeBreakLogSerializer(break_log).data, status=201)

        elif action == "end":
            # Find any active break regardless of config ID
            active_break = BreakLog.objects.filter(
                employee=employee, 
                end__isnull=True
            ).last() # Use last() to get the most recent active one if multiple exist (though shouldn't)
            
            if not active_break:
                return Response({"detail": "No active break found for you."}, status=400)

            active_break.end = timezone.now()
            if active_break.start:
                diff = active_break.end - active_break.start
                active_break.duration_minutes = int(diff.total_seconds() // 60)
            active_break.save()

            # Update status to online when break ends
            employee.status = 'online'
            employee.save(update_fields=['status'])

            return Response(EmployeeBreakLogSerializer(active_break).data)

        else:
            return Response({"detail": "Invalid action. Use 'start' or 'end'."}, status=400)

class EmployeeCompanyPoliciesAPIView(generics.ListAPIView):
    serializer_class = PolicyConfigurationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = EmployeePagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        user = self.request.user
        return CompanyPolicies.objects.filter(company=user.company,is_active=True).order_by("-id")

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
    
from rest_framework import viewsets, permissions, serializers, decorators, response, status
from .models import EmployeeReference, Employee
from .serializers import EmployeeReferenceSerializer
from rest_framework import filters
from rest_framework.pagination import PageNumberPagination


class EmployeeReferencePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class EmployeeReferenceViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeReferenceSerializer
    queryset = EmployeeReference.objects.all().order_by('-submitted_at')
    pagination_class = EmployeeReferencePagination
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'employee__employee_id',
        'employee__first_name',
        'employee__middle_name',
        'employee__last_name',
        'name',
        'designation',
        'email',
        'contact_number',
        'status',
        'admin_comment',
    ]

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        # Admin: only see references from employees in the same company
        if user.role == "admin" and user.company:
            queryset = EmployeeReference.objects.filter(
                employee__company=user.company
            ).select_related('employee', 'employee__department', 'employee__designation').order_by('-submitted_at')
            status_filter = self.request.query_params.get("status")
            if status_filter and status_filter != "All":
                queryset = queryset.filter(status=status_filter)
            return queryset

        # Superuser sees all
        if user.is_superuser:
            queryset = EmployeeReference.objects.all().select_related('employee', 'employee__department', 'employee__designation').order_by('-submitted_at')
            status_filter = self.request.query_params.get("status")
            if status_filter and status_filter != "All":
                queryset = queryset.filter(status=status_filter)
            return queryset

        # Regular employee: only own references
        try:
            employee = Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            return EmployeeReference.objects.none()

        queryset = EmployeeReference.objects.filter(employee=employee).select_related('employee', 'employee__department', 'employee__designation').order_by('-submitted_at')
        status_filter = self.request.query_params.get("status")
        if status_filter and status_filter != "All":
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_create(self, serializer):
        """Attach logged-in employee automatically"""
        try:
            employee = Employee.objects.get(user=self.request.user)
        except Employee.DoesNotExist:
            raise serializers.ValidationError("Employee record not found for this user.")
        serializer.save(employee=employee)

    @decorators.action(
        detail=True,
        methods=["patch"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="review",
    )
    def review(self, request, pk=None):
        """Admin review: approve/reject + comment"""
        reference = self.get_object()

        # Ensure admin and employee are in same company
        admin_user = request.user
        if not (admin_user.role == "admin" or admin_user.is_superuser):
            return response.Response(
                {"error": "Only admins can review employee references."},
                status=status.HTTP_403_FORBIDDEN
            )
        if reference.employee.company != admin_user.company:
            return response.Response(
                {"error": "You are not allowed to review references from another company."},
                status=status.HTTP_403_FORBIDDEN
            )

        status_value = request.data.get("status")
        admin_comment = request.data.get("admin_comment", "")

        if status_value not in ["Pending", "Approved", "Rejected"]:
            return response.Response(
                {"error": "Invalid status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        reference.status = status_value
        reference.admin_comment = admin_comment
        reference.save(update_fields=["status", "admin_comment"])

        return response.Response(
            {"message": "Reference reviewed successfully."},
            status=status.HTTP_200_OK
        )

class AttendanceChartDataAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        range_type = request.GET.get('range', 'week')
        try:
            offset = int(request.GET.get('offset', 0))
        except ValueError:
            offset = 0

        employee = getattr(request.user, 'employee_profile', None)
        if not employee:
            return Response({"detail": "Employee profile not found."}, status=404)

        tz = pytz.timezone('Asia/Kolkata')
        now = timezone.localtime(timezone.now(), tz)
        today = now.date()

        series_data = [] # Hours worked
        labels = []
        holidays_flags = []

        # Get company holidays
        holidays = set(CalendarEvent.objects.filter(
            company=employee.company, 
            is_holiday=True
        ).values_list('date', flat=True))
        
        # Get weekend config
        working_days_config = DepartmentWiseWorkingDays.objects.filter(
            department=employee.department, 
            company=employee.company
        ).first()
        weekend_days = working_days_config.weekend_days if working_days_config else ['Saturday', 'Sunday']

        period_label = ""

        if range_type == 'week':
            # Offset shifts the 7-day window
            base_end = today - timedelta(days=7 * offset)
            base_start = base_end - timedelta(days=6)
            period_label = f"{base_start.strftime('%b %d')} - {base_end.strftime('%b %d, %Y')}"

            for i in range(6, -1, -1):
                d = base_end - timedelta(days=i)
                att = Attendance.objects.filter(employee=employee, date=d).first()
                hours = 0
                if att:
                    if att.total_work_duration:
                        hours = round(att.total_work_duration.total_seconds() / 3600, 2)
                    elif d == today and att.check_in and not att.check_out:
                         # Live calculation for today
                        now_dt = timezone.now()
                        total_breaks_secs = sum(
                            [(b.end - b.start).total_seconds() for b in att.break_logs.filter(start__isnull=False, end__isnull=False)],
                            0
                        )
                        # Active break?
                        active_b = att.break_logs.filter(end__isnull=True, start__isnull=False).first()
                        if active_b:
                            total_breaks_secs += (now_dt - active_b.start).total_seconds()
                        
                        live_secs = (now_dt - att.check_in).total_seconds() - total_breaks_secs
                        hours = round(max(0, live_secs) / 3600, 2)

                day_name = d.strftime('%a')
                day_full_name = d.strftime('%A')
                
                series_data.append(hours)
                labels.append(day_name)
                holidays_flags.append(d in holidays or day_full_name in weekend_days)

        elif range_type == 'month':
            # Offset shifts by 30-day buckets
            base_end = today - timedelta(days=30 * offset)
            base_start = base_end - timedelta(days=29)
            period_label = f"{base_start.strftime('%b %d')} - {base_end.strftime('%b %d, %Y')}"

            for i in range(29, -1, -1):
                d = base_end - timedelta(days=i)
                att = Attendance.objects.filter(employee=employee, date=d).first()
                hours = 0
                if att:
                    if att.total_work_duration:
                        hours = round(att.total_work_duration.total_seconds() / 3600, 2)
                    elif d == today and att.check_in and not att.check_out:
                        # Live calculation
                        now_dt = timezone.now()
                        total_breaks_secs = sum(
                            [(b.end - b.start).total_seconds() for b in att.break_logs.filter(start__isnull=False, end__isnull=False)],
                            0
                        )
                        active_b = att.break_logs.filter(end__isnull=True, start__isnull=False).first()
                        if active_b:
                            total_breaks_secs += (now_dt - active_b.start).total_seconds()
                        
                        live_secs = (now_dt - att.check_in).total_seconds() - total_breaks_secs
                        hours = round(max(0, live_secs) / 3600, 2)

                series_data.append(hours)
                labels.append(str(d.day))
                holidays_flags.append(d in holidays or d.strftime('%A') in weekend_days)

        elif range_type == 'year':
            # Offset shifts by 12-month buckets
            current_month_start = today.replace(day=1)
            # Find the starting month for the 12-month window based on offset
            # (month - offset*12)
            base_end_month = (current_month_start.month - (offset * 12) - 1) % 12 + 1
            base_end_year = current_month_start.year + (current_month_start.month - (offset * 12) - 1) // 12
            base_end_date = current_month_start.replace(year=base_end_year, month=base_end_month)

            # Period label for year
            start_month_idx = (base_end_month - 11 - 1) % 12 + 1
            start_year = base_end_year + (base_end_month - 11 - 1) // 12
            start_date = current_month_start.replace(year=start_year, month=start_month_idx)
            period_label = f"{start_date.strftime('%b %Y')} - {base_end_date.strftime('%b %Y')}"

            for i in range(11, -1, -1):
                # Calculate the year and month accurately
                m = (base_end_month - i - 1) % 12 + 1
                y = base_end_year + (base_end_month - i - 1) // 12
                
                monthly_atts = Attendance.objects.filter(
                    employee=employee, 
                    date__year=y, 
                    date__month=m
                )
                
                total_seconds = 0
                for a in monthly_atts:
                    if a.total_work_duration:
                        total_seconds += a.total_work_duration.total_seconds()
                    elif a.date == today and a.check_in and not a.check_out:
                        now_dt = timezone.now()
                        brk_secs = sum([(b.end - b.start).total_seconds() for b in a.break_logs.filter(start__isnull=False, end__isnull=False)], 0)
                        active_b = a.break_logs.filter(end__isnull=True, start__isnull=False).first()
                        if active_b:
                            brk_secs += (now_dt - active_b.start).total_seconds()
                        total_seconds += max(0, (now_dt - a.check_in).total_seconds() - brk_secs)
                
                series_data.append(round(total_seconds / 3600, 2))
                labels.append(month_name[m][:3])
                holidays_flags.append(False)

        return Response({
            "series": series_data,
            "labels": labels,
            "holidays": holidays_flags,
            "range": range_type,
            "period_label": period_label,
            "offset": offset
        })
