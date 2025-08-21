from .service import send_fcm_to_users
from app.models import UserRegister
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from employee.models import TaskAssignment, Task
from app.models import Employee, EmpLeave, CalendarEvent, LearningCorner, Notification

def _company_user_ids(company):
    return list(
        Employee.objects.filter(company=company).select_related("user").values_list("user__id", flat=True)
    )
# --- TASKS ---
@receiver(post_save, sender=TaskAssignment)
def task_assigned_updated(sender, instance, created, **kwargs):
    """
    When a manager assigns/updates a task assignment, notify only the assigned employee.
    """
    print("[DEBUG] TaskAssignment signal fired. Instance:", instance)
    emp_user_id = instance.employee.user.id if hasattr(instance.employee, 'user') else None
    print(f"[DEBUG] Assigned employee user id: {emp_user_id}")
    if not emp_user_id:
        print("[DEBUG] No emp_user_id found, skipping notification.")
        return
    task = instance.task
    print(f"[DEBUG] Task: {task}")
    body = f"{task.title} (deadline: {task.deadline})"
    data = {"type": "task", "task_id": task.id, "assignment_id": instance.id, "status": instance.status}
    print(f"[DEBUG] Notification body: {body}")
    print(f"[DEBUG] Notification data: {data}")
    default_sender = UserRegister.objects.filter(role='admin').first()
    print(f"[DEBUG] Default sender: {default_sender}")
    send_fcm_to_users([emp_user_id], "task", body, sender=default_sender, extra_data=data)
    print("[DEBUG] send_fcm_to_users called for TaskAssignment.")

@receiver(post_save, sender=Task)
def task_created_by_manager(sender, instance, created, **kwargs):
    """
    If a manager creates a task and already has assignments, notify ONLY assigned employees.
    """
    print(f"[DEBUG] Task post_save signal fired. Created: {created}, Instance: {instance}")
    if created:
        assigned_user_ids = list(
            instance.assignments.select_related("employee__user").values_list("employee__user__id", flat=True)
        )
        print(f"[DEBUG] Assigned user ids for new task: {assigned_user_ids}")
        if assigned_user_ids:
            default_sender = UserRegister.objects.filter(role='admin').first()
            print(f"[DEBUG] Default sender: {default_sender}")
            send_fcm_to_users(
                assigned_user_ids,
                "task",
                f"{instance.title} assigned to you",
                sender=default_sender,
                extra_data={"type": "task", "task_id": instance.id}
            )
            print("[DEBUG] send_fcm_to_users called for Task creation.")

@receiver(post_save, sender=EmpLeave)
def leave_created_notify_manager(sender, instance, created, **kwargs):
    """
    When employee submits leave -> notify reporting manager only.
    """
    if created and instance.reporting_manager and instance.reporting_manager.user and instance.reporting_manager.user.id:
        default_sender = UserRegister.objects.filter(role='admin').first()
        send_fcm_to_users(
            [instance.reporting_manager.user.id],
            "leave",
            f"{instance.employee} requested {instance.leave_type} ({instance.from_date} → {instance.to_date})",
            sender=default_sender,
            extra_data={"type": "leave_request", "leave_id": instance.id}
        )

@receiver(pre_save, sender=EmpLeave)
def leave_status_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        prev = EmpLeave.objects.get(pk=instance.pk)
    except EmpLeave.DoesNotExist:
        return
    if prev.status != instance.status:
        if instance.employee and instance.employee.user and instance.employee.user.id:
            default_sender = UserRegister.objects.filter(role='admin').first()
            send_fcm_to_users(
                [instance.employee.user.id],
                "leave",
                f"Your leave ({instance.from_date} → {instance.to_date}) is {instance.status}",
                sender=default_sender,
                extra_data={"type": "leave_status", "leave_id": instance.id, "status": instance.status}
            )

@receiver(post_save, sender=Notification)
def admin_notification_broadcast(sender, instance, created, **kwargs):
    if created and instance.company_id:
        user_ids = _company_user_ids(instance.company)
        default_sender = UserRegister.objects.filter(role='admin').first()
        send_fcm_to_users(
            user_ids,
            "general",
            instance.description or (instance.title or "Notification"),
            sender=default_sender,
            title=instance.title or "Notification",
            related_object_id=instance.id,
            extra_data={"type": "admin_notification", "notification_id": instance.id}
        )

@receiver(post_save, sender=CalendarEvent)
def calendar_event_broadcast(sender, instance, created, **kwargs):
    if created and instance.company_id:
        user_ids = _company_user_ids(instance.company)
        default_sender = UserRegister.objects.filter(role='admin').first()
        send_fcm_to_users(
            user_ids,
            "event",
            f"{instance.name} on {instance.date}",
            sender=default_sender,
            title=instance.name,
            related_object_id=instance.id,
            extra_data={"type": "calendar_event", "event_id": instance.id}
        )

@receiver(post_save, sender=LearningCorner)
def learning_corner_broadcast(sender, instance, created, **kwargs):
    if created and instance.company_id:
        user_ids = _company_user_ids(instance.company)
        default_sender = UserRegister.objects.filter(role='admin').first()
        send_fcm_to_users(
            user_ids,
            "learning",
            instance.title or "New item in Learning Corner",
            sender=default_sender,
            title=instance.title or "Learning Corner",
            related_object_id=instance.id,
            extra_data={"type": "learning_corner", "learning_id": instance.id}
        )
