import sys
from django.core.management.base import BaseCommand
from django.utils import timezone
import pytz


class Command(BaseCommand):
    help = 'Dry-run the missing-checkout alert task and print per-employee diagnosis.'

    def add_arguments(self, parser):
        parser.add_argument('--send', action='store_true',
                            help='Actually send notifications (default: dry-run only)')

    def _write(self, msg, style_fn=None):
        text = style_fn(msg) if style_fn else msg
        self.stdout.write(text.encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8', errors='replace'))

    def handle(self, *args, **options):
        from app.models import Attendance, ShiftPolicy

        tz = pytz.timezone('Asia/Kolkata')
        now = timezone.now()
        today = timezone.localdate()
        now_local = timezone.localtime(now, tz)

        self.stdout.write(f'Server time (IST): {now_local.strftime("%Y-%m-%d %H:%M:%S")}')
        self.stdout.write(f'Today (IST):       {today}')

        atts = Attendance.objects.filter(
            date=today,
            check_in__isnull=False,
            check_out__isnull=True,
        ).select_related(
            'employee', 'employee__shift_assigned',
            'employee__user', 'employee__company',
        ).order_by('employee_id', 'id')

        if not atts.exists():
            self.stdout.write(self.style.WARNING('No checked-in (without checkout) records for today.'))
            return

        seen: set = set()
        for a in atts:
            emp = a.employee
            if emp.id in seen:
                continue
            seen.add(emp.id)

            shift = emp.shift_assigned
            fallback = False
            if not shift:
                shift = ShiftPolicy.objects.filter(company=emp.company).first()
                fallback = True

            remarks = a.remarks or ''
            if shift:
                shift_time_str = shift.checkout.strftime('%H:%M')
                alert_flag = f"MISSING_CHECKOUT_ALERTED_AT_{shift_time_str}"
                already_alerted = alert_flag in remarks
            else:
                already_alerted = 'MISSING_CHECKOUT_ALERTED' in remarks

            checkin_local = timezone.localtime(a.check_in, tz).strftime('%H:%M')
            shift_label = 'None' if not shift else (
                f"{shift.shift_type} checkout={shift.checkout}" + (' [fallback]' if fallback else '')
            )

            self.stdout.write(f'')
            self.stdout.write(f'Employee : {emp.first_name} {emp.last_name} (id={emp.id})')
            self.stdout.write(f'Check-in : {checkin_local}')
            self.stdout.write(f'Shift    : {shift_label}')
            self.stdout.write(f'Alerted? : {already_alerted}')

            if not shift:
                self.stdout.write(self.style.ERROR('>> SKIP: no shift found'))
                continue
            if already_alerted:
                self.stdout.write(self.style.WARNING('>> SKIP: already alerted today for this checkout time'))
                continue

            from datetime import datetime as dt, timedelta
            checkout_dt = tz.localize(dt.combine(today, shift.checkout))
            if shift.checkin > shift.checkout:
                checkout_dt += timedelta(hours=24)
            deadline = checkout_dt + timedelta(hours=2)
            mins_past = (now - deadline).total_seconds() / 60

            self.stdout.write(f'Shift end: {timezone.localtime(checkout_dt, tz).strftime("%H:%M")} IST')
            self.stdout.write(f'Alert at : {timezone.localtime(deadline, tz).strftime("%H:%M")} IST')

            if now < deadline:
                self.stdout.write(self.style.WARNING(
                    f'>> NOT YET: {abs(mins_past):.0f} min before threshold'
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'>> ELIGIBLE: {mins_past:.0f} min past threshold'
                ))
                if options['send']:
                    from django.conf import settings
                    from employee.tasks import _send_missing_checkout_fcm_and_inapp, _send_missing_checkout_email

                    title = 'Checkout Reminder'
                    message = (
                        f"Hi {emp.first_name}, you checked in today at {checkin_local} "
                        "but haven't checked out yet. Please check out before midnight."
                    )

                    try:
                        _send_missing_checkout_fcm_and_inapp(emp, a, title, message)
                        self.stdout.write(self.style.SUCCESS('>> In-app notification created'))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'>> In-app FAILED: {e}'))

                    self.stdout.write(f'Sending email to: {emp.email or "NO EMAIL SET"}')
                    self.stdout.write(f'SMTP: {settings.EMAIL_HOST}:{settings.EMAIL_PORT} user={settings.EMAIL_HOST_USER}')

                    if not emp.email:
                        self.stdout.write(self.style.ERROR('>> Email SKIPPED: no email on employee record'))
                    else:
                        try:
                            shift_end = shift.checkout.strftime('%H:%M') if shift else ''
                            _send_missing_checkout_email(
                                emp, title, message,
                                checkin_time=checkin_local,
                                shift_end_time=shift_end,
                                attendance_date=today.strftime('%d %b %Y'),
                            )
                            self.stdout.write(self.style.SUCCESS(f'>> Email SENT to {emp.email}'))
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'>> Email FAILED: {e}'))
                else:
                    self.stdout.write('>> Dry-run. Use --send to actually send.')
