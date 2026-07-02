from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import *
from .all_notifications import AllNotificationsAPIView, NotificationSSEView

router = DefaultRouter()

router.register('employeereference', EmployeeReferenceViewSet, basename='employeereference')
router.register('multirater', MultiRaterMappingViewSet, basename='multirater')
router.register('kra-master', KRAMasterViewSet, basename='kra-master')
router.register('kpi-master', KPIMasterViewSet, basename='kpi-master')
router.register('continuous-feedback', ContinuousFeedbackViewSet, basename='continuous-feedback')
router.register('employee-kra', EmployeeKRAViewSet, basename='employee-kra')
router.register('kra-evaluations', KRAEvaluationViewSet, basename='kra-evaluations')
router.register('appraisal-extensions', AppraisalExtensionViewSet, basename='appraisal-extensions')
router.register('salary-hike-config', SalaryHikeConfigViewSet, basename='salary-hike-config')
router.register('appraisal-cycles', AppraisalCycleViewSet, basename='appraisal-cycles')
router.register('appraisal-questions', AppraisalQuestionViewSet, basename='appraisal-questions')
router.register('appraisal-evaluations', AppraisalEvaluationViewSet, basename='appraisal-evaluations')
router.register('course-categories', CourseCategoryViewSet, basename='course-categories')
router.register('trainer-profiles', TrainerProfileViewSet, basename='trainer-profiles')
router.register('courses', CourseViewSet, basename='courses')
router.register('course-contents', CourseContentViewSet, basename='course-contents')
router.register('learning-paths', LearningPathViewSet, basename='learning-paths')
router.register('learning-path-courses', LearningPathCourseViewSet, basename='learning-path-courses')
router.register('learning-path-assignments', LearningPathAssignmentViewSet, basename='learning-path-assignments')
router.register('compliance-assignments', ComplianceAssignmentViewSet, basename='compliance-assignments')
router.register('certificates', CertificateViewSet, basename='certificates')
router.register('training-requests', TrainingRequestViewSet, basename='training-requests')
router.register('training-sessions', TrainingSessionViewSet, basename='training-sessions')
router.register('session-attendances', SessionAttendanceViewSet, basename='session-attendances')

urlpatterns = [
    path('all-employees-list/', AllEmployeesAPIView.as_view(), name='all-employees-list'),
    path('hr-direct-appraisal/', HRDirectAppraisalAPIView.as_view(), name='hr-direct-appraisal'),
    path('employee/company-info/', EmployeeCompanyInfoAPIView.as_view(), name='employee-company-info'),
    path('reporting-managers/', ReportingManagerAPIView.as_view(), name='reporting_managers'),
    path('employee-id/', EmployeeIdAPIView.as_view(), name='employee_id'),
    path('checkin/', CheckInAPIView.as_view(), name='api_checkin'),
    path('checkout/', CheckOutAPIView.as_view(), name='api_checkout'),
    path('dashboard/', DashboardAPIView.as_view(), name='dashboard'),
    path('announcements/', EmployeeAnnouncementsAPIView.as_view(), name='employee-announcements'),
    path('time-log/meta/', TimeLogMetaAPIView.as_view(), name='time-log-meta'),
    path('time-log/', TimeLogListCreateAPIView.as_view(), name='time-log'),
    path('employee-notifications/', NotificationListAPIView.as_view(), name='employee-notifications'),
    path('geofence-config/', EmployeeGeofenceConfigAPIView.as_view(), name='geofence-config'),

    path('attendance-history/', AttendanceHistoryAPIView.as_view(), name='attendance_history'),
    path('employee-calendar/', EmployeeCalendarAPIView.as_view(), name='employee_calendar'),
    path('employee-calendar/<int:pk>/', EmployeeCalendarAPIView.as_view(), name='personal-events-detail'),
    path('tasks/', TaskListCreateAPIView.as_view(), name='task_list_create'),
    path('tasks/<int:pk>/', TaskDetailAPIView.as_view(), name='task_detail'),
    path('task-assign/<int:pk>/', TaskAssignAPIView.as_view(), name='task_assign'),
    path('tasks/subtask-assign/<int:pk>/', SubTaskAssignAPIView.as_view(), name='subtask_assign'),
    path('my-tasks/', MyTasksAPIView.as_view(), name='my_tasks'),
    path('tasks/update-status/<int:pk>/', UpdateStatusByManagerAPIView.as_view(), name='task-update-status'),
    path('tasks-assignment/<int:pk>/status/', UpdateAssignmentStatusAPIView.as_view(), name='update_assignment_status'),
    path('employee-leave-create/', EmpLeaveListCreateAPIView.as_view(), name='employee_leave_create'),
    path('emp-leaves/', EmpLeaveListAPIView.as_view(), name='emp_leave_list'),
    path('leaves-list/', LeaveListAPIView.as_view(), name='leave_list'),
    path('emp-leaves/<int:leave_id>/approve/', ApproveEmpLeaveAPIView.as_view(), name='emp_leave_approve'),
    path('emp-leaves/<int:leave_id>/reject/', RejectEmpLeaveAPIView.as_view(), name='emp_leave_reject'),
    path('emp-leaves/<int:leave_id>/cancel/', CancelEmpLeaveAPIView.as_view(), name='emp_leave_cancel'),
    path('emp-learning-corner/', EmpLearningCornerAPIView.as_view(), name='emp_learning_corner'),
    path('employee-profile/', EmployeeProfileAPIView.as_view(), name='employee_profile'),
    path('employee-profile/<str:employee_id>/', EmployeeProfileByIdAPIView.as_view(), name='employee_profile_by_id'),
    path('employee-breaks/', BreakLogAPIView.as_view(), name='employee-breaks'),
    path('employee-companypolicies/', EmployeeCompanyPoliciesAPIView.as_view(), name='employee-company-policies'),
    path('employee-hierarchy/', EmployeeHierarchyAPIView.as_view(), name='employee-hierarchy'),
    path('attendance-chart/', AttendanceChartDataAPIView.as_view(), name='attendance-chart'),
    path('performance-profile/<int:emp_id>/', EmployeePerformanceProfileAPIView.as_view(), name='employee-performance-profile'),
    path('performance-dashboard/', PerformanceDashboardAPIView.as_view(), name='performance-dashboard'),
    path('performance-dashboard/my/', MyPerformanceDashboardAPIView.as_view(), name='my-performance-dashboard'),
    path('kra-tasks/', EmployeeKRATasksAPIView.as_view(), name='kra-tasks'),


    path('all-notifications/', AllNotificationsAPIView.as_view(), name='all-notifications'),
    path('sse/', NotificationSSEView.as_view(), name='notification_sse'),    

]
urlpatterns += router.urls
