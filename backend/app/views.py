from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsMaster,IsAdminUser
from .serializers import *
from .models import *


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
