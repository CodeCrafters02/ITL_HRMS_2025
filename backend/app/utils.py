from io import BytesIO
from weasyprint import HTML
from django.utils import timezone
from django.template.loader import render_to_string

def generate_payslip_pdf(employee, payroll, batch, company=None, logo_path=None):
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
    import os
    logo_url = None
    if logo_path and os.path.exists(logo_path):
        # Windows paths need three slashes after file:
        logo_url = 'file:///' + logo_path.replace('\\', '/').replace(os.sep, '/')
    else:
        logo_url = logo_path  # fallback (could be http url or None)

    context = {
        "employee": employee,
        "payroll": payroll,
        "batch": batch,
        "company": company,
        "logo_path": logo_url,
        "extra_deductions": extra_deductions,
        "extra_allowances": extra_allowances,
    }
    html_string = render_to_string('payslip_template.html', context)
    pdf_file = BytesIO()
    HTML(string=html_string, base_url=None).write_pdf(pdf_file)
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