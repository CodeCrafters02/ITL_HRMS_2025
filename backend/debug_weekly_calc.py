import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'innovyx_hrms.settings')
django.setup()

from app.models import Attendance, BreakLog
from employee.models import Employee
from datetime import datetime, timedelta
from django.utils import timezone

# Get employee ID 4
employee_id = 4
today = datetime.now().date()
week_start = today - timedelta(days=today.weekday())
week_end = week_start + timedelta(days=5)

print(f"\n=== Weekly Calculation Debug ===")
print(f"Today: {today} (Weekday: {today.weekday()})")
print(f"Week Range: {week_start} to {week_end}\n")

# Get all attendances for the week
weekly_attendances = Attendance.objects.filter(
    employee_id=employee_id,
    date__range=[week_start, week_end],
    check_in__isnull=False
)

print(f"Total attendance records: {weekly_attendances.count()}\n")

total_weekly_minutes = 0
for att in weekly_attendances:
    print(f"Date: {att.date}")
    print(f"  Check-in: {att.check_in.strftime('%H:%M:%S') if att.check_in else 'None'}")
    print(f"  Check-out: {att.check_out.strftime('%H:%M:%S') if att.check_out else 'None'}")
    
    if att.check_out:
        worked_delta = att.check_out - att.check_in
        worked_minutes = worked_delta.total_seconds() // 60
        
        # Get breaks for that day
        day_breaks = BreakLog.objects.filter(
            employee_id=employee_id,
            start__date=att.date,
            end__isnull=False
        )
        day_break_minutes = sum(int((b.end - b.start).total_seconds() // 60) for b in day_breaks)
        
        effective_minutes = max(0, worked_minutes - day_break_minutes)
        total_weekly_minutes += effective_minutes
        
        print(f"  Worked: {int(worked_minutes)} min, Breaks: {day_break_minutes} min, Effective: {int(effective_minutes)} min")
        print(f"  ✅ Added to weekly total")
    else:
        print(f"  ⏳ Still checked in (not counted in weekly total)")
    print()

total_weekly_hours = int(total_weekly_minutes // 60)
total_weekly_mins = int(total_weekly_minutes % 60)

print(f"=== Final Weekly Total ===")
print(f"Total Minutes: {int(total_weekly_minutes)}")
print(f"Formatted: {total_weekly_hours}h {total_weekly_mins}m")
