from .service import send_fcm_to_users
from django.db.models.signals import post_save, pre_save, post_migrate
from django.dispatch import receiver
from employee.models import TaskAssignment, Task
from app.models import UserRegister, Employee, EmpLeave, CalendarEvent, LearningCorner, Notification, ChatMessage, AssetRequest, SeatBooking, ConferenceRoomBooking, LoanApplication, WFHRequest, ReimbursementRequest, FinalizedSalary
from notifications.models import UserNotification
import logging

logger = logging.getLogger(__name__)


def _company_user_ids(company):
    """
    Get all user IDs associated with a specific company.
    Includes both those with an Employee profile and those linked directly via UserRegister (like admins).
    """
    if not company:
        return []
    return list(
        UserRegister.objects.filter(company=company).values_list("id", flat=True)
    )
# --- TASKS ---

@receiver(pre_save, sender=TaskAssignment)
def task_assignment_pre_save(sender, instance, **kwargs):
    """
    Capture the old status before saving to detect changes in post_save.
    """
    if instance.pk:
        try:
            instance._old_status = TaskAssignment.objects.get(pk=instance.pk).status
        except TaskAssignment.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None

@receiver(post_save, sender=TaskAssignment)
def task_assignment_notification_handler(sender, instance, created, **kwargs):
    """
    Handles all task-related notifications:
    1. New Assignment: Notify the employee.
    2. Status Change (by anyone): Notify the relevant parties.
    """
    task = instance.task
    employee = instance.employee
    manager = task.created_by
    
    # Common variables
    manager_name = manager.full_name if hasattr(manager, 'full_name') else (manager.username if hasattr(manager, 'username') else "Manager")
    employee_name = employee.full_name if hasattr(employee, 'full_name') else (employee.username if hasattr(employee, 'username') else "Employee")
    priority_label = dict(Task.PRIORITY).get(task.priority, task.priority).upper()
    deadline_str = task.deadline.strftime('%Y-%m-%d') if task.deadline else "No Deadline"
    
    default_sender = UserRegister.objects.filter(role='admin').first()
    
    # 1. NEW ASSIGNMENT
    if created:
        title = f"🚀 New Task: {task.title}"
        message = f"You have been assigned a {priority_label} priority task by {manager_name}. Deadline: {deadline_str}."
        
        data = {
            "type": "task_assignment",
            "task_id": task.id,
            "assignment_id": instance.id,
            "priority": task.priority
        }
        
        if employee.user:
            try:
                send_fcm_to_users([employee.user.id], "task", message, sender=default_sender, title=title, extra_data=data)
                UserNotification.objects.create(
                    recipient=employee,
                    title=title,
                    message=message,
                    related_object_id=task.id,
                    sender=default_sender
                )
            except Exception as e:
                logger.error(f"Failed to send/create notification for new task assignment: {e}")

    # 2. STATUS CHANGE
    elif hasattr(instance, '_old_status') and instance._old_status != instance.status:
        status_label = dict(Task.STATUS).get(instance.status, instance.status).title()
        
        # If employee updated the status -> Notify Manager
        # If manager/other updated the status -> Notify Employee
        
        # We'll assume for now: 
        # - Notify Employee if status changed (general update)
        # - Notify Manager specifically if status is 'done' or 'inreview'
        
        title = f"📝 Task Status Updated: {task.title}"
        body = f"The task '{task.title}' status is now: {status_label}."
        
        # Notify Employee
        if employee.user:
            try:
                send_fcm_to_users([employee.user.id], "task", body, sender=default_sender, title=title, extra_data={"type": "task_status", "status": instance.status})
                UserNotification.objects.create(recipient=employee, title=title, message=body, related_object_id=task.id, sender=default_sender)
            except Exception as e:
                logger.error(f"Failed to notify employee of status change: {e}")
        
        # Notify Manager/Creator if status is significant (Done/In Review)
        if instance.status in ['done', 'inreview'] and manager and manager.user:
            m_title = f"✅ Task {status_label}: {task.title}"
            m_body = f"{employee_name} has marked the task as {status_label}."
            try:
                send_fcm_to_users([manager.user.id], "task", m_body, sender=default_sender, title=m_title, extra_data={"type": "task_completion", "task_id": task.id})
                UserNotification.objects.create(recipient=manager, title=m_title, message=m_body, related_object_id=task.id, sender=default_sender)
            except Exception as e:
                logger.error(f"Failed to notify manager of task completion: {e}")
       
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
    # Strictly scope to company to avoid accidental global broadcasts
    if created and instance.company:
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
            if instance.related_fixed_asset:
                asset_name = f"{instance.related_fixed_asset.asset_tag} ({instance.related_fixed_asset.model_brand or 'No Brand'})"
            elif instance.related_supply_item:
                asset_name = instance.related_supply_item.item_name
            else:
                asset_name = "Asset"
            
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
@receiver(post_save, sender=LoanApplication)
def loan_application_notify(sender, instance, created, **kwargs):
    """
    Notify relevant parties about loan application updates.
    """
    default_sender = UserRegister.objects.filter(role='admin').first()
    
    if created:
        # 1. Notify Reporting Manager
        try:
            manager = instance.employee.employee_profile.reporting_manager
            if manager and manager.user:
                body = f"{instance.employee.full_name} has applied for a {instance.category.name} of ₹{instance.requested_amount}."
                send_fcm_to_users(
                    [manager.user.id],
                    "loan",
                    body,
                    sender=default_sender,
                    title="New Loan Application",
                    extra_data={"type": "loan_request", "loan_id": instance.id}
                )
                UserNotification.objects.create(
                    recipient=manager,
                    title="New Loan Application",
                    message=body,
                    related_object_id=instance.id,
                    sender=default_sender
                )
        except Exception as e:
            logger.error(f"Failed to notify manager about loan: {e}")

@receiver(pre_save, sender=WFHRequest)
def wfh_request_status_change(sender, instance, **kwargs):
    """
    Notify employee when their WFH request is approved or rejected.
    Notify manager when a new WFH request is created.
    """
    if not instance.pk:
        # New WFH request — notify manager after save (handled in post_save)
        return
    try:
        prev = WFHRequest.objects.get(pk=instance.pk)
    except WFHRequest.DoesNotExist:
        return

    if prev.status != instance.status and instance.status in ['approved', 'rejected']:
        if instance.employee and instance.employee.user and instance.employee.user.id:
            default_sender = UserRegister.objects.filter(role='admin').first()
            status_label = instance.status.capitalize()
            request_type = instance.get_request_type_display() if hasattr(instance, 'get_request_type_display') else instance.request_type.upper()
            date_range = f"{instance.from_date} → {instance.to_date}" if instance.from_date and instance.to_date else ""
            body = f"Your {request_type} request{' for ' + date_range if date_range else ''} has been {status_label}."
            if instance.status == 'rejected' and instance.rejection_reason:
                body += f" Reason: {instance.rejection_reason}"
            data = {"type": "wfh_status", "wfh_id": instance.id, "status": instance.status}
            try:
                send_fcm_to_users(
                    [instance.employee.user.id],
                    "wfh",
                    body,
                    sender=default_sender,
                    title=f"WFH Request {status_label}",
                    extra_data=data
                )
                UserNotification.objects.create(
                    recipient=instance.employee,
                    title=f"WFH Request {status_label}",
                    message=body,
                    related_object_id=instance.id,
                    sender=default_sender
                )
            except Exception as e:
                logger.error(f"Failed to send FCM for WFH status change: {e}")


@receiver(post_save, sender=WFHRequest)
def wfh_request_created_notify_manager(sender, instance, created, **kwargs):
    """
    When a new WFH request is created, notify the reporting manager.
    """
    if not created:
        return
    if instance.reporting_manager and instance.reporting_manager.user:
        default_sender = UserRegister.objects.filter(role='admin').first()
        request_type = instance.get_request_type_display() if hasattr(instance, 'get_request_type_display') else instance.request_type.upper()
        date_range = f"{instance.from_date} → {instance.to_date}" if instance.from_date and instance.to_date else ""
        body = f"{instance.employee.full_name} requested {request_type}{' for ' + date_range if date_range else ''}."
        try:
            send_fcm_to_users(
                [instance.reporting_manager.user.id],
                "wfh",
                body,
                sender=default_sender,
                title="New WFH Request",
                extra_data={"type": "wfh_request", "wfh_id": instance.id}
            )
            UserNotification.objects.create(
                recipient=instance.reporting_manager,
                title="New WFH Request",
                message=body,
                related_object_id=instance.id,
                sender=default_sender
            )
        except Exception as e:
            logger.error(f"Failed to notify manager about new WFH request: {e}")


@receiver(pre_save, sender=ReimbursementRequest)
def reimbursement_status_change(sender, instance, **kwargs):
    """
    Notify employee when their reimbursement is approved or rejected.
    """
    if not instance.pk:
        return
    try:
        prev = ReimbursementRequest.objects.get(pk=instance.pk)
    except ReimbursementRequest.DoesNotExist:
        return

    if prev.status != instance.status and instance.status in ['approved', 'rejected']:
        if instance.employee and instance.employee.user and instance.employee.user.id:
            default_sender = UserRegister.objects.filter(role='admin').first()
            status_label = instance.status.capitalize()
            category_name = instance.category.name if instance.category else (instance.custom_category or 'Reimbursement')
            body = f"Your reimbursement request for {category_name} (₹{instance.amount}) has been {status_label}."
            if instance.status == 'rejected' and instance.rejection_reason:
                body += f" Reason: {instance.rejection_reason}"
            data = {"type": "reimbursement_status", "reimbursement_id": instance.id, "status": instance.status}
            try:
                send_fcm_to_users(
                    [instance.employee.user.id],
                    "reimbursement",
                    body,
                    sender=default_sender,
                    title=f"Reimbursement {status_label}",
                    extra_data=data
                )
                UserNotification.objects.create(
                    recipient=instance.employee,
                    title=f"Reimbursement {status_label}",
                    message=body,
                    related_object_id=instance.id,
                    sender=default_sender
                )
            except Exception as e:
                logger.error(f"Failed to send FCM for reimbursement status change: {e}")


@receiver(post_save, sender=ReimbursementRequest)
def reimbursement_created_notify_manager(sender, instance, created, **kwargs):
    """
    When a new reimbursement request is created, notify the reporting manager.
    """
    if not created:
        return
    if instance.reporting_manager and instance.reporting_manager.user:
        default_sender = UserRegister.objects.filter(role='admin').first()
        category_name = instance.category.name if instance.category else (instance.custom_category or 'expense')
        body = f"{instance.employee.full_name} submitted a reimbursement request for {category_name} (₹{instance.amount})."
        try:
            send_fcm_to_users(
                [instance.reporting_manager.user.id],
                "reimbursement",
                body,
                sender=default_sender,
                title="New Reimbursement Request",
                extra_data={"type": "reimbursement_request", "reimbursement_id": instance.id}
            )
            UserNotification.objects.create(
                recipient=instance.reporting_manager,
                title="New Reimbursement Request",
                message=body,
                related_object_id=instance.id,
                sender=default_sender
            )
        except Exception as e:
            logger.error(f"Failed to notify manager about new reimbursement: {e}")


@receiver(post_save, sender=FinalizedSalary)
def payslip_generated_notify(sender, instance, created, **kwargs):
    """
    Notify employee when a new payslip is generated.
    """
    if not created:
        return
    if instance.employee and instance.employee.user and instance.employee.user.id:
        default_sender = UserRegister.objects.filter(role='admin').first()
        from_month = instance.from_date.strftime('%B %Y') if instance.from_date else 'this period'
        body = f"Your payslip for {from_month} has been generated. Net salary: ₹{instance.net_salary}."
        try:
            send_fcm_to_users(
                [instance.employee.user.id],
                "payslip",
                body,
                sender=default_sender,
                title="New Payslip Available",
                extra_data={"type": "payslip_new", "payslip_id": instance.id}
            )
            UserNotification.objects.create(
                recipient=instance.employee,
                title="New Payslip Available",
                message=body,
                related_object_id=instance.id,
                sender=default_sender
            )
        except Exception as e:
            logger.error(f"Failed to notify employee about new payslip: {e}")


@receiver(pre_save, sender=LoanApplication)
def loan_status_change_notify(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        prev = LoanApplication.objects.get(pk=instance.pk)
    except LoanApplication.DoesNotExist:
        return

    if prev.status != instance.status:
        default_sender = UserRegister.objects.filter(role='admin').first()
        status_label = instance.status.replace('_', ' ').capitalize()
        
        # 1. Notify Employee of any status change
        if instance.employee and instance.employee.id:
            body = f"Your loan application for {instance.category.name} is now {status_label}."
            try:
                send_fcm_to_users(
                    [instance.employee.id],
                    "loan",
                    body,
                    sender=default_sender,
                    title="Loan Status Updated",
                    extra_data={"type": "loan_status", "loan_id": instance.id, "status": instance.status}
                )
                # Create UserNotification for employee
                emp_profile = instance.employee.employee_profile
                if emp_profile:
                    UserNotification.objects.create(
                        recipient=emp_profile,
                        title="Loan Status Updated",
                        message=body,
                        related_object_id=instance.id,
                        sender=default_sender
                    )
            except Exception as e:
                logger.error(f"Failed to notify employee about loan status: {e}")

        # 2. If MANAGER_APPROVED, notify Admins
        if instance.status == 'MANAGER_APPROVED':
            admin_ids = list(UserRegister.objects.filter(role='admin', company=instance.employee.company).values_list('id', flat=True))
            body = f"A loan from {instance.employee.full_name} has been approved by the manager and requires your final review."
            try:
                send_fcm_to_users(
                    admin_ids,
                    "loan",
                    body,
                    sender=default_sender,
                    title="Loan Manager Approved",
                    extra_data={"type": "loan_admin_review", "loan_id": instance.id}
                )
                # Also create UserNotifications for admins if possible (optional but good)
            except Exception as e:
                logger.error(f"Failed to notify admins about manager-approved loan: {e}")
