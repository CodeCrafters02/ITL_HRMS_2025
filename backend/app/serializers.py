from rest_framework import serializers
from django.db.models import Q
from datetime import datetime, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
import threading
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from .models import *
from rest_framework import viewsets, permissions

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

    def validate_email(self, value):
        email = value.strip().lower()
        queryset = UserRegister.objects.filter(email__iexact=email)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

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
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        required=False,
        allow_null=True
    )
    company_name = serializers.SerializerMethodField(read_only=True)
    designation = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserRegister
        fields = ['id', 'username', 'email', 'password', 'role', 'is_active', 'first_name', 'last_name', 'company', 'company_name', 'designation']
        read_only_fields = ['created_by'] 

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

    def get_designation(self, obj):
        try:
            return obj.employee_profile.designation.name if obj.employee_profile and obj.employee_profile.designation else obj.role.capitalize()
        except:
            return obj.role.capitalize()

    def validate_role(self, value):
        if value not in ['master', 'admin', 'employee']:
            raise serializers.ValidationError("Role must be master, admin, or employee.")
        return value

    def validate_email(self, value):
        email = value.strip().lower()
        queryset = UserRegister.objects.filter(email__iexact=email)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate(self, data):
        role = data.get('role')
        company = data.get('company')
        
        # Company is optional for all roles
        # If company is provided, it should be valid
        if company and not Company.objects.filter(id=company.id).exists():
            raise serializers.ValidationError("Invalid company selected.")
        
        return data

    def create(self, validated_data):
        created_by_id = self.initial_data.pop('created_by', None)
        first_name = self.initial_data.get('first_name', '')
        last_name = self.initial_data.get('last_name', '')
        company = validated_data.get('company', None)

        user = UserRegister.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data['role'],
            company=company,  # Assign company to user
        )
        user.first_name = first_name
        user.last_name = last_name

        if created_by_id:
            try:
                created_by_user = UserRegister.objects.get(id=created_by_id)
                user.created_by = created_by_user
            except ObjectDoesNotExist:
                print(f"UserRegister with id={created_by_id} does not exist")
        
        user.save()
        return user

class AdminRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = UserRegister
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name']

    def validate_email(self, value):
        email = value.strip().lower()
        queryset = UserRegister.objects.filter(email__iexact=email)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def create(self, validated_data):
        validated_data['role'] = 'admin'
        user = UserRegister.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role='admin'
        )
        user.first_name = validated_data.get('first_name', '')
        user.last_name = validated_data.get('last_name', '')
        user.save()
        return user

class MasterDashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRegister
        fields = ['username', 'email']

class CompanyWithAdminSerializer(serializers.ModelSerializer):
    admin = serializers.IntegerField(write_only=True, required=False)
    admin_username_input = serializers.CharField(write_only=True, required=False)
    admin_email_input = serializers.EmailField(write_only=True, required=False)
    admin_first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    admin_last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    admin_password = serializers.CharField(write_only=True, required=False)
    admin_id = serializers.SerializerMethodField(read_only=True)
    admin_username = serializers.SerializerMethodField(read_only=True)
    admin_email = serializers.SerializerMethodField(read_only=True)
    admin_first_name_value = serializers.SerializerMethodField(read_only=True)
    admin_last_name_value = serializers.SerializerMethodField(read_only=True)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id', 'name', 'address', 'location', 'email', 'phone_number', 'gmail_domains',
            'logo', 'logo_url',
            'admin',
            'admin_username_input', 'admin_email_input', 'admin_first_name', 'admin_last_name', 'admin_password',
            'admin_id', 'admin_username', 'admin_email', 'admin_first_name_value', 'admin_last_name_value'
        ]
        extra_kwargs = {
            'admin': {'write_only': True}
        }

    def get_admin_id(self, obj):
        admin_user = UserRegister.objects.filter(company=obj, role='admin').first()
        return admin_user.id if admin_user else None

    def get_admin_username(self, obj):
        admin_user = UserRegister.objects.filter(company=obj, role='admin').first()
        return admin_user.username if admin_user else None

    def get_admin_email(self, obj):
        admin_user = UserRegister.objects.filter(company=obj, role='admin').first()
        return admin_user.email if admin_user else None

    def get_admin_first_name_value(self, obj):
        admin_user = UserRegister.objects.filter(company=obj, role='admin').first()
        return admin_user.first_name if admin_user else ''

    def get_admin_last_name_value(self, obj):
        admin_user = UserRegister.objects.filter(company=obj, role='admin').first()
        return admin_user.last_name if admin_user else ''
    
    def get_logo_url(self, obj):
        request = self.context.get('request')
        if request and obj.logo:
            return request.build_absolute_uri(obj.logo.url)
        elif obj.logo:
            return obj.logo.url  # fallback to relative path
        return None
    
    def update(self, instance, validated_data):
        admin_id = validated_data.pop('admin', None)
        admin_username_input = (validated_data.pop('admin_username_input', None) or '').strip()
        admin_email_input = (validated_data.pop('admin_email_input', None) or '').strip().lower()
        admin_first_name = validated_data.pop('admin_first_name', None)
        admin_last_name = validated_data.pop('admin_last_name', None)
        admin_password = validated_data.pop('admin_password', None)

        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If admin ID provided, update the admin assignment
        if admin_id is not None:
            try:
                # Clear previous admin assignments for this company
                UserRegister.objects.filter(company=instance, role='admin').update(company=None)
                
                # Assign new admin
                admin_user = UserRegister.objects.get(pk=admin_id)
                admin_user.company = instance
                admin_user.role = 'admin'
                admin_user.save()
            except UserRegister.DoesNotExist:
                raise serializers.ValidationError({"admin": "Admin user not found."})

        # Update existing admin details (if any fields provided)
        if admin_username_input or admin_email_input or admin_first_name is not None or admin_last_name is not None or admin_password:
            admin_user = UserRegister.objects.filter(company=instance, role='admin').first()
            if not admin_user:
                raise serializers.ValidationError({"detail": "No admin is assigned to this company."})

            if admin_username_input and UserRegister.objects.filter(username__iexact=admin_username_input).exclude(pk=admin_user.pk).exists():
                raise serializers.ValidationError({"admin_username_input": "A user with this username already exists."})
            if admin_email_input and UserRegister.objects.filter(email__iexact=admin_email_input).exclude(pk=admin_user.pk).exists():
                raise serializers.ValidationError({"admin_email_input": "A user with this email already exists."})

            if admin_username_input:
                admin_user.username = admin_username_input
            if admin_email_input:
                admin_user.email = admin_email_input
            if admin_first_name is not None:
                admin_user.first_name = admin_first_name
            if admin_last_name is not None:
                admin_user.last_name = admin_last_name
            if admin_password:
                admin_user.set_password(admin_password)

            admin_user.role = 'admin'
            admin_user.company = instance
            admin_user.save()
        
        return instance


    def create(self, validated_data):
        admin_id = validated_data.pop('admin', None)
        admin_username_input = (validated_data.pop('admin_username_input', None) or '').strip()
        admin_email_input = (validated_data.pop('admin_email_input', None) or '').strip().lower()
        admin_first_name = validated_data.pop('admin_first_name', '') or ''
        admin_last_name = validated_data.pop('admin_last_name', '') or ''
        admin_password = validated_data.pop('admin_password', None)
        company = Company.objects.create(**validated_data)

        if admin_id is not None:
            try:
                admin_user = UserRegister.objects.get(pk=admin_id)
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
                # Send welcome email in the background to avoid blocking the response
                email_thread = threading.Thread(
                    target=send_mail,
                    args=(subject, message, None, [admin_user.email]),
                    kwargs={'fail_silently': False}
                )
                email_thread.start()
            except UserRegister.DoesNotExist:
                raise serializers.ValidationError({"admin": "Admin user not found."})
        else:
            # Create a new admin user along with company
            if not admin_username_input or not admin_email_input or not admin_password:
                raise serializers.ValidationError(
                    {"detail": "Admin details are required (admin_username_input, admin_email_input, admin_password) when admin is not provided."}
                )

            if UserRegister.objects.filter(username__iexact=admin_username_input).exists():
                raise serializers.ValidationError({"admin_username_input": "A user with this username already exists."})
            if UserRegister.objects.filter(email__iexact=admin_email_input).exists():
                raise serializers.ValidationError({"admin_email_input": "A user with this email already exists."})

            admin_user = UserRegister.objects.create_user(
                username=admin_username_input,
                email=admin_email_input,
                password=admin_password,
                role='admin',
                company=company,
                first_name=admin_first_name,
                last_name=admin_last_name,
                is_active=True,
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
    
class CompanySerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'address',
            'location',
            'email',
            'phone_number',
            'gmail_domains',
            'logo',
            'logo_url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'name','email','created_at', 'updated_at'] 

    def get_logo_url(self, obj):
            request = self.context.get('request')
            if obj.logo and request:
                return request.build_absolute_uri(obj.logo.url)
            elif obj.logo:
                return obj.logo.url
            return None

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'department_name', 'creation_date']
        
class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ['id', 'level_name', 'description', 'company']
        read_only_fields = ['company']

class DesignationSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField(read_only=True)
    level_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Designation
        fields = ['id', 'designation_name', 'department', 'department_name', 'level', 'level_name']

    def get_department_name(self, obj):
        return obj.department.department_name if obj.department else None

    def get_level_name(self, obj):
        return obj.level.level_name if obj.level else None

    def validate(self, attrs):
        designation_name = attrs.get('designation_name', '').strip()
        department = attrs.get('department')
        level = attrs.get('level')

        # Case-insensitive check for existing designation
        qs = Designation.objects.filter(
            department=department,
            level=level,
            designation_name__iexact=designation_name
        )
        # Exclude self in update
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({
                'designation_name': 'A designation with this name, department, and level already exists.'
            })
        return attrs
        


class ShiftPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftPolicy
        fields = '__all__'


       
class EmployeeSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all(), required=False, allow_null=True)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False, allow_null=True)
    designation = serializers.PrimaryKeyRelatedField(queryset=Designation.objects.all(), required=False, allow_null=True)
    level = serializers.PrimaryKeyRelatedField(queryset=Level.objects.all(), required=False, allow_null=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    reporting_level = serializers.PrimaryKeyRelatedField(
        queryset=Level.objects.all(), write_only=True, required=False, allow_null=True
    )
    reporting_manager = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), required=False, allow_null=True
    )
    reporting_manager_name = serializers.SerializerMethodField()
    reporting_level_name = serializers.SerializerMethodField()
    asset_details = serializers.PrimaryKeyRelatedField(
        queryset=SupplyItem.objects.all(), many=True, required=False, allow_null=True
    )

    department_name = serializers.SerializerMethodField()
    designation_name = serializers.SerializerMethodField()
    asset_names = serializers.SerializerMethodField()
    source_choices = serializers.SerializerMethodField()
    shift_assigned = ShiftPolicySerializer(read_only=True)
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'first_name', 'middle_name', 'last_name', 'full_name', 'gender',
            'email', 'date_of_birth', 'mobile', 'temporary_address', 'permanent_address', 'photo',
            'aadhar_no', 'aadhar_card', 'pan_no', 'pan_card', 'guardian_name', 'guardian_mobile',
            'category', 'company', 'company_name', 'department', 'department_name', 'designation', 'designation_name',
            'level', 'reporting_manager', 'reporting_level', 'reporting_level_name', 'reporting_manager_name',
            'payment_method', 'account_no', 'ifsc_code', 'bank_name', 'source_of_employment',
            'who_referred', 'date_of_joining', 'previous_employer', 'date_of_releaving',
            'previous_designation_name', 'previous_salary', 'ctc', 'gross_salary',
            'epf_status', 'uan', 'asset_details', 'asset_names', 'esic_status', 'esic_no',
            'source_choices', 'shift_assigned', 'password'
        ]

    def get_department_name(self, obj):
        return obj.department.department_name if obj.department else None

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

    def get_designation_name(self, obj):
        return obj.designation.designation_name if obj.designation else None

    def get_asset_names(self, obj):
        if not obj.id:
            return []
        return [item.item_name for item in obj.supply_items.all()]

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

        company_id = self.initial_data.get('company')
        if request.user.role == 'master' and company_id:
            company = Company.objects.filter(id=company_id).first()
            if not company:
                raise serializers.ValidationError({"company": "Invalid company provided."})
        else:
            company = request.user.company
        
        if email:
            email = email.strip().lower()
            data['email'] = email
            existing_users = UserRegister.objects.filter(email__iexact=email)
            if self.instance and getattr(self.instance, 'user_id', None):
                existing_users = existing_users.exclude(pk=self.instance.user_id)
            if existing_users.exists():
                raise serializers.ValidationError({"email": "A user with this email already exists."})

        if self.instance is None:  # Means create, not update
            if not email:
                raise serializers.ValidationError({"email": "Email is required for employee creation."})


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

        # Non-master users can only create/update employees in their own company.
        if request.user.role != 'master':
            data['company'] = company

        return data

    def create(self, validated_data):
        reporting_level = validated_data.pop('reporting_level', None)
        assets = validated_data.pop('asset_details', [])
        raw_password = validated_data.pop('password', '').strip()
        request = self.context['request']
        admin_user = request.user
        
        company_id = self.initial_data.get('company')
        if admin_user.role == 'master' and company_id:
            assigned_company = Company.objects.get(id=company_id)
        else:
            assigned_company = admin_user.company

        employee_id = self.generate_employee_id()
        username = self.generate_username(validated_data)
        password = raw_password or get_random_string(8)

        # Ensure email exists in validated_data
        email = validated_data.get('email')
        if not email:
            raise serializers.ValidationError({"email": "Email is required for employee creation."})

        # Check if email already exists in UserRegister (handles unique constraint)
        if UserRegister.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})

        # Check if username already exists (handles race conditions)
        if UserRegister.objects.filter(username=username).exists():
            # Regenerate username if it exists
            username = self.generate_username(validated_data)

        try:
            user = UserRegister.objects.create_user(
                username=username,
                email=email,
                password=password,
                role='employee',
                company=assigned_company
            )
        except Exception as e:
            # Handle any database constraint violations
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                if 'email' in str(e).lower():
                    raise serializers.ValidationError({"email": "A user with this email already exists."})
                elif 'username' in str(e).lower():
                    # Regenerate username and try again
                    username = self.generate_username(validated_data)
                    user = UserRegister.objects.create_user(
                        username=username,
                        email=email,
                        password=password,
                        role='employee',
                        company=assigned_company
                    )
                else:
                    raise serializers.ValidationError({"error": f"Database constraint violation: {str(e)}"})
            else:
                raise

        validated_data['company'] = assigned_company
        validated_data['user'] = user
        validated_data['employee_id'] = employee_id

        designation = validated_data.get('designation')
        if designation and designation.level:
            validated_data['level'] = designation.level

        # Check if employee_id already exists before creating (handles race conditions)
        if Employee.objects.filter(employee_id=employee_id).exists():
            # Regenerate employee_id if it exists
            employee_id = self.generate_employee_id()
            validated_data['employee_id'] = employee_id

        try:
            employee = Employee.objects.create(**validated_data)
        except Exception as e:
            # Handle any database constraint violations
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                if 'employee_id' in str(e).lower():
                    # Regenerate employee_id and try again
                    employee_id = self.generate_employee_id()
                    validated_data['employee_id'] = employee_id
                    employee = Employee.objects.create(**validated_data)
                else:
                    raise serializers.ValidationError({"error": f"Database constraint violation: {str(e)}"})
            else:
                raise

        for item in assets:
            pk = item if isinstance(item, int) else getattr(item, 'pk', item)
            supply = SupplyItem.objects.get(pk=pk)
            if supply.company_id != assigned_company.id:
                raise serializers.ValidationError('Supply item does not belong to your company.')
            if supply.available_quantity <= 0:
                raise serializers.ValidationError(f"Supply item '{supply.item_name}' is out of stock.")
            supply.available_quantity -= 1
            supply.save(update_fields=['available_quantity', 'updated_at'])
            EmployeeSupplyAssignment.objects.create(employee=employee, supply_item=supply)

        self.send_welcome_email(user, password)

        return employee

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context is required.")

        # Admins cannot move employees across companies.
        if request.user.role != 'master':
            validated_data['company'] = request.user.company

        employee = super().update(instance, validated_data)

        # Linked auth user must always remain an employee and match employee company.
        if employee.user:
            employee.user.role = 'employee'
            employee.user.company = employee.company
            employee.user.save(update_fields=['role', 'company'])

        return employee



    def generate_employee_id(self):
        """Generate a unique employee ID in format EMP-XXXX (always 4-digit zero-padded).
        Always continues from the highest existing employee ID to ensure sequential continuation.
        """
        # Always get the highest existing employee ID number to ensure continuation
        max_id = self._get_highest_employee_id_number()
        
        # Start from max_id + 1 to ensure continuation (no gaps)
        current_id = max_id + 1
        
        # Ensure we don't exceed 9999 (4-digit limit)
        if current_id > 9999:
            raise serializers.ValidationError(
                {"employee_id": "Maximum employee ID limit reached (EMP-9999). Please contact administrator."}
            )
        
        # Try to find an available ID (handles race conditions)
        max_attempts = 1000
        attempt = 0
        
        while attempt < max_attempts:
            # Generate new ID in format EMP-XXXX (always 4-digit zero-padded)
            new_id = f'EMP-{current_id:04d}'
            
            # Check if this ID already exists (handles race conditions)
            if not Employee.objects.filter(employee_id=new_id).exists():
                return new_id
            
            # If ID exists (race condition), increment and try next sequential number
            current_id += 1
            attempt += 1
            
            # Check limit again
            if current_id > 9999:
                raise serializers.ValidationError(
                    {"employee_id": "Maximum employee ID limit reached (EMP-9999). Please contact administrator."}
                )
        
        # If we've exhausted all attempts, do a final search for next available
        # This ensures we always continue sequentially
        for candidate_id in range(max_id + 1, 10000):
            new_id = f'EMP-{candidate_id:04d}'
            if not Employee.objects.filter(employee_id=new_id).exists():
                return new_id
        
        # Last resort: should never reach here
        raise serializers.ValidationError(
            {"employee_id": "Unable to generate employee ID. Please contact administrator."}
        )
    
    def _get_highest_employee_id_number(self):
        """Get the highest numeric employee ID from existing employees.
        This ensures we always continue from the highest existing ID.
        """
        try:
            # Get all employees with valid EMP-XXXX format IDs
            employees = Employee.objects.filter(
                employee_id__isnull=False
            ).exclude(employee_id='').filter(
                employee_id__startswith='EMP-'
            )
            
            max_id = 0
            for emp in employees:
                try:
                    # Extract numeric part (format: EMP-XXXX)
                    numeric_part = emp.employee_id.split('-')[-1]
                    # Ensure it's exactly 4 digits
                    if len(numeric_part) == 4 and numeric_part.isdigit():
                        emp_id_num = int(numeric_part)
                        if emp_id_num > max_id:
                            max_id = emp_id_num
                except (ValueError, IndexError):
                    continue
            
            return max_id
        except Exception:
            return 0

    def generate_username(self, validated_data):
        first_name = validated_data.get('first_name', '').strip().lower()
        middle_name = validated_data.get('middle_name', '').strip().lower()
        last_name = validated_data.get('last_name', '').strip().lower()
        
        # Build base username
        name_parts = [first_name]
        if middle_name:
            name_parts.append(middle_name)
        if last_name:
            name_parts.append(last_name)
        
        base_username = '.'.join(name_parts)
        
        # Clean the username (remove special characters, replace spaces with dots)
        import re
        base_username = re.sub(r'[^a-z0-9.]', '', base_username)
        base_username = re.sub(r'\.+', '.', base_username).strip('.')
        
        # If base_username is empty, fallback to random
        if not base_username:
            return f'emp_{get_random_string(6)}'
        
        # Check for uniqueness and add counter if needed
        username = base_username
        counter = 1
        while UserRegister.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        return username

    def send_welcome_email(self, user, password):
        subject = 'Welcome to the Company!'
        message = (
            f'Hello {user.first_name} {user.last_name},\n\n'
            f'Your employee account has been created.\n\n'
            f'Username: {user.username}\n'
            f'Password: {password}\n\n'
            f'Please log in and change your password after first login.\n\n'
            f'Thank you!'
        )
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
    
    
class SupplyItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplyItem
        fields = '__all__'
        read_only_fields = ('company', 'created_at', 'updated_at')

    def validate(self, attrs):
        inst = self.instance
        total = attrs.get('total_stock', inst.total_stock if inst else None)
        avail = attrs.get('available_quantity', inst.available_quantity if inst else None)
        if total is None:
            total = 0
        if avail is None:
            avail = 0
        if avail > total:
            raise serializers.ValidationError({'available_quantity': 'Cannot exceed total stock.'})
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        validated_data['company'] = request.user.company
        return super().create(validated_data)


class FixedAssetSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField(read_only=True)
    variable_catalog_code = serializers.SerializerMethodField(read_only=True)
    variable_catalog_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FixedAsset
        fields = '__all__'
        read_only_fields = ('company', 'created_at', 'updated_at')

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to_id:
            return None
        e = obj.assigned_to
        return f"{(e.first_name or '').strip()} {(e.last_name or '').strip()}".strip() or str(e.employee_id)

    def get_variable_catalog_code(self, obj):
        return obj.variable_supply_item.item_code if obj.variable_supply_item_id else None

    def get_variable_catalog_name(self, obj):
        return obj.variable_supply_item.item_name if obj.variable_supply_item_id else None

    def create(self, validated_data):
        request = self.context['request']
        validated_data['company'] = request.user.company
        return super().create(validated_data)

    def validate(self, attrs):
        request = self.context['request']
        company = getattr(request.user, 'company', None)
        inst = self.instance
        if 'variable_supply_item' in attrs:
            vs = attrs.get('variable_supply_item')
        else:
            vs = inst.variable_supply_item if inst else None
        if vs is not None and company and vs.company_id != company.id:
            raise serializers.ValidationError({'variable_supply_item': 'Supply item must belong to your company.'})
        assigned = attrs.get('assigned_to', inst.assigned_to if inst else None)
        status = attrs.get('status', inst.status if inst else None)
        if status == 'in_use' and not assigned:
            raise serializers.ValidationError({'assigned_to': 'Required when status is In-Use.'})
        return attrs


class AssetRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.SerializerMethodField(read_only=True)
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = AssetRequest
        fields = '__all__'
        read_only_fields = ('company', 'created_at', 'updated_at')

    def get_requested_by_name(self, obj):
        e = obj.requested_by
        return f"{(e.first_name or '').strip()} {(e.last_name or '').strip()}".strip() or str(e.employee_id)

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def create(self, validated_data):
        request = self.context['request']
        validated_data['company'] = request.user.company
        return super().create(validated_data)


class AssetSupportingDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField(read_only=True)
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = AssetSupportingDocument
        fields = '__all__'
        read_only_fields = ('company', 'uploaded_at', 'uploaded_by')

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def validate(self, attrs):
        fa = attrs.get('fixed_asset_id') or attrs.get('fixed_asset')
        si = attrs.get('supply_item_id') or attrs.get('supply_item')
        ar = attrs.get('asset_request_id') or attrs.get('asset_request')
        if self.instance:
            fa = fa or self.instance.fixed_asset_id
            si = si or self.instance.supply_item_id
            ar = ar or self.instance.asset_request_id
        ids = sum(1 for x in (fa, si, ar) if x)
        if ids != 1:
            raise serializers.ValidationError('Link exactly one of fixed_asset, supply_item, or asset_request.')
        return attrs

    def create(self, validated_data):
        # company / uploaded_by set in view perform_create
        return super().create(validated_data)


class RecruitmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recruitment
        fields = '__all__'
        read_only_fields = ['id','reference_id']
        
        
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
        
        
class DepartmentWiseWorkingDaysSerializer(serializers.ModelSerializer):
    shifts = serializers.PrimaryKeyRelatedField(
        queryset=ShiftPolicy.objects.all(), many=True, required=False
    )

    class Meta:
        model = DepartmentWiseWorkingDays
        fields = [
            'id', 'department', 'shifts', 'working_days_count',
            'week_start_day', 'week_end_day', 'working_days', 'weekend_days', 'company'
        ]


class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = '__all__'
        
        
class RelievedEmployeeSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all(), write_only=True)
    employee_details = EmployeeSerializer(source='employee', read_only=True)
    employee_id = serializers.SerializerMethodField(read_only=True)
    employee_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RelievedEmployee
        fields = ['id', 'employee', 'employee_details', 'employee_id', 'employee_name', 'relieving_date', 'remarks']


    def get_employee_id(self, obj):
        return obj.employee.employee_id if obj.employee else None

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None

    def create(self, validated_data):
        employee = validated_data.get('employee', None)
        if not employee:
            raise serializers.ValidationError({'employee': 'Employee is required.'})
        if RelievedEmployee.objects.filter(employee=employee).exists():
            raise serializers.ValidationError({
                'employee': 'This employee has already been relieved.'
            })
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
    designation = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()


    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"
    def get_designation(self, obj):
        return obj.employee.designation.designation_name if obj.employee and obj.employee.designation else ""

    def get_department(self, obj):
        return obj.employee.department.department_name if obj.employee and obj.employee.department else ""

    class Meta:
        model = Payroll
        fields = [
            'id', 'employee_id', 'employee_name','designation','department', 'payroll_date',
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
        read_only_fields = ['id','company']      

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'company') or not request.user.company:
            raise serializers.ValidationError({'company': 'Company is required.'})
        validated_data['company'] = request.user.company
        return super().create(validated_data) 
        
        
class AttendanceSerializer(serializers.ModelSerializer):
    employee_id = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()
    is_late = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()


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
            'status',
        ]

    def get_employee_id(self, obj):
        return obj.employee.employee_id if obj.employee else None

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}" if obj.employee else ""

    def get_is_late(self, obj):
        check_in = obj.check_in
        shift = obj.employee.shift_assigned if obj.employee else None

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

    def get_status(self, obj):
        if not obj.check_in:
            return 'absent'
        
        # Determine status based on check-in time
        check_in = timezone.localtime(obj.check_in)
        check_in_time = check_in.time()
        today = obj.date
        
        # Get shift or use company defaults
        shift = obj.employee.shift_assigned if obj.employee else None
        
        # Get company default values from shift policies
        company = obj.company
        default_grace_period = self._get_company_default_grace_period(company)
        default_half_day_duration = self._get_company_default_half_day(company)
        
        if shift:
            shift_start = shift.checkin
            grace_period = shift.grace_period if shift.grace_period else default_grace_period
            half_day_duration = shift.half_day if shift.half_day else default_half_day_duration
            
            # Calculate grace time and half day time
            grace_time = (datetime.combine(today, shift_start) + grace_period).time()
            half_day_time = (datetime.combine(today, shift_start) + half_day_duration).time()
            
            if check_in_time >= half_day_time:
                return 'full_day_leave'
            elif check_in_time >= grace_time:
                return 'half_day'
            else:
                return 'present'
        else:
            # No shift assigned - use company defaults
            default_shift_start = time(9, 0)
            
            grace_time = (datetime.combine(today, default_shift_start) + default_grace_period).time()
            half_day_time = (datetime.combine(today, default_shift_start) + default_half_day_duration).time()
            
            if check_in_time >= half_day_time:
                return 'full_day_leave'
            elif check_in_time >= grace_time:
                return 'half_day'
            else:
                return 'present'
    
    def _get_company_default_grace_period(self, company):
        """Get the default grace period for the company from its shift policies."""
        from .models import ShiftPolicy
        
        shift_policies = ShiftPolicy.objects.filter(company=company)
        
        if shift_policies.exists():
            grace_periods = [shift.grace_period for shift in shift_policies if shift.grace_period]
            if grace_periods:
                return min(grace_periods)
        
        return timedelta(minutes=15)
    
    def _get_company_default_half_day(self, company):
        """Get the default half day duration for the company from its shift policies."""
        from .models import ShiftPolicy
        
        shift_policies = ShiftPolicy.objects.filter(company=company)
        
        if shift_policies.exists():
            half_days = [shift.half_day for shift in shift_policies if shift.half_day]
            if half_days:
                return min(half_days)
        
        return timedelta(hours=4)

        
class PolicyConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyPolicies
        fields = ['id', 'company', 'name', 'document', 'is_active', 'created_at']
        read_only_fields = ['company', 'created_at']

    def update(self, instance, validated_data):
        # Only update document if provided
        document = validated_data.pop('document', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if document:
            instance.document = document
        instance.save()
        return instance

 
 
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
    break_choice_display = serializers.CharField(source='get_break_choice_display', read_only=True)

    class Meta:
        model = BreakConfig
        fields = [
            'id',
            'break_choice',
            'break_choice_display',
            'duration_minutes',
            'enabled'
        ]
             


class UserUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(required=False)
    new_password = serializers.CharField(required=False, write_only=True)

    def validate_username(self, value):
        user = self.context['request'].user
        if UserRegister.objects.filter(username=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value

        
class LetterTemplateSerializer(serializers.ModelSerializer):
    company_details = CompanySerializer(source="company", read_only=True)

    class Meta:
        model = LetterTemplate
        fields = [
            "id", "company", "company_details", "title", "content", "email_content", "created_by", "created_at"
        ]
        read_only_fields = ["id", "company", "created_by", "created_at", "company_details"]

class GeneratedLetterSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedLetter
        fields = '__all__'
        extra_kwargs = {
            'file_path': {'required': False, 'allow_blank': True, 'allow_null': True}
        }

class EmployeeStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'employee_id', 'first_name', 'last_name', 'status']


class ReportingEmployeesSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    department_name = serializers.SerializerMethodField()
    designation_name = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    is_checked_in = serializers.SerializerMethodField()
 
    class Meta:
        model = Employee
        fields = ['id', 'employee_id', 'full_name', 'status', 'department_name', 'designation_name', 'photo', 'is_checked_in']
 
    def get_department_name(self, obj):
        return obj.department.department_name if obj.department else None
 
    def get_designation_name(self, obj):
        return obj.designation.designation_name if obj.designation else None

    def get_photo(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(obj.photo.url)
                except:
                    # Fallback to relative URL if build_absolute_uri fails
                    return obj.photo.url
            return obj.photo.url
        return None
    
    def get_is_checked_in(self, obj):
        """Check if employee is currently checked in (has check_in but no check_out)"""
        from datetime import date
        from .models import Attendance
        
        today = date.today()
        # Check if there's an attendance record for today with check_in but WITHOUT check_out
        attendance = Attendance.objects.filter(
            employee=obj,
            date=today,
            check_in__isnull=False,
            check_out__isnull=True  # Only consider checked in if they haven't checked out
        ).first()
        
        return attendance is not None




class AssignShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'shift_assigned']
 
    # Optional: validate if shift exists
    def validate_shift_assigned(self, value):
        if value is None:
            raise serializers.ValidationError("Shift must be selected")
        return value


class RefreshTokenSerializer(serializers.Serializer):
    refresh = serializers.CharField()
   
    def validate(self, data):
        refresh = data.get("refresh")
        try:
            token = RefreshToken(refresh)
            # Get user from token
            user_id = token.payload.get('user_id')
            if not user_id:
                raise serializers.ValidationError("Invalid refresh token.")
           
            # Get user instance
            user = UserRegister.objects.get(id=user_id)
           
            # Create new refresh token with user data
            new_refresh = RefreshToken.for_user(user)
            new_refresh['username'] = user.username    
            new_refresh['role'] = user.role
           
            return {
                "access": str(new_refresh.access_token)
            }
        except Exception as e:
            raise serializers.ValidationError("Invalid refresh token.")


class SeatBookingSerializer(serializers.ModelSerializer):
    employee_details = serializers.SerializerMethodField()
    seat_details = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = SeatBooking
        fields = ['id', 'seat', 'employee', 'booking_type', 'status', 'start_date', 'end_date', 'start_time', 'end_time', 'is_active', 'created_at', 'employee_details', 'seat_details', 'is_mine']
        read_only_fields = ['created_at', 'employee']  # employee set automatically by viewset

    def validate(self, data):
        seat = data.get('seat')
        start_date = data.get('start_date')
        end_date = data.get('end_date') or start_date
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        # Check 0: Basic Date Sanity
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({"detail": "End date cannot be before start date."})
        
        request = self.context.get('request')
        user = request.user if request else None
        
        # Current booking instance (if updating)
        instance_id = self.instance.id if self.instance else None

        # Check 1: Seat Overlap - Is the seat already booked by ANYONE?
        seat_queryset = SeatBooking.objects.filter(
            seat=seat,
            is_active=True,
            status__in=['pending', 'approved']
        )
        
        if instance_id:
            seat_queryset = seat_queryset.exclude(id=instance_id)
        
        # Date overlap check for seat
        seat_date_overlap = seat_queryset.filter(
            Q(start_date__lte=end_date),
            Q(end_date__gte=start_date) | Q(end_date__isnull=True)
        )
        
        for booking in seat_date_overlap:
            if not start_time or not end_time or not booking.start_time or not booking.end_time:
                raise serializers.ValidationError({"detail": f"Seat {seat.seat_number} is already booked for these dates."})
            if start_time < booking.end_time and end_time > booking.start_time:
                bStart = booking.start_time.strftime('%H:%M') if booking.start_time else '00:00'
                bEnd = booking.end_time.strftime('%H:%M') if booking.end_time else '23:59'
                raise serializers.ValidationError({"detail": f"Seat {seat.seat_number} is already booked during this time: {bStart} to {bEnd}"})

        # Check 2: Employee Overlap - Does the CURRENT EMPLOYEE already have a booking?
        if user and hasattr(user, 'employee'):
            employee = user.employee
            emp_queryset = SeatBooking.objects.filter(
                employee=employee,
                is_active=True,
                status__in=['pending', 'approved']
            )
            
            if instance_id:
                emp_queryset = emp_queryset.exclude(id=instance_id)
                
            emp_date_overlap = emp_queryset.filter(
                Q(start_date__lte=end_date),
                Q(end_date__gte=start_date) | Q(end_date__isnull=True)
            )
            
            for booking in emp_date_overlap:
                if not start_time or not end_time or not booking.start_time or not booking.end_time:
                    raise serializers.ValidationError({"detail": f"You already have a seat booking for these dates."})
                if start_time < booking.end_time and end_time > booking.start_time:
                    bStart = booking.start_time.strftime('%H:%M') if booking.start_time else '00:00'
                    bEnd = booking.end_time.strftime('%H:%M') if booking.end_time else '23:59'
                    raise serializers.ValidationError({"detail": f"You already have a booking for seat {booking.seat.seat_number} during this time: {bStart} to {bEnd}"})

        return data

    def get_employee_details(self, obj):
        return {
            'id': obj.employee.id,
            'name': obj.employee.full_name,
            'employee_id': obj.employee.employee_id
        }

    def get_seat_details(self, obj):
        return {
            "seat_number": obj.seat.seat_number,
            "section": obj.seat.section.name,
            "floor": obj.seat.section.floor.name,
            "floor_id": obj.seat.section.floor.id
        }

    def get_is_mine(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'employee'):
            return obj.employee_id == request.user.employee.id
        return False


# Office Structure Serializers
class OfficeSeatSerializer(serializers.ModelSerializer):
    employee_details = serializers.SerializerMethodField()
    bookings_details = serializers.SerializerMethodField()
    
    class Meta:
        model = OfficeSeat
        fields = ['id', 'section', 'seat_number', 'employee', 'employee_details', 'bookings_details', 'position_x', 'position_y', 'rotation', 'is_available', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_employee_details(self, obj):
        if obj.employee:
            return {
                'id': obj.employee.id,
                'employee_id': obj.employee.employee_id,
                'name': obj.employee.full_name,
                'designation': obj.employee.designation.designation_name if obj.employee.designation else None,
                'photo': obj.employee.photo.url if obj.employee.photo else None
            }
        return None

    def get_bookings_details(self, obj):
        return SeatBookingSerializer(obj.bookings.filter(start_date__gte=timezone.now().date(), is_active=True), many=True).data


class OfficeSectionSerializer(serializers.ModelSerializer):
    seats = OfficeSeatSerializer(many=True, read_only=True)
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    
    class Meta:
        model = OfficeSection
        fields = ['id', 'floor', 'name', 'department', 'department_name', 'position_x', 'position_y', 'width', 'height', 'rotation', 'color', 'seats', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class OfficeLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfficeLocation
        fields = ['id', 'name', 'address', 'company']
        read_only_fields = ['company']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.company:
            validated_data['company'] = request.user.company
        return super().create(validated_data)


class OfficeFloorSerializer(serializers.ModelSerializer):
    sections = OfficeSectionSerializer(many=True, read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = OfficeFloor
        fields = ['id', 'name', 'floor_number', 'description', 'layout_data', 'sections', 'created_at', 'updated_at', 'company', 'location', 'location_name']
        read_only_fields = ['created_at', 'updated_at', 'company']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'company') or not request.user.company:
            raise serializers.ValidationError({"detail": "User account is not associated with a company. Cannot create floors."})
        
        company = request.user.company
        location = validated_data.get('location')
        floor_number = validated_data.get('floor_number')

        if location and location.company != company:
             raise serializers.ValidationError({"detail": "Invalid location selected for your company."})

        # Proactive uniqueness check to prevent 500 IntegrityError
        if OfficeFloor.objects.filter(location=location, floor_number=floor_number).exists():
            raise serializers.ValidationError({"detail": f"Floor number {floor_number} already exists for this office location."})

        validated_data['company'] = company
        return super().create(validated_data)


# Conference Room Serializers
class ConferenceRoomSerializer(serializers.ModelSerializer):
    floor_name = serializers.CharField(source='floor.name', read_only=True)
    class Meta:
        model = ConferenceRoom
        fields = ['id', 'company', 'floor', 'floor_name', 'name', 'capacity', 'layout_element_id', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['company']

class ConferenceRoomBookingSerializer(serializers.ModelSerializer):
    employee_details = serializers.SerializerMethodField(read_only=True)
    room_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ConferenceRoomBooking
        fields = ['id', 'room', 'room_details', 'employee', 'employee_details', 'date', 'start_time', 'end_time', 'status', 'purpose', 'created_at']
        read_only_fields = ['employee', 'status', 'created_at']

    def get_employee_details(self, obj):
        return {
            "name": f"{obj.employee.first_name} {obj.employee.last_name}",
            "employee_id": obj.employee.employee_id
        }
        
    def get_room_details(self, obj):
        return {
            "name": obj.room.name,
            "floor": obj.room.floor.name,
            "floor_id": obj.room.floor.id,
            "layout_element_id": obj.room.layout_element_id
        }

class ConferenceRoomConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConferenceRoomConfig
        fields = ['id', 'company', 'approval_limit_minutes']
        read_only_fields = ['company']


class ReimbursementCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReimbursementCategory
        fields = '__all__'
        read_only_fields = ['company']

class ReimbursementRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    category_name = serializers.SerializerMethodField()
    reporting_manager_name = serializers.SerializerMethodField()

    class Meta:
        model = ReimbursementRequest
        fields = [
            'id', 'company', 'employee', 'employee_name', 'category', 'category_name',
            'custom_category', 'amount', 'description', 'bill_attachment', 'status', 
            'reporting_manager', 'reporting_manager_name', 'rejection_reason', 'created_at', 'updated_at'
        ]
        read_only_fields = ['company', 'employee', 'status', 'reporting_manager', 'rejection_reason', 'created_at', 'updated_at']

    def get_category_name(self, obj):
        if obj.category:
            return obj.category.name
        return obj.custom_category or "Other"

    def get_reporting_manager_name(self, obj):
        if obj.reporting_manager:
            return obj.reporting_manager.full_name
        return None

