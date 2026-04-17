import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconMenuChat from '../../components/Icon/Menu/IconMenuChat';

const EmployeeDashboard = () => {
    const dispatch = useDispatch();
    const first = (localStorage.getItem('first_name') || '').trim();
    const last = (localStorage.getItem('last_name') || '').trim();
    const fallback = localStorage.getItem('username') || 'Employee';
    const display = `${first} ${last}`.trim() || fallback;
    const formattedName = display.charAt(0).toUpperCase() + display.slice(1);

    useEffect(() => {
        dispatch(setPageTitle('Employee Dashboard'));
    }, [dispatch]);

    return (
        <div className="space-y-8 animate__animated animate__fadeIn">
            <div className="bg-gradient-to-r from-[#0e1726] to-[#1b2e4b] p-8 rounded-2xl shadow-2xl relative overflow-hidden text-white">
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                        Welcome, <span className="text-emerald-400">{formattedName}</span>
                    </h1>
                    <p className="text-lg text-white/80 max-w-2xl">
                        This is your employee dashboard. Use chat to connect with your team in real time.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-black dark:text-white mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link
                        to="/employee/chat"
                        className="group rounded-2xl p-6 bg-white dark:bg-[#1b2e4b] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden border border-gray-100 dark:border-[#191e3a]"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2563eb] to-[#7c3aed]"></div>
                        <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 w-14 h-14 bg-blue-50 dark:bg-[#0e1726] rounded-full flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                                <IconMenuChat className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-500 transition-colors">Chat</h3>
                                <p className="text-gray-500 text-sm mt-1">Message employees/admins in your company</p>
                            </div>
                        </div>
                    </Link>

                    <div className="rounded-2xl p-6 bg-white dark:bg-[#1b2e4b] border border-gray-100 dark:border-[#191e3a]">
                        <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 w-14 h-14 bg-emerald-50 dark:bg-[#0e1726] rounded-full flex items-center justify-center text-emerald-500">
                                <IconUsersGroup className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">More modules</h3>
                                <p className="text-gray-500 text-sm mt-1">We can add more employee modules here next.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;

