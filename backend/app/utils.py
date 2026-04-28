import qrcode
import base64
from io import BytesIO
from weasyprint import HTML
from django.utils import timezone
from django.template.loader import render_to_string
import os
from decimal import Decimal, ROUND_HALF_UP

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
                # Calculate expected working days (excluding weekends and holidays)
                from app.models import CalendarEvent, DepartmentWiseWorkingDays
                from datetime import timedelta
                
                holiday_dates = set(CalendarEvent.objects.filter(
                    company=fs.company, is_holiday=True, date__gte=fs.from_date, date__lte=fs.to_date
                ).values_list('date', flat=True))

                cfg = DepartmentWiseWorkingDays.objects.filter(company=fs.company, department=fs.employee.department).first()
                weekend_days = [d.lower() for d in cfg.weekend_days] if cfg and cfg.weekend_days else ["saturday", "sunday"]
                
                expected_days = 0
                curr = fs.from_date
                while curr <= fs.to_date:
                    if curr.strftime('%A').lower() not in weekend_days and curr not in holiday_dates:
                        expected_days += 1
                    curr += timedelta(days=1)
                
                if expected_days == 0: expected_days = 30
                
                # Calculate attendance breakdown (Re-calculating as it's not stored in FS record)
                from app.models import Attendance, EmpLeave
                
                # 1. Present Days
                emp_atts = Attendance.objects.filter(
                    employee=fs.employee,
                    date__gte=fs.from_date,
                    date__lte=fs.to_date
                )
                
                present_days, half_days = 0, 0
                for att in emp_atts:
                    is_holiday_work = att.date in holiday_dates or att.date.strftime('%A').lower() in weekend_days
                    if not is_holiday_work:
                        w_hours = att.total_work_duration.total_seconds() / 3600 if att.total_work_duration else 0
                        s_full = fs.employee.shift_assigned.full_day_hours() if fs.employee.shift_assigned else 8.0
                        s_half = fs.employee.shift_assigned.half_day_hours() if fs.employee.shift_assigned else 4.0
                        if w_hours >= s_full: present_days += 1
                        elif w_hours >= s_half: half_days += 1
                
                # 2. Paid Leaves
                emp_leaves = EmpLeave.objects.filter(
                    employee=fs.employee,
                    status='Approved',
                    from_date__lte=fs.to_date,
                    to_date__gte=fs.from_date
                ).select_related('leave_type')
                
                paid_leave_days = 0
                for lv in emp_leaves:
                    l_start, l_end = max(lv.from_date, fs.from_date), min(lv.to_date, fs.to_date)
                    d = l_start
                    while d <= l_end:
                        if lv.leave_type and lv.leave_type.is_paid: paid_leave_days += 1
                        d += timedelta(days=1)
                
                # Re-calculate to match report logic exactly
                fixed_basic = fs.employee.basic_salary or (fs.employee.gross_salary * (fs.company.salary_structures.order_by('-created_at').first().basic_percent / Decimal(100)) if fs.employee.gross_salary and fs.company.salary_structures.exists() else Decimal(0))
                self.fixed_basic = fixed_basic.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                self.basic_salary = fs.earned_basic # This is the EARNED basic from the report
                
                self.total_working_days = expected_days
                self.present_days = Decimal(present_days) + (Decimal(half_days) * Decimal('0.5'))
                self.paid_leaves = Decimal(paid_leave_days)
                
                # IMPORTANT: In the report, payable_days (Days Paid) = Present + Paid Leaves
                self.days_paid = self.present_days + self.paid_leaves
                
                self.loss_of_pay_days = Decimal(self.total_working_days) - Decimal(self.days_paid)
                if self.loss_of_pay_days < 0: self.loss_of_pay_days = Decimal(0)
                
                self.ot_pay = fs.ot_pay
                self.ot_hours = fs.ot_hours
                self.loan_emi = fs.loan_emi
                self.asset_deduction = fs.asset_deduction
                
                # Mock fixed fields as 0 to avoid duplication with dynamic ones
                self.hra = self.conveyance = self.medical = self.special_allowance = self.service_charges = Decimal(0)
                self.pf = self.income_tax = Decimal(0)

                # Fetch dynamic components from config
                from app.models import GrossSalaryComponent, SalaryDeductionComponent, ReimbursementRequest
                self.dynamic_earnings = []
                self.dynamic_deductions = []
                
                # Earnings
                all_gross = GrossSalaryComponent.objects.filter(company=fs.company, is_active=True)
                g_chk = fs.config.get('gChk', {})
                for gc in all_gross:
                    # Default to True if not explicitly False in config (matches views.py logic)
                    if not g_chk.get(f'g-{gc.id}', True): continue
                    
                    amount = (fs.earned_basic * gc.value) / Decimal(100) if gc.calc_type == 'percentage' else gc.value
                    self.dynamic_earnings.append({'name': gc.name, 'amount': amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)})
                
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

    # Convert logo_path to file URL if it's a local file path
    logo_url = None
    if logo_path and os.path.exists(logo_path):
        logo_url = 'file:///' + logo_path.replace('\\', '/').replace(os.sep, '/')
    else:
        logo_url = logo_path

    # Generate QR Code for authentication
    qr_base64 = None
    if payslip_id:
        qr_data = f"ID: {payslip_id} | Emp: {employee.full_name} | Period: {batch.month if batch else ''}/{batch.year if batch else ''} | Net: {payroll.net_pay}"
        qr = qrcode.QRCode(version=1, box_size=3, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_base64 = base64.b64encode(qr_buffer.getvalue()).decode('utf-8')

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
        "qr_code": f"data:image/png;base64,{qr_base64}" if qr_base64 else None,
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


def fill_placeholders(text, data):
    import re
    def replacer(match):
        key = match.group(1)
        return str(data.get(key, f'<{key}>'))
    return re.sub(r'<([a-zA-Z0-9_]+)>', replacer, text)