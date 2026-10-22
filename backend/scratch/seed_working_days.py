from datetime import date, timedelta
from django.db import transaction
from app.models import Department, DepartmentWiseWorkingDays as D, DepartmentWorkingDaysHistory as H

EFFECTIVE = date.today()   # change e.g. date(2026, 11, 1) to start from a specific date
DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
NEW = dict(working_days_count=6, working_days=DAYS, weekend_days=['Sunday'],
           off_day_rules=[{'weekday': 'saturday', 'weeks': [2]}])
FIELDS = ('week_start_day', 'week_end_day', 'working_days', 'weekend_days', 'off_day_rules')

created = updated = unchanged = 0
with transaction.atomic():
    for dept in Department.objects.all():
        rows = list(D.objects.filter(department=dept))
        if not rows:
            D.objects.create(department=dept, company=dept.company, effective_from=EFFECTIVE, **NEW)
            created += 1
            continue
        for row in rows:
            if all(getattr(row, k) == v for k, v in NEW.items() if k != 'working_days_count') and row.working_days_count == 6:
                unchanged += 1
                continue
            if row.effective_from and EFFECTIVE <= row.effective_from:
                print(f'SKIP {dept}: current version already starts {row.effective_from}')
                continue
            H.objects.create(config=row, valid_from=row.effective_from, valid_to=EFFECTIVE - timedelta(days=1),
                             **{f: getattr(row, f) for f in FIELDS})
            for k, v in NEW.items():
                setattr(row, k, v)
            row.effective_from = EFFECTIVE
            row.save()
            updated += 1
print(f'created={created} updated={updated} unchanged={unchanged}')
