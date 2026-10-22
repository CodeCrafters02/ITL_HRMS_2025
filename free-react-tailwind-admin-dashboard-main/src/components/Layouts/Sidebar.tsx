import PerfectScrollbar from 'react-perfect-scrollbar';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import IconLogout from '../Icon/IconLogout';
import { confirmSignOut } from '../../utils/signOut';
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
import IconOpenBook from '../Icon/IconOpenBook';
import IconBook from '../Icon/IconBook';
import IconAward from '../Icon/IconAward';
import IconSend from '../Icon/IconSend';
import IconStar from '../Icon/IconStar';
import IconUsersGroup from '../Icon/IconUsersGroup';
import IconListCheck from '../Icon/IconListCheck';
import IconSettings from '../Icon/IconSettings';
import IconBox from '../Icon/IconBox';
import IconCashBanknotes from '../Icon/IconCashBanknotes';
import IconDesktop from '../Icon/IconDesktop';
import IconHome from '../Icon/IconHome';
import IconArrowBackward from '../Icon/IconArrowBackward';
import SideNav from '../Common/SideNav';
import { buildAdminNav, getAdminNavMode, adminScopeLabel } from './adminNav';
import { buildEmployeeNav, getEmployeeNavMode, employeeScopeLabel } from './employeeNav';
import { buildMasterNav, masterScopeLabel } from './masterNav';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const Sidebar = () => {
    const navigate = useNavigate();
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const location = useLocation();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const userRole = localStorage.getItem('user_role') || '';
    const adminNavMode = getAdminNavMode(location.pathname);
    const employeeNavMode = getEmployeeNavMode(location.pathname);
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
                className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] z-50 lg:z-[38] transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="bg-white dark:bg-[#060818] h-full flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
                            <NavLink to="/" className="main-logo flex items-center gap-2.5 shrink-0 group">
                                <div className="p-1 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center">
                                    <img className="w-8 h-8 object-contain" src={hrmsLogo} alt="logo" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 leading-none">
                                        <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">People Suite</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">Enterprise Portal</span>
                                </div>
                            </NavLink>

                            <button
                                type="button"
                                className="collapse-icon w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-slate-800 dark:hover:text-primary transition-all duration-200 rtl:rotate-180"
                                onClick={() => dispatch(toggleSidebar())}
                                title="Toggle Sidebar"
                            >
                                <IconCaretsDown className="m-auto rotate-90 w-4 h-4" />
                            </button>
                        </div>
                        {userRole === 'admin' || userRole === 'employee' || userRole === 'master' ? (
                            <div className="h-[calc(var(--app-vh)_-_185px)]">
                                <SideNav
                                    sections={
                                        userRole === 'master'
                                            ? buildMasterNav(t)
                                            : userRole === 'admin'
                                            ? buildAdminNav(adminNavMode, t)
                                            : buildEmployeeNav(employeeNavMode, t, {
                                                  isManager: localStorage.getItem('is_reporting_manager') === 'true',
                                                  myTasks: unreadCount('myTasks', employeeCounts.myTasks),
                                                  assetRequests: unreadCount('assetRequests', employeeCounts.assetRequests),
                                                  loanApprovals: unreadCount('loanApprovals', employeeCounts.loanApprovals),
                                                  reimbursementApprovals: unreadCount('reimbursementApprovals', employeeCounts.reimbursementApprovals),
                                                  leaveApprovals: unreadLeaveApprovalCount,
                                                  leaveApplication: unreadCount('leaveApplicationUpdates', employeeCounts.leaveApplicationUpdates),
                                                  assignTask: unreadCount('assignTask', employeeCounts.assignTask),
                                                  requestsFolder: unreadRequestsFolderCount,
                                                  reimbursementFolder: unreadReimbursementFolderCount,
                                              })
                                    }
                                    header={
                                        <div className="flex items-center justify-between rounded-xl border border-brand/15 bg-gradient-to-r from-brand/[0.07] to-transparent px-3 py-2 dark:border-brand-400/15 dark:from-brand-500/10">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand dark:bg-brand-400" />
                                                <span className="truncate text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">{userRole === 'master' ? masterScopeLabel(t) : userRole === 'admin' ? adminScopeLabel(adminNavMode, t) : employeeScopeLabel(employeeNavMode, t)}</span>
                                            </div>
                                            <span className="rounded-md border border-brand/20 bg-brand/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-brand dark:text-brand-300">{userRole === 'master' ? 'Master' : userRole === 'admin' ? 'Admin' : 'Employee'}</span>
                                        </div>
                                    }
                                    searchable={userRole === 'admin' ? adminNavMode !== 'hub' : userRole !== 'master'}
                                />
                            </div>
                        ) : null}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/80 p-3 bg-slate-50/50 dark:bg-slate-900/50">
                        {/* Compact Admin User Info */}
                        <div className="mb-2 px-2.5 py-2 flex items-center justify-between rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-brand-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-primary/20">
                                    {(localStorage.getItem('username') || 'A')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 truncate">
                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                        {localStorage.getItem('username') || 'Administrator'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate uppercase font-semibold">
                                        {userRole || 'Admin'}
                                    </p>
                                </div>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-500/20" title="Active"></span>
                        </div>

                        <button
                            type="button"
                            onClick={async () => (await confirmSignOut()) && navigate('/auth/boxed-signin')}
                            className="flex w-full items-center justify-center gap-2 rounded-xl p-2 font-semibold text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40"
                        >
                            <IconLogout className="h-4 w-4 shrink-0 rotate-90" />
                            <span>{t('Sign Out')}</span>
                        </button>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
