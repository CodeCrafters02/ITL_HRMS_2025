import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'innovyx_hrms.settings')
django.setup()

from app.models import Attendance
from datetime import datetime, timedelta

today = datetime.now().date()
week_start = today - timedelta(days=today.weekday())
week_end = week_start + timedelta(days=5)

print(f"\n=== Weekly Attendance Check ===")
print(f"Today: {today} (Weekday: {today.weekday()})")
print(f"Week: {week_start} to {week_end}\n")

atts = Attendance.objects.filter(
    date__range=[week_start, week_end],
    check_in__isnull=False
).order_by('date')

print(f"Total attendance records: {atts.count()}\n")

for a in atts[:10]:
    check_in_time = a.check_in.strftime('%H:%M:%S') if a.check_in else 'None'
    check_out_time = a.check_out.strftime('%H:%M:%S') if a.check_out else 'None'
    print(f"Date: {a.date}, Employee ID: {a.employee_id}")
    print(f"  Check-in: {check_in_time}, Check-out: {check_out_time}")
    
    if a.check_in and a.check_out:
        duration = (a.check_out - a.check_in).total_seconds() / 60
        print(f"  Duration: {int(duration)} minutes")
    print()
