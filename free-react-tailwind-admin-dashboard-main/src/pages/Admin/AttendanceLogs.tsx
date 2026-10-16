import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import DataTable, { Column } from '../../components/Common/DataTable';
import { Fragment } from 'react';
import IconX from '../../components/Icon/IconX';
import IconCalendar from '../../components/Icon/IconCalendar';
import PageHeader from '../../components/Common/PageHeader';

import Modal from '../../components/Common/Modal';
import Button from '../../components/Common/Button';
import { Dot, type Summary as PresenceSummary } from '../Employee/PresenceCard';
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
    source?: 'teams' | 'manual' | 'admin';
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
        working_hours: '',
        remarks: '',
    });
    const [saving, setSaving] = useState(false);
    const [modalTab, setModalTab] = useState<'adjust' | 'teams'>('adjust');
    const [teams, setTeams] = useState<PresenceSummary | null>(null);
    const [teamsLoading, setTeamsLoading] = useState(false);

    useEffect(() => {
        if (!editModalOpen || modalTab !== 'teams' || !editingData) return;
        let stop = false;
        setTeams(null);
        setTeamsLoading(true);
        const q = new URLSearchParams({ date: editingData.date, employee_code: editingData.employee.employee_id });
        fetch(`${API_BASE_URL}/employee/presence-summary/?${q}`, { headers: headers() })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => !stop && setTeams(d))
            .catch(() => !stop && setTeams(null))
            .finally(() => !stop && setTeamsLoading(false));
        return () => {
            stop = true;
        };
    }, [editModalOpen, modalTab, editingData?.date, editingData?.employee.employee_id]);

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
            return { cls: `${base} bg-brand-accent/15 text-brand-accent dark:text-brand-accent ring-1 ring-brand-accent/30`, label: '★' };
        }
        if (isFuture || status === 'Upcoming') {
            return { cls: `${base} bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border border-dashed border-gray-200 dark:border-gray-700`, label: '—' };
        }
        if (s === 'present') return { cls: `${base} bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30`, label: 'P' };
        if (s === 'absent') return { cls: `${base} bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30`, label: 'A' };
        if (s === 'leave') return { cls: `${base} bg-brand-500/15 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500/30`, label: 'L' };
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
            working_hours: record && record.worked_hours ? String(record.worked_hours) : '',
            remarks: record?.remarks || '',
        });
        setModalTab('adjust');
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
                    working_hours: editForm.status === 'Present' && editForm.working_hours !== '' ? Number(editForm.working_hours) : undefined,
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

    const handleResetToTeams = async () => {
        if (!editingData) return;
        setSaving(true);
        try {
            const resp = await fetch(`${API_BASE_URL}/app/attendance-logs/`, {
                method: 'POST',
                headers: { ...headers(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: editingData.employee.employee_id, date: editingData.date, reset: true }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Failed to reset');
            setEditModalOpen(false);
            await fetchMonth();
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
            <div className={isFuture && !isHolidayCell ? 'opacity-35' : ''}>
                <div
                    className={`${chip.cls} mx-auto hover:scale-110 hover:shadow-sm cursor-pointer`}
                    onMouseEnter={(ev) => showTip(ev, tipParts.join('\n'))}
                    onMouseLeave={hideTip}
                    role="button"
                    tabIndex={0}
                    onFocus={(ev) => showTip(ev as any, tipParts.join('\n'))}
                    onBlur={hideTip}
                    onClick={() => {
                        const canEdit = day.iso <= todayISO;
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
                {!isFuture && typeof d?.worked_hours === 'number' && d.worked_hours > 0 && (
                    <p className="text-[10px] font-semibold text-center text-gray-500 dark:text-gray-400 mt-0.5" title={d.source === 'admin' ? 'Edited by admin' : d.source === 'teams' ? 'From Microsoft Teams' : 'From punches'}>
                        {d.worked_hours}h{d.source === 'admin' ? ' ✎' : ''}
                    </p>
                )}
            </div>
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

    const columns: Column<AttendanceRecord>[] = [
        {
            key: 'employee_name', title: 'Employee', sticky: true, width: '200px',
            render: (_v, r) => (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(r.employee_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm truncate max-w-[140px]" title={r.employee_name}>{r.employee_name || '-'}</span>
                </div>
            ),
        },
        { key: 'employee_id', title: 'ID', render: (v) => <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{v || '-'}</span> },
        { key: 'department', title: 'Department', render: (v) => <span className="text-xs text-gray-500 dark:text-gray-400">{v || '-'}</span> },
        {
            key: 'percentage_present', title: 'Attendance', align: 'center',
            render: (_v, r) => {
                const pct = typeof r.percentage_present === 'number' ? r.percentage_present : 0;
                return (
                    <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-bold ${pctColor(pct)}`}>{pct}%</span>
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${pctBg(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                        </div>
                    </div>
                );
            },
        },
        ...monthDates.map((d): Column<AttendanceRecord> => ({
            key: `day-${d.iso}`,
            align: 'center',
            headerClassName: `!px-1 !py-2 min-w-[36px] ${d.iso > todayISO ? 'opacity-40' : ''}`,
            className: '!px-0.5 !py-1.5',
            header: (
                <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${d.iso === todayISO ? 'text-brand-500' : 'text-gray-400'}`}>{d.dayName}</span>
                    <span className={`text-xs font-bold ${d.iso === todayISO ? 'text-brand-600 dark:text-brand-400' : ''}`}>{pad2(d.dayNum)}</span>
                    {d.iso === todayISO && <span className="w-1 h-1 rounded-full bg-brand-500 mt-0.5"></span>}
                </div>
            ),
            render: (_v, r) => renderDayCell(r, d),
        })),
    ];

    return (
        <div className="space-y-6">
            {/* ─── Executive Page Header ─── */}
            <PageHeader
                title="Attendance Logs"
                subtitle={`${MONTH_NAMES[month0]} ${year} — Monthly attendance overview, check-in logs, and workforce punctuality records.`}
                icon={<IconCalendar />}
                badge="Time & Attendance"
                variant="indigo"
            />

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

            <DataTable
                columns={columns}
                data={records}
                loading={loading}
                rowKey={(r) => `${r.employee_id}-${r.month}`}
                compact
                entityLabel="employees"
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(v) => { setSearch(v); resetPage(); }}
                onRefresh={fetchMonth}
                searchPlaceholder="Search by name or ID..."
                emptyMessage="No attendance records found"
                filters={
                    <>
                        <select className="form-select w-24 h-10 text-sm rounded-xl" value={month0} onChange={(e) => { setMonth0(Number(e.target.value)); resetPage(); }} title="Month">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i} value={i}>{new Date(2000, i, 1).toLocaleString(undefined, { month: 'short' })}</option>
                            ))}
                        </select>
                        <input className="form-input w-24 h-10 text-sm rounded-xl" type="number" title="Year" value={year} min={2000} max={2100} onChange={(e) => { setYear(Number(e.target.value || now.getFullYear())); resetPage(); }} />
                        <select className="form-select w-44 h-10 text-sm rounded-xl" value={selectedDept} onChange={(e) => { setSelectedDept(e.target.value); resetPage(); }}>
                            <option value="all">All Departments</option>
                            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="form-select w-36 h-10 text-sm rounded-xl" value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); resetPage(); }}>
                            <option value="all">All Status</option>
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Leave">Leave</option>
                            <option value="Half Day">Half Day</option>
                        </select>
                    </>
                }
            />

            <div className="flex flex-wrap items-center gap-5 px-1">
                {[
                    { label: 'Present', cls: 'bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30', char: 'P' },
                    { label: 'Absent', cls: 'bg-red-500/15 text-red-600 ring-1 ring-red-500/30', char: 'A' },
                    { label: 'Leave', cls: 'bg-brand-500/15 text-brand-600 ring-1 ring-brand-500/30', char: 'L' },
                    { label: 'Half Day', cls: 'bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30', char: 'H' },
                    { label: 'Holiday / off day', cls: 'bg-brand-accent/15 text-brand-accent ring-1 ring-brand-accent/30', char: '★' },
                    ...(isCurrentOrFutureMonth ? [{ label: 'Upcoming', cls: 'bg-gray-100 text-gray-300 border border-dashed border-gray-200', char: '—' }] : []),
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className={`w-5 h-5 rounded-md text-[9px] font-bold flex items-center justify-center ${item.cls}`}>{item.char}</span>
                        {item.label}
                    </div>
                ))}
            </div>

            {/* ─── Edit Attendance Modal ─── */}
            <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Manual Attendance Adjustment" size="lg">
                <div className="space-y-5">
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

                                                        <div className="flex gap-1 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                                            {([['adjust', 'Adjustment'], ['teams', 'Teams breakdown']] as const).map(([k, label]) => (
                                                                <button
                                                                    key={k}
                                                                    type="button"
                                                                    onClick={() => setModalTab(k)}
                                                                    className={`px-4 py-2 text-sm font-bold -mb-px border-b-2 ${modalTab === k ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                                                                >
                                                                    {label}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {modalTab === 'teams' && (
                                                            <div className="space-y-4">
                                                                {teamsLoading && <p className="text-sm text-white-dark">Loading Teams activity...</p>}
                                                                {!teamsLoading && !(teams && (teams.statuses?.length || teams.timeline?.length)) && (
                                                                    <p className="text-sm text-white-dark">No Teams activity recorded for this day.</p>
                                                                )}
                                                                {teams && (!!teams.statuses?.length || !!teams.timeline?.length) && (
                                                                    <>
                                                                        <div className="grid grid-cols-3 gap-3 text-center">
                                                                            <div className="rounded-xl bg-gray-100 dark:bg-white/5 py-3">
                                                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Working</p>
                                                                                <p className="text-lg font-black">{teams.working?.label || '0h 00m'}</p>
                                                                            </div>
                                                                            <div className="rounded-xl bg-gray-100 dark:bg-white/5 py-3">
                                                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Overtime</p>
                                                                                <p className="text-lg font-black">{teams.overtime?.label || '0h 00m'}</p>
                                                                            </div>
                                                                            <div className="rounded-xl bg-gray-100 dark:bg-white/5 py-3">
                                                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Punch</p>
                                                                                <p className="text-sm font-bold mt-1.5">{teams.punch?.in || '--:--'} / {teams.punch?.out || '--:--'}</p>
                                                                            </div>
                                                                        </div>
                                                                        {teams.shift?.assigned && (
                                                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm space-y-1.5">
                                                                                <div className="flex justify-between"><span>{teams.shift.type || 'Shift'}</span><b>{teams.shift.start} – {teams.shift.end}</b></div>
                                                                                <div className="flex justify-between"><span>Working hours in shift</span><b>{teams.shift.working?.label}</b></div>
                                                                                <div className="flex justify-between"><span>Outside shift timings</span><b>{teams.shift.outside?.label}</b></div>
                                                                            </div>
                                                                        )}
                                                                        {!!teams.statuses?.length && (
                                                                            <section>
                                                                                <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Time by status</h5>
                                                                                <div className="space-y-1.5">
                                                                                    {teams.statuses.map((r) => (
                                                                                        <div key={r.status} className="flex items-center justify-between text-sm">
                                                                                            <span className="flex items-center gap-2"><Dot c={r.status} /> {r.status}</span>
                                                                                            <b>{r.label}</b>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </section>
                                                                        )}
                                                                        {!!teams.timeline?.length && (
                                                                            <section>
                                                                                <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Status timeline</h5>
                                                                                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                                                                    {teams.timeline.map((t, i) => (
                                                                                        <div key={i} className="flex items-center justify-between text-sm">
                                                                                            <span className="flex items-center gap-2"><Dot c={t.status} /> {t.status}</span>
                                                                                            <span className="text-gray-600 dark:text-gray-300">{t.start} – {t.end} <span className="text-gray-400">({t.label})</span></span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </section>
                                                                        )}
                                                                        {!!teams.sessions?.length && (
                                                                            <section>
                                                                                <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Working sessions</h5>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {teams.sessions.map((x, i) => (
                                                                                        <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5">{x.start} – {x.end}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </section>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className={`space-y-4 ${modalTab !== 'adjust' ? 'hidden' : ''}`}>
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
                                                                    <div>
                                                                        <label className="text-sm font-bold mb-2 block text-gray-700 dark:text-gray-300">Working Hours (hrs)</label>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="24"
                                                                            step="0.25"
                                                                            className="form-input"
                                                                            placeholder="e.g. 7.5"
                                                                            value={editForm.working_hours}
                                                                            onChange={(e) => setEditForm({ ...editForm, working_hours: e.target.value })}
                                                                        />
                                                                        <p className="text-[11px] text-white-dark mt-1">
                                                                            {editingData?.record?.source === 'admin'
                                                                                ? 'Edited by admin — overrides Teams data for this day.'
                                                                                : editingData?.record?.source === 'teams'
                                                                                ? 'Currently from Microsoft Teams status. Saving will override it for this day.'
                                                                                : 'Leave blank to use login/logout difference.'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-[11px] text-white-dark bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                                                        Standard Shift: <span className="font-bold">{editingData?.employee?.shift_info?.checkin} - {editingData?.employee?.shift_info?.checkout}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                            <div className={modalTab !== 'adjust' ? 'hidden' : ''}>
                                                                <label className="text-sm font-bold mb-2 block text-gray-700 dark:text-gray-300">Administrative Remarks</label>
                                                                <textarea
                                                                    className="form-textarea min-h-[100px]"
                                                                    placeholder="Reason for manual adjustment..."
                                                                    value={editForm.remarks}
                                                                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                                                                ></textarea>
                                                            </div>
                                                        </div>
                                                    <div className={`flex items-center justify-end p-5 border-t border-[#ebedf2] dark:border-[#1b2e4b] gap-3 ${modalTab !== 'adjust' ? 'hidden' : ''}`}>
                                                        {editingData?.record?.source === 'admin' && (
                                                            <Button variant="outline-danger" type="button" onClick={handleResetToTeams} disabled={saving}>
                                                                Reset to Teams
                                                            </Button>
                                                        )}
                                                        <Button variant="outline-danger" type="button"  onClick={() => setEditModalOpen(false)}>
                                                            Cancel
                                                        </Button>
                                                        <Button type="button"  onClick={handleSaveAttendance} disabled={saving}>
                                                            {saving ? 'Updating...' : 'Update Attendance'}
                                                        </Button>
                                                    </div>
            </Modal>
        </div>
    );
};

export default AdminAttendanceLogs;
