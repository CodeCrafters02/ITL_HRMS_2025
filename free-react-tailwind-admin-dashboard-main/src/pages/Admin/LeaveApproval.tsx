import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';
import IconChecks from '../../components/Icon/IconChecks';
import IconX from '../../components/Icon/IconX';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';
import DataTable, { Column } from '../../components/Common/DataTable';

import PageHeader from '../../components/Common/PageHeader';
import StatCard, { StatGrid } from '../../components/Common/StatCard';
import IconClipboardText from '../../components/Icon/IconClipboardText';
import IconInfoTriangle from '../../components/Icon/IconInfoTriangle';
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
        setLoading(true);
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
            key: 'employee_name',
            title: 'Employee',
            sortable: true,
            render: (_val, r) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-white-light">{r.employee_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Manager: {r.manager_name}</div>
                </div>
            ),
        },
        {
            key: 'leave_type',
            title: 'Type',
            sortable: true,
            render: (leaveType) => (
                <span className="font-medium text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/20 rounded-lg px-2.5 py-0.5 text-xs whitespace-nowrap">
                    {leaveType}
                </span>
            ),
        },
        {
            key: 'from_date',
            title: 'Period',
            render: (_val, r) => (
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {new Date(r.from_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    <span className="mx-1 text-gray-400">→</span>
                    {new Date(r.to_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
            ),
        },
        {
            key: 'leave_duration',
            title: 'Duration',
            render: (dur) => (
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatLeaveDuration(dur)}
                </span>
            ),
        },
        {
            key: 'reason',
            title: 'Reason',
            render: (reason) => (
                <p className="text-xs text-gray-500 line-clamp-1 max-w-[220px]" title={reason}>
                    {reason}
                </p>
            ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, r) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => handleAction(r.id, 'approve')}
                        className="p-1.5 bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white rounded-lg transition-all shadow-sm"
                        title="Approve"
                    >
                        <IconChecks className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAction(r.id, 'reject')}
                        className="p-1.5 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm"
                        title="Reject"
                    >
                        <IconX className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Premium Header Banner */}
            <PageHeader
                icon={<IconChecks />}
                title="Leave Approval Management"
                subtitle="Review and manage pending leave requests from your workforce."
                variant="rose"
            />

            {/* Quick Stats */}
            <StatGrid cols={2}>
                <StatCard label="Pending Requests" value={totalCount} loading={loading} tone="primary" icon={<IconClipboardText />} hint="Awaiting your decision" />
                <StatCard label="Needs Attention" value={totalCount > 10 ? 'High' : 'Normal'} loading={loading} tone="warning" icon={<IconInfoTriangle />} hint="Based on queue size" />
            </StatGrid>

            {/* Reusable Data Table */}
            <DataTable
                columns={columns}
                data={items}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                loading={loading}
                search={search}
                searchPlaceholder="Search by Employee or Leave Type..."
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
                onRefresh={fetchPending}
                filters={
                    <div className="flex items-center gap-2.5">
                        <div className="w-64">
                            <Flatpickr
                                options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                                className="form-input h-10 text-xs sm:text-sm px-3.5 rounded-xl border-[#cbd5e1] dark:border-[#1e293b] bg-white dark:bg-[#121e32] focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium shadow-sm w-full"
                                placeholder="Date Range Filter"
                                value={dateRange}
                                onChange={(date) => {
                                    setDateRange(date);
                                    setLoading(true);
                                    setPage(1);
                                }}
                            />
                        </div>
                        {(dateRange[0] || search) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDateRange(['', '']);
                                    setSearch('');
                                    setLoading(true);
                                    setPage(1);
                                }}
                                className="h-10 px-3 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors whitespace-nowrap shadow-sm"
                                title="Reset filters"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                }
            />
        </div>
    );
};

export default LeaveApproval;
