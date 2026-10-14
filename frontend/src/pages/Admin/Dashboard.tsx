import { useEffect, useState } from 'react';
import OutlookInboxWidget from '../../components/Outlook/OutlookInboxWidget';
import CompanyMicrosoftCalendar from '../../components/Calendar/CompanyMicrosoftCalendar';
import IconMicrosoft from '../../components/Icon/IconMicrosoft';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Link, useNavigate } from 'react-router-dom';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconServer from '../../components/Icon/IconServer';
import IconUser from '../../components/Icon/IconUser';
import IconUserPlus from '../../components/Icon/IconUserPlus';
import IconMenuCalendar from '../../components/Icon/Menu/IconMenuCalendar';
import IconMenuUsers from '../../components/Icon/Menu/IconMenuUsers';
import IconMenuContacts from '../../components/Icon/Menu/IconMenuContacts';
import IconMenuInvoice from '../../components/Icon/Menu/IconMenuInvoice';
import IconTrendingUp from '../../components/Icon/IconTrendingUp';
import IconClock from '../../components/Icon/IconClock';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconBell from '../../components/Icon/IconBell';
import IconLogout from '../../components/Icon/IconLogout';
import IconSettings from '../../components/Icon/IconSettings';
import IconBarChart from '../../components/Icon/IconBarChart';
import IconSun from '../../components/Icon/IconSun';
import IconMoon from '../../components/Icon/IconMoon';
import IconListCheck from '../../components/Icon/IconListCheck';
import confetti from 'canvas-confetti';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

interface DashboardData {
    department_count: number;
    leaves_today: number;
    employee_overview: {
        total: number;
        active: number;
        inactive: number;
        new_joinees: number;
        exits_this_month: number;
    };
    upcoming_birthdays: { name: string; date_of_birth: string }[];
    attendance_snapshot: {
        present: number;
        absent: number;
        on_leave: number;
        half_day?: number;
        full_day_leave?: number;
    };
    pending_leave_requests: number;
    payroll_status: string;
    next_salary_release_date: string | null;
    birthday_message: string | null;
}

interface CalendarEventType {
    id: number;
    name: string;
    date: string;
    description: string;
    is_holiday: boolean;
}

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const userName = localStorage.getItem('username') || 'Admin';
    const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);

    const activeHour = new Date().getHours();
    let greeting = 'Good Evening';
    let GreetingEmoji = '🌙';
    if (activeHour < 12) {
        greeting = 'Good Morning';
        GreetingEmoji = '☀️';
    } else if (activeHour < 18) {
        greeting = 'Good Afternoon';
        GreetingEmoji = '🌤️';
    }

    const todayFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const [data, setData] = useState<DashboardData | null>(null);
    const [events, setEvents] = useState<CalendarEventType[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentStatus, setCurrentStatus] = useState<string>('online');

    useEffect(() => {
        dispatch(setPageTitle('Admin Dashboard'));
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const headers = {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            };

            const [dashRes, eventsRes, profileRes] = await Promise.all([
                fetch(`${API_BASE_URL}/app/admin-dashboard/`, { headers }),
                fetch(`${API_BASE_URL}/app/calendar-events/`, { headers }).catch(() => null),
                fetch(`${API_BASE_URL}/employee/employee-profile/`, { headers }).catch(() => null),
            ]);

            if (!dashRes.ok) {
                if (dashRes.status === 401 || dashRes.status === 403) {
                    navigate('/pages/error503', { replace: true });
                    return;
                }
                navigate('/pages/error500', { replace: true });
                return;
            }

            const result = await dashRes.json();
            setData(result);

            if (eventsRes && eventsRes.ok) {
                const evResult = await eventsRes.json();
                const evList = Array.isArray(evResult) ? evResult : evResult?.results || [];
                const today = new Date().toISOString().split('T')[0];
                const upcoming = evList
                    .filter((e: CalendarEventType) => e.date >= today)
                    .sort((a: CalendarEventType, b: CalendarEventType) => a.date.localeCompare(b.date))
                    .slice(0, 5);
                setEvents(upcoming);
            }
            if (profileRes && profileRes.ok) {
                const profileResult = await profileRes.json();
                if (profileResult.status) {
                    setCurrentStatus(profileResult.status);
                }
            }
        } catch (error) {
            console.error('Error fetching admin dashboard:', error);
            navigate('/pages/error500', { replace: true });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/employee/employee-profile/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setCurrentStatus(newStatus);
            }
        } catch (e) {
            console.error('Failed to update status:', e);
        }
    };

    const presentPercentage =
        data && data.employee_overview.total > 0
            ? Math.round((data.attendance_snapshot.present / data.employee_overview.total) * 100)
            : 0;

    useEffect(() => {
        if (data?.birthday_message) {
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
        }
    }, [data?.birthday_message]);

    const absentPercentage =
        data && data.employee_overview.total > 0
            ? Math.round((data.attendance_snapshot.absent / data.employee_overview.total) * 100)
            : 0;

    const leavePercentage =
        data && data.employee_overview.total > 0
            ? Math.round((data.attendance_snapshot.on_leave / data.employee_overview.total) * 100)
            : 0;

    const nextHoliday = events.find((e) => e.is_holiday);

    const formatDateShort = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getDaysUntil = (dateStr: string) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        return `in ${diff} days`;
    };

    // Skeleton loader
    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                    <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="panel p-10 text-center">
                <p className="text-danger text-lg font-semibold">Failed to load dashboard</p>
                <p className="text-gray-500 mt-2">Please try refreshing the page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* ─── Executive Welcome Bar ─── */}
            <div className="relative bg-gradient-to-r from-[#4361ee] via-[#536dfe] to-[#7c3aed] rounded-2xl p-4 sm:p-5 text-white shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/25 shrink-0">
                            {GreetingEmoji}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold leading-tight">
                                    {greeting}, {formattedName}
                                </h1>
                                {data.birthday_message && (
                                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 bg-pink-500/90 rounded-full text-[11px] font-bold shadow-sm animate-pulse border border-white/20">
                                        🎂 Birthday Special!
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-white/80 mt-0.5">
                                <span>{todayFormatted}</span>
                                <span className="w-1 h-1 rounded-full bg-white/50"></span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-white/70">Status:</span>
                                    <select
                                        className="bg-white/15 text-white text-xs font-semibold py-0.5 px-2 rounded-lg border border-white/25 outline-none focus:border-white/50 cursor-pointer"
                                        value={currentStatus}
                                        onChange={(e) => handleStatusUpdate(e.target.value)}
                                    >
                                        <option value="online" className="text-black">🟢 Online</option>
                                        <option value="away" className="text-black">🟡 Away</option>
                                        <option value="dnd" className="text-black">🔴 Do Not Disturb</option>
                                        <option value="offline" className="text-black">⚪ Offline</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Header Quick Pills */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                        {nextHoliday && (
                            <Link
                                to="/admin/calendar"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 transition-all text-white"
                            >
                                <IconCalendar className="w-3.5 h-3.5 text-amber-300" />
                                <span>Holiday: <strong>{formatDateShort(nextHoliday.date)}</strong> ({getDaysUntil(nextHoliday.date)})</span>
                            </Link>
                        )}
                        <Link
                            to="/admin/approved-leaves"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 transition-all text-white"
                        >
                            <IconBell className="w-3.5 h-3.5 text-rose-300" />
                            <span>Pending Approvals: <strong>{data.pending_leave_requests}</strong></span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* ─── Compact Key Metrics Row ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {/* Total Employees */}
                <Link
                    to="/admin/employee-register"
                    className="panel !p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4 border-l-primary flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Employees</span>
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                            <IconUsersGroup className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{data.employee_overview.total}</span>
                        <span className="text-xs text-success font-medium bg-success/10 px-1.5 py-0.5 rounded">
                            {data.employee_overview.active} active
                        </span>
                    </div>
                </Link>

                {/* Today's Attendance */}
                <Link
                    to="/admin/attendance-details"
                    className="panel !p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4 border-l-success flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Present Today</span>
                        <div className="p-1.5 bg-success/10 rounded-lg text-success">
                            <IconClock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-success">{data.attendance_snapshot.present}</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {presentPercentage}% rate
                        </span>
                    </div>
                    <div className="mt-1.5 w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${presentPercentage}%` }} />
                    </div>
                </Link>

                {/* Leaves & Absences */}
                <Link
                    to="/admin/leave-history"
                    className="panel !p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4 border-l-warning flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Leaves & Absences</span>
                        <div className="p-1.5 bg-warning/10 rounded-lg text-warning">
                            <IconListCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-warning">{data.leaves_today}</span>
                        <span className="text-xs text-danger font-medium">
                            {data.attendance_snapshot.absent} absent
                        </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>On leave today</span>
                        <span className="text-danger font-medium">{absentPercentage}% absent</span>
                    </div>
                </Link>

                {/* Departments & Joinees */}
                <Link
                    to="/admin/branch-mgt/department"
                    className="panel !p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4 border-l-info flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Departments</span>
                        <div className="p-1.5 bg-info/10 rounded-lg text-info">
                            <IconServer className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{data.department_count}</span>
                        <span className="text-xs text-info font-medium bg-info/10 px-1.5 py-0.5 rounded">
                            +{data.employee_overview.new_joinees} new
                        </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                        Active business units
                    </div>
                </Link>

                {/* Payroll Status */}
                <Link
                    to="/admin/payroll-batches"
                    className="col-span-2 sm:col-span-2 lg:col-span-4 xl:col-span-1 panel !p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4 border-l-secondary flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Payroll Cycle</span>
                        <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary">
                            <IconMenuInvoice className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            data.payroll_status === 'completed'
                                ? 'bg-success/15 text-success'
                                : 'bg-warning/15 text-warning'
                        }`}>
                            {data.payroll_status === 'completed' ? '✓ Completed' : '⏳ In Progress'}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                            {data.next_salary_release_date ? new Date(data.next_salary_release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Pending'}
                        </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                        Next salary release
                    </div>
                </Link>
            </div>

            {/* ─── Outlook Workspace (Calendar & Mail Side-by-Side) ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {/* Left: Outlook Calendar */}
                <div className="panel !p-0 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm bg-white dark:bg-[#0e1726] flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0b1320]/60">
                        <h5 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <IconMicrosoft size={20} />
                            <span>Outlook Calendar</span>
                        </h5>
                        <Link
                            to="/admin/calendar"
                            className="text-primary hover:underline text-xs font-semibold flex items-center gap-1"
                        >
                            <span>Full Calendar</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                    <div className="p-3 sm:p-4 flex-1">
                        <CompanyMicrosoftCalendar variant="widget" />
                    </div>
                </div>

                {/* Right: Logged-in User Outlook Mail */}
                <OutlookInboxWidget className="h-full" maxHeight="max-h-[460px]" />
            </div>

            {/* ─── Operational Insights & Actions (3 Columns) ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Column 1: Workforce Breakdown */}
                <div className="panel p-4 sm:p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3.5">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <span className="w-1 h-4 bg-primary rounded-full"></span>
                                Workforce Breakdown
                            </h3>
                            <Link to="/admin/employee-register" className="text-xs text-primary hover:underline font-medium">
                                View Registry
                            </Link>
                        </div>

                        <div className="space-y-2">
                            {[
                                { label: 'Active Employees', value: data.employee_overview.active, color: 'text-success', dot: 'bg-success' },
                                { label: 'Inactive / On Notice', value: data.employee_overview.inactive, color: 'text-danger', dot: 'bg-danger' },
                                { label: 'New Joiners (This Month)', value: data.employee_overview.new_joinees, color: 'text-info', dot: 'bg-info' },
                                { label: 'Exits (This Month)', value: data.employee_overview.exits_this_month, color: 'text-warning', dot: 'bg-warning' },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#1a2941] rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-2 h-2 rounded-full ${item.dot}`}></span>
                                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{item.label}</span>
                                    </div>
                                    <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Attendance Mini Bar */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Present: <strong className="text-success">{data.attendance_snapshot.present}</strong></span>
                        <span>Absent: <strong className="text-danger">{data.attendance_snapshot.absent}</strong></span>
                        <span>On Leave: <strong className="text-warning">{data.attendance_snapshot.on_leave}</strong></span>
                    </div>
                </div>

                {/* Column 2: Quick Actions */}
                <div className="panel p-4 sm:p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3.5">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                                Quick Actions
                            </h3>
                            <span className="text-xs text-slate-400">Shortcuts</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Employees', icon: <IconMenuUsers className="w-4 h-4" />, to: '/admin/employee-register', color: 'text-primary', bg: 'bg-primary/10 hover:bg-primary/20' },
                                { label: 'Attendance', icon: <IconBarChart className="w-4 h-4" />, to: '/admin/attendance-logs', color: 'text-secondary', bg: 'bg-secondary/10 hover:bg-secondary/20' },
                                { label: 'Leaves', icon: <IconMenuCalendar className="w-4 h-4" />, to: '/admin/leave-history', color: 'text-success', bg: 'bg-success/10 hover:bg-success/20' },
                                { label: 'Payroll', icon: <IconMenuInvoice className="w-4 h-4" />, to: '/admin/payroll-batches', color: 'text-warning', bg: 'bg-warning/10 hover:bg-warning/20' },
                                { label: 'Calendar', icon: <IconCalendar className="w-4 h-4" />, to: '/admin/calendar', color: 'text-indigo-500', bg: 'bg-indigo-500/10 hover:bg-indigo-500/20' },
                                { label: 'Departments', icon: <IconMenuContacts className="w-4 h-4" />, to: '/admin/branch-mgt/department', color: 'text-danger', bg: 'bg-danger/10 hover:bg-danger/20' },
                                { label: 'Shifts', icon: <IconSettings className="w-4 h-4" />, to: '/admin/configuration/shift', color: 'text-info', bg: 'bg-info/10 hover:bg-info/20' },
                                { label: 'Reportees', icon: <IconMenuUsers className="w-4 h-4" />, to: '/admin/reportees', color: 'text-emerald-500', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20' },
                                { label: 'Tasks', icon: <IconListCheck className="w-4 h-4" />, to: '/admin/assign-task', color: 'text-purple-500', bg: 'bg-purple-500/10 hover:bg-purple-500/20' },
                            ].map((action) => (
                                <Link
                                    key={action.label}
                                    to={action.to}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border border-transparent ${action.bg} transition-all hover:-translate-y-0.5 text-center`}
                                >
                                    <div className={`${action.color} mb-1`}>{action.icon}</div>
                                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate w-full">{action.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Column 3: Upcoming Schedule & Birthdays */}
                <div className="panel p-4 sm:p-5 flex flex-col justify-between">
                    {/* Events Sub-section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                                Upcoming Events
                            </h3>
                            <Link to="/admin/calendar" className="text-xs text-primary hover:underline font-medium">
                                View all
                            </Link>
                        </div>

                        {events.length === 0 ? (
                            <div className="text-center py-2 text-xs text-slate-400">
                                No upcoming events
                            </div>
                        ) : (
                            <div className="space-y-1.5 max-h-[130px] overflow-y-auto pr-1">
                                {events.slice(0, 3).map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-[#1a2941] rounded-xl text-xs"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${event.is_holiday ? 'bg-amber-500' : 'bg-primary'}`} />
                                            <span className="font-semibold text-slate-800 dark:text-white truncate" title={event.name}>
                                                {event.name}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                                            {formatDateShort(event.date)} ({getDaysUntil(event.date)})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Birthdays Sub-section */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-2">
                            <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
                            🎂 Birthdays This Month
                        </h3>

                        {data.upcoming_birthdays.length === 0 ? (
                            <p className="text-xs text-slate-400 py-1">No birthdays coming up</p>
                        ) : (
                            <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                                {data.upcoming_birthdays.slice(0, 3).map((b, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-1.5 px-2 bg-pink-50/60 dark:bg-pink-900/10 rounded-lg text-xs"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="w-5 h-5 rounded-full bg-pink-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                                {b.name.charAt(0)}
                                            </span>
                                            <span className="font-medium text-slate-800 dark:text-white truncate">{b.name}</span>
                                        </div>
                                        <span className="text-[10px] text-pink-600 dark:text-pink-400 font-medium shrink-0">
                                            {new Date(b.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
