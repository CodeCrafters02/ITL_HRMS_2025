import type { TFunction } from 'i18next';
import type { SideNavSection } from '../Common/SideNav';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconMenuCalendar from '../Icon/Menu/IconMenuCalendar';
import IconMenuChat from '../Icon/Menu/IconMenuChat';
import IconMenuCharts from '../Icon/Menu/IconMenuCharts';
import IconMenuForms from '../Icon/Menu/IconMenuForms';
import IconMenuUsers from '../Icon/Menu/IconMenuUsers';
import IconMenuComponents from '../Icon/Menu/IconMenuComponents';
import IconMenuElements from '../Icon/Menu/IconMenuElements';
import IconMenuInvoice from '../Icon/Menu/IconMenuInvoice';
import IconMenuNotes from '../Icon/Menu/IconMenuNotes';
import IconBook from '../Icon/IconBook';
import IconAward from '../Icon/IconAward';
import IconSend from '../Icon/IconSend';
import IconUsersGroup from '../Icon/IconUsersGroup';
import IconListCheck from '../Icon/IconListCheck';
import IconSettings from '../Icon/IconSettings';
import IconBox from '../Icon/IconBox';
import IconCashBanknotes from '../Icon/IconCashBanknotes';
import IconDesktop from '../Icon/IconDesktop';
import IconHome from '../Icon/IconHome';

import { openTeamsChat } from '../../utils/teams';
export type AdminNavMode = 'hr' | 'performance' | 'lms' | 'hub';

export const getAdminNavMode = (pathname: string): AdminNavMode => {
    if (['/admin/hub', '/admin/learning'].includes(pathname)) return 'hub';
    if (pathname.startsWith('/admin/performance')) return 'performance';
    if (pathname.startsWith('/admin/learning-management')) return 'lms';
    return 'hr';
};

export const adminScopeLabel = (mode: AdminNavMode, t: TFunction) => (mode === 'performance' ? t('Performance') : mode === 'lms' ? t('LMS Portal') : t('HR Administration'));

export const buildAdminNav = (mode: AdminNavMode, t: TFunction): SideNavSection[] => {
    if (mode === 'hub') return [];

    if (mode === 'lms') {
        return [
            { items: [{ label: t('Back to HR Admin'), to: '/admin/dashboard', variant: 'back' }] },
            {
                title: t('Learning'),
                items: [
                    { label: t('Dashboard'), to: '/admin/learning-management', end: true, icon: <IconMenuCharts /> },
                    { label: t('Course Catalog'), to: '/admin/learning-management/course-catalog', icon: <IconBook /> },
                    { label: t('Employee Course Activity'), to: '/admin/learning-management/compliance-training', icon: <IconUsersGroup /> },
                    { label: t('Certifications'), to: '/admin/learning-management/certifications', icon: <IconAward /> },
                    { label: t('Training Requests'), to: '/admin/learning-management/training-requests', icon: <IconSend /> },
                    { label: t('Course Quizzes'), to: '/admin/learning-management/quizzes', icon: <IconListCheck /> },
                    { label: t('Administration'), to: '/admin/learning-management/administration', icon: <IconSettings /> },
                ],
            },
        ];
    }

    if (mode === 'performance') {
        return [
            { items: [{ label: t('Back to HR Admin'), to: '/admin/dashboard', variant: 'back' }] },
            {
                title: t('Performance'),
                items: [
                    { label: t('Performance Dashboard'), to: '/admin/performance', end: true, icon: <IconMenuCharts /> },
                    {
                        key: 'adminUserOps',
                        label: t('User Specific Operations'),
                        icon: <IconMenuUsers />,
                        children: [
                            { label: t('Search Profile'), to: '/admin/performance/search-profile' },
                            { label: t('Admin/HR Appraisal'), to: '/admin/performance/appraisal' },
                            { label: t('Assign KRAs/Goals'), to: '/admin/performance/assign-kras' },
                            { label: t('KRA Review'), to: '/admin/performance/kra-review' },
                            { label: t('Track Feedback'), to: '/admin/performance/track-feedback' },
                        ],
                    },
                    {
                        key: 'adminMethods',
                        label: t('Methods & Setup'),
                        icon: <IconMenuForms />,
                        children: [{ label: t('Bulk Map KRAs'), to: '/admin/performance/bulk-map' }],
                    },
                    {
                        key: 'adminAppraisals',
                        label: t('Appraisal Cycles'),
                        icon: <IconMenuCalendar />,
                        children: [
                            { label: t('Create Cycles'), to: '/admin/performance/appraisal-cycles' },
                            { label: t('Review Extensions'), to: '/admin/performance/review-extensions' },
                            { label: t('Multi-Rater Selection'), to: '/admin/performance/multi-rater-selection' },
                        ],
                    },
                    {
                        key: 'adminDataUtils',
                        label: t('Utilities & Logs'),
                        icon: <IconMenuInvoice />,
                        children: [
                            { label: t('Reports & Analytics'), to: '/admin/performance/export-module' },
                            { label: t('Multi-Rater Log'), to: '/admin/performance/multi-rater-log' },
                        ],
                    },
                ],
            },
        ];
    }

    return [
        {
            title: t('Main'),
            items: [{ label: t('Dashboard'), to: '/admin/dashboard', icon: <IconMenuDashboard /> }],
        },
        {
            title: t('Workforce'),
            items: [
                {
                    key: 'employee-mgt',
                    label: t('Employee Mgt'),
                    icon: <IconMenuUsers />,
                    children: [
                        { label: t('Employee Register'), to: '/admin/employee-register' },
                        { label: t('Microsoft Entra Directory'), to: '/admin/entra-directory' },
                        { label: t('Registration Requests'), to: '/admin/registration-requests' },
                        { label: t('Assign Shifts'), to: '/admin/assign-shifts' },
                        { label: t('Recruitment'), to: '/admin/recruitment' },
                        { label: t('Relieved Employees'), to: '/admin/relieved-employees' },
                        { label: t('Letter Templates'), to: '/admin/letter-templates' },
                        { label: t('Employee References'), to: '/admin/employee-references' },
                    ],
                },
                {
                    key: 'task-mgt',
                    label: t('Task Delegation'),
                    icon: <IconMenuNotes />,
                    children: [
                        { label: t('Assign Task'), to: '/admin/assign-task' },
                        { label: t('Reportees'), to: '/admin/reportees' },
                    ],
                },
            ],
        },
        {
            title: t('Time & Attendance'),
            items: [
                {
                    key: 'attendance-mgt',
                    label: t('Attendance Mgt'),
                    icon: <IconMenuCharts />,
                    children: [
                        { label: t('Attendance Logs'), to: '/admin/attendance-logs' },
                        { label: t('Attendance Details'), to: '/admin/attendance-details' },
                    ],
                },
                {
                    key: 'leave-mgt',
                    label: t('Leave Mgt'),
                    icon: <IconMenuCalendar />,
                    children: [
                        { label: t('Leave Approval'), to: '/admin/leave-approval' },
                        { label: t('Leave History'), to: '/admin/leave-history' },
                    ],
                },
                { label: t('Work From Home'), to: '/admin/wfh-management', icon: <IconHome /> },
            ],
        },
        {
            title: t('Payroll & Finance'),
            items: [
                {
                    key: 'payroll-mgt',
                    label: t('Payroll Mgt'),
                    icon: <IconMenuInvoice />,
                    children: [
                        { label: t('Salary Structure'), to: '/admin/salary-structure' },
                        { label: t('Salary per Designation'), to: '/admin/designation-salary' },
                        { label: t('Payroll Reports'), to: '/admin/payroll-batches' },
                        { label: t('Disbursement Statement'), to: '/admin/salary-disbursement' },
                        { label: t('Payslip Rollout'), to: '/admin/payslip-rollout' },
                        { label: t('Income Tax Config'), to: '/admin/income-tax' },
                    ],
                },
                {
                    key: 'reimbursement-admin',
                    label: t('Reimbursements'),
                    icon: <IconCashBanknotes />,
                    children: [
                        { label: t('Approvals'), to: '/admin/reimbursement/approvals' },
                        { label: t('Categories'), to: '/admin/reimbursement/categories' },
                        { label: t('History & Stats'), to: '/admin/reimbursement/history' },
                    ],
                },
                {
                    key: 'loan-mgt',
                    label: t('Loans & Advances'),
                    icon: <IconMenuInvoice />,
                    children: [
                        { label: t('Loan Approvals'), to: '/admin/loan-approvals' },
                        { label: t('Loan Configuration'), to: '/admin/loan-configuration' },
                    ],
                },
            ],
        },
        {
            title: t('Facilities & Assets'),
            items: [
                {
                    key: 'seat-booking-mgt',
                    label: t('Seat Booking'),
                    icon: <IconDesktop />,
                    children: [
                        { label: t('Seat Approvals'), to: '/admin/seat-approvals' },
                        { label: t('Bookings Overview'), to: '/admin/seat-bookings-overview' },
                    ],
                },
                {
                    key: 'conference-room-mgt',
                    label: t('Conference Room'),
                    icon: <IconMenuComponents />,
                    children: [
                        { label: t('Overview'), to: '/admin/conference-room/overview' },
                        { label: t('Room Approvals'), to: '/admin/conference-room/approval' },
                        { label: t('Room Structure'), to: '/admin/conference-room/structure' },
                    ],
                },
                { label: t('Assets & Inventory'), to: '/admin/assets-inventory', icon: <IconBox /> },
            ],
        },
        {
            title: t('Apps & Communication'),
            items: [
                { label: t('Calendar'), to: '/admin/calendar', icon: <IconMenuCalendar /> },
                { label: t('Chat (Teams)'), action: () => openTeamsChat(), icon: <IconMenuChat /> },
                { label: t('Learning Corner'), to: '/admin/learning-corner', icon: <IconBook /> },
            ],
        },
        {
            title: t('System & Setup'),
            items: [
                {
                    key: 'configurator',
                    label: t('Organization Setup'),
                    icon: <IconMenuElements />,
                    children: [
                        { label: t('Department'), to: '/admin/branch-mgt/department' },
                        { label: t('Designation'), to: '/admin/branch-mgt/designation' },
                        { label: t('Level'), to: '/admin/branch-mgt/level' },
                        { label: t('Office Structure'), to: '/admin/configuration/office-structure' },
                        { label: t('Shift Config'), to: '/admin/configuration/shift' },
                        { label: t('Break Config'), to: '/admin/configuration/break-config' },
                        { label: t('Dept Working Days'), to: '/admin/configuration/department-wise-working-days' },
                        { label: t('Leave Policy Count'), to: '/admin/configuration/leave-count' },
                        { label: t('Company Policies'), to: '/admin/configuration/company-policies' },
                        { label: t('Geofencing'), to: '/admin/geofencing' },
                    ],
                },
                { label: t('Branding & Theme'), to: '/admin/branding', icon: <IconMenuComponents /> },
                { label: t('System Settings'), to: '/admin/system-settings', icon: <IconSettings /> },
            ],
        },
    ];
};
