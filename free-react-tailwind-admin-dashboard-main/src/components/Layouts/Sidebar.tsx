import PerfectScrollbar from 'react-perfect-scrollbar';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { toggleSidebar } from '../../store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '../../store';
import { useState, useEffect } from 'react';
import hrmsLogo from '../../assets/logo/hrms-logo.png';
import IconCaretsDown from '../Icon/IconCaretsDown';
import IconCaretDown from '../Icon/IconCaretDown';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconMinus from '../Icon/IconMinus';
import IconMenuContacts from '../Icon/Menu/IconMenuContacts';
import IconMenuCalendar from '../Icon/Menu/IconMenuCalendar';
import IconMenuChat from '../Icon/Menu/IconMenuChat';
import IconMenuCharts from '../Icon/Menu/IconMenuCharts';
import IconMenuTables from '../Icon/Menu/IconMenuTables';
import IconMenuForms from '../Icon/Menu/IconMenuForms';
import IconMenuUsers from '../Icon/Menu/IconMenuUsers';
import IconMenuPages from '../Icon/Menu/IconMenuPages';
import IconMenuAuthentication from '../Icon/Menu/IconMenuAuthentication';
import IconMenuDocumentation from '../Icon/Menu/IconMenuDocumentation';
import IconMenuComponents from '../Icon/Menu/IconMenuComponents';
import IconMenuElements from '../Icon/Menu/IconMenuElements';
import IconMenuInvoice from '../Icon/Menu/IconMenuInvoice';
import IconMenuNotes from '../Icon/Menu/IconMenuNotes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const Sidebar = () => {
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const location = useLocation();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const userRole = localStorage.getItem('user_role') || '';
    const [employeeCounts, setEmployeeCounts] = useState({
        myTasks: 0,
        assetRequests: 0,
        loanApprovals: 0,
        reimbursementApprovals: 0,
        leaveApplicationUpdates: 0,
        leaveApprovals: 0,
        assignTask: 0,
    });
    const [seenCounts, setSeenCounts] = useState<Record<string, number>>({});
    const SEEN_KEY = 'employee_sidebar_seen_counts';
    const [pendingLeaveApprovalIds, setPendingLeaveApprovalIds] = useState<number[]>([]);
    const [seenLeaveApprovalIds, setSeenLeaveApprovalIds] = useState<number[]>([]);
    const LEAVE_APPROVAL_SEEN_IDS_KEY = 'employee_sidebar_seen_leave_approval_ids';

    const statusIsPending = (status: unknown) => String(status || '').toLowerCase() === 'pending';
    const countBadge = (count: number) =>
        count > 0 ? (
            <span className="ltr:ml-2 rtl:mr-2 inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold">
                {count > 99 ? '99+' : count}
            </span>
        ) : null;
    const unreadCount = (key: string, total: number) => Math.max(0, total - (seenCounts[key] || 0));

    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }, []);

    useEffect(() => {
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SEEN_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') setSeenCounts(parsed);
        } catch {
            setSeenCounts({});
        }
    }, []);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(LEAVE_APPROVAL_SEEN_IDS_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                setSeenLeaveApprovalIds(parsed.map((v) => Number(v)).filter((v) => Number.isFinite(v)));
            }
        } catch {
            setSeenLeaveApprovalIds([]);
        }
    }, []);

    useEffect(() => {
        if (userRole !== 'employee') return;
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const headers: HeadersInit = { Authorization: `Bearer ${token}` };

        const loadEmployeeCounts = async () => {
            try {
                const [myTasksRes, managerTasksRes, leaveRes, loanRes, reimburseRes, assetRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/employee/my-tasks/?page=1&page_size=1`, { headers }),
                    fetch(`${API_BASE_URL}/employee/tasks/?page=1&page_size=200`, { headers }),
                    fetch(`${API_BASE_URL}/employee/emp-leaves/`, { headers }),
                    fetch(`${API_BASE_URL}/app/loan-applications/?page=1&page_size=200`, { headers }),
                    fetch(`${API_BASE_URL}/app/reimbursement-requests/?status=pending&page=1&page_size=1`, { headers }),
                    fetch(`${API_BASE_URL}/app/asset-requests/?page=1&page_size=200`, { headers }),
                ]);

                const myTasksData = myTasksRes.ok ? await myTasksRes.json().catch(() => ({})) : {};
                const managerTasksData = managerTasksRes.ok ? await managerTasksRes.json().catch(() => ({})) : {};
                const leavesData = leaveRes.ok ? await leaveRes.json().catch(() => []) : [];
                const loansData = loanRes.ok ? await loanRes.json().catch(() => ({})) : {};
                const reimburseData = reimburseRes.ok ? await reimburseRes.json().catch(() => ({})) : {};
                const assetsData = assetRes.ok ? await assetRes.json().catch(() => ({})) : {};

                const myTasksSummary = myTasksData?.summary || {};
                const myTasksOpen = Number(myTasksSummary.in_progress || 0) + Number(myTasksSummary.overdue || 0);

                const managerTaskList = Array.isArray(managerTasksData)
                    ? managerTasksData
                    : Array.isArray(managerTasksData?.results)
                      ? managerTasksData.results
                      : [];
                const assignTaskOpen = managerTaskList.filter((task: any) => String(task?.status || '').toLowerCase() !== 'done').length;

                const leavesList = Array.isArray(leavesData) ? leavesData : Array.isArray((leavesData as any)?.results) ? (leavesData as any).results : [];
                const pendingLeaves = leavesList.filter((l: any) => statusIsPending(l?.status));
                const leaveApprovals = pendingLeaves.length;
                const leaveApprovalIds = pendingLeaves.map((l: any) => Number(l?.id)).filter((id: number) => Number.isFinite(id));
                setPendingLeaveApprovalIds(leaveApprovalIds);
                const leaveApplicationUpdates = leavesList.filter((l: any) => {
                    const status = String(l?.status || '').toLowerCase();
                    return status === 'approved' || status === 'rejected';
                }).length;

                const loansList = Array.isArray(loansData) ? loansData : Array.isArray(loansData?.results) ? loansData.results : [];
                const loanApprovals = loansList.filter((l: any) => statusIsPending(l?.status)).length;

                const reimbursementApprovals = Number(reimburseData?.count || 0);

                const assetsList = Array.isArray(assetsData) ? assetsData : Array.isArray(assetsData?.results) ? assetsData.results : [];
                const assetRequests = assetsList.filter((a: any) => statusIsPending(a?.approval_status)).length;

                setEmployeeCounts({
                    myTasks: myTasksOpen,
                    assetRequests,
                    loanApprovals,
                    reimbursementApprovals,
                    leaveApplicationUpdates,
                    leaveApprovals,
                    assignTask: assignTaskOpen,
                });
            } catch {
                setPendingLeaveApprovalIds([]);
                setEmployeeCounts({
                    myTasks: 0,
                    assetRequests: 0,
                    loanApprovals: 0,
                    reimbursementApprovals: 0,
                    leaveApplicationUpdates: 0,
                    leaveApprovals: 0,
                    assignTask: 0,
                });
            }
        };

        loadEmployeeCounts();
        const timer = setInterval(loadEmployeeCounts, 60000);
        return () => clearInterval(timer);
    }, [userRole]);

    useEffect(() => {
        if (userRole !== 'employee') return;
        const path = location.pathname;
        const nextSeen = { ...seenCounts };
        let changed = false;

        const markSeen = (key: keyof typeof employeeCounts, routePrefix: string) => {
            if (path.startsWith(routePrefix)) {
                const latest = employeeCounts[key] || 0;
                if ((nextSeen[key] || 0) < latest) {
                    nextSeen[key] = latest;
                    changed = true;
                }
            }
        };

        markSeen('myTasks', '/employee/my-tasks');
        markSeen('assetRequests', '/employee/asset-requests');
        markSeen('loanApprovals', '/employee/loan-approvals');
        markSeen('reimbursementApprovals', '/employee/reimbursement/approvals');
        markSeen('leaveApplicationUpdates', '/employee/leave-application');
        markSeen('leaveApprovals', '/employee/leave-approval');
        markSeen('assignTask', '/employee/assign-task');

        if (changed) {
            setSeenCounts(nextSeen);
            localStorage.setItem(SEEN_KEY, JSON.stringify(nextSeen));
        }

        if (path.startsWith('/employee/leave-approval')) {
            setSeenLeaveApprovalIds(pendingLeaveApprovalIds);
            localStorage.setItem(LEAVE_APPROVAL_SEEN_IDS_KEY, JSON.stringify(pendingLeaveApprovalIds));
        }
    }, [location.pathname, userRole, employeeCounts, seenCounts, pendingLeaveApprovalIds]);

    const unreadLeaveApprovalCount = Math.max(0, pendingLeaveApprovalIds.filter((id) => !seenLeaveApprovalIds.includes(id)).length);
    const unreadRequestsFolderCount =
        unreadCount('assetRequests', employeeCounts.assetRequests) +
        unreadCount('loanApprovals', employeeCounts.loanApprovals);
    const unreadReimbursementFolderCount = unreadCount('reimbursementApprovals', employeeCounts.reimbursementApprovals);

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] z-50 transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="bg-white dark:bg-black h-full">
                    <div className="flex justify-between items-center px-4 py-3">
                        <NavLink to="/" className="main-logo flex items-center shrink-0">
                            <img className="w-14 ml-1 flex-none object-contain" src={hrmsLogo} alt="logo" />
                            <span className="text-2xl ltr:ml-1.5 rtl:mr-1.5 font-bold align-middle lg:inline dark:text-white-light tracking-tight pb-1">HRMS</span>
                        </NavLink>

                        <button
                            type="button"
                            className="collapse-icon w-8 h-8 rounded-full flex items-center hover:bg-gray-500/10 dark:hover:bg-dark-light/10 dark:text-white-light transition duration-300 rtl:rotate-180"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="h-[calc(100vh-80px)] relative">
                        <ul className="relative font-semibold space-y-0.5 p-4 py-0">

                            {/* ===== MASTER SIDEBAR ===== */}
                            {userRole === 'master' && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>{t('Master Dashboard')}</span>
                                    </h2>
                                    <li className="menu nav-item">
                                        <NavLink to="/master/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Dashboard')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/master/company" className="group">
                                            <div className="flex items-center">
                                                <IconMenuContacts className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Company')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/master/user-management" className="group">
                                            <div className="flex items-center">
                                                <IconMenuUsers className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('User Management')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* ===== EMPLOYEE SIDEBAR ===== */}
                            {userRole === 'employee' && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>{t('Employee Dashboard')}</span>
                                    </h2>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Dashboard')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/my-tasks" className="group">
                                            <div className="flex items-center">
                                                <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('My Tasks')}</span>
                                                {countBadge(unreadCount('myTasks', employeeCounts.myTasks))}
                                            </div>
                                        </NavLink>
                                    </li>
                                    {/* <li className="menu nav-item">
                                        <NavLink to="/employee/leave-application" className="group">
                                            <div className="flex items-center">
                                                <IconMenuCalendar className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Leave Application')}</span>
                                                {countBadge(unreadCount('leaveApplicationUpdates', employeeCounts.leaveApplicationUpdates))}
                                            </div>
                                        </NavLink>
                                    </li> */}
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/attendance-history" className="group">
                                            <div className="flex items-center">
                                                <IconMenuCharts className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Attendance History')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/my-payslips" className="group">
                                            <div className="flex items-center">
                                                <IconMenuInvoice className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('My Payslips')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    {/* <li className="menu nav-item">
                                        <NavLink to="/employee/notifications" className="group">
                                            <div className="flex items-center">
                                                <IconMenuPages className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Notifications')}</span>
                                            </div>
                                        </NavLink>
                                    </li> */}
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/learning-corner" className="group">
                                            <div className="flex items-center">
                                                <IconMenuTables className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Learning Corner')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/reportees" className="group">
                                            <div className="flex items-center">
                                                <IconMenuUsers className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Reportees')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'emp-bookings' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('emp-bookings')}>
                                            <div className="flex items-center">
                                                <IconMenuComponents className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Bookings')}</span>
                                            </div>
                                            <div className={currentMenu !== 'emp-bookings' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'emp-bookings' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/employee/seat-booking">{t('Seat Booking')}</NavLink></li>
                                                <li><NavLink to="/employee/conference-room-booking">{t('Conf. Room Booking')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>
                                    {/* <li className="menu nav-item">
                                        <NavLink to="/employee/chat" className="group">
                                            <div className="flex items-center">
                                                <IconMenuChat className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Chat')}</span>
                                            </div>
                                        </NavLink>
                                    </li> */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'emp-requests' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('emp-requests')}>
                                            <div className="flex items-center">
                                                <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Requests')}</span>
                                                {countBadge(unreadRequestsFolderCount)}
                                            </div>
                                            <div className={currentMenu !== 'emp-requests' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'emp-requests' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li>
                                                    <NavLink to="/employee/asset-requests" className="flex items-center gap-2">
                                                        <span>{t('Asset Requests')}</span>
                                                        {countBadge(unreadCount('assetRequests', employeeCounts.assetRequests))}
                                                    </NavLink>
                                                </li>
                                                <li><NavLink to="/employee/loan-application">{t('Loan Application')}</NavLink></li>
                                                <li><NavLink to="/employee/wfh-request">{t('Work From Home')}</NavLink></li>
                                                {localStorage.getItem('is_reporting_manager') === 'true' && (
                                                    <li>
                                                        <NavLink to="/employee/loan-approvals" className="flex items-center gap-2">
                                                            <span>{t('Loan Approvals')}</span>
                                                            {countBadge(unreadCount('loanApprovals', employeeCounts.loanApprovals))}
                                                        </NavLink>
                                                    </li>
                                                )}
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Reimbursement */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'reimbursement' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('reimbursement')}>
                                            <div className="flex items-center">
                                                <IconMenuInvoice className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Reimbursement')}</span>
                                                {countBadge(unreadReimbursementFolderCount)}
                                            </div>
                                            <div className={currentMenu !== 'reimbursement' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'reimbursement' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/employee/reimbursement/request">{t('Request Reimbursement')}</NavLink></li>
                                                <li><NavLink to="/employee/reimbursement/status">{t('My Requests')}</NavLink></li>
                                                <li>
                                                    <NavLink to="/employee/reimbursement/approvals" className="flex items-center gap-2">
                                                        <span>{t('Approvals')}</span>
                                                        {countBadge(unreadCount('reimbursementApprovals', employeeCounts.reimbursementApprovals))}
                                                    </NavLink>
                                                </li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {localStorage.getItem('is_reporting_manager') === 'true' && (
                                        <>
                                            <li className="menu nav-item">
                                                <NavLink to="/employee/leave-approval" className="group">
                                                    <div className="flex items-center">
                                                        <IconMenuCalendar className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Leave Request')}</span>
                                                        {countBadge(unreadLeaveApprovalCount)}
                                                    </div>
                                                </NavLink>
                                            </li>
                                            <li className="menu nav-item">
                                                <NavLink to="/employee/assign-task" className="group">
                                                    <div className="flex items-center">
                                                        <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Assign Task')}</span>
                                                        {countBadge(unreadCount('assignTask', employeeCounts.assignTask))}
                                                    </div>
                                                </NavLink>
                                            </li>
                                        </>
                                    )}
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/references" className="group">
                                            <div className="flex items-center">
                                                <IconMenuForms className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('References')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/company-policy" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDocumentation className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Company policies')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* ===== ADMIN SIDEBAR ===== */}
                            {userRole === 'admin' && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>{t('Admin Dashboard')}</span>
                                    </h2>

                                    {/* Dashboard */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Dashboard')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Task Management */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/reportees" className="group">
                                            <div className="flex items-center">
                                                <IconMenuUsers className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Reportees')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="menu nav-item">
                                        <NavLink to="/admin/assign-task" className="group">
                                            <div className="flex items-center">
                                                <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Assign Task')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Configurator */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'configurator' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('configurator')}>
                                            <div className="flex items-center">
                                                <IconMenuElements className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Configurator')}</span>
                                            </div>
                                            <div className={currentMenu !== 'configurator' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'configurator' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/branch-mgt/department">{t('Department')}</NavLink></li>
                                                <li><NavLink to="/admin/branch-mgt/level">{t('Level')}</NavLink></li>
                                                <li><NavLink to="/admin/branch-mgt/designation">{t('Designation')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/break-config">{t('Break Config')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/shift">{t('Shift')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/department-wise-working-days">{t('Dept Working Days')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/leave-count">{t('Leave Count')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/company-policies">{t('Company Policies')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/office-structure">{t('Office Structure')}</NavLink></li>
                                                <li><NavLink to="/admin/loan-configuration">{t('Loan Configuration')}</NavLink></li>
                                                <li><NavLink to="/admin/loan-approvals">{t('Loan Approvals')}</NavLink></li>
                                                <li><NavLink to="/admin/seat-approvals">{t('Seat Approvals')}</NavLink></li>
                                                <li><NavLink to="/admin/seat-bookings-overview">{t('Seat Bookings Overview')}</NavLink></li>
                                                <li><NavLink to="/admin/geofencing">{t('Geofencing')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Employee Management */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'employee-mgt' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('employee-mgt')}>
                                            <div className="flex items-center">
                                                <IconMenuUsers className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Employee Mgt')}</span>
                                            </div>
                                            <div className={currentMenu !== 'employee-mgt' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'employee-mgt' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/employee-register">{t('Employee Register')}</NavLink></li>
                                                <li><NavLink to="/admin/assign-shifts">{t('Assign Shifts')}</NavLink></li>
                                                <li><NavLink to="/admin/recruitment">{t('Recruitment')}</NavLink></li>
                                                <li><NavLink to="/admin/relieved-employees">{t('Relieved Employees')}</NavLink></li>
                                                <li><NavLink to="/admin/letter-templates">{t('Letter Templates')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Conference Room Management */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'conference-room-mgt' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('conference-room-mgt')}>
                                            <div className="flex items-center">
                                                <IconMenuComponents className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Conference Room Mgt')}</span>
                                            </div>
                                            <div className={currentMenu !== 'conference-room-mgt' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'conference-room-mgt' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/conference-room/structure">{t('Structure')}</NavLink></li>
                                                <li><NavLink to="/admin/conference-room/approval">{t('Approval')}</NavLink></li>
                                                <li><NavLink to="/admin/conference-room/overview">{t('Overview')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Leave Management */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'leave-mgt' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('leave-mgt')}>
                                            <div className="flex items-center">
                                                <IconMenuCalendar className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Leave Mgt')}</span>
                                            </div>
                                            <div className={currentMenu !== 'leave-mgt' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'leave-mgt' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/leave-approval">{t('Leave Approval')}</NavLink></li>
                                                <li><NavLink to="/admin/leave-history">{t('Leave History')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Attendance Management */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'attendance-mgt' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('attendance-mgt')}>
                                            <div className="flex items-center">
                                                <IconMenuCharts className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Attendance Mgt')}</span>
                                            </div>
                                            <div className={currentMenu !== 'attendance-mgt' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'attendance-mgt' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/attendance-logs">{t('Attendance Logs')}</NavLink></li>
                                                <li><NavLink to="/admin/attendance-details">{t('Attendance Details')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Payroll Management */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'payroll-mgt' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('payroll-mgt')}>
                                            <div className="flex items-center">
                                                <IconMenuInvoice className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Payroll Mgt')}</span>
                                            </div>
                                            <div className={currentMenu !== 'payroll-mgt' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'payroll-mgt' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/salary-structure">{t('Salary Structure')}</NavLink></li>
                                                <li><NavLink to="/admin/designation-salary">{t('Salary per Designation')}</NavLink></li>
                                                <li><NavLink to="/admin/payroll-batches">{t('Payroll Reports')}</NavLink></li>
                                                <li><NavLink to="/admin/salary-disbursement">{t('Disbursement Statement')}</NavLink></li>
                                                <li><NavLink to="/admin/payslip-rollout">{t('Payslip Rollout')}</NavLink></li>
                                                <li><NavLink to="/admin/income-tax">{t('Income Config')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Assets & Inventory */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/assets-inventory" className="group">
                                            <div className="flex items-center">
                                                <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Assets & Inventory')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/wfh-management" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Work From Home')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Calendar */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/calendar" className="group">
                                            <div className="flex items-center">
                                                <IconMenuCalendar className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Calendar')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Chat */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/chat" className="group">
                                            <div className="flex items-center">
                                                <IconMenuChat className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Chat')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Notifications */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/notifications" className="group">
                                            <div className="flex items-center">
                                                <IconMenuPages className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Notifications')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Learning Corner */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/learning-corner" className="group">
                                            <div className="flex items-center">
                                                <IconMenuTables className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Learning Corner')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Employee References */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/employee-references" className="group">
                                            <div className="flex items-center">
                                                <IconMenuForms className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Employee References')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Reimbursement */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'reimbursement-admin' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('reimbursement-admin')}>
                                            <div className="flex items-center">
                                                <IconMenuInvoice className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Reimbursement')}</span>
                                            </div>
                                            <div className={currentMenu !== 'reimbursement-admin' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'reimbursement-admin' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/reimbursement/categories">{t('Categories')}</NavLink></li>
                                                <li><NavLink to="/admin/reimbursement/approvals">{t('Approvals')}</NavLink></li>
                                                <li><NavLink to="/admin/reimbursement/history">{t('History & Stats')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* System Settings */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/system-settings" className="group">
                                            <div className="flex items-center">
                                                <IconMenuElements className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('System Settings')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
