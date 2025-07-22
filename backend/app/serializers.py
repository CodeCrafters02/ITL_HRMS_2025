from rest_framework import serializers
from datetime import date, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
from django.contrib.auth.password_validation import validate_password
from employee.models import EmpLeave
from .models import *


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


class CompanyWithAdminSerializer(serializers.ModelSerializer):
    admin = serializers.IntegerField(write_only=True)

    class Meta:
        model = Company
        fields = ['id', 'name', 'address', 'location','email', 'phone_number', 'logo', 'admin']

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
        fields = ['id', 'level_name', 'description']


class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = ['id', 'designation_name', 'department', 'level']
        
        
class EmployeeSerializer(serializers.ModelSerializer):
    asset_details = serializers.PrimaryKeyRelatedField(
        queryset=AssetInventory.objects.all(),
        many=True,
        required=False
    )
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    designation = serializers.PrimaryKeyRelatedField(queryset=Designation.objects.all())
    level = serializers.PrimaryKeyRelatedField(queryset=Level.objects.all(), required=False)
    reporting_manager = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Employee
        fields = ['id', 'employee_id', 'first_name', 'middle_name', 'last_name','gender', 'email', 'date_of_birth', 'mobile',
            'temporary_address', 'permanent_address', 'photo','aadhar_no', 'aadhar_card', 'pan_no', 'pan_card',
            'guardian_name', 'guardian_mobile', 'category','department', 'designation', 'level', 'reporting_manager',
            'payment_method', 'account_no', 'ifsc_code', 'bank_name','source_of_employment', 'who_referred',
            'date_of_joining', 'previous_employer','date_of_releaving', 'previous_designation_name','previous_salary', 'ctc', 'gross_salary',
            'epf_status', 'uan', 'asset_details','esic_status', 'esic_no']

    def create(self, validated_data):
        assets = validated_data.pop('asset_details', [])
        request = self.context['request']
        admin_user = request.user

        # Auto generate unique Employee ID
        employee_id = self.generate_employee_id()

        # Generate random username & password
        username = f'emp_{get_random_string(6)}'
        password = get_random_string(8)

        # Create UserRegister for this employee
        user = UserRegister.objects.create_user(
            username=username,
            email=validated_data['email'],
            password=password,
            role='employee',
            company=admin_user.company
        )

        # Link user + company + employee_id
        validated_data['company'] = admin_user.company
        validated_data['user'] = user
        validated_data['employee_id'] = employee_id

        employee = Employee.objects.create(**validated_data)

        # Reduce asset quantities
        for asset in assets:
            if asset.quantity <= 0:
                raise serializers.ValidationError(f"Asset '{asset.name}' is out of stock.")
            asset.quantity -= 1
            asset.save()
            EmployeeAssetDetails.objects.create(employee=employee, assetinventory=asset)

        # Send welcome email
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
        
        
class LeaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Leave
        fields = ['id', 'leave_name', 'count', 'is_paid']

class LearningCornerSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningCorner
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        
        
class ShiftPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftPolicy
        fields = '__all__'


class DepartmentWiseWorkingDaysSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartmentWiseWorkingDays
        fields = '__all__'


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
    class Meta:
        model = Payroll
        fields = '__all__'

class IncomeTaxConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomeTaxConfig
        fields = '__all__'        
        
        
class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = '__all__'
        
        
class PolicyConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyPolicies
        fields = '__all__'
 
 
class LeaveLogSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.username', read_only=True)
    manager_name = serializers.CharField(source='reporting_manager.username', read_only=True)

    class Meta:
        model = EmpLeave
        fields = ['id','employee_name','manager_name','leave_type','status','reason','from_date','to_date']       
        
class UserLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRegister
        fields = ['id', 'username', 'role']
        
        
