import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { formatLeaveRequestDate } from '../../utils/formatLeaveRequestDate';

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

            {/* Filter Bar */}
            <div className="panel p-5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border-none shadow-sm flex flex-col md:flex-row items-center gap-4 overflow-visible">
                <div className="relative flex-1 w-full">
                    <input
                        type="text"
                        placeholder="Search employee history..."
                        className="form-input pl-11 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 focus:ring-2 focus:ring-indigo-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                <select 
                    className="form-select py-2.5 rounded-xl border-gray-200 dark:border-gray-700 w-full md:w-48 bg-white/80 dark:bg-gray-900/80"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="history">Approved & Rejected</option>
                    <option value="Approved">Approved Only</option>
                    <option value="Rejected">Rejected Only</option>
                    <option value="all">All Statuses</option>
                </select>
                <div className="w-full md:w-64">
                    <Flatpickr
                        options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                        className="form-input py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 w-full"
                        placeholder="Filter by Date"
                        onChange={(date) => setDateRange(date)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="panel p-0 border-none shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-gray-800">
                <div className="table-responsive">
                    <table className="table-hover w-full ltr:text-left rtl:text-right">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="py-5 px-6 font-extrabold text-gray-400 text-[10px] uppercase tracking-[0.2em]">Employee Info</th>
                                <th className="py-5 px-6 font-extrabold text-gray-400 text-[10px] uppercase tracking-[0.2em]">Leave Details</th>
                                <th className="py-5 px-6 font-extrabold text-gray-400 text-[10px] uppercase tracking-[0.2em]">Timeline</th>
                                <th className="py-5 px-6 font-extrabold text-gray-400 text-[10px] uppercase tracking-[0.2em]">Status</th>
                                <th className="py-5 px-6 font-extrabold text-gray-400 text-[10px] uppercase tracking-[0.2em]">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center">
                                        <div className="flex justify-center">
                                            <span className="w-10 h-10 border-4 border-indigo-500 border-l-transparent rounded-full animate-spin"></span>
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length > 0 ? (
                                items.map((r) => (
                                    <tr key={r.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors group">
                                        <td className="py-5 px-6">
                                            <div>
                                                <div className="font-bold text-gray-800 dark:text-white-light group-hover:text-indigo-600 transition-colors">{r.employee_name}</div>
                                                <div className="text-xs text-gray-400 tracking-wider">Manager: {r.manager_name}</div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="text-sm font-bold text-indigo-500">{r.leave_type}</div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-md inline-block">
                                                {formatLeaveRequestDate(r.from_date)} — {formatLeaveRequestDate(r.to_date)}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            {getStatusBadge(r.status)}
                                        </td>
                                        <td className="py-5 px-6">
                                            <p className="text-xs text-gray-500 max-w-[200px] line-clamp-2 italic" title={r.reason}>"{r.reason}"</p>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-gray-400 font-medium">No leave records found in history.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalCount > 0 && (
                    <div className="flex flex-wrap justify-between items-center gap-4 p-6 bg-gray-50/20 dark:bg-gray-800/20 border-t border-gray-50 dark:border-gray-700">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Showing <span className="text-indigo-600">{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)}</span> of <span className="text-indigo-600">{totalCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                ⬅️
                            </button>
                            <div className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30">
                                {page}
                            </div>
                            <button 
                                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                                disabled={page * pageSize >= totalCount}
                                onClick={() => setPage(p => p + 1)}
                            >
                                ➡️
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaveHistory;
