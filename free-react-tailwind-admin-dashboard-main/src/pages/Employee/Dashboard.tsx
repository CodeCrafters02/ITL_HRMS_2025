import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import IconSun from '../../components/Icon/IconSun';
import CountUp from 'react-countup';
import Dropdown from '../../components/Dropdown';
import IconXCircle from '../../components/Icon/IconXCircle';
import { fetchMyLeaveRequests, type LeaveRequest } from './LeaveApplication/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const pickLatestLeaveRequest = (results: LeaveRequest[]): LeaveRequest | null => {
    if (!results.length) return null;
    return [...results].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
};

const formatLeaveDateRange = (from?: string, to?: string) => {
    if (!from) return '—';
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    try {
        const f = new Date(from).toLocaleDateString(undefined, opts);
        if (!to || from === to) return f;
        const t = new Date(to).toLocaleDateString(undefined, opts);
        return `${f} – ${t}`;
    } catch {
        return from;
    }
};

const leaveStatusBadgeClass = (status: LeaveRequest['status']) => {
    switch (status) {
        case 'Approved':
            return 'badge badge-outline-success';
        case 'Rejected':
            return 'badge badge-outline-danger';
        case 'Cancelled':
            return 'badge badge-outline-secondary';
        default:
            return 'badge badge-outline-warning';
    }
};

interface DashboardData {
    today: string;
    status?: string;
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
        duration_minutes?: number | null;
        start_time: string;
    } | null;
    recent_breaks: any[] | null;
    overtime: { hours: number; minutes: number; total: number } | null;
    latest_payroll: { amount: number; date: string } | null;
    total_break_minutes: number;
    total_break_minutes_live?: number;
    short_break_minutes?: number;
    short_break_minutes_live?: number;
    short_break_quota_minutes?: number;
    break_quota_minutes?: number;
    break_quota_used_percent?: number;
    server_time: string;
    birthday_message: string | null;
    missing_checkout_yesterday?: boolean;
    missing_checkout_date?: string | null;
}

interface BreakConfig {
    id: number;
    break_choice: string;
    get_break_choice_display?: string;
    duration_minutes: number;
}

interface CalendarEventType {
    id: number;
    name: string;
    date: string;
    description: string;
    is_holiday: boolean;
}

const parseDurationToMinutes = (duration: string | null | undefined) => {
    if (!duration) return 0;
    const hoursMatch = duration.match(/(\d+)\s*h/i);
    const minsMatch = duration.match(/(\d+)\s*m/i);
    const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
    const mins = minsMatch ? Number(minsMatch[1]) : 0;
    return hours * 60 + mins;
};

const formatCountdown = (seconds: number) => {
    const safe = Math.max(0, seconds);
    const hh = Math.floor(safe / 3600);
    const mm = Math.floor((safe % 3600) / 60);
    const ss = safe % 60;
    if (hh > 0) {
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

const EmployeeDashboard = () => {
    const dispatch = useDispatch();
    const [data, setData] = useState<DashboardData | null>(null);
    const [breakConfigs, setBreakConfigs] = useState<BreakConfig[]>([]);
    const [events, setEvents] = useState<CalendarEventType[]>([]);
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

    const [officeLocations, setOfficeLocations] = useState<any[]>([]);
    const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [isInOffice, setIsInOffice] = useState<boolean>(true); // Default to true until checked
    const [isWFH, setIsWFH] = useState<boolean>(false);
    const [geofenceRequired, setGeofenceRequired] = useState<boolean>(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [latestLeave, setLatestLeave] = useState<LeaveRequest | null>(null);
    const [introBump, setIntroBump] = useState(0);
    const [checkinIntroHudClosed, setCheckinIntroHudClosed] = useState(false);
    const [checkinIntroAnchorRect, setCheckinIntroAnchorRect] = useState<DOMRect | null>(null);
    const checkinIntroAnchorRef = useRef<HTMLDivElement>(null);

    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in meters
    };

    const [liveTime, setLiveTime] = useState('0h 0m');
    const [liveRawSeconds, setLiveRawSeconds] = useState('--:--:--');
    const [nowMs, setNowMs] = useState(Date.now());
    const breakEndingAlertedRef = useRef<string | null>(null);
    const breakEndingBrowserAlertedRef = useRef<string | null>(null);
    const breakEndedBrowserAlertedRef = useRef<string | null>(null);

    const groupedBreaks = useMemo(() => {
        const groups: { [key: string]: BreakConfig[] } = {};
        breakConfigs.forEach((bc) => {
            if (bc.break_choice === 'dont_disturb') return;
            if (!groups[bc.break_choice]) {
                groups[bc.break_choice] = [];
            }
            groups[bc.break_choice].push(bc);
        });
        return groups;
    }, [breakConfigs]);

    const first = (localStorage.getItem('first_name') || '').trim();
    const last = (localStorage.getItem('last_name') || '').trim();
    const fallback = localStorage.getItem('username') || 'Employee';
    const display = `${first} ${last}`.trim() || fallback;
    const formattedName = display.charAt(0).toUpperCase() + display.slice(1);

    const activeHour = new Date().getHours();
    let greeting = 'Good Night';
    let GreetingEmoji = '🌙';
    if (activeHour >= 5 && activeHour < 12) {
        greeting = 'Good Morning';
        GreetingEmoji = '☀️';
    } else if (activeHour >= 12 && activeHour < 17) {
        greeting = 'Good Afternoon';
        GreetingEmoji = '🌤️';
    } else if (activeHour >= 17 && activeHour < 21) {
        greeting = 'Good Evening';
        GreetingEmoji = '🌆';
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

    useEffect(() => {
        const bump = () => setIntroBump((x) => x + 1);
        window.addEventListener('hrms-intro-updated', bump);
        return () => window.removeEventListener('hrms-intro-updated', bump);
    }, []);

    const acknowledgeCheckinIntro = useCallback(() => {
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('hrms_checkin_intro_pulse');
        const uid = (localStorage.getItem('user_id') || '').trim();
        if (uid && uid !== 'anonymous') localStorage.setItem(`hrms_checkin_intro_ack_${uid}`, '1');
        setCheckinIntroHudClosed(true);
    }, []);

    const introSession = useMemo(
        () => ({
            leavePulse: typeof sessionStorage !== 'undefined' && sessionStorage.getItem('hrms_leave_intro_pulse') === '1',
            checkinPulse: typeof sessionStorage !== 'undefined' && sessionStorage.getItem('hrms_checkin_intro_pulse') === '1',
        }),
        [introBump],
    );

    const employeeUserIdForIntro = (localStorage.getItem('user_id') || '').trim();
    const validEmployeeIdForIntro = Boolean(employeeUserIdForIntro && employeeUserIdForIntro !== 'anonymous');
    const checkinIntroAckStored = validEmployeeIdForIntro
        ? localStorage.getItem(`hrms_checkin_intro_ack_${employeeUserIdForIntro}`)
        : null;

    const showCheckinIntroEligible =
        validEmployeeIdForIntro &&
        introSession.checkinPulse &&
        checkinIntroAckStored === null &&
        !checkinIntroHudClosed &&
        !introSession.leavePulse;

    const fetchAllData = async (background = false) => {
        if (!background) setLoading(true);
        try {
            // Fetch Geofence Config
            const geoConfigRes = await fetch(`${API_BASE_URL}/employee/geofence-config/`, { headers: authHeaders });
            if (geoConfigRes.ok) {
                const geoJson = await geoConfigRes.json();
                setOfficeLocations(geoJson.office_locations || []);
                setIsWFH(geoJson.is_wfh || false);
                setGeofenceRequired(geoJson.geofence_required);
                
                // If geofencing is NOT required (WFH or no office configs), consider them "in office"
                if (!geoJson.geofence_required) {
                    setIsInOffice(true);
                }
            }

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
                setBreakConfigs(Array.isArray(breakJson) ? breakJson : breakJson.results || []);
            }

            // Fetch calendar events
            const eventsRes = await fetch(`${API_BASE_URL}/app/calendar-events/`, { headers: authHeaders });
            if (eventsRes.ok) {
                const evResult = await eventsRes.json();
                const evList = Array.isArray(evResult) ? evResult : evResult?.results || [];
                const todayStr = new Date().toISOString().split('T')[0];
                const upcoming = evList
                    .filter((e: CalendarEventType) => e.date >= todayStr)
                    .sort((a: CalendarEventType, b: CalendarEventType) => a.date.localeCompare(b.date))
                    .slice(0, 5);
                setEvents(upcoming);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            if (!background) setLoading(false);
        }
    };

    // Watch Geolocation
    useEffect(() => {
        if (!geofenceRequired || officeLocations.length === 0) {
            setIsInOffice(true);
            return;
        }

        let watchId: number;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserCoords({ lat: latitude, lon: longitude });
                    setGeoError(null);

                    // Check if within any office radius
                    const isInside = officeLocations.some((office) => {
                        const dist = haversineDistance(latitude, longitude, office.latitude, office.longitude);
                        return dist <= office.radius;
                    });
                    setIsInOffice(isInside);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setGeoError(error.message);
                    // If geofencing is required but we can't get location, default to false
                    setIsInOffice(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setGeoError('Geolocation is not supported by this browser.');
            setIsInOffice(false);
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [officeLocations]);

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

    useEffect(() => {
        dispatch(setPageTitle('Employee Dashboard'));
        fetchAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { results } = await fetchMyLeaveRequests({ page: 1, page_size: 40 });
                if (cancelled) return;
                setLatestLeave(pickLatestLeaveRequest(results));
            } catch {
                if (!cancelled) setLatestLeave(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

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

    useEffect(() => {
        if (!data?.active_break) return;
        const timer = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [data?.active_break]);

    useEffect(() => {
        // Ask once so system notifications can be shown when user is on another page/tab.
        if (typeof Notification === 'undefined') return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => undefined);
        }
    }, []);

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

    const showCompactError = (message: string) =>
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            width: '22rem',
            padding: '1rem',
            confirmButtonText: 'OK',
        });

    const handleCheckIn = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/employee/checkin/`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    lat: userCoords?.lat,
                    lon: userCoords?.lon
                })
            });
            const result = await res.json();
            if (res.ok) {
                if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('hrms_checkin_intro_pulse') === '1') {
                    acknowledgeCheckinIntro();
                }
                // Always show success first
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Successfully Checked In!', showConfirmButton: false, timer: 2500 });

                if (result.missing_checkout_yesterday) {
                    const rawDate: string = result.missing_checkout_date || '';
                    const dateLabel = rawDate
                        ? new Date(rawDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                        : 'a previous working day';
                    // Small delay so the success toast is visible before the modal takes over
                    await new Promise((r) => setTimeout(r, 600));
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Missed Checkout — Action Required',
                        html: `
                            <p>You forgot to check out on <strong>${dateLabel}</strong>.</p>
                            <p style="margin-top:10px">Your attendance for that day has been marked as <strong style="color:#e7515a">Absent</strong>.</p>
                            <p style="margin-top:8px">Please contact your <strong>Admin</strong> to correct your attendance record.</p>
                        `,
                        confirmButtonText: 'I Understand',
                        confirmButtonColor: '#e2a03f',
                        allowOutsideClick: false,
                    });
                }

                fetchAllData(true);
            } else {
                showCompactError(result.detail || 'Could not check in');
            }
        } catch (e: any) {
            showCompactError(e.message || 'Could not check in');
        }
    };

    const handleCheckOut = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/employee/checkout/`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    lat: userCoords?.lat,
                    lon: userCoords?.lon
                })
            });
            const result = await res.json();
            if (res.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Successfully Checked Out!', showConfirmButton: false, timer: 3000 });
                fetchAllData(true);
            } else {
                showCompactError(result.detail || 'Could not check out');
            }
        } catch (e: any) {
            showCompactError(e.message || 'Could not check out');
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/employee/employee-profile/`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                const responseData = await res.json();
                setData(prev => prev ? { ...prev, status: responseData.status || newStatus } : null);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Status Updated', showConfirmButton: false, timer: 3000 });
            } else {
                const errData = await res.json();
                showCompactError(errData.detail || 'Could not update status');
            }
        } catch (e: any) {
            showCompactError(e.message || 'Could not update status');
        }
    };

    const handleStartBreak = async (configId: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/employee/employee-breaks/`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ 
                    break_config_id: configId, 
                    action: 'start',
                    lat: userCoords?.lat,
                    lon: userCoords?.lon
                }),
            });
            const result = await res.json();
            if (res.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Break Started', showConfirmButton: false, timer: 3000 });
                fetchAllData(true);
            } else {
                showCompactError(result.detail || 'Could not start break');
            }
        } catch (e: any) {
            showCompactError(e.message || 'Could not start break');
        }
    };

    const handleEndBreak = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/employee/employee-breaks/`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ 
                    action: 'end',
                    lat: userCoords?.lat,
                    lon: userCoords?.lon
                }),
            });
            const result = await res.json();
            if (res.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Break Ended', showConfirmButton: false, timer: 3000 });
                fetchAllData(true);
            } else {
                showCompactError(result.detail || 'Could not end break');
            }
        } catch (e: any) {
            showCompactError(e.message || 'Could not end break');
        }
    };

    const activeBreakForAlert = data?.active_break;
    const activeBreakDurationMinutesForAlert =
        activeBreakForAlert?.duration_minutes ?? breakConfigs.find((bc) => bc.id === activeBreakForAlert?.break_config_id)?.duration_minutes ?? null;
    const breakRemainingSecondsForAlert = (() => {
        if (!activeBreakForAlert?.start_time || !activeBreakDurationMinutesForAlert) return null;
        const [h, m, s] = activeBreakForAlert.start_time.split(':').map(Number);
        if ([h, m, s].some((v) => Number.isNaN(v))) return null;

        const start = new Date();
        start.setHours(h, m, s, 0);
        let elapsedSeconds = Math.floor((nowMs - start.getTime()) / 1000);
        if (elapsedSeconds < 0) elapsedSeconds += 24 * 60 * 60;

        return Math.max(0, activeBreakDurationMinutesForAlert * 60 - elapsedSeconds);
    })();

    const sendBrowserBreakAlert = (title: string, body: string, tag: string) => {
        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;
        new Notification(title, {
            body,
            tag,
        });
    };

    useEffect(() => {
        if (!activeBreakForAlert?.start_time) {
            breakEndingAlertedRef.current = null;
            breakEndingBrowserAlertedRef.current = null;
            breakEndedBrowserAlertedRef.current = null;
            return;
        }
        if (breakRemainingSecondsForAlert === null) return;

        const alertKey = `${activeBreakForAlert.start_time}-${activeBreakForAlert.break_config_id ?? 'na'}`;
        if (breakRemainingSecondsForAlert > 0 && breakRemainingSecondsForAlert <= 120 && breakEndingAlertedRef.current !== alertKey) {
            breakEndingAlertedRef.current = alertKey;
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: `Break ending soon (${formatCountdown(breakRemainingSecondsForAlert)} left)`,
                showConfirmButton: false,
                timer: 4000,
            });
        }
        if (breakRemainingSecondsForAlert > 0 && breakRemainingSecondsForAlert <= 120 && breakEndingBrowserAlertedRef.current !== alertKey) {
            breakEndingBrowserAlertedRef.current = alertKey;
            sendBrowserBreakAlert(
                'Break Ending Soon',
                `Your break ends in ${formatCountdown(breakRemainingSecondsForAlert)}.`,
                `break-ending-${alertKey}`
            );
        }
        if (breakRemainingSecondsForAlert <= 0 && breakEndedBrowserAlertedRef.current !== alertKey) {
            breakEndedBrowserAlertedRef.current = alertKey;
            sendBrowserBreakAlert(
                'Break Time Over',
                'Your break has ended. Please return and end your break.',
                `break-ended-${alertKey}`
            );
        }
    }, [activeBreakForAlert?.start_time, activeBreakForAlert?.break_config_id, breakRemainingSecondsForAlert]);

    useLayoutEffect(() => {
        if (!showCheckinIntroEligible || loading || !data) {
            setCheckinIntroAnchorRect(null);
            return;
        }
        const el = checkinIntroAnchorRef.current;
        if (!el) return;
        const sync = () => setCheckinIntroAnchorRect(el.getBoundingClientRect());
        sync();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
        ro?.observe(el);
        window.addEventListener('resize', sync);
        window.addEventListener('scroll', sync, true);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', sync);
            window.removeEventListener('scroll', sync, true);
        };
    }, [showCheckinIntroEligible, loading, data, introBump]);

    useEffect(() => {
        if (loading || !data?.checkin_time) return;
        if (typeof sessionStorage === 'undefined' || sessionStorage.getItem('hrms_checkin_intro_pulse') !== '1') return;
        acknowledgeCheckinIntro();
    }, [loading, data?.checkin_time, acknowledgeCheckinIntro, introBump]);

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
    const weeklyTargetHours = 40;
    const weeklyProgress = Math.min(100, Math.round((Number(data.weekly_hours || 0) / weeklyTargetHours) * 100));
    const overtimeTotalMinutes = data.overtime ? data.overtime.hours * 60 + data.overtime.minutes : 0;
    const productiveMinutes = Math.max(0, parseDurationToMinutes(liveTime));
    const breakMinutes = Math.max(0, data.total_break_minutes_live ?? data.total_break_minutes ?? 0);
    const focusScore = productiveMinutes + breakMinutes > 0 ? Math.round((productiveMinutes / (productiveMinutes + breakMinutes)) * 100) : 100;
    const isCheckedIn = Boolean(checkin_time && !checkout_time);
    const attendanceStatusLabel = isCheckedIn ? (active_break ? 'On Break' : 'Checked In') : checkout_time ? 'Checked Out' : 'Not Checked In';
    const attendanceStatusColor = isCheckedIn ? (active_break ? '#e2a03f' : '#00ab55') : checkout_time ? '#805dca' : '#e7515a';
    const punctualityScore = data.is_late ? 65 : 100;
    const dayTargetMinutes = 8 * 60;
    const productiveScore = Math.min(100, Math.round((productiveMinutes / dayTargetMinutes) * 100));
    const attendanceHealthScore = (() => {
        if (!checkin_time) return 20;

        // Blend punctuality, consistency (weekly progress), focus, and daily worked minutes.
        const weightedScore = Math.round((punctualityScore * 0.3) + (weeklyProgress * 0.25) + (focusScore * 0.25) + (productiveScore * 0.2));
        return Math.max(0, Math.min(100, weightedScore));
    })();
    const activeBreakDurationMinutes = active_break?.duration_minutes ?? breakConfigs.find((bc) => bc.id === active_break?.break_config_id)?.duration_minutes ?? null;
    const breakRemainingSeconds = (() => {
        if (!active_break?.start_time || !activeBreakDurationMinutes) return null;
        const [h, m, s] = active_break.start_time.split(':').map(Number);
        if ([h, m, s].some((v) => Number.isNaN(v))) return null;

        const start = new Date();
        start.setHours(h, m, s, 0);
        let elapsedSeconds = Math.floor((nowMs - start.getTime()) / 1000);
        if (elapsedSeconds < 0) elapsedSeconds += 24 * 60 * 60;

        return Math.max(0, activeBreakDurationMinutes * 60 - elapsedSeconds);
    })();

    const isGeofenceRequired = officeLocations.length > 0;
    const canPerformAction = !isGeofenceRequired || isInOffice;

    const checkinIntroTitle = 'Start with Check In';
    const checkinIntroBody = (
        <>
            Tap <span className="font-semibold">Check In</span> when your shift begins and <span className="font-semibold">Check Out</span> when you finish — the buttons
            live in this colorful top card each day. If your employer uses office location, stay inside the allowed area so attendance stays unlocked.
        </>
    );
    const checkinIntroDismissLabel = 'Got it';

    const checkinIntroPortal =
        showCheckinIntroEligible &&
        typeof document !== 'undefined' &&
        createPortal(
            <>
                {checkinIntroAnchorRect && (
                    <div
                        role="dialog"
                        aria-live="polite"
                        className="pointer-events-auto fixed z-[60000] hidden w-[min(19rem,calc(100vw-3rem))] -translate-x-1/2 sm:block"
                        style={{
                            left: checkinIntroAnchorRect.left + checkinIntroAnchorRect.width / 2,
                            top: checkinIntroAnchorRect.bottom + 8,
                        }}
                    >
                        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full border-[10px] border-transparent border-b-white dark:border-b-[#1b2e4b]" aria-hidden />
                        <div className="rounded-2xl border border-white/80 bg-white p-3.5 pr-11 shadow-xl dark:border-primary/40 dark:bg-[#1b2e4b] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-2 ring-primary/25">
                            <button
                                type="button"
                                aria-label="Close tip"
                                className="absolute right-2.5 top-2.5 rounded-full p-1 text-black/45 hover:bg-black/10 hover:text-primary dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                                onClick={() => acknowledgeCheckinIntro()}
                            >
                                <IconXCircle className="h-5 w-5 shrink-0" />
                            </button>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{checkinIntroTitle}</p>
                            <p className="mt-2 text-xs leading-snug text-black/80 dark:text-white/85">{checkinIntroBody}</p>
                            <button
                                type="button"
                                className="mt-2 text-xs font-semibold uppercase text-primary hover:text-primary/90"
                                onClick={() => acknowledgeCheckinIntro()}
                            >
                                {checkinIntroDismissLabel}
                            </button>
                        </div>
                    </div>
                )}
                <div className="pointer-events-auto fixed inset-x-4 bottom-5 z-[60000] rounded-2xl border border-primary/35 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-primary/45 dark:bg-[#1b2e4b]/95 sm:hidden">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-cyan-500/25 text-lg" aria-hidden>
                            🕐
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{checkinIntroTitle}</p>
                            <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-white/75">{checkinIntroBody}</p>
                            <button
                                type="button"
                                className="mt-2 text-xs font-semibold uppercase text-primary hover:text-primary/90"
                                onClick={() => acknowledgeCheckinIntro()}
                            >
                                {checkinIntroDismissLabel}
                            </button>
                        </div>
                        <button type="button" aria-label="Close tip" className="shrink-0 p-1 text-black/35 dark:text-white/40" onClick={() => acknowledgeCheckinIntro()}>
                            <IconXCircle className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </>,
            document.body,
        );

    return (
        <>
            <div className="space-y-6 animate__animated animate__fadeIn">
            {isGeofenceRequired && !isInOffice && (
                <div className="panel bg-danger/10 border-danger/20 text-danger p-3 rounded-xl flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm flex-1">
                        <p className="font-bold">Outside Office Range</p>
                        <p className="opacity-80">Attendance actions are disabled because you are not within an authorized office radius.</p>
                        {geoError && <p className="text-[10px] mt-1 font-mono">Debug: {geoError}</p>}
                    </div>
                </div>
            )}
            <div className="panel relative overflow-hidden border-0 bg-gradient-to-r from-[#220fb6] via-[#4f6be5] to-[#0f52af] text-white p-1 md:p-2">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_84%_20%,rgba(128,224,255,0.22),transparent_36%)] pointer-events-none"></div>
                <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-cyan-200/25 blur-3xl"></div>
                <div className="absolute -bottom-14 -left-12 w-52 h-52 rounded-full bg-indigo-200/25 blur-3xl"></div>

                <div className="absolute z-[1] -left-10 bottom-9 h-20 w-20 rounded-full border border-white/20 bg-white/10 backdrop-blur-md shadow-[inset_0_0_24px_rgba(255,255,255,0.18)] animate-particle-drift"></div>
                <div className="absolute z-[1] -right-8 top-1/3 h-20 w-20 rounded-full border border-cyan-100/25 bg-cyan-100/10 backdrop-blur-md shadow-[inset_0_0_20px_rgba(190,235,255,0.18)] animate-particle-drift [animation-delay:1.2s]"></div>

                <div className="absolute z-[1] left-7 top-8 h-4 w-4 rounded-full border border-white/65 bg-white/35 backdrop-blur-md shadow-[0_0_16px_rgba(255,255,255,0.45)] animate-particle-float"></div>
                <div className="absolute z-[1] left-16 bottom-6 h-3.5 w-3.5 rounded-full border border-white/60 bg-white/30 backdrop-blur-md shadow-[0_0_14px_rgba(255,255,255,0.38)] animate-particle-drift [animation-delay:650ms]"></div>
                <div className="absolute z-[1] right-36 top-6 h-5 w-5 rounded-full border border-cyan-100/70 bg-cyan-100/35 backdrop-blur-md shadow-[0_0_18px_rgba(180,236,255,0.5)] animate-particle-float [animation-delay:340ms]"></div>
                <div className="absolute z-[1] right-8 bottom-8 h-4 w-4 rounded-full border border-blue-100/70 bg-blue-100/30 backdrop-blur-md shadow-[0_0_16px_rgba(190,220,255,0.45)] animate-particle-drift [animation-delay:1.6s]"></div>
                <div className="absolute z-[1] left-[44%] top-[36%] h-4 w-4 rounded-full border border-white/60 bg-white/28 backdrop-blur-md shadow-[0_0_14px_rgba(255,255,255,0.36)] animate-particle-float [animation-delay:240ms]"></div>
                <div className="absolute z-[1] left-[52%] bottom-9 h-3.5 w-3.5 rounded-full border border-cyan-100/60 bg-cyan-100/28 backdrop-blur-md shadow-[0_0_12px_rgba(175,230,255,0.34)] animate-particle-drift [animation-delay:920ms]"></div>
                <div className="absolute z-[1] left-[60%] top-[48%] h-3 w-3 rounded-full border border-blue-100/60 bg-blue-100/28 backdrop-blur-md shadow-[0_0_12px_rgba(180,215,255,0.32)] animate-particle-float [animation-delay:1.25s]"></div>

                <div className="relative z-10 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium tracking-wide text-white/85">Welcome back, {formattedName}</p>
                            <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                                {greeting} <span>{GreetingEmoji}</span>
                            </h1>
                            <p className="mt-1 text-sm text-white/85">{todayFormatted}</p>
                            {data.birthday_message && (
                                <span className="mt-2 inline-flex items-center rounded-full bg-[#2413ba]/90 px-3 py-1 text-xs font-semibold shadow-md border border-white/25">
                                    🎂 {data.birthday_message}
                                </span>
                            )}
                        </div>

                        <div ref={checkinIntroAnchorRef} className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#58b8df]/20 text-cyan-100 border border-cyan-200/40 font-semibold">Realtime</span>

                            {isGeofenceRequired && (
                                <span className={`text-[11px] px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${isInOffice ? 'bg-success/20 text-success-light border-success/30' : 'bg-danger/20 text-danger-light border-danger/30'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isInOffice ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
                                    {isInOffice ? 'At Office' : 'Outside Office'}
                                </span>
                            )}
                            {!checkin_time && (
                                <button 
                                    type="button" 
                                    className={`btn btn-primary shadow-md rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none ${
                                        canPerformAction ? 'animate-checkin-pulse motion-reduce:animate-none' : ''
                                    }`}
                                    onClick={handleCheckIn}
                                    disabled={!canPerformAction}
                                    title={!canPerformAction ? 'You must be at the office to check in' : ''}
                                >
                                    Check In
                                </button>
                            )}
                            {checkin_time && !checkout_time && (
                                <button 
                                    type="button" 
                                    className="btn btn-danger shadow-md rounded-xl disabled:opacity-50 disabled:cursor-not-allowed" 
                                    onClick={handleCheckOut}
                                    disabled={!canPerformAction}
                                    title={!canPerformAction ? 'You must be at the office to check out' : ''}
                                >
                                    Check Out
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5">
                        <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-blue-100">Status</p>
                            <p className="text-base font-bold mt-1 text-white">{attendanceStatusLabel}</p>
                        </div>
                        <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-blue-100">Weekly Target</p>
                            <p className="text-xl font-black mt-1 text-white">
                                <CountUp end={weeklyProgress} duration={1.3} />%
                            </p>
                        </div>
                        <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-blue-100">Focus Index</p>
                            <p className="text-xl font-black mt-1 text-white">
                                <CountUp end={focusScore} duration={1.3} />%
                            </p>
                        </div>
                        <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-blue-100">Punch Time</p>
                            <p className="text-sm font-bold text-white mt-1">{checkin_time || '--:--'} / {checkout_time || '--:--'}</p>
                        </div>
                        <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-cyan-100">Live Clock</p>
                            <p className="text-sm font-black text-cyan-100 mt-1 animate-pulse">{liveRawSeconds}</p>
                        </div>
                    </div>

                    {checkin_time && !checkout_time && (
                        <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-white/20 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-100 mr-1">Status & Breaks</p>
                            
                            {/* Live Status Dropdown inside Breaks Section */}
                            <div className="dropdown relative">
                                <Dropdown
                                    offset={[0, 5]}
                                    placement="bottom-start"
                                    usePortal={true}
                                    strategy="fixed"
                                    button={
                                        <button type="button" className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-cyan-200/45 bg-cyan-200/10 text-cyan-100 hover:bg-cyan-200/20 transition-colors capitalize flex items-center gap-1">
                                            <span className={`w-2 h-2 rounded-full ${
                                                data.status === 'online' ? 'bg-success' :
                                                data.status === 'away' ? 'bg-warning' :
                                                data.status === 'dnd' ? 'bg-danger' :
                                                'bg-secondary'
                                            }`}></span>
                                            {data.status === 'dnd' ? 'Do Not Disturb' : (data.status || 'Online')}
                                            <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </button>
                                    }
                                >
                                    <ul className="text-black dark:text-white-dark bg-white dark:bg-[#1b2e4b] shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(0,0,0,0.4)] rounded-md border border-white-light dark:border-[#253b5c] py-1 min-w-[160px]">
                                        <li><button type="button" onClick={() => handleStatusUpdate('online')} className="w-full text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-black/10 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success"></span> Online</button></li>
                                        <li><button type="button" onClick={() => handleStatusUpdate('away')} className="w-full text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-black/10 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-warning"></span> Away</button></li>
                                        <li><button type="button" onClick={() => handleStatusUpdate('dnd')} className="w-full text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-black/10 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-danger"></span> Start dont disturb</button></li>
                                        <li><button type="button" onClick={() => handleStatusUpdate('offline')} className="w-full text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-black/10 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-secondary"></span> Offline</button></li>
                                    </ul>
                                </Dropdown>
                            </div>

                            {!active_break ? (
                                Object.entries(groupedBreaks).map(([choice, configs]) => {
                                    const formattedChoice = choice.replace(/_/g, ' ');
                                    if (configs.length === 1) {
                                        const bc = configs[0];
                                        return (
                                            <button
                                                key={bc.id}
                                                type="button"
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-cyan-200/45 bg-cyan-200/10 text-cyan-100 hover:bg-cyan-200/20 transition-colors capitalize disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={() => handleStartBreak(bc.id)}
                                                disabled={!canPerformAction}
                                            >
                                                Start {formattedChoice}
                                            </button>
                                        );
                                    } else {
                                        const sortedConfigs = [...configs].sort((a, b) => {
                                            const aDuration = Number(a.duration_minutes || 0);
                                            const bDuration = Number(b.duration_minutes || 0);
                                            return aDuration - bDuration;
                                        });
                                        return (
                                            <div className="dropdown relative" key={choice}>
                                                <Dropdown
                                                    offset={[0, 5]}
                                                    placement="bottom-start"
                                                    usePortal={true}
                                                    strategy="fixed"
                                                    btnClassName="px-3 py-1.5 text-xs font-semibold rounded-lg border border-cyan-200/45 bg-cyan-200/10 text-cyan-100 hover:bg-cyan-200/20 transition-colors capitalize flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    button={
                                                        <button type="button" disabled={!canPerformAction} className="flex items-center gap-1">
                                                            Start {formattedChoice}
                                                            <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="6 9 12 15 18 9"></polyline>
                                                            </svg>
                                                        </button>
                                                    }
                                                >
                                                    <ul className="text-black dark:text-white-dark bg-white dark:bg-[#1b2e4b] shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(0,0,0,0.4)] rounded-md border border-white-light dark:border-[#253b5c] py-1 min-w-[150px]">
                                                        {sortedConfigs.map(bc => (
                                                            <li key={bc.id}>
                                                                <button
                                                                    type="button"
                                                                    className="w-full text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-black/10 text-sm capitalize"
                                                                    onClick={() => handleStartBreak(bc.id)}
                                                                >
                                                                    {bc.duration_minutes ? `${bc.duration_minutes} Mins` : `Start ${formattedChoice}`}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </Dropdown>
                                            </div>
                                        );
                                    }
                                })
                            ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button 
                                        type="button" 
                                        className="btn btn-warning rounded-xl animate-pulse disabled:opacity-50 disabled:cursor-not-allowed" 
                                        onClick={handleEndBreak}
                                        disabled={!canPerformAction}
                                    >
                                        End Active Break ({active_break.type?.replace(/_/g, ' ') || 'Break'})
                                    </button>
                                    <span className="text-xs font-bold text-amber-100 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-300/40">
                                        {breakRemainingSeconds === null
                                            ? 'Running...'
                                            : breakRemainingSeconds > 0
                                                ? `Remaining ${formatCountdown(breakRemainingSeconds)}`
                                                : 'Break time over'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
                <Link
                    to="/employee/leave-application"
                    className="panel p-4 hover:-translate-y-1 transition-all duration-300 border border-[#ebedf2] dark:border-[#1b2e4b] hover:border-primary dark:hover:border-primary block no-underline text-inherit min-w-0 group"
                >
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-wider text-white-dark font-semibold">Leave application</p>
                     
                    </div>
                    {latestLeave ? (
                        <>
                            <p className="text-lg font-black mt-2 truncate" title={latestLeave.leave_type_name}>
                                {latestLeave.leave_type_name}
                            </p>
                            <p className="mt-2">
                                <span className={leaveStatusBadgeClass(latestLeave.status)}>{latestLeave.status}</span>
                            </p>
                            <p className="text-xs text-white-dark mt-1.5 truncate" title={`${latestLeave.from_date} → ${latestLeave.to_date}`}>
                                {formatLeaveDateRange(latestLeave.from_date, latestLeave.to_date)}
                            </p>
                            </>
                    ) : (
                        <>
                            <p className="text-lg font-black mt-2 text-white-dark">No requests yet</p>
                            <p className="text-xs text-white-dark mt-1">Open leave application to submit</p>
                        </>
                    )}
                </Link>
                <div className="panel p-4 hover:-translate-y-1 transition-all duration-300 border border-[#ebedf2] dark:border-[#1b2e4b]">
                    <p className="text-[11px] uppercase tracking-wider text-white-dark font-semibold">Effective Time</p>
                    <p className="text-2xl font-black mt-2">{liveTime}</p>
                    <p className="text-xs text-white-dark mt-1">Net hours after breaks</p>
                </div>
                <div className="panel p-4 hover:-translate-y-1 transition-all duration-300 border border-[#ebedf2] dark:border-[#1b2e4b]">
                    <p className="text-[11px] uppercase tracking-wider text-white-dark font-semibold">Weekly Hours</p>
                    <p className="text-2xl font-black mt-2 text-success">{data.total_work_duration_week}</p>
                    <p className="text-xs text-white-dark mt-1">Current week accumulation</p>
                </div>
                <div className="panel p-4 hover:-translate-y-1 transition-all duration-300 border border-[#ebedf2] dark:border-[#1b2e4b]">
                    <p className="text-[11px] uppercase tracking-wider text-white-dark font-semibold">Overtime</p>
                    <p className="text-2xl font-black mt-2 text-warning">{data.overtime ? `${data.overtime.hours}h ${data.overtime.minutes}m` : '0h 0m'}</p>
                    <p className="text-xs text-white-dark mt-1">Extra contribution</p>
                </div>
                <div className="panel p-4 hover:-translate-y-1 transition-all duration-300 border border-[#ebedf2] dark:border-[#1b2e4b]">
                    <p className="text-[11px] uppercase tracking-wider text-white-dark font-semibold">Latest Payroll</p>
                    <p className="text-2xl font-black mt-2 text-secondary">{data.latest_payroll ? `$ ${data.latest_payroll.amount.toLocaleString()}` : 'Pending'}</p>
                    <p className="text-xs text-white-dark mt-1">Most recent payout</p>
                </div>
                <div className="panel p-4 hover:-translate-y-1 transition-all duration-300 border border-[#ebedf2] dark:border-[#1b2e4b]">
                    <p className="text-[11px] uppercase tracking-wider text-white-dark font-semibold">Focus Score</p>
                    <p className="text-2xl font-black mt-2 text-primary">
                        <CountUp end={focusScore} duration={1.2} />%
                    </p>
                    <p className="text-xs text-white-dark mt-1">Work-to-break ratio</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3 panel p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                                <button type="button" className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-all" onClick={() => setNavOffset((prev) => prev + 1)} title="Previous Period">
                                    <svg className="w-5 h-5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
                                <h5 className="font-bold text-lg dark:text-white">Productivity Trend</h5>
                                <p className="text-xs mt-1 inline-flex px-2 py-0.5 rounded bg-primary-light text-primary font-semibold">
                                    {chartData?.period_label || 'Loading...'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                            {['week', 'month', 'year'].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${chartRange === r ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
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
                            <div className="absolute inset-0 z-10 bg-white/60 dark:bg-[#0f1726]/60 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
                                <span className="animate-spin border-2 border-primary border-t-transparent rounded-full w-8 h-8"></span>
                            </div>
                        )}
                        <ReactApexChart
                            series={[{ name: 'Work Hours', data: chartData?.series || [] }]}
                            options={{
                                chart: { height: 350, type: 'area', fontFamily: 'Nunito, sans-serif', toolbar: { show: false }, zoom: { enabled: false } },
                                colors: ['#4361ee'],
                                dataLabels: { enabled: false },
                                stroke: { curve: 'smooth', width: 3.4 },
                                fill: {
                                    type: 'gradient',
                                    gradient: {
                                        shadeIntensity: 1,
                                        inverseColors: false,
                                        opacityFrom: 0.45,
                                        opacityTo: 0.04,
                                        stops: [10, 100],
                                    },
                                },
                                grid: {
                                    borderColor: isDark ? '#1f2a44' : '#dce7ef',
                                    strokeDashArray: 4,
                                    xaxis: { lines: { show: false } },
                                    yaxis: { lines: { show: true } },
                                },
                                xaxis: {
                                    categories: chartData?.labels || [],
                                    axisBorder: { show: false },
                                    axisTicks: { show: false },
                                    labels: {
                                        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px', fontWeight: 700 },
                                    },
                                },
                                yaxis: {
                                    labels: {
                                        formatter: (val: any) => `${val}h`,
                                        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px', fontWeight: 700 },
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
                                                            color: '#f59e0b',
                                                            background: isDark ? '#f59e0b22' : '#f59e0b1f',
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

                <div className="xl:col-span-2 space-y-6">
                    <div className="panel p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="font-bold text-lg dark:text-white">Attendance Health</h5>
                            <span className="text-xs px-2 py-1 rounded-full bg-primary-light text-primary font-semibold">{attendanceStatusLabel}</span>
                        </div>
                        <ReactApexChart
                            type="radialBar"
                            height={220}
                            series={[attendanceHealthScore]}
                            options={{
                                chart: { sparkline: { enabled: true } },
                                colors: [attendanceStatusColor],
                                plotOptions: {
                                    radialBar: {
                                        hollow: { size: '64%' },
                                        track: { background: isDark ? '#1d263d' : '#e8f0f4' },
                                        dataLabels: {
                                            name: { show: true, color: isDark ? '#cbd5e1' : '#475569', fontSize: '13px' },
                                            value: { show: true, fontWeight: 700, fontSize: '22px', color: isDark ? '#f8fafc' : '#0f172a' },
                                        },
                                    },
                                },
                                labels: [isCheckedIn ? 'Active' : checkout_time ? 'Closed' : 'Idle'],
                            }}
                        />
                    </div>

                    <div className="panel p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="font-bold text-lg dark:text-white">Time Distribution</h5>
                            <span className="text-xs px-2 py-1 rounded-full bg-primary-light text-primary font-semibold">Today</span>
                        </div>
                        <ReactApexChart
                            type="donut"
                            height={220}
                            series={[productiveMinutes, breakMinutes || 1]}
                            options={{
                                labels: ['Productive', 'Break'],
                                colors: ['#1953c2', '#58b8df'],
                                legend: { position: 'bottom', labels: { colors: isDark ? '#cbd5e1' : '#334155' } },
                                dataLabels: { enabled: false },
                                stroke: { colors: [isDark ? '#0f1726' : '#ffffff'] },
                                plotOptions: {
                                    pie: {
                                        donut: {
                                            size: '70%',
                                            labels: {
                                                show: true,
                                                total: {
                                                    show: true,
                                                    label: 'Focus',
                                                    formatter: () => `${focusScore}%`,
                                                    color: isDark ? '#f8fafc' : '#0f172a',
                                                },
                                            },
                                        },
                                    },
                                },
                            }}
                        />
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <div className="rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 p-2.5">
                                <p className="text-[11px] text-slate-500">Overtime mins</p>
                                <p className="text-lg font-bold text-amber-600 dark:text-amber-300">
                                    <CountUp end={overtimeTotalMinutes} duration={1.2} />
                                </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 p-2.5">
                                <p className="text-[11px] text-slate-500">Break mins</p>
                                <p className="text-lg font-bold text-cyan-600 dark:text-cyan-300">
                                    <CountUp end={breakMinutes} duration={1.2} />
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="panel xl:col-span-1 p-5 shadow-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f1726]">
                    <div className="flex items-center justify-between mb-5">
                        <h5 className="font-bold text-lg dark:text-white">Today's Timeline</h5>
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/15">
                            <IconClock className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        {data?.recent_breaks && data.recent_breaks.length > 0 ? (
                            data.recent_breaks.map((b, i) => (
                                <div key={i} className="flex gap-3.5 relative">
                                    {i !== data.recent_breaks!.length - 1 && <div className="absolute left-[10px] top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800"></div>}
                                    <div className={`w-5 h-5 rounded-full border-4 ${b.end_time ? 'border-emerald-500 bg-emerald-500' : 'border-amber-500 bg-amber-500 animate-pulse'} z-10`}></div>
                                    <div className="flex-1 pb-4">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{b.type?.replace(/_/g, ' ')}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{b.start_time} - {b.end_time || 'Active'}</p>
                                        <span className="inline-flex mt-1.5 text-[10px] font-semibold uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 rounded px-2 py-0.5">
                                            {b.end_time ? b.duration || '--' : 'Running...'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <IconClock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">No activity logged yet today.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="panel xl:col-span-1 p-5 shadow-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f1726]">
                    <div className="flex items-center justify-between mb-5">
                        <h5 className="font-bold text-lg dark:text-white">Upcoming Events</h5>
                        <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-500/15">
                            <IconCalendar className="w-5 h-5 text-cyan-700 dark:text-cyan-300" />
                        </div>
                    </div>
                    <div className="space-y-3.5">
                        {events.length > 0 ? (
                            events.map((event) => (
                                <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-black/15 hover:-translate-y-0.5 transition-transform">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${event.is_holiday ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-emerald-500 to-cyan-500'}`}>
                                        {event.is_holiday ? <IconSun className="w-5 h-5 text-white" /> : <IconCalendar className="w-5 h-5 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{event.name}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                            <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 dark:bg-slate-700 dark:text-slate-200 text-[10px] uppercase">{getDaysUntil(event.date)}</span>
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <IconCalendar className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">No upcoming events</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="panel xl:col-span-1 p-5 shadow-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f1726]">
                    <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold text-lg dark:text-white">Quick Navigation</h5>
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">Shortcuts</span>
                    </div>
                    <div className="space-y-3">
                        <Link to="/employee/chat" className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-white to-slate-50 dark:from-[#172036] dark:to-[#101827] hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <IconMenuChat className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Chat System</p>
                                <p className="text-xs text-slate-500">Message your team</p>
                            </div>
                        </Link>
                        <Link to="/employee/calendar" className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-white to-slate-50 dark:from-[#172036] dark:to-[#101827] hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <IconCalendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Calendar</p>
                                <p className="text-xs text-slate-500">View holidays and events</p>
                            </div>
                        </Link>
                        <Link to="/employee/asset-requests" className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-white to-slate-50 dark:from-[#172036] dark:to-[#101827] hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <IconListCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Asset Requests</p>
                                <p className="text-xs text-slate-500">Request or track assets</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
            {checkinIntroPortal}
        </>
    );
};

export default EmployeeDashboard;
