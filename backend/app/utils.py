import qrcode
import base64
import math
from io import BytesIO
from weasyprint import HTML
from django.utils import timezone
from django.conf import settings
from django.template.loader import render_to_string
import os
import calendar
from decimal import Decimal, ROUND_HALF_UP


def number_to_words(n):
    """Convert a number to Indian English words (e.g. 30000 -> 'Thirty Thousand Rupees Only')."""
    if n is None:
        return ''
    n = float(n)
    if n == 0:
        return 'Zero Rupees Only'

    ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    def two_digits(num):
        if num < 20:
            return ones[num]
        return tens[num // 10] + ((' ' + ones[num % 10]) if num % 10 else '')

    def three_digits(num):
        if num >= 100:
            return ones[num // 100] + ' Hundred' + ((' and ' + two_digits(num % 100)) if num % 100 else '')
        return two_digits(num)

    rupees = int(n)
    paise = round((n - rupees) * 100)

    if rupees == 0:
        result = ''
    else:
        # Indian numbering: Crore, Lakh, Thousand, Hundred
        parts = []
        if rupees >= 10000000:
            parts.append(two_digits(rupees // 10000000) + ' Crore')
            rupees %= 10000000
        if rupees >= 100000:
            parts.append(two_digits(rupees // 100000) + ' Lakh')
            rupees %= 100000
        if rupees >= 1000:
            parts.append(two_digits(rupees // 1000) + ' Thousand')
            rupees %= 1000
        if rupees > 0:
            parts.append(three_digits(rupees))
        result = ' '.join(parts) + ' Rupees'

    if paise > 0:
        result += (' and ' if result else '') + two_digits(paise) + ' Paise'

    return (result + ' Only').strip()


def compute_attendance_metrics(employee, start_date, end_date):
    """
    Computes attendance metrics for an employee between two dates.
    Shared logic to be used by rollout dashboard, payslip generation, and reports.
    """
    from app.models import CalendarEvent, DepartmentWiseWorkingDays, Attendance, EmpLeave
    from datetime import timedelta

    # 1. Setup Configs
    holiday_dates = set(CalendarEvent.objects.filter(
        company=employee.company, is_holiday=True, date__gte=start_date, date__lte=end_date
    ).values_list('date', flat=True))

    cfg = DepartmentWiseWorkingDays.objects.filter(company=employee.company, department=employee.department).first()
    weekend_days = [d.lower() for d in cfg.weekend_days] if cfg and cfg.weekend_days else ["saturday", "sunday"]

    shift = employee.shift_assigned
    s_full = shift.full_day_hours() if shift else 8.0
    s_half = shift.half_day_hours() if shift else 4.0

    # 2. Fetch Data
    attendances = Attendance.objects.filter(
        employee=employee, date__gte=start_date, date__lte=end_date
    ).select_related('leave', 'leave__leave_type')
    att_map = {att.date: att for att in attendances}

    leaves = EmpLeave.objects.filter(
        employee=employee, status='Approved', from_date__lte=end_date, to_date__gte=start_date
    ).select_related('leave_type')

    paid_leave_dates = set()
    unpaid_leave_dates = set()
    for lv in leaves:
        l_start = max(lv.from_date, start_date)
        l_end = min(lv.to_date, end_date)
        curr = l_start
        while curr <= l_end:
            if lv.leave_type and lv.leave_type.is_paid:
                paid_leave_dates.add(curr)
            else:
                unpaid_leave_dates.add(curr)
            curr += timedelta(days=1)

    # 3. Calculate Daily
    present_days = 0
    half_days = 0
    expected_working_days = 0
    total_overtime_seconds = 0
    checked_in_days = 0
    absent_days = 0

    curr = start_date
    while curr <= end_date:
        day_name = curr.strftime('%A').lower()
        is_holiday = curr in holiday_dates
        is_weekend = day_name in weekend_days
        is_work_day = not is_holiday and not is_weekend

        if is_work_day:
            expected_working_days += 1

        att = att_map.get(curr)
        if att:
            if is_holiday or is_weekend:
                # OT Calculation
                if att.total_work_duration:
                    total_overtime_seconds += att.total_work_duration.total_seconds()
                elif att.check_in and att.check_out:
                    total_overtime_seconds += (att.check_out - att.check_in).total_seconds()
            else:
                # Work Day Attendance
                if att.leave:
                    pass # Handled by leave dates
                elif att.check_in and not att.check_out:
                    checked_in_days += 1
                else:
                    w_hours = 0.0
                    if att.total_work_duration:
                        w_hours = att.total_work_duration.total_seconds() / 3600
                    elif att.check_in and att.check_out:
                        w_hours = (att.check_out - att.check_in).total_seconds() / 3600

                    if w_hours >= s_full:
                        present_days += 1
                    elif w_hours >= s_half:
                        half_days += 1
                    else:
                        absent_days += 1

                if att.overtime_duration:
                    total_overtime_seconds += att.overtime_duration.total_seconds()
        
        elif curr in paid_leave_dates or curr in unpaid_leave_dates:
            pass
        elif is_work_day:
            absent_days += 1

        curr += timedelta(days=1)

    return {
        'present_days': present_days,
        'half_days': half_days,
        'paid_leaves': len(paid_leave_dates),
        'unpaid_leaves': len(unpaid_leave_dates),
        'expected_working_days': expected_working_days,
        'absent_days': absent_days,
        'overtime_hours': round(total_overtime_seconds / 3600, 2),
        'checked_in_days': checked_in_days,
    }


def compute_loan_emi(employee, start_date, end_date):
    """Calculates total loan EMI due for an employee in a given period."""
    from app.models import LoanApplication
    import calendar
    from datetime import timedelta
    
    total_emi = Decimal('0.00')
    loans = LoanApplication.objects.filter(employee=employee.user, status__in=['APPROVED', 'CLEARED'])
    
    for l in loans:
        loan_start = l.created_at.date()
        repayment_day = loan_start.day
        
        # Calculate end date of loan
        m_total = loan_start.month + l.repayment_months
        e_year = loan_start.year + (m_total - 1) // 12
        e_month = (m_total - 1) % 12 + 1
        _, e_last = calendar.monthrange(e_year, e_month)
        loan_end = loan_start.replace(year=e_year, month=e_month, day=min(repayment_day, e_last))
        
        if start_date > loan_end:
            continue
            
        curr = start_date
        while curr <= end_date:
            _, last_day = calendar.monthrange(curr.year, curr.month)
            is_match = (curr.day == repayment_day)
            # Handle cases where repayment day is 31st but month has 30 days
            if not is_match and repayment_day > last_day and curr.day == last_day:
                is_match = True
            
            if is_match and curr <= loan_end:
                total_emi += Decimal(str(l.emi_amount))
            
            curr += timedelta(days=1)
            
    return total_emi


def compute_loan_disbursement(employee, start_date, end_date):
    """Calculates total loan principal disbursed to an employee in a given period."""
    from app.models import LoanApplication
    
    total_disb = Decimal('0.00')
    # Filter for loans approved within the date range
    loans = LoanApplication.objects.filter(
        employee=employee.user,
        status__in=['APPROVED', 'CLEARED'],
        created_at__date__range=[start_date, end_date]
    )
    for l in loans:
        total_disb += Decimal(str(l.requested_amount))
        
    return total_disb


def compute_asset_deductions(employee, start_date, end_date):
    """Calculates total asset-related deductions for an employee in a given period."""
    from app.models import AssetRequest
    
    total_ded = Decimal('0.00')
    requests = AssetRequest.objects.filter(
        requested_by=employee,
        approval_status='approved',
        updated_at__date__range=[start_date, end_date]
    ).select_related('related_fixed_asset', 'related_supply_item')
    
    for r in requests:
        if r.related_supply_item:
            # Supply items: Price * Qty
            price = r.related_supply_item.unit_price or Decimal('0.00')
            total_ded += price * (r.requested_quantity or 1)
        else:
            # Core assets: fixed payment amount
            total_ded += r.employee_payment_amount or Decimal('0.00')
            
    return total_ded


def compute_salary_structure_allowances(employee, earned_basic, total_gross):
    """Calculates allowances from the latest salary structure for the company."""
    from app.models import SalaryStructure, AllowanceType
    
    allowances = []
    structure = SalaryStructure.objects.filter(company=employee.company).order_by('-created_at').first()
    
    if not structure:
        return allowances

    # 1. Percent-based fields on the structure itself
    fields = [
        ('HRA', structure.hra_percent),
        ('Conveyance', structure.conveyance_percent),
        ('Medical', structure.medical_percent),
        ('Special Allowance', structure.special_percent),
        ('Service Charge', structure.service_charge_percent),
    ]
    
    for name, val in fields:
        if val and val > 0:
            amt = (earned_basic * val) / Decimal(100)
            allowances.append({'name': name, 'amount': amt.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)})
            
    # 2. Linked AllowanceType objects
    fixed_allowances = AllowanceType.objects.filter(salary_structure=structure)
    for fa in fixed_allowances:
        if fa.amount and fa.amount > 0:
            allowances.append({'name': fa.name, 'amount': Decimal(str(fa.amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)})
            
    return allowances


def generate_payslip_pdf(employee, payroll, batch=None, company=None, logo_path=None, payslip_id=None, finalized_salary=None):
    # If payroll is None but finalized_salary is provided, adapt it
    if not payroll and finalized_salary:
        # Create a "duck-typed" payroll object for the template
        class PayrollAdapter:
            def __init__(self, fs):
                self.basic_salary = fs.earned_basic
                self.net_pay = fs.net_salary
                self.gross_salary = fs.total_gross
                self.total_deductions = fs.total_deductions
                self.payroll_date = fs.created_at.date()
                
                conf = fs.config or {}
                
                # Use central attendance helper
                metrics = compute_attendance_metrics(fs.employee, fs.from_date, fs.to_date)
                
                expected_days = metrics['expected_working_days']
                present_days = metrics['present_days']
                half_days = metrics['half_days']
                paid_leave_days = metrics['paid_leaves']
                
                # Set values from helper
                fixed_basic = fs.employee.basic_salary or (fs.employee.gross_salary * (fs.company.salary_structures.order_by('-created_at').first().basic_percent / Decimal(100)) if fs.employee.gross_salary and fs.company.salary_structures.exists() else Decimal(0))
                self.fixed_basic = fixed_basic.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                self.basic_salary = fs.earned_basic
                
                self.total_working_days = expected_days
                self.present_days = Decimal(present_days) + (Decimal(half_days) * Decimal('0.5'))
                self.paid_leaves = Decimal(paid_leave_days)
                
                # Use stored days_paid from FinalizedSalary (computed by frontend)
                self.days_paid = fs.days_paid
                
                self.loss_of_pay_days = Decimal(self.total_working_days) - Decimal(self.days_paid)
                if self.loss_of_pay_days < 0: self.loss_of_pay_days = Decimal(0)
                
                self.ot_pay = fs.ot_pay
                self.ot_hours = fs.ot_hours
                self.loan_emi = fs.loan_emi
                self.loan_disbursement = fs.loan_disbursement
                self.asset_deduction = fs.asset_deduction
                
                # These static fields are handled via dynamic_earnings for FinalizedSalary path
                self.hra = self.conveyance = self.medical = self.special_allowance = self.service_charges = Decimal(0)
                self.pf = self.income_tax = Decimal(0)

                # Fetch dynamic components from config
                from app.models import GrossSalaryComponent, SalaryDeductionComponent, ReimbursementRequest
                self.dynamic_earnings = []
                self.dynamic_deductions = []
                
                # Loan Credit
                if self.loan_disbursement > 0:
                    self.dynamic_earnings.append({'name': 'Loan Credit', 'amount': self.loan_disbursement.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)})
                
                # 1. Dynamic GrossSalaryComponent entries — respect saved gChk from PayrollReport
                all_gross = GrossSalaryComponent.objects.filter(company=fs.company, is_active=True)
                g_chk = fs.config.get('gChk', {})
                all_gross_names = set()
                for gc in all_gross:
                    all_gross_names.add(gc.name.lower())
                    # Respect saved config: skip if explicitly unchecked, default True for new components
                    if not g_chk.get(f'g-{gc.id}', True): continue
                    amount = (fs.earned_basic * gc.value) / Decimal(100) if gc.calc_type == 'percentage' else gc.value
                    self.dynamic_earnings.append({'name': gc.name, 'amount': amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)})
                
                # 2. Salary Structure allowances — only add items NOT already covered by a GrossSalaryComponent
                #    (If a component like "HRA" exists in GrossSalaryComponent, it's already handled above via gChk)
                struct_allowances = compute_salary_structure_allowances(fs.employee, fs.earned_basic, fs.total_gross)
                for sa in struct_allowances:
                    if sa['name'].lower() not in all_gross_names:
                        self.dynamic_earnings.append(sa)
                
                # Reimbursements
                reimbursements = ReimbursementRequest.objects.filter(
                    employee=fs.employee,
                    status='approved',
                    created_at__date__range=[fs.from_date, fs.to_date]
                )
                for r in reimbursements:
                    r_amt = Decimal(str(r.amount))
                    self.dynamic_earnings.append({'name': f"Reimbursement: {r.category.name if r.category else 'Other'}", 'amount': r_amt.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)})

                # Deductions
                all_ded = SalaryDeductionComponent.objects.filter(company=fs.company, is_active=True)
                d_chk = fs.config.get('dChk', {})
                for dc in all_ded:
                    if not d_chk.get(f'd-{dc.id}', True): continue
                    
                    # Logic from views.py
                    fixed_basic = fs.employee.basic_salary or Decimal(0)
                    fixed_gross = fs.employee.gross_salary or Decimal(0)
                    t_base = fixed_basic if dc.threshold_on == 'basic' else fixed_gross
                    if dc.has_threshold and t_base < dc.threshold_amount: continue
                    
                    d_base = fs.earned_basic if dc.deduct_from == 'basic' else fs.total_gross
                    amount = (d_base * dc.value) / Decimal(100) if dc.calc_type == 'percentage' else dc.value
                    self.dynamic_deductions.append({'name': dc.name, 'amount': amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)})
        
        payroll = PayrollAdapter(finalized_salary)
        extra_allowances_list = payroll.dynamic_earnings
        extra_deductions_list = payroll.dynamic_deductions
        
        # Create a mock batch if none provided
        if not batch:
            class BatchAdapter:
                def __init__(self, fs):
                    self.month = fs.from_date.strftime('%B')
                    self.year = fs.from_date.year
            batch = BatchAdapter(finalized_salary)

    # Compute extra allowances and deductions from related objects if available
    extra_allowances = None
    extra_deductions = None
    # Try to get from payroll.salary_structure if available, else fallback to None
    salary_structure = getattr(payroll, 'salary_structure', None)
    if salary_structure:
        # If allowances/deductions are related managers (e.g., ManyToMany), sum amounts
        if hasattr(salary_structure, 'allowances'):
            extra_allowances = sum([a.amount for a in salary_structure.allowances.all()])
        if hasattr(salary_structure, 'deductions'):
            extra_deductions = sum([d.amount for d in salary_structure.deductions.all()])

    # Resolve company logo for WeasyPrint with robust fallbacks:
    # 1) explicit local path -> file:// URL
    # 2) explicit URL -> as-is
    # 3) company.logo.path if available
    # 4) company.logo.url (+ SITE_URL for relative media URLs)
    logo_url = None
    if logo_path:
        if isinstance(logo_path, str) and logo_path.startswith(("http://", "https://", "file:///")):
            logo_url = logo_path
        elif os.path.exists(logo_path):
            logo_url = 'file:///' + logo_path.replace('\\', '/').replace(os.sep, '/')

    if not logo_url and company and getattr(company, 'logo', None):
        try:
            if hasattr(company.logo, 'path') and os.path.exists(company.logo.path):
                logo_url = 'file:///' + company.logo.path.replace('\\', '/').replace(os.sep, '/')
        except Exception:
            # Some storage backends may not expose a local .path
            pass

        if not logo_url:
            try:
                raw_logo_url = company.logo.url
                if raw_logo_url:
                    if raw_logo_url.startswith(("http://", "https://", "file:///")):
                        logo_url = raw_logo_url
                    else:
                        site_url = getattr(settings, 'SITE_URL', 'http://127.0.0.1:8000').rstrip('/')
                        logo_url = f"{site_url}{raw_logo_url}"
            except Exception:
                pass

    # Generate QR Code for authentication
    qr_base64 = None
    if payslip_id:
        qr_lines = [
            f"Payslip ID: {payslip_id}",
            f"Company: {company.name if company else ''}",
            f"Employee: {employee.full_name}",
            f"Employee ID: {employee.employee_id}",
            f"Designation: {employee.designation.designation_name if employee.designation else ''}",
            f"Department: {employee.department.department_name if employee.department else ''}",
            f"Period: {batch.month if batch else ''} {batch.year if batch else ''}",
            f"Gross Salary: {payroll.gross_salary}",
            f"Total Deductions: {payroll.total_deductions}",
            f"Net Pay: {payroll.net_pay}",
            f"Days Paid: {payroll.days_paid}",
            f"Pay Date: {payroll.payroll_date}",
            f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')}",
        ]
        qr_data = "\n".join(qr_lines)
        qr = qrcode.QRCode(version=1, box_size=3, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_base64 = base64.b64encode(qr_buffer.getvalue()).decode('utf-8')

    # Build pay period string for display
    pay_period = None
    if finalized_salary:
        pay_period = f"{finalized_salary.from_date.strftime('%d %b %Y')} - {finalized_salary.to_date.strftime('%d %b %Y')}"
    elif payroll:
        # Use month/year from batch
        from calendar import monthrange
        y, m = payroll.batch.year, payroll.batch.month
        last_day = monthrange(y, m)[1]
        pay_period = f"01 {calendar.month_name[m][:3]} {y} - {last_day:02d} {calendar.month_name[m][:3]} {y}"

    # Convert net pay to words for the payslip
    net_pay_words = number_to_words(payroll.net_pay) if payroll else ''

    context = {
        "employee": employee,
        "payroll": payroll,
        "batch": batch,
        "company": company,
        "logo_path": logo_url,
        "extra_deductions": extra_deductions,
        "extra_allowances": extra_allowances,
        "extra_deductions_list": extra_deductions_list if 'extra_deductions_list' in locals() else [],
        "extra_allowances_list": extra_allowances_list if 'extra_allowances_list' in locals() else [],
        "payslip_id": payslip_id,
        "pay_period": pay_period,
        "qr_code": f"data:image/png;base64,{qr_base64}" if qr_base64 else None,
        "net_pay_words": net_pay_words,
    }
    html_string = render_to_string('payslip_template.html', context)
    pdf_file = BytesIO()
    HTML(string=html_string).write_pdf(pdf_file)
    pdf_file.seek(0)
    return pdf_file

def generate_letter_pdf(company, letter_title, letter_content, request=None):
    """
    Generate a PDF for a letter using the dynamic letter_template.html and full company context.
    """

    import os
    from django.conf import settings
    current_date_str = timezone.now().strftime("%B %d, %Y")
    # Resolve logo path to full URL
    logo_url = None
    if company and getattr(company, 'logo', None):
        if hasattr(company.logo, 'url'):
            # Build full URL using request or settings
            if request:
                logo_url = request.build_absolute_uri(company.logo.url)
            else:
                # Fallback: try to build URL from settings
                domain = getattr(settings, 'SITE_URL', 'http://localhost:8000')
                logo_url = f"{domain}{company.logo.url}"

    context = {
        "company_logo_url": logo_url,
        "company_initials": "".join([w[0] for w in company.name.split()])[:2] if getattr(company, 'name', None) else "CN",
        "company_name": company.name if company and getattr(company, 'name', None) else "",
        "company_tag": "",  # Company doesn't have tagline field
        "company_address": getattr(company, 'address', "") if company else "",
        "company_phone": getattr(company, 'phone_number', "") if company else "",
        "company_email": getattr(company, 'email', "") if company else "",
        "company_website": getattr(company, 'website', "") if company else "",
        "current_date": current_date_str,
        "date": current_date_str,  # Add 'date' as alias for template compatibility
        "title": letter_title,
        "content": letter_content,
    }
    html_string = render_to_string('letters/letter_template.html', context)
    pdf_file = BytesIO()
    HTML(string=html_string).write_pdf(pdf_file)
    pdf_file.seek(0)
    return pdf_file.getvalue()


def _resolve_media_file_url(file_field, request=None):
    """
    Resolve a FileField/ImageField to a URL weasyprint can actually load:
    local file path first (read directly off disk, no network round-trip),
    then an absolute URL built from the request, then SITE_URL as a last resort.
    """
    if not file_field:
        return None
    try:
        if hasattr(file_field, 'path') and os.path.exists(file_field.path):
            return 'file:///' + file_field.path.replace('\\', '/').replace(os.sep, '/')
    except (ValueError, NotImplementedError):
        pass
    if hasattr(file_field, 'url'):
        if request:
            return request.build_absolute_uri(file_field.url)
        domain = getattr(settings, 'SITE_URL', 'http://localhost:8000')
        return f"{domain}{file_field.url}"
    return None


def _truncate(text, max_len):
    text = (text or "").strip()
    if len(text) <= max_len:
        return text
    return text[:max_len - 1].rstrip() + "…"


def generate_certificate_pdf(employee, course, certificate_number, issue_date, request=None):
    """
    Generate a course-completion certificate PDF for an employee, using the
    same context-building/weasyprint pattern as generate_letter_pdf.

    Text fields are truncated to fixed lengths so the fixed single-page
    layout never overflows into a second page — weasyprint paginates
    overflowing content regardless of CSS `overflow: hidden`, so length has
    to be capped here rather than clipped visually.
    """
    company = getattr(employee, 'company', None)
    logo_url = _resolve_media_file_url(getattr(company, 'logo', None), request) if company else None

    signature = None
    if company:
        from employee.models import CertificateSignature
        signature = CertificateSignature.objects.filter(company=company).first()
    signature_image_url = _resolve_media_file_url(signature.signature_image, request) if signature else None

    context = {
        "company_logo_url": logo_url,
        "company_name": _truncate(company.name if company and getattr(company, 'name', None) else "", 60),
        "employee_name": _truncate(employee.full_name if getattr(employee, 'full_name', None) else "", 45),
        "course_title": _truncate(course.title, 90),
        "certificate_number": certificate_number,
        "issue_date": issue_date.strftime("%B %d, %Y"),
        "signature_image_url": signature_image_url,
        "signatory_name": _truncate(signature.signatory_name if signature else "", 45),
        "signatory_title": _truncate(signature.signatory_title if signature else "", 45),
    }
    html_string = render_to_string('certificate_template.html', context)
    pdf_file = BytesIO()
    HTML(string=html_string).write_pdf(pdf_file)
    pdf_file.seek(0)
    return pdf_file


def fill_placeholders(text, data):
    import re
    def replacer(match):
        key = match.group(1)
        return str(data.get(key, f'<{key}>'))
    return re.sub(r'<([a-zA-Z0-9_]+)>', replacer, text)

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in meters.
    """
    try:
        # Convert decimal degrees to radians 
        lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])

        # Haversine formula 
        dlon = lon2 - lon1 
        dlat = lat2 - lat1 
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a)) 
        r = 6371 # Radius of earth in kilometers
        return c * r * 1000
    except (TypeError, ValueError):
        return float('inf')

def validate_geofence(user, lat, lon, request_ip):
    """
    Validate if the user is allowed to login based on geofencing/IP restrictions.
    Returns (is_allowed, error_message).
    """
    # Geofencing only applies to employees
    if user.role != 'employee':
        print(f"DEBUG: Geofence bypassed for {user.username} - Role is {user.role}")
        return True, ""

    emp = getattr(user, 'employee_profile', None)
    if not emp:
        print(f"DEBUG: Geofence bypassed for {user.username} - No employee profile found")
        return True, ""

    # No restriction for WFH employees
    if emp.work_location == 'home':
        print(f"DEBUG: Geofence bypassed for {user.username} - Work location is 'home'")
        return True, ""

    from .models import OfficeLocation
    office_configs = OfficeLocation.objects.filter(company=user.company, is_active=True)
    
    if not office_configs.exists():
        print(f"DEBUG: Geofence bypassed for {user.username} - No active office configurations for company")
        return True, ""

    # Gather all active restrictions for the company
    all_office_coords = []
    global_gps_required = False

    for config in office_configs:
        if config.enable_geofencing and config.latitude and config.longitude:
            global_gps_required = True
            all_office_coords.append({
                'lat': config.latitude,
                'lon': config.longitude,
                'radius': config.radius,
                'name': config.name
            })

    # Check Global GPS Requirement
    is_in_any_radius = False
    if global_gps_required:
        if lat and lon:
            for coord in all_office_coords:
                dist = haversine_distance(lat, lon, coord['lat'], coord['lon'])
                if dist <= coord['radius']:
                    is_in_any_radius = True
                    break
        if not is_in_any_radius:
            print(f"DEBUG: Geofence REJECTED for {user.username} - Not in any authorized office radius")
            return False, "Access denied: You are not within the GPS radius of any authorized office."

    # If we reached here, the user passed all enabled global restrictions
    print(f"DEBUG: Geofence ALLOWED for {user.username} - Passed GPS company policy")
    return True, ""
