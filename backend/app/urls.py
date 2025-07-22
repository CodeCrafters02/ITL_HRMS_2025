from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'master-register', MasterRegisterViewSet, basename='master-register')
router.register(r'admin-register', AdminRegisterViewSet, basename='admin-register')
router.register(r'company-with-admin', CompanyWithAdminViewSet, basename='company-with-admin')
router.register(r'departments', DepartmentViewSet,basename='departments')
router.register(r'levels', LevelViewSet,basename='levels')
router.register(r'designations', DesignationViewSet,basename='designations')
router.register(r'assets', AssetInventoryViewSet, basename='asset')
router.register(r'employee', EmployeeViewSet, basename='employee')
router.register(r'recruitment', RecruitmentViewSet, basename='recruitment')
router.register(r'leaves', LeaveViewSet, basename='leave')
router.register(r'learning-corner', LearningCornerViewSet, basename='learning-corner')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'shift-policies', ShiftPolicyViewSet,basename='shift-policies')
router.register(r'department-working-days', DepartmentWiseWorkingDaysViewSet,basename='department-working-days')
router.register(r'calendar-events', CalendarEventViewSet,basename='calendar-events')


urlpatterns = [
    path('', include(router.urls)),
]
