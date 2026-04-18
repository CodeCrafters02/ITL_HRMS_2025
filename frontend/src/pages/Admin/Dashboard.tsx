import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
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

    useEffect(() => {
        dispatch(setPageTitle('Admin Dashboard'));
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const headers = {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            };

            const [dashRes, eventsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/app/admin-dashboard/`, { headers }),
                fetch(`${API_BASE_URL}/app/calendar-events/`, { headers }).catch(() => null),
            ]);

            if (dashRes.ok) {
                const result = await dashRes.json();
                setData(result);
            }

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
        } catch (error) {
            console.error('Error fetching admin dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const presentPercentage =
        data && data.employee_overview.total > 0
            ? Math.round((data.attendance_snapshot.present / data.employee_overview.total) * 100)
            : 0;

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
            <div className="space-y-6 animate-pulse">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    ))}
                </div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
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
        <div className="space-y-6">
            {/* ─── Greeting Banner ─── */}
            <div className="relative bg-gradient-to-r from-[#4361ee] via-[#6366f1] to-[#7c3aed] rounded-2xl p-6 md:p-8 text-white overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-1/3 -mb-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-white/70 mb-1">Hello, {formattedName}</p>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                            {greeting} <span className="text-3xl">{GreetingEmoji}</span>
                        </h1>
                        <p className="text-sm text-white/60 mt-1">{todayFormatted}</p>
                    </div>

                    {/* Top stat pills */}
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/admin/calendar"
                            className="flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 hover:bg-white/25 transition-colors"
                        >
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <IconCalendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Upcoming Holiday</p>
                                {nextHoliday ? (
                                    <p className="text-sm font-bold leading-tight">
                                        {formatDateShort(nextHoliday.date)}{' '}
                                        <span className="font-normal text-white/60 text-xs">{getDaysUntil(nextHoliday.date)}</span>
                                    </p>
                                ) : (
                                    <p className="text-xs text-white/50">None upcoming</p>
                                )}
                            </div>
                        </Link>

                        <Link
                            to="/admin/approved-leaves"
                            className="flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 hover:bg-white/25 transition-colors"
                        >
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <IconListCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Leaves Today</p>
                                <p className="text-sm font-bold leading-tight">
                                    {data.leaves_today} <span className="font-normal text-white/60 text-xs">employees</span>
                                </p>
                            </div>
                        </Link>

                        <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <IconBell className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Pending Requests</p>
                                <p className="text-sm font-bold leading-tight">{data.pending_leave_requests}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Attendance Strip ─── */}
            <div className="panel !p-0 overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-primary to-purple-600 rounded-xl shadow-md">
                            <IconClock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">Today's Attendance Overview</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{todayFormatted}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 md:gap-8">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-success">{data.attendance_snapshot.present}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Present</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-danger">{data.attendance_snapshot.absent}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Absent</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-warning">{data.attendance_snapshot.on_leave}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">On Leave</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-primary">{presentPercentage}%</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Rate</p>
                        </div>
                    </div>

                    <Link
                        to="/admin/attendance-details"
                        className="btn btn-primary btn-sm rounded-xl shadow-md flex items-center gap-1.5"
                    >
                        View Details
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* ─── Key Metrics ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* Total Employees */}
                <Link
                    to="/admin/employee-register"
                    className="panel p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300">
                            <IconUsersGroup className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                        </div>
                        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.employee_overview.total}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Total Employees</p>
                    <div className="mt-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                            {data.employee_overview.active} active
                        </span>
                    </div>
                </Link>

                {/* Departments */}
                <Link
                    to="/admin/branch-mgt/department"
                    className="panel p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-success"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-success/10 dark:bg-success/20 rounded-xl group-hover:bg-success group-hover:text-white transition-all duration-300">
                            <IconServer className="w-5 h-5 text-success group-hover:text-white transition-colors" />
                        </div>
                        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-success transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.department_count}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Departments</p>
                </Link>

                {/* New Joiners */}
                <Link
                    to="/admin/employee-register"
                    className="panel p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-info"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-info/10 dark:bg-info/20 rounded-xl group-hover:bg-info group-hover:text-white transition-all duration-300">
                            <IconUserPlus className="w-5 h-5 text-info group-hover:text-white transition-colors" />
                        </div>
                        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-info transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.employee_overview.new_joinees}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">New Joinees This Month</p>
                </Link>

                {/* Attendance Rate */}
                <Link
                    to="/admin/attendance-logs"
                    className="panel p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-secondary"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-secondary/10 dark:bg-secondary/20 rounded-xl group-hover:bg-secondary group-hover:text-white transition-all duration-300">
                            <IconTrendingUp className="w-5 h-5 text-secondary group-hover:text-white transition-colors" />
                        </div>
                        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-secondary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{presentPercentage}%</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Attendance Rate</p>
                    <div className="mt-2 w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out"
                            style={{ width: `${presentPercentage}%` }}
                        ></div>
                    </div>
                </Link>
            </div>

            {/* ─── Main Content Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Employee Overview */}
                <div className="panel p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-5 bg-gradient-to-b from-primary to-purple-500 rounded-full"></span>
                            Employee Overview
                        </h3>
                        <Link to="/admin/employee-register" className="text-xs text-primary hover:underline font-medium">
                            View all
                        </Link>
                    </div>

                    <div className="space-y-2.5">
                        {[
                            { label: 'Active Employees', value: data.employee_overview.active, color: 'text-success', bg: 'bg-success/10', dot: 'bg-success' },
                            { label: 'Inactive Employees', value: data.employee_overview.inactive, color: 'text-danger', bg: 'bg-danger/10', dot: 'bg-danger' },
                            { label: 'New Joiners (Month)', value: data.employee_overview.new_joinees, color: 'text-info', bg: 'bg-info/10', dot: 'bg-info' },
                            { label: 'Exits This Month', value: data.employee_overview.exits_this_month, color: 'text-warning', bg: 'bg-warning/10', dot: 'bg-warning' },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a2941] rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${item.dot}`}></span>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                                </div>
                                <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Today's Attendance – Donut Chart */}
                <div className="panel p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-5 bg-gradient-to-b from-success to-emerald-500 rounded-full"></span>
                            Today's Attendance
                        </h3>
                        <Link to="/admin/attendance-details" className="text-xs text-primary hover:underline font-medium">
                            Details
                        </Link>
                    </div>

                    {/* SVG Donut */}
                    <div className="flex items-center justify-center mb-5">
                        <div className="relative w-36 h-36">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-gray-700" />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="50"
                                    fill="none"
                                    stroke="#00ab55"
                                    strokeWidth="10"
                                    strokeDasharray={`${(presentPercentage / 100) * 314.16} 314.16`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="50"
                                    fill="none"
                                    stroke="#e7515a"
                                    strokeWidth="10"
                                    strokeDasharray={`${(absentPercentage / 100) * 314.16} 314.16`}
                                    strokeDashoffset={`${-(presentPercentage / 100) * 314.16}`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="50"
                                    fill="none"
                                    stroke="#e2a03f"
                                    strokeWidth="10"
                                    strokeDasharray={`${(leavePercentage / 100) * 314.16} 314.16`}
                                    strokeDashoffset={`${-((presentPercentage + absentPercentage) / 100) * 314.16}`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-bold text-gray-900 dark:text-white">{presentPercentage}%</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">Present</span>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-success/5 dark:bg-success/10 rounded-xl">
                            <div className="w-2 h-2 bg-success rounded-full mx-auto mb-1"></div>
                            <p className="text-lg font-bold text-success">{data.attendance_snapshot.present}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Present</p>
                        </div>
                        <div className="text-center p-2 bg-danger/5 dark:bg-danger/10 rounded-xl">
                            <div className="w-2 h-2 bg-danger rounded-full mx-auto mb-1"></div>
                            <p className="text-lg font-bold text-danger">{data.attendance_snapshot.absent}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Absent</p>
                        </div>
                        <div className="text-center p-2 bg-warning/5 dark:bg-warning/10 rounded-xl">
                            <div className="w-2 h-2 bg-warning rounded-full mx-auto mb-1"></div>
                            <p className="text-lg font-bold text-warning">{data.attendance_snapshot.on_leave}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leave</p>
                        </div>
                    </div>
                </div>

                {/* Payroll & Finance */}
                <div className="panel p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-5 bg-gradient-to-b from-warning to-orange-500 rounded-full"></span>
                            Payroll & Finance
                        </h3>
                        <Link to="/admin/payroll-batches" className="text-xs text-primary hover:underline font-medium">
                            Manage
                        </Link>
                    </div>

                    <div className="space-y-3">
                        <div className="p-3.5 bg-gray-50 dark:bg-[#1a2941] rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Payroll Status</span>
                                <span
                                    className={`badge ${
                                        data.payroll_status === 'completed' ? 'badge-outline-success' : 'badge-outline-warning'
                                    }`}
                                >
                                    {data.payroll_status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                                </span>
                            </div>
                        </div>

                        <div className="p-3.5 bg-gray-50 dark:bg-[#1a2941] rounded-xl">
                            <div className="flex items-center gap-2 mb-1.5">
                                <IconClock className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">Next Salary Release</span>
                            </div>
                            {data.next_salary_release_date ? (
                                <p className="text-base font-semibold text-gray-900 dark:text-white">
                                    {new Date(data.next_salary_release_date).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-400 dark:text-gray-500">Not scheduled</p>
                            )}
                        </div>

                        <div className="p-3.5 bg-gray-50 dark:bg-[#1a2941] rounded-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <IconListCheck className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Pending Leave Requests</span>
                                </div>
                                <span className="text-base font-bold text-primary">{data.pending_leave_requests}</span>
                            </div>
                        </div>

                        <div className="p-3.5 bg-gray-50 dark:bg-[#1a2941] rounded-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <IconUsersGroup className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600 dark:text-gray-300">On Leave Today</span>
                                </div>
                                <span className="text-base font-bold text-warning">{data.leaves_today}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Bottom Grid: Birthdays, Quick Actions, Events ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Upcoming Birthdays */}
                <div className="panel p-5">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                        <span className="w-1 h-5 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full"></span>
                        🎂 Upcoming Birthdays
                    </h3>

                    {data.upcoming_birthdays.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-4xl mb-2">🎉</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm">No upcoming birthdays</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[260px] overflow-y-auto ltr:pr-1 rtl:pl-1">
                            {data.upcoming_birthdays.map((birthday, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 rounded-xl border border-pink-100 dark:border-pink-800/30 hover:shadow-md transition-all"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {birthday.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{birthday.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(birthday.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <span className="text-lg flex-shrink-0">🎂</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="panel p-5">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                        <span className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></span>
                        Quick Actions
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Employees', icon: <IconMenuUsers className="w-5 h-5" />, to: '/admin/employee-register', color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/20', hoverBg: 'hover:bg-primary/20 dark:hover:bg-primary/30', border: 'border-primary/20' },
                            { label: 'Leaves', icon: <IconMenuCalendar className="w-5 h-5" />, to: '/admin/approved-leaves', color: 'text-success', bg: 'bg-success/10 dark:bg-success/20', hoverBg: 'hover:bg-success/20 dark:hover:bg-success/30', border: 'border-success/20' },
                            { label: 'Attendance', icon: <IconBarChart className="w-5 h-5" />, to: '/admin/attendance-logs', color: 'text-secondary', bg: 'bg-secondary/10 dark:bg-secondary/20', hoverBg: 'hover:bg-secondary/20 dark:hover:bg-secondary/30', border: 'border-secondary/20' },
                            { label: 'Payroll', icon: <IconMenuInvoice className="w-5 h-5" />, to: '/admin/payroll-batches', color: 'text-warning', bg: 'bg-warning/10 dark:bg-warning/20', hoverBg: 'hover:bg-warning/20 dark:hover:bg-warning/30', border: 'border-warning/20' },
                            { label: 'Departments', icon: <IconMenuContacts className="w-5 h-5" />, to: '/admin/branch-mgt/department', color: 'text-danger', bg: 'bg-danger/10 dark:bg-danger/20', hoverBg: 'hover:bg-danger/20 dark:hover:bg-danger/30', border: 'border-danger/20' },
                            { label: 'Settings', icon: <IconSettings className="w-5 h-5" />, to: '/admin/configuration/shift', color: 'text-info', bg: 'bg-info/10 dark:bg-info/20', hoverBg: 'hover:bg-info/20 dark:hover:bg-info/30', border: 'border-info/20' },
                        ].map((action) => (
                            <Link
                                key={action.label}
                                to={action.to}
                                className={`flex flex-col items-center gap-2 p-4 ${action.bg} rounded-xl border ${action.border} ${action.hoverBg} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group`}
                            >
                                <div className={`${action.color} group-hover:scale-110 transition-transform`}>{action.icon}</div>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{action.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Upcoming Events */}
                <div className="panel p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full"></span>
                            Upcoming Events
                        </h3>
                        <Link to="/admin/calendar" className="text-xs text-primary hover:underline font-medium">
                            View all
                        </Link>
                    </div>

                    {events.length === 0 ? (
                        <div className="text-center py-8">
                            <IconCalendar className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400 dark:text-gray-500 text-sm">No upcoming events</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[260px] overflow-y-auto ltr:pr-1 rtl:pl-1">
                            {events.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#1a2941] rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                                >
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            event.is_holiday
                                                ? 'bg-gradient-to-br from-warning to-orange-500'
                                                : 'bg-gradient-to-br from-primary to-purple-500'
                                        }`}
                                    >
                                        {event.is_holiday ? (
                                            <IconSun className="w-5 h-5 text-white" />
                                        ) : (
                                            <IconCalendar className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{event.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(event.date).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                            {event.is_holiday && (
                                                <span className="ml-1.5 text-warning font-medium">• Holiday</span>
                                            )}
                                        </p>
                                        {event.description && (
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                                                {event.description}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap mt-0.5">
                                        {getDaysUntil(event.date)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
