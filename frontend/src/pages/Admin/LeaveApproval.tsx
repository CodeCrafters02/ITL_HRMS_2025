import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import DataTable, { Column } from '../../components/Common/DataTable';
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
    from_date: string;
    to_date: string;
    reason: string;
    status: string;
};

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

    const columns: Column<LeaveRequest>[] = [
        {
            key: 'employee_name', title: 'Employee',
            render: (_v, r) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-white-light">{r.employee_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Manager: {r.manager_name}</div>
                </div>
            ),
        },
        { key: 'leave_type', title: 'Type', render: (v) => <span className="font-medium text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg px-3 py-1 text-sm whitespace-nowrap">{v}</span> },
        {
            key: 'from_date', title: 'Period',
            render: (_v, r) => (
                <span className="font-semibold">
                    {new Date(r.from_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    <span className="mx-1 text-gray-400">→</span>
                    {new Date(r.to_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
            ),
        },
        { key: 'reason', title: 'Reason', render: (v) => <p className="text-gray-500 line-clamp-1 max-w-[200px]" title={v}>{v}</p> },
        {
            key: 'actions', title: 'Actions', align: 'center',
            render: (_v, r) => (
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleAction(r.id, 'approve')} className="p-2 bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white rounded-lg transition-all" title="Approve"><IconChecks className="w-5 h-5" /></button>
                    <button onClick={() => handleAction(r.id, 'reject')} className="p-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-lg transition-all" title="Reject"><IconX className="w-5 h-5" /></button>
                </div>
            ),
        },
    ];

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
                onRefresh={fetchPending}
                searchPlaceholder="Search by Employee or Leave Type..."
                emptyMessage="No pending leave requests found"
                filters={
                    <div className="w-full md:w-60">
                        <Flatpickr
                            options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                            className="form-input h-10 rounded-xl w-full"
                            placeholder="Date Range Filter"
                            onChange={(date) => { setDateRange(date); setPage(1); }}
                        />
                    </div>
                }
            />
        </div>
    );
};

export default LeaveApproval;
