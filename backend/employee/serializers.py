from rest_framework import serializers
from app.models import Notification,LearningCorner,BreakConfig, BreakLog,Attendance, ShiftPolicy, Employee,EmpLeave,Leave,CompanyPolicies
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
    shift = ShiftSerializer()

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'company', 'shift',
            'date', 'check_in', 'check_out',
            'total_work_duration', 'overtime_duration',
            'is_present', 'created_at', 'updated_at'
        ]


class PersonalCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalCalendar
        fields = ['id', 'name', 'date', 'description']  
        read_only_fields = ['id']



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

        return task


    def get_subtask_details(self, obj):
        return TaskSerializer(obj.subtasks.all(), many=True).data

    def get_assignments(self, obj):
        return TaskAssignmentSerializer(obj.assignments.all(), many=True,context=self.context).data

    def get_progress(self, obj):
        return obj.progress()
    
    def get_created_at(self, obj):
        # Format: YYYY-MM-DD HH:MM
        return obj.created_at.strftime("%Y-%m-%d %H:%M")

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
        return obj.created_at.strftime("%Y-%m-%d %H:%M")

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
            'status',
            'reason',
            'from_date',
            'to_date',
            'created_at',
        ]
        read_only_fields = ['company', 'employee_name', 'employee_id', 'reporting_manager_name','leave_type_name', 'status', 'created_at']

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

            total_days = 0
            for leave in leaves:
                if leave.from_date and leave.to_date:
                    delta = (leave.to_date - leave.from_date).days + 1  # inclusive
                    total_days += max(delta, 0)

            return total_days

        return 0

    def get_remaining_count(self, obj):
        used = self.get_used_count(obj)
        return max(obj.count - used, 0)
    
    
class EmpLearningCornerSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    document = serializers.SerializerMethodField()

    class Meta:
        model = LearningCorner
        fields = ['id', 'title', 'description', 'image', 'video', 'document']

    def get_image(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.image.url) if obj.image else None

    def get_video(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.video.url) if obj.video else None

    def get_document(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.document.url) if obj.document else None



class EmployeeDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_name = serializers.CharField(source='designation.name', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'
        # Add department_name and designation_name to the output
        extra_fields = ['department_name', 'designation_name']

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
            'date_of_birth']        
        
        
class EmployeeBreakConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BreakConfig
        fields = ['id', 'break_choice', 'duration_minutes', 'enabled']

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
