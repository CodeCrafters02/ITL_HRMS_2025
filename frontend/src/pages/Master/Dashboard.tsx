import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconMenuAuthentication from '../../components/Icon/Menu/IconMenuAuthentication';
import IconServer from '../../components/Icon/IconServer';
import IconUser from '../../components/Icon/IconUser';
import IconListCheck from '../../components/Icon/IconListCheck';

const MasterDashboard = () => {
    const dispatch = useDispatch();
    const userRole = localStorage.getItem('user_role') || 'User';
    const userName = localStorage.getItem('username') || userRole;
    // Format name correctly (vivek -> Vivek)
    const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);

    const activeHour = new Date().getHours();
    let greeting = 'Good Evening';
    if (activeHour < 12) greeting = 'Good Morning';
    else if (activeHour < 18) greeting = 'Good Afternoon';

    const [stats, setStats] = useState({
        total_companies: 0,
        total_admins: 0,
        total_masters: 0,
        total_employees: 0,
    });

    useEffect(() => {
        dispatch(setPageTitle('Master Dashboard'));
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${API_BASE_URL}/app/master-dashboard/`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setStats({
                    total_companies: data.total_companies || 0,
                    total_admins: data.total_admins || 0,
                    total_masters: data.total_masters || 0,
                    total_employees: data.total_employees || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    return (
        <div className="space-y-8 animate__animated animate__fadeIn">
            {/* Greeting Banner */}
            <div className="bg-gradient-to-r from-[#1b2e4b] to-[#2b4c7e] p-8 rounded-2xl shadow-2xl relative overflow-hidden text-white">
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                        {greeting}, <span className="text-emerald-400">{formattedName}</span>!
                    </h1>
                    <p className="text-lg text-white/80 max-w-2xl">
                        Welcome to your central control hub. Manage companies, govern administrative access, and oversee the entire unified platform.
                    </p>
                </div>
                {/* Decorative shape */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)]"></div>
                <div className="absolute bottom-0 right-32 -mb-10 w-32 h-32 bg-blue-500 opacity-20 rounded-full blur-3xl"></div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="panel bg-white dark:bg-[#1b2e4b] border-none shadow-md rounded-xl p-5 flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-0">
                        <IconServer className="w-6 h-6" />
                    </div>
                    <div className="ltr:ml-4 rtl:mr-4">
                        <h4 className="text-[#515365] dark:text-white-dark text-sm font-semibold">Total Companies</h4>
                        <p className="text-2xl font-bold text-black dark:text-white-light">{stats.total_companies}</p>
                    </div>
                </div>

                <div className="panel bg-white dark:bg-[#1b2e4b] border-none shadow-md rounded-xl p-5 flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-0">
                        <IconListCheck className="w-6 h-6" />
                    </div>
                    <div className="ltr:ml-4 rtl:mr-4">
                        <h4 className="text-[#515365] dark:text-white-dark text-sm font-semibold">Total Admins</h4>
                        <p className="text-2xl font-bold text-black dark:text-white-light">{stats.total_admins}</p>
                    </div>
                </div>

                <div className="panel bg-white dark:bg-[#1b2e4b] border-none shadow-md rounded-xl p-5 flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-0">
                        <IconUser className="w-6 h-6" />
                    </div>
                    <div className="ltr:ml-4 rtl:mr-4">
                        <h4 className="text-[#515365] dark:text-white-dark text-sm font-semibold">Total Masters</h4>
                        <p className="text-2xl font-bold text-black dark:text-white-light">{stats.total_masters}</p>
                    </div>
                </div>

                <div className="panel bg-white dark:bg-[#1b2e4b] border-none shadow-md rounded-xl p-5 flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-0">
                        <IconUsersGroup className="w-6 h-6" />
                    </div>
                    <div className="ltr:ml-4 rtl:mr-4">
                        <h4 className="text-[#515365] dark:text-white-dark text-sm font-semibold">Total Employees</h4>
                        <p className="text-2xl font-bold text-black dark:text-white-light">{stats.total_employees}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Cards */}
            <div>
                <h2 className="text-2xl font-bold text-black dark:text-white mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Company Card */}
                    <Link to="/master/company" className="group rounded-2xl p-6 bg-white dark:bg-[#1b2e4b] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden border border-gray-100 dark:border-[#191e3a]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]"></div>
                        <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 w-14 h-14 bg-blue-50 dark:bg-[#0e1726] rounded-full flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                                <IconMenuAuthentication className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-500 transition-colors">Company Management</h3>
                                <p className="text-gray-500 text-sm mt-1">Manage global enterprise clients</p>
                            </div>
                        </div>
                    </Link>

                    {/* User Management Card */}
                    <Link to="/master/user-management" className="group rounded-2xl p-6 bg-white dark:bg-[#1b2e4b] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden border border-gray-100 dark:border-[#191e3a]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#064e3b] to-[#10b981]"></div>
                        <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 w-14 h-14 bg-emerald-50 dark:bg-[#0e1726] rounded-full flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                                <IconUsersGroup className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-500 transition-colors">User Management</h3>
                                <p className="text-gray-500 text-sm mt-1">Directly manage user directories</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default MasterDashboard;
