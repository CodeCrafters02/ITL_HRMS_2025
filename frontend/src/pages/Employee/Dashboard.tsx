import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import ReactApexChart from 'react-apexcharts';
import confetti from 'canvas-confetti';
import { IRootState } from '../../store';

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

    // Chart State
    const [chartRange, setChartRange] = useState('week');
    const [chartData, setChartData] = useState<{ 
        series: number[]; 
        labels: string[]; 
        holidays: boolean[]; 
        period_label?: string; 
        range?: string; 
        offset?: number 
    } | null>(null);
    const [chartLoading, setChartLoading] = useState(false);

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const [navOffset, setNavOffset] = useState(0);

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
        if (data?.birthday_message) {
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
        }
    }, [data?.birthday_message]);

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

    const fetchChartData = async (range: string, background = false, offset = 0) => {
        if (!background) setChartLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/employee/attendance-chart/?range=${range}&offset=${offset}`, {
                headers: authHeaders,
            });
            const d = await res.json();
            if (res.ok) {
                setChartData(d);
            }
        } catch (error) {
            console.error('Error fetching chart data:', error);
        } finally {
            if (!background) setChartLoading(false);
        }
    };

    useEffect(() => {
        fetchChartData(chartRange, false, navOffset);
        
        // Refresh chart every minute if active/current period
        const interval = setInterval(() => {
            if (data?.checkin_time && !data.checkout_time && navOffset === 0) {
                fetchChartData(chartRange, true, 0);
            }
        }, 60000); // 1 minute

        return () => clearInterval(interval);
    }, [chartRange, navOffset, data?.checkin_time, data?.checkout_time]);

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

            {/* ─── Trend Analytics & Timeline ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Working Hours Trend */}
                <div className="panel lg:col-span-2 shadow-lg border-0 bg-white dark:bg-[#0e1726]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                                <button
                                    className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={() => setNavOffset((prev) => prev + 1)}
                                    title="Previous Period"
                                >
                                    <svg className="w-5 h-5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                                <button
                                    className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={() => setNavOffset((prev) => Math.max(0, prev - 1))}
                                    disabled={navOffset === 0}
                                    title="Next Period"
                                >
                                    <svg className="w-5 h-5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>
                            </div>
                            <div>
                                <h5 className="font-bold text-lg dark:text-white leading-none">Working Hours Trend</h5>
                                <p className="text-xs text-primary font-bold mt-1.5 bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                                    {chartData?.period_label || 'Loading...'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                            {['week', 'month', 'year'].map((r) => (
                                <button
                                    key={r}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        chartRange === r
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                    onClick={() => {
                                        setChartRange(r);
                                        setNavOffset(0);
                                    }}
                                >
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative min-h-[350px]">
                        {chartLoading && (
                            <div className="absolute inset-0 z-10 bg-white/50 dark:bg-[#0e1726]/50 flex items-center justify-center backdrop-blur-[1px] rounded-xl">
                                <span className="animate-spin border-2 border-primary border-t-transparent rounded-full w-8 h-8"></span>
                            </div>
                        )}

                        <ReactApexChart
                            series={[{ name: 'Work Hours', data: chartData?.series || [] }]}
                            options={{
                                chart: {
                                    height: 350,
                                    type: 'area',
                                    fontFamily: 'Nunito, sans-serif',
                                    toolbar: { show: false },
                                    zoom: { enabled: false },
                                },
                                colors: ['#4361ee'],
                                dataLabels: { enabled: false },
                                stroke: { curve: 'smooth', width: 3 },
                                fill: {
                                    type: 'gradient',
                                    gradient: {
                                        shadeIntensity: 1,
                                        inverseColors: false,
                                        opacityFrom: 0.45,
                                        opacityTo: 0.05,
                                        stops: [20, 100],
                                    },
                                },
                                grid: {
                                    borderColor: isDark ? '#191e3a' : '#e0e6ed',
                                    strokeDashArray: 5,
                                    xaxis: { lines: { show: false } },
                                    yaxis: { lines: { show: true } },
                                },
                                xaxis: {
                                    categories: chartData?.labels || [],
                                    axisBorder: { show: false },
                                    axisTicks: { show: false },
                                    labels: {
                                        style: {
                                            colors: isDark ? '#bfc9d4' : '#888ea8',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                        },
                                    },
                                },
                                yaxis: {
                                    labels: {
                                        formatter: (val: any) => `${val}h`,
                                        style: {
                                            colors: isDark ? '#bfc9d4' : '#888ea8',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                        },
                                    },
                                },
                                annotations: {
                                    xaxis: (chartData?.holidays || [])
                                        .map((isHol, idx) =>
                                            isHol
                                                ? {
                                                      x: chartData?.labels[idx],
                                                      strokeDashArray: 0,
                                                      borderColor: 'transparent',
                                                      label: {
                                                          borderColor: 'transparent',
                                                          style: {
                                                              color: '#e7515a',
                                                              background: isDark ? '#e7515a22' : '#e7515a11',
                                                              fontSize: '9px',
                                                              fontWeight: 800,
                                                              padding: { left: 4, right: 4, top: 2, bottom: 2 },
                                                          },
                                                          text: chartRange === 'year' ? '' : 'OFF',
                                                          orientation: 'horizontal',
                                                          position: 'top',
                                                          offsetY: 10,
                                                      },
                                                  }
                                                : null
                                        )
                                        .filter(Boolean) as any[],
                                },
                                tooltip: {
                                    theme: isDark ? 'dark' : 'light',
                                    x: { show: true },
                                    y: {
                                        formatter: (val: any) => `${val} hours`,
                                    },
                                },
                            }}
                            type="area"
                            height={350}
                        />
                    </div>
                </div>

                {/* Today's Timeline */}
                <div className="panel shadow-lg border-0 bg-white dark:bg-[#0e1726]">
                    <div className="flex items-center justify-between mb-5">
                        <h5 className="font-bold text-lg dark:text-white">Today's Timeline</h5>
                        <div className="p-2 bg-warning/10 rounded-lg">
                            <IconClock className="w-5 h-5 text-warning" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        {data?.recent_breaks && data.recent_breaks.length > 0 ? (
                            data.recent_breaks.map((b, i) => (
                                <div key={i} className="flex gap-4 relative">
                                    {i !== data.recent_breaks!.length - 1 && (
                                        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800"></div>
                                    )}
                                    <div className={`w-6 h-6 rounded-full border-4 ${b.end ? 'border-primary bg-primary' : 'border-warning bg-warning animate-pulse'} z-10`}></div>
                                    <div className="flex-1 pb-4">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{b.type?.replace(/_/g, ' ')}</p>
                                        <p className="text-xs text-gray-500">{b.start_time} - {b.end_time || 'Active'}</p>
                                        <p className="text-[10px] text-primary font-bold mt-1 bg-primary/5 inline-block px-2 py-0.5 rounded uppercase tracking-tighter">
                                            {b.duration || 'Running...'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-gray-50/50 dark:bg-black/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                <IconClock className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No activity logged yet today.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="panel p-6 shadow-lg border-0 bg-white dark:bg-[#0e1726]">
                <div className="flex items-center justify-between mb-5">
                    <h5 className="font-bold text-lg dark:text-white">Quick Navigations</h5>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link
                        to="/employee/chat"
                        className="group p-5 bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] dark:from-[#1b2e4b] dark:to-[#1a2941] rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white dark:bg-[#0e1726] rounded-xl shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300 border border-gray-100 dark:border-gray-800">
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
                            <div className="w-12 h-12 bg-white dark:bg-[#0e1726] rounded-xl shadow-sm flex items-center justify-center text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-colors duration-300 border border-gray-100 dark:border-gray-800">
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
                        className="group p-5 bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] dark:from-[#1b2e4b] dark:to-[#1a2941] rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] lg:col-span-1"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white dark:bg-[#0e1726] rounded-xl shadow-sm flex items-center justify-center text-success group-hover:bg-success group-hover:text-white transition-colors duration-300 border border-gray-100 dark:border-gray-800">
                                <IconListCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-base">Asset Requests</h4>
                                <p className="text-xs text-gray-500 mt-1">Request supplies or report damages.</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
