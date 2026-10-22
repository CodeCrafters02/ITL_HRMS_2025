from datetime import date
from django.db import transaction
from app.models import Company, Leave

NAME = 'Monthly Leave'   # change the name if you like
created = skipped = 0
with transaction.atomic():
    for company in Company.objects.all():
        if Leave.objects.filter(company=company, leave_name__iexact=NAME).exists():
            print(f'SKIP {company}: "{NAME}" already exists')
            skipped += 1
            continue
        Leave.objects.create(
            company=company, leave_name=NAME, count=2, is_paid=True,
            accrual='monthly',            # 2 leaves every month
            carry_forward_month=True,     # unused leaves roll into next month
            carry_forward_year=False,     # balance resets on 1 January
            effective_from=date.today().replace(day=1),  # accrues from the current month
        )
        created += 1
print(f'created={created} skipped={skipped}')
