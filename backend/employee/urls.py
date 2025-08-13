from django.urls import path
from .views import *

urlpatterns = [
    path('employee/company-info/', EmployeeCompanyInfoAPIView.as_view(), name='employee-company-info'),
    path('reporting-managers/', ReportingManagerAPIView.as_view(), name='reporting_managers'),
    path('employee-id/', EmployeeIdAPIView.as_view(), name='employee_id'),
    path('checkin/', CheckInAPIView.as_view(), name='api_checkin'),
    path('checkout/', CheckOutAPIView.as_view(), name='api_checkout'),
    path('break/', BreakAPIView.as_view(), name='api_break'),
    path('dashboard/', DashboardAPIView.as_view(), name='dashboard'),
    path('employee-notifications/', NotificationListAPIView.as_view(), name='employee-notifications'),

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
    path('emp-learning-corner/', EmpLearningCornerAPIView.as_view(), name='emp_learning_corner'),

]
