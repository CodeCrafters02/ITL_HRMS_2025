import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconServer from '../../components/Icon/IconServer';
import IconUser from '../../components/Icon/IconUser';
import IconMenuCalendar from '../../components/Icon/Menu/IconMenuCalendar';
import IconMenuUsers from '../../components/Icon/Menu/IconMenuUsers';
import IconMenuContacts from '../../components/Icon/Menu/IconMenuContacts';
import IconMenuInvoice from '../../components/Icon/Menu/IconMenuInvoice';
import IconMenuDashboard from '../../components/Icon/Menu/IconMenuDashboard';
import IconSettings from '../../components/Icon/IconSettings';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconTrendingUp from '../../components/Icon/IconTrendingUp';

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
    };
    pending_leave_requests: number;
    payroll_status: string;
    next_salary_release_date: string | null;
}

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const userName = localStorage.getItem('username') || 'Admin';
    const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);

    const activeHour = new Date().getHours();
    let greeting = 'Good Evening';
    if (activeHour < 12) greeting = 'Good Morning';
    else if (activeHour < 18) greeting = 'Good Afternoon';

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle('Admin Dashboard'));
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/app/admin-dashboard/`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (response.ok) {
                const result = await response.json();
                setData(result);
            }
        } catch (error) {
            console.error('Error fetching admin dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const presentPercentage = data && data.employee_overview.total > 0
        ? Math.round((data.attendance_snapshot.present / data.employee_overview.total) * 100)
        : 0;

    return (
        <div className="space-y-8 animate__animated animate__fadeIn">
            {/* Greeting Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] via-[#1b2e4b] to-[#2b4c7e] p-8 rounded-2xl shadow-2xl relative overflow-hidden text-white">
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                        {greeting}, <span className="text-cyan-400">{formattedName}</span>!
                    </h1>
                    <p className="text-lg text-white/70 max-w-2xl">
                        Here's what's happening with your organization today. Stay on top of every detail.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-32 -mb-10 w-32 h-32 bg-cyan-500 opacity-20 rounded-full blur-3xl"></div>
            </div>

            {/* Summary Stat Cards */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="panel p-5 animate-pulse">
                            <div className="flex items-center">
                                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                                <div className="ltr:ml-4 rtl:mr-4 space-y-2">
                                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : data ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        <Link to="/admin/employee-register" className="panel bg-white dark:bg-[#1b2e4b] border-none shadow-md rounded-xl p-5 flex items-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                                <IconUsersGroup className="w-6 h-6" />
                            </div>
                            <div className="ltr:ml-4 rtl:mr-4">
                                <h4 className="text-[#515365] dark:text-white-dark text-sm font-semibold">Total Employees</h4>
                                <p className="text-2xl font-bold text-black dark:text-white-light">{data.employee_overview.total}</p>
                                <p className="text-xs text-success font-medium">{data.employee_overview.active} active</p>
                            </div>
                        </Link>

                        <Link to="/admin/branch-mgt/department" className="panel bg-white dark:bg-[#1b2e4b] border-none shadow-md rounded-xl p-5 flex items-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                                <IconServer className="w-6 h-6" />
                            </div>
                            <div className="ltr:ml-4 rtl:mr-4">
                                <h4 className="text-[#515365] dark:text-white-dark text-sm font-semibold">Departments</h4>
                                <p className="text-2xl font-bold text-black dark:text-white-light">{data.department_count}</p>
                            </div>
                        </Link>

                        <Link to="/admin/approved-leaves" className="panel bg-white dark:bg-[#1b2e4b] border-none shadow-md rounded-xl p-5 flex items-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                            <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                                <IconMenuCalendar className="w-6 h-6" />
                            </div>
                            <div className="ltr:ml-4 rtl:mr-4">
                                <h4 className="text-[#515365] dark:text-white-dark text-sm font-semibold">On Leave Today</h4>
                                <p className="text-2xl font-bold text-black dark:text-white-light">{data.leaves_today}</p>
                                <p className="text-xs text-warning font-medium">{data.pending_leave_requests} pending</p>
                            </div>
                        </Link>

                        <div className="panel bg-white dark:bg-[#1b2e4b] border-none shadow-md rounded-xl p-5 flex items-center">
                            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <IconTrendingUp className="w-6 h-6" />
                            </div>
                            <div className="ltr:ml-4 rtl:mr-4">
                                <h4 className="text-[#515365] dark:text-white-dark text-sm font-semibold">Attendance Rate</h4>
                                <p className="text-2xl font-bold text-black dark:text-white-light">{presentPercentage}%</p>
                                <p className="text-xs text-success font-medium">{data.attendance_snapshot.present} present today</p>
                            </div>
                        </div>
                    </div>

                    {/* Detail Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Employee Overview */}
                        <div className="panel p-5">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></span>
                                Employee Overview
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#1b2e4b]">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-success"></span> Active Employees
                                    </span>
                                    <span className="font-bold text-success">{data.employee_overview.active}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#1b2e4b]">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-danger"></span> Inactive Employees
                                    </span>
                                    <span className="font-bold text-danger">{data.employee_overview.inactive}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#1b2e4b]">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-info"></span> New Joiners (This Month)
                                    </span>
                                    <span className="font-bold text-info">{data.employee_overview.new_joinees}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-warning"></span> Exits (This Month)
                                    </span>
                                    <span className="font-bold text-warning">{data.employee_overview.exits_this_month}</span>
                                </div>
                            </div>
                        </div>

                        {/* Today's Attendance */}
                        <div className="panel p-5">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></span>
                                Today's Attendance
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#1b2e4b]">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Present</span>
                                    <span className="font-bold text-success">{data.attendance_snapshot.present}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#1b2e4b]">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Absent</span>
                                    <span className="font-bold text-danger">{data.attendance_snapshot.absent}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#1b2e4b]">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">On Leave</span>
                                    <span className="font-bold text-warning">{data.attendance_snapshot.on_leave}</span>
                                </div>
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        <span className="font-semibold">Attendance Overview</span>
                                        <span className="font-bold text-success">{presentPercentage}% Present</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-1000"
                                            style={{ width: `${presentPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payroll & Finance */}
                        <div className="panel p-5">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></span>
                                Payroll & Finance
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Payroll Status</span>
                                    <span className={`badge ${data.payroll_status === 'completed' ? 'badge-outline-success' : 'badge-outline-warning'}`}>
                                        {data.payroll_status.charAt(0).toUpperCase() + data.payroll_status.slice(1)}
                                    </span>
                                </div>
                                <div className="border-t border-gray-100 dark:border-[#1b2e4b] pt-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Next Salary Release</p>
                                    {data.next_salary_release_date ? (
                                        <p className="text-lg font-semibold text-black dark:text-white">
                                            {new Date(data.next_salary_release_date).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    ) : (
                                        <p className="text-gray-400">No upcoming release</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Birthdays + Quick Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Upcoming Birthdays */}
                        <div className="panel p-5">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full"></span>
                                🎂 Upcoming Birthdays
                            </h3>
                            {data.upcoming_birthdays.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <p className="text-4xl mb-2">🎉</p>
                                    <p>No upcoming birthdays</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {data.upcoming_birthdays.map((birthday, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-3 bg-pink-50 dark:bg-pink-900/10 rounded-xl border border-pink-200 dark:border-pink-800/50">
                                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                {birthday.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-white">{birthday.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(birthday.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="panel p-5">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></span>
                                Quick Actions
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Link to="/admin/employee-register" className="flex flex-col items-center p-5 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/50 hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
                                    <IconMenuUsers className="w-7 h-7 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Manage Employees</span>
                                </Link>
                                <Link to="/admin/approved-leaves" className="flex flex-col items-center p-5 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800/50 hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
                                    <IconMenuCalendar className="w-7 h-7 text-green-600 dark:text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-semibold text-green-800 dark:text-green-300">Leave Requests</span>
                                </Link>
                                <Link to="/admin/branch-mgt/department" className="flex flex-col items-center p-5 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800/50 hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
                                    <IconMenuContacts className="w-7 h-7 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">Departments</span>
                                </Link>
                                <Link to="/admin/payroll-batches" className="flex flex-col items-center p-5 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/50 hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
                                    <IconMenuInvoice className="w-7 h-7 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Payroll</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="panel p-10 text-center">
                    <p className="text-danger text-lg font-semibold">Failed to load dashboard</p>
                    <p className="text-gray-500 mt-2">Please try refreshing the page.</p>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
