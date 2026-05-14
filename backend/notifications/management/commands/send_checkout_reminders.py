"""
Management command: send_checkout_reminders

Sends a push notification + in-app notification to every employee who has
checked in today but has NOT yet checked out, provided their shift's
checkout time has already passed.

Run via cron (example — fires at 19:00 every weekday):
    0 19 * * 1-6 /path/to/venv/bin/python /path/to/manage.py send_checkout_reminders

Or trigger manually from the admin API endpoint:
    POST /notifications/trigger-checkout-reminder/
"""

import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.service import send_checkout_reminders

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Send checkout-reminder notifications to all employees who checked in "
        "today but have not yet checked out after their shift end time."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print which employees would be notified without actually sending.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        now_local = timezone.localtime(timezone.now())
        today = now_local.date()

        self.stdout.write(
            self.style.NOTICE(
                f"[send_checkout_reminders] Running at {now_local.strftime('%Y-%m-%d %H:%M:%S %Z')}"
            )
        )

        results = send_checkout_reminders(today=today, now_local=now_local, dry_run=dry_run)

        if dry_run:
            self.stdout.write(self.style.WARNING("[DRY RUN] No notifications were actually sent."))

        self.stdout.write(
            self.style.SUCCESS(
                f"Done — notified: {results['notified']}, "
                f"skipped (shift not ended / already notified): {results['skipped']}, "
                f"errors: {results['errors']}"
            )
        )
