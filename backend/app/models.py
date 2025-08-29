from django.db import models
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.conf import settings







#--------------------------- MASTER---------------------------------

class Company(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField()
    location = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
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
    photo = models.ImageField(upload_to='photos', null=True, blank=True)

    # ID proofs
    aadhar_no = models.CharField(max_length=100, null=True, blank=True)
    aadhar_card = models.FileField(upload_to='documents', null=True, blank=True)
    pan_no = models.CharField(max_length=100, null=True, blank=True)
    pan_card = models.FileField(upload_to='documents', null=True, blank=True)

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
    who_referred = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees_referred_by_me'
    )

    # Assets
    asset_details = models.ManyToManyField('AssetInventory', through='EmployeeAssetDetails', blank=True)

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


    @property
    def is_reporting_manager(self):
        return self.employees_reporting_to_me.exists()

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
class RelievedEmployee(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='relieved_info')
    relieving_date = models.DateField()
    remarks = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Relieved: {self.employee}"
      
class AssetInventory(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='assets')
    name = models.CharField(max_length=50)
    description = models.TextField(null=True, blank=True)
    quantity = models.IntegerField(default=0)
    icon_image = models.ImageField(upload_to='company/assets/', null=True, blank=True)

    def __str__(self):
        return self.name


class EmployeeAssetDetails(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='asset_assignments')
    assetinventory = models.ForeignKey(AssetInventory, on_delete=models.CASCADE, related_name='assigned_employees')

    def __str__(self):
        return f"{self.assetinventory.name} → {self.employee.first_name}"


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


class DepartmentWiseWorkingDays(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    shifts = models.ManyToManyField(ShiftPolicy, blank=True)
    working_days_count = models.PositiveSmallIntegerField()
    week_start_day = models.CharField(max_length=10)
    week_end_day = models.CharField(max_length=10)
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
    shift = models.ForeignKey('ShiftPolicy', on_delete=models.SET_NULL, null=True, blank=True)
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
        if self.check_in and self.check_out:
         
            if hasattr(self, 'break_logs'):  
                total_breaks = sum(
                    (break_log.end - break_log.start for break_log in self.break_logs.all() if break_log.end and break_log.start),
                    timezone.timedelta()
                )
            else:
                total_breaks = timezone.timedelta()  # Default to zero if no breaks
            
            work_time = (self.check_out - self.check_in) - total_breaks
            self.total_work_duration = work_time

            if self.shift:
                standard = timezone.timedelta(hours=self.shift.full_day_hours())
                self.overtime_duration = max(work_time - standard, timezone.timedelta())
            else:
                self.overtime_duration = timezone.timedelta()
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

    def __str__(self):
        who = self.employee or self.candidate or self.relieved_employee
        return f"Letter for {who} ({self.template.title})"