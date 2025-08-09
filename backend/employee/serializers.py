from rest_framework import serializers
from app.models import Notification,LearningCorner, BreakLog,Attendance, ShiftPolicy, Employee,EmpLeave,Leave
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


class BreakLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BreakLog
        fields = '__all__'

class PersonalCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalCalendar
        fields = ['id', 'name', 'date', 'description']  
        read_only_fields = ['id']



class TaskSerializer(serializers.ModelSerializer):
    subtasks = serializers.SerializerMethodField()
    assignments = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'created_by',
            'created_at', 'deadline', 'priority', 'status',
            'parent_task', 'subtasks', 'assignments', 'progress'
        ]

    def get_subtasks(self, obj):
        return TaskSerializer(obj.subtasks.all(), many=True).data

    def get_assignments(self, obj):
        return TaskAssignmentSerializer(obj.assignments.all(), many=True).data

    def get_progress(self, obj):
        return obj.progress()


class TaskAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAssignment
        fields = ['id', 'task', 'employee', 'role', 'status', 'is_seen']


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
