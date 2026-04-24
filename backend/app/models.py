from django.db import models
from django.db.models import Q
from django.core.exceptions import ValidationError
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from datetime import time







#--------------------------- MASTER---------------------------------

class Company(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField()
    location = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    gmail_domains = models.TextField(blank=True, null=True)  # comma-separated domains
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    account_no = models.CharField(max_length=50, blank=True, null=True)
    ifsc_code = models.CharField(max_length=20, blank=True, null=True)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class UserRegister(AbstractUser):
    ROLE_CHOICES = [
        ('master', 'Master'),
        ('admin', 'Admin'),
        ('employee', 'Employee'),
    ]
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    email = models.EmailField(unique=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    created_by = models.ForeignKey('self', null=True,blank=True,related_name='created_userregister',on_delete=models.SET_NULL)


    @property
    def employee_profile(self):
        try:
            return Employee.objects.get(user=self)
        except Employee.DoesNotExist:
            return None

    @property
    def is_reporting_manager(self):
        emp = self.employee_profile
        return emp and emp.reportees.exists()

    def __str__(self):
        return self.username


#---------------------------ADMIN---------------------------------

class Department(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    department_name = models.CharField(max_length=100)
    creation_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.department_name} ({self.company.name})"
    
class Level(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    level_name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Employee Level"
        verbose_name_plural = "Employee Levels"
        ordering = ['level_name']

    def __str__(self):
        return f"{self.level_name} ({self.company.name})"

class Designation(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    level = models.ForeignKey(Level, on_delete=models.CASCADE, related_name='designations')
    designation_name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.designation_name} ({self.company.name})"

class DesignationSalary(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='designation_salaries')
    designation = models.OneToOneField(Designation, on_delete=models.CASCADE, related_name='salary_config')
    basic_pay = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.designation.designation_name} - {self.basic_pay} ({self.company.name})"



class ShiftPolicy(models.Model):
    company = models.ForeignKey('Company', on_delete=models.CASCADE, null=True, blank=True)
    shift_type = models.CharField(max_length=20, null=True)
    checkin = models.TimeField()
    checkout = models.TimeField()
    grace_period = models.DurationField(null=True, blank=True)
    half_day = models.DurationField(null=True, blank=True)
    full_day = models.DurationField(null=True, blank=True)

    def __str__(self):
        return f"{self.shift_type} Shift ({self.checkin} - {self.checkout})"

    def full_day_hours(self):
        return round(self.full_day.total_seconds() / 3600, 2) if self.full_day else 8.0

    def half_day_hours(self):
        return round(self.half_day.total_seconds() / 3600, 2) if self.half_day else 4.0

    def grace(self):
        return self.grace_period if self.grace_period else timedelta(minutes=0)


class Employee(models.Model):
    user = models.OneToOneField(UserRegister, on_delete=models.CASCADE, null=True, blank=True)
     # Company linkage
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='employees')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    designation = models.ForeignKey(Designation, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    level = models.ForeignKey(Level, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')

    # Reporting manager — can report to another Employee
    reporting_manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reportees'
    )
    reporting_level = models.ForeignKey(Level,on_delete=models.SET_NULL,null=True,blank=True,related_name='reporting_level')
    
    employee_id = models.CharField(max_length=10, unique=True, null=True)

    # Basic info
    first_name = models.CharField(max_length=100, null=True)
    middle_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100, null=True)

    GENDER_CHOICES = (
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    )
    gender = models.CharField(max_length=50, choices=GENDER_CHOICES, null=True)
    email = models.CharField(max_length=50, null=True)
    date_of_birth = models.DateField(null=True)
    mobile = models.CharField(max_length=11, null=True)
    temporary_address = models.CharField(max_length=255, null=True, blank=True)
    permanent_address = models.CharField(max_length=255, null=True, blank=True)
    photo = models.ImageField(upload_to='employee/photos', null=True, blank=True)

    # ID proofs
    aadhar_no = models.CharField(max_length=100, null=True, blank=True)
    aadhar_card = models.FileField(upload_to='employee/aadhar', null=True, blank=True)
    pan_no = models.CharField(max_length=100, null=True, blank=True)
    pan_card = models.FileField(upload_to='employee/pancard', null=True, blank=True)

    # Family & emergency
    guardian_name = models.CharField(max_length=100, null=True, blank=True)
    guardian_mobile = models.CharField(max_length=100, null=True, blank=True)
    category = models.CharField(max_length=100, null=True, blank=True)

   
    # Job details
    date_of_joining = models.DateField(null=True, blank=True)
    previous_employer = models.CharField(max_length=100, null=True, blank=True)
    date_of_releaving = models.DateField(null=True, blank=True)
    previous_designation_name = models.CharField(max_length=100, null=True, blank=True)
    previous_salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0.0)
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0.0)
    ctc = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0.0)
    gross_salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0.0)

    # EPF
    EPF_STATUS_CHOICES = (
        ('yes', 'Yes'),
        ('no', 'No'),
    )
    epf_status = models.CharField(max_length=50, choices=EPF_STATUS_CHOICES, null=True, blank=True)
    uan = models.CharField(max_length=50, null=True, blank=True)

    # Referral source
    SOURCE_CHOICES = (
        ('internalreference', 'Internal Reference'),
        ('linkedin', 'LinkedIn'),
        ('walkin', 'Walk In'),
        ('socialmedia', 'Social Media'),
    )
    source_of_employment = models.CharField(max_length=50, choices=SOURCE_CHOICES, null=True, blank=True)
    # who_referred = models.ForeignKey(
    #     'self',
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name='employees_referred_by_me'
    # )
    who_referred = models.CharField(max_length=100, null=True, blank=True)
    shift_assigned=models.ForeignKey(ShiftPolicy,on_delete=models.SET_NULL,null=True,blank=True,related_name='shift_employee')
    
    # Consumable supply items (joiner kits, peripherals) — see SupplyItem / EmployeeSupplyAssignment
    supply_items = models.ManyToManyField('SupplyItem', through='EmployeeSupplyAssignment', blank=True, related_name='employees_assigned')

    # Bank & payment
    PAYMENT_CHOICES = (
        ('cash', 'Cash'),
        ('bank', 'Bank'),
    )
    payment_method = models.CharField(max_length=50, choices=PAYMENT_CHOICES, null=True, blank=True)
    account_no = models.CharField(max_length=20, null=True, blank=True)
    ifsc_code = models.CharField(max_length=20, null=True, blank=True)
    bank_name = models.CharField(max_length=50, null=True, blank=True)

    # ESIC
    ESIC_STATUS = (
        ('yes', 'Yes'),
        ('no', 'No'),
    )
    esic_status = models.CharField(max_length=50, choices=ESIC_STATUS, null=True, blank=True)
    esic_no = models.CharField(max_length=50, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    gmail_connected = models.BooleanField(default=False)

    STATUS_CHOICES = [
        ('online', 'Online'),
        ('away', 'Away'),
        ('dnd', 'Do Not Disturb'),
        ('offline', 'Offline'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='offline')
    last_active = models.DateTimeField(auto_now=True)

    @property
    def is_reporting_manager(self):
        return self.employees_reporting_to_me.exists()

    @property
    def full_name(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip() or (self.user.username if self.user else "Unknown")

    def save(self, *args, **kwargs):
        if not self.employee_id:
            prefix = "EMP"
            # Use total count + 1 as starting point
            count = Employee.objects.all().count()
            new_num = count + 1
            candidate = f"{prefix}{new_num:04d}"
            # Ensure uniqueness
            while Employee.objects.filter(employee_id=candidate).exists():
                new_num += 1
                candidate = f"{prefix}{new_num:04d}"
            self.employee_id = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.full_name
    
class RelievedEmployee(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='relieved_info')
    relieving_date = models.DateField()
    remarks = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Relieved: {self.employee}"

#---------------------------ASSETS---------------------------------
class FixedAsset(models.Model):
    """Serialized IT / furniture (core assets).

    Optional link to a variable (SKU) row in :class:`SupplyItem` when this physical unit
    corresponds to a catalog line (e.g. same model as tracked stock / reorder).
    """

    STATUS_CHOICES = [
        ('in_use', 'In-Use'),
        ('repair', 'Repair'),
        ('available', 'Available'),
        ('scrapped', 'Scrapped'),
    ]
    CATEGORY_CHOICES = [
        ('laptop', 'Laptop'),
        ('monitor', 'Monitor'),
        ('server', 'Server'),
        ('furniture', 'Furniture'),
        ('other', 'Other'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='fixed_assets')
    variable_supply_item = models.ForeignKey(
        'SupplyItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='core_asset_instances',
        help_text='Variable (SKU) catalog row this core unit is tied to, if applicable.',
    )
    asset_tag = models.CharField(max_length=64)
    serial_number = models.CharField(max_length=128, blank=True, null=True)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default='other')
    model_brand = models.CharField(max_length=255, blank=True, null=True)
    purchase_date = models.DateField(null=True, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    assigned_to = models.ForeignKey(
        'Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fixed_assets_assigned',
    )
    assignment_date = models.DateField(null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['asset_tag']
        constraints = [
            models.UniqueConstraint(fields=['company', 'asset_tag'], name='uniq_fixed_asset_tag_per_company'),
        ]

    def __str__(self):
        return f"{self.asset_tag} ({self.company_id})"

    def clean(self):
        if self.status == 'available':
            if self.assigned_to_id or self.assignment_date:
                raise ValidationError('Available assets must not have assignee or assignment date.')
        if self.status == 'in_use' and not self.assigned_to_id:
            raise ValidationError('In-use assets must have an assignee.')
        super().clean()

    def save(self, *args, **kwargs):
        if self.status == 'available':
            self.assigned_to = None
            self.assignment_date = None
        super().save(*args, **kwargs)


class SupplyItem(models.Model):
    """Variable assets: SKU / cabinet stock (supply stack).

    Item code, name, sub-category, stock levels, reorder, pricing, vendor, UoM — the
    canonical catalog for consumables; core :class:`FixedAsset` rows may optionally
    reference one row here when a serialized unit maps to that SKU.
    """

    SUBCATEGORY_CHOICES = [
        ('peripherals', 'Peripherals'),
        ('stationery', 'Stationery'),
        ('swag', 'Swag'),
        ('cables', 'Cables'),
        ('other', 'Other'),
    ]
    UOM_CHOICES = [
        ('pcs', 'Pcs'),
        ('box', 'Box'),
        ('pack', 'Pack'),
        ('meters', 'Meters'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='supply_items')
    item_code = models.CharField(max_length=64)
    item_name = models.CharField(max_length=255)
    sub_category = models.CharField(max_length=32, choices=SUBCATEGORY_CHOICES, default='other')
    total_stock = models.PositiveIntegerField(default=0)
    available_quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    last_restocked = models.DateField(null=True, blank=True)
    vendor_details = models.TextField(blank=True, null=True)
    unit_of_measure = models.CharField(max_length=16, choices=UOM_CHOICES, default='pcs')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['item_code']
        constraints = [
            models.UniqueConstraint(fields=['company', 'item_code'], name='uniq_supply_item_code_per_company'),
        ]

    def __str__(self):
        return f"{self.item_code} — {self.item_name}"

    def clean(self):
        if self.available_quantity > self.total_stock:
            raise ValidationError('Available quantity cannot exceed total stock.')
        super().clean()


class EmployeeSupplyAssignment(models.Model):
    """One row = one unit of a supply item issued to an employee."""

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='supply_assignments')
    supply_item = models.ForeignKey(SupplyItem, on_delete=models.CASCADE, related_name='supply_assignments')

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.supply_item.item_code} → {self.employee_id}"


class AssetRequest(models.Model):
    """Intake / approval for asset or supply needs."""

    APPROVAL_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='asset_requests')
    requested_by = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='asset_requests_submitted')
    approval_status = models.CharField(max_length=16, choices=APPROVAL_CHOICES, default='pending')
    remarks = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='asset_requests/', null=True, blank=True)
    related_fixed_asset = models.ForeignKey(
        FixedAsset, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests'
    )
    related_supply_item = models.ForeignKey(
        SupplyItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']


class AssetSupportingDocument(models.Model):
    """Optional file attached to a fixed asset, supply item, or request (exactly one parent)."""

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='asset_documents')
    title = models.CharField(max_length=255, blank=True, null=True)
    file = models.FileField(upload_to='asset_documents/%Y/%m/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_asset_documents',
    )
    fixed_asset = models.ForeignKey(FixedAsset, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    supply_item = models.ForeignKey(SupplyItem, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    asset_request = models.ForeignKey(AssetRequest, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')

    class Meta:
        ordering = ['-uploaded_at']
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(fixed_asset__isnull=False, supply_item__isnull=True, asset_request__isnull=True)
                    | Q(fixed_asset__isnull=True, supply_item__isnull=False, asset_request__isnull=True)
                    | Q(fixed_asset__isnull=True, supply_item__isnull=True, asset_request__isnull=False)
                ),
                name='asset_doc_exactly_one_parent',
            ),
        ]

    def clean(self):
        parents = sum(
            1
            for p in (self.fixed_asset_id, self.supply_item_id, self.asset_request_id)
            if p
        )
        if parents != 1:
            raise ValidationError('Document must be linked to exactly one of fixed asset, supply item, or request.')
        super().clean()


class Recruitment(models.Model):
    STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('selected', 'Selected'),
        ('rejected', 'Rejected'),
    ]

    reference_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    email = models.EmailField()
    address = models.CharField(max_length=255, null=True, blank=True)
    job_title = models.CharField(max_length=100)
    salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    application_date = models.DateField(null=True, blank=True)
    interview_date = models.DateField(null=True, blank=True)
    appointment_date = models.DateField(null=True, blank=True)
    guardian_name = models.CharField(max_length=100, null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')

    def save(self, *args, **kwargs):
        if not self.reference_id:
            last = Recruitment.objects.order_by('-id').first()
            last_id = last.id if last else 0
            self.reference_id = f"REF{1000 + last_id + 1}"
        super().save(*args, **kwargs)


class Leave(models.Model):
    company = models.ForeignKey(Company,on_delete=models.CASCADE,null=True,blank=True,related_name='leaves')
    leave_name = models.CharField(max_length=50, null=True)
    count = models.PositiveIntegerField(default=0)
    is_paid = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.leave_name} ({'Paid' if self.is_paid else 'Unpaid'})"

class EmpLeave(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    reporting_manager = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='leave_approvals'
    )
    leave_type = models.ForeignKey(Leave, on_delete=models.SET_NULL, null=True, blank=True)

    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Cancelled', 'Cancelled')
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    reason = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    from_date = models.DateField()
    to_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee} Leave: {self.leave_type} ({self.status})"


class LearningCorner(models.Model):
    title = models.CharField(max_length=255, null=True)
    description = models.TextField(null=True)
    image = models.ImageField(upload_to='learning_corner/images', null=True, blank=True)
    document = models.FileField(upload_to='learning_corner/documents', null=True, blank=True)
    video = models.FileField(upload_to='learning_corner/videos', null=True, blank=True)

    company = models.ForeignKey('Company', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.title or "Untitled"


class Notification(models.Model):  
    title = models.CharField(max_length=255, null=True)
    description = models.TextField(null=True, blank=True)
    date = models.DateField(null=True)
    company = models.ForeignKey('Company', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.title or "Untitled"


class DepartmentWiseWorkingDays(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    shifts = models.ManyToManyField(ShiftPolicy, blank=True)
    working_days_count = models.PositiveSmallIntegerField()
    
    week_start_day = models.CharField(max_length=10, null=True, blank=True)
    week_end_day = models.CharField(max_length=10, null=True, blank=True)
    
    working_days = models.JSONField(default=list, blank=True, null=True)
    weekend_days = models.JSONField(default=list, blank=True, null=True)
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE,null=True,blank=True)

    def __str__(self):
        shifts_display = ", ".join(str(s) for s in self.shifts.all()) if self.shifts.exists() else "All"
        return f"{self.department} - {shifts_display} ({self.week_start_day} to {self.week_end_day})"

    class Meta:
        verbose_name_plural = "Department Wise Working Days"
        
class CalendarEvent(models.Model):
    company = models.ForeignKey('Company', on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    date = models.DateField()
    description = models.TextField(blank=True)
    is_holiday = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.date})"

    class Meta:
        ordering = ['date']
        
        
class SalaryStructure(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='salary_structures')
    name = models.CharField(max_length=100, null=True, blank=True)  # optional descriptive name
    basic_percent = models.DecimalField(max_digits=5, decimal_places=2)
    hra_percent = models.DecimalField(max_digits=5, decimal_places=2)
    conveyance_percent = models.DecimalField(max_digits=5, decimal_places=2,null=True, blank=True)
    medical_percent = models.DecimalField(max_digits=5, decimal_places=2,null=True, blank=True)
    special_percent = models.DecimalField(max_digits=5, decimal_places=2,null=True, blank=True)
    service_charge_percent = models.DecimalField(max_digits=5, decimal_places=2,null=True, blank=True)
    total_working_days = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company.name} - {self.name or 'Structure'}"


class DeductionPolicy(models.Model):
    salary_structure = models.ForeignKey(SalaryStructure, on_delete=models.CASCADE, related_name='deductions')
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.amount})"


class AllowanceType(models.Model):
    salary_structure = models.ForeignKey(SalaryStructure, on_delete=models.CASCADE, related_name='allowances')
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.amount})"

class GrossSalaryComponent(models.Model):
    """Dynamic earning components added to gross salary (e.g., HRA, Special Allowance).
    Company-wide: applies to all employees of this company."""
    CALC_TYPE_CHOICES = (
        ('percentage', 'Percentage of Basic'),
        ('fixed', 'Fixed Amount'),
    )
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='gross_components')
    name = models.CharField(max_length=100)
    calc_type = models.CharField(max_length=20, choices=CALC_TYPE_CHOICES, default='fixed')
    value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} - {self.calc_type} ({self.value})"


class SalaryDeductionComponent(models.Model):
    """Dynamic deduction components (e.g., PF, ESI, Professional Tax).
    Company-wide: applies to all employees of this company."""
    CALC_TYPE_CHOICES = (
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    )
    DEDUCT_FROM_CHOICES = (
        ('basic', 'Basic Salary'),
        ('gross', 'Gross Salary'),
    )
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='deduction_components')
    name = models.CharField(max_length=100)
    calc_type = models.CharField(max_length=20, choices=CALC_TYPE_CHOICES, default='fixed')
    value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deduct_from = models.CharField(max_length=10, choices=DEDUCT_FROM_CHOICES, default='gross')
    has_threshold = models.BooleanField(default=False)
    threshold_on = models.CharField(max_length=10, choices=DEDUCT_FROM_CHOICES, default='gross', blank=True)
    threshold_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} - {self.calc_type} from {self.deduct_from} ({self.value})"


class PayrollBatch(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='payroll_batches')
    month = models.IntegerField()
    year = models.IntegerField()
    status = models.CharField(max_length=10, choices=[('Draft', 'Draft'), ('Locked', 'Locked')])

    def __str__(self):
        return f"{self.company.name} - {self.month}/{self.year} ({self.status})"


class Payroll(models.Model):
    batch = models.ForeignKey(PayrollBatch, on_delete=models.CASCADE, related_name='payrolls')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='payrolls')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    salary_structure = models.ForeignKey(SalaryStructure, on_delete=models.SET_NULL, null=True)

    gross_salary = models.DecimalField(max_digits=10, decimal_places=2)
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2)
    hra = models.DecimalField(max_digits=10, decimal_places=2)
    conveyance = models.DecimalField(max_digits=10, decimal_places=2)
    medical = models.DecimalField(max_digits=10, decimal_places=2)
    special_allowance = models.DecimalField(max_digits=10, decimal_places=2)
    service_charges = models.DecimalField(max_digits=10, decimal_places=2)
    pf = models.DecimalField(max_digits=10, decimal_places=2)
    income_tax = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    net_pay = models.DecimalField(max_digits=10, decimal_places=2)

    payroll_date = models.DateField(auto_now_add=True)
    total_working_days = models.PositiveIntegerField(null=True, blank=True)
    days_paid = models.PositiveIntegerField(null=True, blank=True)
    loss_of_pay_days = models.PositiveIntegerField(null=True, blank=True)

    # Optional: JSON for extra items
    other_allowances = models.JSONField(null=True, blank=True)
    other_deductions = models.JSONField(null=True, blank=True)

    payroll_date = models.DateField(default=timezone.now)
    
    def __str__(self):
        return f"{self.employee} - {self.batch}"


class IncomeTaxConfig(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='tax_configs')
    name = models.CharField(max_length=100)
    salary_from = models.DecimalField(max_digits=10, decimal_places=2)
    salary_to = models.DecimalField(max_digits=10, decimal_places=2)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2)

    def __str__(self):
        return f"{self.name}: {self.salary_from}-{self.salary_to} @ {self.tax_percent}%"


class Attendance(models.Model):
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='attendances')
    company = models.ForeignKey('Company', on_delete=models.CASCADE, related_name='attendances')
    # shift = models.ForeignKey('ShiftPolicy', on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField(default=timezone.now)
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    total_work_duration = models.DurationField(null=True, blank=True)
    total_break_time = models.TimeField(null=True)
    overtime_duration = models.DurationField(null=True, blank=True)
    is_present = models.BooleanField(default=True)
    leave = models.ForeignKey('EmpLeave', on_delete=models.SET_NULL, null=True, blank=True)
    remarks = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_work_duration(self):
        if not self.check_in or not self.check_out:
            self.total_work_duration = None
            self.overtime_duration = None
            self.total_break_time = None
            self.save()
            return

        # Total breaks
        if hasattr(self, 'break_logs'):
            total_breaks = sum(
                (b.end - b.start for b in self.break_logs.all() if b.start and b.end),
                timedelta()
            )
        else:
            total_breaks = timedelta()

        # Total worked time minus breaks
        work_time = (self.check_out - self.check_in) - total_breaks
        self.total_work_duration = work_time

        # Overtime
        active_shift = getattr(self.employee, 'shift_assigned', None)
        if active_shift:
            standard_hours = timedelta(hours=active_shift.full_day_hours())
            self.overtime_duration = max(work_time - standard_hours, timedelta())
        else:
            self.overtime_duration = timedelta()

        # Convert break duration to time object
        hours = total_breaks.seconds // 3600
        minutes = (total_breaks.seconds % 3600) // 60
        self.total_break_time = time(hour=hours, minute=minutes)

        self.save()


class BreakConfig(models.Model):
    BREAK_CHOICES = [
        ('dont_disturb', "Don't Disturb"),
        ('short_break', 'Short Break'),
        ('meal_break', 'Meal Break'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='break_configs')
    break_choice = models.CharField(max_length=20, choices=BREAK_CHOICES,null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)  # Null for Don't Disturb
    enabled = models.BooleanField(default=True) 

    def __str__(self):
        if self.duration_minutes:
            return f"{self.company} - {self.get_break_choice_display()} ({self.duration_minutes} min)"
        return f"{self.company} - {self.get_break_choice_display()} (No fixed duration)"


class BreakLog(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='break_logs', null=True, blank=True)
    attendance = models.ForeignKey('Attendance', on_delete=models.CASCADE, null=True, related_name='break_logs')
    break_config = models.ForeignKey(BreakConfig, on_delete=models.SET_NULL, null=True, blank=True)
    start = models.DateTimeField(null=True, blank=True)
    end = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.employee} - {self.break_config} ({self.start} - {self.end})"

    
class CompanyPolicies(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='policies')
    name = models.CharField(max_length=200)
    document = models.FileField(upload_to='policies/')  
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company.name} - {self.name}"
    
    
    
class LetterTemplate(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="letter_templates")
    title = models.CharField(max_length=255)
    content = models.TextField()  
    email_content = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.company.name})"
    
class GeneratedLetter(models.Model):
    LETTER_TYPE_CHOICES = [
        ('offer', 'Offer'),
        ('appointment', 'Appointment'),
        ('relieve', 'Relieve'),
    ]
    type = models.CharField(max_length=20, choices=LETTER_TYPE_CHOICES, null=True, blank=True)
    template = models.ForeignKey(LetterTemplate, on_delete=models.CASCADE)
    employee = models.ForeignKey(Employee, null=True, blank=True, on_delete=models.CASCADE)
    candidate = models.ForeignKey(Recruitment, null=True, blank=True, on_delete=models.CASCADE)
    relieved_employee = models.ForeignKey(RelievedEmployee, null=True, blank=True, on_delete=models.CASCADE)
    file_path = models.CharField(max_length=512, blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    content = models.TextField(null=True, blank=True)
    title = models.CharField(max_length=255, blank=True, null=True)  
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        who = self.employee or self.candidate or self.relieved_employee
        return f"Letter for {who} ({self.template.title})"

class OfficeLocation(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='office_locations')
    name = models.CharField(max_length=100)
    address = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class OfficeFloor(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='office_floors')
    location = models.ForeignKey(OfficeLocation, on_delete=models.CASCADE, related_name='floors', null=True, blank=True)
    name = models.CharField(max_length=100)
    floor_number = models.IntegerField()
    description = models.TextField(null=True, blank=True)
    # layout_data stores the Konva stage JSON (walls, zones, doors, etc.)
    layout_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['floor_number']
        unique_together = ['location', 'floor_number']

    def __str__(self):
        branch = self.location.name if self.location else "No Location"
        return f"{self.name} - Floor {self.floor_number} ({branch})"


class OfficeSection(models.Model):
    floor = models.ForeignKey(OfficeFloor, on_delete=models.CASCADE, related_name='sections')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='office_sections')
    name = models.CharField(max_length=100)
    position_x = models.FloatField(default=0)  # X coordinate for visual layout
    position_y = models.FloatField(default=0)  # Y coordinate for visual layout
    width = models.FloatField(default=200)     # Width in pixels
    height = models.FloatField(default=150)    # Height in pixels
    rotation = models.FloatField(default=0)    # Rotation angle in degrees (0, 90, 180, 270)
    color = models.CharField(max_length=7, default='#3B82F6')  # Hex color for team coding
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        dept_name = self.department.department_name if self.department else "Unassigned"
        return f"{self.name} ({dept_name}) - {self.floor.name}"


class OfficeSeat(models.Model):
    section = models.ForeignKey(OfficeSection, on_delete=models.CASCADE, related_name='seats')
    seat_number = models.CharField(max_length=20)
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_seat')
    position_x = models.FloatField(default=0)  # X coordinate within section
    position_y = models.FloatField(default=0)  # Y coordinate within section
    rotation = models.FloatField(default=0)  # Rotation angle in degrees (0, 90, 180, 270)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['section', 'seat_number']

    def __str__(self):
        emp_name = f"{self.employee.full_name}" if self.employee else "Vacant"
        return f"Seat {self.seat_number} - {emp_name}"


class EmailOTP(models.Model):
    email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6)
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=5)  

class SeatBooking(models.Model):
    BOOKING_TYPES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('permanent', 'Permanent'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    seat = models.ForeignKey(OfficeSeat, on_delete=models.CASCADE, related_name='bookings')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='seat_bookings')
    booking_type = models.CharField(max_length=20, choices=BOOKING_TYPES, default='daily')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True) # Null for permanent
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # For daily bookings, only one person per seat per day. 
        # For weekly/permanent, we'll need to check overlap in the serializer/view.
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.employee} booked {self.seat} ({self.booking_type})"


# --------------------------- CONFERENCE ROOM MANAGEMENT ---------------------------------

class ConferenceRoom(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='conference_rooms')
    floor = models.ForeignKey('OfficeFloor', on_delete=models.CASCADE, related_name='conference_rooms')
    name = models.CharField(max_length=100)
    capacity = models.IntegerField(default=0)
    layout_element_id = models.CharField(max_length=100, blank=True, null=True) # ID from Konva layout
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.floor.name})"

class ConferenceRoomBooking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    room = models.ForeignKey(ConferenceRoom, on_delete=models.CASCADE, related_name='bookings')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='room_bookings')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    purpose = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-start_time']

    def __str__(self):
        return f"{self.employee} - {self.room} on {self.date}"

class ConferenceRoomConfig(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='room_config')
    approval_limit_minutes = models.IntegerField(default=120)

    def __str__(self):
        return f"Config for {self.company.name}"


# --------------------------- CHAT ---------------------------------
class ChatConversation(models.Model):
    TYPE_CHOICES = [
        ("dm", "Direct Message"),
        ("group", "Group"),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="chat_conversations")
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    name = models.CharField(max_length=255, blank=True, null=True)  # required for group
    created_by = models.ForeignKey(UserRegister, on_delete=models.SET_NULL, null=True, related_name="created_chat_conversations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company_id}:{self.type}:{self.name or self.id}"


class ChatConversationMember(models.Model):
    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("member", "Member"),
        ("viewer", "Viewer"),
    ]

    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(UserRegister, on_delete=models.CASCADE, related_name="chat_memberships")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="member")

    can_add_members = models.BooleanField(default=False)
    can_remove_members = models.BooleanField(default=False)
    can_revoke_roles = models.BooleanField(default=False)

    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = [("conversation", "user")]

    def __str__(self):
        return f"{self.conversation_id}:{self.user_id}:{self.role}"


class ChatMessage(models.Model):
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name="messages")
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="chat_messages")
    sender = models.ForeignKey(UserRegister, on_delete=models.SET_NULL, null=True, related_name="sent_chat_messages")
    content = models.TextField()
    attachment = models.FileField(upload_to="chat_attachments/", null=True, blank=True)
    attachment_name = models.CharField(max_length=255, null=True, blank=True)
    attachment_mime = models.CharField(max_length=150, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.conversation_id}:{self.sender_id}:{self.created_at}"

# --------------------------- REIMBURSEMENT MANAGEMENT ---------------------------------

class ReimbursementCategory(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='reimbursement_categories')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.company.name})"

class ReimbursementRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='reimbursement_requests')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='reimbursements')
    category = models.ForeignKey(ReimbursementCategory, on_delete=models.SET_NULL, null=True, blank=True)
    custom_category = models.CharField(max_length=100, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    bill_attachment = models.FileField(upload_to='reimbursements/bills/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reporting_manager = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='reimbursement_approvals')
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.full_name} - {self.category.name if self.category else self.custom_category} - {self.amount}"

class FinalizedSalary(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='finalized_salaries')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='finalized_salaries')
    from_date = models.DateField()
    to_date = models.DateField()
    
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2)
    earned_basic = models.DecimalField(max_digits=10, decimal_places=2)
    ot_pay = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ot_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    total_gross = models.DecimalField(max_digits=10, decimal_places=2)
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2)
    days_paid = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Store JSON of components and flags (gChk, dChk, otEnabled)
    config = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('employee', 'from_date', 'to_date')
        ordering = ['-from_date', 'employee']

    def __str__(self):
        return f"Finalized Salary {self.employee.full_name} ({self.from_date} to {self.to_date})"
