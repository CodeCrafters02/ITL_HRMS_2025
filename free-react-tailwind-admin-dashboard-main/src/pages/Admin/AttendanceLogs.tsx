import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import IconX from '../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type DeptWorkingDayConfig = {
    working_days?: string[];
};

type DailyRecord = {
    date: string;
    status: string;
    check_in: string | null;
    check_out: string | null;
    worked_hours: number;
    scheduled_hours: number;
    break_time: number;
    overtime_hours: number;
    is_late: boolean;
    late_by_minutes: number;
    early_departure: boolean;
    early_departure_minutes: number;
    leave_type: string | null;
    leave_type_initials: string | null;
    half_day: boolean;
    remarks: string;
    shift_type: string | null;
};

type AttendanceRecord = {
    employee_id: string;
    employee_name: string;
    department: string | null;
    month: string;
    percentage_present: number;
    total_present_days: number;
    total_absent_days: number;
    total_leave_days: number;
    total_working_days: number;
    total_late_days: number;
    daily_attendance: DailyRecord[];
    shift_info: {
        full_day: number;
        half_day: number;
        checkin: string;
        checkout: string;
    };
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const monthKey = (y: number, m0: number) => `${y}-${pad2(m0 + 1)}`;
const daysInMonth = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();
const dateISO = (y: number, m0: number, d: number) => `${y}-${pad2(m0 + 1)}-${pad2(d)}`;

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const AdminAttendanceLogs = () => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedDept, setSelectedDept] = useState('all');
    const [departments, setDepartments] = useState<string[]>([]);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const now = useMemo(() => new Date(), []);
    const [year, setYear] = useState(now.getFullYear());
    const [month0, setMonth0] = useState(now.getMonth());

    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<{
        employee: AttendanceRecord;
        record: DailyRecord | null;
        date: string;
    } | null>(null);
    const [editForm, setEditForm] = useState({
        status: 'Present',
        check_in: '',
        check_out: '',
        remarks: '',
    });
    const [saving, setSaving] = useState(false);

    const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);

    // JS getDay() index → day name matching DepartmentWiseWorkingDays.working_days values
    const JS_DAY_TO_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Off-day names derived from dept working days config (default Sat/Sun until loaded)
    const [offDayNames, setOffDayNames] = useState<Set<string>>(new Set(['Saturday', 'Sunday']));
    // ISO date strings of company holidays
    const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());

    // Fetch dept working days + calendar holidays once on mount
    useEffect(() => {
        const loadCalendarConfig = async () => {
            try {
                const h = headers();
                const [wdRes, holRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/app/department-working-days/`, { headers: h }),
                    fetch(`${API_BASE_URL}/app/calendar-events/`, { headers: h }),
                ]);
                if (wdRes.ok) {
                    const wdData = await wdRes.json();
                    const configs: DeptWorkingDayConfig[] = Array.isArray(wdData) ? wdData : wdData?.results || [];
                    if (configs.length > 0) {
                        // A day is a working day if ANY department works on it
                        const allWorkingDays = new Set<string>();
                        configs.forEach((c) => (c.working_days || []).forEach((d: string) => allWorkingDays.add(d)));
                        setOffDayNames(new Set(ALL_DAYS.filter((d) => !allWorkingDays.has(d))));
                    }
                }
                if (holRes.ok) {
                    const holData = await holRes.json();
                    const events: any[] = Array.isArray(holData) ? holData : holData?.results || [];
                    setHolidayDates(new Set(events.filter((e) => e.is_holiday).map((e) => e.date as string)));
                }
            } catch {
                // keep defaults
            }
        };
        loadCalendarConfig();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Walk back from yesterday skipping off-days and public holidays
    const lastWorkingDayISO = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        for (let i = 0; i < 14; i++) {
            const dayName = JS_DAY_TO_NAME[d.getDay()];
            const iso = d.toISOString().split('T')[0];
            if (!offDayNames.has(dayName) && !holidayDates.has(iso)) return iso;
            d.setDate(d.getDate() - 1);
        }
        // Fallback: yesterday regardless
        const fb = new Date();
        fb.setDate(fb.getDate() - 1);
        return fb.toISOString().split('T')[0];
    }, [offDayNames, holidayDates]);

    useEffect(() => {
        dispatch(setPageTitle('Attendance Logs'));
    }, [dispatch]);

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = {};
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const fetchMonth = async () => {
        setLoading(true);
        try {
            const mk = monthKey(year, month0);
            const url = new URL(`${API_BASE_URL}/app/attendance-logs/`);
            url.searchParams.set('month', mk);
            url.searchParams.set('page', String(page));
            url.searchParams.set('page_size', String(pageSize));
            if (search.trim()) url.searchParams.set('search', search.trim());
            if (selectedDept && selectedDept !== 'all') url.searchParams.set('department', selectedDept);
            if (selectedStatus && selectedStatus !== 'all') url.searchParams.set('status', selectedStatus);

            const resp = await fetch(url.toString(), { headers: headers() });
            const data = await resp.json().catch(() => null);
            if (!resp.ok) throw new Error(data?.detail || data?.error || 'Failed to load attendance logs');

            const results = data?.results ?? data;
            const arr: AttendanceRecord[] = Array.isArray(results) ? results : [];
            setRecords(arr);

            const count = Number(data?.count ?? arr.length);
            setTotalCount(count);
            setTotalPages(Math.max(1, data?.total_pages ?? Math.ceil(count / pageSize)));

            if (data?.departments && Array.isArray(data.departments)) {
                setDepartments(data.departments);
            }
        } catch (e: any) {
            setRecords([]);
            Swal.fire('Error', e?.message || 'Failed to load attendance logs', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => fetchMonth(), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month0, page, pageSize, search, selectedDept, selectedStatus]);

    const resetPage = () => setPage(1);

    const monthDates = useMemo(() => {
        const n = daysInMonth(year, month0);
        return Array.from({ length: n }, (_, i) => {
            const iso = dateISO(year, month0, i + 1);
            const dayOfWeek = new Date(year, month0, i + 1).getDay();
            return { iso, dayName: DAY_NAMES_SHORT[dayOfWeek], dayNum: i + 1 };
        });
    }, [year, month0]);

    const statusChip = (status: string, isFuture: boolean) => {
        const base = 'w-7 h-7 rounded-md text-[10px] font-bold flex items-center justify-center cursor-default select-none transition-all duration-200';
        const s = (status || '-').toLowerCase();
        if (s === 'holiday') {
            return { cls: `${base} bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/30`, label: '★' };
        }
        if (isFuture || status === 'Upcoming') {
            return { cls: `${base} bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border border-dashed border-gray-200 dark:border-gray-700`, label: '—' };
        }
        if (s === 'present') return { cls: `${base} bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30`, label: 'P' };
        if (s === 'absent') return { cls: `${base} bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30`, label: 'A' };
        if (s === 'leave') return { cls: `${base} bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30`, label: 'L' };
        if (s === 'half day') return { cls: `${base} bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30`, label: 'H' };
        return { cls: `${base} bg-gray-200 dark:bg-gray-700 text-gray-500`, label: '-' };
    };

    const showTip = (e: React.MouseEvent, text: string) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, text });
    };
    const hideTip = () => setTooltip(null);

    const openEditModal = (emp: AttendanceRecord, record: DailyRecord | undefined, isoDate: string) => {
        setEditingData({ employee: emp, record: record || null, date: isoDate });
        setEditForm({
            status: record?.status || 'Present',
            check_in: record?.check_in || '09:00',
            check_out: record?.check_out || '18:00',
            remarks: record?.remarks || '',
        });
        setEditModalOpen(true);
    };

    const handleSaveAttendance = async () => {
        if (!editingData) return;
        setSaving(true);
        try {
            const resp = await fetch(`${API_BASE_URL}/app/attendance-logs/`, {
                method: 'POST',
                headers: {
                    ...headers(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employee_id: editingData.employee.employee_id,
                    date: editingData.date,
                    status: editForm.status,
                    check_in: editForm.status === 'Present' ? editForm.check_in : null,
                    check_out: editForm.status === 'Present' ? (editForm.check_out || null) : null,
                    remarks: editForm.remarks,
                }),
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Failed to update attendance');

            setEditModalOpen(false);
            await fetchMonth();
            Swal.fire({
                title: 'Success',
                text: 'Attendance updated successfully',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                customClass: { popup: 'sweet-alerts' },
            });
        } catch (e: any) {
            Swal.fire('Error', e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const renderDayCell = (r: AttendanceRecord, day: { iso: string; dayName: string; dayNum: number }) => {
        const isFuture = day.iso > todayISO;
        const d = r.daily_attendance?.find((x) => x.date === day.iso);
        const s = d?.status || (isFuture ? 'Upcoming' : '-');
        const isHolidayCell = (s || '').toLowerCase() === 'holiday';
        const chip = statusChip(s, isFuture && !isHolidayCell);

        const dateObj = new Date(day.iso + 'T00:00:00');
        const fullDayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const tipParts: string[] = [`${fullDayName}, ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`];

        if (isFuture && !isHolidayCell) {
            tipParts.push('Status: Upcoming');
        } else {
            tipParts.push(`Status: ${s}`);
            if (d?.check_in) tipParts.push(`Check-in: ${d.check_in}`);
            if (d?.check_out) tipParts.push(`Check-out: ${d.check_out}`);
            if (typeof d?.worked_hours === 'number' && d.worked_hours > 0) tipParts.push(`Worked: ${d.worked_hours}h`);
            if (typeof d?.break_time === 'number' && d.break_time) tipParts.push(`Break: ${d.break_time}h`);
            if (typeof d?.overtime_hours === 'number' && d.overtime_hours) tipParts.push(`OT: ${d.overtime_hours}h`);
            if (d?.is_late) tipParts.push(`⚠️ Late by ${d.late_by_minutes} min`);
            if (d?.leave_type) tipParts.push(`Leave: ${d.leave_type}`);
            if (d?.remarks && d.remarks !== 'No attendance record') tipParts.push(`Note: ${d.remarks}`);
        }

        return (
            <td key={day.iso} className={`px-0.5 py-1.5 text-center ${isFuture && !isHolidayCell ? 'opacity-35' : ''}`}>
                <div
                    className={`${chip.cls} mx-auto hover:scale-110 hover:shadow-sm cursor-pointer`}
                    onMouseEnter={(ev) => showTip(ev, tipParts.join('\n'))}
                    onMouseLeave={hideTip}
                    role="button"
                    tabIndex={0}
                    onFocus={(ev) => showTip(ev as any, tipParts.join('\n'))}
                    onBlur={hideTip}
                    onClick={() => {
                        const canEdit = (day.iso === lastWorkingDayISO || day.iso === todayISO);
                        if (canEdit) {
                            openEditModal(r, d, day.iso);
                        } else {
                            Swal.fire({
                                title: 'Restricted',
                                text: `You can only edit attendance for today or the last working day.`,
                                icon: 'info',
                                timer: 2500,
                                showConfirmButton: false,
                                customClass: { popup: 'sweet-alerts' },
                            });
                        }
                    }}
                >
                    {chip.label}
                </div>
            </td>
        );
    };

    // Percentage color helper
    const pctColor = (pct: number) => {
        if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400';
        if (pct >= 70) return 'text-amber-600 dark:text-amber-400';
        return 'text-red-600 dark:text-red-400';
    };
    const pctBg = (pct: number) => {
        if (pct >= 90) return 'bg-emerald-500';
        if (pct >= 70) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const isCurrentOrFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month0 >= now.getMonth());

    // Generate smart page numbers
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="space-y-6">
            {/* ─── Gradient Banner ─── */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#3b82f6] p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Attendance Logs</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        {MONTH_NAMES[month0]} {year} — Monthly attendance overview for all employees.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 right-32 -mb-8 w-32 h-32 bg-cyan-400 opacity-10 rounded-full blur-2xl"></div>
            </div>

            {/* ─── Filters Bar ─── */}
            <div className="panel p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Month */}
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</label>
                        <select className="form-select w-28 text-sm py-1.5" value={month0} onChange={(e) => { setMonth0(Number(e.target.value)); resetPage(); }}>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i} value={i}>{new Date(2000, i, 1).toLocaleString(undefined, { month: 'short' })}</option>
                            ))}
                        </select>
                    </div>

                    {/* Year */}
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Year</label>
                        <input
                            className="form-input w-24 text-sm py-1.5"
                            type="number"
                            value={year}
                            onChange={(e) => { setYear(Number(e.target.value || now.getFullYear())); resetPage(); }}
                            min={2000}
                            max={2100}
                        />
                    </div>

                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    {/* Department */}
                    <select
                        className="form-select w-44 text-sm py-1.5"
                        value={selectedDept}
                        onChange={(e) => { setSelectedDept(e.target.value); resetPage(); }}
                    >
                        <option value="all">All Departments</option>
                        {departments.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>

                    {/* Status */}
                    <select
                        className="form-select w-36 text-sm py-1.5"
                        value={selectedStatus}
                        onChange={(e) => { setSelectedStatus(e.target.value); resetPage(); }}
                    >
                        <option value="all">All Status</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Leave">Leave</option>
                        <option value="Half Day">Half Day</option>
                    </select>

                    {/* Search */}
                    <div className="relative ml-auto">
                        <input
                            className="form-input w-64 pr-10 text-sm py-1.5"
                            placeholder="Search by name or ID..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {[
                        { label: 'Present', cls: 'bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30', char: 'P' },
                        { label: 'Absent', cls: 'bg-red-500/15 text-red-600 ring-1 ring-red-500/30', char: 'A' },
                        { label: 'Leave', cls: 'bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30', char: 'L' },
                        { label: 'Half Day', cls: 'bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30', char: 'H' },
                        { label: 'Holiday / off day', cls: 'bg-purple-500/15 text-purple-600 ring-1 ring-purple-500/30', char: '★' },
                        ...(isCurrentOrFutureMonth ? [{ label: 'Upcoming', cls: 'bg-gray-100 text-gray-300 border border-dashed border-gray-200', char: '—' }] : []),
                    ].map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <span className={`w-5 h-5 rounded-md text-[9px] font-bold flex items-center justify-center ${item.cls}`}>{item.char}</span>
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Attendance Grid ─── */}
            <div className="panel p-0 border-0 overflow-hidden">
                <div className="relative">
                    {tooltip && (
                        <div
                            ref={tooltipRef}
                            className="fixed z-50 whitespace-pre-line rounded-lg bg-[#0e1726] text-white text-xs px-4 py-2.5 shadow-xl border border-white/10 max-w-xs"
                            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
                        >
                            {tooltip.text}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#0e1726]"></div>
                        </div>
                    )}

                    <div className="table-responsive">
                        <table className="table-hover text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-[#1a2941]">
                                    <th className="!py-3 w-[200px] sticky left-0 bg-gray-50 dark:bg-[#1a2941] z-10">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</span>
                                    </th>
                                    <th className="!py-3 w-[100px]">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">ID</span>
                                    </th>
                                    <th className="!py-3 w-[140px]">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Department</span>
                                    </th>
                                    <th className="!py-3 w-[100px] text-center">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Attendance</span>
                                    </th>
                                    {monthDates.map((d) => (
                                        <th
                                            key={d.iso}
                                            className={`!py-2 text-center min-w-[36px] ${d.iso > todayISO ? 'opacity-35' : ''} ${d.iso === todayISO ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                }`}
                                        >
                                            <div className="flex flex-col items-center leading-none gap-0.5">
                                                <span className={`text-[9px] font-semibold uppercase tracking-wider ${d.iso === todayISO ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
                                                    }`}>
                                                    {d.dayName}
                                                </span>
                                                <span className={`text-xs font-bold ${d.iso === todayISO ? 'text-blue-600 dark:text-blue-400' : ''
                                                    }`}>
                                                    {pad2(d.dayNum)}
                                                </span>
                                                {d.iso === todayISO && (
                                                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-0.5"></span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4 + monthDates.length} className="text-center py-16">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                <span className="text-sm text-gray-400">Loading attendance data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : records.length === 0 ? (
                                    <tr>
                                        <td colSpan={4 + monthDates.length} className="text-center py-16">
                                            <div className="flex flex-col items-center gap-2">
                                                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                <span className="text-sm font-medium text-gray-400">No attendance records found</span>
                                                <span className="text-xs text-gray-300 dark:text-gray-600">Try adjusting your filters or search criteria.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((r) => {
                                        const pct = typeof r.percentage_present === 'number' ? r.percentage_present : 0;
                                        return (
                                            <tr key={`${r.employee_id}-${r.month}`} className="hover:bg-gray-50/50 dark:hover:bg-[#1b2e4b]/50 transition-colors">
                                                <td className="!py-3 sticky left-0 bg-white dark:bg-[#0e1726] z-10">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                            {(r.employee_name || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-semibold text-sm truncate max-w-[140px]" title={r.employee_name}>
                                                            {r.employee_name || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="!py-3">
                                                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                                        {r.employee_id || '-'}
                                                    </span>
                                                </td>
                                                <td className="!py-3">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{r.department || '-'}</span>
                                                </td>
                                                <td className="!py-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`text-sm font-bold ${pctColor(pct)}`}>{pct}%</span>
                                                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ${pctBg(pct)}`}
                                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {monthDates.map((d) => renderDayCell(r, d))}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ─── Pagination ─── */}
                {totalCount > 0 && (
                    <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                                Showing <span className="text-primary">{(page - 1) * pageSize + 1}</span> to{' '}
                                <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                                <span className="text-primary">{totalCount}</span> employees
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Per page:</span>
                                <select
                                    className="form-select w-20 text-sm font-semibold py-1"
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>
                        <ul className="inline-flex items-center space-x-1 font-semibold">
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    Prev
                                </button>
                            </li>
                            {getPageNumbers().map((p, idx) =>
                                p === '...' ? (
                                    <li key={`dots-${idx}`}>
                                        <span className="px-2 text-gray-400">…</span>
                                    </li>
                                ) : (
                                    <li key={p}>
                                        <button
                                            type="button"
                                            className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${page === p
                                                ? 'bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]'
                                                : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'
                                                }`}
                                            onClick={() => setPage(p as number)}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                )
                            )}
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* ─── Edit Attendance Modal ─── */}
            <Transition appear show={editModalOpen} as={Fragment}>
                <Dialog as="div" open={editModalOpen} onClose={() => setEditModalOpen(false)} className="relative z-[51]">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel border-0 p-0 rounded-2xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl">
                                    <div className="flex items-center justify-between p-5 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        <h5 className="text-lg font-bold">Manual Attendance Adjustment</h5>
                                        <button type="button" onClick={() => setEditModalOpen(false)} className="text-white-dark hover:text-dark">
                                            <IconX />
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                                {editingData?.employee.employee_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white-light">{editingData?.employee.employee_name}</p>
                                                <p className="text-xs text-white-dark">
                                                    ID: {editingData?.employee.employee_id} • Date: {editingData?.date}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-sm font-bold mb-2 block text-gray-700 dark:text-gray-300 uppercase tracking-wider">Attendance Status</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['Present', 'Absent'].map((s) => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            className={`py-2.5 rounded-xl border-2 font-bold transition-all duration-200 ${
                                                                editForm.status === s
                                                                    ? 'border-primary bg-primary text-white shadow-lg'
                                                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 text-gray-500'
                                                            }`}
                                                            onClick={() => setEditForm({ ...editForm, status: s })}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {editForm.status === 'Present' && (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-sm font-bold mb-2 block text-gray-700 dark:text-gray-300">Login Time</label>
                                                            <input
                                                                type="time"
                                                                className="form-input"
                                                                value={editForm.check_in}
                                                                onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-bold mb-2 block text-gray-700 dark:text-gray-300">Logout Time</label>
                                                            <input
                                                                type="time"
                                                                className="form-input"
                                                                value={editForm.check_out}
                                                                onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="text-[11px] text-white-dark bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                                        Standard Shift: <span className="font-bold">{editingData?.employee?.shift_info?.checkin} - {editingData?.employee?.shift_info?.checkout}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                            <div>
                                                <label className="text-sm font-bold mb-2 block text-gray-700 dark:text-gray-300">Administrative Remarks</label>
                                                <textarea
                                                    className="form-textarea min-h-[100px]"
                                                    placeholder="Reason for manual adjustment..."
                                                    value={editForm.remarks}
                                                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                                                ></textarea>
                                            </div>
                                        </div>
                                    <div className="flex items-center justify-end p-5 border-t border-[#ebedf2] dark:border-[#1b2e4b] gap-3">
                                        <button type="button" className="btn btn-outline-danger" onClick={() => setEditModalOpen(false)}>
                                            Cancel
                                        </button>
                                        <button type="button" className="btn btn-primary" onClick={handleSaveAttendance} disabled={saving}>
                                            {saving ? 'Updating...' : 'Update Attendance'}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default AdminAttendanceLogs;
