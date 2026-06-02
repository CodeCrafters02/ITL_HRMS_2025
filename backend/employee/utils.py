from datetime import datetime, timedelta

# Monday=0 … Sunday=6  (matches Python's date.weekday())
_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


def get_missing_checkout(employee, today):
    """
    Return (Attendance, date) for the most recent past *working* day on which
    the employee genuinely checked in but never checked out.

    Skips:
    - Company holidays and the department's configured weekend days
    - Auto-generated / placeholder records (remarks contain 'Off day',
      'No attendance record', 'auto', etc.)
    Looks back up to 14 calendar days.
    Returns (None, None) when nothing is found or on any unexpected error.
    """
    # Remarks substrings that indicate a system-generated placeholder row,
    # NOT a real employee check-in.
    SKIP_REMARKS = ('off day', 'no attendance record', 'auto', 'holiday')

    try:
        from app.models import CalendarEvent, DepartmentWiseWorkingDays, Attendance

        # Weekend days from the employee's department config (default: Sat + Sun)
        weekend_names = {'Saturday', 'Sunday'}
        if getattr(employee, 'department_id', None):
            dwwd = DepartmentWiseWorkingDays.objects.filter(
                department_id=employee.department_id
            ).first()
            if dwwd and dwwd.weekend_days:
                weekend_names = set(dwwd.weekend_days)

        # Company holiday dates
        holiday_dates: set = set()
        if getattr(employee, 'company_id', None):
            holiday_dates = set(
                CalendarEvent.objects.filter(
                    is_holiday=True,
                    company_id=employee.company_id,
                ).values_list('date', flat=True)
            )

        for days_back in range(1, 15):
            check_date = today - timedelta(days=days_back)

            # Skip weekends
            if _DAY_NAMES[check_date.weekday()] in weekend_names:
                continue

            # Skip holidays
            if check_date in holiday_dates:
                continue

            att = Attendance.objects.filter(
                employee=employee,
                date=check_date,
                check_in__isnull=False,   # must have genuinely checked in
                check_out__isnull=True,
            ).first()

            if not att:
                continue

            # Skip system-generated / placeholder records
            remarks_lower = (att.remarks or '').lower()
            if any(kw in remarks_lower for kw in SKIP_REMARKS):
                continue

            return att, check_date

        return None, None
    except Exception:
        return None, None


def calculate_worked_time(check_in, check_out=None, now=None):
    """
    Calculates total worked time.
    Returns tuple: (formatted string, total seconds)
    """
    if not check_in:
        return "0h 0m", 0

    end_time = check_out or now or datetime.now(check_in.tzinfo)
    total_seconds = int((end_time - check_in).total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    return f"{hours}h {minutes}m", total_seconds


def calculate_effective_time(check_in, break_minutes=0, check_out=None, now=None):
    """
    Calculates effective work time after subtracting break time.
    Returns dict: {'formatted': 'Xh Xm', 'seconds': Y}
    """
    if not check_in:
        return {"formatted": "0h 0m", "seconds": 0}

    end_time = check_out or now or datetime.now(check_in.tzinfo)
    total_seconds = int((end_time - check_in).total_seconds())
    effective_seconds = max(total_seconds - (break_minutes * 60), 0)
    hours = effective_seconds // 3600
    minutes = (effective_seconds % 3600) // 60
    return {
        "formatted": f"{hours}h {minutes}m",
        "seconds": effective_seconds
    }
