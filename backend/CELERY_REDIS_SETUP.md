# Celery + Redis Setup Guide
## ITL HRMS 2025 — Automatic Checkout Reminder & Background Tasks

---

## 📋 Overview

This project uses **Celery** (task queue) + **Redis** (message broker) to run background jobs automatically:

| Task | Schedule | What it does |
|---|---|---|
| `send_missing_checkout_alerts` | Every 30 minutes | Notifies employees who haven't checked out 2+ hours after their shift ends |
| `flag_missing_checkouts` | Daily at 06:00 IST | Flags previous day's attendances that have check-in but no check-out |

---

## 🔧 Prerequisites

### 1. Install Python dependencies
```bash
pip install celery django-celery-beat django-celery-results apscheduler django-apscheduler
```

### 2. Install & Start Redis (Windows)

**Option A — Using WSL (recommended):**
```bash
# Inside WSL terminal
sudo apt update
sudo apt install redis-server
sudo service redis-server start

# Verify Redis is running
redis-cli ping
# Expected output: PONG
```

**Option B — Using Memurai (Redis for Windows):**
1. Download from https://www.memurai.com/
2. Install and it runs as a Windows Service automatically
3. Verify: open PowerShell → `memurai-cli ping` → should return `PONG`

**Option C — Using Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:latest

# Verify
docker exec redis redis-cli ping
# Expected output: PONG
```

### 3. Verify Redis is reachable from Django
```bash
python manage.py shell -c "import redis; r = redis.Redis(); print(r.ping())"
# Expected output: True
```

---

## ⚙️ Configuration (already set in `settings.py`)

The following is already configured — **no changes needed**:

```
Redis DB 0  → Django Channels (WebSocket / Chat)
Redis DB 1  → Celery Broker   (task queue)
Redis DB 2  → Celery Results  (task return values)
```

Key settings in `settings.py`:
```python
REDIS_URL        = "redis://127.0.0.1:6379/0"   # Channels
CELERY_BROKER_URL     = "redis://127.0.0.1:6379/1"
CELERY_RESULT_BACKEND = "redis://127.0.0.1:6379/2"
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
```

---

## 🚀 Starting Everything

You need **3 separate terminal windows** to run the full stack:

### Terminal 1 — Django Server
```bash
cd backend
python manage.py runserver
```

### Terminal 2 — Celery Worker
```bash
cd backend
celery -A innovyx_hrms worker --loglevel=info
```
> The worker actually **executes** the tasks when triggered.

### Terminal 3 — Celery Beat (Scheduler)
```bash
cd backend
celery -A innovyx_hrms beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```
> Beat is the **clock** — it triggers tasks on schedule (every 30 min / daily 6 AM).

---

## 📝 Register Periodic Tasks in the Database

**Run this once** after first setup (or whenever tasks change):
```bash
cd backend
python manage.py register_periodic_tasks
```

Expected output:
```
Created: Flag missing checkouts (daily 6 AM IST)
Created: Send missing checkout alerts (every 30 min)
Periodic tasks registered successfully.
```

You can also view/edit these in Django Admin:
```
http://localhost:8000/admin/  → Periodic Tasks → Periodic Tasks
```

---

## ✅ Verify Everything is Working

### Check Celery Worker is alive
```bash
celery -A innovyx_hrms inspect ping
# Expected: {'celery@<hostname>': {'ok': 'pong'}}
```

### Manually run a task right now
```bash
python manage.py shell -c "
from employee.tasks import send_missing_checkout_alerts
result = send_missing_checkout_alerts()
print('Result:', result)
"
```

### Check registered periodic tasks
```bash
python manage.py shell -c "
from django_celery_beat.models import PeriodicTask
for t in PeriodicTask.objects.all():
    print(t.name, '| enabled:', t.enabled)
"
```

---

## 🐛 Troubleshooting

### ❌ `ModuleNotFoundError: No module named 'celery'`
```bash
pip install celery django-celery-beat django-celery-results
```

### ❌ `Error connecting to Redis: Connection refused`
Redis is not running. Start it using one of the methods in Prerequisites.

### ❌ Celery Beat not triggering tasks
1. Make sure `register_periodic_tasks` was run
2. Make sure **both** the Worker AND Beat terminals are running
3. Check Django Admin → Periodic Tasks that tasks are `enabled=True`

### ❌ `invalid_grant: Invalid JWT Signature` (FCM push)
Firebase service account key may be expired or wrong.  
The **email and in-app notifications still work** even if FCM fails.

### ❌ Tasks run but emails not sending
Check `settings.py` email config:
```python
EMAIL_HOST_USER     = 'alerts@innovyxtechlabs.com'
EMAIL_HOST_PASSWORD = '<app-password>'
```
Make sure the Gmail App Password is still valid.

---

## 🔄 APScheduler vs Celery Beat — Which is Active?

This project has **both** configured:

| | APScheduler | Celery Beat |
|---|---|---|
| **How it runs** | Inside Django process automatically | Requires separate `celery beat` + `celery worker` terminals |
| **Setup needed** | Zero — starts when Django starts | Run `register_periodic_tasks` + 2 terminals |
| **Best for** | Development / simple single-server | Production / multiple servers |
| **Status** | ✅ Active (fixed and running) | ✅ Ready (packages installed, just start the processes) |

> **In development**: APScheduler is enough — just run `python manage.py runserver`.  
> **In production (multiple servers/workers)**: Use Celery Beat for reliability.

---

## 🗂️ Relevant Files

| File | Purpose |
|---|---|
| `employee/tasks.py` | Task definitions (`send_missing_checkout_alerts`, `flag_missing_checkouts`) |
| `employee/apps.py` | APScheduler auto-start on Django boot |
| `employee/management/commands/register_periodic_tasks.py` | Registers tasks in Celery Beat DB |
| `employee/management/commands/run_scheduler.py` | Alternative: run APScheduler as a blocking management command |
| `innovyx_hrms/celery.py` | Celery app configuration |
| `innovyx_hrms/settings.py` | Redis URLs, Celery serialization, Beat scheduler settings |
