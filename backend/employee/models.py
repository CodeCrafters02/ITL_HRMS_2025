from django.db import models
from django.conf import settings


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
        if self.subtasks.exists():
            total = self.subtasks.count()
            done = self.done_subtasks_count()
        else:
            total = self.assignments.count()
            done = self.assignments.filter(status='done').count()

        return 0 if total == 0 else int((done / total) * 100)

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
