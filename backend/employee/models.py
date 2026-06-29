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
    
    kra = models.ForeignKey(
        'EmployeeKRA',
        null=True, blank=True,
        related_name='tasks',
        on_delete=models.SET_NULL
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

    def compute_status_from_subtasks(self):
        subtasks = self.subtasks.all()
        if not subtasks.exists():
            return self.compute_status_from_assignments()

        subtask_statuses = [sub.status for sub in subtasks]
        if all(s == 'done' for s in subtask_statuses):
            return 'done'
        if any(s == 'inprogress' for s in subtask_statuses):
            return 'inprogress'
        if any(s == 'inreview' for s in subtask_statuses):
            return 'inreview'
        return 'todo'

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


class Announcement(models.Model):
    """
    Lightweight, company-scoped announcements shown on employee dashboard.
    """

    company = models.ForeignKey(
        "app.Company",
        on_delete=models.CASCADE,
        related_name="announcements",
    )
    title = models.CharField(max_length=120)
    body = models.TextField(blank=True)
    image = models.ImageField(
        upload_to="announcements/",
        blank=True,
        null=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements_created",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.company_id}: {self.title}"


class Project(models.Model):
    company = models.ForeignKey(
        "app.Company",
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("company", "name")]

    def __str__(self):
        return f"{self.company_id}: {self.name}"


class TimeEntry(models.Model):
    employee = models.ForeignKey(
        "app.Employee",
        on_delete=models.CASCADE,
        related_name="time_entries",
    )
    date = models.DateField()
    project = models.ForeignKey(
        Project,
        on_delete=models.PROTECT,
        related_name="time_entries",
    )
    job_name = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    minutes = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.employee_id} {self.date} {self.minutes}m"


class KRAMaster(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    department = models.ForeignKey('app.Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='kra_masters')
    departments = models.ManyToManyField('app.Department', blank=True, related_name='kra_masters_m2m')
    designation = models.ForeignKey('app.Designation', on_delete=models.SET_NULL, null=True, blank=True, related_name='kra_masters')
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class KPIMaster(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    kra_master = models.ForeignKey(KRAMaster, on_delete=models.SET_NULL, null=True, blank=True, related_name='kpis')
    departments = models.ManyToManyField('app.Department', blank=True, related_name='kpi_masters')
    measurement_unit = models.CharField(max_length=50, blank=True)  # %, count, hours, score, currency
    target_value = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class EmployeeKRA(models.Model):
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='employee_kras')
    kra_master = models.ForeignKey(KRAMaster, on_delete=models.CASCADE, related_name='employee_linkages')
    reviewer = models.ForeignKey('app.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='kra_reviews')
    weightage = models.IntegerField(default=0)
    target_description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee} - {self.kra_master.title} ({self.weightage}%)"


class SkillMaster(models.Model):
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.name


class EmployeeSkill(models.Model):
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='employee_skills')
    skill = models.ForeignKey(SkillMaster, on_delete=models.CASCADE, related_name='employee_linkages')
    proficiency_level = models.CharField(max_length=20, default='beginner')
    upgrade_requested = models.BooleanField(default=False)
    requested_level = models.CharField(max_length=20, null=True, blank=True)
    approval_status = models.CharField(max_length=20, default='pending')

    def __str__(self):
        return f"{self.employee} - {self.skill.name} ({self.proficiency_level})"


class AppraisalCycle(models.Model):
    name = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    self_appraisal_deadline = models.DateTimeField()
    manager_eval_deadline = models.DateTimeField()
    status = models.CharField(max_length=20, default='draft')

    def __str__(self):
        return self.name


class AppraisalQuestion(models.Model):
    cycle = models.ForeignKey(AppraisalCycle, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, default='scale')
    role_type = models.CharField(max_length=20, default='self')

    def __str__(self):
        return f"{self.cycle.name} - {self.role_type} - {self.question_text[:30]}"


class AppraisalEvaluation(models.Model):
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='appraisal_evaluations')
    manager = models.ForeignKey('app.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_appraisal_evaluations')
    cycle = models.ForeignKey(AppraisalCycle, on_delete=models.CASCADE, related_name='evaluations')
    self_overall_rating = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    manager_overall_rating = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    hr_overall_rating = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=30, default='draft')

    def __str__(self):
        return f"{self.employee} - {self.cycle.name} ({self.status})"


class AppraisalAnswer(models.Model):
    evaluation = models.ForeignKey(AppraisalEvaluation, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(AppraisalQuestion, on_delete=models.CASCADE, related_name='answers')
    submitted_by = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='submitted_appraisal_answers')
    rating_score = models.IntegerField(null=True, blank=True)
    comment = models.TextField(blank=True)

    def __str__(self):
        return f"{self.evaluation.employee} - Answer by {self.submitted_by}"


class AppraisalExtension(models.Model):
    cycle = models.ForeignKey(AppraisalCycle, on_delete=models.CASCADE, related_name='extensions')
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='appraisal_extensions')
    requester = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='requested_appraisal_extensions')
    original_deadline = models.DateTimeField()
    extended_deadline = models.DateTimeField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='pending')

    def __str__(self):
        return f"{self.employee} - Extension to {self.extended_deadline}"


class SalaryHikeConfig(models.Model):
    cycle = models.ForeignKey(AppraisalCycle, on_delete=models.CASCADE, related_name='hike_configs')
    min_rating = models.DecimalField(max_digits=5, decimal_places=2)
    max_rating = models.DecimalField(max_digits=5, decimal_places=2)
    recommended_hike_percentage = models.DecimalField(max_digits=5, decimal_places=2)

    def __str__(self):
        return f"{self.cycle.name}: Rating {self.min_rating}-{self.max_rating} -> {self.recommended_hike_percentage}%"


class ContinuousFeedback(models.Model):
    CATEGORY = [
        ('peer_recognition', 'Peer Recognition'),
        ('appreciation', 'Appreciation'),
        ('manager_coaching', 'Manager Coaching'),
        ('constructive', 'Constructive'),
        ('goal_progress', 'Goal Progress'),
    ]
    VISIBILITY = [
        ('private', 'Private'),
        ('team', 'Team'),
        ('public', 'Public'),
    ]
    sender = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='sent_feedback')
    receiver = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='received_feedback')
    feedback_text = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY, default='peer_recognition')
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5, optional
    visibility = models.CharField(max_length=20, choices=VISIBILITY, default='private')
    acknowledged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender} -> {self.receiver} ({self.category})"


class MultiRaterMapping(models.Model):
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='multirater_profiles')
    reviewer = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='multirater_assigned_reviews')
    cycle = models.ForeignKey(AppraisalCycle, on_delete=models.CASCADE, related_name='multirater_mappings')
    status = models.CharField(max_length=30, default='nominated')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee} reviewed by {self.reviewer} for {self.cycle.name}"
