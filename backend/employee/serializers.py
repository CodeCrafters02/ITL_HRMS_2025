from rest_framework import serializers
from django.utils import timezone
import os

from app.models import (
    Notification,
    LearningCorner,
    LearningCornerMedia,
    BreakConfig,
    BreakLog,
    Attendance,
    ShiftPolicy,
    Employee,
    EmpLeave,
    Leave,
    CompanyPolicies,
)
from .models import *

class ReportingManagerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'full_name']  # Assuming `full_name` property exists in your model

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftPolicy
        fields = ['id', 'shift_type', 'checkin', 'checkout', 'grace_period']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'description', 'date']
class EmployeeAttendanceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'company',
            'date', 'check_in', 'check_out',
            'total_work_duration', 'overtime_duration',
            'is_present', 'created_at', 'updated_at'
        ]


class PersonalCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalCalendar
        fields = ['id', 'name', 'date', 'description']  
        read_only_fields = ['id']


class AnnouncementSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "body",
            "image_url",
            "company",
            "company_name",
            "created_at",
        ]
        read_only_fields = ["id", "company", "company_name", "created_at", "image_url"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name"]


class TimeEntrySerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            "id",
            "date",
            "project",
            "project_name",
            "job_name",
            "description",
            "minutes",
            "created_at",
        ]
        read_only_fields = ["id", "project_name", "created_at"]


class TimeEntryCreateSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    project_id = serializers.IntegerField()
    job_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    description = serializers.CharField(required=False, allow_blank=True)
    minutes = serializers.IntegerField(min_value=1, max_value=24 * 60)



class SubTaskCreateSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    status = serializers.CharField(required=False)

    assignedEmployees = serializers.ListField(child=serializers.IntegerField(), required=False)
    taskOwner = serializers.IntegerField(required=False)

    class Meta:
        model = Task
        fields = ['id','title', 'description', 'deadline', 'priority', 'status', 'assignedEmployees', 'taskOwner',  'status']


class TaskAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = TaskAssignment
        fields = ['id', 'task', 'employee', 'role', 'status', 'is_seen', 'employee_name', 'avatar_url']

    def get_avatar_url(self, obj):
        request = self.context.get('request', None)
        if obj.employee and obj.employee.photo:
            if request:
                return request.build_absolute_uri(obj.employee.photo.url)
            return obj.employee.photo.url
        return None
class TaskSerializer(serializers.ModelSerializer):
    subtasks = SubTaskCreateSerializer(many=True, write_only=True, required=False)  # For creation
    assignments = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    created_at = serializers.SerializerMethodField()

    # Read mode nested subtasks
    subtask_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'created_by',
            'created_at', 'deadline', 'priority', 'status',
            'parent_task', 'subtasks', 'subtask_details',
            'assignments', 'progress'
        ]
        read_only_fields = ['created_at']

    def validate(self, attrs):
        assigned_employees = self.initial_data.get('assignedEmployees', []) or []
        task_owner = self.initial_data.get('taskOwner', None)
        subtasks_data = self.initial_data.get('subtasks', []) or []
        parent_deadline = attrs.get('deadline') or getattr(self.instance, 'deadline', None)

        # Enforce assignee/owner only on create, or when these fields are explicitly provided.
        is_create = self.instance is None
        has_assignment_payload = ('assignedEmployees' in self.initial_data) or ('taskOwner' in self.initial_data)
        if is_create or has_assignment_payload:
            if not assigned_employees:
                raise serializers.ValidationError({'assignedEmployees': 'At least one assignee is required.'})
            if task_owner is None:
                raise serializers.ValidationError({'taskOwner': 'Task owner is required.'})
            if str(task_owner) not in [str(emp_id) for emp_id in assigned_employees]:
                raise serializers.ValidationError({'taskOwner': 'Task owner must be one of assigned employees.'})

        for idx, subtask in enumerate(subtasks_data):
            sub_assignees = subtask.get('assignedEmployees', []) or []
            sub_owner = subtask.get('taskOwner')
            sub_deadline = subtask.get('deadline')

            if not subtask.get('title'):
                raise serializers.ValidationError({f'subtasks[{idx}].title': 'Subtask title is required.'})
            if not sub_assignees:
                raise serializers.ValidationError({f'subtasks[{idx}].assignedEmployees': 'At least one assignee is required for subtask.'})
            if sub_owner is None:
                raise serializers.ValidationError({f'subtasks[{idx}].taskOwner': 'Subtask owner is required.'})
            if str(sub_owner) not in [str(emp_id) for emp_id in sub_assignees]:
                raise serializers.ValidationError({f'subtasks[{idx}].taskOwner': 'Subtask owner must be one of subtask assignees.'})
            if parent_deadline and sub_deadline and str(sub_deadline) > str(parent_deadline):
                raise serializers.ValidationError({f'subtasks[{idx}].deadline': 'Subtask deadline cannot be after parent task deadline.'})

        return attrs

    def create(self, validated_data):
        request_user = validated_data.pop('request_user', None)
        assigned_employees = self.initial_data.get('assignedEmployees', [])
        task_owner = self.initial_data.get('taskOwner', None)

        subtasks_data = validated_data.pop('subtasks', [])
        created_by = validated_data['created_by']

        # Create main task
        task = Task.objects.create(**validated_data)

        # Create assignments for main task
        for emp_id in assigned_employees:
            TaskAssignment.objects.create(
                task=task,
                employee_id=emp_id,
                role='owner' if str(emp_id) == str(task_owner) else 'contributor'
            )

        # Create subtasks and their assignments
        for subtask_data in subtasks_data:
            sub_assigned_employees = subtask_data.pop('assignedEmployees', [])
            sub_task_owner = subtask_data.pop('taskOwner', None)

            subtask = Task.objects.create(
                parent_task=task,
                created_by=created_by,
                **subtask_data
            )

            for emp_id in sub_assigned_employees:
                TaskAssignment.objects.create(
                    task=subtask,
                    employee_id=emp_id,
                    role='owner' if str(emp_id) == str(sub_task_owner) else 'contributor'
                )

            subtask.status = subtask.compute_status_from_assignments()
            subtask.save(update_fields=['status'])

        task.status = task.compute_status_from_subtasks()
        task.save(update_fields=['status'])

        return task


    def get_subtask_details(self, obj):
        return TaskSerializer(obj.subtasks.all(), many=True).data

    def get_assignments(self, obj):
        return TaskAssignmentSerializer(obj.assignments.all(), many=True,context=self.context).data

    def get_progress(self, obj):
        return obj.progress()
    
    def get_created_at(self, obj):
        # Format: YYYY-MM-DD HH:MM
        return timezone.localtime(obj.created_at).strftime("%Y-%m-%d %I:%M %p")

class MyTaskSerializer(serializers.ModelSerializer):
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    created_at = serializers.SerializerMethodField()
    subtask_details = serializers.SerializerMethodField(read_only=True)
    contributors = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'contributors',
            'created_by', 'created_at', 'deadline', 'priority', 'status',
            'subtask_details', 'assignments', 'progress'
        ]
        read_only_fields = ['created_at', 'status']

    def get_contributors(self, obj):
        """
        Return a list of employee names assigned to this task (excluding the owner if needed).
        """
        contributors_qs = obj.assignments.filter(role='contributor').select_related('employee')
        return [assign.employee.full_name for assign in contributors_qs]

    def get_subtask_details(self, obj):
        """
        Return only the subtasks assigned to the logged-in employee.
        Uses Prefetch result from the view if available.
        """
        if hasattr(obj, 'employee_subtasks'):
            subtasks_qs = obj.employee_subtasks
        else:
            request = self.context.get('request')
            emp = request.user.employee_profile
            subtasks_qs = obj.subtasks.filter(assignments__employee=emp).distinct()

        return [
            {
                'id': subtask.id,
                'title': subtask.title,
                'description': subtask.description,
                'deadline': subtask.deadline,
                'priority': subtask.priority,
                'status': subtask.status,
                'assignments': TaskAssignmentSerializer(subtask.assignments.all(), many=True, context=self.context).data,
                'progress': subtask.progress()
            }
            for subtask in subtasks_qs
        ]

    def get_progress(self, obj):
        return obj.progress()

    def get_created_at(self, obj):
        return timezone.localtime(obj.created_at).strftime("%Y-%m-%d %I:%M %p")

# serializers.py
class TaskAssignmentStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAssignment
        fields = ['status']  # Only allow updating status


class EmpLeaveSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    reporting_manager_name = serializers.SerializerMethodField()
    leave_type_name = serializers.SerializerMethodField()

    class Meta:
        model = EmpLeave
        fields = [
            'id',
            'company',
            'employee_name',
            'employee_id',
            'reporting_manager_name',
            'leave_type',
            'leave_type_name',
            'leave_duration',
            'status',
            'reason',
            'rejection_reason',
            'from_date',
            'to_date',
            'created_at',
        ]
        read_only_fields = ['company', 'employee_name', 'employee_id', 'reporting_manager_name','leave_type_name', 'status', 'created_at']

    def validate(self, attrs):
        from_date = attrs.get('from_date')
        to_date = attrs.get('to_date')
        leave_duration = attrs.get('leave_duration', 'full_day')
        if isinstance(leave_duration, str) and leave_duration not in ('half_day', 'full_day'):
            raise serializers.ValidationError({'leave_duration': 'Invalid leave duration.'})
        if leave_duration == 'half_day':
            if not from_date or not to_date or from_date != to_date:
                raise serializers.ValidationError(
                    {'leave_duration': 'Half day leave requires the same from and to date.'}
                )

        today = timezone.localdate()
        if from_date is not None and from_date < today:
            raise serializers.ValidationError({'from_date': 'Leave cannot start on a past date.'})
        if to_date is not None and to_date < today:
            raise serializers.ValidationError({'to_date': 'Leave cannot end on a past date.'})

        return attrs

    def get_employee_name(self, obj):
        if obj.employee:
            return f"{obj.employee.first_name} {obj.employee.last_name}".strip()
        return ""

    def get_reporting_manager_name(self, obj):
        if obj.reporting_manager:
            return f"{obj.reporting_manager.first_name} {obj.reporting_manager.last_name}".strip()
        return ""
    
    def get_leave_type_name(self, obj):
        if obj.leave_type:
            return obj.leave_type.leave_name
        return ""

class LeaveSerializer(serializers.ModelSerializer):
    used_count = serializers.SerializerMethodField()
    remaining_count = serializers.SerializerMethodField()

    class Meta:
        model = Leave
        fields = ['id', 'leave_name', 'count', 'is_paid', 'used_count', 'remaining_count']

    def get_used_count(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'employee_profile'):
            employee = request.user.employee_profile

            # Get all approved leaves of this type for the employee
            leaves = EmpLeave.objects.filter(
                employee=employee,
                leave_type=obj,
                status='Approved'
            )

            total_days = 0.0
            for leave in leaves:
                if leave.from_date and leave.to_date:
                    span = (leave.to_date - leave.from_date).days + 1
                    if getattr(leave, 'leave_duration', None) == 'half_day' and leave.from_date == leave.to_date:
                        total_days += 0.5
                    else:
                        total_days += float(max(span, 0))

            return total_days

        return 0

    def get_remaining_count(self, obj):
        used = self.get_used_count(obj)
        return max(obj.count - used, 0)
    
    
class EmpLearningCornerSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    document = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()

    class Meta:
        model = LearningCorner
        fields = ['id', 'title', 'description', 'image', 'video', 'document', 'links', 'media']

    def _media_payload(self, obj):
        cached = getattr(self, '_lc_media_cache', None)
        if cached and cached[0] == obj.pk:
            return cached[1]
        request = self.context.get('request')
        if not request:
            self._lc_media_cache = (obj.pk, [])
            return []
        out = []
        seen_urls = set()
        for m in obj.media_items.all().order_by('sort_order', 'id'):
            if not m.file:
                continue
            try:
                url = request.build_absolute_uri(m.file.url)
            except ValueError:
                continue
            seen_urls.add(url)
            out.append({
                'id': m.id,
                'url': url,
                'media_type': m.media_type,
                'filename': os.path.basename(m.file.name) if m.file.name else '',
            })
        for field_name, mtype in (
            ('image', LearningCornerMedia.MEDIA_IMAGE),
            ('video', LearningCornerMedia.MEDIA_VIDEO),
            ('document', LearningCornerMedia.MEDIA_DOCUMENT),
        ):
            f = getattr(obj, field_name, None)
            if not f:
                continue
            try:
                url = request.build_absolute_uri(f.url)
            except ValueError:
                continue
            if url in seen_urls:
                continue
            seen_urls.add(url)
            out.append({
                'id': None,
                'url': url,
                'media_type': mtype,
                'filename': os.path.basename(f.name) if getattr(f, 'name', None) else '',
            })
        self._lc_media_cache = (obj.pk, out)
        return out

    def get_media(self, obj):
        return self._media_payload(obj)

    def get_image(self, obj):
        for item in self._media_payload(obj):
            if item['media_type'] == LearningCornerMedia.MEDIA_IMAGE:
                return item['url']
        return None

    def get_video(self, obj):
        for item in self._media_payload(obj):
            if item['media_type'] == LearningCornerMedia.MEDIA_VIDEO:
                return item['url']
        return None

    def get_document(self, obj):
        for item in self._media_payload(obj):
            if item['media_type'] == LearningCornerMedia.MEDIA_DOCUMENT:
                return item['url']
        return None



class EmployeeDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_name = serializers.CharField(source='designation.name', read_only=True)
    shift_assigned = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = '__all__'
        # Add department_name and designation_name to the output
        extra_fields = ['department_name', 'designation_name']

    def get_shift_assigned(self, obj):
        """Return shift data with id and shift_type"""
        if obj.shift_assigned:
            return {
                'id': obj.shift_assigned.id,
                'shift_type': obj.shift_assigned.shift_type
            }
        return None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Add department_name and designation_name to the output
        rep['department_name'] = instance.department.department_name if instance.department else None
        rep['designation_name'] = instance.designation.designation_name if instance.designation else None
        return rep


class EmployeeUpdateSerializer(serializers.ModelSerializer):
       class Meta:
        model = Employee
        fields = [
            'first_name', 'middle_name', 'last_name',
            'mobile', 'temporary_address', 'permanent_address',
            'photo', 'aadhar_card', 'pan_card','aadhar_no','pan_no',
            'date_of_birth','employee_id', 'status']        
        
        
class EmployeeBreakConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BreakConfig
        fields = ['id', 'break_choice', 'duration_minutes', 'max_short_break_daily_minutes', 'enabled']

class EmployeeBreakLogSerializer(serializers.ModelSerializer):
    break_config = EmployeeBreakConfigSerializer(read_only=True)

    class Meta:
        model = BreakLog
        fields = ['id', 'break_config', 'start', 'end', 'duration_minutes']
        
        
class PolicyConfigurationSerializer(serializers.ModelSerializer):
    document = serializers.SerializerMethodField()

    class Meta:
        model = CompanyPolicies
        fields = ['id', 'name', 'document']

    def get_document(self, obj):
        request = self.context.get('request')
        if obj.document:
            return request.build_absolute_uri(obj.document.url)
        return None


class EmployeeReferenceSerializer(serializers.ModelSerializer):
    # Add employee details directly
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    employee_designation = serializers.CharField(source='employee.designation.designation_name', read_only=True)
    employee_department = serializers.CharField(source='employee.department.department_name', read_only=True)

    class Meta:
        model = EmployeeReference
        fields = [
            'id',
            'employee',  # still includes ID
            'employee_name',
            'employee_id',
            'employee_email',
            'employee_designation',
            'employee_department',
            'name',
            'designation',
            'contact_number',
            'email',
            'resume',
            'submitted_at',
            'status',
            'admin_comment',
            'updated_at'
        ]
        # Employee is assigned in the view from request.user.
        read_only_fields = [
            'employee',
            'submitted_at',
            'updated_at',
            'employee_name',
            'employee_id',
            'employee_email',
            'employee_designation',
            'employee_department',
        ]


class MultiRaterMappingSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    reviewer_designation = serializers.SerializerMethodField()
    reviewer_initials = serializers.SerializerMethodField()
    reviewer_avatar_bg = serializers.SerializerMethodField()
    
    class Meta:
        model = MultiRaterMapping
        fields = [
            'id', 'employee', 'reviewer', 'cycle', 'status', 'created_at',
            'reviewer_name', 'reviewer_designation', 'reviewer_initials', 'reviewer_avatar_bg'
        ]
        extra_kwargs = {'cycle': {'required': False}}

    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return f"{obj.reviewer.first_name} {obj.reviewer.last_name}".strip()
        return ""

    def get_reviewer_designation(self, obj):
        return obj.reviewer.designation.designation_name if obj.reviewer and obj.reviewer.designation else ""

    def get_reviewer_initials(self, obj):
        if obj.reviewer:
            fn = obj.reviewer.first_name or ""
            ln = obj.reviewer.last_name or ""
            return (fn[:1] + ln[:1]).upper()
        return ""

    def get_reviewer_avatar_bg(self, obj):
        colors = ['bg-emerald-500', 'bg-indigo-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500']
        if obj.reviewer:
            return colors[obj.reviewer.id % len(colors)]
        return 'bg-gray-500'

    def validate(self, attrs):
        employee = attrs.get('employee')
        reviewer = attrs.get('reviewer')
        if employee and reviewer:
            if employee.id == reviewer.id:
                raise serializers.ValidationError("An employee cannot review themselves.")
            if employee.department_id != reviewer.department_id:
                raise serializers.ValidationError("Reviewer must belong to the same department as the employee.")
        return attrs


class KRAMasterSerializer(serializers.ModelSerializer):
    department_names = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = KRAMaster
        fields = ['id', 'title', 'description', 'departments', 'department_names', 'designation', 'status']

    def get_department_names(self, obj):
        return [d.department_name for d in obj.departments.all()]


class KPIMasterSerializer(serializers.ModelSerializer):
    department_names = serializers.SerializerMethodField(read_only=True)
    kra_title = serializers.CharField(source='kra_master.title', read_only=True)

    class Meta:
        model = KPIMaster
        fields = ['id', 'name', 'description', 'kra_master', 'kra_title', 'departments',
                  'department_names', 'measurement_unit', 'target_value', 'status', 'created_at']

    def get_department_names(self, obj):
        return [d.department_name for d in obj.departments.all()]


class ContinuousFeedbackSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField(read_only=True)
    receiver_name = serializers.SerializerMethodField(read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = ContinuousFeedback
        fields = ['id', 'sender', 'receiver', 'sender_name', 'receiver_name', 'feedback_text',
                  'category', 'category_display', 'rating', 'visibility', 'acknowledged',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
        extra_kwargs = {'sender': {'required': False, 'allow_null': True}}

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() if obj.sender else "System"

    def get_receiver_name(self, obj):
        return f"{obj.receiver.first_name} {obj.receiver.last_name}".strip() if obj.receiver else None


class EmployeeKRASerializer(serializers.ModelSerializer):
    kra_title = serializers.CharField(source='kra_master.title', read_only=True)
    kra_description = serializers.CharField(source='kra_master.description', read_only=True)
    reviewer_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EmployeeKRA
        fields = ['id', 'employee', 'kra_master', 'kra_title', 'kra_description', 'reviewer', 'reviewer_name', 'weightage', 'target_description', 'created_at']

    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return f"{obj.reviewer.first_name} {obj.reviewer.last_name}".strip()
        return None

    def validate(self, attrs):
        employee = attrs.get('employee')
        weightage = attrs.get('weightage', 0)
        kra_master = attrs.get('kra_master')
        
        # If updating, exclude self from weightage sum
        instance_id = self.instance.id if self.instance else None
        
        existing_kras = EmployeeKRA.objects.filter(employee=employee)
        if instance_id:
            existing_kras = existing_kras.exclude(id=instance_id)
            
        total_weight = sum([k.weightage for k in existing_kras]) + weightage
        if total_weight > 100:
            raise serializers.ValidationError(f"Total weightage cannot exceed 100%. Current total with this assignment would be {total_weight}%.")
            
        return attrs


class AppraisalExtensionSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_initials = serializers.SerializerMethodField()
    employee_designation = serializers.CharField(source='employee.designation.designation_name', read_only=True, default='')
    employee_department = serializers.CharField(source='employee.department.department_name', read_only=True, default='')
    requester_name = serializers.SerializerMethodField()
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)

    class Meta:
        model = AppraisalExtension
        fields = [
            'id', 'cycle', 'cycle_name', 'employee', 'employee_name', 'employee_initials',
            'employee_designation', 'employee_department',
            'requester', 'requester_name', 'original_deadline', 'extended_deadline',
            'reason', 'status',
        ]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip()

    def get_employee_initials(self, obj):
        parts = [obj.employee.first_name, obj.employee.last_name]
        return ''.join(p[0].upper() for p in parts if p)[:2]

    def get_requester_name(self, obj):
        if not obj.requester:
            return None
        return f"{obj.requester.first_name} {obj.requester.last_name}".strip()


class SalaryHikeConfigSerializer(serializers.ModelSerializer):
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)

    class Meta:
        model = SalaryHikeConfig
        fields = ['id', 'cycle', 'cycle_name', 'min_rating', 'max_rating', 'recommended_hike_percentage']

    def validate(self, attrs):
        min_r = attrs.get('min_rating', 0)
        max_r = attrs.get('max_rating', 0)
        if min_r >= max_r:
            raise serializers.ValidationError('min_rating must be less than max_rating.')
        return attrs


class AppraisalCycleSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    self_count = serializers.SerializerMethodField()
    manager_count = serializers.SerializerMethodField()
    peer_count = serializers.SerializerMethodField()
    hr_count = serializers.SerializerMethodField()

    class Meta:
        model = AppraisalCycle
        fields = [
            'id', 'name', 'start_date', 'end_date',
            'self_appraisal_deadline', 'manager_eval_deadline', 'status',
            'question_count', 'self_count', 'manager_count', 'peer_count', 'hr_count',
        ]

    def get_question_count(self, obj): return obj.questions.count()
    def get_self_count(self, obj): return obj.questions.filter(role_type='self').count()
    def get_manager_count(self, obj): return obj.questions.filter(role_type='manager').count()
    def get_peer_count(self, obj): return obj.questions.filter(role_type='peer').count()
    def get_hr_count(self, obj): return obj.questions.filter(role_type='hr').count()


class AppraisalQuestionSerializer(serializers.ModelSerializer):
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    max_score = serializers.IntegerField(required=False, allow_null=True, default=5)

    class Meta:
        model = AppraisalQuestion
        fields = ['id', 'cycle', 'cycle_name', 'question_text', 'question_type', 'role_type', 'max_score']

    def validate_max_score(self, value):
        if value is None:
            return 5
        return value


class AppraisalAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppraisalAnswer
        fields = ['id', 'evaluation', 'question', 'submitted_by', 'rating_score', 'comment']
        read_only_fields = ['submitted_by']


class AppraisalEvaluationSerializer(serializers.ModelSerializer):
    answers = AppraisalAnswerSerializer(many=True, read_only=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = AppraisalEvaluation
        fields = ['id', 'employee', 'employee_name', 'manager', 'cycle', 'cycle_name',
                  'self_overall_rating', 'manager_overall_rating', 'hr_overall_rating',
                  'status', 'answers']
        read_only_fields = ['employee', 'manager', 'self_overall_rating',
                            'manager_overall_rating', 'hr_overall_rating']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip() if obj.employee else ""
