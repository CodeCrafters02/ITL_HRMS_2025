import hashlib
import json
import logging
import threading
import time
import uuid
from typing import Dict, List, Optional

from django.core.cache import caches
from django.db import connection, transaction
from django.utils import timezone

from .microsoft_directory import GENERAL_DEPT, _get_next_employee_code, get_directory, invalidate_directory
from .models import Company, Department, Designation, Employee, Level, OfficeLocation, UserRegister

logger = logging.getLogger(__name__)

DETAIL_CAP = 200
_LABELS = {"first_name": "First name", "last_name": "Last name", "mobile": "Mobile", "work_location": "Work location", "department": "Department",
           "designation": "Designation", "level": "Level", "is_active": "Status"}


def _lab(v) -> str:
    if v is None or v == "":
        return "—"
    if isinstance(v, bool):
        return "Active" if v else "Inactive"
    if hasattr(v, "designation_name"):
        return f"{v.designation_name} ({v.department.department_name})" if v.department_id else v.designation_name
    for a in ("department_name", "level_name"):
        if hasattr(v, a):
            return getattr(v, a)
    return str(v)


LEVEL_DESC = "Auto-synced from Microsoft Entra reporting hierarchy"


def fingerprint(directory: Dict) -> str:
    """Hash of everything in Entra that the sync reads; identical hash == nothing to do."""
    rows = sorted(
        (
            str(r.get("id")), r.get("mail"), r.get("userPrincipalName"), r.get("displayName"), r.get("givenName"), r.get("surname"),
            r.get("jobTitle"), r.get("department"), r.get("officeLocation"), r.get("mobilePhone"), bool(r.get("accountEnabled", True)),
            (r.get("manager") or {}).get("id"),
        )
        for r in directory["raw_by_id"].values()
    )
    return hashlib.sha256(json.dumps(rows, default=str).encode()).hexdigest()


def _clean_mobile(raw: str) -> str:
    """Employee.mobile is varchar(11): keep the last 10 digits (drops +91 / spaces / extensions), or nothing."""
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    return digits[-10:] if len(digits) >= 7 else ""


def _keys(*vals) -> List[str]:
    return [v.strip().lower() for v in vals if v and "@" in v]


def run_sync(company: Company, d: Dict, ids: List[str], dry_run: bool = False, progress=None, detail: bool = False) -> Dict:
    """Departments -> levels (L1 = hierarchy root, +1 per reporting step) -> designations -> employees -> managers.

    Idempotent: only differing fields are written. dry_run rolls everything back and just reports the counts.
    """
    raw_by_id, by_id = d["raw_by_id"], d["by_id"]
    res = {
        "imported_count": 0, "updated_count": 0, "skipped_count": 0,
        "departments_created": 0, "locations_created": 0, "levels_created": 0, "designations_created": 0, "designations_level_changed": 0,
        "employee_levels_changed": 0, "managers_linked": 0, "max_level": max((u["level"] for u in d["users"]), default=0), "errors": [],
    }
    det = {"departments": [], "locations": [], "levels": [], "designations": [], "designation_levels": [], "employees_new": [], "employees_updated": [], "managers": []} if detail else None

    def note(key, item):
        if det is not None and len(det[key]) < DETAIL_CAP:
            det[key].append(item)

    targets = []
    for uid in ids:
        if uid in raw_by_id and uid in by_id:
            targets.append(uid)
        else:
            res["errors"].append(f"User ID {uid} was not found in Microsoft Entra directory.")

    with transaction.atomic():
        depts = {x.department_name.strip().lower(): x for x in Department.objects.filter(company=company)}
        levels = {x.level_name.strip().lower(): x for x in Level.objects.filter(company=company)}
        desigs = {(x.designation_name.strip().lower(), x.department_id): x for x in Designation.objects.filter(company=company).select_related("level")}

        def dept_for(name: str) -> Department:
            key = (name or "").strip() or GENERAL_DEPT
            obj = depts.get(key.lower())
            if not obj:
                obj = depts[key.lower()] = Department.objects.create(company=company, department_name=key)
                res["departments_created"] += 1
                note("departments", key)
            return obj

        locs = {x.name.strip().lower(): x for x in OfficeLocation.objects.filter(company=company)}

        def location_for(name: str) -> None:
            # geofencing stays off until an admin adds coordinates, so attendance checks are unaffected
            if name.lower() not in locs:
                locs[name.lower()] = OfficeLocation.objects.create(company=company, name=name, enable_geofencing=False)
                res["locations_created"] += 1
                note("locations", name)

        def level_for(n: int) -> Level:
            key = f"L{n}"
            obj = levels.get(key.lower())
            if not obj:
                obj = levels[key.lower()] = Level.objects.create(company=company, level_name=key, description=LEVEL_DESC)
                res["levels_created"] += 1
                note("levels", key)
            return obj

        # designation level = shallowest level of anyone holding that (title, department) in the whole directory
        title_level: Dict[tuple, int] = {}
        for u in d["users"]:
            t = (u["job_title"] or "").strip().lower()
            if t:
                k = (t, ((u["department"] or "").strip() or GENERAL_DEPT).lower())
                title_level[k] = min(title_level.get(k, 99), u["level"])

        # preload employees / users
        emp_by_key: Dict[str, Employee] = {}
        emp_by_user: Dict[int, Employee] = {}
        for e in Employee.objects.filter(company=company).select_related("user", "department", "designation__department", "level", "reporting_manager"):
            for k in _keys(e.email, e.user.email if e.user else None, e.user.username if e.user else None):
                emp_by_key[k] = e
            if e.user_id:
                emp_by_user[e.user_id] = e

        next_code = [int(_get_next_employee_code()[3:])]

        n = len(targets)
        for i, uid in enumerate(targets, 1):
            if progress:
                progress("employees", i - 1, n)
            item, u = raw_by_id[uid], by_id[uid]
            try:
                with transaction.atomic():
                    email = u["primary_email"]
                    if not email or "@" not in email:
                        res["errors"].append(f"User {u['display_name']} has no valid email address.")
                        continue
                    given, surname = u["given_name"], u["surname"]
                    if not given and u["display_name"]:
                        parts = u["display_name"].strip().split(" ", 1)
                        given, surname = parts[0], parts[1] if len(parts) > 1 else ""
                    job_title, dept_name = (u["job_title"] or "").strip(), (u["department"] or "").strip()
                    mobile = _clean_mobile(u["mobile_phone"])
                    office = (u["office_location"] or "").strip()[:100]
                    if office:
                        location_for(office)
                    enabled = u["account_enabled"]

                    dept_obj = dept_for(dept_name) if dept_name else None
                    desig_obj = None
                    if job_title:
                        d_obj = dept_obj or dept_for("")
                        desig_obj = desigs.get((job_title.lower(), d_obj.id))
                        want = level_for(title_level[(job_title.lower(), d_obj.department_name.strip().lower())])
                        if not desig_obj:
                            desig_obj = desigs[(job_title.lower(), d_obj.id)] = Designation.objects.create(company=company, department=d_obj, level=want, designation_name=job_title)
                            res["designations_created"] += 1
                            note("designations", {"name": job_title, "department": d_obj.department_name, "level": want.level_name})
                        elif desig_obj.level_id != want.id:
                            note("designation_levels", {"name": job_title, "department": d_obj.department_name, "from": _lab(desig_obj.level), "to": want.level_name})
                            desig_obj.level = want
                            desig_obj.save(update_fields=["level"])
                            res["designations_level_changed"] += 1
                    lvl_obj = level_for(u["level"])

                    emp = next((emp_by_key[k] for k in _keys(email, u["user_principal_name"], u["mail"]) if k in emp_by_key), None)
                    if not emp:
                        user_reg = UserRegister.objects.filter(email__iexact=email).first() or (u["user_principal_name"] and UserRegister.objects.filter(username__iexact=u["user_principal_name"]).first())
                        if not user_reg:
                            user_reg = UserRegister.objects.create(username=email, email=email, first_name=given, last_name=surname, role="employee", company=company, is_active=enabled)
                            user_reg.set_unusable_password()
                            user_reg.save()
                        elif not user_reg.company_id:
                            user_reg.company = company
                            user_reg.save(update_fields=["company"])
                        emp = emp_by_user.get(user_reg.id)
                        if emp is None and Employee.objects.filter(user=user_reg).exclude(company=company).exists():
                            res["errors"].append(f"{u['display_name']} is already an employee of another company.")
                            continue
                        if emp is None:
                            next_code[0] += 1
                            emp = Employee.objects.create(
                                company=company, user=user_reg, employee_id=f"EMP{next_code[0]:04d}", first_name=given, last_name=surname, email=email,
                                mobile=mobile, department=dept_obj, designation=desig_obj, level=lvl_obj, is_active=enabled,
                            )
                            res["imported_count"] += 1
                            note("employees_new", {"name": u["display_name"], "email": email, "department": dept_name or "—", "designation": job_title or "—", "level": lvl_obj.level_name})
                            emp_by_user[user_reg.id] = emp
                            for k in _keys(email, user_reg.username):
                                emp_by_key[k] = emp
                            continue

                    changed = []
                    diffs = []

                    def setf(field, val):
                        old = getattr(emp, field)
                        if old != val:
                            setattr(emp, field, val)
                            changed.append(field)
                            if field in _LABELS:
                                diffs.append(f"{_LABELS[field]}: {_lab(old)} → {_lab(val)}")

                    if given:
                        setf("first_name", given)
                    if surname:
                        setf("last_name", surname)
                    if mobile and not emp.mobile:
                        setf("mobile", mobile)
                    if dept_obj:
                        setf("department", dept_obj)
                    if desig_obj:
                        setf("designation", desig_obj)
                    if emp.level_id != lvl_obj.id:
                        setf("level", lvl_obj)
                        res["employee_levels_changed"] += 1
                    setf("is_active", enabled)
                    if not emp.user_id:
                        ur = UserRegister.objects.filter(email__iexact=email).first()
                        if ur:
                            setf("user", ur)
                    if changed:
                        emp.save(update_fields=changed)
                        res["updated_count"] += 1
                        note("employees_updated", {"name": u["display_name"], "email": email, "changes": diffs})
                    else:
                        res["skipped_count"] += 1
                    for k in _keys(email, u["user_principal_name"], u["mail"]):
                        emp_by_key.setdefault(k, emp)
            except Exception as err:
                logger.exception("Error syncing user %s", uid)
                res["errors"].append(f"Failed to sync user {u['display_name']}: {err}")

        # reporting managers + reporting level (manager's level), resolved against the whole directory
        for i, uid in enumerate(targets, 1):
            if progress:
                progress("managers", i - 1, n)
            u = by_id[uid]
            pid = u.get("parent_id")
            if not pid:
                continue
            parent = by_id.get(pid)
            emp = next((emp_by_key[k] for k in _keys(u["primary_email"], u["user_principal_name"], u["mail"]) if k in emp_by_key), None)
            mgr = next((emp_by_key[k] for k in _keys(parent["primary_email"], parent["user_principal_name"], parent["mail"]) if k in emp_by_key), None) if parent else None
            if not emp or not mgr or mgr.id == emp.id:
                continue
            changed = []
            if emp.reporting_manager_id != mgr.id:
                note("managers", {"employee": u["display_name"], "manager": parent["display_name"], "from": _lab(emp.reporting_manager and f"{emp.reporting_manager.first_name} {emp.reporting_manager.last_name}".strip())})
                emp.reporting_manager = mgr
                changed.append("reporting_manager")
                res["managers_linked"] += 1
            rl = level_for(parent["level"])
            if emp.reporting_level_id != rl.id:
                emp.reporting_level = rl
                changed.append("reporting_level")
            if changed:
                emp.save(update_fields=changed)

        if dry_run:
            transaction.set_rollback(True)

    if det is not None:
        res["details"] = det
        res["details_cap"] = DETAIL_CAP
    if not dry_run:
        invalidate_directory(company.id)
    return res


def auto_sync_company(company_id: int) -> Dict:
    """Scheduled entry point: re-sync only when the Entra data changed since the last successful run."""
    with transaction.atomic():
        c = Company.objects.select_for_update(skip_locked=True).filter(pk=company_id).first()
        if not c:
            return {"status": "busy"}
        d = get_directory(c, force=True)
        fp = fingerprint(d)
        now = timezone.now()
        if fp == c.entra_sync_hash:
            c.entra_last_checked_at = now
            c.save(update_fields=["entra_last_checked_at"])
            return {"status": "unchanged"}
        res = run_sync(c, d, [u["entra_id"] for u in d["users"]])
        c.entra_last_checked_at = now
        c.entra_last_summary = json.dumps({k: v for k, v in res.items() if k != "errors"} | {"error_count": len(res["errors"])})
        fields = ["entra_last_checked_at", "entra_last_summary"]
        if not res["errors"]:  # retry failed runs on the next tick
            c.entra_sync_hash = fp
            c.entra_last_sync_at = now
            fields += ["entra_sync_hash", "entra_last_sync_at"]
        c.save(update_fields=fields)
        return {"status": "synced" if not res["errors"] else "partial", **res}


def run_auto_sync_all() -> Dict[int, str]:
    out = {}
    for cid in Company.objects.filter(entra_auto_sync=True).values_list("id", flat=True):
        try:
            out[cid] = auto_sync_company(cid)["status"]
        except Exception as err:
            logger.exception("Entra auto-sync failed for company %s", cid)
            out[cid] = f"error: {err}"
    return out


def mark_synced(company: Company, d: Dict) -> None:
    company.entra_sync_hash = fingerprint(d)
    company.entra_last_sync_at = company.entra_last_checked_at = timezone.now()
    company.save(update_fields=["entra_sync_hash", "entra_last_sync_at", "entra_last_checked_at"])


# ---------------------------------------------------------------------------
# Background job with pollable progress (cache is shared across worker processes)
# ---------------------------------------------------------------------------
_JOB_TTL = 3600


def _store():
    return caches["teams_state"]


def get_job(job_id: str) -> Optional[Dict]:
    return _store().get(f"entra_job:{job_id}")


def start_sync_job(company_id: int, ids: Optional[List[str]] = None, total: int = 0) -> str:
    """ids=None means everyone; the directory is read inside the job so this returns instantly."""
    store, active_key = _store(), f"entra_job_active:{company_id}"
    active = store.get(active_key)
    if active and (get_job(active) or {}).get("state") == "running":
        return active
    job_id = uuid.uuid4().hex
    store.set(f"entra_job:{job_id}", {"state": "running", "company_id": company_id, "percent": 1, "phase": "Reading Microsoft Entra directory", "done": 0, "total": len(ids) if ids else total}, _JOB_TTL)
    store.set(active_key, job_id, _JOB_TTL)
    threading.Thread(target=_run_job, args=(job_id, company_id, ids), daemon=True).start()
    return job_id


def _run_job(job_id: str, company_id: int, ids: Optional[List[str]]) -> None:
    store, key = _store(), f"entra_job:{job_id}"
    state = {"state": "running", "company_id": company_id, "percent": 1, "phase": "Reading Microsoft Entra directory", "done": 0, "total": len(ids) if ids else 0}
    last = [0.0]

    def put(**kw):
        state.update(kw)
        store.set(key, dict(state), _JOB_TTL)

    def progress(kind, done, total):
        now = time.time()
        if done and now - last[0] < 0.2:
            return
        last[0] = now
        if kind == "employees":
            put(percent=int(3 + 82 * done / max(total, 1)), phase="Importing departments, levels, designations and employees", done=done, total=total)
        else:
            put(percent=int(85 + 14 * done / max(total, 1)), phase="Linking reporting managers", done=done, total=total)

    try:
        company = Company.objects.get(pk=company_id)
        put()
        d = get_directory(company)
        ids = ids or [u["entra_id"] for u in d["users"]]
        put(total=len(ids))
        res = run_sync(company, d, ids, progress=progress)
        if not res["errors"]:
            mark_synced(company, d)
        put(state="done", percent=100, phase="Completed", done=len(ids), total=len(ids), result=res)
    except Exception as err:
        logger.exception("Entra sync job failed")
        put(state="error", error=str(err))
    finally:
        store.delete(f"entra_job_active:{company_id}")
        connection.close()
