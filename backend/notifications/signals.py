from .service import send_fcm_to_users,send_push_notification_to_all
from app.models import UserRegister
from django.db.models.signals import post_save, pre_save, post_migrate
from django.dispatch import receiver
from django.utils import timezone
from employee.models import TaskAssignment, Task
from app.models import Employee, EmpLeave, CalendarEvent, LearningCorner, Notification
from notifications.models import UserNotification


def _company_user_ids(company):
    return list(
        Employee.objects.filter(company=company).select_related("user").values_list("user__id", flat=True)
    )
# --- TASKS ---
@receiver(post_save, sender=TaskAssignment)
def task_assigned_updated(sender, instance, created, **kwargs):
    """
    When a manager assigns/updates a task assignment, notify only the assigned employee.
    Also create a UserNotification so the frontend gets live notification via SSE and API.
    """
    emp_user_id = instance.employee.user.id if hasattr(instance.employee, 'user') else None
    if not emp_user_id:
        return
    task = instance.task
    body = f"{task.title} (deadline: {task.deadline})"
    data = {"type": "task", "task_id": task.id, "assignment_id": instance.id, "status": instance.status}
    default_sender = UserRegister.objects.filter(role='admin').first()
    send_fcm_to_users([emp_user_id], "task", body, sender=default_sender, extra_data=data)
    # Create UserNotification for live notification
    if created:
        UserNotification.objects.create(
            recipient=instance.employee,
            title=f"Task Assigned: {task.title}",
            message=f"You have been assigned a task: {task.title} (deadline: {task.deadline})",
            related_object_id=task.id,
            sender=default_sender
        )

@receiver(post_save, sender=TaskAssignment)
def notify_employees_on_assignment(sender, instance, created, **kwargs):
    if created:
        # all users currently assigned to this task
        assigned_user_ids = list(
            instance.task.assignments.select_related("employee__user").values_list("employee__user__id", flat=True)
        )

        
        default_sender = UserRegister.objects.filter(role="admin").first()
        send_fcm_to_users(
            assigned_user_ids,
            "task",
            f"{instance.task.title} assigned to you",
            sender=default_sender,
            extra_data={"type": "task", "task_id": instance.task.id},
        )
        print(f"[DEBUG] Notification sent to {assigned_user_ids} for Task {instance.task.id}")

@receiver(post_save, sender=EmpLeave)
def leave_created_notify_manager(sender, instance, created, **kwargs):
    """
    When employee submits leave -> notify reporting manager only.
    Also create a UserNotification for the manager.
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
        # Create UserNotification for manager, set sender to default_sender
        UserNotification.objects.create(
            recipient=instance.reporting_manager,
            title=f"Leave Request from {instance.employee}",
            message=f"{instance.employee} requested {instance.leave_type} ({instance.from_date} → {instance.to_date})",
            related_object_id=instance.id,
            sender=default_sender
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
            # Create UserNotification for employee, set sender to default_sender
            UserNotification.objects.create(
                recipient=instance.employee,
                title=f"Leave Status Updated",
                message=f"Your leave ({instance.from_date} → {instance.to_date}) is {instance.status}",
                related_object_id=instance.id,
                sender=default_sender
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
        # Create UserNotification for all employees in company
        for emp in Employee.objects.filter(company=instance.company):
            UserNotification.objects.create(
                recipient=emp,
                title=instance.title or "Admin Notification",
                message=instance.description or instance.title or "",
                related_object_id=instance.id,
                sender=default_sender
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
        # Create UserNotification for all employees in company
        for emp in Employee.objects.filter(company=instance.company):
            UserNotification.objects.create(
                recipient=emp,
                title=instance.name or "Calendar Event",
                message=getattr(instance, 'description', "Calendar Event"),
                related_object_id=instance.id,
                sender=default_sender  # Make sure default_sender is set to a valid UserRegister instance
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
        # Create UserNotification for all employees in company
        for emp in Employee.objects.filter(company=instance.company):
            UserNotification.objects.create(
                recipient=emp,
                title=instance.title or "Learning Corner",
                message=(instance.description or instance.title or "Learning Corner"),
                related_object_id=instance.id,
                sender=default_sender
            )


@receiver(post_migrate)
def send_birthday_push_notifications(sender, **kwargs):
    today = timezone.localdate()
    birthday_employees = Employee.objects.filter(date_of_birth__month=today.month, date_of_birth__day=today.day)
    for emp in birthday_employees:
        message = f"Happy Birthday, {emp.full_name}! May your day be filled with joy and success 🎉."
        # This function should send a push notification to all users
        send_push_notification_to_all(title="🎂 Birthday Wish", message=message)
