import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

import IconClock from '../../components/Icon/IconClock';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconMenuChat from '../../components/Icon/Menu/IconMenuChat';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconTrendingUp from '../../components/Icon/IconTrendingUp';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

interface DashboardData {
    today: string;
    checkin_time: string | null;
    checkout_time: string | null;
    shift: any;
    is_late: boolean;
    today_work_duration: string | null;
    weekly_hours: number;
    total_work_duration_week: string;
    active_break: {
        type: string | null;
        break_choice: string | null;
        break_config_id: number | null;
        start_time: string;
    } | null;
    recent_breaks: any[] | null;
    overtime: { hours: number; minutes: number; total: number } | null;
    latest_payroll: { amount: number; date: string } | null;
    total_break_minutes: number;
    server_time: string;
    birthday_message: string | null;
}

interface BreakConfig {
    id: number;
    break_choice: string;
    get_break_choice_display?: string;
    duration_minutes: number;
}

const EmployeeDashboard = () => {
    const dispatch = useDispatch();
    const [data, setData] = useState<DashboardData | null>(null);
    const [breakConfigs, setBreakConfigs] = useState<BreakConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [liveTime, setLiveTime] = useState('0h 0m');
    const [liveRawSeconds, setLiveRawSeconds] = useState('--:--:--');

    const first = (localStorage.getItem('first_name') || '').trim();
    const last = (localStorage.getItem('last_name') || '').trim();
    const fallback = localStorage.getItem('username') || 'Employee';
    const display = `${first} ${last}`.trim() || fallback;
    const formattedName = display.charAt(0).toUpperCase() + display.slice(1);

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

    const authHeaders = useMemo(() => ({
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
    }), []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Fetch Dashboard Data
            const dashRes = await fetch(`${API_BASE_URL}/employee/dashboard/`, { headers: authHeaders });
            if (dashRes.ok) {
                const dashJson = await dashRes.json();
                setData(dashJson.dashboard_data);
            }

            // Fetch available break configs
            const breakRes = await fetch(`${API_BASE_URL}/employee/employee-breaks/`, { headers: authHeaders });
            if (breakRes.ok) {
                const breakJson = await breakRes.json();
                // Extract break configs if wrapped, or use directly if it's an array
                setBreakConfigs(Array.isArray(breakJson) ? breakJson : breakJson.results || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        dispatch(setPageTitle('Employee Dashboard'));
        fetchAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    useEffect(() => {
        let interval: any = null;
        if (data?.checkin_time && !data.checkout_time) {
            interval = setInterval(() => {
                const [h, m, s] = data.checkin_time!.split(':').map(Number);
                const checkInDate = new Date();
                checkInDate.setHours(h, m, s, 0);

                const now = new Date();
                const diffInMs = now.getTime() - checkInDate.getTime();
                
                if (diffInMs > 0) {
                    const totalSecs = Math.floor(diffInMs / 1000);
                    
                    // Live Total Checked-in duration (Raw)
                    const hh = Math.floor(totalSecs / 3600);
                    const mm = Math.floor((totalSecs % 3600) / 60);
                    const ss = totalSecs % 60;
                    setLiveRawSeconds(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`);

                    // Live Effective Work duration (subtract breaks if NOT on active break)
                    // If on active break, the effective time should stop ticking.
                    if (!data.active_break) {
                        const effectiveSecs = Math.max(0, totalSecs - (data.total_break_minutes * 60));
                        const effH = Math.floor(effectiveSecs / 3600);
                        const effM = Math.floor((effectiveSecs % 3600) / 60);
                        setLiveTime(`${effH}h ${effM}m`);
                    } else {
                        // Keep the value from the last data refresh (today_work_duration)
                        setLiveTime(data.today_work_duration || '0h 0m');
                    }
                }
            }, 1000);
        } else {
            setLiveTime(data?.today_work_duration || '0h 0m');
            setLiveRawSeconds('--:--:--');
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [data]);

    const handleCheckIn = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/employee/checkin/`, {
                method: 'POST',
                headers: authHeaders,
            });
            const result = await res.json();
            if (res.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Successfully Checked In!', showConfirmButton: false, timer: 3000 });
                fetchAllData();
            } else {
                Swal.fire('Error', result.detail || 'Could not check in', 'error');
            }
        } catch (e: any) {
            Swal.fire('Error', e.message || 'Could not check in', 'error');
        }
    };

    const handleCheckOut = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/employee/checkout/`, {
                method: 'POST',
                headers: authHeaders,
            });
            const result = await res.json();
            if (res.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Successfully Checked Out!', showConfirmButton: false, timer: 3000 });
                fetchAllData();
            } else {
                Swal.fire('Error', result.detail || 'Could not check out', 'error');
            }
        } catch (e: any) {
            Swal.fire('Error', e.message || 'Could not check out', 'error');
        }
    };

    const handleStartBreak = async (configId: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/employee/employee-breaks/`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ break_config_id: configId, action: 'start' }),
            });
            const result = await res.json();
            if (res.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Break Started', showConfirmButton: false, timer: 3000 });
                fetchAllData();
            } else {
                Swal.fire('Error', result.detail || 'Could not start break', 'error');
            }
        } catch (e: any) {
            Swal.fire('Error', e.message || 'Could not start break', 'error');
        }
    };

    const handleEndBreak = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/employee/employee-breaks/`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ action: 'end' }),
            });
            const result = await res.json();
            if (res.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Break Ended', showConfirmButton: false, timer: 3000 });
                fetchAllData();
            } else {
                Swal.fire('Error', result.detail || 'Could not end break', 'error');
            }
        } catch (e: any) {
            Swal.fire('Error', e.message || 'Could not end break', 'error');
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="panel p-10 text-center">
                <p className="text-danger text-lg font-semibold">Failed to load dashboard data</p>
            </div>
        );
    }

    const { checkin_time, checkout_time, active_break } = data;

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            {/* ─── Greeting Banner ─── */}
            <div className="relative bg-gradient-to-r from-[#4361ee] via-[#6366f1] to-[#7c3aed] rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-1/3 -mb-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <p className="text-sm text-white/80 mb-1 font-medium tracking-wide">Hello, {formattedName}</p>
                        <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 drop-shadow-sm">
                            {greeting} <span className="text-4xl">{GreetingEmoji}</span>
                        </h1>
                        <p className="text-sm text-white/80 mt-2 font-medium">{todayFormatted}</p>
                        {data.birthday_message && (
                            <p className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-sm font-bold shadow-sm animate-bounce">
                                🎂 {data.birthday_message}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Web Clock / Actions Strip ─── */}
            <div className="panel !p-0 overflow-hidden shadow-sm border-0 border-l-4 border-l-primary">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-primary to-purple-600 rounded-2xl shadow-md text-white">
                            <IconClock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-gray-900 dark:text-white">Web Clock &amp; Breaks</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your daily attendance</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:gap-6 flex-1 justify-end">
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-gray-50 dark:bg-[#1a2941] rounded-xl border border-gray-100 dark:border-gray-800 text-center min-w-[110px]">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Check In</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{checkin_time ? checkin_time : '--:--'}</p>
                            </div>
                            <div className="px-4 py-2 bg-gray-50 dark:bg-[#1a2941] rounded-xl border border-gray-100 dark:border-gray-800 text-center min-w-[110px]">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Check Out</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{checkout_time ? checkout_time : '--:--'}</p>
                            </div>
                            <div className="px-4 py-2 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 text-center min-w-[110px]">
                                <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Live Duration</p>
                                <p className="text-sm font-black text-primary animate-pulse">{liveRawSeconds}</p>
                            </div>
                        </div>

                        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 hidden lg:block"></div>

                        <div className="flex items-center gap-2">
                            {/* Punch In / Out Logic */}
                            {!checkin_time && (
                                <button className="btn btn-primary shadow-md px-5 rounded-xl font-bold" onClick={handleCheckIn}>
                                    Check In
                                </button>
                            )}

                            {checkin_time && !checkout_time && (
                                <button className="btn btn-danger shadow-md px-5 rounded-xl font-bold" onClick={handleCheckOut}>
                                    Check Out
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── Dedicated Breaks Row ─── */}
                {checkin_time && !checkout_time && (breakConfigs.length > 0 || active_break) && (
                    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-black/5 p-4 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 mr-2">
                            <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Available Breaks:</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                            {!active_break ? (
                                breakConfigs.map((bc) => (
                                    <button
                                        key={bc.id}
                                        className="btn btn-outline-warning shadow-sm font-bold rounded-xl px-4 py-1.5 text-xs bg-white dark:bg-[#0e1726]"
                                        style={{ textTransform: 'capitalize' }}
                                        onClick={() => handleStartBreak(bc.id)}
                                    >
                                        Start {bc.break_choice.replace(/_/g, ' ')}
                                    </button>
                                ))
                            ) : (
                                <button className="btn btn-warning shadow-md rounded-xl font-bold animate-pulse px-6 py-2 text-xs" onClick={handleEndBreak}>
                                    End Active Break ({active_break.type?.replace(/_/g, ' ') || 'Break'})
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Key Metrics ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* Hours Today */}
                <div className="panel p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-b-4 border-b-info">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-info/10 dark:bg-info/20 rounded-xl">
                            <IconClock className="w-5 h-5 text-info" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {liveTime}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Effective Hours Today</p>
                </div>

                {/* Weekly Hours */}
                <div className="panel p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-b-4 border-b-success">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-success/10 dark:bg-success/20 rounded-xl">
                            <IconTrendingUp className="w-5 h-5 text-success" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data.total_work_duration_week}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Weekly Hours Accrued</p>
                </div>

                {/* Overtime */}
                <div className="panel p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-b-4 border-b-warning">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-warning/10 dark:bg-warning/20 rounded-xl">
                            <IconListCheck className="w-5 h-5 text-warning" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data.overtime ? `${data.overtime.hours}h ${data.overtime.minutes}m` : '0h 0m'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Accrued Overtime</p>
                </div>

                {/* Latest Payroll */}
                <div className="panel p-5 group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-b-4 border-b-secondary">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-secondary/10 dark:bg-secondary/20 rounded-xl">
                            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data.latest_payroll ? `$ ${data.latest_payroll.amount.toLocaleString()}` : 'Pending'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Latest Payroll</p>
                </div>
            </div>

            {/* ─── Main Content Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Break Timeline / Summary */}
                <div className="panel p-6 shadow-sm border-0">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-gradient-to-b from-warning to-orange-500 rounded-full"></span>
                        Break History (Today)
                    </h3>
                    
                    {data.recent_breaks == null || data.recent_breaks.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 dark:bg-[#1a2941] rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <IconClock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">No completed breaks yet today.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.recent_breaks.map((b, i) => (
                                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-[#1a2941] rounded-2xl hover:bg-warning/5 transition-colors border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warning to-orange-400 flex items-center justify-center shadow-sm flex-shrink-0">
                                            <IconClock className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-base">
                                                {b.type || b.break_choice}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">
                                                Ended successfully
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-gray-700 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 sm:mb-1 bg-white dark:bg-[#0e1726] px-2 py-0.5 rounded-md shadow-sm border border-gray-100 dark:border-gray-800">
                                            {b.start_time} - {b.end_time}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Shortcuts */}
                <div className="panel p-6 shadow-sm border-0">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-gradient-to-b from-primary to-indigo-500 rounded-full"></span>
                        Quick Navigations
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link
                            to="/employee/chat"
                            className="group p-5 bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] dark:from-[#1b2e4b] dark:to-[#1a2941] rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-[#0e1726] rounded-xl shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <IconMenuChat className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-base">Chat System</h4>
                                    <p className="text-xs text-gray-500 mt-1">Message your team</p>
                                </div>
                            </div>
                        </Link>

                        <Link
                            to="/employee/calendar"
                            className="group p-5 bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] dark:from-[#1b2e4b] dark:to-[#1a2941] rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-[#0e1726] rounded-xl shadow-sm flex items-center justify-center text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-colors duration-300">
                                    <IconCalendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-base">Calendar</h4>
                                    <p className="text-xs text-gray-500 mt-1">View holidays & events</p>
                                </div>
                            </div>
                        </Link>
                        
                        <Link
                            to="/employee/asset-requests"
                            className="group p-5 bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] dark:from-[#1b2e4b] dark:to-[#1a2941] rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] sm:col-span-2"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-[#0e1726] rounded-xl shadow-sm flex items-center justify-center text-success group-hover:bg-success group-hover:text-white transition-colors duration-300">
                                    <IconListCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-base">Asset Requests</h4>
                                    <p className="text-xs text-gray-500 mt-1">Request supplies or report core asset damages directly from the IT catalog.</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
