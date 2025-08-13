from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.timezone import localtime
from django.db.models import Sum
from django.utils import timezone
from datetime import datetime, timedelta
from calendar import monthrange
from django.db import transaction
import calendar
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date
from decimal import Decimal
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsMaster,IsAdminUser
from .serializers import *
from .models import *


class CustomPasswordChangeAPIView(generics.UpdateAPIView):
    serializer_class = CustomPasswordChangeSerializer
    permission_classes = [permissions.IsAuthenticated]

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
class AdminRegisterViewSet(viewsets.ViewSet):
    def update(self, request, pk=None):
        try:
            admin = UserRegister.objects.get(pk=pk, role='admin')
        except UserRegister.DoesNotExist:
            return Response({'detail': 'Admin not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminRegisterSerializer(admin, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    permission_classes = [IsAuthenticated, IsMaster]

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
            if new_status == 'selected':
                send_mail(
                    subject='Congratulations!',
                    message=(
                        f"Dear {instance.name},\n\n"
                        f"Congratulations! You have been selected for the position of {instance.job_title}.\n"
                        "Please contact HR to confirm your acceptance.\n\n"
                        "Regards,\nYour Company"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[instance.email],
                    fail_silently=False,
                )
            elif new_status == 'rejected':
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
    queryset = RelievedEmployee.objects.all()
    serializer_class = RelievedEmployeeSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return RelievedEmployee.objects.filter(employee__company=self.request.user.company)



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
    def get(self, request):
        month = request.query_params.get('month')  
        if not month:
            return Response({"error": "Month parameter required (format: YYYY-MM)"}, status=400)

        year, month_num = map(int, month.split('-'))
        start_date = datetime(year, month_num, 1).date()
        end_date = datetime(year, month_num, monthrange(year, month_num)[1]).date()
        
        holidays = CalendarEvent.objects.filter(date__range=(start_date, end_date))
        holidays_dict = {h.date: h.name for h in holidays}

        employees = Employee.objects.all()
        shift_policy = ShiftPolicy.objects.first()  # Assuming same for all
        
        result = []
        for emp in employees:
            attendance_qs = Attendance.objects.filter(employee=emp, date__range=(start_date, end_date))
            daily_data = []
            present_days = absent_days = leave_days = half_days = late_days = 0
            leave_summary = {}

            for att in attendance_qs:
                # Infer status based on check-in/check-out
                if att.check_in and att.check_out:
                    worked_hours = (att.check_out - att.check_in).total_seconds() / 3600
                    if worked_hours >= shift_policy.full_day_hours():
                        status = "Present"
                    elif worked_hours >= shift_policy.half_day_hours():
                        status = "Half Day"
                    else:
                        status = "Absent"
                elif att.leave_type:
                    status = "Leave"
                else:
                    status = "Absent"

                # Check if late
                grace_limit = shift_policy.grace()

                # Convert check-in to localtime before extracting time
                check_in_local = localtime(att.check_in) if att.check_in else None

                scheduled_checkin = datetime.combine(att.date, shift_policy.checkin)

                if check_in_local:
                    actual_checkin = datetime.combine(att.date, check_in_local.time())
                    is_late = actual_checkin > (scheduled_checkin + grace_limit)
                    late_minutes = (actual_checkin - scheduled_checkin).seconds // 60 if is_late else 0

                    if late_minutes < 60:
                        late_by = f"{late_minutes} min"
                    else:
                        hours = late_minutes // 60
                        minutes = late_minutes % 60
                        late_by = f"{hours} hr {minutes} min" if minutes else f"{hours} hr"
                else:
                    is_late = False
                    late_by = None


                # Count status
                if status == "Present":
                    present_days += 1
                    if is_late:
                        late_days += 1
                elif status == "Half Day":
                    half_days += 1
                    present_days += 0.5
                    if is_late:
                        late_days += 1
                elif status == "Leave":
                    leave_days += 1
                    leave_summary[att.leave_type] = leave_summary.get(att.leave_type, 0) + 1
                elif status == "Absent":
                    absent_days += 1

                # Append daily data
                daily_data.append({
                    "date": str(att.date),
                    "status": status,
                    "check_in": localtime(att.check_in).strftime("%H:%M") if att.check_in else None,
                    "check_out": localtime(att.check_out).strftime("%H:%M") if att.check_out else None,
                    "is_late": is_late,
                    "late_by_minutes": late_by if is_late else 0,
                    "leave_type": att.leave,
                    "remarks": att.remarks or ""
                })

            # Add holidays
            for date, name in holidays_dict.items():
                daily_data.append({
                    "date": str(date),
                    "status": "Holiday",
                    "check_in": None,
                    "check_out": None,
                    "is_late": False,
                    "late_by_minutes": None,
                    "leave_type": None,
                    "remarks": name
                })

            total_days = present_days + half_days + leave_days + absent_days
            total_working = total_days - len(holidays_dict)

            percentage = (present_days / total_working * 100) if total_working else 0

            result.append({
                "employee_id": emp.employee_id,
                "employee_name": emp.full_name,
                "department": emp.department.department_name if emp.department else None,
                "month": month,
                "total_working_days": total_working,
                "total_present_days": round(present_days, 2),
                "total_absent_days": absent_days,
                "total_leave_days": leave_days,
                "total_half_days": half_days,
                "total_late_days": late_days,
                "late_grace_limit_minutes": 15,
                "percentage_present": f"{percentage:.2f}%",
                "holidays": [{"date": str(d), "name": n} for d, n in holidays_dict.items()],
                "leave_summary": leave_summary,
                "shift_policy": {
                    "full_day_hours": shift_policy.full_day_hours(),
                    "half_day_hours": shift_policy.half_day_hours()
                },
                "daily_attendance": sorted(daily_data, key=lambda x: x["date"])
            })

        return Response(result)


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
    queryset = BreakConfig.objects.all()
    serializer_class = BreakConfigSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        # Limit to the current user’s company
        company = self.request.user.company
        return BreakConfig.objects.filter(company=company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
