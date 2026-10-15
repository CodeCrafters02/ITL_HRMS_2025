import json
import logging
import re
import threading
from collections import deque
import time
from typing import Dict, List, Optional, Tuple

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Company, Department, Designation, Employee, UserRegister
from .permissions import IsAdminUser

logger = logging.getLogger(__name__)

GRAPH_URL = "https://graph.microsoft.com/v1.0"

_token_cache: Dict[str, any] = {"token": None, "exp": 0}
_token_lock = threading.Lock()
_http = requests.Session()  # connection pooling for the many paged Graph calls


def get_entra_app_token() -> str:
    """Acquires and caches an application-level Microsoft Graph OAuth token using client credentials."""
    with _token_lock:
        now = time.time()
        if _token_cache["token"] and _token_cache["exp"] > now + 60:
            return _token_cache["token"]

        tenant_id = getattr(settings, "MICROSOFT_TENANT_ID", "")
        client_id = getattr(settings, "MICROSOFT_CLIENT_ID", "")
        client_secret = getattr(settings, "MICROSOFT_CLIENT_SECRET", "")

        if not (tenant_id and client_id and client_secret):
            raise ValueError("Microsoft Entra ID credentials (TENANT_ID, CLIENT_ID, CLIENT_SECRET) are not configured.")

        url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        }

        res = _http.post(url, data=payload, timeout=12)
        res.raise_for_status()
        data = res.json()

        access_token = data.get("access_token")
        expires_in = int(data.get("expires_in", 3500))
        _token_cache["token"] = access_token
        _token_cache["exp"] = now + expires_in
        return access_token


def fetch_all_entra_users() -> List[Dict]:
    """Fetches all users from Microsoft Graph API with pagination support including manager info."""
    token = get_entra_app_token()
    headers = {"Authorization": f"Bearer {token}", "ConsistencyLevel": "eventual"}
    select_fields = (
        "id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,"
        "department,mobilePhone,businessPhones,officeLocation,accountEnabled,createdDateTime"
    )
    url = f"{GRAPH_URL}/users?$top=999&$select={select_fields}&$expand=manager($select=id,displayName,mail,userPrincipalName)"

    users: List[Dict] = []
    while url:
        res = _http.get(url, headers=headers, timeout=15)
        res.raise_for_status()
        data = res.json()
        users.extend(data.get("value", []))
        url = data.get("@odata.nextLink")

    return users


def _get_next_employee_code() -> str:
    """Calculates the next sequential employee ID code (e.g. EMP0057)."""
    highest = 0
    pattern = re.compile(r"EMP-?(\d+)", re.IGNORECASE)
    for emp_code in Employee.objects.values_list("employee_id", flat=True):
        if not emp_code:
            continue
        m = pattern.search(str(emp_code).strip())
        if m:
            try:
                num = int(m.group(1))
                if num > highest:
                    highest = num
            except ValueError:
                pass
    next_num = highest + 1
    return f"EMP{next_num:04d}"


def cross_reference_with_hrms(company: Company, entra_users: List[Dict]) -> Tuple[List[Dict], Dict]:
    """Cross-references Entra users with HRMS Employee and UserRegister records for the company."""
    # Preload HRMS Employees & UserRegisters
    employees = Employee.objects.filter(company=company).select_related("user", "department", "designation", "reporting_manager", "level")
    users = UserRegister.objects.filter(company=company)

    # Index by normalized email and userPrincipalName
    emp_by_email: Dict[str, Employee] = {}
    for emp in employees:
        if emp.email:
            emp_by_email[emp.email.strip().lower()] = emp
        if emp.user and emp.user.email:
            emp_by_email[emp.user.email.strip().lower()] = emp
        if emp.user and emp.user.username:
            emp_by_email[emp.user.username.strip().lower()] = emp

    user_by_email: Dict[str, UserRegister] = {}
    for u in users:
        if u.email:
            user_by_email[u.email.strip().lower()] = u
        if u.username:
            user_by_email[u.username.strip().lower()] = u

    results = []
    synced_count = 0
    pending_count = 0
    active_count = 0
    disabled_count = 0

    for item in entra_users:
        entra_id = item.get("id")
        display_name = item.get("displayName") or ""
        given_name = item.get("givenName") or ""
        surname = item.get("surname") or ""
        mail = (item.get("mail") or "").strip().lower()
        upn = (item.get("userPrincipalName") or "").strip().lower()
        primary_email = mail if (mail and "@" in mail) else upn
        job_title = item.get("jobTitle") or ""
        department = item.get("department") or ""
        office_location = item.get("officeLocation") or ""
        account_enabled = bool(item.get("accountEnabled", True))

        phone = item.get("mobilePhone") or ""
        if not phone and item.get("businessPhones"):
            phone = item["businessPhones"][0]

        # Extract manager from Entra expand
        mgr_dict = item.get("manager") or {}
        manager_id = mgr_dict.get("id") or None
        manager_name = mgr_dict.get("displayName") or None
        manager_email = (mgr_dict.get("mail") or mgr_dict.get("userPrincipalName") or "").strip().lower() or None

        if account_enabled:
            active_count += 1
        else:
            disabled_count += 1

        # Match against HRMS
        matched_emp: Optional[Employee] = None
        if primary_email in emp_by_email:
            matched_emp = emp_by_email[primary_email]
        elif upn in emp_by_email:
            matched_emp = emp_by_email[upn]
        elif mail and mail in emp_by_email:
            matched_emp = emp_by_email[mail]

        matched_user: Optional[UserRegister] = None
        if primary_email in user_by_email:
            matched_user = user_by_email[primary_email]
        elif upn in user_by_email:
            matched_user = user_by_email[upn]

        hrms_mgr_name = (
            f"{matched_emp.reporting_manager.first_name} {matched_emp.reporting_manager.last_name}".strip()
            if (matched_emp and matched_emp.reporting_manager)
            else ""
        )

        hrms_synced = matched_emp is not None
        if hrms_synced:
            synced_count += 1
            # Check if there are metadata discrepancies (job title or department differs)
            has_diff = False
            hrms_desig = matched_emp.designation.designation_name if matched_emp.designation else ""
            hrms_dept = matched_emp.department.department_name if matched_emp.department else ""
            if job_title and hrms_desig and job_title.strip().lower() != hrms_desig.strip().lower():
                has_diff = True
            if department and hrms_dept and department.strip().lower() != hrms_dept.strip().lower():
                has_diff = True
            sync_status = "needs_update" if has_diff else "synced"
        else:
            pending_count += 1
            sync_status = "pending_import"

        results.append({
            "entra_id": entra_id,
            "display_name": display_name,
            "given_name": given_name,
            "surname": surname,
            "primary_email": primary_email,
            "mail": mail,
            "user_principal_name": upn,
            "job_title": job_title,
            "department": department,
            "office_location": office_location,
            "mobile_phone": phone,
            "account_enabled": account_enabled,
            "sync_status": sync_status,
            "manager_id": manager_id,
            "manager_name": manager_name or (hrms_mgr_name if hrms_mgr_name else None),
            "manager_email": manager_email,
            "hrms_synced": hrms_synced,
            "hrms_employee_id": matched_emp.id if matched_emp else None,
            "hrms_employee_code": matched_emp.employee_id if matched_emp else None,
            "hrms_department": (matched_emp.department.department_name if matched_emp and matched_emp.department else ""),
            "hrms_designation": (matched_emp.designation.designation_name if matched_emp and matched_emp.designation else ""),
            "hrms_reporting_manager_id": matched_emp.reporting_manager_id if (matched_emp and matched_emp.reporting_manager) else None,
            "hrms_reporting_manager_name": hrms_mgr_name if hrms_mgr_name else None,
            "hrms_level": (matched_emp.level.level_name if matched_emp and matched_emp.level else ""),
            "hrms_is_active": matched_emp.is_active if matched_emp else None,
            "hrms_user_id": (matched_emp.user_id if matched_emp else (matched_user.id if matched_user else None)),
        })

    stats = {
        "total_entra": len(entra_users),
        "synced_count": synced_count,
        "pending_count": pending_count,
        "active_count": active_count,
        "disabled_count": disabled_count,
    }

    return results, stats


# ---------------------------------------------------------------------------
# Cached, indexed directory snapshot (one Graph round-trip serves many requests)
# ---------------------------------------------------------------------------
DIRECTORY_TTL_SECONDS = 120
_dir_cache: Dict[int, Dict] = {}
_dir_lock = threading.Lock()
GENERAL_DEPT = "General / Unassigned"
LEADERSHIP_WORDS = ("chief", "director", "head", "leader", "president", "ceo", "cto", "cfo", "founder")


def invalidate_directory(company_id: Optional[int] = None) -> None:
    with _dir_lock:
        if company_id is None:
            _dir_cache.clear()
        else:
            _dir_cache.pop(company_id, None)


def get_directory(company: Company, force: bool = False) -> Dict:
    """Returns the cross-referenced directory for a company, refreshed at most every DIRECTORY_TTL_SECONDS."""
    now = time.time()
    with _dir_lock:
        cached = _dir_cache.get(company.id)
        if cached and not force and now - cached["ts"] < DIRECTORY_TTL_SECONDS:
            return cached

    raw = fetch_all_entra_users()
    users, stats = cross_reference_with_hrms(company, raw)

    by_id = {u["entra_id"]: u for u in users}
    email_index: Dict[str, str] = {}
    for u in users:
        for key in (u["primary_email"], u["mail"], u["user_principal_name"]):
            if key:
                email_index[key.lower()] = u["entra_id"]

    children: Dict[str, List[str]] = {}
    has_parent = set()
    for u in users:
        parent_id = u["manager_id"] if u["manager_id"] in by_id else email_index.get((u["manager_email"] or "").lower())
        if parent_id and parent_id != u["entra_id"]:
            children.setdefault(parent_id, []).append(u["entra_id"])
            has_parent.add(u["entra_id"])
        u["parent_id"] = parent_id if parent_id and parent_id != u["entra_id"] else None

    # roots = people nobody manages; also rescue members of pure management cycles
    roots = [u["entra_id"] for u in users if u["entra_id"] not in has_parent]
    seen = set()
    stack = list(roots)
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen.add(cur)
        stack.extend(children.get(cur, []))
    for u in users:
        if u["entra_id"] not in seen:
            roots.append(u["entra_id"])
            seen.add(u["entra_id"])
            stack = list(children.get(u["entra_id"], []))
            while stack:
                cur = stack.pop()
                if cur not in seen:
                    seen.add(cur)
                    stack.extend(children.get(cur, []))

    def root_rank(eid: str):
        u = by_id[eid]
        title = (u["job_title"] or "").lower()
        lead = any(w in title for w in LEADERSHIP_WORDS)
        return (0 if lead else 1, -len(children.get(eid, [])), (u["display_name"] or "").lower())

    roots.sort(key=root_rank)
    for kids in children.values():
        kids.sort(key=lambda i: (-len(children.get(i, [])), (by_id[i]["display_name"] or "").lower()))

    # hierarchy depth: roots are L1, their direct reports L2, and so on (cycle-safe BFS)
    depth: Dict[str, int] = {}
    queue = deque((r, 1) for r in roots)
    while queue:
        cur, dp = queue.popleft()
        if cur in depth:
            continue
        depth[cur] = dp
        queue.extend((k, dp + 1) for k in children.get(cur, []))
    for u in users:
        lvl = depth.get(u["entra_id"], 1)
        u["level"] = lvl
        u["level_name"] = f"L{lvl}"
        if u["sync_status"] == "synced" and u["hrms_level"] != u["level_name"]:
            u["sync_status"] = "needs_update"

    snapshot = {
        "ts": now,
        "users": users,
        "stats": stats,
        "by_id": by_id,
        "raw_by_id": {r.get("id"): r for r in raw if r.get("id")},
        "children": children,
        "roots": roots,
        "departments": sorted({(u["department"] or "").strip() for u in users if (u["department"] or "").strip()}, key=str.lower),
    }
    with _dir_lock:
        _dir_cache[company.id] = snapshot
    return snapshot


def _dept_of(u: Dict) -> str:
    return (u["department"] or "").strip() or GENERAL_DEPT


def _matches(u: Dict, f) -> bool:
    status = (f.get("status") or "all").lower()
    if status == "pending" and u["sync_status"] != "pending_import":
        return False
    if status == "synced" and u["sync_status"] == "pending_import":
        return False
    if status == "update" and u["sync_status"] != "needs_update":
        return False
    account = (f.get("account") or "").lower()
    if account == "active" and not u["account_enabled"]:
        return False
    if account == "disabled" and u["account_enabled"]:
        return False
    dept = f.get("department")
    if dept and _dept_of(u).lower() != dept.strip().lower():
        return False
    desig = f.get("designation")
    if desig and ((u["job_title"] or "").strip() or "No designation").lower() != desig.strip().lower():
        return False
    q = (f.get("search") or "").strip().lower()
    if q:
        hay = " ".join(str(u.get(k) or "") for k in ("display_name", "primary_email", "job_title", "department", "hrms_employee_code", "manager_name", "office_location")).lower()
        if q not in hay:
            return False
    return True


_SORTABLE = {
    "display_name": lambda u: (u["display_name"] or "").lower(),
    "job_title": lambda u: (u["job_title"] or "").lower(),
    "department": lambda u: (u["department"] or "").lower(),
    "manager_name": lambda u: (u["manager_name"] or "").lower(),
    "office_location": lambda u: (u["office_location"] or "").lower(),
    "sync_status": lambda u: u["sync_status"],
    "account_enabled": lambda u: not u["account_enabled"],
}


def _page(items: List, params, default_size: int = 10):
    try:
        size = max(1, min(100, int(params.get("page_size", default_size))))
    except (TypeError, ValueError):
        size = default_size
    try:
        page = max(1, int(params.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    total = len(items)
    pages = max(1, -(-total // size))
    page = min(page, pages)
    return items[(page - 1) * size: page * size], total, page, size


def _group_stats(members: List[Dict]) -> Dict:
    synced = sum(1 for m in members if m["sync_status"] == "synced")
    pending = sum(1 for m in members if m["sync_status"] == "pending_import")
    update = sum(1 for m in members if m["sync_status"] == "needs_update")
    total = len(members)
    return {
        "total": total,
        "synced": synced,
        "pending": pending,
        "needs_update": update,
        "percent": round(((total - pending) / total) * 100) if total else 0,
    }


class MicrosoftEntraUsersAPIView(APIView):
    """Microsoft Entra directory cross-referenced with HRMS.

    Without query params the full list is returned (legacy). Otherwise the work happens on the server:
      view=list         page, page_size, search, status, department, designation, account, ordering, ids_only
      view=departments  page, page_size, search
      view=designations page, page_size, search
      view=hierarchy    parent=<entra_id> (direct reports), or roots with page/page_size, or search=<text> (flat matches)
      refresh=1         bypass the 2-minute directory cache
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        company = request.user.company
        if not company:
            return Response({"detail": "Admin has no associated company."}, status=status.HTTP_400_BAD_REQUEST)

        p = request.query_params
        try:
            d = get_directory(company, force=p.get("refresh") == "1")
        except Exception as e:
            logger.exception("Failed to fetch Microsoft Entra users")
            return Response({"detail": f"Failed to fetch Microsoft Entra users: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        base = {"company_id": company.id, "company_name": company.name, "stats": d["stats"], "cached_at": int(d["ts"])}
        users = d["users"]

        if not any(k in p for k in ("view", "page", "ids_only", "parent", "search")):
            return Response({**base, "users": users}, status=status.HTTP_200_OK)

        view = (p.get("view") or "list").lower()

        if view == "departments":
            groups: Dict[str, List[Dict]] = {}
            for u in users:
                groups.setdefault(_dept_of(u), []).append(u)
            q = (p.get("search") or "").strip().lower()
            rows = []
            for name, members in groups.items():
                if q and q not in name.lower() and not any(q in (m["display_name"] or "").lower() for m in members):
                    continue
                rows.append({"name": name, **_group_stats(members)})
            rows.sort(key=lambda r: (-r["total"], r["name"].lower()))
            page_rows, total, page, size = _page(rows, p, 6)
            return Response({**base, "count": total, "page": page, "page_size": size, "results": page_rows})

        if view == "designations":
            groups = {}
            for u in users:
                groups.setdefault((u["job_title"] or "").strip() or "No designation", []).append(u)
            q = (p.get("search") or "").strip().lower()
            rows = []
            for name, members in groups.items():
                if q and q not in name.lower() and not any(q in (m["display_name"] or "").lower() for m in members):
                    continue
                depts = sorted({_dept_of(m) for m in members}, key=str.lower)
                rows.append({"name": name, "departments": depts[:4], "department_count": len(depts), "level": min(m["level"] for m in members), **_group_stats(members)})
            rows.sort(key=lambda r: (-r["total"], r["name"].lower()))
            page_rows, total, page, size = _page(rows, p, 6)
            return Response({**base, "count": total, "page": page, "page_size": size, "results": page_rows})

        if view == "hierarchy":
            children, by_id = d["children"], d["by_id"]

            def node(eid: str) -> Dict:
                return {**by_id[eid], "reports_count": len(children.get(eid, []))}

            parent = p.get("parent")
            if parent:
                kids = children.get(parent, [])
                return Response({**base, "count": len(kids), "results": [node(i) for i in kids]})
            q = (p.get("search") or "").strip()
            if q:
                found = [u for u in users if _matches(u, {"search": q})][:50]
                return Response({**base, "mode": "search", "count": len(found), "results": [node(u["entra_id"]) for u in found]})
            roots = d["roots"]
            standalone = [i for i in roots if not children.get(i) and not (by_id[i]["job_title"] or "").strip()]
            tree_roots = [i for i in roots if i not in set(standalone)]
            page_ids, total, page, size = _page(tree_roots, p, 10)
            return Response({
                **base,
                "mode": "roots",
                "count": total,
                "page": page,
                "page_size": size,
                "standalone_count": len(standalone),
                "results": [node(i) for i in page_ids],
            })

        # view == list
        filtered = [u for u in users if _matches(u, p)]
        ordering = (p.get("ordering") or "display_name").strip()
        desc = ordering.startswith("-")
        key = _SORTABLE.get(ordering.lstrip("-"), _SORTABLE["display_name"])
        filtered.sort(key=key, reverse=desc)

        if p.get("ids_only") == "true":
            return Response({**base, "count": len(filtered), "ids": [u["entra_id"] for u in filtered][:2000]})

        page_rows, total, page, size = _page(filtered, p, 10)
        return Response({**base, "count": total, "page": page, "page_size": size, "departments": d["departments"], "results": page_rows})




class MicrosoftEntraSyncAPIView(APIView):
    """Syncs departments, levels (hierarchy depth), designations, employees and reporting managers from Entra.

    Body: user_ids | filters | scope="all"; dry_run=true previews the counts without writing anything.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        from .entra_sync import mark_synced, run_sync, start_sync_job

        company = request.user.company
        if not company:
            return Response({"detail": "Admin has no associated company."}, status=status.HTTP_400_BAD_REQUEST)
        scope = request.data.get("scope")
        if request.data.get("async") and scope == "all" and not request.data.get("dry_run"):
            total = int(request.data.get("total") or 0)
            return Response({"job_id": start_sync_job(company.id, None, total), "total": total}, status=status.HTTP_202_ACCEPTED)

        try:
            directory = get_directory(company)
        except Exception as e:
            return Response({"detail": f"Could not reach Microsoft Graph API: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

        filters = request.data.get("filters")
        if scope == "all":
            ids = [u["entra_id"] for u in directory["users"]]
        elif isinstance(filters, dict):
            ids = [u["entra_id"] for u in directory["users"] if _matches(u, filters)]
        else:
            ids = request.data.get("user_ids", [])
            if not isinstance(ids, list):
                ids = []
        if not ids:
            return Response({"detail": "Please provide 'user_ids', 'filters' or scope='all' matching at least one user."}, status=status.HTTP_400_BAD_REQUEST)

        dry = bool(request.data.get("dry_run"))
        if request.data.get("async") and not dry:
            return Response({"job_id": start_sync_job(company.id, ids), "total": len(ids)}, status=status.HTTP_202_ACCEPTED)
        res = run_sync(company, directory, ids if scope == "all" else ids[:1000], dry_run=dry, detail=dry)
        if scope == "all" and not dry and not res["errors"]:
            mark_synced(company, directory)
        res["message"] = f"Synchronization completed. {res['imported_count']} imported, {res['updated_count']} updated, {res['skipped_count']} unchanged."
        res["dry_run"] = dry
        res["total"] = len(ids)
        return Response(res, status=status.HTTP_200_OK)


class MicrosoftEntraAutoSyncAPIView(APIView):
    """Reads / toggles the 5-minute background sync for the admin's company."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    @staticmethod
    def _state(c: Company) -> Dict:
        try:
            summary = json.loads(c.entra_last_summary) if c.entra_last_summary else None
        except ValueError:
            summary = None
        return {
            "enabled": c.entra_auto_sync,
            "interval_minutes": 5,
            "last_sync_at": c.entra_last_sync_at,
            "last_checked_at": c.entra_last_checked_at,
            "last_summary": summary,
        }

    def get(self, request):
        c = request.user.company
        if not c:
            return Response({"detail": "Admin has no associated company."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self._state(c))

    def post(self, request):
        c = request.user.company
        if not c:
            return Response({"detail": "Admin has no associated company."}, status=status.HTTP_400_BAD_REQUEST)
        c.entra_auto_sync = bool(request.data.get("enabled"))
        c.save(update_fields=["entra_auto_sync"])
        return Response(self._state(c))


class MicrosoftEntraSyncStatusAPIView(APIView):
    """Progress of a background 'sync everything' job: ?job=<id>."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from .entra_sync import get_job

        job = get_job(request.query_params.get("job", ""))
        if not job or job.get("company_id") != request.user.company_id:
            return Response({"detail": "Sync job not found or expired."}, status=status.HTTP_404_NOT_FOUND)
        return Response(job)
