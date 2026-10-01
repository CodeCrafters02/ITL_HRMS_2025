"""Self-registration (mobile app) → approval by any company admin (first to accept wins)."""
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from app.models import Employee, UserRegister

from .models import RegistrationRequest


class RegistrationRequestSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=True)
    company_name = serializers.CharField(source='company.name', read_only=True, default=None)
    approved_by_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = RegistrationRequest
        fields = [
            'id', 'first_name', 'middle_name', 'last_name', 'full_name', 'email', 'mobile', 'gender', 'date_of_birth',
            'temporary_address', 'permanent_address', 'aadhar_no', 'pan_no', 'desired_department', 'desired_designation',
            'previous_employer', 'previous_designation', 'total_experience_years', 'message', 'password',
            'status', 'company', 'company_name', 'approved_by_name', 'approved_at', 'created_at',
        ]
        read_only_fields = ['status', 'company', 'approved_at', 'created_at']

    def get_full_name(self, obj):
        return ' '.join(p for p in [obj.first_name, obj.middle_name, obj.last_name] if p)

    def get_approved_by_name(self, obj):
        u = obj.approved_by
        return (f'{u.first_name} {u.last_name}'.strip() or u.username) if u else None

    def validate_email(self, value):
        email = value.strip().lower()
        if UserRegister.objects.filter(email__iexact=email).exists() or Employee.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('An account with this email already exists. Please sign in instead.')
        if RegistrationRequest.objects.filter(email__iexact=email, status='pending').exists():
            raise serializers.ValidationError('A registration request with this email is already awaiting approval.')
        return email

    def validate_mobile(self, value):
        digits = ''.join(ch for ch in value if ch.isdigit())
        if len(digits) < 10:
            raise serializers.ValidationError('Enter a valid mobile number.')
        return digits[-10:]

    def create(self, validated_data):
        validated_data['password_hash'] = make_password(validated_data.pop('password'))
        return super().create(validated_data)


def _admin_company(user):
    if getattr(user, 'role', '') != 'admin' or not getattr(user, 'company_id', None):
        return None
    return user.company


class RegistrationRequestViewSet(viewsets.GenericViewSet):
    """
    POST   /employee/registration-requests/              public — submit a registration
    GET    /employee/registration-requests/status/?email= public — pending / approved / not_found
    GET    /employee/registration-requests/?status=pending|approved   admins
    POST   /employee/registration-requests/{id}/approve/  admins — first admin to accept wins
    POST   /employee/registration-requests/{id}/dismiss/  admins — hide for this company only
    """
    serializer_class = RegistrationRequestSerializer
    queryset = RegistrationRequest.objects.select_related('company', 'approved_by')

    def get_permissions(self):
        if self.action in ('create', 'check_status'):
            return [AllowAny()]
        return [IsAuthenticated()]

    def create(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(
            {'detail': 'Registration submitted. You can sign in once an admin approves it.', 'id': ser.instance.id},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='status')
    def check_status(self, request):
        email = (request.query_params.get('email') or '').strip().lower()
        req = RegistrationRequest.objects.filter(email__iexact=email).first() if email else None
        if not req:
            return Response({'status': 'not_found'})
        return Response({'status': req.status, 'company_name': req.company.name if req.company else None})

    def list(self, request):
        company = _admin_company(request.user)
        if not company:
            return Response({'detail': 'Only company admins can review registrations.'}, status=status.HTTP_403_FORBIDDEN)
        wanted = request.query_params.get('status', 'pending')
        if wanted == 'approved':
            qs = self.get_queryset().filter(status='approved', company=company)
        else:
            qs = self.get_queryset().filter(status='pending').exclude(dismissed_by_companies=company)
        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(email__icontains=search)
                | Q(mobile__icontains=search) | Q(desired_designation__icontains=search)
            )
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        company = _admin_company(request.user)
        if not company:
            return Response({'detail': 'Only company admins can approve registrations.'}, status=status.HTTP_403_FORBIDDEN)
        with transaction.atomic():
            req = RegistrationRequest.objects.select_for_update().filter(pk=pk).first()
            if not req:
                return Response({'detail': 'Registration request not found.'}, status=status.HTTP_404_NOT_FOUND)
            if req.status != 'pending':
                other = req.company.name if req.company else 'another company'
                return Response({'detail': f'Already accepted by {other}.'}, status=status.HTTP_409_CONFLICT)
            if UserRegister.objects.filter(email__iexact=req.email).exists() or Employee.objects.filter(email__iexact=req.email).exists():
                return Response({'detail': 'An account with this email already exists.'}, status=status.HTTP_409_CONFLICT)

            user = UserRegister(
                username=req.email,
                email=req.email,
                first_name=req.first_name,
                last_name=req.last_name,
                role='employee',
                company=company,
                created_by=request.user,
                is_active=True,
            )
            if req.password_hash:
                user.password = req.password_hash
            else:
                user.set_unusable_password()
            user.save()

            employee = Employee.objects.create(
                user=user,
                company=company,
                first_name=req.first_name,
                middle_name=req.middle_name or None,
                last_name=req.last_name,
                email=req.email,
                mobile=req.mobile[:11],
                gender=req.gender or None,
                date_of_birth=req.date_of_birth,
                temporary_address=req.temporary_address or None,
                permanent_address=req.permanent_address or None,
                aadhar_no=req.aadhar_no or None,
                pan_no=req.pan_no or None,
                previous_employer=req.previous_employer or None,
                previous_designation_name=req.previous_designation or None,
            )

            req.status = 'approved'
            req.company = company
            req.approved_by = request.user
            req.approved_at = timezone.now()
            req.employee = employee
            req.password_hash = ''  # no longer needed once copied to the account
            req.save()

        return Response({
            'detail': f'{req.first_name} has joined {company.name}.',
            'employee_id': employee.employee_id,
            'employee_pk': employee.id,
        })

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        company = _admin_company(request.user)
        if not company:
            return Response({'detail': 'Only company admins can manage registrations.'}, status=status.HTTP_403_FORBIDDEN)
        req = RegistrationRequest.objects.filter(pk=pk, status='pending').first()
        if not req:
            return Response({'detail': 'Registration request not found or already handled.'}, status=status.HTTP_404_NOT_FOUND)
        req.dismissed_by_companies.add(company)
        return Response({'detail': 'Hidden for your company.'})
