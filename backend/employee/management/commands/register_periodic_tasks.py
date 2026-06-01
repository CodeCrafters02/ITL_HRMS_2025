from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, CrontabSchedule, IntervalSchedule
import json


class Command(BaseCommand):
    help = "Register attendance-related Celery Beat periodic tasks."

    def handle(self, *args, **options):
        # --- Daily 6:00 AM IST (UTC+5:30 = 00:30 UTC) ---
        daily_schedule, _ = CrontabSchedule.objects.get_or_create(
            minute='30',
            hour='0',
            day_of_week='*',
            day_of_month='*',
            month_of_year='*',
            timezone='Asia/Kolkata',
        )

        task_daily, created = PeriodicTask.objects.update_or_create(
            name='Flag missing checkouts (daily 6 AM IST)',
            defaults={
                'task': 'employee.tasks.flag_missing_checkouts',
                'crontab': daily_schedule,
                'interval': None,
                'args': json.dumps([]),
                'enabled': True,
            },
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"{'Created' if created else 'Updated'}: {task_daily.name}"
            )
        )

        # --- Every 30 minutes ---
        interval_schedule, _ = IntervalSchedule.objects.get_or_create(
            every=30,
            period=IntervalSchedule.MINUTES,
        )

        task_interval, created = PeriodicTask.objects.update_or_create(
            name='Send missing checkout alerts (every 30 min)',
            defaults={
                'task': 'employee.tasks.send_missing_checkout_alerts',
                'interval': interval_schedule,
                'crontab': None,
                'args': json.dumps([]),
                'enabled': True,
            },
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"{'Created' if created else 'Updated'}: {task_interval.name}"
            )
        )

        self.stdout.write(self.style.SUCCESS("Periodic tasks registered successfully."))
