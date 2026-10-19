import logging
from collections import defaultdict
from datetime import datetime, timedelta
from urllib.parse import quote

import pytz
from django.utils import timezone

logger = logging.getLogger(__name__)

TZ = pytz.timezone('Asia/Kolkata')
GRAPH = 'https://graph.microsoft.com/v1.0'
ACTIVE_STATES = {'Available', 'Busy', 'DoNotDisturb'}  # working-hour states (idle variants are not working time)
OFFLINE_STATES = {'Offline'}
EARLY_BUFFER = timedelta(hours=2)
MIN_WORK = timedelta(hours=2)
DEBOUNCE = timedelta(seconds=60)


# ---------------------------------------------------------------- graph ----

def _headers():
    from app.microsoft_directory import get_entra_app_token
    return {'Authorization': f'Bearer {get_entra_app_token()}'}


def resolve_entra_ids(emails):
    import requests
    out = {}
    for e in emails:
        try:
            r = requests.get(f'{GRAPH}/users/{quote(e)}?$select=id', headers=_headers(), timeout=10)
            if r.status_code == 200:
                out[e] = r.json().get('id', '')
        except Exception as exc:
            logger.warning('entra id lookup failed for %s: %s', e, exc)
    return out


def fetch_presences(entra_ids):
    import requests
    out = {}
    ids = list(entra_ids)
    for i in range(0, len(ids), 650):
        chunk = ids[i:i + 650]
        r = requests.post(f'{GRAPH}/communications/getPresencesByUserId', headers=_headers(), json={'ids': chunk}, timeout=20)
        if r.status_code != 200:
            logger.warning('presence fetch -> %s %s', r.status_code, r.text[:200])
            continue
        for p in r.json().get('value', []):
            out[p['id']] = (p.get('availability') or '', p.get('activity') or '')
    return out


# ---------------------------------------------------------------- shift ----

def _window(shift, d):
    start = TZ.localize(datetime.combine(d, shift.checkin))
    end = TZ.localize(datetime.combine(d, shift.checkout))
    if shift.checkin >= shift.checkout:
        end += timedelta(days=1)
    return start, end


def _candidate_shifts(employee):
    from app.models import ShiftPolicy, DepartmentWiseWorkingDays
    if getattr(employee, 'shift_assigned_id', None):
        return [employee.shift_assigned]
    if getattr(employee, 'department_id', None):
        d = DepartmentWiseWorkingDays.objects.filter(department_id=employee.department_id).first()
        if d:
            s = list(d.shifts.all())
            if s:
                return s
    return list(ShiftPolicy.objects.filter(company=employee.company))


def resolve_shift(employee, at):
    """Return (shift, start_dt, end_dt) whose [start-2h, end) window holds `at`, else None."""
    at = at.astimezone(TZ)
    best = None
    for shift in _candidate_shifts(employee):
        for d in (at.date() - timedelta(days=1), at.date()):
            start, end = _window(shift, d)
            if start - EARLY_BUFFER <= at < end:
                if best is None or abs((start - at).total_seconds()) < abs((best[1] - at).total_seconds()):
                    best = (shift, start, end)
    return best


def is_working_day(employee, d):
    from app.models import CalendarEvent, DepartmentWiseWorkingDays, EmpLeave
    weekend = {'Saturday', 'Sunday'}
    if getattr(employee, 'department_id', None):
        dw = DepartmentWiseWorkingDays.objects.filter(department_id=employee.department_id).first()
        if dw and getattr(dw, 'weekend_days', None):
            weekend = set(dw.weekend_days)
    if d.strftime('%A') in weekend:
        return False
    if CalendarEvent.objects.filter(company_id=employee.company_id, is_holiday=True, date=d).exists():
        return False
    return not EmpLeave.objects.filter(
        employee=employee, status='Approved', leave_duration='full_day', from_date__lte=d, to_date__gte=d
    ).exists()


def geofence_blocks(employee):
    from app.utils import validate_geofence
    user = getattr(employee, 'user', None)
    if not user:
        return True
    ok, _ = validate_geofence(user, None, None, None)
    return not ok


def manual_locked(employee):
    """(checkin_locked, checkout_locked): Teams presence drives attendance for this company."""
    from employee.models import TeamsAttendanceConfig
    c = TeamsAttendanceConfig.objects.filter(company_id=employee.company_id, enabled=True, dry_run=False).first()
    return (bool(c and c.auto_checkin), bool(c and c.auto_checkout))


# ----------------------------------------------------------- attendance ----

def find_open_attendance(employee):
    from app.models import Attendance
    return (Attendance.objects.filter(employee=employee, check_in__isnull=False, check_out__isnull=True)
            .order_by('-check_in').first())


def auto_check_in(employee, shift, at):
    from app.models import Attendance
    from employee.models import AttendanceTeamsInfo
    at = at.astimezone(TZ)
    att = Attendance.objects.filter(employee=employee, date=at.date(), check_in__isnull=True).order_by('id').first()
    if att:
        att.check_in, att.is_present, att.company = at, True, employee.company
        att.save(update_fields=['check_in', 'is_present', 'company'])
    else:
        att = Attendance.objects.create(employee=employee, company=employee.company, date=at.date(), check_in=at, is_present=True)
    AttendanceTeamsInfo.objects.update_or_create(attendance=att, defaults={'shift': shift, 'source': 'teams'})
    employee.status = 'online'
    employee.save(update_fields=['status'])
    return att


def auto_check_out(employee, att, at):
    from app.models import BreakLog
    at = max(at.astimezone(TZ), att.check_in)
    for b in BreakLog.objects.filter(employee=employee, end__isnull=True, start__gte=att.check_in):
        b.end = at
        b.duration_minutes = max(0, int((at - b.start).total_seconds() // 60)) if b.start else 0
        b.save()
    att.check_out = at
    att.remarks = f"{att.remarks} | Auto check-out via Teams presence" if att.remarks else 'Auto check-out via Teams presence'
    att.save(update_fields=['check_out', 'remarks'])
    att.calculate_work_duration()
    employee.status = 'offline'
    employee.save(update_fields=['status'])


# --------------------------------------------------------- sessions/hours --

def merged_sessions(employee, start, end, now=None, merge_gap=timedelta()):
    """Presence sessions overlapping [start, end], clipped, with short gaps merged."""
    from employee.models import PresenceSession
    now = now or timezone.now()
    rows = PresenceSession.objects.filter(employee=employee, start__lt=end).exclude(end__lt=start).order_by('start')
    out = []
    for s in rows:
        a, b = max(s.start, start), min(s.end or now, end)
        if b <= a:
            continue
        if out and a - out[-1][1] <= merge_gap:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return [(a, b) for a, b in out]


def worked_time(employee, att, now=None, merge_gap=timedelta()):
    """Sum of presence sessions inside the attendance window, minus overlapping breaks."""
    now = now or timezone.now()
    return worked_range(employee, att.check_in, att.check_out or now, now, merge_gap)


def worked_range(employee, start, end, now=None, merge_gap=timedelta()):
    from app.models import BreakLog
    now = now or timezone.now()
    sess = merged_sessions(employee, start, end, now, merge_gap)
    total = sum((b - a for a, b in sess), timedelta())
    for br in BreakLog.objects.filter(employee=employee, start__isnull=False, start__lt=end):
        bs, be = br.start, br.end or now
        for a, b in sess:
            ov = min(b, be) - max(a, bs)
            if ov > timedelta():
                total -= ov
    return max(total, timedelta())


def status_totals(employee, start, end, now=None):
    from employee.models import PresenceLog
    now = now or timezone.now()
    tot = defaultdict(timedelta)
    for l in PresenceLog.objects.filter(employee=employee, started_at__lt=end).exclude(ended_at__lt=start):
        a, b = max(l.started_at, start), min(l.ended_at or now, end)
        if b > a:
            tot[l.availability] += b - a
    return tot


# ----------------------------------------------------------------- poll ----

def _apply(emp, st, availability, activity, cfg, now, logs):
    from employee.models import PresenceLog, PresenceSession, AttendanceTeamsInfo, PresenceActionLog

    if availability in ('PresenceUnknown', ''):
        st.last_polled_at = now
        st.save(update_fields=['last_polled_at'])
        return

    if (st.availability, st.activity) != (availability, activity):
        PresenceLog.objects.filter(employee=emp, ended_at__isnull=True).update(ended_at=now)
        PresenceLog.objects.create(employee=emp, availability=availability, activity=activity, started_at=now)
        st.since = now
    st.availability, st.activity, st.last_polled_at = availability, activity, now
    active = availability in ACTIVE_STATES
    if active:
        st.last_active_at = now
    st.save()

    gap = timedelta(minutes=cfg.merge_gap_minutes)
    open_s = PresenceSession.objects.filter(employee=emp, end__isnull=True).order_by('-start').first()
    if active and not open_s:
        last = PresenceSession.objects.filter(employee=emp, end__isnull=False).order_by('-end').first()
        if last and now - last.end <= gap:
            last.end = None
            last.save(update_fields=['end'])
        else:
            PresenceSession.objects.create(employee=emp, start=now)
    elif not active and open_s:
        open_s.end = now
        open_s.save(update_fields=['end'])

    def record(action, detail=''):
        PresenceActionLog.objects.create(employee=emp, action=action, at=now, dry_run=cfg.dry_run, detail=detail[:255])
        logs.append((emp.id, action, cfg.dry_run))

    open_att = find_open_attendance(emp)
    if open_att:
        refresh_live_totals(open_att, now)

    if not open_att and active and cfg.auto_checkin and st.since and now - st.since >= DEBOUNCE:
        w = resolve_shift(emp, now)
        if not w:
            return
        shift, start, end = w
        if not (start - EARLY_BUFFER <= now.astimezone(TZ) < end - MIN_WORK):
            return
        from app.models import Attendance
        if Attendance.objects.filter(employee=emp, date=now.astimezone(TZ).date(), check_in__isnull=False).exists():
            return
        if not is_working_day(emp, now.astimezone(TZ).date()) or geofence_blocks(emp):
            return
        if cfg.dry_run:
            record('check_in', f'shift {shift.shift_type}')
        else:
            auto_check_in(emp, shift, now)
            record('check_in', f'shift {shift.shift_type}')
        return

    if open_att and cfg.auto_checkout and not active and st.last_active_at:
        info = AttendanceTeamsInfo.objects.filter(attendance=open_att).first()
        if info and info.source != 'teams':
            return
        w = resolve_shift(emp, open_att.check_in) or resolve_shift(emp, st.last_active_at)
        end = w[2] if w else None
        if not end or now < end:
            return
        if availability not in OFFLINE_STATES or now - st.since < timedelta(minutes=cfg.offline_grace_minutes):
            return
        if cfg.dry_run:
            record('check_out', f'last active {st.last_active_at.astimezone(TZ):%H:%M}')
        else:
            auto_check_out(emp, open_att, st.last_active_at)
            record('check_out', f'last active {st.last_active_at.astimezone(TZ):%H:%M}')


def ensure_configs():
    from app.models import Company
    from employee.models import TeamsAttendanceConfig
    for c in Company.objects.filter(teams_attendance_config__isnull=True):
        TeamsAttendanceConfig.objects.get_or_create(
            company=c, defaults=dict(enabled=True, dry_run=False, auto_checkin=True, auto_checkout=True))


def poll_once(now=None):
    from app.models import Employee
    from employee.models import TeamsAttendanceConfig, PresenceState
    now = now or timezone.now()
    logs = []
    try:
        ensure_configs()
    except Exception as exc:
        logger.error('ensure_configs failed: %s', exc)
    for cfg in TeamsAttendanceConfig.objects.filter(enabled=True).select_related('company'):
        emps = list(Employee.objects.filter(company=cfg.company).exclude(email__isnull=True).exclude(email='')
                    .select_related('user', 'company', 'shift_assigned'))
        states = {s.employee_id: s for s in PresenceState.objects.filter(employee__in=emps)}
        missing = [e for e in emps if e.id not in states or not states[e.id].entra_id]
        if missing:
            ids = resolve_entra_ids([e.email for e in missing])
            for e in missing:
                if ids.get(e.email):
                    st = states.get(e.id) or PresenceState(employee=e)
                    st.entra_id = ids[e.email]
                    st.save()
                    states[e.id] = st
        by_id = {s.entra_id: e for e in emps for s in [states.get(e.id)] if s and s.entra_id}
        if not by_id:
            continue
        for gid, (av, act) in fetch_presences(by_id).items():
            emp = by_id.get(gid)
            if emp:
                try:
                    _apply(emp, states[emp.id], av, act, cfg, now, logs)
                except Exception as exc:
                    logger.error('presence apply failed for %s: %s', emp.id, exc, exc_info=True)
        if not cfg.dry_run:
            try:
                sync_attendance_rows(cfg.company_id, now.astimezone(TZ).date(), now)
            except Exception as exc:
                logger.error('attendance sync failed: %s', exc, exc_info=True)
    return logs


def refresh_one(employee, max_age=10):
    """Fetch this employee's live Teams presence now (throttled) and apply it."""
    from employee.models import TeamsAttendanceConfig, PresenceState
    now = timezone.now()
    st = PresenceState.objects.filter(employee=employee).first()
    if st and st.last_polled_at and (now - st.last_polled_at).total_seconds() < max_age:
        return st
    try:
        if not st or not st.entra_id:
            gid = resolve_entra_ids([employee.email]).get(employee.email)
            if not gid:
                return st
            st = st or PresenceState(employee=employee)
            st.entra_id = gid
            st.save()
        got = fetch_presences([st.entra_id]).get(st.entra_id)
        if not got:
            return st
        cfg = TeamsAttendanceConfig.objects.filter(company_id=employee.company_id, enabled=True).first()
        if cfg:
            _apply(employee, st, got[0], got[1], cfg, now, [])
        else:
            st.availability, st.activity, st.last_polled_at = got[0], got[1], now
            st.save()
    except Exception as exc:
        logger.warning('live presence refresh failed for %s: %s', employee.id, exc)
    return PresenceState.objects.filter(employee=employee).first()


def midnight_sweep(now=None):
    """Close attendance still open after its shift ended, at 00:00 (end of the check-in day)."""
    from app.models import Attendance
    from employee.models import TeamsAttendanceConfig, PresenceState, PresenceSession
    now = (now or timezone.now()).astimezone(TZ)
    closed = []
    for cfg in TeamsAttendanceConfig.objects.filter(enabled=True, dry_run=False, auto_checkout=True):
        atts = Attendance.objects.filter(
            employee__company_id=cfg.company_id, check_in__isnull=False, check_out__isnull=True
        ).select_related('employee', 'employee__company', 'employee__shift_assigned')
        for att in atts:
            emp = att.employee
            since = teams_since(emp)
            if not since or att.check_in.astimezone(TZ).date() < since:
                continue  # leave pre-Teams (manual) history untouched
            boundary = TZ.localize(datetime.combine(att.check_in.astimezone(TZ).date() + timedelta(days=1), datetime.min.time()))
            if now < boundary:
                continue
            w = resolve_shift(emp, att.check_in)
            if w and w[2] > now:
                continue  # overnight shift still running
            st = PresenceState.objects.filter(employee=emp).first()
            at = boundary
            if st and st.availability in OFFLINE_STATES and st.last_active_at and st.last_active_at < boundary:
                at = st.last_active_at
            PresenceSession.objects.filter(employee=emp, end__isnull=True, start__lt=at).update(end=at)
            auto_check_out(emp, att, at)
            closed.append(att.id)
        sync_attendance_rows(cfg.company_id, now.date() - timedelta(days=1), now)
    return closed


# ------------------------------------------------- teams-driven reports ----

def teams_managed(employee):
    from employee.models import TeamsAttendanceConfig
    return TeamsAttendanceConfig.objects.filter(company_id=employee.company_id, enabled=True, dry_run=False).exists()


def teams_since(employee):
    """Local date of the first recorded presence session (None when no Teams data yet)."""
    from employee.models import PresenceSession
    s = PresenceSession.objects.filter(employee=employee).order_by('start').values_list('start', flat=True).first()
    return s.astimezone(TZ).date() if s else None


def day_bounds(d):
    d0 = TZ.localize(datetime.combine(d, datetime.min.time()))
    return d0, d0 + timedelta(days=1)


def day_summary(employee, d, now=None):
    """Teams-based punch/working summary for one local date."""
    from employee.models import WorkingHoursOverride
    now = now or timezone.now()
    ov = WorkingHoursOverride.objects.filter(employee=employee, date=d).first()
    if ov:
        return _override_summary(ov)
    d0, d1 = day_bounds(d)
    sess = merged_sessions(employee, d0, d1, now)
    live = bool(sess and sess[-1][1] >= now - timedelta(seconds=90) and sess[-1][1] <= now)
    return {
        'first': sess[0][0] if sess else None,
        'last': sess[-1][1] if sess else None,
        'live': live,
        'worked': worked_range(employee, d0, d1, now),
    }


def _override_summary(ov):
    present = ov.status == 'Present'
    return {
        'first': ov.check_in if present else None,
        'last': ov.check_out if present else None,
        'live': False,
        'worked': timedelta(seconds=ov.worked_seconds) if present else timedelta(),
        'edited': True,
        'override_status': ov.status,
    }


def get_override(employee, d):
    from employee.models import WorkingHoursOverride
    return WorkingHoursOverride.objects.filter(employee=employee, date=d).first()


def teams_worked_seconds(att, now=None):
    """Session-based worked seconds for a Teams-sourced attendance row, else None."""
    info = getattr(att, 'teams_info', None)
    if not info or info.source != 'teams' or not att.check_in:
        return None
    return worked_time(att.employee, att, now).total_seconds()


def refresh_live_totals(att, now=None):
    """Keep stored duration/overtime of an open Teams attendance current so reports see live hours."""
    from app.models import Attendance
    info = getattr(att, 'teams_info', None)
    if not info or info.source != 'teams' or att.check_out:
        return
    from employee.models import WorkingHoursOverride
    if WorkingHoursOverride.objects.filter(employee=att.employee, date=att.date).exists():
        return
    worked = worked_time(att.employee, att, now)
    sh = info.shift or att.employee.shift_assigned
    std = timedelta(hours=sh.full_day_hours()) if sh else timedelta(hours=8)
    Attendance.objects.filter(pk=att.pk).update(total_work_duration=worked, overtime_duration=max(worked - std, timedelta()))


def bulk_day_summaries(employee_ids, from_date, to_date, now=None):
    """{(employee_id, date): {'first','last','live','worked'}} from Teams sessions, in three queries."""
    from employee.models import PresenceSession
    from app.models import BreakLog
    now = now or timezone.now()
    r0, _ = day_bounds(from_date)
    r1 = day_bounds(to_date)[1]
    ids = list(employee_ids)
    sess = defaultdict(list)
    for s in PresenceSession.objects.filter(employee_id__in=ids, start__lt=r1).exclude(end__lt=r0):
        sess[s.employee_id].append((s.start, s.end or now))
    brk = defaultdict(list)
    for b in BreakLog.objects.filter(employee_id__in=ids, start__isnull=False, start__lt=r1):
        brk[b.employee_id].append((b.start, b.end or now))
    out = {}
    for eid, rows in sess.items():
        d = from_date
        while d <= to_date:
            d0, d1 = day_bounds(d)
            segs = sorted((max(a, d0), min(b, d1)) for a, b in rows if min(b, d1) > max(a, d0))
            if segs:
                worked = sum((b - a for a, b in segs), timedelta())
                for bs, be in brk.get(eid, []):
                    for a, b in segs:
                        ov = min(b, be) - max(a, bs)
                        if ov > timedelta():
                            worked -= ov
                last = segs[-1][1]
                out[(eid, d)] = {
                    'first': segs[0][0], 'last': last,
                    'live': last >= now - timedelta(seconds=90) and last <= now,
                    'worked': max(worked, timedelta()),
                }
            d += timedelta(days=1)

    from employee.models import WorkingHoursOverride
    for ov in WorkingHoursOverride.objects.filter(employee_id__in=ids, date__range=(from_date, to_date)):
        key = (ov.employee_id, ov.date)
        if ov.status == 'Present':
            out[key] = _override_summary(ov)
        else:
            out.pop(key, None)
    return out


def sync_attendance_rows(company_id, d, now=None):
    """Make the stored Attendance row for date `d` mirror Teams presence so payroll/reports read Teams-based data."""
    from app.models import Attendance, Employee
    from employee.models import AttendanceTeamsInfo, WorkingHoursOverride
    now = now or timezone.now()
    emps = {e.id: e for e in Employee.objects.filter(company_id=company_id, is_active=True)
            .exclude(user__role__in=['admin', 'master']).select_related('shift_assigned')}
    if not emps:
        return 0
    edited = set(WorkingHoursOverride.objects.filter(employee_id__in=emps, date=d).values_list('employee_id', flat=True))
    n = 0
    for (eid, day), t in bulk_day_summaries(list(emps), d, d, now).items():
        if eid in edited or not t['first']:
            continue
        emp = emps[eid]
        sh = emp.shift_assigned
        ot = max(t['worked'] - timedelta(hours=sh.full_day_hours()), timedelta()) if sh else timedelta()
        att = Attendance.objects.filter(employee=emp, date=d).order_by('-check_in', 'id').first()
        if att and att.leave_id:
            continue
        out = None if t['live'] else t['last']
        if att:
            Attendance.objects.filter(pk=att.pk).update(
                check_in=t['first'], check_out=out, total_work_duration=t['worked'],
                overtime_duration=ot, is_present=True)
        else:
            att = Attendance.objects.create(
                employee=emp, company_id=company_id, date=d, check_in=t['first'], check_out=out,
                total_work_duration=t['worked'], overtime_duration=ot, is_present=True)
        AttendanceTeamsInfo.objects.update_or_create(attendance=att, defaults={'shift': sh, 'source': 'teams'})
        n += 1
    return n
