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


class KRAEvaluation(models.Model):
    employee_kra = models.OneToOneField(EmployeeKRA, on_delete=models.CASCADE, related_name='evaluation')
    score = models.DecimalField(max_digits=4, decimal_places=2)  # 0.00 – 5.00
    remarks = models.TextField(blank=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee_kra} → {self.score}/5"


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
    peer_deadline = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='draft')

    def __str__(self):
        return self.name


class AppraisalQuestion(models.Model):
    cycle = models.ForeignKey(AppraisalCycle, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, default='scale')
    role_type = models.CharField(max_length=20, default='self')
    max_score = models.PositiveSmallIntegerField(default=5)

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


#--------------------------- LEARNING MANAGEMENT SYSTEM (LMS) ---------------------------------

class CourseCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Course categories'

    def __str__(self):
        return self.name


class Course(models.Model):
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.ForeignKey(CourseCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='courses')
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    duration_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    language = models.CharField(max_length=50, default='English')
    thumbnail = models.ImageField(upload_to='lms/course_thumbnails', null=True, blank=True)
    is_compliance = models.BooleanField(default=False)
    compliance_due_days = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey('app.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='courses_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class CourseContent(models.Model):
    CONTENT_TYPE = [
        ('video', 'Video'),
        ('pdf', 'PDF'),
        ('ppt', 'PowerPoint'),
        ('audio', 'Audio'),
        ('scorm', 'SCORM Package'),
        ('link', 'External Link'),
    ]
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='contents')
    title = models.CharField(max_length=255)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE, default='video')
    file = models.FileField(upload_to='lms/course_content', null=True, blank=True)
    external_url = models.URLField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(default=0)
    sequence = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sequence', 'id']

    def __str__(self):
        return f'{self.course.title} - {self.title}'


class LearningPath(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey('app.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='learning_paths_created')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class LearningPathCourse(models.Model):
    learning_path = models.ForeignKey(LearningPath, on_delete=models.CASCADE, related_name='path_courses')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='learning_path_links')
    sequence = models.PositiveIntegerField(default=0)
    is_mandatory = models.BooleanField(default=True)

    class Meta:
        ordering = ['sequence', 'id']
        unique_together = ('learning_path', 'course')

    def __str__(self):
        return f'{self.learning_path.title} -> {self.course.title}'


class LearningPathAssignment(models.Model):
    learning_path = models.ForeignKey(LearningPath, on_delete=models.CASCADE, related_name='assignments')
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='learning_path_assignments')
    assigned_by = models.ForeignKey('app.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='learning_paths_assigned')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('learning_path', 'employee')

    def __str__(self):
        return f'{self.employee} - {self.learning_path.title}'


class Enrollment(models.Model):
    ENROLLED_BY = [
        ('self', 'Self'),
        ('manager', 'Manager'),
        ('admin', 'Admin'),
        ('bulk', 'Bulk Import'),
    ]
    STATUS_CHOICES = [
        ('waitlisted', 'Waitlisted'),
        ('enrolled', 'Enrolled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_by = models.CharField(max_length=20, choices=ENROLLED_BY, default='self')
    enrolled_by_employee = models.ForeignKey('app.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='enrollments_created')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enrolled')
    progress_percentage = models.PositiveSmallIntegerField(default=0)
    is_favorite = models.BooleanField(default=False)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-enrolled_at']
        unique_together = ('employee', 'course')

    def __str__(self):
        return f'{self.employee} - {self.course.title} ({self.status})'


class LessonProgress(models.Model):
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='lesson_progress')
    content = models.ForeignKey(CourseContent, on_delete=models.CASCADE, related_name='progress_entries')
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('enrollment', 'content')

    def __str__(self):
        return f'{self.enrollment} - {self.content.title}'


class Assessment(models.Model):
    ASSESSMENT_TYPE = [
        ('quiz', 'Quiz'),
        ('mcq', 'MCQ Test'),
        ('coding', 'Coding Assessment'),
        ('practical', 'Practical Assignment'),
        ('viva', 'Viva'),
        ('survey', 'Survey'),
    ]
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assessments')
    title = models.CharField(max_length=255)
    assessment_type = models.CharField(max_length=20, choices=ASSESSMENT_TYPE, default='quiz')
    pass_marks = models.PositiveIntegerField(default=0)
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    max_attempts = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.course.title} - {self.title}'


class AssessmentQuestion(models.Model):
    QUESTION_TYPE = [
        ('mcq', 'Multiple Choice'),
        ('true_false', 'True / False'),
        ('short_answer', 'Short Answer'),
        ('coding', 'Coding'),
    ]
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE, default='mcq')
    options = models.JSONField(default=list, blank=True)
    correct_answer = models.TextField(blank=True)
    marks = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f'{self.assessment.title} - {self.question_text[:40]}'


class AssessmentAttempt(models.Model):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='attempts')
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='assessment_attempts')
    enrollment = models.ForeignKey(Enrollment, on_delete=models.SET_NULL, null=True, blank=True, related_name='assessment_attempts')
    attempt_number = models.PositiveSmallIntegerField(default=1)
    score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.employee} - {self.assessment.title} (#{self.attempt_number})'


class AssessmentAnswer(models.Model):
    attempt = models.ForeignKey(AssessmentAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(AssessmentQuestion, on_delete=models.CASCADE, related_name='answers')
    answer_text = models.TextField(blank=True)
    is_correct = models.BooleanField(default=False)
    marks_awarded = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    def __str__(self):
        return f'{self.attempt} - Q{self.question_id}'


class Assignment(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField()
    max_marks = models.PositiveIntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.course.title} - {self.title}'


class AssignmentSubmission(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('late', 'Late'),
        ('graded', 'Graded'),
        ('resubmit_requested', 'Resubmit Requested'),
    ]
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='assignment_submissions')
    submitted_file = models.FileField(upload_to='lms/assignment_submissions', null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='submitted')
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    trainer_comments = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    graded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.employee} - {self.assignment.title}'


class TrainingSession(models.Model):
    SESSION_TYPE = [
        ('classroom', 'Classroom'),
        ('online', 'Online'),
        ('webinar', 'Webinar'),
    ]
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='sessions')
    title = models.CharField(max_length=255)
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE, default='classroom')
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    location = models.CharField(max_length=255, blank=True)
    meeting_link = models.URLField(blank=True)
    max_seats = models.PositiveIntegerField(null=True, blank=True)
    created_by = models.ForeignKey('app.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='sessions_created')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start_datetime']

    def __str__(self):
        return f'{self.title} ({self.start_datetime:%Y-%m-%d})'


class SessionAttendance(models.Model):
    STATUS_CHOICES = [
        ('registered', 'Registered'),
        ('attended', 'Attended'),
        ('absent', 'Absent'),
    ]
    session = models.ForeignKey(TrainingSession, on_delete=models.CASCADE, related_name='attendance')
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='session_attendance')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='registered')
    feedback_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    feedback_text = models.TextField(blank=True)

    class Meta:
        unique_together = ('session', 'employee')

    def __str__(self):
        return f'{self.employee} - {self.session.title}'


class Certificate(models.Model):
    SOURCE_CHOICES = [
        ('internal', 'Internal (Course Completion)'),
        ('external', 'External Upload'),
    ]
    STATUS_CHOICES = [
        ('valid', 'Valid'),
        ('expired', 'Expired'),
        ('revoked', 'Revoked'),
    ]
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='certificates')
    certificate_name = models.CharField(max_length=255)
    issuing_authority = models.CharField(max_length=255, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='internal')
    certificate_number = models.CharField(max_length=50, unique=True)
    certificate_file = models.FileField(upload_to='lms/certificates', null=True, blank=True)
    issue_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='valid')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-issue_date']

    def __str__(self):
        return f'{self.employee} - {self.certificate_name}'


class CertificateSignature(models.Model):
    """
    The authorized-signatory digital signature used on auto-generated
    certificates. One per company — enforced via OneToOneField so a company
    can only ever have a single active signature at a time (edit/delete it
    to replace it, rather than adding another).
    """
    company = models.OneToOneField('app.Company', on_delete=models.CASCADE, related_name='certificate_signature')
    signature_image = models.ImageField(upload_to='lms/certificate_signatures')
    signatory_name = models.CharField(max_length=255, blank=True)
    signatory_title = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey('app.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='certificate_signatures_uploaded')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.company.name} - Authorized Signature'


class ComplianceAssignment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
    ]
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='compliance_assignments')
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='compliance_assignments')
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    completed_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('course', 'employee')

    def __str__(self):
        return f'{self.employee} - {self.course.title} ({self.status})'


class TrainingRequest(models.Model):
    APPROVAL_STATUS = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('not_required', 'Not Required'),
    ]
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='training_requests')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='training_requests')
    custom_course_title = models.CharField(max_length=255, blank=True)
    reason = models.TextField(blank=True)
    manager = models.ForeignKey('app.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='training_requests_to_approve')
    manager_status = models.CharField(max_length=20, choices=APPROVAL_STATUS, default='pending')
    manager_remarks = models.TextField(blank=True)
    admin_status = models.CharField(max_length=20, choices=APPROVAL_STATUS, default='pending')
    admin_remarks = models.TextField(blank=True)
    budget_required = models.BooleanField(default=False)
    budget_status = models.CharField(max_length=20, choices=APPROVAL_STATUS, default='not_required')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.employee} - {self.course_title_display}'

    @property
    def course_title_display(self):
        return self.course.title if self.course else self.custom_course_title


class CourseReview(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='course_reviews')
    rating = models.PositiveSmallIntegerField(default=5)
    review_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('course', 'employee')

    def __str__(self):
        return f'{self.employee} - {self.course.title} ({self.rating}/5)'


class CourseWishlist(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='wishlisted_by')
    employee = models.ForeignKey('app.Employee', on_delete=models.CASCADE, related_name='course_wishlist')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('course', 'employee')

    def __str__(self):
        return f'{self.employee} - {self.course.title}'
