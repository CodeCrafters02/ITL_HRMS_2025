from .service import send_fcm_to_users
from app.models import UserRegister
from django.db.models.signals import post_save, pre_save, post_migrate
from django.dispatch import receiver
from employee.models import TaskAssignment, Task
from app.models import Employee, EmpLeave, CalendarEvent, LearningCorner, Notification, ChatMessage, AssetRequest, SeatBooking, ConferenceRoomBooking
from notifications.models import UserNotification
import logging

logger = logging.getLogger(__name__)


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
    try:
        send_fcm_to_users([emp_user_id], "task", body, sender=default_sender, extra_data=data)
    except Exception as e:
        logger.error(f"Failed to send FCM notification for task assignment: {e}")
    # Create UserNotification for live notification
    if created:
        try:
            UserNotification.objects.create(
                recipient=instance.employee,
                title=f"Task Assigned: {task.title}",
                message=f"You have been assigned a task: {task.title} (deadline: {task.deadline})",
                related_object_id=task.id,
                sender=default_sender
            )
        except Exception as e:
            logger.error(f"Failed to create UserNotification for task assignment: {e}")

@receiver(post_save, sender=TaskAssignment)
def notify_employees_on_assignment(sender, instance, created, **kwargs):
    if created:
        # all users currently assigned to this task
        assigned_user_ids = list(
            instance.task.assignments.select_related("employee__user").values_list("employee__user__id", flat=True)
        )

        
        default_sender = UserRegister.objects.filter(role="admin").first()
        try:
            send_fcm_to_users(
                assigned_user_ids,
                "task",
                f"{instance.task.title} assigned to you",
                sender=default_sender,
                extra_data={"type": "task", "task_id": instance.task.id},
            )
        except Exception as e:
            logger.error(f"Failed to send FCM notification for task assignment: {e}")
       
@receiver(post_save, sender=EmpLeave)
def leave_created_notify_manager(sender, instance, created, **kwargs):
    """
    When employee submits leave -> notify reporting manager only.
    Also create a UserNotification for the manager.
    """
    if created and instance.reporting_manager and instance.reporting_manager.user and instance.reporting_manager.user.id:
        default_sender = UserRegister.objects.filter(role='admin').first()
        try:
            send_fcm_to_users(
                [instance.reporting_manager.user.id],
                "leave",
                f"{instance.employee} requested {instance.leave_type} ({instance.from_date} → {instance.to_date})",
                sender=default_sender,
                extra_data={"type": "leave_request", "leave_id": instance.id}
            )
        except Exception as e:
            logger.error(f"Failed to send FCM notification for leave request: {e}")
        # Create UserNotification for manager, set sender to default_sender
        try:
            UserNotification.objects.create(
                recipient=instance.reporting_manager,
                title=f"Leave Request from {instance.employee}",
                message=f"{instance.employee} requested {instance.leave_type} ({instance.from_date} → {instance.to_date})",
                related_object_id=instance.id,
                sender=default_sender
            )
        except Exception as e:
            logger.error(f"Failed to create UserNotification for leave request: {e}")

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
            try:
                send_fcm_to_users(
                    [instance.employee.user.id],
                    "leave",
                    f"Your leave ({instance.from_date} → {instance.to_date}) is {instance.status}",
                    sender=default_sender,
                    extra_data={"type": "leave_status", "leave_id": instance.id, "status": instance.status}
                )
            except Exception as e:
                # Log but don't break the leave save operation
                logger.error(f"Failed to send FCM notification for leave status change: {e}")
            
            # Always create UserNotification even if FCM fails
            try:
                UserNotification.objects.create(
                    recipient=instance.employee,
                    title=f"Leave Status Updated",
                    message=f"Your leave ({instance.from_date} → {instance.to_date}) is {instance.status}",
                    related_object_id=instance.id,
                    sender=default_sender
                )
            except Exception as e:
                # Log but don't break the leave save operation
                logger.error(f"Failed to create UserNotification for leave status change: {e}")

@receiver(post_save, sender=Notification)
def admin_notification_broadcast(sender, instance, created, **kwargs):
    if created and instance.company_id:
        user_ids = _company_user_ids(instance.company)
        default_sender = UserRegister.objects.filter(role='admin').first()
        try:
            send_fcm_to_users(
                user_ids,
                "admin_notification",
                instance.description or (instance.title or "Notification"),
                sender=default_sender,
                title=instance.title or "Notification",
                related_object_id=instance.id,
                extra_data={
                    "type": "admin_notification",
                    "notification_id": instance.id,
                    "company_id": instance.company_id,
                },
                create_user_notifications=True,
            )
        except Exception as e:
            logger.error(f"Failed to send admin notification broadcast: {e}")

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



@receiver(post_save, sender=ChatMessage)
def chat_message_notify(sender, instance, created, **kwargs):
    """
    When a new chat message is created, notify all other members of the conversation.
    """
    if created:
        # Get all members except the sender
        members = instance.conversation.members.exclude(user=instance.sender).select_related('user')
        recipient_user_ids = [m.user.id for m in members if m.user and m.user.id]
        
        if not recipient_user_ids:
            return

        sender_name = instance.sender.first_name or instance.sender.username
        body = instance.content if len(instance.content) < 50 else f"{instance.content[:47]}..."
        
        extra_data = {
            "type": "chat",
            "conversation_id": instance.conversation.id,
            "sender_id": instance.sender.id,
            "sender_name": sender_name
        }

        try:
            send_fcm_to_users(
                recipient_user_ids,
                "chat",
                body,
                sender=instance.sender,
                title=f"New message from {sender_name}",
                extra_data=extra_data,
                create_user_notifications=False # Chat has its own persistence
            )
        except Exception as e:
            logger.error(f"Failed to send FCM for chat message: {e}")

@receiver(pre_save, sender=AssetRequest)
def asset_request_status_change(sender, instance, **kwargs):
    """
    Notify employee when their asset request status is updated (Approved/Rejected).
    """
    if not instance.pk:
        return
    try:
        prev = AssetRequest.objects.get(pk=instance.pk)
    except AssetRequest.DoesNotExist:
        return
    
    if prev.approval_status != instance.approval_status and instance.approval_status != 'pending':
        if instance.requested_by and instance.requested_by.user and instance.requested_by.user.id:
            default_sender = UserRegister.objects.filter(role='admin').first()
            status = instance.approval_status.capitalize()
            asset_name = instance.related_fixed_asset.name if instance.related_fixed_asset else (instance.related_supply_item.item_name if instance.related_supply_item else "Asset")
            
            body = f"Your request for {asset_name} has been {status}."
            data = {"type": "asset_request", "request_id": instance.id, "status": instance.approval_status}
            
            try:
                send_fcm_to_users(
                    [instance.requested_by.user.id],
                    "asset",
                    body,
                    sender=default_sender,
                    title=f"Asset Request {status}",
                    extra_data=data
                )
                
                # Create UserNotification
                UserNotification.objects.create(
                    recipient=instance.requested_by,
                    title=f"Asset Request {status}",
                    message=body,
                    related_object_id=instance.id,
                    sender=default_sender
                )
            except Exception as e:
                logger.error(f"Failed to send FCM for asset request status change: {e}")

@receiver(pre_save, sender=SeatBooking)
def seat_booking_status_change(sender, instance, **kwargs):
    """
    Notify employee when their seat booking status is updated.
    """
    if not instance.pk:
        return
    try:
        prev = SeatBooking.objects.get(pk=instance.pk)
    except SeatBooking.DoesNotExist:
        return

    if prev.status != instance.status and instance.status != 'pending':
        if instance.employee and instance.employee.user and instance.employee.user.id:
            default_sender = UserRegister.objects.filter(role='admin').first()
            status = instance.status.capitalize()
            body = f"Your seat booking for {instance.seat.seat_number} has been {status}."
            data = {"type": "seat_booking", "booking_id": instance.id, "status": instance.status}
            
            try:
                send_fcm_to_users(
                    [instance.employee.user.id],
                    "booking",
                    body,
                    sender=default_sender,
                    title=f"Seat Booking {status}",
                    extra_data=data
                )
                UserNotification.objects.create(
                    recipient=instance.employee,
                    title=f"Seat Booking {status}",
                    message=body,
                    related_object_id=instance.id,
                    sender=default_sender
                )
            except Exception as e:
                logger.error(f"Failed to send FCM for seat booking status change: {e}")

@receiver(pre_save, sender=ConferenceRoomBooking)
def room_booking_status_change(sender, instance, **kwargs):
    """
    Notify employee when their conference room booking status is updated.
    """
    if not instance.pk:
        return
    try:
        prev = ConferenceRoomBooking.objects.get(pk=instance.pk)
    except ConferenceRoomBooking.DoesNotExist:
        return

    if prev.status != instance.status and instance.status != 'pending':
        if instance.employee and instance.employee.user and instance.employee.user.id:
            default_sender = UserRegister.objects.filter(role='admin').first()
            status = instance.status.capitalize()
            body = f"Your booking for {instance.room.name} has been {status}."
            data = {"type": "room_booking", "booking_id": instance.id, "status": instance.status}
            
            try:
                send_fcm_to_users(
                    [instance.employee.user.id],
                    "booking",
                    body,
                    sender=default_sender,
                    title=f"Room Booking {status}",
                    extra_data=data
                )
                UserNotification.objects.create(
                    recipient=instance.employee,
                    title=f"Room Booking {status}",
                    message=body,
                    related_object_id=instance.id,
                    sender=default_sender
                )
            except Exception as e:
                logger.error(f"Failed to send FCM for room booking status change: {e}")
