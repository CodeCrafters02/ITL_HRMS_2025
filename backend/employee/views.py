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
from .utils import calculate_worked_time, calculate_effective_time, get_missing_checkout
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

        # Prefer the record that already has check_in so we don't create a duplicate
        existing = (
            Attendance.objects
            .filter(employee=employee, date=today, check_in__isnull=False)
            .order_by('id')
            .first()
        ) or Attendance.objects.filter(employee=employee, date=today).order_by('id').first()

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

        # Reuse the existing record fetched above (handles duplicate-row DBs safely)
        if existing:
            existing.check_in = now_dt
            existing.is_present = True
            existing.company = employee.company
            existing.save(update_fields=['check_in', 'is_present', 'company'])
            attendance = existing
        else:
            attendance = Attendance.objects.create(
                employee=employee,
                company=employee.company,
                date=today,
                check_in=now_dt,
                is_present=True,
            )

        # Update status to online
        employee.status = 'online'
        employee.save(update_fields=['status'])

        # Detect missing checkout, skipping weekends and holidays
        missing_checkout_att, missing_checkout_date_val = get_missing_checkout(employee, today)

        if missing_checkout_att:
            try:
                # Stamp the flag so the admin grid and Celery daily task can see it
                if 'MISSING_CHECKOUT' not in (missing_checkout_att.remarks or ''):
                    missing_checkout_att.remarks = (
                        f"{missing_checkout_att.remarks} | MISSING_CHECKOUT"
                        if missing_checkout_att.remarks
                        else 'MISSING_CHECKOUT'
                    )
                    missing_checkout_att.save(update_fields=['remarks'])
                from employee.tasks import send_late_checkout_morning_alert
                send_late_checkout_morning_alert.delay(employee.id, missing_checkout_att.id)
            except Exception:
                # Celery broker may not be running — check-in must never fail because of this
                pass

        serializer = EmployeeAttendanceSerializer(attendance)
        return Response({
            "detail": f"Checked in at {now_dt.strftime('%H:%M:%S')} for shift {selected_shift.shift_type}",
            "is_late": is_late,
            "attendance": serializer.data,
            "missing_checkout_yesterday": missing_checkout_att is not None,
            "missing_checkout_date": str(missing_checkout_date_val) if missing_checkout_date_val else None,
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

        # Use filter+first to safely handle duplicate rows in the table
        attendance = (
            Attendance.objects
            .filter(employee=employee, date=today, check_in__isnull=False)
            .order_by('-check_in')
            .first()
        )
        if not attendance:
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

            # Detect missing checkout, skipping weekends and holidays
            _mc_att, missing_checkout_date_val = get_missing_checkout(employee, today)
            missing_checkout_yesterday = _mc_att is not None

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
                'missing_checkout_yesterday': missing_checkout_yesterday,
                'missing_checkout_date': str(missing_checkout_date_val) if missing_checkout_date_val else None,
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


class AllEmployeesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employees = Employee.objects.filter(is_active=True, user__role='employee').select_related(
            'department', 'designation', 'reporting_manager'
        )
        data = []
        for emp in employees:
            photo_url = None
            if emp.photo:
                try:
                    photo_url = request.build_absolute_uri(emp.photo.url)
                except Exception:
                    photo_url = emp.photo.name
            
            data.append({
                'id': emp.id,
                'employee_id': emp.employee_id,
                'first_name': emp.first_name,
                'last_name': emp.last_name,
                'full_name': f"{emp.first_name} {emp.last_name}".strip(),
                'department': emp.department_id,
                'department_name': emp.department.department_name if emp.department else None,
                'designation_name': emp.designation.designation_name if emp.designation else None,
                'reporting_manager_name': f"{emp.reporting_manager.first_name} {emp.reporting_manager.last_name}".strip() if emp.reporting_manager else None,
                'photo': photo_url,
                'avatarBg': 'bg-teal-500',
                'initials': ((emp.first_name or '')[:1] + (emp.last_name or '')[:1]).upper(),
            })
        return Response(data)


class MultiRaterMappingViewSet(viewsets.ModelViewSet):
    queryset = MultiRaterMapping.objects.all()
    serializer_class = MultiRaterMappingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = self.queryset.select_related('employee__designation', 'employee__department', 'reviewer__designation', 'cycle').all()
        employee_id = self.request.query_params.get('employee_id')
        reviewer_id = self.request.query_params.get('reviewer_id')
        cycle_id    = self.request.query_params.get('cycle_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if reviewer_id:
            queryset = queryset.filter(reviewer_id=reviewer_id)
        if cycle_id:
            queryset = queryset.filter(cycle_id=cycle_id)
        return queryset

    def perform_create(self, serializer):
        cycle = serializer.validated_data.get('cycle')
        if not cycle:
            cycle = AppraisalCycle.objects.filter(status='active').first() or AppraisalCycle.objects.first()
            serializer.save(cycle=cycle)
        else:
            serializer.save()


class EmployeePerformanceProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, emp_id):
        from datetime import datetime as dt
        employee = get_object_or_404(Employee, id=emp_id)

        raw_start = request.query_params.get('start_date', '').strip()
        raw_end   = request.query_params.get('end_date', '').strip()
        try:
            start_date = dt.strptime(raw_start, '%Y-%m-%d').date() if raw_start else None
            end_date   = dt.strptime(raw_end,   '%Y-%m-%d').date() if raw_end   else None
        except ValueError:
            start_date = end_date = None

        # 1. KRAs — filter by created_at when date range given
        kra_qs = EmployeeKRA.objects.filter(employee=employee).select_related('kra_master')
        if start_date:
            kra_qs = kra_qs.filter(created_at__date__gte=start_date)
        if end_date:
            kra_qs = kra_qs.filter(created_at__date__lte=end_date)
        kras_data = [{
            'id': k.id,
            'kra_name': k.kra_master.title if k.kra_master else None,
            'weightage': k.weightage,
            'target_description': k.target_description,
            'created_at': k.created_at.strftime('%Y-%m-%d') if k.created_at else None,
        } for k in kra_qs]

        # 2. Skills — no date on model; always return all
        skills = EmployeeSkill.objects.filter(employee=employee).select_related('skill')
        skills_data = [{
            'id': s.id,
            'skill_name': s.skill.name if s.skill else None,
            'proficiency_level': s.proficiency_level,
            'approval_status': s.approval_status,
        } for s in skills]

        # 3. Evaluations — filter by appraisal cycle start_date
        eval_qs = AppraisalEvaluation.objects.filter(employee=employee).select_related('cycle')
        if start_date:
            eval_qs = eval_qs.filter(cycle__start_date__gte=start_date)
        if end_date:
            eval_qs = eval_qs.filter(cycle__start_date__lte=end_date)
        evals_data = []
        for ev in eval_qs:
            final_rating = ev.hr_overall_rating or ev.manager_overall_rating
            answers_qs = AppraisalAnswer.objects.filter(evaluation=ev).select_related('question')
            answers_data = [{
                'id': ans.id,
                'question': ans.question.id,
                'question_text': ans.question.question_text,
                'question_type': ans.question.question_type,
                'role_type': ans.question.role_type,
                'rating_score': float(ans.rating_score) if ans.rating_score is not None else None,
                'comment': ans.comment,
            } for ans in answers_qs]
            evals_data.append({
                'id': ev.id,
                'cycle_name': ev.cycle.name if ev.cycle else 'General Cycle',
                'cycle_start': ev.cycle.start_date.strftime('%Y-%m-%d') if ev.cycle and ev.cycle.start_date else None,
                'cycle_end':   ev.cycle.end_date.strftime('%Y-%m-%d')   if ev.cycle and ev.cycle.end_date   else None,
                'self_rating':    float(ev.self_overall_rating)    if ev.self_overall_rating    is not None else None,
                'manager_rating': float(ev.manager_overall_rating) if ev.manager_overall_rating is not None else None,
                'final_rating':   float(final_rating)              if final_rating              is not None else None,
                'status': ev.status,
                'answers': answers_data,
            })

        # 4. Feedback — filter by created_at
        fb_qs = ContinuousFeedback.objects.filter(receiver=employee).select_related('sender')
        if start_date:
            fb_qs = fb_qs.filter(created_at__date__gte=start_date)
        if end_date:
            fb_qs = fb_qs.filter(created_at__date__lte=end_date)
        feedback_data = [{
            'id': f.id,
            'feedback_type': f.get_category_display(),
            'feedback_text': f.feedback_text,
            'rating': f.rating,
            'given_by_name': f"{f.sender.first_name} {f.sender.last_name}".strip() if f.sender else 'System',
            'created_at': f.created_at.strftime('%Y-%m-%d %H:%M') if f.created_at else None,
        } for f in fb_qs]

        # 5. 9-Box — Perf = KRA(50%) + Appraisal(30%) + Feedback(20%) blended
        all_evals = AppraisalEvaluation.objects.filter(employee=employee)
        kra_evals = KRAEvaluation.objects.filter(employee_kra__employee=employee).select_related('employee_kra__kra_master')

        # KRA weighted score
        kra_score = None
        if kra_evals.exists():
            total_w = sum(ev.employee_kra.weightage for ev in kra_evals)
            if total_w > 0:
                kra_score = sum(float(ev.score) * ev.employee_kra.weightage for ev in kra_evals) / total_w
            else:
                kra_score = sum(float(ev.score) for ev in kra_evals) / kra_evals.count()

        # Appraisal score
        rated = [float(ev.hr_overall_rating or ev.manager_overall_rating)
                 for ev in all_evals if ev.hr_overall_rating or ev.manager_overall_rating]
        appraisal_score = sum(rated) / len(rated) if rated else None

        # Peer feedback score (received from others, rated) — excludes self-feedback
        peer_fb = [f for f in fb_qs if f.rating and f.sender_id != employee.pk]
        fb_ratings = [f.rating for f in peer_fb]
        fb_score = sum(fb_ratings) / len(fb_ratings) if fb_ratings else None

        # Blend perf
        sources = [(kra_score, 0.5), (appraisal_score, 0.3), (fb_score, 0.2)]
        available = [(s, w) for s, w in sources if s is not None]
        if available:
            total_w = sum(w for _, w in available)
            perf_score = sum(s * w for s, w in available) / total_w
        else:
            perf_score = 0.0

        # Potential = Skills(50%) + Self-appraisal(30%) + Self-feedback(20%) fallback chain
        prof_map = {'beginner': 2.0, 'intermediate': 3.5, 'expert': 5.0}
        skill_avg = (sum(prof_map.get((s.proficiency_level or '').lower(), 3.0) for s in skills) / skills.count()) if skills.exists() else None

        self_appraisal_ratings = [float(ev.self_overall_rating) for ev in all_evals if ev.self_overall_rating]
        self_appraisal_avg = sum(self_appraisal_ratings) / len(self_appraisal_ratings) if self_appraisal_ratings else None

        # Self-feedback = ContinuousFeedback where sender = receiver = employee
        self_fb_qs = ContinuousFeedback.objects.filter(sender=employee, receiver=employee)
        self_fb_ratings = [f.rating for f in self_fb_qs if f.rating]
        self_fb_avg = sum(self_fb_ratings) / len(self_fb_ratings) if self_fb_ratings else None

        # Combine self signals: appraisal + self-feedback
        self_signals = [(v, w) for v, w in [(self_appraisal_avg, 0.6), (self_fb_avg, 0.4)] if v is not None]
        if self_signals:
            tw = sum(w for _, w in self_signals)
            combined_self = sum(v * w for v, w in self_signals) / tw
        else:
            combined_self = None

        pot_sources = [(skill_avg, 0.6), (combined_self, 0.4)]
        pot_available = [(s, w) for s, w in pot_sources if s is not None]
        if pot_available:
            tw = sum(w for _, w in pot_available)
            pot_score = sum(s * w for s, w in pot_available) / tw
        else:
            pot_score = 0.0

        # Breakdown data for frontend
        perf_breakdown = {
            'kra': {
                'score': round(kra_score, 2) if kra_score is not None else None,
                'weight': 50,
                'items': [{'title': ev.employee_kra.kra_master.title, 'score': float(ev.score), 'weightage': ev.employee_kra.weightage, 'remarks': ev.remarks} for ev in kra_evals],
            },
            'appraisal': {
                'score': round(appraisal_score, 2) if appraisal_score is not None else None,
                'weight': 30,
                'items': [{'cycle': ev.cycle.name if ev.cycle else 'General', 'rating': float(ev.hr_overall_rating or ev.manager_overall_rating), 'source': 'HR' if ev.hr_overall_rating else 'Manager'} for ev in all_evals if ev.hr_overall_rating or ev.manager_overall_rating],
            },
            'feedback': {
                'score': round(fb_score, 2) if fb_score is not None else None,
                'weight': 20,
                'items': [{'type': f.get_category_display(), 'rating': f.rating} for f in peer_fb],
            },
        }
        pot_breakdown = {
            'skills': {
                'score': round(skill_avg, 2) if skill_avg is not None else None,
                'weight': 60,
                'items': [{'name': s.skill.name if s.skill else '', 'level': s.proficiency_level, 'mapped': prof_map.get((s.proficiency_level or '').lower(), 3.0)} for s in skills],
            },
            'self_appraisal': {
                'score': round(self_appraisal_avg, 2) if self_appraisal_avg is not None else None,
                'weight': 24,
                'items': [{'cycle': ev.cycle.name if ev.cycle else 'General', 'rating': float(ev.self_overall_rating)} for ev in all_evals if ev.self_overall_rating],
            },
            'self_feedback': {
                'score': round(self_fb_avg, 2) if self_fb_avg is not None else None,
                'weight': 16,
                'items': [{'type': f.get_category_display(), 'rating': f.rating, 'text': f.feedback_text[:80]} for f in self_fb_qs if f.rating],
            },
        }

        def label(score):
            if score < 2.5: return 'Low'
            if score >= 4.0: return 'High'
            return 'Medium'

        perf_label = label(perf_score)
        pot_label  = label(pot_score)
        box_matrix = {
            ('Low', 'Low'): 'Risk', ('Low', 'Medium'): 'Inconsistent Player', ('Low', 'High'): 'Potential Gem',
            ('Medium', 'Low'): 'Average Performer', ('Medium', 'Medium'): 'Core Player', ('Medium', 'High'): 'High Potential',
            ('High', 'Low'): 'Solid Performer', ('High', 'Medium'): 'High Performer', ('High', 'High'): 'Star Performer',
        }

        return Response({
            'kras': kras_data,
            'skills': skills_data,
            'evaluations': evals_data,
            'feedbacks': feedback_data,
            'date_range': {'start': raw_start or None, 'end': raw_end or None},
            'nine_box': {
                'performance_score': round(perf_score, 2),
                'potential_score':   round(pot_score, 2),
                'performance_label': perf_label,
                'potential_label':   pot_label,
                'box_title': box_matrix.get((perf_label, pot_label), 'Core Player'),
                'perf_breakdown': perf_breakdown,
                'pot_breakdown': pot_breakdown,
            },
        })



class MyPerformanceDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = getattr(request.user, 'employee_profile', None)
        if not employee:
            return Response({"detail": "Employee profile not found."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Fetch KRAs
        kras = EmployeeKRA.objects.filter(employee=employee).select_related('kra_master')
        kras_data = []
        for k in kras:
            kras_data.append({
                'id': k.id,
                'kra_name': k.kra_master.title if k.kra_master else None,
                'weightage': k.weightage,
                'target_description': k.target_description,
            })

        # 2. Fetch Skills
        skills = EmployeeSkill.objects.filter(employee=employee).select_related('skill')
        skills_data = []
        for s in skills:
            skills_data.append({
                'id': s.id,
                'skill_name': s.skill.name if s.skill else None,
                'category': s.skill.category if s.skill else '',
                'proficiency_level': s.proficiency_level,
                'approval_status': s.approval_status
            })

        # 3. Fetch Appraisals & Evaluations
        evals = AppraisalEvaluation.objects.filter(employee=employee).select_related('cycle')
        evals_data = []
        for ev in evals:
            final_rating = ev.hr_overall_rating or ev.manager_overall_rating
            evals_data.append({
                'id': ev.id,
                'cycle_name': ev.cycle.name if ev.cycle else "General Cycle",
                'self_rating': float(ev.self_overall_rating) if ev.self_overall_rating is not None else None,
                'manager_rating': float(ev.manager_overall_rating) if ev.manager_overall_rating is not None else None,
                'final_rating': float(final_rating) if final_rating is not None else None,
                'status': ev.status,
                'self_appraisal_deadline': ev.cycle.self_appraisal_deadline.strftime('%Y-%m-%d %H:%M') if ev.cycle and ev.cycle.self_appraisal_deadline else None
            })

        # 4. Fetch Continuous Feedback (Received & Provided)
        feedbacks_received = ContinuousFeedback.objects.filter(receiver=employee).select_related('sender')
        feedbacks_received_data = []
        for f in feedbacks_received:
            feedbacks_received_data.append({
                'id': f.id,
                'feedback_type': f.get_category_display(),
                'feedback_text': f.feedback_text,
                'rating': f.rating,
                'given_by_name': f"{f.sender.first_name} {f.sender.last_name}".strip() if f.sender else "System",
                'created_at': f.created_at.strftime('%Y-%m-%d %H:%M') if f.created_at else None
            })

        feedbacks_provided = ContinuousFeedback.objects.filter(sender=employee).select_related('receiver')
        feedbacks_provided_data = []
        for f in feedbacks_provided:
            feedbacks_provided_data.append({
                'id': f.id,
                'feedback_type': f.get_category_display(),
                'feedback_text': f.feedback_text,
                'rating': f.rating,
                'receiver_name': f"{f.receiver.first_name} {f.receiver.last_name}".strip() if f.receiver else "System",
                'created_at': f.created_at.strftime('%Y-%m-%d %H:%M') if f.created_at else None,
                'visibility': f.visibility or 'private',
            })

        # 5. 9-Box — Perf = KRA(50%) + Appraisal(30%) + Feedback(20%) blended
        kra_evals = KRAEvaluation.objects.filter(employee_kra__employee=employee).select_related('employee_kra__kra_master')

        kra_score = None
        if kra_evals.exists():
            total_w = sum(ev.employee_kra.weightage for ev in kra_evals)
            if total_w > 0:
                kra_score = sum(float(ev.score) * ev.employee_kra.weightage for ev in kra_evals) / total_w
            else:
                kra_score = sum(float(ev.score) for ev in kra_evals) / kra_evals.count()

        rated = [float(ev.hr_overall_rating or ev.manager_overall_rating)
                 for ev in evals if ev.hr_overall_rating or ev.manager_overall_rating]
        appraisal_score = sum(rated) / len(rated) if rated else None

        fb_ratings = [f.rating for f in feedbacks_received if f.rating]
        fb_score = sum(fb_ratings) / len(fb_ratings) if fb_ratings else None

        sources = [(kra_score, 0.5), (appraisal_score, 0.3), (fb_score, 0.2)]
        available = [(s, w) for s, w in sources if s is not None]
        if available:
            total_w = sum(w for _, w in available)
            perf_score = sum(s * w for s, w in available) / total_w
        else:
            perf_score = 0.0

        prof_map = {'beginner': 2.0, 'intermediate': 3.5, 'expert': 5.0}
        skill_avg = (sum(prof_map.get((s.proficiency_level or '').lower(), 3.0) for s in skills) / skills.count()) if skills.exists() else None
        self_ratings = [float(ev.self_overall_rating) for ev in evals if ev.self_overall_rating]
        self_avg = sum(self_ratings) / len(self_ratings) if self_ratings else None

        if skill_avg is not None and self_avg is not None:
            pot_score = skill_avg * 0.6 + self_avg * 0.4
        elif skill_avg is not None:
            pot_score = skill_avg
        elif self_avg is not None:
            pot_score = self_avg
        else:
            pot_score = 0.0

        perf_label = "Medium"
        if perf_score < 2.5: perf_label = "Low"
        elif perf_score >= 4.0: perf_label = "High"

        pot_label = "Medium"
        if pot_score < 2.5: pot_label = "Low"
        elif pot_score >= 4.0: pot_label = "High"

        box_matrix = {
            ("Low", "Low"): "Risk",
            ("Low", "Medium"): "Inconsistent Player",
            ("Low", "High"): "Potential Gem",
            ("Medium", "Low"): "Average Performer",
            ("Medium", "Medium"): "Core Player",
            ("Medium", "High"): "High Potential",
            ("High", "Low"): "Solid Performer",
            ("High", "Medium"): "High Performer",
            ("High", "High"): "Star Performer",
        }
        box_title = box_matrix.get((perf_label, pot_label), "Core Player")

        # 6. Summary metrics
        total_weightage = sum([k.weightage for k in kras])
        active_appraisal = next((ev for ev in evals_data if ev['status'] in ['draft', 'submitted_self']), None)
        if not active_appraisal and evals_data:
            active_appraisal = evals_data[0]

        summary = {
            'kras_count': len(kras_data),
            'total_kra_weightage': total_weightage,
            'skills_count': len(skills_data),
            'feedbacks_received_count': len(feedbacks_received_data),
            'feedbacks_provided_count': len(feedbacks_provided_data),
            'active_appraisal_status': active_appraisal['status'] if active_appraisal else 'No active cycle',
            'active_appraisal_cycle': active_appraisal['cycle_name'] if active_appraisal else None,
            'performance_label': perf_label,
            'potential_label': pot_label,
            'box_title': box_title
        }

        return Response({
            'summary': summary,
            'kras': kras_data,
            'skills': skills_data,
            'evaluations': evals_data,
            'feedbacks_received': feedbacks_received_data,
            'feedbacks_provided': feedbacks_provided_data,
            'nine_box': {
                'performance_score': round(perf_score, 2),
                'potential_score': round(pot_score, 2),
                'performance_label': perf_label,
                'potential_label': pot_label,
                'box_title': box_title
            }
        })


class PerformanceDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    AVATAR_COLORS = ['bg-emerald-500','bg-indigo-500','bg-amber-500','bg-teal-500','bg-rose-500','bg-blue-500','bg-purple-500','bg-pink-500','bg-cyan-500','bg-violet-500']
    PROF_MAP = {'beginner': 2.0, 'intermediate': 3.5, 'expert': 5.0}

    def _label(self, score):
        if score < 2.5: return 'low'
        if score >= 4.0: return 'high'
        return 'medium'

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        department = request.query_params.get('department', '').strip()
        designation = request.query_params.get('designation', '').strip()

        base_qs = Employee.objects.filter(is_active=True, user__role='employee').select_related('department', 'designation')

        # Always pull dropdown options from the full unfiltered set
        all_depts = sorted(set(
            v for v in base_qs.values_list('department__department_name', flat=True) if v
        ))
        all_desigs = sorted(set(
            v for v in base_qs.values_list('designation__designation_name', flat=True) if v
        ))

        qs = base_qs
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(designation__designation_name__icontains=search)
            )
        if department:
            qs = qs.filter(department__department_name__iexact=department)
        if designation:
            qs = qs.filter(designation__designation_name__icontains=designation)

        # Bulk-fetch all related data in one pass each
        emp_ids = list(qs.values_list('id', flat=True))

        # Appraisal scores
        evals_qs = AppraisalEvaluation.objects.filter(employee_id__in=emp_ids).values(
            'employee_id', 'hr_overall_rating', 'manager_overall_rating', 'self_overall_rating')
        eval_map   = {}  # employee_id -> [appraisal_score, ...]
        self_rat_map = {}  # employee_id -> [self_rating, ...]
        for ev in evals_qs:
            appr = float(ev['hr_overall_rating'] or ev['manager_overall_rating'] or 0)
            if appr:
                eval_map.setdefault(ev['employee_id'], []).append(appr)
            if ev['self_overall_rating']:
                self_rat_map.setdefault(ev['employee_id'], []).append(float(ev['self_overall_rating']))

        # KRA evaluation scores (weighted)
        kra_eval_qs = KRAEvaluation.objects.filter(
            employee_kra__employee_id__in=emp_ids
        ).values('employee_kra__employee_id', 'employee_kra__weightage', 'score')
        kra_map = {}  # employee_id -> list of (score, weightage)
        for ke in kra_eval_qs:
            if ke['score'] is not None:
                kra_map.setdefault(ke['employee_kra__employee_id'], []).append(
                    (float(ke['score']), float(ke['employee_kra__weightage'] or 0))
                )

        # Peer feedback (exclude self-to-self)
        fb_qs = ContinuousFeedback.objects.filter(receiver_id__in=emp_ids).exclude(
            sender_id=None
        ).values('receiver_id', 'sender_id', 'rating')
        peer_fb_map  = {}  # employee_id -> [rating, ...]
        self_fb_map  = {}  # employee_id -> [rating, ...]
        for fb in fb_qs:
            if fb['rating'] is None:
                continue
            if fb['sender_id'] == fb['receiver_id']:
                self_fb_map.setdefault(fb['receiver_id'], []).append(float(fb['rating']))
            else:
                peer_fb_map.setdefault(fb['receiver_id'], []).append(float(fb['rating']))

        # Skills
        skills_qs = EmployeeSkill.objects.filter(employee_id__in=emp_ids).values('employee_id', 'proficiency_level')
        skill_map = {}
        for sk in skills_qs:
            v = self.PROF_MAP.get((sk['proficiency_level'] or '').lower(), 3.0)
            skill_map.setdefault(sk['employee_id'], []).append(v)

        def _blend(sources):
            available = [(s, w) for s, w in sources if s is not None]
            if not available:
                return 0.0
            tw = sum(w for _, w in available)
            return sum(s * w for s, w in available) / tw

        data = []
        for emp in qs:
            dept_name  = emp.department.department_name  if emp.department  else None
            desig_name = emp.designation.designation_name if emp.designation else None

            # Perf score: KRA(50%) + Appraisal(30%) + Peer feedback(20%)
            kra_pairs = kra_map.get(emp.id, [])
            if kra_pairs:
                total_w = sum(w for _, w in kra_pairs)
                kra_score = sum(s * w for s, w in kra_pairs) / total_w if total_w else None
            else:
                kra_score = None

            appr_list = eval_map.get(emp.id, [])
            appraisal_score = sum(appr_list) / len(appr_list) if appr_list else None

            peer_list = peer_fb_map.get(emp.id, [])
            peer_score = sum(peer_list) / len(peer_list) if peer_list else None

            perf_score = _blend([(kra_score, 0.5), (appraisal_score, 0.3), (peer_score, 0.2)])

            # Potential score: Skills(60%) + [Self-appraisal(60%) + Self-feedback(40%)](40%)
            pot_scores = skill_map.get(emp.id, [])
            skill_avg = sum(pot_scores) / len(pot_scores) if pot_scores else None

            self_rat = self_rat_map.get(emp.id, [])
            self_appr_avg = sum(self_rat) / len(self_rat) if self_rat else None

            self_fb = self_fb_map.get(emp.id, [])
            self_fb_avg = sum(self_fb) / len(self_fb) if self_fb else None

            combined_self = _blend([(self_appr_avg, 0.6), (self_fb_avg, 0.4)])
            combined_self_val = combined_self if (self_appr_avg is not None or self_fb_avg is not None) else None
            pot_score = _blend([(skill_avg, 0.6), (combined_self_val, 0.4)])

            initials = ((emp.first_name or '')[:1] + (emp.last_name or '')[:1]).upper()
            data.append({
                'id': emp.id,
                'name': f"{emp.first_name} {emp.last_name}".strip(),
                'initials': initials,
                'avatarBg': self.AVATAR_COLORS[emp.id % len(self.AVATAR_COLORS)],
                'designation': desig_name or '',
                'department': dept_name or '',
                'performance': self._label(perf_score),
                'potential': self._label(pot_score),
                'performanceScore': round(perf_score / 5 * 100, 1),
                'potentialScore': round(pot_score / 5 * 100, 1),
            })

        return Response({
            'employees': data,
            'departments': all_depts,
            'designations': all_desigs,
        })


class KRAMasterViewSet(viewsets.ModelViewSet):
    queryset = KRAMaster.objects.all().prefetch_related('departments')
    serializer_class = KRAMasterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = self.queryset.all()
        dept = self.request.query_params.get('department')
        if dept:
            qs = qs.filter(departments__id=dept).distinct()
        return qs


class KPIMasterViewSet(viewsets.ModelViewSet):
    queryset = KPIMaster.objects.all().prefetch_related('departments').select_related('kra_master')
    serializer_class = KPIMasterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = self.queryset.all()
        dept = self.request.query_params.get('department')
        kra = self.request.query_params.get('kra_master')
        if dept:
            qs = qs.filter(departments__id=dept).distinct()
        if kra:
            qs = qs.filter(kra_master_id=kra)
        return qs


class ContinuousFeedbackViewSet(viewsets.ModelViewSet):
    queryset = ContinuousFeedback.objects.all().select_related('sender', 'receiver')
    serializer_class = ContinuousFeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = self.queryset.all()
        params = self.request.query_params
        mine     = params.get('mine')
        receiver = params.get('receiver')
        sender   = params.get('sender')
        category = params.get('category')

        # ?mine=true → always scope to the logged-in employee's received feedback
        if mine == 'true':
            try:
                qs = qs.filter(receiver=self.request.user.employee_profile)
            except Exception:
                qs = qs.none()
        elif receiver:
            qs = qs.filter(receiver_id=receiver)

        if sender:
            qs = qs.filter(sender_id=sender)
        if category:
            qs = qs.filter(category=category)
        return qs

    @action(detail=False, methods=['get'])
    def my_reportees(self, request):
        """Return employees whose reporting_manager is the current user."""
        try:
            me = request.user.employee_profile
        except Exception:
            return Response([])
        from app.models import Employee as EmpModel
        reportees = EmpModel.objects.filter(reporting_manager=me).select_related('designation', 'department')
        return Response([{
            'id':          e.id,
            'name':        e.full_name or f"{e.first_name} {e.last_name}".strip() or f"Employee #{e.id}",
            'initials':    ((e.first_name or '')[:1] + (e.last_name or '')[:1]).upper() or '?',
            'designation': e.designation.designation_name if e.designation else '',
            'department':  e.department.department_name  if e.department  else '',
        } for e in reportees])

    def perform_create(self, serializer):
        if serializer.validated_data.get('sender'):
            serializer.save()
            return
        try:
            sender = self.request.user.employee_profile
        except Exception:
            sender = Employee.objects.first()
        serializer.save(sender=sender)


class EmployeeKRAViewSet(viewsets.ModelViewSet):
    queryset = EmployeeKRA.objects.all()
    serializer_class = EmployeeKRASerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = self.queryset.select_related('employee', 'kra_master', 'reviewer').all()
        employee_id = self.request.query_params.get('employee_id')
        reviewer_id = self.request.query_params.get('reviewer_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if reviewer_id:
            queryset = queryset.filter(reviewer_id=reviewer_id)
        return queryset


class KRAEvaluationViewSet(viewsets.ModelViewSet):
    queryset = KRAEvaluation.objects.select_related(
        'employee_kra__employee', 'employee_kra__kra_master', 'employee_kra__reviewer'
    )
    serializer_class = KRAEvaluationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = self.queryset.all()
        employee_id = self.request.query_params.get('employee_id')
        reviewer_id = self.request.query_params.get('reviewer_id')
        if employee_id:
            qs = qs.filter(employee_kra__employee_id=employee_id)
        if reviewer_id:
            qs = qs.filter(employee_kra__reviewer_id=reviewer_id)
        return qs

    def create(self, request, *args, **kwargs):
        # Upsert: if evaluation already exists for this employee_kra, update it
        employee_kra_id = request.data.get('employee_kra')
        existing = KRAEvaluation.objects.filter(employee_kra_id=employee_kra_id).first()
        if existing:
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)


class AppraisalExtensionViewSet(viewsets.ModelViewSet):
    queryset = AppraisalExtension.objects.select_related('cycle', 'employee', 'requester').order_by('-id')
    serializer_class = AppraisalExtensionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = self.queryset.all()
        cycle = self.request.query_params.get('cycle')
        status = self.request.query_params.get('status')
        employee = self.request.query_params.get('employee')
        if cycle:
            qs = qs.filter(cycle_id=cycle)
        if status:
            qs = qs.filter(status=status)
        if employee:
            qs = qs.filter(employee_id=employee)
        return qs

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        ext = self.get_object()
        ext.status = 'approved'
        ext.save()
        return Response(self.get_serializer(ext).data)

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        ext = self.get_object()
        ext.status = 'rejected'
        ext.save()
        return Response(self.get_serializer(ext).data)


class SalaryHikeConfigViewSet(viewsets.ModelViewSet):
    queryset = SalaryHikeConfig.objects.select_related('cycle').order_by('min_rating')
    serializer_class = SalaryHikeConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = self.queryset.all()
        cycle = self.request.query_params.get('cycle')
        if cycle:
            qs = qs.filter(cycle_id=cycle)
        return qs


class AppraisalCycleViewSet(viewsets.ModelViewSet):
    queryset = AppraisalCycle.objects.prefetch_related('questions').order_by('-id')
    serializer_class = AppraisalCycleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.all()

    def perform_create(self, serializer):
        serializer.save()
        self._sync_statuses()

    def perform_update(self, serializer):
        serializer.save()
        self._sync_statuses()

    def _sync_statuses(self):
        try:
            from .tasks import sync_appraisal_cycle_statuses
            sync_appraisal_cycle_statuses()
        except Exception:
            pass




class AppraisalEvaluationViewSet(viewsets.ModelViewSet):
    queryset = AppraisalEvaluation.objects.all().select_related('employee', 'cycle', 'manager').prefetch_related('answers__question')
    serializer_class = AppraisalEvaluationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = self.queryset.all()
        # Default behavior: filter for logged-in employee unless they are requesting for managees
        mine = self.request.query_params.get('mine')
        cycle_id = self.request.query_params.get('cycle')
        
        try:
            employee = self.request.user.employee_profile
        except Exception:
            return qs.none()

        all_evaluations = self.request.query_params.get('all_evaluations')
        is_admin = getattr(self.request.user, 'role', None) == 'admin' or self.request.user.is_superuser

        if all_evaluations == 'true' and is_admin:
            pass # Admin requesting all evaluations in the system
        elif mine == 'true' or not is_admin:
            qs = qs.filter(employee=employee)
        else:
            # For staff/admin, allow querying other employees
            target_emp_id = self.request.query_params.get('employee') or self.request.query_params.get('employee_id')
            if target_emp_id:
                qs = qs.filter(employee_id=target_emp_id)
            else:
                # Let manager see managees
                qs = qs.filter(Q(employee=employee) | Q(manager=employee))
            
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)
            
        return qs

    def perform_create(self, serializer):
        try:
            employee = self.request.user.employee_profile
        except Exception:
            raise ValidationError("You must have an employee profile to create an evaluation.")
        
        # Determine manager
        manager = employee.reporting_manager
        
        # Check if already exists for this cycle
        cycle = serializer.validated_data.get('cycle')
        if AppraisalEvaluation.objects.filter(employee=employee, cycle=cycle).exists():
            raise ValidationError("An appraisal evaluation already exists for this cycle.")
            
        serializer.save(employee=employee, manager=manager, status='draft')

    @action(detail=True, methods=['post'])
    def save_answers(self, request, pk=None):
        evaluation = self.get_object()
        
        # Check permissions
        try:
            employee = request.user.employee_profile
        except Exception:
            return Response({"detail": "Employee profile required."}, status=403)
            
        if evaluation.employee != employee and evaluation.manager != employee:
            raise PermissionDenied("You do not have permission to edit this evaluation.")
            
        # Check deadline and extension
        from django.utils import timezone
        deadline = evaluation.cycle.self_appraisal_deadline
        if deadline and timezone.now() > deadline:
            from employee.models import AppraisalExtension
            has_extension = AppraisalExtension.objects.filter(
                cycle=evaluation.cycle,
                employee=employee,
                status='approved',
                original_deadline=deadline,
                extended_deadline__gt=timezone.now()
            ).exists()
            if not has_extension:
                return Response({"detail": f"Self appraisal deadline ({deadline.strftime('%d %b %Y, %I:%M %p')}) has passed. Contact HR for extension."}, status=400)

        answers_data = request.data.get('answers', [])
        is_submit = request.data.get('submit', False) # True if final submit
        
        # Save each answer
        for ans in answers_data:
            q_id = ans.get('question_id')
            rating = ans.get('rating_score')
            comment = ans.get('comment', '')
            
            question = get_object_or_404(AppraisalQuestion, id=q_id)
            
            # Create or update answer
            AppraisalAnswer.objects.update_or_create(
                evaluation=evaluation,
                question=question,
                submitted_by=employee,
                defaults={
                    'rating_score': rating,
                    'comment': comment
                }
            )
            
        if is_submit:
            self_answers = AppraisalAnswer.objects.filter(evaluation=evaluation, question__role_type='self')
            ratings = [a.rating_score for a in self_answers if a.rating_score is not None]
            if ratings:
                evaluation.self_overall_rating = sum(ratings) / len(ratings)
            evaluation.status = 'submitted_self'
            evaluation.save(update_fields=['self_overall_rating', 'status'])

        # Return serialized evaluation
        return Response(self.get_serializer(evaluation).data)

    @action(detail=False, methods=['post'])
    def submit_feedback(self, request):
        """Peer / Manager / HR submits answers against a target employee's evaluation."""
        try:
            reviewer = request.user.employee_profile
        except Exception:
            return Response({"detail": "Employee profile required."}, status=403)

        target_id = request.data.get('target_employee_id')
        cycle_id = request.data.get('cycle_id')
        role_type = request.data.get('role_type')
        answers_data = request.data.get('answers', [])

        if not all([target_id, cycle_id, role_type]):
            return Response({"detail": "target_employee_id, cycle_id and role_type are required."}, status=400)

        from app.models import Employee as EmpModel
        target = get_object_or_404(EmpModel, id=target_id)
        cycle = get_object_or_404(AppraisalCycle, id=cycle_id)

        # Check deadline and extension
        if role_type in ['peer', 'manager']:
            from django.utils import timezone
            deadline = cycle.peer_deadline if role_type == 'peer' else cycle.manager_eval_deadline
            if deadline and timezone.now() > deadline:
                from employee.models import AppraisalExtension
                has_extension = AppraisalExtension.objects.filter(
                    cycle=cycle,
                    employee=reviewer,
                    status='approved',
                    original_deadline=deadline,
                    extended_deadline__gt=timezone.now()
                ).exists()
                if not has_extension:
                    role_label = "Peer appraisal" if role_type == 'peer' else "Manager evaluation"
                    return Response({"detail": f"{role_label} deadline ({deadline.strftime('%d %b %Y, %I:%M %p')}) has passed. Contact HR for extension."}, status=400)

        evaluation, _ = AppraisalEvaluation.objects.get_or_create(
            employee=target, cycle=cycle, defaults={'status': 'draft'}
        )

        for ans in answers_data:
            q_id = ans.get('question_id')
            rating = ans.get('rating_score')
            comment = ans.get('comment', '')
            question = get_object_or_404(AppraisalQuestion, id=q_id, cycle=cycle, role_type=role_type)
            AppraisalAnswer.objects.update_or_create(
                evaluation=evaluation, question=question, submitted_by=reviewer,
                defaults={'rating_score': rating, 'comment': comment}
            )

        # Recalculate overall ratings after answers are created
        if role_type == 'self':
            self_answers = AppraisalAnswer.objects.filter(evaluation=evaluation, question__role_type='self')
            self_ratings = [a.rating_score for a in self_answers if a.rating_score is not None]
            if self_ratings:
                evaluation.self_overall_rating = sum(self_ratings) / len(self_ratings)
            evaluation.status = 'submitted_self'
            evaluation.save(update_fields=['self_overall_rating', 'status'])
        elif role_type == 'manager':
            mgr_answers = AppraisalAnswer.objects.filter(evaluation=evaluation, question__role_type='manager')
            mgr_ratings = [a.rating_score for a in mgr_answers if a.rating_score is not None]
            if mgr_ratings:
                evaluation.manager_overall_rating = sum(mgr_ratings) / len(mgr_ratings)
            evaluation.status = 'submitted_manager'
            evaluation.save(update_fields=['manager_overall_rating', 'status'])
        elif role_type == 'hr':
            hr_answers = AppraisalAnswer.objects.filter(evaluation=evaluation, question__role_type='hr')
            hr_ratings = [a.rating_score for a in hr_answers if a.rating_score is not None]
            if hr_ratings:
                evaluation.hr_overall_rating = sum(hr_ratings) / len(hr_ratings)
            evaluation.status = 'completed'
            evaluation.save(update_fields=['hr_overall_rating', 'status'])

        return Response({"detail": f"{role_type} feedback submitted for {target}.", "evaluation_id": evaluation.id})

    @action(detail=False, methods=['post'])
    def apply_salary_hike(self, request):
        """
        Apply salary hike to one or more employees based on their perf_score
        and the SalaryHikeConfig bands for their cycle.

        Body: { evaluation_ids: [int, ...] }   — bulk (pass [] for none)
              OR omit evaluation_ids to auto-apply to all evals in the cycle.
              cycle_id is required.
        """
        from app.models import Employee as EmpModel

        cycle_id = request.data.get('cycle_id')
        eval_ids  = request.data.get('evaluation_ids')   # None = apply all in cycle

        if not cycle_id:
            return Response({"detail": "cycle_id is required."}, status=400)

        cycle = get_object_or_404(AppraisalCycle, id=cycle_id)

        # Load hike bands for this cycle
        bands = list(SalaryHikeConfig.objects.filter(cycle=cycle).order_by('-min_rating'))
        if not bands:
            return Response({"detail": "No salary hike config found for this cycle."}, status=400)

        def hike_pct_for_score(score):
            if score is None:
                return None
            for band in bands:
                if float(band.min_rating) <= float(score) <= float(band.max_rating):
                    return float(band.recommended_hike_percentage)
            return None

        # Resolve evaluations
        qs = AppraisalEvaluation.objects.filter(cycle=cycle).select_related('employee').prefetch_related('answers__question')
        if eval_ids is not None:
            qs = qs.filter(id__in=eval_ids)

        results = []
        for ev in qs:
            # Compute perf_score inline (same logic as serializer)
            answers = list(ev.answers.all())
            def role_avg(rt):
                vals = [float(a.rating_score) for a in answers
                        if a.question.role_type == rt and a.rating_score is not None]
                return sum(vals) / len(vals) if vals else None

            candidates = [
                float(ev.self_overall_rating)    if ev.self_overall_rating    is not None else None,
                float(ev.manager_overall_rating) if ev.manager_overall_rating is not None else None,
                role_avg('peer'),
                float(ev.hr_overall_rating)      if ev.hr_overall_rating      is not None else None,
            ]
            valid = [v for v in candidates if v is not None]
            perf_score = round(sum(valid) / len(valid), 2) if valid else None

            # Require all three core feedback types to be present
            has_peer = any(a.question.role_type == 'peer' and a.rating_score is not None for a in answers)
            if ev.self_overall_rating is None or ev.manager_overall_rating is None or not has_peer:
                results.append({"evaluation_id": ev.id, "employee_id": ev.employee_id,
                                 "skipped": True, "reason": "Incomplete feedback (needs self + manager + peer)"})
                continue

            hike = hike_pct_for_score(perf_score)
            if hike is None:
                results.append({"evaluation_id": ev.id, "employee_id": ev.employee_id,
                                 "skipped": True, "reason": "No matching hike band for score"})
                continue

            emp = ev.employee
            old_salary = float(emp.basic_salary or 0)
            new_salary  = round(old_salary * (1 + hike / 100), 2)
            EmpModel.objects.filter(id=emp.id).update(basic_salary=new_salary)

            results.append({
                "evaluation_id":  ev.id,
                "employee_id":    emp.id,
                "employee_name":  emp.full_name or f"{emp.first_name} {emp.last_name}".strip(),
                "perf_score":     perf_score,
                "hike_percent":   hike,
                "old_basic":      old_salary,
                "new_basic":      new_salary,
                "applied":        True,
            })

        return Response({"cycle": cycle.name, "results": results})

    @action(detail=False, methods=['get'])
    def my_feedback_targets(self, request):
        """
        Returns the list of employees the current user must give feedback to
        in the active appraisal cycle, split by role_type.
        - manager : direct reportees (reporting_manager = me)
        - peer    : MultiRater mappings for this cycle where reviewer = me;
                    falls back to ALL company employees (minus self) if none exist
        """
        try:
            me = request.user.employee_profile
        except Exception:
            return Response({"detail": "Employee profile required."}, status=403)

        cycle_id = request.query_params.get('cycle')
        if cycle_id:
            cycle = get_object_or_404(AppraisalCycle, id=cycle_id)
        else:
            cycle = AppraisalCycle.objects.filter(status='active').first()

        if not cycle:
            return Response({"cycle": None, "targets": []})

        from app.models import Employee as EmpModel

        # Pre-fetch all answers submitted by ME in this cycle (single query)
        my_answers = AppraisalAnswer.objects.filter(
            submitted_by=me,
            evaluation__cycle=cycle
        ).select_related('question', 'evaluation__employee')

        # Group by (evaluation.employee_id, question.role_type)
        from collections import defaultdict
        ans_by_emp_role = defaultdict(list)
        for a in my_answers:
            key = (a.evaluation.employee_id, a.question.role_type)
            ans_by_emp_role[key].append({
                "question_id":   a.question.id,
                "question_text": a.question.question_text,
                "question_type": a.question.question_type,
                "max_score":     a.question.max_score,
                "rating_score":  float(a.rating_score) if a.rating_score is not None else None,
                "comment":       a.comment,
            })

        def emp_dict(emp, relation):
            desig = emp.designation.designation_name if emp.designation else ''
            dept  = emp.department.department_name  if emp.department  else ''
            initials = ((emp.first_name or '')[:1] + (emp.last_name or '')[:1]).upper() or '?'
            role_type = relation  # same value for the key
            submitted_answers = ans_by_emp_role.get((emp.id, role_type), [])
            return {
                "id": emp.id,
                "name": emp.full_name or f"{emp.first_name} {emp.last_name}".strip() or "—",
                "initials": initials,
                "designation": desig,
                "department": dept,
                "relation": relation,
                "already_submitted": len(submitted_answers) > 0,
                "submitted_answers": submitted_answers,
            }

        targets = []

        role_types = set(AppraisalQuestion.objects.filter(cycle=cycle).values_list('role_type', flat=True))

        # 1. Self — current user always appears if cycle has self questions
        if 'self' in role_types:
            targets.append(emp_dict(me, 'self'))

        # 2. Manager targets — employees whose reporting_manager is me
        if 'manager' in role_types:
            reportees = EmpModel.objects.filter(reporting_manager=me).select_related('designation', 'department')
            for emp in reportees:
                targets.append(emp_dict(emp, 'manager'))

        # 3. Peer targets — explicit MultiRater mappings (set by admin in Multi-Rater Selection)
        if 'peer' in role_types:
            mappings = MultiRaterMapping.objects.filter(cycle=cycle, reviewer=me).select_related(
                'employee__designation', 'employee__department'
            )
            for m in mappings:
                targets.append(emp_dict(m.employee, 'peer'))

        return Response({
            "cycle_id": cycle.id,
            "cycle_name": cycle.name,
            "targets": targets,
            "role_types": list(role_types),
            "my_employee_id": me.id
        })


class AppraisalQuestionViewSet(viewsets.ModelViewSet):
    queryset = AppraisalQuestion.objects.select_related('cycle').order_by('id')
    serializer_class = AppraisalQuestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = self.queryset.all()
        cycle = self.request.query_params.get('cycle')
        role_type = self.request.query_params.get('role_type')
        if cycle:
            qs = qs.filter(cycle_id=cycle)
        if role_type:
            qs = qs.filter(role_type=role_type)
        return qs


class EmployeeKRATasksAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({"detail": "employee_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        tasks = Task.objects.filter(assignments__employee_id=employee_id, kra__isnull=False).select_related('kra__kra_master')
        data = []
        for t in tasks:
            data.append({
                'id': t.id,
                'title': t.title,
                'description': t.description,
                'priority': t.priority,
                'status': t.status,
                'deadline': t.deadline.strftime('%Y-%m-%d') if t.deadline else None,
                'kra_id': t.kra_id,
                'kra_title': t.kra.kra_master.title if t.kra and t.kra.kra_master else None
            })
        return Response(data)

    def post(self, request):
        employee_id = request.data.get('employee_id')
        kra_id = request.data.get('kra_id')
        title = request.data.get('title')
        description = request.data.get('description')
        priority = request.data.get('priority', 'medium')
        deadline = request.data.get('deadline')

        if not (employee_id and kra_id and title and deadline):
            return Response({"detail": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            creator = request.user.employee_profile
        except Employee.DoesNotExist:
            creator = Employee.objects.first()

        task = Task.objects.create(
            title=title,
            description=description,
            created_by=creator,
            priority=priority,
            status='todo',
            deadline=deadline,
            kra_id=kra_id
        )

        TaskAssignment.objects.create(
            task=task,
            employee_id=employee_id,
            role='owner',
            status='todo'
        )

        return Response({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'priority': task.priority,
            'status': task.status,
            'deadline': task.deadline.strftime('%Y-%m-%d') if task.deadline else None,
            'kra_id': task.kra_id
        }, status=status.HTTP_201_CREATED)
