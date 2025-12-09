from rest_framework import serializers
from datetime import datetime, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
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

    class Meta:
        model = UserRegister
        fields = ['id', 'username', 'email', 'password', 'role', 'is_active', 'first_name', 'last_name', 'company', 'company_name']
        read_only_fields = ['created_by'] 

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

    def validate_role(self, value):
        if value not in ['master', 'admin', 'employee']:
            raise serializers.ValidationError("Role must be master, admin, or employee.")
        return value

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
    admin_id = serializers.SerializerMethodField(read_only=True)
    admin_username = serializers.SerializerMethodField(read_only=True)
    admin_email = serializers.SerializerMethodField(read_only=True)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id', 'name', 'address', 'location', 'email', 'phone_number',
            'logo', 'logo_url', 'admin', 'admin_id', 'admin_username', 'admin_email'
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
        
        return instance


    def create(self, validated_data):
        admin_id = validated_data.pop('admin', None)
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
                send_mail(
                    subject,
                    message,
                    None,  # uses DEFAULT_FROM_EMAIL
                    [admin_user.email],
                    fail_silently=False,
                )
            except UserRegister.DoesNotExist:
                raise serializers.ValidationError({"admin": "Admin user not found."})

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
    shift_assigned = ShiftPolicySerializer(read_only=True)

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
            'source_choices', 'shift_assigned'
        ]

    def get_department_name(self, obj):
        return obj.department.department_name if obj.department else None

    def get_designation_name(self, obj):
        return obj.designation.designation_name if obj.designation else None

    def get_asset_names(self, obj):
        if not obj.id:
            return []
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
            if not email:
                raise serializers.ValidationError({"email": "Email is required for employee creation."})
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
        username = self.generate_username(validated_data)
        password = get_random_string(8)

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
                company=admin_user.company
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
                        company=admin_user.company
                    )
                else:
                    raise serializers.ValidationError({"error": f"Database constraint violation: {str(e)}"})
            else:
                raise

        validated_data['company'] = admin_user.company
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

        # Convert asset IDs to AssetInventory instances if needed
        asset_instances = []
        for asset in assets:
            if isinstance(asset, int):
                asset_obj = AssetInventory.objects.get(pk=asset)
            else:
                asset_obj = asset
            if asset_obj.quantity <= 0:
                raise serializers.ValidationError(f"Asset '{asset_obj.name}' is out of stock.")
            asset_obj.quantity -= 1
            asset_obj.save()
            EmployeeAssetDetails.objects.create(employee=employee, assetinventory=asset_obj)

        self.send_welcome_email(user, password)

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
            'week_start_day', 'week_end_day', 'company'
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
        try:
            return SeatBookingSerializer(obj.bookings.filter(booking_date__gte=timezone.now().date()), many=True).data
        except NameError:
             # Handle circular dependency if SeatBookingSerializer isn't defined yet
             return []

class SeatBookingSerializer(serializers.ModelSerializer):
    employee_details = serializers.SerializerMethodField()
    seat_details = serializers.SerializerMethodField()

    class Meta:
        model = SeatBooking
        fields = ['id', 'seat', 'employee', 'booking_date', 'created_at', 'employee_details', 'seat_details']
        read_only_fields = ['created_at']

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


class OfficeSectionSerializer(serializers.ModelSerializer):
    seats = OfficeSeatSerializer(many=True, read_only=True)
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    
    class Meta:
        model = OfficeSection
        fields = ['id', 'floor', 'name', 'department', 'department_name', 'position_x', 'position_y', 'width', 'height', 'rotation', 'color', 'seats', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class OfficeFloorSerializer(serializers.ModelSerializer):
    sections = OfficeSectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = OfficeFloor
        fields = ['id', 'name', 'floor_number', 'description', 'sections', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'company']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.company:
            validated_data['company'] = request.user.company
        return super().create(validated_data)

