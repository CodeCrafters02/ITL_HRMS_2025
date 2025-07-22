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
router.register(r'relieved-employees', RelievedEmployeeViewSet, basename='relieved-employees')
router.register(r'salary-structures', SalaryStructureViewSet, basename='salary-structures')
router.register(r'payroll-batches', PayrollBatchViewSet, basename='payroll-batches')
router.register(r'payrolls', PayrollViewSet, basename='payrolls')
router.register(r'income-tax-configs', IncomeTaxConfigViewSet, basename='income-tax-configs')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'policies', CompanyPoliciesViewSet, basename='company-policies')


urlpatterns = [
    path('', include(router.urls)),
    path('change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('users/', UserLogListView.as_view(), name='user_log_api'),
    path('users/<int:pk>/', UserLogDeleteView.as_view(), name='delete_user_api'),
    path('leaves/approved/', ApprovedLeaveLogView.as_view(), name='approved_leave_log'),
    path('leaves/rejected/', RejectedLeaveLogView.as_view(), name='rejected_leave_log'),




]
