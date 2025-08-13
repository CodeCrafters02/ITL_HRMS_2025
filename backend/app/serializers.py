from rest_framework import serializers
from datetime import datetime, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth import get_user_model
from .models import *

User = get_user_model()

class CustomPasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        user = self.context['request'].user

        if not user.check_password(attrs['old_password']):
            raise serializers.ValidationError({"old_password": "Old password is incorrect."})

        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({"new_password": "New password cannot be the same as the old password."})

        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = UserRegister
        fields = ['id', 'username', 'email', 'password', 'role']

    def validate_role(self, value):
        if value not in ['master', 'admin', 'employee']:
            raise serializers.ValidationError("Role must be master, admin, or employee.")
        return value

    def create(self, validated_data):
        user = UserRegister.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data['role'],
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True,required=False)

    class Meta:
        model = UserRegister
        fields = ['id', 'username', 'email', 'password', 'role','is_active','first_name','last_name']
        read_only_fields = ['created_by'] 

    def validate_role(self, value):
        if value not in ['master', 'admin', 'employee']:
            raise serializers.ValidationError("Role must be master, admin, or employee.")
        return value

    def create(self, validated_data):
        created_by_id = self.initial_data.pop('created_by', None)
        first_name = self.initial_data.get('first_name', '')
        last_name = self.initial_data.get('last_name', '')

        user = UserRegister.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data['role'],
        )
        user.first_name = first_name
        user.last_name = last_name

        if created_by_id:
            try:
                created_by_user = UserRegister.objects.get(id=created_by_id)
                user.created_by = created_by_user
                user.save()
            except ObjectDoesNotExist:
                print(f"UserRegister with id={created_by_id} does not exist")
        return user

class AdminRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = UserRegister
        fields = ['id', 'username', 'email', 'password']

    def create(self, validated_data):
        validated_data['role'] = 'admin'
        user = UserRegister.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role='admin'
        )
        return user

class MasterDashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRegister
        fields = ['username', 'email']

class CompanyWithAdminSerializer(serializers.ModelSerializer):
    admin = serializers.IntegerField(write_only=True, required=False)
    admin_username = serializers.SerializerMethodField(read_only=True)
    admin_email = serializers.SerializerMethodField(read_only=True)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id', 'name', 'address', 'location', 'email', 'phone_number',
            'logo', 'logo_url', 'admin', 'admin_username', 'admin_email'
        ]
        extra_kwargs = {
            'admin': {'write_only': True}
        }

    def get_admin_username(self, obj):
        admin_user = UserRegister.objects.filter(company=obj, role='admin').first()
        return admin_user.username if admin_user else None

    def get_admin_email(self, obj):
        admin_user = UserRegister.objects.filter(company=obj, role='admin').first()
        return admin_user.email if admin_user else None
    
    def get_logo_url(self, obj):
        request = self.context.get('request')
        if request and obj.logo:
            return request.build_absolute_uri(obj.logo.url)
        elif obj.logo:
            return obj.logo.url  # fallback to relative path
        return None
    
    def update(self, instance, validated_data):
        admin_id = validated_data.pop('admin', None)

        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If admin ID provided, assign company and role
        if admin_id is not None:
            try:
                admin_user = UserRegister.objects.get(pk=admin_id)
                admin_user.company = instance
                admin_user.role = 'admin'
                admin_user.save()
            except UserRegister.DoesNotExist:
                raise serializers.ValidationError({"admin": "Admin user not found."})
        
        return instance


    def create(self, validated_data):
        admin_id = validated_data.pop('admin')
        company = Company.objects.create(**validated_data)

        try:
            admin_user = UserRegister.objects.get(pk=admin_id)
        except UserRegister.DoesNotExist:
            raise serializers.ValidationError({"admin": "Admin user not found."})

        admin_user.company = company
        admin_user.role = 'admin'
        admin_user.save()

        # Send welcome email to the admin user 
        subject = f"Welcome to {company.name}!"
        message = (
            f"Hi {admin_user.username},\n\n"
            f"You have been registered as an Admin for {company.name}.\n\n"
            f"Your username: {admin_user.username}\n"
            f"Your email: {admin_user.email}\n\n"
            f"Please login and get started!\n\n"
            f"Regards,\n"
            f"{company.name} Team"
        )
        send_mail(
            subject,
            message,
            None,  # uses DEFAULT_FROM_EMAIL
            [admin_user.email],
            fail_silently=False,
        )

        return company
    
class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    confirm_password = serializers.CharField(required=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is not correct.")
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("New password and confirm password do not match.")
        validate_password(data['new_password'], user=self.context['request'].user)
        return data   

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'department_name']
        
class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ['id', 'level_name', 'description', 'company']
        read_only_fields = ['company']

class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = ['id', 'designation_name', 'department', 'level']
        


       
class EmployeeSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    designation = serializers.PrimaryKeyRelatedField(queryset=Designation.objects.all())
    level = serializers.PrimaryKeyRelatedField(queryset=Level.objects.all(), required=False)

    reporting_level = serializers.PrimaryKeyRelatedField(
        queryset=Level.objects.all(), write_only=True, required=False, allow_null=True
    )
    reporting_manager = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), required=False, allow_null=True
    )
    reporting_manager_name = serializers.SerializerMethodField()
    reporting_level_name = serializers.SerializerMethodField()
    asset_details = serializers.PrimaryKeyRelatedField(
        queryset=AssetInventory.objects.all(), many=True, required=False, allow_null=True
    )

    department_name = serializers.SerializerMethodField()
    designation_name = serializers.SerializerMethodField()
    asset_names = serializers.SerializerMethodField()
    source_choices = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'first_name', 'middle_name', 'last_name', 'gender',
            'email', 'date_of_birth', 'mobile', 'temporary_address', 'permanent_address', 'photo',
            'aadhar_no', 'aadhar_card', 'pan_no', 'pan_card', 'guardian_name', 'guardian_mobile',
            'category', 'department', 'department_name', 'designation', 'designation_name',
            'level', 'reporting_manager', 'reporting_level', 'reporting_level_name', 'reporting_manager_name',
            'payment_method', 'account_no', 'ifsc_code', 'bank_name', 'source_of_employment',
            'who_referred', 'date_of_joining', 'previous_employer', 'date_of_releaving',
            'previous_designation_name', 'previous_salary', 'ctc', 'gross_salary',
            'epf_status', 'uan', 'asset_details', 'asset_names', 'esic_status', 'esic_no',
            'source_choices'
        ]

    def get_department_name(self, obj):
        return obj.department.department_name if obj.department else None

    def get_designation_name(self, obj):
        return obj.designation.designation_name if obj.designation else None

    def get_asset_names(self, obj):
        return [asset.name for asset in obj.asset_details.all()]

    def get_source_choices(self, obj):
        return [{'value': key, 'label': label} for key, label in Employee.SOURCE_CHOICES]

    def get_reporting_manager_name(self, obj):
        """Return full name of reporting manager."""
        if obj.reporting_manager:
            return f"{obj.reporting_manager.first_name} {obj.reporting_manager.last_name}".strip()
        return None
    
    def get_reporting_level_name(self, obj):
        return obj.reporting_level.level_name if obj.reporting_level else None

    def validate(self, data):
        email = data.get('email')
        source = data.get('source_of_employment')
        ref = data.get('who_referred')
        reporting_level = data.get('reporting_level')
        reporting_manager = data.get('reporting_manager')

        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context is required.")

        company = request.user.company
        
        if self.instance is None:  # Means create, not update
            if Employee.objects.filter(email=email, company=company).exists():
                raise serializers.ValidationError({"email": "This email is already registered for this company."})


        if source != 'internalreference' and ref:
            raise serializers.ValidationError(
                "who_referred should only be set if source_of_employment is 'internalreference'"
            )

        if reporting_level and reporting_level.company_id != company.id:
            raise serializers.ValidationError("Selected reporting level is not part of your company.")

        if reporting_manager:
            if reporting_manager.company_id != company.id:
                raise serializers.ValidationError("Selected reporting manager is not from your company.")

            if reporting_level and reporting_manager.level_id != reporting_level.id:
                raise serializers.ValidationError("Reporting manager is not assigned to the selected reporting level.")

        return data

    def create(self, validated_data):
        reporting_level = validated_data.pop('reporting_level', None)
        assets = validated_data.pop('asset_details', [])
        request = self.context['request']
        admin_user = request.user

        employee_id = self.generate_employee_id()
        username = f'emp_{get_random_string(6)}'
        password = get_random_string(8)

        user = UserRegister.objects.create_user(
            username=username,
            email=validated_data['email'],
            password=password,
            role='employee',
            company=admin_user.company
        )

        validated_data['company'] = admin_user.company
        validated_data['user'] = user
        validated_data['employee_id'] = employee_id

        designation = validated_data.get('designation')
        if designation and designation.level:
            validated_data['level'] = designation.level

        employee = Employee.objects.create(**validated_data)

        for asset in assets:
            if asset.quantity <= 0:
                raise serializers.ValidationError(f"Asset '{asset.name}' is out of stock.")
            asset.quantity -= 1
            asset.save()
            EmployeeAssetDetails.objects.create(employee=employee, assetinventory=asset)

        self.send_welcome_email(user, password)

        return employee



    def generate_employee_id(self):
        last_employee = Employee.objects.order_by('id').last()
        if last_employee and last_employee.employee_id:
            last_id = int(last_employee.employee_id.split('-')[-1])
        else:
            last_id = 0
        return f'EMP-{last_id + 1:04d}'

    def send_welcome_email(self, user, password):
        subject = 'Welcome to the Company!'
        message = (
            f'Hello {user.username},\n\n'
            f'Your employee account has been created.\n\n'
            f'Username: {user.username}\n'
            f'Password: {password}\n\n'
            f'Please log in and change your password after first login.\n\n'
            f'Thank you!'
        )
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
    
    
class AssetInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetInventory
        fields = [
            'id',
            'name',
            'description',
            'quantity',
            'icon_image',
            
        ]

    def create(self, validated_data):
        request = self.context['request']
        admin_user = request.user
        company = admin_user.company

        validated_data['company'] = company
        return AssetInventory.objects.create(**validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)


class EmployeeAssetDetailsSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.__str__', read_only=True)
    asset_name = serializers.CharField(source='assetinventory.name', read_only=True)

    class Meta:
        model = EmployeeAssetDetails
        fields = ['id', 'employee', 'employee_name', 'assetinventory', 'asset_name']


class RecruitmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recruitment
        fields = '__all__'
        read_only_fields = ['reference_id']
        
        
class LeaveSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Leave
        fields = ['id', 'leave_name', 'count', 'is_paid']

class LearningCornerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = LearningCorner
        fields = [
            'id', 'title', 'description',
            'image', 'video', 'document',
            'image_url', 'video_url', 'document_url'
        ]
        read_only_fields = ['id', 'image_url', 'video_url', 'document_url']
        extra_kwargs = {
            'image': {'required': False, 'allow_null': True},
            'video': {'required': False, 'allow_null': True},
            'document': {'required': False, 'allow_null': True},
        }

    def get_image_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.image.url) if obj.image else None

    def get_video_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.video.url) if obj.video else None

    def get_document_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.document.url) if obj.document else None

    def update(self, instance, validated_data):
        # Only update fields that are present in validated_data
        for attr, value in validated_data.items():
            if attr in ['image', 'video', 'document']:
                if value is not None:
                    setattr(instance, attr, value)
                # If value is None, do not overwrite existing file
            else:
                setattr(instance, attr, value)
        instance.save()
        return instance
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        
        
class ShiftPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftPolicy
        fields = '__all__'


class DepartmentWiseWorkingDaysSerializer(serializers.ModelSerializer):
    shifts = serializers.PrimaryKeyRelatedField(
        queryset=ShiftPolicy.objects.all(), many=True, required=False
    )

    class Meta:
        model = DepartmentWiseWorkingDays
        fields = [
            'id', 'department', 'shifts', 'working_days_count',
            'week_start_day', 'week_end_day', 'company'
        ]


class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = '__all__'
        
        
class RelievedEmployeeSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.filter(is_active=True))

    class Meta:
        model = RelievedEmployee
        fields = ['id', 'employee', 'relieving_date',  'remarks']

    def create(self, validated_data):
        employee = validated_data['employee']
        # Mark the employee as inactive
        employee.is_active = False
        employee.save()
        return super().create(validated_data)
    
    
    
class AllowanceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AllowanceType
        fields = ['id', 'name', 'amount']

class DeductionPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = DeductionPolicy
        fields = ['id', 'name', 'amount']

class SalaryStructureSerializer(serializers.ModelSerializer):
    allowances = AllowanceTypeSerializer(many=True, required=False)
    deductions = DeductionPolicySerializer(many=True, required=False)
   
    class Meta:
        model = SalaryStructure
        fields = [
            'id', 'company', 'name',
            'basic_percent', 'hra_percent', 'conveyance_percent',
            'medical_percent', 'special_percent', 'service_charge_percent',
            'total_working_days', 'created_at',
            'allowances', 'deductions'
        ]
        read_only_fields = ['company', 'created_at']

    def create(self, validated_data):
        allowances = validated_data.pop('allowances', [])
        deductions = validated_data.pop('deductions', [])
        salary_structure = SalaryStructure.objects.create(**validated_data)

        for allowance in allowances:
            AllowanceType.objects.create(salary_structure=salary_structure, **allowance)

        for deduction in deductions:
            DeductionPolicy.objects.create(salary_structure=salary_structure, **deduction)

        return salary_structure

    def update(self, instance, validated_data):
        allowances = validated_data.pop('allowances', [])
        deductions = validated_data.pop('deductions', [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        instance.allowances.all().delete()
        instance.deductions.all().delete()

        for allowance in allowances:
            AllowanceType.objects.create(salary_structure=instance, **allowance)

        for deduction in deductions:
            DeductionPolicy.objects.create(salary_structure=instance, **deduction)

        return instance

class PayrollBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollBatch
        fields = ['id', 'company', 'month', 'year', 'status']

class PayrollSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_name = serializers.SerializerMethodField()
    payroll_date = serializers.DateField(format="%Y-%m-%d", read_only=True)

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    class Meta:
        model = Payroll
        fields = [
            'id', 'employee_id', 'employee_name', 'payroll_date',
            'gross_salary', 'basic_salary', 'hra', 'conveyance', 'medical',
            'special_allowance', 'service_charges', 'pf', 'income_tax', 'net_pay',
            'total_working_days', 'days_paid', 'loss_of_pay_days',
            'other_allowances', 'other_deductions','payroll_date'
        ]
        read_only_fields = ['payroll_date']

class IncomeTaxConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomeTaxConfig
        fields = '__all__'        
        
        
class AttendanceSerializer(serializers.ModelSerializer):
    employee_id = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()
    is_late = serializers.SerializerMethodField()


    class Meta:
        model = Attendance
        fields = [
            'id',
            'employee_id',
            'employee_name',
            'check_in',
            'check_out',
            'total_work_duration',
            'total_break_time',
            'overtime_duration',
            'is_present',
            'leave',
            'remarks',
            'date',
            'is_late',
        ]

    def get_employee_id(self, obj):
        return obj.employee.employee_id if obj.employee else None

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}" if obj.employee else ""

    def get_is_late(self, obj):
        check_in = obj.check_in
        shift = obj.shift

        if not (check_in and shift and shift.checkin and shift.grace_period):
            return False

        # Convert check-in to local time
        check_in = timezone.localtime(check_in)

        # Construct shift start datetime in local timezone
        shift_start_dt = datetime.combine(check_in.date(), shift.checkin)
        shift_start_dt = timezone.make_aware(shift_start_dt, timezone.get_current_timezone())

        # Add grace period
        allowed_latest_checkin = shift_start_dt + shift.grace_period

        return check_in > allowed_latest_checkin

        
class PolicyConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyPolicies
        fields = [
            'id', 'company', 'name', 'document',
            'is_active', 'created_at'
        ]
        read_only_fields = ['company', 'created_at']

 
 
class LeaveLogSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    leave_type = serializers.SerializerMethodField()
    class Meta:
        model = EmpLeave
        fields = ['id', 'employee_name', 'manager_name', 'from_date', 'to_date', 'status','reason','leave_type']

    def get_employee_name(self, obj):
        return str(obj.employee)

    def get_manager_name(self, obj):
        return str(obj.reporting_manager) if obj.reporting_manager else ''
    
    def get_leave_type(self, obj):
        return obj.leave_type.leave_name if obj.leave_type else ''
        
class UserLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRegister
        fields = ['id', 'username', 'role']
        
        
class BreakConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BreakConfig
        fields = ['id', 'company', 'break_type', 'duration_minutes']
