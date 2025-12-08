from django.db import models
from django.conf import settings
from app.models import Employee

class PersonalCalendar(models.Model):
    name = models.CharField(max_length=100)
    date = models.DateField()
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.created_by.username})"


class Task(models.Model):
   
    PRIORITY = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    STATUS = [
        ('todo', 'To Do'),
        ('inprogress', 'In Progress'),
        ('inreview', 'In Review'),
        ('done', 'Done'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey('app.Employee',on_delete=models.CASCADE,related_name='tasks_created')
    created_at = models.DateTimeField(auto_now_add=True)
    deadline = models.DateField()

    priority = models.CharField(max_length=10, choices=PRIORITY)
    status = models.CharField(max_length=20, choices=STATUS, default='todo')

    parent_task = models.ForeignKey(
        'self',
        null=True, blank=True,
        related_name='subtasks',
        on_delete=models.CASCADE
    )

    def __str__(self):
        return self.title

    def done_subtasks_count(self):
        return self.subtasks.filter(assignments__status='done').count()

    def progress(self):
        # Status weight mapping: todo=0%, inprogress=33%, inreview=66%, done=100%
        status_weights = {
            'todo': 0,
            'inprogress': 33,
            'inreview': 66,
            'done': 100
        }
        
        if self.subtasks.exists():
            # Calculate progress based on subtask assignment statuses
            subtasks = self.subtasks.all()
            if not subtasks:
                return 0
            
            total_progress = 0
            for subtask in subtasks:
                subtask_assignments = subtask.assignments.all()
                if subtask_assignments:
                    # Average progress of all assignments in this subtask
                    subtask_progress = sum(status_weights.get(a.status, 0) for a in subtask_assignments) / len(subtask_assignments)
                    total_progress += subtask_progress
                else:
                    total_progress += 0
            
            return int(total_progress / len(subtasks))
        else:
            # Calculate progress based on assignment statuses
            assignments = self.assignments.all()
            if not assignments:
                return 0
            
            total_progress = sum(status_weights.get(a.status, 0) for a in assignments)
            return int(total_progress / len(assignments))

    def compute_status_from_assignments(self):
        
        statuses = self.assignments.values_list('status', flat=True)
        if not statuses:
            return self.status
        if all(s == 'done' for s in statuses):
            return 'done'
        elif any(s == 'inprogress' for s in statuses):
            return 'inprogress'
        elif all(s == 'todo' for s in statuses):
            return 'todo'
        else:
            return 'inreview'

class TaskAssignment(models.Model):
   
    ROLE = [
        ('owner', 'Owner'),
        ('contributor', 'Contributor'),
    ]

    STATUS = Task.STATUS  # Reuse Task choices

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='task_assignments')
    role = models.CharField(max_length=20, choices=ROLE, default='contributor')
    status = models.CharField(max_length=20, choices=STATUS, default='todo')
    is_seen = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.employee} - {self.task.title} ({self.role})"

class EmployeeReference(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    employee = models.ForeignKey(Employee,
        on_delete=models.CASCADE,
        related_name='references'
    )
    name = models.CharField(max_length=100)
    designation = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=20)
    email = models.EmailField()
    resume = models.FileField(upload_to='employee_references/resume/', blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    admin_comment = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.employee.username})"
