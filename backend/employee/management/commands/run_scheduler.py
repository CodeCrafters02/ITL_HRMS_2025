import logging
from django.core.management.base import BaseCommand
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from django_apscheduler.jobstores import DjangoJobStore

logger = logging.getLogger(__name__)


def job_missing_checkout_alerts():
    from employee.tasks import send_missing_checkout_alerts
    result = send_missing_checkout_alerts()
    logger.info('send_missing_checkout_alerts: %s', result)


def job_flag_missing_checkouts():
    from employee.tasks import flag_missing_checkouts
    result = flag_missing_checkouts()
    logger.info('flag_missing_checkouts: %s', result)


class Command(BaseCommand):
    help = 'Start the APScheduler in-process scheduler (no Redis/Celery needed).'

    def handle(self, *args, **options):
        scheduler = BlockingScheduler(timezone='Asia/Kolkata')
        scheduler.add_jobstore(DjangoJobStore(), 'default')

        # Every 30 minutes — check for missing checkouts 2h past shift end
        scheduler.add_job(
            job_missing_checkout_alerts,
            trigger=IntervalTrigger(minutes=30),
            id='missing_checkout_alerts',
            name='Send missing checkout alerts (every 30 min)',
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=120,
        )

        # Daily at 06:00 IST — flag yesterday missed checkouts
        scheduler.add_job(
            job_flag_missing_checkouts,
            trigger=CronTrigger(hour=6, minute=0, timezone='Asia/Kolkata'),
            id='flag_missing_checkouts',
            name='Flag missing checkouts (daily 6 AM IST)',
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=300,
        )

        self.stdout.write(self.style.SUCCESS('Scheduler started. Jobs:'))
        self.stdout.write('  - Missing checkout alerts  : every 30 minutes')
        self.stdout.write('  - Flag missing checkouts   : daily 06:00 IST')
        self.stdout.write('Press Ctrl+C to stop.\n')

        try:
            scheduler.start()
        except KeyboardInterrupt:
            scheduler.shutdown()
            self.stdout.write('Scheduler stopped.')
