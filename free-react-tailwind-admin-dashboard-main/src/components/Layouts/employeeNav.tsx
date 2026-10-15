import type { TFunction } from 'i18next';
import type { SideNavSection } from '../Common/SideNav';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconMenuCalendar from '../Icon/Menu/IconMenuCalendar';
import IconMenuChat from '../Icon/Menu/IconMenuChat';
import IconMenuCharts from '../Icon/Menu/IconMenuCharts';
import IconMenuForms from '../Icon/Menu/IconMenuForms';
import IconMenuUsers from '../Icon/Menu/IconMenuUsers';
import IconMenuComponents from '../Icon/Menu/IconMenuComponents';
import IconMenuInvoice from '../Icon/Menu/IconMenuInvoice';
import IconMenuNotes from '../Icon/Menu/IconMenuNotes';
import IconMenuTables from '../Icon/Menu/IconMenuTables';
import IconMenuDocumentation from '../Icon/Menu/IconMenuDocumentation';
import IconOpenBook from '../Icon/IconOpenBook';
import IconBook from '../Icon/IconBook';
import IconAward from '../Icon/IconAward';
import IconSend from '../Icon/IconSend';
import IconStar from '../Icon/IconStar';
import IconListCheck from '../Icon/IconListCheck';
import IconTrendingUp from '../Icon/IconTrendingUp';
import { openTeamsChat } from '../../utils/teams';

export type EmployeeNavMode = 'main' | 'performance' | 'lms';

export const getEmployeeNavMode = (pathname: string): EmployeeNavMode => {
    if (pathname.startsWith('/employee/performance')) return 'performance';
    if (pathname.startsWith('/employee/learning-management')) return 'lms';
    return 'main';
};

export const employeeScopeLabel = (mode: EmployeeNavMode, t: TFunction) => (mode === 'performance' ? t('Performance') : mode === 'lms' ? t('Learning Management') : t('Employee Dashboard'));

export interface EmployeeNavCounts {
    isManager: boolean;
    myTasks: number;
    assetRequests: number;
    loanApprovals: number;
    reimbursementApprovals: number;
    leaveApprovals: number;
    assignTask: number;
    requestsFolder: number;
    reimbursementFolder: number;
}

export const buildEmployeeNav = (mode: EmployeeNavMode, t: TFunction, c: EmployeeNavCounts): SideNavSection[] => {
    const back = { items: [{ label: t('Back to Dashboard'), to: '/employee/dashboard', variant: 'back' as const }] };

    if (mode === 'lms') {
        return [
            back,
            {
                title: t('Learning'),
                items: [
                    { label: t('Dashboard'), to: '/employee/learning-management', end: true, icon: <IconMenuCharts /> },
                    { label: t('My Learning'), to: '/employee/learning-management/my-learning', icon: <IconBook /> },
                    { label: t('Course Catalog'), to: '/employee/learning-management/course-catalog', icon: <IconOpenBook /> },
                    { label: t('Certifications'), to: '/employee/learning-management/certifications', icon: <IconAward /> },
                    { label: t('Training Requests'), to: '/employee/learning-management/training-requests', icon: <IconSend /> },
                    { label: t('Course Reviews'), to: '/employee/learning-management/reviews', icon: <IconStar /> },
                ],
            },
        ];
    }

    if (mode === 'performance') {
        return [
            back,
            {
                title: t('Performance'),
                items: [
                    { label: t('Performance Dashboard'), to: '/employee/performance', end: true, icon: <IconMenuCharts /> },
                    {
                        key: 'emp-perf-goals',
                        label: t('Goals & KRAs'),
                        icon: <IconMenuForms />,
                        children: [
                            { label: t('My KRAs'), to: '/employee/performance/kras' },
                            { label: t('Self Map KRAs'), to: '/employee/performance/self-map-kras' },
                            { label: t('KRA Review'), to: '/employee/performance/kra-review' },
                        ],
                    },
                    { label: t('Skill Upgrades'), to: '/employee/performance/skill-upgrades', icon: <IconTrendingUp /> },
                    {
                        key: 'emp-perf-feedback',
                        label: t('Feedback'),
                        icon: <IconMenuChat />,
                        children: [
                            { label: t('Feedback Received'), to: '/employee/performance/feedback-received' },
                            { label: t('Feedback Provided'), to: '/employee/performance/feedback-provided' },
                            { label: t('Give Direct Feedback'), to: '/employee/performance/manager-direct-feedback' },
                        ],
                    },
                    {
                        key: 'emp-perf-appraisal',
                        label: t('Appraisals'),
                        icon: <IconAward />,
                        children: [
                            { label: t('Self Appraisal'), to: '/employee/performance/self-appraisal' },
                            { label: t('Peer Appraisal'), to: '/employee/performance/peer-appraisal' },
                            { label: t('Manager Appraisal'), to: '/employee/performance/manager-appraisal' },
                            { label: t('Appraisal History'), to: '/employee/performance/appraisal-history' },
                            { label: t('Extension Status'), to: '/employee/performance/extension-status' },
                        ],
                    },
                ],
            },
        ];
    }

    const requestItems = [
        { label: t('Asset Requests'), to: '/employee/asset-requests', badge: c.assetRequests },
        { label: t('Loan Application'), to: '/employee/loan-application' },
        { label: t('Work From Home'), to: '/employee/wfh-request' },
        ...(c.isManager ? [{ label: t('Loan Approvals'), to: '/employee/loan-approvals', badge: c.loanApprovals }] : []),
    ];

    return [
        {
            title: t('Main'),
            items: [
                { label: t('Dashboard'), to: '/employee/dashboard', icon: <IconMenuDashboard /> },
                { label: t('My Tasks'), to: '/employee/my-tasks', icon: <IconMenuNotes />, badge: c.myTasks },
            ],
        },
        {
            title: t('Time & Pay'),
            items: [
                { label: t('Attendance History'), to: '/employee/attendance-history', icon: <IconMenuCharts /> },
                { label: t('My Payslips'), to: '/employee/my-payslips', icon: <IconMenuInvoice /> },
                {
                    key: 'reimbursement',
                    label: t('Reimbursement'),
                    icon: <IconMenuInvoice />,
                    badge: c.reimbursementFolder,
                    children: [
                        { label: t('Request Reimbursement'), to: '/employee/reimbursement/request' },
                        { label: t('My Requests'), to: '/employee/reimbursement/status' },
                        { label: t('Approvals'), to: '/employee/reimbursement/approvals', badge: c.reimbursementApprovals },
                    ],
                },
            ],
        },
        {
            title: t('Requests & Bookings'),
            items: [
                { key: 'emp-requests', label: t('Requests'), icon: <IconMenuNotes />, badge: c.requestsFolder, children: requestItems },
                {
                    key: 'emp-bookings',
                    label: t('Bookings'),
                    icon: <IconMenuComponents />,
                    children: [
                        { label: t('Seat Booking'), to: '/employee/seat-booking' },
                        { label: t('Conf. Room Booking'), to: '/employee/conference-room-booking' },
                    ],
                },
                ...(c.isManager
                    ? [
                          { label: t('Leave Request'), to: '/employee/leave-approval', icon: <IconMenuCalendar />, badge: c.leaveApprovals },
                          { label: t('Assign Task'), to: '/employee/assign-task', icon: <IconMenuNotes />, badge: c.assignTask },
                      ]
                    : []),
                { label: t('Reportees'), to: '/employee/reportees', icon: <IconMenuUsers /> },
            ],
        },
        {
            title: t('Company'),
            items: [
                { label: t('References'), to: '/employee/references', icon: <IconMenuForms /> },
                { label: t('Company policies'), to: '/employee/company-policy', icon: <IconMenuDocumentation /> },
                { label: t('Chat (Teams)'), action: () => openTeamsChat(), icon: <IconMenuChat /> },
            ],
        },
        {
            title: t('Growth'),
            items: [
                { label: t('Learning Corner'), to: '/employee/learning-corner', icon: <IconMenuTables /> },
            ],
        },
    ];
};
