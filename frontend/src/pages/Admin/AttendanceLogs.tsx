import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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
    daily_attendance: DailyRecord[];
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const monthKey = (y: number, m0: number) => `${y}-${pad2(m0 + 1)}`;

const daysInMonth = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

const dateISO = (y: number, m0: number, d: number) => `${y}-${pad2(m0 + 1)}-${pad2(d)}`;

const AdminAttendanceLogs = () => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'Present' | 'Absent' | 'Leave' | 'Half Day'>('all');

    const now = useMemo(() => new Date(), []);
    const [year, setYear] = useState(now.getFullYear());
    const [month0, setMonth0] = useState(now.getMonth()); // 0-based

    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

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
            const resp = await fetch(url.toString(), { headers: headers() });
            const data = await resp.json().catch(() => null);
            if (!resp.ok) throw new Error(data?.detail || data?.error || 'Failed to load attendance logs');
            const arr: AttendanceRecord[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
            setRecords(arr);
        } catch (e: any) {
            setRecords([]);
            Swal.fire('Error', e?.message || 'Failed to load attendance logs', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month0]);

    const monthDates = useMemo(() => {
        const n = daysInMonth(year, month0);
        return Array.from({ length: n }, (_, i) => dateISO(year, month0, i + 1));
    }, [year, month0]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let arr = records;
        if (q) {
            arr = arr.filter((r) => (r.employee_name || '').toLowerCase().includes(q) || (r.employee_id || '').toLowerCase().includes(q));
        }
        if (selectedStatus !== 'all') {
            const todayIso = new Date().toISOString().slice(0, 10);
            arr = arr.filter((r) => {
                const d = r.daily_attendance?.find((x) => x.date === todayIso);
                return (d?.status || 'Absent') === selectedStatus;
            });
        }
        return arr;
    }, [records, search, selectedStatus]);

    const statusChip = (status: string) => {
        const base = 'w-7 h-7 rounded text-white text-xs font-semibold flex items-center justify-center transition-all duration-150';
        const s = (status || '-').toLowerCase();
        if (s === 'present') return { cls: `${base} bg-success`, label: 'P' };
        if (s === 'absent') return { cls: `${base} bg-danger`, label: 'A' };
        if (s === 'leave') return { cls: `${base} bg-info`, label: 'L' };
        if (s === 'half day') return { cls: `${base} bg-warning text-black`, label: 'H' };
        if (s === 'holiday') return { cls: `${base} bg-secondary`, label: 'Hol' };
        return { cls: `${base} bg-gray-400`, label: '-' };
    };

    const showTip = (e: React.MouseEvent, text: string) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, text });
    };

    const hideTip = () => setTooltip(null);

    const renderDayCell = (r: AttendanceRecord, day: string) => {
        const d = r.daily_attendance?.find((x) => x.date === day);
        const s = d?.status || '-';
        const chip = statusChip(s);
        const tipParts: string[] = [`Date: ${day}`, `Status: ${s}`];
        if (d?.check_in) tipParts.push(`Check-in: ${d.check_in}`);
        if (d?.check_out) tipParts.push(`Check-out: ${d.check_out}`);
        if (typeof d?.worked_hours === 'number') tipParts.push(`Worked: ${d.worked_hours}h`);
        if (typeof d?.break_time === 'number' && d.break_time) tipParts.push(`Break: ${d.break_time}h`);
        if (typeof d?.overtime_hours === 'number' && d.overtime_hours) tipParts.push(`Overtime: ${d.overtime_hours}h`);
        if (d?.leave_type) tipParts.push(`Leave: ${d.leave_type}`);
        if (d?.remarks) tipParts.push(`Remarks: ${d.remarks}`);
        const tip = tipParts.join('\n');

        return (
            <td key={day} className="px-2 py-2">
                <div
                    className={chip.cls}
                    onMouseEnter={(ev) => showTip(ev, tip)}
                    onMouseLeave={hideTip}
                    role="button"
                    tabIndex={0}
                    onFocus={(ev) => showTip(ev as any, tip)}
                    onBlur={hideTip}
                >
                    {chip.label}
                </div>
            </td>
        );
    };

    return (
        <div className="panel p-0 overflow-hidden">
            <div className="p-5 border-b border-white-light dark:border-[#1b2e4b]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="text-xl font-bold">Attendance Logs</div>
                        <div className="text-sm text-white-dark">Monthly attendance grid per employee.</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select className="form-select w-28" value={month0} onChange={(e) => setMonth0(Number(e.target.value))}>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i} value={i}>
                                    {new Date(2000, i, 1).toLocaleString(undefined, { month: 'short' })}
                                </option>
                            ))}
                        </select>
                        <input
                            className="form-input w-28"
                            type="number"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))}
                            min={2000}
                            max={2100}
                        />
                        <select className="form-select w-40" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
                            <option value="all">All</option>
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Leave">Leave</option>
                            <option value="Half Day">Half Day</option>
                        </select>
                        <div className="relative">
                            <input className="form-input w-72 pr-10" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white-dark">
                                <IconSearch className="w-4 h-4" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative">
                {tooltip && (
                    <div
                        ref={tooltipRef}
                        className="fixed z-50 whitespace-pre-line rounded bg-[#0e1726] text-white text-xs px-3 py-2 shadow-lg border border-white/10"
                        style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
                    >
                        {tooltip.text}
                    </div>
                )}

                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th className="w-[260px]">Employee</th>
                                <th className="w-[120px]">Employee ID</th>
                                <th className="w-[180px]">Department</th>
                                <th className="w-[130px] text-center">% Present</th>
                                {monthDates.map((d) => (
                                    <th key={d} className="text-center min-w-[44px]">
                                        {d.slice(-2)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4 + monthDates.length} className="text-center py-10 text-white-dark">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4 + monthDates.length} className="text-center py-10 text-white-dark">
                                        No attendance records found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r) => (
                                    <tr key={`${r.employee_id}-${r.month}`}>
                                        <td className="font-semibold">{r.employee_name || '-'}</td>
                                        <td>{r.employee_id || '-'}</td>
                                        <td>{r.department || '-'}</td>
                                        <td className="text-center">{typeof r.percentage_present === 'number' ? `${r.percentage_present}%` : '-'}</td>
                                        {monthDates.map((d) => renderDayCell(r, d))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminAttendanceLogs;

