from rest_framework import viewsets, generics, status
import string
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.timezone import localtime
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
from calendar import monthrange
from django.db import transaction
import calendar
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date
import io
from django.utils import timezone
from .utils import generate_letter_pdf, fill_placeholders
from decimal import Decimal
from django.core.mail import EmailMessage
from .utils import generate_payslip_pdf
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
import re
from rest_framework.permissions import IsAuthenticated
from .permissions import IsMaster,IsAdminUser
from .serializers import *
from .models import *


class CustomPasswordChangeAPIView(generics.UpdateAPIView):
    serializer_class = CustomPasswordChangeSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


class MasterRegisterViewSet(viewsets.ModelViewSet):
    queryset = UserRegister.objects.filter(role='master')
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data.get('email')
        if UserRegister.objects.filter(email=email).exists():
            return Response({"detail": "Email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        if serializer.validated_data['role'] != 'master':
            return Response({"error": "Role must be 'master'"}, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class UserManagementViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    # permission_classes = [permissions.IsAuthenticated, IsMaster]
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = UserRegister.objects.all()
        created_by = self.request.query_params.get('created_by')
        if created_by:
            queryset = queryset.filter(created_by=created_by)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_authenticated:
            serializer.save(created_by=user)
        else:
            serializer.save()
class AdminRegisterViewSet(viewsets.ModelViewSet):
    queryset = UserRegister.objects.filter(role='admin')
    serializer_class = AdminRegisterSerializer
    permission_classes = [IsAuthenticated, IsMaster]

    def update(self, request, pk=None):
        try:
            admin = UserRegister.objects.get(pk=pk, role='admin')
        except UserRegister.DoesNotExist:
            return Response({'detail': 'Admin not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminRegisterSerializer(admin, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        serializer = AdminRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def list(self, request):
        admins = UserRegister.objects.filter(role='admin')
        serializer = AdminRegisterSerializer(admins, many=True)
        return Response(serializer.data)
class PasswordChangeView(generics.UpdateAPIView):
    serializer_class = PasswordChangeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)

class MasterDashboardView(APIView):
    permission_classes = [IsAuthenticated,IsMaster]

    def get(self, request):
        user = request.user

        if user.role != 'master':
            return Response(
                {"detail": "You are not authorized for this dashboard."},
                status=status.HTTP_403_FORBIDDEN
            )

        companies_data = []
        companies = Company.objects.all()

        for company in companies:
            
            admins = UserRegister.objects.filter(company=company, role='admin')

            admin_serializer = MasterDashboardSerializer(admins, many=True)
            logo_url = request.build_absolute_uri(company.logo.url) if company.logo else None


            companies_data.append({
                "id": company.id,
                "name": company.name,
                "address": company.address,
                "location": company.location,
                "email": company.email,
                "phone_number": company.phone_number,
                "logo": logo_url,
                "admins": admin_serializer.data,
            })

        return Response({
            "companies": companies_data,
            "total_companies": companies.count(),
            "total_admins": UserRegister.objects.filter(role='admin').count()
        })

class LoginAPIView(APIView):

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)

        if user is not None:
            if not user.is_active:
                return Response({"detail": "User account is disabled."}, status=status.HTTP_403_FORBIDDEN)

            # ✅ Issue JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            return Response({
                "access": access_token,
                "refresh": refresh_token,
                "role": user.role  # ✅ This lets frontend redirect properly!
            }, status=status.HTTP_200_OK)

        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
     
class CompanyWithAdminViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanyWithAdminSerializer
    permission_classes = [IsAuthenticated, IsMaster]

    def get_serializer_context(self):
        return {'request': self.request}


class CompanyLogoAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        company = getattr(request.user, 'company', None)
        if not company:
            return Response({'detail': 'No company found.'}, status=404)
        
        serializer = CompanyWithAdminSerializer(company, context={'request': request})
        return Response(serializer.data)


class CompanyUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
       
        user = request.user
        company = getattr(user, 'company', None)
        if not company:
            return Response({"detail": "No company found for user."}, status=status.HTTP_404_NOT_FOUND)
        serializer = CompanySerializer(company, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        try:
            company = Company.objects.get(pk=pk)
        except Company.DoesNotExist:
            return Response({"detail": "Company not found."}, status=status.HTTP_404_NOT_FOUND)

        
        serializer = CompanySerializer(company, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated,IsAdminUser]
    def get(self, request):
        today = timezone.now().date()
        company = request.user.company  

        # Department count
        total_departments = Department.objects.filter(company=company).count()

        # Leaves today
        leaves_today = EmpLeave.objects.filter(
            company=company,
            from_date__lte=today,
            to_date__gte=today,
            status='Approved'
        ).count()

        # Employee Overview
        total_employees = Employee.objects.filter(company=company, is_active=True).count()
        active_employees = Employee.objects.filter(company=company, is_active=True).count()
        inactive_employees = Employee.objects.filter(company=company, is_active=False).count()
        new_joinees = Employee.objects.filter(
            company=company,
            date_of_joining__year=today.year,
            date_of_joining__month=today.month
        ).count()
        
        exits_this_month = Employee.objects.filter(
            company=company,
            relieved_info__relieving_date__year=today.year,
            relieved_info__relieving_date__month=today.month
        ).count()
        # Upcoming Birthdays/Anniversaries (next 30 days)
        next_30 = today + timezone.timedelta(days=30)
        upcoming_birthdays = Employee.objects.filter(
            company=company,
            date_of_birth__month__gte=today.month,
            date_of_birth__day__gte=today.day,
            date_of_birth__month__lte=next_30.month,
            date_of_birth__day__lte=next_30.day,
            is_active=True
        ).order_by('date_of_birth')
        

        # Attendance Snapshot
        present = Attendance.objects.filter(company=company, date=today, is_present=True).count()
        absent = Attendance.objects.filter(company=company, date=today, is_present=False).count()
        on_leave = EmpLeave.objects.filter(
            company=company,
            from_date__lte=today,
            to_date__gte=today,
            status='Approved'
        ).count()

        # Pending Leave Requests
        pending_leaves = EmpLeave.objects.filter(company=company, status='Pending').count()

        # Payroll Status
        current_month = today.month
        current_year = today.year
        payroll_batches = PayrollBatch.objects.filter(company=company, month=current_month, year=current_year)
        payroll_status = "pending"
        if payroll_batches.filter(status='Locked').exists():
            payroll_status = "completed"

        # Upcoming Salary Release (next batch with status 'Draft')
        next_salary_release = payroll_batches.filter(status='Draft').order_by('id').first()
        next_salary_release_date = None
        if next_salary_release:
            next_salary_release_date = f"{current_year}-{current_month}-01"  # Or use a real field if you have one

        return Response({
            "department_count": total_departments,
            "leaves_today": leaves_today,
            "employee_overview": {
                "total": total_employees,
                "active": active_employees,
                "inactive": inactive_employees,
                "new_joinees": new_joinees,
                "exits_this_month": exits_this_month,
            },
            "upcoming_birthdays": [
                {"name": e.full_name, "date_of_birth": e.date_of_birth} for e in upcoming_birthdays
            ],
           
            "attendance_snapshot": {
                "present": present,
                "absent": absent,
                "on_leave": on_leave,
            },
            "pending_leave_requests": pending_leaves,
            "payroll_status": payroll_status,
            "next_salary_release_date": next_salary_release_date,
        })

class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated,IsAdminUser]
    
    def get_queryset(self):
        return Department.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class LevelViewSet(viewsets.ModelViewSet):
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated,IsAdminUser]
   
    def get_queryset(self):
        return Level.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class DesignationViewSet(viewsets.ModelViewSet):
    serializer_class = DesignationSerializer
    permission_classes = [IsAuthenticated,IsAdminUser]
   
    def get_queryset(self):
        return Designation.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)        

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        return Employee.objects.filter(company=user.company)

    @action(detail=False, methods=['get'], url_path='get-reporting-manager-choices')
    def get_reporting_manager_choices(self, request):
        company = getattr(request.user, 'company', None)
        if not company:
            return Response({"error": "User has no company"}, status=status.HTTP_400_BAD_REQUEST)

        # Always return all levels linked to this company
        level_choices = [
            {"id": lvl.id, "name": lvl.level_name}
            for lvl in Level.objects.filter(company=company)
        ]

        reporting_level_id = request.query_params.get('reporting_level_id')

        if reporting_level_id:
            try:
                reporting_level_id = int(reporting_level_id)
            except ValueError:
                return Response({"error": "Invalid reporting_level_id"}, status=status.HTTP_400_BAD_REQUEST)

            # Employees from the given level in the same company
            employees = Employee.objects.filter(company=company, level_id=reporting_level_id)

            reporting_managers = [
                {"id": emp.id, "name": emp.full_name or emp.user.first_name or emp.user.username}
                for emp in employees
            ]

            return Response({
                "reporting_managers": reporting_managers,
                "level_choices": level_choices
            })

        # If no reporting_level_id param, only send levels
        return Response({
            "level_choices": level_choices
        })

    
class AssetInventoryViewSet(viewsets.ModelViewSet):
    serializer_class = AssetInventorySerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        """ Limit to assets belonging to  company """
        company = self.request.user.company
        return AssetInventory.objects.filter(company=company)
    
    
class RecruitmentViewSet(viewsets.ModelViewSet):
    queryset = Recruitment.objects.all()
    serializer_class = RecruitmentSerializer

    def perform_update(self, serializer):
        instance = serializer.save()

        # Trigger email only if status field is updated
        new_status = self.request.data.get('status')
        if new_status:
            if new_status == 'rejected':
                send_mail(
                    subject='Application Status',
                    message=(
                        f"Dear {instance.name},\n\n"
                        f"We regret to inform you that you were not selected for the position of {instance.job_title}.\n"
                        "We wish you all the best in your future endeavors.\n\n"
                        "Regards,\nYour Company"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[instance.email],
                    fail_silently=False,
                )

class LeaveViewSet(viewsets.ModelViewSet):
    queryset = Leave.objects.all()
    serializer_class = LeaveSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return Leave.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        company = self.request.user.company
        if not company:
            raise serializers.ValidationError("No company found for your admin.")
        serializer.save(company=company)

class LearningCornerViewSet(viewsets.ModelViewSet):
    queryset = LearningCorner.objects.all()
    serializer_class = LearningCornerSerializer
    permission_classes = [IsAuthenticated,IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        return LearningCorner.objects.filter(company=user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated,IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.filter(company=user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class ShiftPolicyViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftPolicySerializer
    permission_classes = [IsAuthenticated,IsAdminUser]

    def get_queryset(self):
        return ShiftPolicy.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class DepartmentWiseWorkingDaysViewSet(viewsets.ModelViewSet):
    queryset = DepartmentWiseWorkingDays.objects.all()
    serializer_class = DepartmentWiseWorkingDaysSerializer
    permission_classes = [IsAuthenticated,IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        company = getattr(user, 'company', None)
        qs = DepartmentWiseWorkingDays.objects.all()
        if company:
            qs = qs.filter(company=company)
        return qs

    def create(self, request, *args, **kwargs):
        department_id = request.data.get('department')
        shift_ids = request.data.get('shifts', [])
        company_id = request.data.get('company')

        if not department_id:
            return Response({'detail': 'Department is required.'}, status=400)

        existing_qs = DepartmentWiseWorkingDays.objects.filter(department_id=department_id)

        if company_id:
            existing_qs = existing_qs.filter(company_id=company_id)
        else:
            existing_qs = existing_qs.filter(company__isnull=True)

        if not shift_ids:
            # Adding for all shifts
            if existing_qs.filter(shifts__isnull=False).exists():
                return Response({'detail': 'Shift-specific records already exist. Cannot add "All Shifts" record.'}, status=400)
        else:
            # Adding for specific shifts
            if existing_qs.filter(shifts=None).exists():
                return Response({'detail': 'An "All Shifts" record exists. Cannot add shift-specific records.'}, status=400)

            for obj in existing_qs:
                existing_shifts = set(obj.shifts.values_list('id', flat=True))
                if set(shift_ids) == existing_shifts:
                    return Response({'detail': 'Duplicate shift combination exists for this department.'}, status=400)

        # Always save with the current user's company, and only pass expected fields
        serializer = self.get_serializer(data={
            'department': department_id,
            'shifts': shift_ids,
            'working_days_count': request.data.get('working_days_count'),
            'week_start_day': request.data.get('week_start_day'),
            'week_end_day': request.data.get('week_end_day'),
            'company': self.request.user.company.id
        })
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return CalendarEvent.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class RelievedEmployeeViewSet(viewsets.ModelViewSet):

    @action(detail=False, methods=['get'], url_path='search-employee')
    def search_employee(self, request):
        query = request.GET.get('q', '')
        company = request.user.company
        employees = Employee.objects.filter(
            is_active=True,
            company=company
        ).filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(employee_id__icontains=query)
        )[:20]
        results = [
            {
                'id': emp.id,
                'employee_id': emp.employee_id,
                'full_name': emp.full_name,
                'department': emp.department.department_name if emp.department else '',
                'designation': emp.designation.designation_name if emp.designation else '',
            }
            for emp in employees
        ]
        return Response(results, status=status.HTTP_200_OK)
    queryset = RelievedEmployee.objects.all()
    serializer_class = RelievedEmployeeSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return RelievedEmployee.objects.filter(employee__company=self.request.user.company)

    def perform_create(self, serializer):
        
        relieved_instance = serializer.save()
       
        employee = relieved_instance.employee
        if employee:
           
            assigned_assets = EmployeeAssetDetails.objects.filter(employee=employee)
            if assigned_assets.exists():
                for asset_detail in assigned_assets:
                    asset = asset_detail.asset
                    if asset:
                        asset.quantity += asset_detail.quantity
                        asset.save()
            # Mark employee as inactive
            employee.is_active = False
            employee.save()



class SalaryStructureViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryStructureSerializer

    def get_queryset(self):
        return SalaryStructure.objects.filter(company=self.request.user.company).order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class PayrollBatchViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollBatchSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return PayrollBatch.objects.filter(company=self.request.user.company).order_by('-year', '-month')

    @action(detail=True, methods=['post'], url_path='finalize')
    def finalize(self, request, pk=None):
        try:
            batch = self.get_object()

            if batch.company != request.user.company:
                return Response({'detail': 'Not allowed'}, status=status.HTTP_403_FORBIDDEN)

            if batch.status == 'Locked':
                return Response({'error': 'Batch already finalized.'}, status=400)

            salary_structure = SalaryStructure.objects.filter(company=batch.company).order_by('-created_at').first()
            if not salary_structure:
                return Response({'error': 'No Salary Structure found.'}, status=400)

            employees = Employee.objects.filter(company=batch.company)
            total_days = salary_structure.total_working_days or 30

            first_day = date(batch.year, batch.month, 1)
            last_day = date(batch.year, batch.month, calendar.monthrange(batch.year, batch.month)[1])

            payroll_data = []

            for emp in employees:
                gross = emp.gross_salary or Decimal(0)

                basic = gross * (salary_structure.basic_percent or 0) / 100
                hra = gross * (salary_structure.hra_percent or 0) / 100
                conveyance = gross * (salary_structure.conveyance_percent or 0) / 100
                medical = gross * (salary_structure.medical_percent or 0) / 100
                special = gross * (salary_structure.special_percent or 0) / 100
                service = gross * (salary_structure.service_charge_percent or 0) / 100

                per_day_salary = gross / total_days if total_days else Decimal(0)

                present_days = Attendance.objects.filter(
                    employee=emp,
                    date__range=(first_day, last_day)
                ).values('date').distinct().count()

                paid_leaves = EmpLeave.objects.filter(
                    employee=emp,
                    leave_type__is_paid=True,
                    status='Approved',
                    from_date__gte=first_day,
                    to_date__lte=last_day
                ).count()

                lop_days = EmpLeave.objects.filter(
                    employee=emp,
                    leave_type__is_paid=False,
                    status='Approved',
                    from_date__gte=first_day,
                    to_date__lte=last_day
                ).count()

                days_paid = present_days + paid_leaves
                adjusted_gross = per_day_salary * Decimal(days_paid)

                pf = basic * Decimal('0.12')

                tax_slab = IncomeTaxConfig.objects.filter(
                    company=batch.company,
                    salary_from__lte=gross,
                    salary_to__gte=gross
                ).first()

                income_tax = gross * (tax_slab.tax_percent / Decimal('100')) if tax_slab else Decimal(0)

                extra_allowances = sum(a.amount for a in salary_structure.allowances.all()) or Decimal(0)
                extra_deductions = sum(d.amount for d in salary_structure.deductions.all()) or Decimal(0)

                net_pay = adjusted_gross + extra_allowances - (pf + income_tax + extra_deductions)
                net_pay = max(net_pay, Decimal(0))

                payroll = Payroll.objects.create(
                    batch=batch,
                    company=batch.company,
                    employee=emp,
                    salary_structure=salary_structure,
                    gross_salary=gross,
                    basic_salary=basic,
                    hra=hra,
                    conveyance=conveyance,
                    medical=medical,
                    special_allowance=special,
                    service_charges=service,
                    pf=pf,
                    net_pay=net_pay,
                    total_working_days=total_days,
                    days_paid=days_paid,
                    loss_of_pay_days=lop_days,
                    income_tax=income_tax,
                    payroll_date=timezone.now().date(),
                )

                payroll_data.append(PayrollSerializer(payroll).data)

            batch.status = 'Locked'
            batch.save()

            return Response({
                'message': f'Payroll batch {batch.id} finalized.',
                'batch': PayrollBatchSerializer(batch).data,
                'payrolls': payroll_data
            })

        except PayrollBatch.DoesNotExist:
            return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)
        
    @action(detail=True, methods=['post'], url_path='send-payslips')
    def send_payslips(self, request, pk=None):
        batch = self.get_object()
        if batch.status != 'Locked':
            return Response({'error': 'Batch must be locked before sending payslips.'}, status=400)

        company = batch.company
        logo_path = company.logo.path if company.logo and hasattr(company.logo, 'path') else None

        payrolls = Payroll.objects.filter(batch=batch)
        for payroll in payrolls:
            employee = payroll.employee
            if not employee.email:
                continue

            pdf_buffer = generate_payslip_pdf(employee, payroll, batch, company=company, logo_path=logo_path)
            email = EmailMessage(
                subject=f"Payslip for {batch.month}/{batch.year}",
                body=f"Dear {employee.full_name},\n\nPlease find attached your payslip for {batch.month}/{batch.year}.\n\nRegards,\nHR Team",
                to=[employee.email]
            )
            email.attach(f"Payslip_{employee.employee_id}_{batch.month}_{batch.year}.pdf", pdf_buffer.read(), 'application/pdf')
            email.send()

        return Response({'message': 'Payslips sent to all employees.'})

           
class GeneratePayrollView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        company = request.user.company
        today = timezone.now().date()
        month = today.month
        year = today.year

        # Prevent duplicate finalized batch
        if PayrollBatch.objects.filter(company=company, month=month, year=year, status='Locked').exists():
            return Response({'error': 'Finalized batch already exists for this month'}, status=400)

        # Create or get draft batch
        batch, _ = PayrollBatch.objects.get_or_create(
            company=company,
            month=month,
            year=year,
            defaults={'status': 'Draft'}
        )

        salary_structure = SalaryStructure.objects.filter(company=company).order_by('-created_at').first()
        if not salary_structure:
            return Response({'error': 'No Salary Structure found.'}, status=400)

        employees = Employee.objects.filter(company=company)
        total_days = salary_structure.total_working_days or 30

        first_day = today.replace(day=1)
        last_day = today.replace(day=calendar.monthrange(year, month)[1])

        preview_data = []

        for emp in employees:
            gross = emp.gross_salary or Decimal(0)

            basic = gross * (salary_structure.basic_percent or 0) / 100
            hra = gross * (salary_structure.hra_percent or 0) / 100
            conveyance = gross * (salary_structure.conveyance_percent or 0) / 100
            medical = gross * (salary_structure.medical_percent or 0) / 100
            special = gross * (salary_structure.special_percent or 0) / 100
            service = gross * (salary_structure.service_charge_percent or 0) / 100

            per_day_salary = gross / total_days if total_days else Decimal(0)

            present_days = Attendance.objects.filter(
                employee=emp,
                date__range=(first_day, last_day)
            ).values('date').distinct().count()

            paid_leaves = EmpLeave.objects.filter(
                employee=emp,
                leave_type__is_paid=True,
                status='Approved',
                from_date__gte=first_day,
                to_date__lte=last_day
            ).count()

            lop_days = EmpLeave.objects.filter(
                employee=emp,
                leave_type__is_paid=False,
                status='Approved',
                from_date__gte=first_day,
                to_date__lte=last_day
            ).count()

            days_paid = present_days + paid_leaves
            adjusted_gross = per_day_salary * Decimal(days_paid)

            pf = basic * Decimal('0.12')

            tax_slab = IncomeTaxConfig.objects.filter(
                company=company,
                salary_from__lte=gross,
                salary_to__gte=gross
            ).first()

            income_tax = gross * (tax_slab.tax_percent / Decimal('100')) if tax_slab else Decimal(0)

            extra_allowances = sum(a.amount for a in salary_structure.allowances.all()) or Decimal(0)
            extra_deductions = sum(d.amount for d in salary_structure.deductions.all()) or Decimal(0)

            net_pay = adjusted_gross + extra_allowances - (pf + income_tax + extra_deductions)
            net_pay = max(net_pay, Decimal(0))

            # Create unsaved Payroll instance
            fake_payroll = Payroll(
                batch=batch,
                company=company,
                employee=emp,
                salary_structure=salary_structure,
                gross_salary=gross,
                basic_salary=basic,
                hra=hra,
                conveyance=conveyance,
                medical=medical,
                special_allowance=special,
                service_charges=service,
                pf=pf,
                net_pay=net_pay,
                total_working_days=total_days,
                days_paid=days_paid,
                loss_of_pay_days=lop_days,
                income_tax=income_tax,
                payroll_date=timezone.now().date(),
            )

            # Serialize without saving
            serializer = PayrollSerializer(fake_payroll)
            preview_data.append(serializer.data)

        return Response({
            'batch_id': batch.id,
            'batch_status': batch.status,
            'payroll_preview': preview_data
        })



class PayrollViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        user_company = self.request.user.company
        queryset = Payroll.objects.filter(company=user_company)

        batch_id = self.request.query_params.get('batch_id')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        day = self.request.query_params.get('day')

        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)
        if year:
            queryset = queryset.filter(payroll_date__year=year)
        if month:
            queryset = queryset.filter(payroll_date__month=month)
        if day:
            queryset = queryset.filter(payroll_date__day=day)

        return queryset.order_by('-payroll_date')



class IncomeTaxConfigViewSet(viewsets.ModelViewSet):
    serializer_class = IncomeTaxConfigSerializer

    def get_queryset(self):
        return IncomeTaxConfig.objects.filter(company=self.request.user.company)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer  # If you want CRUD too
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['get'])
    def log(self, request):
       
        current_date = timezone.localdate()
        month = int(request.query_params.get('month', current_date.month))
        year = int(request.query_params.get('year', current_date.year))

        num_days = monthrange(year, month)[1]
        month_dates = [datetime(year, month, day).date() for day in range(1, num_days + 1)]


        company = request.user.company
        employees = Employee.objects.filter(company=company)

        attendance_qs = Attendance.objects.filter(
            date__year=year,
            date__month=month,
            company=company
        ).select_related('employee', 'shift')

        approved_leaves = EmpLeave.objects.filter(
            status='Approved',
            from_date__lte=month_dates[-1],
            to_date__gte=month_dates[0],
            company=company
        ).select_related('leave_type', 'employee')

        holidays = CalendarEvent.objects.filter(
            is_holiday=True,
            date__year=year,
            date__month=month
        )

        # Department working days helper
        def build_valid_days(week_start, week_end):
            DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            start_idx = DAYS.index(week_start)
            end_idx = DAYS.index(week_end)
            if start_idx <= end_idx:
                return DAYS[start_idx:end_idx + 1]
            else:
                return DAYS[start_idx:] + DAYS[:end_idx + 1]

        attendance_records = {}

        for emp in employees:
            emp_id = emp.id

            dw = DepartmentWiseWorkingDays.objects.filter(department=emp.department_name).first()
            valid_days = build_valid_days(dw.week_start_day, dw.week_end_day) if dw else []

            daily_records = {}
            for date in month_dates:
                day_name = date.strftime('%A').lower()
                if valid_days and day_name not in valid_days:
                    continue

                daily_records[str(date)] = {
                    'status': '-',
                    'punch_in': None,
                    'punch_out': None,
                    'worked_hours': 0.0,
                    'is_late': False,
                    'leave_type': '',
                    'is_holiday': False,
                    'holiday_name': '',
                }

            attendance_records[emp_id] = {
                'employee_id': emp.id,
                'employee_name': emp.name,
                'daily_records': daily_records,
                'total_hours': 0.0,
                'attendance_percentage': 0.0,
            }

        # Mark holidays
        for holiday in holidays:
            for emp_id, record in attendance_records.items():
                if str(holiday.date) in record['daily_records']:
                    daily = record['daily_records'][str(holiday.date)]
                    daily['status'] = 'H'
                    daily['is_holiday'] = True
                    daily['holiday_name'] = holiday.name

        # Mark approved leaves
        for leave in approved_leaves:
            emp_id = leave.employee.id
            leave_days = [
                leave.from_date + timedelta(days=i)
                for i in range((leave.to_date - leave.from_date).days + 1)
            ]
            for day in leave_days:
                day_str = str(day)
                if emp_id in attendance_records and day_str in attendance_records[emp_id]['daily_records']:
                    daily = attendance_records[emp_id]['daily_records'][day_str]
                    if daily['status'] != 'H':
                        daily['status'] = 'L'
                        daily['leave_type'] = leave.leave_type.leave_name if leave.leave_type else ''

        # Punch, worked hours
        for record in attendance_qs:
            emp_id = record.employee.id
            day = str(record.date)

            if emp_id not in attendance_records or day not in attendance_records[emp_id]['daily_records']:
                continue

            daily = attendance_records[emp_id]['daily_records'][day]
            daily['punch_in'] = record.check_in
            daily['punch_out'] = record.check_out

            if record.leave:
                daily['status'] = 'L'
                continue

            if record.check_in and record.shift:
                shift_start = timezone.make_aware(datetime.combine(record.date, record.shift.checkin))
                grace = record.shift.grace()
                if record.check_in > shift_start + grace:
                    daily['is_late'] = True

            if record.check_in and record.check_out:
                pin = timezone.localtime(record.check_in)
                pout = timezone.localtime(record.check_out)
                worked_seconds = (pout - pin).total_seconds()

                breaks = record.breaks.all()
                for b in breaks:
                    if b.start and b.end:
                        worked_seconds -= (b.end - b.start).total_seconds()

                worked_hours = max(round(worked_seconds / 3600, 2), 0.0)
                daily['worked_hours'] = worked_hours

        # Compute totals
        for emp_id, emp_data in attendance_records.items():
            total_present = 0.0
            total_hours = 0.0

            for date, daily in emp_data['daily_records'].items():
                if daily['status'] in ['H', 'L']:
                    total_present += 1
                    continue

                worked_hours = daily['worked_hours']
                shift_record = attendance_qs.filter(employee__id=emp_id, date=date).first()
                shift = shift_record.shift if shift_record else None

                if not shift:
                    continue

                full_day = shift.full_day_hours()
                half_day = shift.half_day_hours()

                if worked_hours >= full_day:
                    daily['status'] = 'P'
                    total_present += 1
                elif worked_hours >= half_day:
                    daily['status'] = 'H'
                    total_present += 0.5
                else:
                    daily['status'] = 'A'

                total_hours += worked_hours

            num_working_days = len(emp_data['daily_records'])
            emp_data['total_hours'] = round(total_hours, 2)
            emp_data['attendance_percentage'] = round((total_present / num_working_days) * 100, 2) if num_working_days else 0.0

        return Response({
            'month_dates': month_dates,
            'attendance_records': list(attendance_records.values()),
        })
        
class AttendanceLogView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        employee_id = request.data.get('employee_id')
        date_str = request.data.get('date')
        check_in = request.data.get('check_in')
        check_out = request.data.get('check_out')
        remarks = request.data.get('remarks', '')
        status_val = request.data.get('status', None)  # Optional: Present/Absent/Leave/Half Day/Holiday

        if not employee_id or not date_str:
            return Response({'error': 'employee_id and date are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            emp = Employee.objects.get(employee_id=employee_id)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except Exception:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        att, created = Attendance.objects.get_or_create(
                            employee=emp,
                            date=date_obj,
                            company=emp.company,  # Ensure company is set
                            defaults={}
                        )        # Prefill check-in if exists and no check-out
        prefill = {}
        if att.check_in and not att.check_out:
            prefill['check_in'] = att.check_in.strftime('%H:%M')

        # Update fields if provided
        if check_in:
            att.check_in = datetime.combine(date_obj, datetime.strptime(check_in, '%H:%M').time())
        if check_out:
            att.check_out = datetime.combine(date_obj, datetime.strptime(check_out, '%H:%M').time())
        if remarks:
            att.remarks = remarks
        if status_val:
            att.status = status_val  # If you have a status field

        att.save()

        return Response({
            'message': 'Attendance updated.',
            'employee_id': emp.employee_id,
            'date': date_str,
            'check_in': att.check_in.strftime('%H:%M') if att.check_in else None,
            'check_out': att.check_out.strftime('%H:%M') if att.check_out else None,
            'remarks': att.remarks,
            'prefill': prefill
        }, status=status.HTTP_200_OK)
        
    def get(self, request):
        month = request.query_params.get('month')  
        if not month:
            return Response({"error": "Month parameter required (format: YYYY-MM)"}, status=400)

        try:
            year, month_num = map(int, month.split('-'))
            start_date = datetime(year, month_num, 1).date()
            end_date = datetime(year, month_num, monthrange(year, month_num)[1]).date()
        except (ValueError, IndexError):
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=400)

        # Get holidays for the month
        holidays = CalendarEvent.objects.filter(
            date__range=(start_date, end_date), 
            is_holiday=True,
            company=request.user.company
        )
        holidays_dict = {h.date: h.name for h in holidays}

        # Get employees with related data
        employees = Employee.objects.filter(
            company=request.user.company,
            is_active=True
        ).select_related('department').prefetch_related('attendances')
        
        result = []
        
        for emp in employees:
            # Get all attendance records for this employee in the month
            attendance_qs = Attendance.objects.filter(
                employee=emp, 
                date__range=(start_date, end_date)
            ).select_related('shift').prefetch_related('break_logs')
            
            # Get department working days configuration
            dept_working_days = DepartmentWiseWorkingDays.objects.filter(
                department=emp.department,
                company=request.user.company
            ).first()
            
            # Determine working days for this employee
            working_days = self._get_working_days_for_month(
                start_date, end_date, dept_working_days, holidays_dict
            )
            
            daily_data = []
            present_days = absent_days = leave_days = half_days = late_days = 0
            total_worked_hours = 0.0
            leave_summary = {}

            # Process each attendance record
            for att in attendance_qs:
                daily_record = self._process_attendance_record(att, emp.company)
                daily_data.append(daily_record)
                
                # Count status types
                status = daily_record["status"]
                worked_hours = daily_record["worked_hours"]
                
                if status == "Present":
                    present_days += 1
                    total_worked_hours += worked_hours
                    if daily_record["is_late"]:
                        late_days += 1
                elif status == "Half Day":
                    half_days += 1
                    present_days += 0.5
                    total_worked_hours += worked_hours
                    if daily_record["is_late"]:
                        late_days += 1
                elif status == "Leave":
                    leave_days += 1
                    leave_type = daily_record["leave_type"]
                    if leave_type:
                        leave_summary[leave_type] = leave_summary.get(leave_type, 0) + 1
                elif status == "Absent":
                    absent_days += 1
                # Note: Holidays are not counted in any category as they're non-working days

            # Add holidays to daily data
            for holiday_date, holiday_name in holidays_dict.items():
                if start_date <= holiday_date <= end_date:
                    daily_data.append({
                        "date": str(holiday_date),
                        "status": "Holiday",
                        "check_in": None,
                        "check_out": None,
                        "worked_hours": 0.0,
                        "scheduled_hours": 0.0,
                        "break_time": 0.0,
                        "overtime_hours": 0.0,
                        "is_late": False,
                        "late_by_minutes": 0,
                        "early_departure": False,
                        "early_departure_minutes": 0,
                        "leave_type": None,
                        "leave_type_initials": None,
                        "half_day": False,
                        "remarks": holiday_name,
                        "shift_type": None
                    })

            # Fill missing days as Absent (only for working days)
            all_dates = {att.date for att in attendance_qs}
            all_dates.update(holidays_dict.keys())
            
            for single_date in working_days:
                if single_date not in all_dates:
                    daily_data.append({
                        "date": str(single_date),
                        "status": "Absent",
                        "check_in": None,
                        "check_out": None,
                        "worked_hours": 0.0,
                        "scheduled_hours": 8.0,  # Default
                        "break_time": 0.0,
                        "overtime_hours": 0.0,
                        "is_late": False,
                        "late_by_minutes": 0,
                        "early_departure": False,
                        "early_departure_minutes": 0,
                        "leave_type": None,
                        "leave_type_initials": None,
                        "half_day": False,
                        "remarks": "No attendance record",
                        "shift_type": None
                    })
                    absent_days += 1

            # Calculate totals and percentages
            total_working_days = len(working_days)
            total_days_present = present_days  # This includes half days as 0.5
            
            # Attendance percentage based on working days only
            attendance_percentage = (total_days_present / total_working_days * 100) if total_working_days > 0 else 0
            
            # Average working hours per present day
            avg_hours_per_day = total_worked_hours / present_days if present_days > 0 else 0
            
            # Calculate monthly expected working hours
            total_expected_hours = 0.0
            total_overtime_hours = 0.0
            total_break_time = 0.0
            
            for daily_record in daily_data:
                if daily_record["status"] not in ["Holiday"]:
                    total_expected_hours += daily_record["scheduled_hours"]
                    total_overtime_hours += daily_record["overtime_hours"]
                    total_break_time += daily_record["break_time"]
            
            # Working hours efficiency (actual vs expected)
            hours_efficiency = (total_worked_hours / total_expected_hours * 100) if total_expected_hours > 0 else 0
            
            # Working hours shortage/surplus
            hours_variance = total_worked_hours - total_expected_hours

            # Get company's shift policies for reference
            company_shifts = ShiftPolicy.objects.filter(company=request.user.company)
            shift_policies_info = [
                {
                    "id": shift.id,
                    "shift_type": shift.shift_type or f"Shift {shift.id}",
                    "full_day_hours": shift.full_day_hours(),
                    "half_day_hours": shift.half_day_hours(),
                    "checkin": shift.checkin.strftime('%H:%M') if shift.checkin else None,
                    "checkout": shift.checkout.strftime('%H:%M') if shift.checkout else None,
                    "grace_period_minutes": int(shift.grace().total_seconds() / 60) if shift.grace() else 0
                }
                for shift in company_shifts
            ]

            result.append({
                "employee_id": emp.employee_id,
                "employee_name": emp.full_name,
                "department": emp.department.department_name if emp.department else None,
                "month": month,
                
                # Monthly Working Days Statistics
                "total_working_days": total_working_days,
                "total_present_days": round(total_days_present, 2),
                "total_absent_days": absent_days,
                "total_leave_days": leave_days,
                "total_half_days": half_days,
                "total_late_days": late_days,
                "total_holidays": len(holidays_dict),
                
                # Monthly Working Hours Statistics
                "total_worked_hours": round(total_worked_hours, 2),
                "total_expected_hours": round(total_expected_hours, 2),
                "total_overtime_hours": round(total_overtime_hours, 2),
                "total_break_time": round(total_break_time, 2),
                "hours_variance": round(hours_variance, 2),  # Positive = overtime, Negative = shortage
                
                # Monthly Percentages & Averages
                "percentage_present": round(attendance_percentage, 2),
                "hours_efficiency": round(hours_efficiency, 2),  # Actual vs Expected hours percentage
                "average_hours_per_day": round(avg_hours_per_day, 2),
                "average_hours_per_working_day": round(total_worked_hours / total_working_days, 2) if total_working_days > 0 else 0,
                
                # Additional Monthly Insights
                "monthly_summary": {
                    "productive_days": present_days + half_days,  # Days with any work done
                    "non_productive_days": absent_days,
                    "leave_utilization": leave_days,
                    "punctuality_score": round((present_days - late_days) / present_days * 100, 2) if present_days > 0 else 100,
                    "overtime_frequency": sum(1 for d in daily_data if d["overtime_hours"] > 0),
                    "break_usage_hours": round(total_break_time, 2)
                },
                
                # Reference Data
                "holidays": [{"date": str(d), "name": n} for d, n in holidays_dict.items()],
                "leave_summary": leave_summary,
                "shift_policies": shift_policies_info,
                "daily_attendance": sorted(daily_data, key=lambda x: x["date"])
            })

        return Response(result)

    def _get_working_days_for_month(self, start_date, end_date, dept_working_days, holidays):
        """Get all working days for the month excluding weekends and holidays"""
        working_days = []
        current_date = start_date
        
        # Define weekday mapping
        weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        if dept_working_days:
            # Get valid working days based on department configuration
            start_idx = weekdays.index(dept_working_days.week_start_day.lower())
            end_idx = weekdays.index(dept_working_days.week_end_day.lower())
            
            if start_idx <= end_idx:
                valid_weekdays = weekdays[start_idx:end_idx + 1]
            else:
                valid_weekdays = weekdays[start_idx:] + weekdays[:end_idx + 1]
        else:
            # Default to Monday-Friday
            valid_weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        
        while current_date <= end_date:
            day_name = current_date.strftime('%A').lower()
            
            # Include if it's a valid working day and not a holiday
            if day_name in valid_weekdays and current_date not in holidays:
                working_days.append(current_date)
            
            current_date += timedelta(days=1)
        
        return working_days

    def _process_attendance_record(self, attendance, company):
        """Process a single attendance record and return comprehensive data"""
        shift_policy = attendance.shift
        
        # If no shift assigned, get company's default shift
        if not shift_policy:
            shift_policy = ShiftPolicy.objects.filter(company=company).first()
        
        # Calculate basic worked hours
        worked_hours = 0.0
        scheduled_hours = shift_policy.full_day_hours() if shift_policy else 8.0
        break_time = 0.0
        overtime_hours = 0.0
        
        if attendance.check_in and attendance.check_out:
            # Calculate total time between check-in and check-out
            check_in_dt = attendance.check_in
            check_out_dt = attendance.check_out
            
            # Convert to local time for calculation
            check_in_local = localtime(check_in_dt)
            check_out_local = localtime(check_out_dt)
            
            total_seconds = (check_out_local - check_in_local).total_seconds()
            
            # Deduct break time
            break_logs = attendance.break_logs.all()
            total_break_seconds = 0
            
            for break_log in break_logs:
                if break_log.start and break_log.end:
                    break_duration = (break_log.end - break_log.start).total_seconds()
                    total_break_seconds += break_duration
            
            break_time = round(total_break_seconds / 3600, 2)
            worked_hours = round((total_seconds - total_break_seconds) / 3600, 2)
            worked_hours = max(0, worked_hours)  # Ensure non-negative
            
            # Calculate overtime (hours worked beyond scheduled hours)
            if worked_hours > scheduled_hours:
                overtime_hours = worked_hours - scheduled_hours

        # Determine status based on worked hours and shift policy
        status = "Absent"
        half_day = False
        
        if attendance.leave:
            status = "Leave"
        elif worked_hours > 0 and shift_policy:
            if worked_hours >= shift_policy.full_day_hours():
                status = "Present"
            elif worked_hours >= shift_policy.half_day_hours():
                status = "Half Day"
                half_day = True
            else:
                status = "Absent"  # Insufficient hours worked
        elif worked_hours > 0:
            # No shift policy, use default thresholds
            if worked_hours >= 8.0:
                status = "Present"
            elif worked_hours >= 4.0:
                status = "Half Day"
                half_day = True
            else:
                status = "Absent"

        # Check if late
        is_late = False
        late_minutes = 0
        if shift_policy and attendance.check_in:
            scheduled_checkin = datetime.combine(attendance.date, shift_policy.checkin)
            actual_checkin = datetime.combine(attendance.date, localtime(attendance.check_in).time())
            grace_period = shift_policy.grace()
            
            if actual_checkin > (scheduled_checkin + grace_period):
                is_late = True
                late_minutes = int((actual_checkin - scheduled_checkin).total_seconds() / 60)

        # Check for early departure
        early_departure = False
        early_departure_minutes = 0
        if shift_policy and attendance.check_out:
            scheduled_checkout = datetime.combine(attendance.date, shift_policy.checkout)
            actual_checkout = datetime.combine(attendance.date, localtime(attendance.check_out).time())
            
            if actual_checkout < scheduled_checkout:
                early_departure = True
                early_departure_minutes = int((scheduled_checkout - actual_checkout).total_seconds() / 60)

        # Get leave information
        leave_type_val = None
        leave_type_initials = None
        if attendance.leave and attendance.leave.leave_type:
            leave_type_val = attendance.leave.leave_type.leave_name
            leave_type_initials = leave_type_val[:2].upper() if leave_type_val else None

        return {
            "date": str(attendance.date),
            "status": status,
            "check_in": localtime(attendance.check_in).strftime("%H:%M") if attendance.check_in else None,
            "check_out": localtime(attendance.check_out).strftime("%H:%M") if attendance.check_out else None,
            "worked_hours": worked_hours,
            "scheduled_hours": scheduled_hours,
            "break_time": break_time,
            "overtime_hours": overtime_hours,
            "is_late": is_late,
            "late_by_minutes": late_minutes,
            "early_departure": early_departure,
            "early_departure_minutes": early_departure_minutes,
            "leave_type": leave_type_val,
            "leave_type_initials": leave_type_initials,
            "half_day": half_day,
            "remarks": attendance.remarks or "",
            "shift_type": shift_policy.shift_type if shift_policy else None
        }


class CompanyPoliciesViewSet(viewsets.ModelViewSet):
    queryset = CompanyPolicies.objects.all()
    serializer_class = PolicyConfigurationSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return CompanyPolicies.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
 
class ApprovedLeaveLogView(APIView):
    def get(self, request):
        
        qs = EmpLeave.objects.filter(
            status='Approved',
            company=request.user.company
        ).select_related('employee__user', 'reporting_manager')

        if employee_id := request.GET.get("employee_id"):
            qs = qs.filter(employee__id=employee_id)
        if from_date := request.GET.get("from_date"):
            qs = qs.filter(from_date__gte=from_date)
        if to_date := request.GET.get("to_date"):
            qs = qs.filter(from_date__lte=to_date)

        serializer = LeaveLogSerializer(qs, many=True)
        return Response(serializer.data)


class RejectedLeaveLogView(generics.ListAPIView):
    serializer_class = LeaveLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = EmpLeave.objects.filter(
            status='Rejected',
            company=self.request.user.company
        ).select_related('employee', 'reporting_manager')

        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        employee_id = self.request.query_params.get('employee_id')

        if from_date:
            qs = qs.filter(from_date__gte=from_date)
        if to_date:
            qs = qs.filter(from_date__lte=to_date)
        if employee_id:
            qs = qs.filter(employee__id=employee_id)

        return qs
   
class UserLogListView(generics.ListAPIView):
    serializer_class = UserLogSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = UserRegister.objects.filter(company=self.request.user.company)
        username = self.request.query_params.get('username')
        if username:
            qs = qs.filter(username=username)
        return qs


class UserLogDeleteView(generics.DestroyAPIView):
    serializer_class = UserLogSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return UserRegister.objects.filter(company=self.request.user.company)


class BreakConfigViewSet(viewsets.ModelViewSet):
    serializer_class = BreakConfigSerializer
    permission_classes = [IsAuthenticated,IsAdminUser]

    def get_queryset(self):
        return BreakConfig.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
        
        
        
class LetterTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = LetterTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return LetterTemplate.objects.filter(
            company=self.request.user.company
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="preview")
    def preview(self, request, pk=None):
        """
        Preview a letter template with candidate data before sending
        """
        template = self.get_object()
        candidate_data = request.data.get("candidate_data", {})

        try:
            # Use safe Python string.Template
            tmpl = string.Template(template.content)
            rendered_text = tmpl.safe_substitute(candidate_data)  
            
            return Response({
                "template_id": template.id,
                "preview_text": rendered_text,
                "input_data": candidate_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        


class GenerateLetterContentAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]


    def post(self, request):
        
        template_id = request.data.get('template_id')
        letter_type = request.data.get('type')
        employee_id = request.data.get('employee_id')
        candidate_id = request.data.get('candidate_id')
        relieved_employee_id = request.data.get('relieved_employee_id')
        email_content = request.data.get('email_content')

        if not letter_type:
            return Response({'error': 'Letter type is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch template
        try:
            template = LetterTemplate.objects.get(id=template_id, company=request.user.company)
        except LetterTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)

        # Determine which model to use
        obj = None
        obj_type = None
        recipient_email = None
        if employee_id:
            try:
                obj = Employee.objects.select_related('company', 'department', 'designation').get(id=employee_id, company=request.user.company)
                obj_type = 'employee'
                recipient_email = obj.email
            except Employee.DoesNotExist:
                return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        elif candidate_id:
            try:
                obj = Recruitment.objects.get(id=candidate_id)
                obj_type = 'candidate'
                recipient_email = obj.email
            except Recruitment.DoesNotExist:
                return Response({'error': 'Candidate not found'}, status=status.HTTP_404_NOT_FOUND)
        elif relieved_employee_id:
            try:
                obj = RelievedEmployee.objects.select_related('employee').get(id=relieved_employee_id)
                obj_type = 'relievedemployee'
                recipient_email = obj.employee.email if obj.employee else None
            except RelievedEmployee.DoesNotExist:
                return Response({'error': 'Relieved employee not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'error': 'No valid person id provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Build data dict for placeholders
        data = {}
        if obj_type == 'employee':
            data = {
                'name': obj.full_name,
                'employee_id': obj.employee_id,
                'designation': obj.designation.designation_name if obj.designation else '',
                'department': obj.department.department_name if obj.department else '',
                'joining_date': obj.date_of_joining.strftime('%Y-%m-%d') if obj.date_of_joining else '',
                'last_working_date': obj.date_of_releaving.strftime('%Y-%m-%d') if obj.date_of_releaving else '',
                'ctc': str(obj.ctc) if obj.ctc else '',
                'company': obj.company.name if obj.company else '',
                'location': obj.company.location if obj.company else '',
            }
        elif obj_type == 'candidate':
            data = {
                'name': obj.name,
                'designation': obj.job_title,
                'joining_date': obj.appointment_date.strftime('%Y-%m-%d') if obj.appointment_date else '',
                'ctc': str(obj.salary) if obj.salary else '',
                'company': request.user.company.name if hasattr(request.user, 'company') and request.user.company else '',
                'location': request.user.company.location if hasattr(request.user, 'company') and request.user.company else '',
                'address': obj.address or '',
            }
        elif obj_type == 'relievedemployee':
            emp = obj.employee
            data = {
                'name': emp.full_name,
                'employee_id': emp.employee_id,
                'designation': emp.designation.designation_name if emp.designation else '',
                'department': emp.department.department_name if emp.department else '',
                'joining_date': emp.date_of_joining.strftime('%Y-%m-%d') if emp.date_of_joining else '',
                'last_working_date': obj.relieving_date.strftime('%Y-%m-%d') if obj.relieving_date else '',
                'ctc': str(emp.ctc) if emp.ctc else '',
                'company': emp.company.name if emp.company else '',
                'location': emp.company.location if emp.company else '',
            }

        # Find all placeholders in the template
        placeholders = set(re.findall(r'<(\w+)>', template.content))

        # Replace placeholders in letter content
        def replacer(match):
            key = match.group(1)
            return str(data.get(key, f'<{key}>'))
        filled_content = re.sub(r'<(\w+)>', replacer, template.content)

        # Replace placeholders in email_content (only <name> and <company> for safety)
        if email_content:
            email_content = re.sub(r'<(name|company)>', lambda m: str(data.get(m.group(1), f'<{m.group(1)}>')), email_content)

        generated_letter = None
        if obj_type == 'candidate':
            generated_letter, created = GeneratedLetter.objects.get_or_create(
                candidate=obj,
                template=template,
                type=letter_type,
                defaults={
                    'content': filled_content,
                    'title': template.title,
                }
            )
            if not created:
                generated_letter.content = filled_content
                generated_letter.title = template.title
                generated_letter.save()
        elif obj_type == 'employee':
            generated_letter, created = GeneratedLetter.objects.get_or_create(
                employee=obj,
                template=template,
                type=letter_type,
                defaults={
                    'content': filled_content,
                    'title': template.title,
                }
            )
            if not created:
                generated_letter.content = filled_content
                generated_letter.title = template.title
                generated_letter.save()
        elif obj_type == 'relievedemployee':
            generated_letter, created = GeneratedLetter.objects.get_or_create(
                relieved_employee=obj,
                template=template,
                type=letter_type,
                defaults={
                    'content': filled_content,
                    'title': template.title,
                }
            )
            if not created:
                generated_letter.content = filled_content
                generated_letter.title = template.title
                generated_letter.save()

        # --- EMAIL SENDING LOGIC ---
        # Only send if not already sent
        if hasattr(generated_letter, 'sent') and generated_letter.sent:
            return Response({
                'content': filled_content,
                'placeholders': list(placeholders),
                'filled': data,
                'generated_letter_id': generated_letter.id if generated_letter else None,
                'email_status': 'already_sent'
            }, status=status.HTTP_200_OK)

        # Generate PDF (implement generate_letter_pdf to return PDF bytes)
        try:
            # Determine company for PDF context
            if obj_type == 'candidate':
                company = request.user.company
            elif obj_type == 'employee':
                company = obj.company
            elif obj_type == 'relievedemployee':
                company = emp.company
            else:
                company = None
            pdf_bytes = generate_letter_pdf(company, template.title, filled_content)
        except Exception as e:
            return Response({'error': f'PDF generation failed: {str(e)}'}, status=500)

        # Send email if recipient email and email_content are present
        if recipient_email and email_content:
            try:
                email = EmailMessage(
                    subject=template.title,
                    body=email_content,
                    to=[recipient_email]
                )
                email.attach(f"{template.title}.pdf", pdf_bytes, "application/pdf")
                email.send()
                # Mark as sent
                generated_letter.sent = True
                generated_letter.sent_at = timezone.now()
                generated_letter.save()
                email_status = 'sent'
            except Exception as e:
                email_status = f'error: {str(e)}'
        else:
            email_status = 'no_email_or_content'

        return Response({
            'content': filled_content,
            'placeholders': list(placeholders),
            'filled': data,
            'generated_letter_id': generated_letter.id if generated_letter else None,
            'email_status': email_status
        }, status=status.HTTP_200_OK)
        


class GeneratedLetterViewSet(viewsets.ModelViewSet):
    queryset = GeneratedLetter.objects.all()
    serializer_class = GeneratedLetterSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        letter_type = self.request.query_params.get('type')
        template_id = self.request.query_params.get('template_id')
        candidate_id = self.request.query_params.get('candidate_id')
        relieved_id = self.request.query_params.get('relieved_id')

        if letter_type:
            queryset = queryset.filter(type=letter_type)
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        if candidate_id:
            queryset = queryset.filter(candidate_id=candidate_id)
        if relieved_id:
            queryset = queryset.filter(relieved_employee_id=relieved_id)
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save()
        uploaded_file = self.request.FILES.get('file')
        if uploaded_file:
            # Save the file and set file_path (adjust path as needed)
            instance.file_path = f'letters/{uploaded_file.name}'
            instance.save()