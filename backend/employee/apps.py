import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)

# Module-level flag so the scheduler is only ever started once,
# regardless of how many times Django calls ready() (e.g. on reload).
_scheduler_started = False


class EmployeeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'employee'

    def ready(self):
        global _scheduler_started
        if _scheduler_started:
            return
        _scheduler_started = True

        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.interval import IntervalTrigger
            from apscheduler.triggers.cron import CronTrigger
            from datetime import datetime, timedelta
            import pytz

            tz = pytz.timezone('Asia/Kolkata')
            scheduler = BackgroundScheduler(timezone=tz)

            def _missing_checkout_alerts():
                try:
                    from employee.tasks import send_missing_checkout_alerts
                    result = send_missing_checkout_alerts()
                    logger.info('[Scheduler] send_missing_checkout_alerts: %s', result)
                except Exception as exc:
                    logger.error('[Scheduler] send_missing_checkout_alerts failed: %s', exc)

            def _flag_missing_checkouts():
                try:
                    from employee.tasks import flag_missing_checkouts
                    result = flag_missing_checkouts()
                    logger.info('[Scheduler] flag_missing_checkouts: %s', result)
                except Exception as exc:
                    logger.error('[Scheduler] flag_missing_checkouts failed: %s', exc)

            # Checks every 2 minutes — fires 10s after startup then repeats.
            # 10s delay gives Django time to fully initialize DB before first run.
            # NOTE: Change minutes=2 to minutes=30 in production.
            scheduler.add_job(
                _missing_checkout_alerts,
                trigger=IntervalTrigger(minutes=2),
                id='missing_checkout_alerts',
                replace_existing=True,
                max_instances=1,
                misfire_grace_time=60,
                next_run_time=datetime.now(tz) + timedelta(seconds=10),  # ← fire 10s after boot
            )

            # Daily at 06:00 IST: flag yesterday's unchecked-out attendances
            scheduler.add_job(
                _flag_missing_checkouts,
                trigger=CronTrigger(hour=6, minute=0, timezone='Asia/Kolkata'),
                id='flag_missing_checkouts',
                replace_existing=True,
                max_instances=1,
                misfire_grace_time=300,
            )

            scheduler.start()
            logger.info(
                '[Scheduler] APScheduler started successfully. '
                'Jobs: missing_checkout_alerts (runs immediately + every 30 min), '
                'flag_missing_checkouts (daily 06:00 IST).'
            )

        except ImportError as exc:
            logger.error(
                '[Scheduler] APScheduler not installed — automatic checkout reminders will NOT run. '
                'Install with: pip install apscheduler django-apscheduler. Error: %s', exc
            )
        except Exception as exc:
            logger.error('[Scheduler] Failed to start APScheduler: %s', exc, exc_info=True)

