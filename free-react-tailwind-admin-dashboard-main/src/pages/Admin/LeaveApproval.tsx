import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';
import IconChecks from '../../components/Icon/IconChecks';
import IconX from '../../components/Icon/IconX';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type LeaveRequest = {
    id: number;
    employee_name: string;
    manager_name: string;
    leave_type: string;
    leave_duration?: string | null;
    from_date: string;
    to_date: string;
    reason: string;
    status: string;
};

function formatLeaveDuration(v?: string | null): string {
    if (v == null || v === '') return '—';
    const s = String(v).trim().toLowerCase();
    if (s === 'half_day' || s === 'half day') return 'Half day';
    if (s === 'full_day' || s === 'full day') return 'Full day';
    return String(v).trim();
}

const LeaveApproval = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [dateRange, setDateRange] = useState<any>(['', '']);

    useEffect(() => {
        dispatch(setPageTitle('Leave Approval'));
    }, [dispatch]);

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchPending = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/pending-leaves/`);
            url.searchParams.set('page', String(page));
            url.searchParams.set('page_size', String(pageSize));
            if (search.trim()) url.searchParams.set('search', search.trim());
            if (dateRange[0]) url.searchParams.set('from_date', dateRange[0].toISOString().split('T')[0]);
            if (dateRange[1]) url.searchParams.set('to_date', dateRange[1].toISOString().split('T')[0]);

            const resp = await fetch(url.toString(), { headers: headers() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to fetch pending leaves');

            setItems(data.results || []);
            setTotalCount(data.count || 0);
        } catch (e: any) {
            Swal.fire('Error', e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => fetchPending(), 300);
        return () => clearTimeout(timeout);
    }, [search, page, pageSize, dateRange]);

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        const title = action === 'approve' ? 'Approve Leave?' : 'Reject Leave?';
        const confirmText = action === 'approve' ? 'Approve' : 'Reject';
        
        let reason = '';
        if (action === 'reject') {
            const { value: text } = await Swal.fire({
                input: 'textarea',
                inputLabel: 'Reason for rejection',
                inputPlaceholder: 'Type your reason here...',
                inputAttributes: { 'aria-label': 'Type your reason here' },
                showCancelButton: true,
                confirmButtonColor: '#e7515a',
            });
            if (text === undefined) return; // Cancelled
            reason = text;
        } else {
            const result = await Swal.fire({
                title,
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#00abff',
                cancelButtonColor: '#888ea8',
                confirmButtonText: 'Yes, proceed!'
            });
            if (!result.isConfirmed) return;
        }

        try {
            const resp = await fetch(`${API_BASE_URL}/app/pending-leaves/${id}/${action}/`, {
                method: 'POST',
                headers: { ...headers(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || `Failed to ${action}`);

            Swal.fire('Success', data.detail, 'success');
            fetchPending();
        } catch (e: any) {
            Swal.fire('Error', e.message, 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Premium Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 p-8 text-white shadow-xl">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Leave Approval Management</h1>
                    <p className="mt-2 text-lg text-cyan-50 opacity-90">Review and manage pending leave requests from your workforce.</p>
                </div>
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl"></div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="panel bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 border-none shadow-sm h-full">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Pending Requests</p>
                            <h3 className="text-2xl font-bold dark:text-white-light">{totalCount}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-800/30 rounded-xl text-blue-600">
                             <div className="w-6 h-6 flex items-center justify-center">📋</div>
                        </div>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-800 dark:to-orange-900/10 border-none shadow-sm h-full">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">Needs Attention</p>
                            <h3 className="text-2xl font-bold dark:text-white-light">{totalCount > 10 ? 'High' : 'Normal'}</h3>
                        </div>
                        <div className="p-3 bg-orange-100 dark:bg-orange-800/30 rounded-xl text-orange-600">
                             <div className="w-6 h-6 flex items-center justify-center">⚠️</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="panel p-0 overflow-visible border-none shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-4 p-5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/30">
                    <div className="relative flex-1 w-full">
                        <input
                            type="text"
                            placeholder="Search by Employee or Leave Type..."
                            className="form-input pl-11 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 focus:ring-2 focus:ring-blue-500 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    </div>
                    <div className="w-full md:w-64">
                        <Flatpickr
                            options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                            className="form-input py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 focus:ring-2 focus:ring-blue-500 w-full"
                            placeholder="Date Range Filter"
                            onChange={(date) => setDateRange(date)}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="panel p-0 border-none shadow-xl rounded-2xl overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover w-full ltr:text-left rtl:text-right">
                        <thead className="bg-gray-50/50 dark:bg-gray-700/50">
                            <tr>
                                <th className="py-4 px-6 font-bold uppercase text-xs tracking-wider">Employee</th>
                                <th className="py-4 px-6 font-bold uppercase text-xs tracking-wider">Type</th>
                                <th className="py-4 px-6 font-bold uppercase text-xs tracking-wider">Period</th>
                                <th className="py-4 px-6 font-bold uppercase text-xs tracking-wider">Duration</th>
                                <th className="py-4 px-6 font-bold uppercase text-xs tracking-wider">Reason</th>
                                <th className="py-4 px-6 font-bold uppercase text-xs tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="w-8 h-8 border-4 border-blue-500 border-l-transparent rounded-full animate-spin"></span>
                                            <span className="text-gray-500 font-medium">Crunching requests...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length > 0 ? (
                                items.map((r) => (
                                    <tr key={r.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                        <td className="py-4 px-6">
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white-light">{r.employee_name}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">Manager: {r.manager_name}</div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-medium text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg px-3 py-1 text-sm whitespace-nowrap">
                                                {r.leave_type}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                {new Date(r.from_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                                                <span className="mx-1 text-gray-400">→</span> 
                                                {new Date(r.to_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                {formatLeaveDuration(r.leave_duration)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm text-gray-500 line-clamp-1 max-w-[200px]" title={r.reason}>{r.reason}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleAction(r.id, 'approve')}
                                                    className="p-2 bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white rounded-lg transition-all shadow-sm hover:shadow-green-500/30"
                                                    title="Approve"
                                                >
                                                    <IconChecks className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(r.id, 'reject')}
                                                    className="p-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm hover:shadow-red-500/30"
                                                    title="Reject"
                                                >
                                                    <IconX className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-400 italic">No pending leave requests found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalCount > 0 && (
                    <div className="flex flex-wrap justify-between items-center gap-4 p-6 bg-gray-50/30 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-500">
                            Showing <span className="text-blue-600 font-bold">{(page - 1) * pageSize + 1}</span> to <span className="text-blue-600 font-bold">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-blue-600 font-bold">{totalCount}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                className="btn btn-outline-primary px-5 rounded-xl disabled:opacity-30" 
                                disabled={page === 1} 
                                onClick={() => setPage(p => p - 1)}
                            >
                                Previous
                            </button>
                            <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl font-bold">{page}</span>
                            <button 
                                className="btn btn-outline-primary px-5 rounded-xl disabled:opacity-30" 
                                disabled={page * pageSize >= totalCount} 
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaveApproval;
