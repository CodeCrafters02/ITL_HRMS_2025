from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
from datetime import datetime, timedelta
from calendar import monthrange
from django.db import transaction
import calendar
from datetime import date
from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsMaster,IsAdminUser
from .serializers import *
from .models import *
from employee.models import EmpLeave


class MasterRegisterViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    def create(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data['role'] != 'master':
            return Response({"error": "Role must be 'master'"}, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminRegisterViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated,IsMaster]

    def create(self, request):
        serializer = AdminRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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

class CompanyWithAdminViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanyWithAdminSerializer
    permission_classes = [IsAuthenticated,IsMaster]


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
    permission_classes = [IsAuthenticated,IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        return Employee.objects.filter(company=user.company)
    
    
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
        # Check if status changed to selected or rejected
        if 'status' in self.request.data:
            new_status = self.request.data['status']
            if new_status == 'selected':
                # Send simple selected email
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
                # Send simple rejection email
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
    serializer_class = DepartmentWiseWorkingDaysSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return DepartmentWiseWorkingDays.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


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


class PayrollBatchViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollBatchSerializer

    def get_queryset(self):
        return PayrollBatch.objects.filter(company=self.request.user.company).order_by('-year', '-month')

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        batch = self.get_object()
        if batch.company != request.user.company:
            return Response({'detail': 'Not allowed'}, status=403)
        batch.status = 'Locked'
        batch.save()
        return Response({'status': 'Batch finalized'})

    @action(detail=False, methods=['post'])
    def generate(self, request):
        company = request.user.company
        today = timezone.now().date()
        month = today.month
        year = today.year

        salary_structure = SalaryStructure.objects.filter(company=company).order_by('-created_at').first()
        if not salary_structure:
            return Response({'error': 'No Salary Structure found.'}, status=400)

        batch = PayrollBatch.objects.create(company=company, month=month, year=year, status='Draft')

        employees = Employee.objects.filter(company=company)
        total_days = salary_structure.total_working_days or 30

        first_day = today.replace(day=1)
        last_day = today.replace(day=calendar.monthrange(year, month)[1])

        for emp in employees:
            gross = emp.inhand_salary or Decimal(0)

            basic = gross * salary_structure.basic_percent / 100
            hra = gross * salary_structure.hra_percent / 100
            conveyance = gross * salary_structure.conveyance_percent / 100
            medical = gross * salary_structure.medical_percent / 100
            special = gross * salary_structure.special_percent / 100
            service = gross * salary_structure.service_charge_percent / 100

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

            Payroll.objects.create(
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
            )

        return Response({'status': f'Batch {batch.id} generated'})


class PayrollViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayrollSerializer

    def get_queryset(self):
        return Payroll.objects.filter(company=self.request.user.company)


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

class CompanyPoliciesViewSet(viewsets.ModelViewSet):
    queryset = CompanyPolicies.objects.all()
    serializer_class = PolicyConfigurationSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return CompanyPolicies.objects.filter(company=self.request.user.company)
    
class ApprovedLeaveLogView(generics.ListAPIView):
    serializer_class = LeaveLogSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = EmpLeave.objects.filter(
            status='Approved',
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
