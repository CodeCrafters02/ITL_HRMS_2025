from rest_framework import serializers
from datetime import date, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
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