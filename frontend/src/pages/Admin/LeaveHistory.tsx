import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import DataTable, { Column } from '../../components/Common/DataTable';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type LeaveRecord = {
    id: number;
    employee_name: string;
    manager_name: string;
    leave_type: string;
    from_date: string;
    to_date: string;
    reason: string;
    status: string;
};

const LeaveHistory = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<LeaveRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('history'); // history = approved + rejected
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [approvedCount, setApprovedCount] = useState<number | string>(0);
    const [rejectedCount, setRejectedCount] = useState<number | string>(0);
    const [dateRange, setDateRange] = useState<any>(['', '']);

    useEffect(() => {
        dispatch(setPageTitle('Leave History'));
    }, [dispatch]);

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/leave-history/`);
            url.searchParams.set('page', String(page));
            url.searchParams.set('page_size', String(pageSize));
            url.searchParams.set('status', statusFilter);
            if (search.trim()) url.searchParams.set('search', search.trim());
            if (dateRange[0]) url.searchParams.set('from_date', dateRange[0].toISOString().split('T')[0]);
            if (dateRange[1]) url.searchParams.set('to_date', dateRange[1].toISOString().split('T')[0]);

            const resp = await fetch(url.toString(), { headers: headers() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to fetch leave history');

            setItems(data.results || []);
            setTotalCount(data.count || 0);
            setApprovedCount(data.approved_count ?? '...');
            setRejectedCount(data.rejected_count ?? '...');
        } catch (e: any) {
            Swal.fire('Error', e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => fetchHistory(), 300);
        return () => clearTimeout(timeout);
    }, [search, statusFilter, page, pageSize, dateRange]);

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved':
                return <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Approved</span>;
            case 'rejected':
                return <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-none px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Rejected</span>;
            case 'pending':
                return <span className="badge bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-none px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Pending</span>;
            default:
                return <span className="badge bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-none px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{status}</span>;
        }
    };

    const columns: Column<LeaveRecord>[] = [
        {
            key: 'employee_name', title: 'Employee Info',
            render: (_v, r) => (
                <div>
                    <div className="font-bold text-gray-800 dark:text-white-light">{r.employee_name}</div>
                    <div className="text-xs text-gray-400">Manager: {r.manager_name}</div>
                </div>
            ),
        },
        { key: 'leave_type', title: 'Leave Details', render: (v) => <span className="font-bold text-indigo-500">{v}</span> },
        {
            key: 'from_date', title: 'Timeline',
            render: (_v, r) => <span className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-md inline-block">{new Date(r.from_date).toLocaleDateString()} — {new Date(r.to_date).toLocaleDateString()}</span>,
        },
        { key: 'status', title: 'Status', render: (v) => getStatusBadge(v || '') },
        { key: 'reason', title: 'Reason', render: (v) => <p className="text-xs text-gray-500 max-w-[200px] line-clamp-2 italic" title={v}>"{v}"</p> },
    ];

    return (
        <div className="space-y-6">
            {/* Premium Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-xl">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Leave History Archives</h1>
                    <p className="mt-2 text-lg text-blue-50 opacity-90">View and audit all processed leave applications across the company.</p>
                </div>
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl"></div>
            </div>

            {/* Quick Stats Placeholder */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="panel bg-white dark:bg-gray-800 border-none shadow-sm flex items-center gap-4 p-4 rounded-2xl">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">📊</div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Logs</p>
                        <h4 className="text-xl font-bold dark:text-white-light">{totalCount}</h4>
                    </div>
                </div>
                <div className="panel bg-white dark:bg-gray-800 border-none shadow-sm flex items-center gap-4 p-4 rounded-2xl">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600">✅</div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Approved</p>
                        <h4 className="text-xl font-bold dark:text-white-light">{approvedCount}</h4>
                    </div>
                </div>
                <div className="panel bg-white dark:bg-gray-800 border-none shadow-sm flex items-center gap-4 p-4 rounded-2xl">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">❌</div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rejected</p>
                        <h4 className="text-xl font-bold dark:text-white-light">{rejectedCount}</h4>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                onRefresh={fetchHistory}
                searchPlaceholder="Search employee history..."
                emptyMessage="No leave records found in history"
                filters={
                    <>
                        <select className="form-select h-10 rounded-xl w-full md:w-48" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                            <option value="history">Approved & Rejected</option>
                            <option value="Approved">Approved Only</option>
                            <option value="Rejected">Rejected Only</option>
                            <option value="all">All Statuses</option>
                        </select>
                        <div className="w-full md:w-60">
                            <Flatpickr
                                options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                                className="form-input h-10 rounded-xl w-full"
                                placeholder="Filter by Date"
                                onChange={(date) => { setDateRange(date); setPage(1); }}
                            />
                        </div>
                    </>
                }
            />
        </div>
    );
};

export default LeaveHistory;
