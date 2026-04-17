import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type RawAttendance = {
    id?: number;
    employee_id?: string;
    employee_name?: string;
    date?: string;
    check_in?: string | null;
    check_out?: string | null;
    total_break_time?: string | number | null;
    total_work_duration?: string | number | null;
    overtime_duration?: string | number | null;
    is_late?: boolean;
    check_in_late?: boolean;
    is_present?: boolean;
    status?: string;
    leave?: number | null;
};

type AttendanceRow = {
    id?: number;
    employee_id: string;
    employee_name: string;
    date: string;
    check_in: string | null;
    check_out: string | null;
    break_time: string;
    total_hours: string;
    overtime: string;
    is_late: boolean;
    status: string;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const strTime = (v: any) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    return String(v);
};

const toCsv = (rows: AttendanceRow[]) => {
    const headers = ['Employee ID', 'Employee Name', 'Date', 'Check-In', 'Check-Out', 'Break Time', 'Total Hours', 'Overtime', 'Status', 'Late'];
    const escape = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const lines = [
        headers.map(escape).join(','),
        ...rows.map((r) =>
            [
                r.employee_id,
                r.employee_name,
                r.date,
                r.check_in || '',
                r.check_out || '',
                r.break_time,
                r.total_hours,
                r.overtime,
                r.status,
                r.is_late ? 'Yes' : 'No',
            ].map(escape).join(',')
        ),
    ];
    return lines.join('\n');
};

const downloadText = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const AdminAttendanceDetails = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<AttendanceRow[]>([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'All' | 'Present' | 'Absent' | 'Leave'>('All');
    const [fromDate, setFromDate] = useState(todayIso());
    const [toDate, setToDate] = useState(todayIso());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        dispatch(setPageTitle('Attendance Details'));
    }, [dispatch]);

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = {};
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/attendance/`);
            url.searchParams.set('page', String(page));
            url.searchParams.set('page_size', String(pageSize));
            if (fromDate) url.searchParams.set('from_date', fromDate);
            if (toDate) url.searchParams.set('to_date', toDate);
            if (search.trim()) url.searchParams.set('search', search.trim());
            if (status !== 'All') url.searchParams.set('status', status);

            const resp = await fetch(url.toString(), { headers: headers() });
            const data = await resp.json().catch(() => null);
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load attendance details');

            const list = data?.results ?? data;
            const rawArr: RawAttendance[] = Array.isArray(list) ? list : [];
            const mapped: AttendanceRow[] = rawArr.map((x) => {
                const isLate = Boolean(x.is_late || x.check_in_late);
                let st = x.status;
                if (!st) {
                    if (x.leave) st = 'Leave';
                    else if (x.check_in || x.is_present) st = 'Present';
                    else st = 'Absent';
                }
                return {
                    id: x.id,
                    employee_id: x.employee_id || '',
                    employee_name: x.employee_name || '',
                    date: x.date || '',
                    check_in: x.check_in || null,
                    check_out: x.check_out || null,
                    break_time: strTime(x.total_break_time || ''),
                    total_hours: strTime(x.total_work_duration || ''),
                    overtime: strTime(x.overtime_duration || ''),
                    is_late: isLate,
                    status: st || '',
                };
            });

            setItems(mapped);
            const count = Number(data?.count ?? mapped.length);
            setTotalCount(count);
            setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
        } catch (e: any) {
            setItems([]);
            Swal.fire('Error', e?.message || 'Failed to load attendance details', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => fetchAll(), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status, fromDate, toDate, page, pageSize]);

    const rows = useMemo(() => items, [items]);

    const badgeCls = (s: string, late: boolean) => {
        const base = 'px-2 py-1 rounded-full text-xs font-semibold';
        const k = (s || '').toLowerCase();
        if (k === 'present') return `${base} ${late ? 'bg-warning text-black' : 'bg-success text-white'}`;
        if (k === 'leave') return `${base} bg-info text-white`;
        if (k === 'absent') return `${base} bg-danger text-white`;
        return `${base} bg-secondary text-white`;
    };

    const exportCsv = () => {
        downloadText(`attendance_${fromDate}_to_${toDate}.csv`, toCsv(rows));
    };

    return (
        <div className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <div className="text-xl font-bold">Attendance Details</div>
                    <div className="text-sm text-white-dark">Filter by date range, status, and employee search.</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-outline-primary" onClick={exportCsv} disabled={rows.length === 0}>
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
                <div className="md:col-span-3">
                    <label className="text-xs text-white-dark">From</label>
                    <input
                        type="date"
                        className="form-input"
                        value={fromDate}
                        onChange={(e) => {
                            setFromDate(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="md:col-span-3">
                    <label className="text-xs text-white-dark">To</label>
                    <input
                        type="date"
                        className="form-input"
                        value={toDate}
                        onChange={(e) => {
                            setToDate(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="md:col-span-3">
                    <label className="text-xs text-white-dark">Status</label>
                    <select
                        className="form-select"
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value as any);
                            setPage(1);
                        }}
                    >
                        <option value="All">All</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Leave">Leave</option>
                    </select>
                </div>
                <div className="md:col-span-3">
                    <label className="text-xs text-white-dark">Search</label>
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10"
                            placeholder="Employee id / name..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white-dark">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table-hover">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Employee ID</th>
                            <th>Date</th>
                            <th>Check-in</th>
                            <th>Check-out</th>
                            <th>Break</th>
                            <th>Total</th>
                            <th>Overtime</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="text-center py-10 text-white-dark">
                                    Loading...
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-10 text-white-dark">
                                    No attendance records found.
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={String(r.id ?? `${r.employee_id}-${r.date}`)}>
                                    <td className="font-semibold">{r.employee_name || '-'}</td>
                                    <td>{r.employee_id || '-'}</td>
                                    <td>{r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>
                                    <td className={r.is_late ? 'text-danger font-semibold' : ''}>{r.check_in || '--'}</td>
                                    <td>{r.check_out || '--'}</td>
                                    <td>{r.break_time || '--'}</td>
                                    <td>{r.total_hours || '--'}</td>
                                    <td>{r.overtime || '--'}</td>
                                    <td>
                                        <span className={badgeCls(r.status, r.is_late)}>{r.status || '-'}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <div className="text-xs text-white-dark">
                    Showing {rows.length} of {totalCount}
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="form-select w-24"
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                        }}
                    >
                        {[10, 20, 50, 100].map((n) => (
                            <option key={n} value={n}>
                                {n}/page
                            </option>
                        ))}
                    </select>
                    <button type="button" className="btn btn-outline-primary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        Prev
                    </button>
                    <div className="text-sm">
                        {page} / {totalPages}
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminAttendanceDetails;

