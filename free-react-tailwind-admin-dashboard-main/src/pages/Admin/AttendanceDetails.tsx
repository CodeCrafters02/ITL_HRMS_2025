import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconFile from '../../components/Icon/IconFile';
import DataTable, { Column } from '../../components/Common/DataTable';

import PageHeader from '../../components/Common/PageHeader';
import StatCard, { StatGrid } from '../../components/Common/StatCard';
import IconChecks from '../../components/Icon/IconChecks';
import IconXCircle from '../../components/Icon/IconXCircle';
import Button from '../../components/Common/Button';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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

type SummaryStats = {
    total: number;
    present: number;
    absent: number;
    leave: number;
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const firstOfMonthIso = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const strTime = (v: any) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
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
    
    // Data State
    const [items, setItems] = useState<AttendanceRow[]>([]);
    const [summary, setSummary] = useState<SummaryStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter & Pagination State
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [fromDate, setFromDate] = useState(todayIso());
    const [toDate, setToDate] = useState(todayIso());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        dispatch(setPageTitle('Attendance Insights'));
    }, [dispatch]);

    const authHeaders = useMemo(() => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    }, []);

    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = new URL(`${API_BASE_URL}/app/attendance/`);
            url.searchParams.set('page', String(page));
            url.searchParams.set('page_size', String(pageSize));
            if (fromDate) url.searchParams.set('from_date', fromDate);
            if (toDate) url.searchParams.set('to_date', toDate);
            if (search.trim()) url.searchParams.set('search', search.trim());
            if (statusFilter !== 'All') url.searchParams.set('status', statusFilter);

            const resp = await fetch(url.toString(), { headers: authHeaders });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Fetch failed');

            const mapped: AttendanceRow[] = (data.results || []).map((x: any) => ({
                id: x.id,
                employee_id: x.employee_id || '',
                employee_name: x.employee_name || '',
                date: x.date || '',
                check_in: x.check_in ? new Date(x.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                check_out: x.check_out ? new Date(x.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                break_time: strTime(x.total_break_time || '--'),
                total_hours: strTime(x.total_work_duration || '--'),
                overtime: strTime(x.overtime_duration || '--'),
                is_late: Boolean(x.is_late),
                status: x.status || 'Unknown',
            }));

            setItems(mapped);
            setTotalCount(data.count || 0);

            // Fetch Summary for the same filter
            const summaryUrl = new URL(`${API_BASE_URL}/app/attendance/summary/`);
            if (fromDate) summaryUrl.searchParams.set('from_date', fromDate);
            if (toDate) summaryUrl.searchParams.set('to_date', toDate);
            if (search.trim()) summaryUrl.searchParams.set('search', search.trim());
            if (statusFilter !== 'All') summaryUrl.searchParams.set('status', statusFilter);

            const sResp = await fetch(summaryUrl.toString(), { headers: authHeaders });
            const sData = await sResp.json();
            if (sResp.ok) setSummary(sData);

        } catch (e: any) {
            setError(e.message);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, fromDate, toDate, search, statusFilter, authHeaders]);

    useEffect(() => {
        const timer = setTimeout(() => fetchAttendance(), 300);
        return () => clearTimeout(timer);
    }, [fetchAttendance]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const exportCsv = () => {
        downloadText(`attendance_export_${todayIso()}.csv`, toCsv(items));
    };

    const statusBadgeCls = (s: string, late: boolean) => {
        const base = 'px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight';
        const k = s.toLowerCase();
        if (k === 'present') return `${base} ${late ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`;
        if (k === 'leave') return `${base} bg-brand-100 text-brand-600`;
        if (k === 'absent') return `${base} bg-red-100 text-red-600`;
        return `${base} bg-slate-100 text-slate-500`;
    };

    const columns: Column<AttendanceRow>[] = [
        {
            key: 'employee',
            title: 'Employee Details',
            sortable: true,
            render: (_val, r) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase shadow-inner">
                        {r.employee_name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-extrabold text-gray-800 dark:text-white-light group-hover:text-primary transition-colors">
                            {r.employee_name}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                            {r.employee_id}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'date',
            title: 'Date Log',
            sortable: true,
            render: (_val, r) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-700 dark:text-gray-300">
                        {new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">{r.date}</span>
                </div>
            ),
        },
        {
            key: 'status_timing',
            title: 'Status & Timing',
            render: (_val, r) => (
                <div className="flex items-center gap-3">
                    <span className={statusBadgeCls(r.status, r.is_late)}>{r.status}</span>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-gray-500">
                        <span className={r.is_late ? 'text-danger' : 'text-success'}>{r.check_in || '--:--'}</span>
                        <span className="text-gray-300">→</span>
                        <span>{r.check_out || '--:--'}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'duration',
            title: 'Break / Total',
            align: 'center',
            render: (_val, r) => (
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-tighter">Total: {r.total_hours}h</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Break: {r.break_time}h</span>
                </div>
            ),
        },
        {
            key: 'overtime',
            title: 'Overtime',
            align: 'right',
            render: (_val, r) => (
                <span className={`text-xs font-black p-1.5 rounded-lg ${Number(r.overtime) > 0 ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400' : 'text-gray-400 bg-gray-50 dark:bg-gray-800'}`}>
                    {Number(r.overtime) > 0 ? `+${r.overtime}h` : '0.00h'}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            {/* ─── Premium Header Banner ─── */}
            <PageHeader
                title="Attendance Analytics"
                subtitle="Comprehensive logs and engagement tracking for your entire workforce."
                variant="indigo"
                icon={<IconCalendar />}
                actions={
                    <>
                        <Button 
                            type="button" 
                            
                            onClick={exportCsv}
                            disabled={items.length === 0}>
                            <IconFile className="w-4 h-4" />
                            <span>Export CSV</span>
                        </Button>
                    </>
                }
            />

            {/* ─── Statistic Dashboard ─── */}
            <StatGrid cols={4}>
                <StatCard label="Total Records" value={summary?.total ?? 0} loading={loading} tone="primary" icon={<IconFile />} />
                <StatCard label="Present" value={summary?.present ?? 0} loading={loading} tone="success" icon={<IconChecks />} />
                <StatCard label="Absent" value={summary?.absent ?? 0} loading={loading} tone="danger" icon={<IconXCircle />} />
                <StatCard label="On Leave" value={summary?.leave ?? 0} loading={loading} tone="info" icon={<IconCalendar />} />
            </StatGrid>

            {/* ─── Attendance Records Table ─── */}
            <DataTable
                title="Attendance Records"
                columns={columns}
                data={items}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                loading={loading}
                searchValue={search}
                searchPlaceholder="Search by ID or Name..."
                onSearchChange={(val) => {
                    setSearch(val);
                    setLoading(true);
                    setPage(1);
                }}
                onPageChange={(p) => {
                    setPage(p);
                    setLoading(true);
                }}
                onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setLoading(true);
                    setPage(1);
                }}
                onRefresh={fetchAttendance}
                filters={
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                className="form-input text-xs font-bold h-10 w-[140px] rounded-xl"
                                value={fromDate}
                                onChange={(e) => { setFromDate(e.target.value); setLoading(true); setPage(1); }}
                                title="From Date"
                            />
                            <span className="text-gray-400 text-xs font-bold">to</span>
                            <input
                                type="date"
                                className="form-input text-xs font-bold h-10 w-[140px] rounded-xl"
                                value={toDate}
                                onChange={(e) => { setToDate(e.target.value); setLoading(true); setPage(1); }}
                                title="To Date"
                            />
                        </div>
                        <select
                            className="form-select text-xs font-bold h-10 w-[140px] rounded-xl"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setLoading(true); setPage(1); }}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Present">Present Only</option>
                            <option value="Absent">Absent Only</option>
                            <option value="Leave">On Leave</option>
                        </select>
                        {(fromDate || toDate || statusFilter !== 'All') && (
                            <button
                                type="button"
                                className="text-xs font-semibold text-danger hover:underline px-2"
                                onClick={() => {
                                    setFromDate('');
                                    setToDate('');
                                    setStatusFilter('All');
                                    setLoading(true);
                                    setPage(1);
                                }}
                            >
                                Reset
                            </button>
                        )}
                    </div>
                }
                emptyMessage="No attendance logs found."
                emptySubtitle="Try adjusting your filters or date range."
            />
        </div>
    );
};

export default AdminAttendanceDetails;
