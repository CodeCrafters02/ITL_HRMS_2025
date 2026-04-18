import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconMenuAuthentication from '../../components/Icon/Menu/IconMenuAuthentication';
import IconServer from '../../components/Icon/IconServer';
import IconUser from '../../components/Icon/IconUser';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconSettings from '../../components/Icon/IconSettings';
import IconTrendingUp from '../../components/Icon/IconTrendingUp';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconBell from '../../components/Icon/IconBell';
import IconSun from '../../components/Icon/IconSun';
import IconMoon from '../../components/Icon/IconMoon';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

interface CompanyAdmin {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
}

interface CompanyData {
    id: number;
    name: string;
    address: string;
    location: string;
    email: string;
    phone_number: string;
    logo: string | null;
    admins: CompanyAdmin[];
}

interface DashboardStats {
    total_companies: number;
    total_admins: number;
    total_masters: number;
    total_employees: number;
    companies: CompanyData[];
}

const MasterDashboard = () => {
    const dispatch = useDispatch();
    const userName = localStorage.getItem('username') || 'Master';
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

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle('Master Dashboard'));
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/app/master-dashboard/`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalUsers = stats
        ? stats.total_admins + stats.total_masters + stats.total_employees
        : 0;

    // Skeleton loader
    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!stats) {
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
            <div className="relative bg-gradient-to-r from-[#0f766e] via-[#0d9488] to-[#2dd4bf] rounded-2xl p-6 md:p-8 text-white overflow-hidden">
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
                        <p className="text-sm text-white/50 mt-2 max-w-lg">
                            Your central control hub — manage companies, govern administrative access, and oversee the entire platform.
                        </p>
                    </div>

                    {/* Top stat pills */}
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <IconServer className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Companies</p>
                                <p className="text-sm font-bold leading-tight">{stats.total_companies}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <IconUsersGroup className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Total Users</p>
                                <p className="text-sm font-bold leading-tight">{totalUsers}</p>
                            </div>
                        </div>

                        <Link
                            to="/master/company"
                            className="flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 hover:bg-white/25 transition-colors"
                        >
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <IconMenuAuthentication className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Manage</p>
                                <p className="text-sm font-bold leading-tight">Companies →</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* ─── Platform Overview Strip ─── */}
            <div className="panel !p-0 overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-md">
                            <IconTrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">Platform Overview</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">All companies and users at a glance</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 md:gap-8">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-primary">{stats.total_companies}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Companies</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-success">{stats.total_admins}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Admins</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-secondary">{stats.total_masters}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Masters</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-warning">{stats.total_employees}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Employees</p>
                        </div>
                    </div>

                    <Link
                        to="/master/user-management"
                        className="btn btn-primary btn-sm rounded-xl shadow-md flex items-center gap-1.5"
                    >
                        Manage Users
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* ─── Key Metrics ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* Total Companies */}
                <Link
                    to="/master/company"
                    className="panel p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300">
                            <IconServer className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                        </div>
                        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_companies}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Total Companies</p>
                    <div className="mt-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            Active
                        </span>
                    </div>
                </Link>

                {/* Total Admins */}
                <Link
                    to="/master/user-management"
                    className="panel p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-secondary"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-secondary/10 dark:bg-secondary/20 rounded-xl group-hover:bg-secondary group-hover:text-white transition-all duration-300">
                            <IconListCheck className="w-5 h-5 text-secondary group-hover:text-white transition-colors" />
                        </div>
                        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-secondary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_admins}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Total Admins</p>
                </Link>

                {/* Total Masters */}
                <div className="panel p-5 group border-l-4 border-l-success">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-success/10 dark:bg-success/20 rounded-xl">
                            <IconUser className="w-5 h-5 text-success" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_masters}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Total Masters</p>
                </div>

                {/* Total Employees */}
                <div className="panel p-5 group border-l-4 border-l-warning">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-warning/10 dark:bg-warning/20 rounded-xl">
                            <IconUsersGroup className="w-5 h-5 text-warning" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_employees}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Total Employees</p>
                </div>
            </div>

            {/* ─── Main Content Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* User Distribution */}
                <div className="panel p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-5 bg-gradient-to-b from-primary to-purple-500 rounded-full"></span>
                            User Distribution
                        </h3>
                        <Link to="/master/user-management" className="text-xs text-primary hover:underline font-medium">
                            View all
                        </Link>
                    </div>

                    {/* SVG Donut */}
                    <div className="flex items-center justify-center mb-5">
                        <div className="relative w-36 h-36">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-gray-700" />
                                {totalUsers > 0 && (
                                    <>
                                        <circle
                                            cx="60" cy="60" r="50" fill="none"
                                            stroke="#e2a03f" strokeWidth="10"
                                            strokeDasharray={`${(stats.total_employees / totalUsers) * 314.16} 314.16`}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                        <circle
                                            cx="60" cy="60" r="50" fill="none"
                                            stroke="#4361ee" strokeWidth="10"
                                            strokeDasharray={`${(stats.total_admins / totalUsers) * 314.16} 314.16`}
                                            strokeDashoffset={`${-(stats.total_employees / totalUsers) * 314.16}`}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                        <circle
                                            cx="60" cy="60" r="50" fill="none"
                                            stroke="#00ab55" strokeWidth="10"
                                            strokeDasharray={`${(stats.total_masters / totalUsers) * 314.16} 314.16`}
                                            strokeDashoffset={`${-((stats.total_employees + stats.total_admins) / totalUsers) * 314.16}`}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </>
                                )}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-bold text-gray-900 dark:text-white">{totalUsers}</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">Total Users</span>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-warning/5 dark:bg-warning/10 rounded-xl">
                            <div className="w-2 h-2 bg-warning rounded-full mx-auto mb-1"></div>
                            <p className="text-lg font-bold text-warning">{stats.total_employees}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employees</p>
                        </div>
                        <div className="text-center p-2 bg-primary/5 dark:bg-primary/10 rounded-xl">
                            <div className="w-2 h-2 bg-primary rounded-full mx-auto mb-1"></div>
                            <p className="text-lg font-bold text-primary">{stats.total_admins}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admins</p>
                        </div>
                        <div className="text-center p-2 bg-success/5 dark:bg-success/10 rounded-xl">
                            <div className="w-2 h-2 bg-success rounded-full mx-auto mb-1"></div>
                            <p className="text-lg font-bold text-success">{stats.total_masters}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Masters</p>
                        </div>
                    </div>
                </div>

                {/* Companies List */}
                <div className="panel p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-5 bg-gradient-to-b from-teal-500 to-emerald-500 rounded-full"></span>
                            Registered Companies
                        </h3>
                        <Link to="/master/company" className="text-xs text-primary hover:underline font-medium">
                            View all
                        </Link>
                    </div>

                    {stats.companies.length === 0 ? (
                        <div className="text-center py-10">
                            <IconServer className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400 dark:text-gray-500 text-sm">No companies registered yet</p>
                            <Link
                                to="/master/company"
                                className="btn btn-primary btn-sm mt-4 rounded-xl"
                            >
                                Add Company
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[340px] overflow-y-auto ltr:pr-1 rtl:pl-1">
                            {stats.companies.map((company) => (
                                <div
                                    key={company.id}
                                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#1a2941] rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                                >
                                    {/* Company Logo or Initial */}
                                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                                        {company.logo ? (
                                            <img
                                                src={company.logo}
                                                alt={company.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-white font-bold text-lg">
                                                {company.name.charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-primary transition-colors">
                                            {company.name}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            {company.location && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    📍 {company.location}
                                                </p>
                                            )}
                                            {company.email && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                                                    ✉️ {company.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Admin count badge */}
                                    <div className="flex-shrink-0 text-center">
                                        <div className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                                            <IconUser className="w-3 h-3" />
                                            {company.admins.length} admin{company.admins.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Bottom Grid: Role Breakdown, Quick Actions ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Role Breakdown */}
                <div className="panel p-5">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                        <span className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full"></span>
                        Role Breakdown
                    </h3>

                    <div className="space-y-2.5">
                        {[
                            { label: 'Master Users', value: stats.total_masters, color: 'text-success', bg: 'bg-success/10', dot: 'bg-success', percent: totalUsers > 0 ? Math.round((stats.total_masters / totalUsers) * 100) : 0 },
                            { label: 'Admin Users', value: stats.total_admins, color: 'text-primary', bg: 'bg-primary/10', dot: 'bg-primary', percent: totalUsers > 0 ? Math.round((stats.total_admins / totalUsers) * 100) : 0 },
                            { label: 'Employee Users', value: stats.total_employees, color: 'text-warning', bg: 'bg-warning/10', dot: 'bg-warning', percent: totalUsers > 0 ? Math.round((stats.total_employees / totalUsers) * 100) : 0 },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="p-3 bg-gray-50 dark:bg-[#1a2941] rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${item.dot}`}></span>
                                        <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                                        <span className="text-xs text-gray-400">({item.percent}%)</span>
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${item.dot} transition-all duration-1000 ease-out`}
                                        style={{ width: `${item.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}

                        <div className="mt-3 p-3 bg-gray-50 dark:bg-[#1a2941] rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total Users</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">{totalUsers}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="panel p-5">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                        <span className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></span>
                        Quick Actions
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            to="/master/company"
                            className="flex flex-col items-center gap-2 p-4 bg-primary/10 dark:bg-primary/20 rounded-xl border border-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group"
                        >
                            <div className="text-primary group-hover:scale-110 transition-transform">
                                <IconMenuAuthentication className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Companies</span>
                        </Link>

                        <Link
                            to="/master/user-management"
                            className="flex flex-col items-center gap-2 p-4 bg-success/10 dark:bg-success/20 rounded-xl border border-success/20 hover:bg-success/20 dark:hover:bg-success/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group"
                        >
                            <div className="text-success group-hover:scale-110 transition-transform">
                                <IconUsersGroup className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Users</span>
                        </Link>

                        <Link
                            to="/master/administration"
                            className="flex flex-col items-center gap-2 p-4 bg-secondary/10 dark:bg-secondary/20 rounded-xl border border-secondary/20 hover:bg-secondary/20 dark:hover:bg-secondary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group"
                        >
                            <div className="text-secondary group-hover:scale-110 transition-transform">
                                <IconSettings className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Administration</span>
                        </Link>

                        <Link
                            to="/master/dashboard"
                            className="flex flex-col items-center gap-2 p-4 bg-warning/10 dark:bg-warning/20 rounded-xl border border-warning/20 hover:bg-warning/20 dark:hover:bg-warning/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group"
                        >
                            <div className="text-warning group-hover:scale-110 transition-transform">
                                <IconTrendingUp className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Reports</span>
                        </Link>
                    </div>
                </div>

                {/* Company Admin Summary */}
                <div className="panel p-5">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                        <span className="w-1 h-5 bg-gradient-to-b from-rose-500 to-pink-500 rounded-full"></span>
                        Company Admin Summary
                    </h3>

                    {stats.companies.length === 0 ? (
                        <div className="text-center py-8">
                            <IconUser className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400 dark:text-gray-500 text-sm">No company admins yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[260px] overflow-y-auto ltr:pr-1 rtl:pl-1">
                            {stats.companies.map((company) => (
                                <div
                                    key={company.id}
                                    className="p-3 bg-gray-50 dark:bg-[#1a2941] rounded-xl"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                            {company.name}
                                        </p>
                                        <span className="text-xs text-gray-400">
                                            {company.admins.length} admin{company.admins.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    {company.admins.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {company.admins.slice(0, 3).map((admin) => (
                                                <span
                                                    key={admin.id}
                                                    className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                    {admin.first_name || admin.username}
                                                </span>
                                            ))}
                                            {company.admins.length > 3 && (
                                                <span className="text-[11px] text-gray-400 px-1">
                                                    +{company.admins.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400">No admins assigned</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MasterDashboard;
