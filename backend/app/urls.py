from django.urls import path, include
# Timestamp: 2026-04-24 16:20
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'master-register', MasterRegisterViewSet, basename='master-register')
router.register(r'admin-register', AdminRegisterViewSet, basename='admin-register')
router.register(r'company-with-admin', CompanyWithAdminViewSet, basename='company-with-admin')
router.register(r'departments', DepartmentViewSet,basename='departments')
router.register(r'levels', LevelViewSet,basename='levels')
router.register(r'designations', DesignationViewSet,basename='designations')
router.register(r'supply-items', SupplyItemViewSet, basename='supply-item')
router.register(r'fixed-assets', FixedAssetViewSet, basename='fixed-asset')
router.register(r'asset-requests', AssetRequestViewSet, basename='asset-request')
router.register(r'asset-documents', AssetSupportingDocumentViewSet, basename='asset-document')
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
router.register(r'usermanagement', UserManagementViewSet, basename='usermanagement')
router.register(r'break-config', BreakConfigViewSet, basename='break-config')
router.register(r"letter-templates", LetterTemplateViewSet, basename="lettertemplate")
router.register(r'generated-letters', GeneratedLetterViewSet, basename='generatedletter')
router.register(r'employeestatus', EmployeeStatusViewSet, basename='employeestatus')
router.register(r'office-locations', OfficeLocationViewSet, basename='office-locations')
router.register(r'office-floors', OfficeFloorViewSet, basename='office-floors')
router.register(r'office-sections', OfficeSectionViewSet, basename='office-sections')
router.register(r'office-seats', OfficeSeatViewSet, basename='office-seats')
router.register(r'seat-bookings', SeatBookingViewSet, basename='seat-bookings')
router.register(r'conference-rooms', ConferenceRoomViewSet, basename='conference-rooms')
router.register(r'conference-room-bookings', ConferenceRoomBookingViewSet, basename='conference-room-bookings')
router.register(r'conference-room-config', ConferenceRoomConfigViewSet, basename='conference-room-config')
router.register(r'chat-conversations', ChatConversationViewSet, basename='chat-conversations')
router.register(r'chat-messages', ChatMessageViewSet, basename='chat-messages')
router.register(r'reimbursement-categories', ReimbursementCategoryViewSet, basename='reimbursement-category')
router.register(r'reimbursement-requests', ReimbursementRequestViewSet, basename='reimbursement-request')
router.register(r'designation-salaries', DesignationSalaryViewSet, basename='designation-salary')
router.register(r'gross-components', GrossSalaryComponentViewSet, basename='gross-components')
router.register(r'deduction-components', SalaryDeductionComponentViewSet, basename='deduction-components')
router.register(r'finalized-salary', FinalizedSalaryViewSet, basename='finalized-salary')
router.register(r'loan-categories', LoanCategoryViewSet, basename='loan-category')
router.register(r'loan-interest-slabs', LoanInterestSlabViewSet, basename='loan-interest-slab')
router.register(r'loan-applications', LoanApplicationViewSet, basename='loan-application')

urlpatterns = [
    path('salary-disbursement-statement/', SalaryDisbursementStatementView.as_view(), name='salary-disbursement-statement'),
    # --- Manual API Views (Checked First) ---
    path('chat/users/', ChatCompanyUsersAPIView.as_view(), name='chat-company-users'),
    path('company-update/', CompanyUpdateAPIView.as_view(), name='company_get'),
    path('company-update/<int:pk>/', CompanyUpdateAPIView.as_view(), name='company_update'),
    path('change-password/', CustomPasswordChangeAPIView.as_view(), name='custom-password-change'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('google-login/', GoogleLoginAPIView.as_view(), name='google-login'),
    path('change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('users/', UserLogListView.as_view(), name='user_log_api'),
    path('master-dashboard/', MasterDashboardView.as_view(), name='master_dashboard'),
    path('admin-dashboard/', AdminDashboardAPIView.as_view(), name='admin-dashboard'),
    path('company-logo/', CompanyLogoAPIView.as_view(), name='company_logo_get_by_admin'),
    path('users/<int:pk>/', UserLogDeleteView.as_view(), name='delete_user_api'),
    path('approved-leaves/', ApprovedLeaveLogView.as_view(), name='approved_leave_log'),
    path('rejected-leaves/', RejectedLeaveLogView.as_view(), name='rejected_leave_log'),
    path('pending-leaves/', PendingLeaveLogView.as_view(), name='pending_leave_log'),
    path('pending-leaves/<int:leave_id>/approve/', AdminApproveEmpLeaveView.as_view(), name='admin_leave_approve'),
    path('pending-leaves/<int:leave_id>/reject/', AdminRejectEmpLeaveView.as_view(), name='admin_leave_reject'),
    path('leave-history/', LeaveHistoryView.as_view(), name='leave_history'),
    path('attendance-logs/', AttendanceLogView.as_view(), name='attendance_log'),
    path('generate-payroll/', GeneratePayrollView.as_view(), name='generate-payroll'),
    path('generate-letter-content/', GenerateLetterContentAPIView.as_view(), name='generate-letter-content'),
    path('token/refresh/', RefreshTokenView.as_view(), name='token_refresh'),
    path('assignshift/', AssignShiftAPIView.as_view(), name='assignshift'),
    path('updateusernamepassword/', UserUpdateView.as_view(), name='updateusernamepassword'),
    path('sendotp/', SendOtpView.as_view(),name='sendotp'),
    path('verifyotp/', VerifyOTPView.as_view(),name='verifyotp'),
    path('resetpassword/', ResetPasswordView.as_view(), name='resetpassword'),
    path('getreportees/', EmployeeReporteesView.as_view(), name='getreportees'),
    path('payroll-attendance-summary/', PayrollAttendanceSummaryView.as_view(), name='payroll-attendance-summary'),

    # --- Router URLs (Catch-all - Checked Last) ---
    path('', include(router.urls)),
]
