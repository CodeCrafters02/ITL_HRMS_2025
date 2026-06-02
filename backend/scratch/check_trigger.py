import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'innovyx_hrms.settings')
django.setup()

from app.models import ShiftPolicy, Attendance
from datetime import time
from django.utils import timezone

# 1. Change shift end to 7:45
s = ShiftPolicy.objects.get(id=1)
old = s.checkout
s.checkout = time(7, 45, 0)
s.save()
print(f'Shift end updated: {old} --> {s.checkout}')
print(f'Trigger will fire at: 09:45 IST (7:45 + 2 hrs)')

# 2. Clear MISSING_CHECKOUT_ALERTED flag so employee gets re-alerted
today = timezone.localdate()
atts = Attendance.objects.filter(date=today, check_in__isnull=False, check_out__isnull=True)
print(f'\nClearing alerted flags for {atts.count()} employee(s)...')
for a in atts:
    if a.remarks:
        a.remarks = (
            a.remarks
            .replace('MISSING_CHECKOUT | MISSING_CHECKOUT_ALERTED', '')
            .replace('MISSING_CHECKOUT_ALERTED', '')
            .strip(' |')
        ) or None
    a.save(update_fields=['remarks'])
    print(f'  Cleared: {a.employee} | remarks now: {a.remarks}')

print('\nDone.')
