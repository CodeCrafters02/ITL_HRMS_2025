import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { IRootState } from '../../store';
import { toggleRTL, toggleTheme, toggleSidebar } from '../../store/themeConfigSlice';
import { useTranslation } from 'react-i18next';
import hrmsLogo from '../../assets/logo/hrms-logo.png';
import i18next from 'i18next';
import Dropdown from '../Dropdown';
import IconMenu from '../Icon/IconMenu';
import IconCalendar from '../Icon/IconCalendar';
import IconEdit from '../Icon/IconEdit';
import IconChatNotification from '../Icon/IconChatNotification';
import IconSearch from '../Icon/IconSearch';
import IconXCircle from '../Icon/IconXCircle';
import IconSun from '../Icon/IconSun';
import IconMoon from '../Icon/IconMoon';
import IconLaptop from '../Icon/IconLaptop';
import IconMailDot from '../Icon/IconMailDot';
import IconArrowLeft from '../Icon/IconArrowLeft';
import IconInfoCircle from '../Icon/IconInfoCircle';
import IconBellBing from '../Icon/IconBellBing';
import IconUser from '../Icon/IconUser';
import IconMail from '../Icon/IconMail';
import IconLockDots from '../Icon/IconLockDots';
import IconLogout from '../Icon/IconLogout';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconCaretDown from '../Icon/IconCaretDown';
import IconMenuApps from '../Icon/Menu/IconMenuApps';
import IconMenuComponents from '../Icon/Menu/IconMenuComponents';
import IconMenuElements from '../Icon/Menu/IconMenuElements';
import IconMenuDatatables from '../Icon/Menu/IconMenuDatatables';
import IconMenuForms from '../Icon/Menu/IconMenuForms';
import IconMenuPages from '../Icon/Menu/IconMenuPages';
import IconMenuMore from '../Icon/Menu/IconMenuMore';
import { notificationService } from '../../services/notificationService';

const Header = () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => {
        const selector = document.querySelector('ul.horizontal-menu a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
            for (let i = 0; i < all.length; i++) {
                all[0]?.classList.remove('active');
            }
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
                if (ele) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele?.classList.add('active');
                    });
                }
            }
        }
    }, [location]);

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();

    function createMarkup(messages: any) {
        return { __html: messages };
    }
    const [messages, setMessages] = useState([
        {
            id: 1,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>',
            title: 'Congratulations!',
            message: 'Your OS has been updated.',
            time: '1hr',
        },
        {
            id: 2,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-info-light dark:bg-info text-info dark:text-info-light"><svg g xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>',
            title: 'Did you know?',
            message: 'You can switch between artboards.',
            time: '2hr',
        },
        {
            id: 3,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-danger-light dark:bg-danger text-danger dark:text-danger-light"> <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>',
            title: 'Something went wrong!',
            message: 'Send Reposrt',
            time: '2days',
        },
        {
            id: 4,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-warning-light dark:bg-warning text-warning dark:text-warning-light"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <circle cx="12" cy="12" r="10"></circle>    <line x1="12" y1="8" x2="12" y2="12"></line>    <line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>',
            title: 'Warning',
            message: 'Your password strength is low.',
            time: '5days',
        },
    ]);

    const removeMessage = (value: number) => {
        setMessages(messages.filter((user) => user.id !== value));
    };

    const [search, setSearch] = useState(false);
    const [menuSearchQuery, setMenuSearchQuery] = useState('');

    const setLocale = (flag: string) => {
        setFlag(flag);
        if (flag.toLowerCase() === 'ae') {
            dispatch(toggleRTL('rtl'));
        } else {
            dispatch(toggleRTL('ltr'));
        }
    };
    const [flag, setFlag] = useState(themeConfig.locale);

    const { t } = useTranslation();
    const userRole = localStorage.getItem('user_role') || '';
    const userId = localStorage.getItem('user_id') || 'anonymous';
    const firstName = (localStorage.getItem('first_name') || '').trim();
    const lastName = (localStorage.getItem('last_name') || '').trim();
    const storedUsername = (localStorage.getItem('username') || '').trim();
    const storedEmail = (localStorage.getItem('user_email') || '').trim();
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [profileName, setProfileName] = useState<string>('');
    const [profileEmail, setProfileEmail] = useState<string>('');
    const [currentStatus, setCurrentStatus] = useState<string>('online');
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
    const [notificationSeenCount, setNotificationSeenCount] = useState(0);
    const [leaveDecisionKeys, setLeaveDecisionKeys] = useState<string[]>([]);
    const [leaveSeenDecisionKeys, setLeaveSeenDecisionKeys] = useState<string[]>([]);
    const calendarRoute = userRole === 'employee' ? '/employee/calendar' : userRole === 'admin' ? '/admin/calendar' : '/apps/calendar';
    const notificationRoute = userRole === 'employee' ? '/employee/notifications' : userRole === 'admin' ? '/admin/notifications' : '/master/dashboard';
    const leaveRoute = userRole === 'employee' ? '/employee/leave-application' : userRole === 'admin' ? '/admin/leave-approval' : '/master/dashboard';
    const notificationSeenKey = `header_notification_seen_count_${userId}`;
    const leaveSeenKey = `header_leave_seen_decisions_${userId}`;
    const leaveIntroAckKey = `hrms_leave_intro_ack_${userId}`;
    const displayName = profileName || `${firstName} ${lastName}`.trim() || storedUsername || 'User';
    const displayEmail = profileEmail || storedEmail || '-';
    const nameParts = (displayName || '').trim().split(/\s+/).filter(Boolean);
    const firstInitial = nameParts[0]?.[0] || '';
    const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1]?.[0] || '' : '';
    const avatarInitials = `${firstInitial}${lastInitial}`.toUpperCase() || 'U';
    const notificationBadgeCount = Math.max(0, notificationUnreadCount - notificationSeenCount);
    const leaveBadgeCount = leaveDecisionKeys.filter((key) => !leaveSeenDecisionKeys.includes(key)).length;
    const isReportingManager = localStorage.getItem('is_reporting_manager') === 'true';

    const [leaveIntroHudClosed, setLeaveIntroHudClosed] = useState(false);
    const leaveIntroPulse = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('hrms_leave_intro_pulse') === '1';
    const showLeaveIntro =
        userRole === 'employee' &&
        Boolean(userId && userId !== 'anonymous') &&
        leaveIntroPulse &&
        !localStorage.getItem(leaveIntroAckKey) &&
        !leaveIntroHudClosed;

    const acknowledgeLeaveIntro = useCallback(() => {
        const hadPulse = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('hrms_leave_intro_pulse') === '1';
        sessionStorage.removeItem('hrms_leave_intro_pulse');
        localStorage.setItem(leaveIntroAckKey, '1');
        setLeaveIntroHudClosed(true);
        if (hadPulse && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hrms-intro-updated'));
        }
    }, [leaveIntroAckKey]);

    const leaveIntroAnchorRef = useRef<HTMLSpanElement>(null);
    const [leaveIntroAnchorRect, setLeaveIntroAnchorRect] = useState<DOMRect | null>(null);

    useLayoutEffect(() => {
        if (!showLeaveIntro) {
            setLeaveIntroAnchorRect(null);
            return;
        }
        const el = leaveIntroAnchorRef.current;
        if (!el) return;
        const sync = () => {
            setLeaveIntroAnchorRect(el.getBoundingClientRect());
        };
        sync();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
        ro?.observe(el);
        window.addEventListener('resize', sync);
        window.addEventListener('scroll', sync, true);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', sync);
            window.removeEventListener('scroll', sync, true);
        };
    }, [showLeaveIntro]);

    const sidebarSearchItems: Array<{ label: string; path: string }> = useMemo(() => {
        if (userRole === 'master') {
            return [
                { label: 'Dashboard', path: '/master/dashboard' },
                { label: 'Company', path: '/master/company' },
                { label: 'User Management', path: '/master/user-management' },
            ];
        }
        if (userRole === 'admin') {
            return [
                { label: 'Dashboard', path: '/admin/dashboard' },
                { label: 'Reportees', path: '/admin/reportees' },
                { label: 'Assign Task', path: '/admin/assign-task' },
                { label: 'Department', path: '/admin/branch-mgt/department' },
                { label: 'Level', path: '/admin/branch-mgt/level' },
                { label: 'Designation', path: '/admin/branch-mgt/designation' },
                { label: 'Break Config', path: '/admin/configuration/break-config' },
                { label: 'Shift', path: '/admin/configuration/shift' },
                { label: 'Dept Working Days', path: '/admin/configuration/department-wise-working-days' },
                { label: 'Leave Count', path: '/admin/configuration/leave-count' },
                { label: 'Company Policies', path: '/admin/configuration/company-policies' },
                { label: 'Office Structure', path: '/admin/configuration/office-structure' },
                { label: 'Loan Configuration', path: '/admin/loan-configuration' },
                { label: 'Loan Approvals', path: '/admin/loan-approvals' },
                { label: 'Seat Approvals', path: '/admin/seat-approvals' },
                { label: 'Seat Bookings Overview', path: '/admin/seat-bookings-overview' },
                { label: 'Employee Register', path: '/admin/employee-register' },
                { label: 'Assign Shifts', path: '/admin/assign-shifts' },
                { label: 'Recruitment', path: '/admin/recruitment' },
                { label: 'Relieved Employees', path: '/admin/relieved-employees' },
                { label: 'Letter Templates', path: '/admin/letter-templates' },
                { label: 'Conference Structure', path: '/admin/conference-room/structure' },
                { label: 'Conference Approval', path: '/admin/conference-room/approval' },
                { label: 'Conference Overview', path: '/admin/conference-room/overview' },
                { label: 'Leave Approval', path: '/admin/leave-approval' },
                { label: 'Leave History', path: '/admin/leave-history' },
                { label: 'Attendance Logs', path: '/admin/attendance-logs' },
                { label: 'Attendance Details', path: '/admin/attendance-details' },
                { label: 'Salary Structure', path: '/admin/salary-structure' },
                { label: 'Salary per Designation', path: '/admin/designation-salary' },
                { label: 'Payroll Reports', path: '/admin/payroll-batches' },
                { label: 'Disbursement Statement', path: '/admin/salary-disbursement' },
                { label: 'Payslip Rollout', path: '/admin/payslip-rollout' },
                { label: 'Income Config', path: '/admin/income-tax' },
                { label: 'Assets & Inventory', path: '/admin/assets-inventory' },
                { label: 'Work From Home', path: '/admin/wfh-management' },
                { label: 'Calendar', path: '/admin/calendar' },
                { label: 'Chat', path: '/admin/chat' },
                { label: 'Notifications', path: '/admin/notifications' },
                { label: 'Learning Corner', path: '/admin/learning-corner' },
                { label: 'Employee References', path: '/admin/employee-references' },
                { label: 'Reimbursement Categories', path: '/admin/reimbursement/categories' },
                { label: 'Reimbursement Approvals', path: '/admin/reimbursement/approvals' },
                { label: 'Reimbursement History', path: '/admin/reimbursement/history' },
            ];
        }
        return [
            { label: 'Dashboard', path: '/employee/dashboard' },
            { label: 'My Tasks', path: '/employee/my-tasks' },
            { label: 'Leave Application', path: '/employee/leave-application' },
            { label: 'Attendance History', path: '/employee/attendance-history' },
            { label: 'My Payslips', path: '/employee/my-payslips' },
            { label: 'Learning Corner', path: '/employee/learning-corner' },
            { label: 'Reportees', path: '/employee/reportees' },
            { label: 'Seat Booking', path: '/employee/seat-booking' },
            { label: 'Conf. Room Booking', path: '/employee/conference-room-booking' },
            { label: 'Asset Requests', path: '/employee/asset-requests' },
            { label: 'Loan Application', path: '/employee/loan-application' },
            { label: 'Work From Home', path: '/employee/wfh-request' },
            { label: 'Request Reimbursement', path: '/employee/reimbursement/request' },
            { label: 'My Reimbursements', path: '/employee/reimbursement/status' },
            { label: 'Reimbursement Approvals', path: '/employee/reimbursement/approvals' },
            { label: 'References', path: '/employee/references' },
            { label: 'Company Policies', path: '/employee/company-policy' },
            ...(isReportingManager
                ? [
                      { label: 'Loan Approvals', path: '/employee/loan-approvals' },
                      { label: 'Leave Request', path: '/employee/leave-approval' },
                      { label: 'Assign Task', path: '/employee/assign-task' },
                  ]
                : []),
        ];
    }, [userRole, isReportingManager]);

    const filteredSidebarItems = useMemo(() => {
        const query = menuSearchQuery.trim().toLowerCase();
        if (!query) return [];
        return sidebarSearchItems.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 8);
    }, [menuSearchQuery, sidebarSearchItems]);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const loadProfile = async () => {
            try {
                if (!['employee', 'admin', 'master'].includes(userRole)) return;
                const res = await fetch(`${API_BASE_URL}/employee/employee-profile/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                const fullName = [data?.first_name, data?.middle_name, data?.last_name].filter(Boolean).join(' ').trim();
                setProfileName(data?.full_name || fullName || '');
                setProfileEmail(data?.email || '');
                if (data?.photo) {
                    const fullUrl = /^https?:\/\//i.test(data.photo) ? data.photo : `${API_BASE_URL}${data.photo.startsWith('/') ? '' : '/'}${data.photo}`;
                    setAvatarUrl(fullUrl);
                } else {
                    setAvatarUrl(null);
                }
                if (data?.status) {
                    setCurrentStatus(data.status);
                }
            } catch {
                setAvatarUrl(null);
            }
        };
        loadProfile();
    }, [API_BASE_URL, userRole]);

    const handleStatusUpdate = async (newStatus: string) => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            
            const response = await fetch(`${API_BASE_URL}/employee/employee-profile/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setCurrentStatus(newStatus);
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    useEffect(() => {
        const savedSeenCount = Number(localStorage.getItem(notificationSeenKey) || 0);
        setNotificationSeenCount(Number.isFinite(savedSeenCount) ? savedSeenCount : 0);
    }, [notificationSeenKey]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(leaveSeenKey);
            const parsed = raw ? JSON.parse(raw) : [];
            setLeaveSeenDecisionKeys(Array.isArray(parsed) ? parsed : []);
        } catch {
            setLeaveSeenDecisionKeys([]);
        }
    }, [leaveSeenKey]);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token || userRole !== 'employee') {
            setNotificationUnreadCount(0);
            return;
        }

        let isMounted = true;
        const loadUnreadCount = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/employee/all-notifications/?unread=true&page=1&page_size=1`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                const nextCount = Number(data?.count ?? 0);
                if (isMounted) setNotificationUnreadCount(Number.isFinite(nextCount) ? nextCount : 0);
            } catch {
                if (isMounted) setNotificationUnreadCount(0);
            }
        };

        loadUnreadCount();
        const intervalId = window.setInterval(loadUnreadCount, 30000);
        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, [API_BASE_URL, userRole]);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token || userRole !== 'employee') {
            setLeaveDecisionKeys([]);
            return;
        }

        let isMounted = true;
        const loadLeaveUpdatesCount = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/employee/employee-leave-create/?page=1&page_size=200`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                const leavesList = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
                const decisionKeys = leavesList
                    .filter((leave: any) => {
                    const status = String(leave?.status || '').toLowerCase();
                    return status === 'approved' || status === 'rejected';
                    })
                    .map((leave: any) => `${leave?.id}:${String(leave?.status || '').toLowerCase()}`);
                if (isMounted) setLeaveDecisionKeys(decisionKeys);
            } catch {
                if (isMounted) setLeaveDecisionKeys([]);
            }
        };

        loadLeaveUpdatesCount();
        const intervalId = window.setInterval(loadLeaveUpdatesCount, 30000);
        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, [API_BASE_URL, userRole]);

    useEffect(() => {
        if (location.pathname === notificationRoute && userRole === 'employee') {
            setNotificationSeenCount(notificationUnreadCount);
            localStorage.setItem(notificationSeenKey, String(notificationUnreadCount));
        }
    }, [location.pathname, notificationRoute, notificationSeenKey, notificationUnreadCount, userRole]);

    useEffect(() => {
        if (location.pathname === leaveRoute && userRole === 'employee') {
            setLeaveSeenDecisionKeys(leaveDecisionKeys);
            localStorage.setItem(leaveSeenKey, JSON.stringify(leaveDecisionKeys));
        }
    }, [leaveDecisionKeys, leaveRoute, leaveSeenKey, location.pathname, userRole]);

    useEffect(() => {
        if (
            userRole !== 'employee' ||
            !userId ||
            userId === 'anonymous' ||
            localStorage.getItem(leaveIntroAckKey) ||
            sessionStorage.getItem('hrms_leave_intro_pulse') !== '1'
        )
            return;
        if (!location.pathname.startsWith('/employee/leave-application')) return;
        sessionStorage.removeItem('hrms_leave_intro_pulse');
        localStorage.setItem(leaveIntroAckKey, '1');
        setLeaveIntroHudClosed(true);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hrms-intro-updated'));
        }
    }, [leaveIntroAckKey, location.pathname, userId, userRole]);

    const leaveIntroTitle = 'Need time off?';
    const leaveIntroBody = (
        <>
            Walks through <span className="font-semibold">Menu → Leave Application</span>, then mentions the pencil in the top bar on wider screens, with “hops into the top bar” for a bit of personality.
        </>
    );
    const leaveIntroDismissLabel = 'Got it';
    const leaveIntroCtaLabel = 'Go to Leave Application →';

    const leaveIntroAcknowledgeLinkClick = () => {
        setLeaveSeenDecisionKeys(leaveDecisionKeys);
        localStorage.setItem(leaveSeenKey, JSON.stringify(leaveDecisionKeys));
        acknowledgeLeaveIntro();
    };

    const leaveIntroPortal =
        showLeaveIntro &&
        typeof document !== 'undefined' &&
        createPortal(
            <>
                {leaveIntroAnchorRect && (
                    <div
                        role="dialog"
                        aria-live="polite"
                        className="pointer-events-auto fixed z-[60000] hidden w-[min(18rem,calc(100vw-3rem))] -translate-x-1/2 sm:block"
                        style={{
                            left: leaveIntroAnchorRect.left + leaveIntroAnchorRect.width / 2,
                            top: leaveIntroAnchorRect.bottom + 8,
                        }}
                    >
                        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full border-[10px] border-transparent border-b-white dark:border-b-[#1b2e4b]" aria-hidden />
                        <div className="rounded-2xl border border-white/80 bg-white p-3.5 pr-11 shadow-xl dark:border-primary/40 dark:bg-[#1b2e4b] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-2 ring-primary/25">
                            <button
                                type="button"
                                aria-label="Close tip"
                                className="absolute right-2.5 top-2.5 rounded-full p-1 text-black/45 hover:bg-black/10 hover:text-primary dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                                onClick={() => acknowledgeLeaveIntro()}
                            >
                                <IconXCircle className="h-5 w-5 shrink-0" />
                            </button>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{leaveIntroTitle}</p>
                            <p className="mt-2 text-xs leading-snug text-black/80 dark:text-white/85">{leaveIntroBody}</p>
                            <button
                                type="button"
                                className="mt-2 text-xs font-semibold uppercase text-primary hover:text-primary/90"
                                onClick={() => acknowledgeLeaveIntro()}
                            >
                                {leaveIntroDismissLabel}
                            </button>
                            
                        </div>
                    </div>
                )}
                <div className="pointer-events-auto fixed inset-x-4 bottom-5 z-[60000] rounded-2xl border border-primary/35 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-primary/45 dark:bg-[#1b2e4b]/95 sm:hidden">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-purple-500/25 text-lg" aria-hidden>
                            ✈
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{leaveIntroTitle}</p>
                            <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-white/75">{leaveIntroBody}</p>
                            <button
                                type="button"
                                className="mt-2 text-xs font-semibold uppercase text-primary hover:text-primary/90"
                                onClick={() => acknowledgeLeaveIntro()}
                            >
                                {leaveIntroDismissLabel}
                            </button>
                            <Link
                                to={leaveRoute}
                                className="mt-2 block text-xs font-semibold uppercase text-primary underline decoration-primary/40 underline-offset-2"
                                onClick={() => leaveIntroAcknowledgeLinkClick()}
                            >
                                {leaveIntroCtaLabel}
                            </Link>
                        </div>
                        <button type="button" aria-label="Close tip" className="shrink-0 p-1 text-black/35 dark:text-white/40" onClick={() => acknowledgeLeaveIntro()}>
                            <IconXCircle className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </>,
            document.body,
        );

    return (
        <>
            <header className={`${themeConfig.semidark && themeConfig.menu === 'horizontal' ? 'dark' : ''}`}>
            <div className="shadow-sm">
                <div className="relative bg-white flex w-full items-center px-5 py-2.5 dark:bg-black">
                    <div className="horizontal-logo flex lg:hidden justify-between items-center ltr:mr-2 rtl:ml-2">
                        <Link to="/" className="main-logo flex items-center shrink-0">
                            <img className="w-14 ltr:-ml-1 rtl:-mr-1 inline object-contain" src={hrmsLogo} alt="logo" />
                            <span className="text-2xl ltr:ml-1.5 rtl:mr-1.5 font-bold align-middle hidden md:inline dark:text-white-light transition-all duration-300 tracking-tight pb-1">HRMS</span>
                        </Link>
                        <button
                            type="button"
                            className="collapse-icon flex-none dark:text-[#d0d2d6] hover:text-primary dark:hover:text-primary flex lg:hidden ltr:ml-2 rtl:mr-2 p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:bg-white-light/90 dark:hover:bg-dark/60"
                            onClick={() => {
                                dispatch(toggleSidebar());
                            }}
                        >
                            <IconMenu className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="ltr:mr-2 rtl:ml-2 hidden sm:block">
                        <ul className="flex items-center space-x-2 rtl:space-x-reverse dark:text-[#d0d2d6]">
                            <li>
                                <Link to={calendarRoute} className="block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60">
                                    <IconCalendar />
                                </Link>
                            </li>
                            <li className="relative">
                                <span ref={leaveIntroAnchorRef} className="relative inline-flex">
                                    <Link
                                        to={leaveRoute}
                                        aria-label="Leave application"
                                        title={userRole === 'employee' ? 'Leave application — submit requests & view status' : undefined}
                                        className={`relative block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60 ${showLeaveIntro ? 'text-primary shadow-[0_0_0_3px_rgba(67,97,238,0.35)] dark:shadow-[0_0_0_3px_rgba(138,169,251,0.35)] animate-pulse' : ''}`}
                                        onClick={() => {
                                            if (userRole === 'employee') {
                                                setLeaveSeenDecisionKeys(leaveDecisionKeys);
                                                localStorage.setItem(leaveSeenKey, JSON.stringify(leaveDecisionKeys));
                                                if (leaveIntroPulse) acknowledgeLeaveIntro();
                                            }
                                        }}
                                    >
                                        <IconEdit />
                                        {showLeaveIntro && leaveBadgeCount === 0 && (
                                            <span
                                                aria-hidden
                                                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-[10px] font-bold text-white shadow-md animate-bounce"
                                            >
                                                ✈
                                            </span>
                                        )}
                                        {userRole === 'employee' && leaveBadgeCount > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                                                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-70 animate-ping"></span>
                                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success border border-white dark:border-black animate-bounce"></span>
                                            </span>
                                        )}
                                    </Link>
                                </span>
                            </li>
                            {userRole !== 'employee' && (
                                <li>
                                    <Link to="/apps/chat" className="block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60">
                                        <IconChatNotification />
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>
                    <div className="sm:flex-1 ltr:sm:ml-0 ltr:ml-auto sm:rtl:mr-0 rtl:mr-auto flex items-center space-x-1.5 lg:space-x-2 rtl:space-x-reverse dark:text-[#d0d2d6]">
                        <div className="sm:ltr:mr-auto sm:rtl:ml-auto">
                            <form
                                className={`${search && '!block'} sm:relative absolute inset-x-0 sm:top-0 top-1/2 sm:translate-y-0 -translate-y-1/2 sm:mx-0 mx-4 z-10 sm:block hidden`}
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const firstMatch = filteredSidebarItems[0];
                                    if (firstMatch) {
                                        navigate(firstMatch.path);
                                        setMenuSearchQuery('');
                                        setSearch(false);
                                    }
                                }}
                            >
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="form-input ltr:pl-9 rtl:pr-9 ltr:sm:pr-4 rtl:sm:pl-4 ltr:pr-9 rtl:pl-9 peer sm:bg-transparent bg-gray-100 placeholder:tracking-widest"
                                        placeholder="Search sidebar menus..."
                                        value={menuSearchQuery}
                                        onChange={(e) => setMenuSearchQuery(e.target.value)}
                                    />
                                    <button type="button" className="absolute w-9 h-9 inset-0 ltr:right-auto rtl:left-auto appearance-none peer-focus:text-primary">
                                        <IconSearch className="mx-auto" />
                                    </button>
                                    <button type="button" className="hover:opacity-80 sm:hidden block absolute top-1/2 -translate-y-1/2 ltr:right-2 rtl:left-2" onClick={() => setSearch(false)}>
                                        <IconXCircle />
                                    </button>
                                    {menuSearchQuery.trim() && (
                                        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#1b2e4b] rounded-lg shadow-lg border border-[#ebedf2] dark:border-[#253b5c] overflow-hidden z-20">
                                            {filteredSidebarItems.length > 0 ? (
                                                <ul className="py-1">
                                                    {filteredSidebarItems.map((item) => (
                                                        <li key={item.path}>
                                                            <button
                                                                type="button"
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#253b5c] dark:text-white-dark"
                                                                onClick={() => {
                                                                    navigate(item.path);
                                                                    setMenuSearchQuery('');
                                                                    setSearch(false);
                                                                }}
                                                            >
                                                                {item.label}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="px-3 py-2 text-sm text-white-dark">No menu found</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </form>
                            <button
                                type="button"
                                onClick={() => setSearch(!search)}
                                className="search_btn sm:hidden p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:bg-white-light/90 dark:hover:bg-dark/60"
                            >
                                <IconSearch className="w-4.5 h-4.5 mx-auto dark:text-[#d0d2d6]" />
                            </button>
                        </div>
                        <div>
                            {themeConfig.theme === 'light' ? (
                                <button
                                    className={`${
                                        themeConfig.theme === 'light' &&
                                        'flex items-center p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60'
                                    }`}
                                    onClick={() => {
                                        dispatch(toggleTheme('dark'));
                                    }}
                                >
                                    <IconSun />
                                </button>
                            ) : (
                                ''
                            )}
                            {themeConfig.theme === 'dark' && (
                                <button
                                    className={`${
                                        themeConfig.theme === 'dark' &&
                                        'flex items-center p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60'
                                    }`}
                                    onClick={() => {
                                        dispatch(toggleTheme('system'));
                                    }}
                                >
                                    <IconMoon />
                                </button>
                            )}
                            {themeConfig.theme === 'system' && (
                                <button
                                    className={`${
                                        themeConfig.theme === 'system' &&
                                        'flex items-center p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60'
                                    }`}
                                    onClick={() => {
                                        dispatch(toggleTheme('light'));
                                    }}
                                >
                                    <IconLaptop />
                                </button>
                            )}
                        </div>
                        <div className="shrink-0">
                            <Link 
                                to={notificationRoute} 
                                className="relative block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60"
                                onClick={() => {
                                    notificationService.requestPermission();
                                    if (userRole === 'employee') {
                                        setNotificationSeenCount(notificationUnreadCount);
                                        localStorage.setItem(notificationSeenKey, String(notificationUnreadCount));
                                    }
                                }}
                            >
                                <IconBellBing />
                                {notificationBadgeCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] leading-[18px] text-center font-semibold">
                                        {notificationBadgeCount > 99 ? '99+' : notificationBadgeCount}
                                    </span>
                                )}
                            </Link>
                        </div>
                        <div className="dropdown shrink-0 flex">
                            <Dropdown
                                offset={[0, 8]}
                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                btnClassName="relative group block"
                                button={
                                    avatarUrl ? (
                                        <img className="w-9 h-9 rounded-full object-cover saturate-50 group-hover:saturate-100" src={avatarUrl} alt="userProfile" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                                            {avatarInitials}
                                        </div>
                                    )
                                }
                            >
                                <ul className="text-dark dark:text-white-dark !py-0 w-[230px] font-semibold dark:text-white-light/90">
                                    <li>
                                        <div className="flex items-center px-4 py-4">
                                            {avatarUrl ? (
                                                <img className="rounded-md w-10 h-10 object-cover" src={avatarUrl} alt="userProfile" />
                                            ) : (
                                                <div className="rounded-md w-10 h-10 bg-primary text-white flex items-center justify-center text-sm font-bold">
                                                    {avatarInitials}
                                                </div>
                                            )}
                                            <div className="ltr:pl-4 rtl:pr-4 truncate">
                                                <h4 className="text-base">{displayName}</h4>
                                                <button type="button" className="text-black/60 hover:text-primary dark:text-dark-light/60 dark:hover:text-white">
                                                    {displayEmail}
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <Link to="/users/profile" className="dark:hover:text-white">
                                            <IconUser className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0" />
                                            Profile
                                        </Link>
                                    </li>
                                    <li className="border-t border-white-light dark:border-white-light/10">
                                        <div className="px-4 py-3">
                                            <div className="text-xs text-white-dark mb-2 font-bold uppercase">Status</div>
                                            <select 
                                                className="form-select form-select-sm" 
                                                value={currentStatus} 
                                                onChange={(e) => handleStatusUpdate(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="online">🟢 Online</option>
                                                <option value="away">🟡 Away</option>
                                                <option value="dnd">🔴 Do Not Disturb</option>
                                                <option value="offline">⚪ Offline</option>
                                            </select>
                                        </div>
                                    </li>
                                    {/* {userRole !== 'master' && (
                                        // <li>
                                        //     <Link to="/apps/mailbox" className="dark:hover:text-white">
                                        //         <IconMail className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0" />
                                        //         Inbox
                                        //     </Link>
                                        // </li>
                                    )} */}
                                    <li className="border-t border-white-light dark:border-white-light/10">
                                        <Link to="/auth/boxed-signin" className="text-danger !py-3 flex items-center" onClick={() => {
                                            ['access_token', 'refresh_token', 'user_role', 'user_id', 'username', 'is_reporting_manager', 'user_email', 'first_name', 'last_name', 'remember_me'].forEach(k => localStorage.removeItem(k));
                                            document.cookie = "session_active=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                                        }}>
                                            <IconLogout className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 rotate-90 shrink-0" />
                                            Sign Out
                                        </Link>
                                    </li>
                                </ul>
                            </Dropdown>
                        </div>
                    </div>
                </div>

                {/* horizontal menu */}
                <ul className="horizontal-menu hidden py-1.5 font-semibold px-6 lg:space-x-1.5 xl:space-x-8 rtl:space-x-reverse bg-white border-t border-[#ebedf2] dark:border-[#191e3a] dark:bg-black text-black dark:text-white-dark">
                    <li className="menu nav-item relative">
                        <button type="button" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuDashboard className="shrink-0" />
                                <span className="px-1">{t('dashboard')}</span>
                            </div>
                            <div className="right_arrow">
                                <IconCaretDown />
                            </div>
                        </button>
                        <ul className="sub-menu">
                            <li>
                                <NavLink to="/">{t('sales')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/analytics">{t('analytics')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/finance">{t('finance')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/crypto">{t('crypto')}</NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="menu nav-item relative">
                        <button type="button" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuApps className="shrink-0" />
                                <span className="px-1">{t('apps')}</span>
                            </div>
                            <div className="right_arrow">
                                <IconCaretDown />
                            </div>
                        </button>
                        <ul className="sub-menu">
                            <li>
                                <NavLink to="/apps/chat">{t('chat')}</NavLink>
                            </li>
                            {userRole !== 'master' && (
                                <li>
                                    <NavLink to="/apps/mailbox">{t('mailbox')}</NavLink>
                                </li>
                            )}
                            <li>
                                <NavLink to="/apps/todolist">{t('todo_list')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/apps/notes">{t('notes')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/apps/scrumboard">{t('scrumboard')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/apps/contacts">{t('contacts')}</NavLink>
                            </li>
                            <li className="relative">
                                <button type="button">
                                    {t('invoice')}
                                    <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                        <IconCaretDown />
                                    </div>
                                </button>
                                <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                                    <li>
                                        <NavLink to="/apps/invoice/list">{t('list')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/apps/invoice/preview">{t('preview')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/apps/invoice/add">{t('add')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/apps/invoice/edit">{t('edit')}</NavLink>
                                    </li>
                                </ul>
                            </li>
                            <li>
                                <NavLink to="/apps/calendar">{t('calendar')}</NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="menu nav-item relative">
                        <button type="button" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuComponents className="shrink-0" />
                                <span className="px-1">{t('components')}</span>
                            </div>
                            <div className="right_arrow">
                                <IconCaretDown />
                            </div>
                        </button>
                        <ul className="sub-menu">
                            <li>
                                <NavLink to="/components/tabs">{t('tabs')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/accordions">{t('accordions')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/modals">{t('modals')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/cards">{t('cards')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/carousel">{t('carousel')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/countdown">{t('countdown')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/counter">{t('counter')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/sweetalert">{t('sweet_alerts')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/timeline">{t('timeline')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/notifications">{t('notifications')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/media-object">{t('media_object')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/list-group">{t('list_group')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/pricing-table">{t('pricing_tables')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/components/lightbox">{t('lightbox')}</NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="menu nav-item relative">
                        <button type="button" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuElements className="shrink-0" />
                                <span className="px-1">{t('elements')}</span>
                            </div>
                            <div className="right_arrow">
                                <IconCaretDown />
                            </div>
                        </button>
                        <ul className="sub-menu">
                            <li>
                                <NavLink to="/elements/alerts">{t('alerts')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/avatar">{t('avatar')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/badges">{t('badges')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/breadcrumbs">{t('breadcrumbs')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/buttons">{t('buttons')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/buttons-group">{t('button_groups')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/color-library">{t('color_library')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/dropdown">{t('dropdown')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/infobox">{t('infobox')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/jumbotron">{t('jumbotron')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/loader">{t('loader')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/pagination">{t('pagination')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/popovers">{t('popovers')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/progress-bar">{t('progress_bar')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/search">{t('search')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/tooltips">{t('tooltips')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/treeview">{t('treeview')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/elements/typography">{t('typography')}</NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="menu nav-item relative">
                        <button type="button" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuDatatables className="shrink-0" />
                                <span className="px-1">{t('tables')}</span>
                            </div>
                            <div className="right_arrow">
                                <IconCaretDown />
                            </div>
                        </button>
                        <ul className="sub-menu">
                            <li>
                                <NavLink to="/tables">{t('tables')}</NavLink>
                            </li>
                            <li className="relative">
                                <button type="button">
                                    {t('datatables')}
                                    <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                        <IconCaretDown />
                                    </div>
                                </button>
                                <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                                    <li>
                                        <NavLink to="/datatables/basic">{t('basic')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/datatables/advanced">{t('advanced')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/datatables/skin">{t('skin')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/datatables/order-sorting">{t('order_sorting')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/datatables/multi-column">{t('multi_column')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/datatables/multiple-tables">{t('multiple_tables')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/datatables/alt-pagination">{t('alt_pagination')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/datatables/checkbox">{t('checkbox')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/datatables/range-search">{t('range_search')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/datatables/export">{t('export')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/datatables/column-chooser">{t('column_chooser')}</NavLink>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </li>
                    <li className="menu nav-item relative">
                        <button type="button" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuForms className="shrink-0" />
                                <span className="px-1">{t('forms')}</span>
                            </div>
                            <div className="right_arrow">
                                <IconCaretDown />
                            </div>
                        </button>
                        <ul className="sub-menu">
                            <li>
                                <NavLink to="/forms/basic">{t('basic')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/input-group">{t('input_group')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/layouts">{t('layouts')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/validation">{t('validation')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/input-mask">{t('input_mask')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/select2">{t('select2')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/touchspin">{t('touchspin')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/checkbox-radio">{t('checkbox_and_radio')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/switches">{t('switches')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/wizards">{t('wizards')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/file-upload">{t('file_upload')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/quill-editor">{t('quill_editor')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/markdown-editor">{t('markdown_editor')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/date-picker">{t('date_and_range_picker')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/forms/clipboard">{t('clipboard')}</NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="menu nav-item relative">
                        <button type="button" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuPages className="shrink-0" />
                                <span className="px-1">{t('pages')}</span>
                            </div>
                            <div className="right_arrow">
                                <IconCaretDown />
                            </div>
                        </button>
                        <ul className="sub-menu">
                            <li className="relative">
                                <button type="button">
                                    {t('users')}
                                    <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                        <IconCaretDown />
                                    </div>
                                </button>
                                <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                                    <li>
                                        <NavLink to="/users/profile">{t('profile')}</NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/users/user-account-settings">{t('account_settings')}</NavLink>
                                    </li>
                                </ul>
                            </li>
                            <li>
                                <NavLink to="/pages/knowledge-base">{t('knowledge_base')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/pages/contact-us-boxed" target="_blank">
                                    {t('contact_us_boxed')}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/pages/contact-us-cover" target="_blank">
                                    {t('contact_us_cover')}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/pages/faq">{t('faq')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/pages/coming-soon-boxed" target="_blank">
                                    {t('coming_soon_boxed')}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/pages/coming-soon-cover" target="_blank">
                                    {t('coming_soon_cover')}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/pages/maintenence" target="_blank">
                                    {t('maintenence')}
                                </NavLink>
                            </li>
                            <li className="relative">
                                <button type="button">
                                    {t('error')}
                                    <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                        <IconCaretDown />
                                    </div>
                                </button>
                                <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                                    <li>
                                        <NavLink to="/pages/error404" target="_blank">
                                            {t('404')}
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/pages/error500" target="_blank">
                                            {t('500')}
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/pages/error503" target="_blank">
                                            {t('503')}
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                            <li className="relative">
                                <button type="button">
                                    {t('login')}
                                    <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                        <IconCaretDown />
                                    </div>
                                </button>
                                <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                                    <li>
                                        <NavLink to="/auth/cover-login" target="_blank">
                                            {t('login_cover')}
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/auth/boxed-signin" target="_blank">
                                            {t('login_boxed')}
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                            <li className="relative">
                                <button type="button">
                                    {t('register')}
                                    <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                        <IconCaretDown />
                                    </div>
                                </button>
                                <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                                    <li>
                                        <NavLink to="/auth/cover-register" target="_blank">
                                            {t('register_cover')}
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/auth/boxed-signup" target="_blank">
                                            {t('register_boxed')}
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                            <li className="relative">
                                <button type="button">
                                    {t('password_recovery')}
                                    <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                        <IconCaretDown />
                                    </div>
                                </button>
                                <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                                    <li>
                                        <NavLink to="/auth/cover-password-reset" target="_blank">
                                            {t('recover_id_cover')}
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/auth/boxed-password-reset" target="_blank">
                                            {t('recover_id_boxed')}
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                            {userRole !== 'master' && (
                                <li className="relative">
                                    <button type="button">
                                        {t('lockscreen')}
                                        <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                            <IconCaretDown />
                                        </div>
                                    </button>
                                    <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                                        <li>
                                            <NavLink to="/auth/cover-lockscreen" target="_blank">
                                                {t('unlock_cover')}
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink to="/auth/boxed-lockscreen" target="_blank">
                                                {t('unlock_boxed')}
                                            </NavLink>
                                        </li>
                                    </ul>
                                </li>
                            )}
                        </ul>
                    </li>
                    <li className="menu nav-item relative">
                        <button type="button" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuMore className="shrink-0" />
                                <span className="px-1">{t('more')}</span>
                            </div>
                            <div className="right_arrow">
                                <IconCaretDown />
                            </div>
                        </button>
                        <ul className="sub-menu">
                            <li>
                                <NavLink to="/dragndrop">{t('drag_and_drop')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/charts">{t('charts')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/font-icons">{t('font_icons')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/widgets">{t('widgets')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="https://vristo.sbthemes.com" target="_blank">
                                    {t('documentation')}
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
        </header>
            {leaveIntroPortal}
        </>
    );
};

export default Header;
