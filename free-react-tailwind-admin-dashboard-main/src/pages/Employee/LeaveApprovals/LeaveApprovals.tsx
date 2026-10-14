import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import { approveManagerLeave, fetchManagerLeavePage, LeaveStatus, ManagerLeaveRequest, rejectManagerLeave } from './api';
import DataTable, { Column } from '../../../components/Common/DataTable';
import StatCard, { StatGrid } from '../../../components/Common/StatCard';
import IconClock from '../../../components/Icon/IconClock';
import IconCalendar from '../../../components/Icon/IconCalendar';

import Button from '../../../components/Common/Button';
import PageHeader from '../../../components/Common/PageHeader';
function formatLeaveDuration(v?: string | null): string {
    if (v == null || v === '') return '—';
    const s = String(v).trim().toLowerCase();
    if (s === 'half_day' || s === 'half day') return 'Half day';
    if (s === 'full_day' || s === 'full day') return 'Full day';
    return String(v).trim();
}

/** dd/mm/yyyy; prefers calendar parts from YYYY-MM-DD so timezone does not shift the day. */
function formatLeaveDateDdMmYyyy(value?: string | null): string {
    if (value == null || value === '') return '-';
    const s = String(value).trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
        const [, y, m, d] = iso;
        return `${d}/${m}/${y}`;
    }
    const parsed = new Date(s);
    if (Number.isNaN(parsed.getTime())) return s;
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
}

const LeaveApprovals = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<ManagerLeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [counts, setCounts] = useState<Partial<Record<LeaveStatus, number>>>({});

    useEffect(() => {
        dispatch(setPageTitle('Leave Request'));
    }, [dispatch]);

    const loadLeaves = async () => {
        setLoading(true);
        try {
            const data = await fetchManagerLeavePage({ page, pageSize, search, status: statusFilter });
            setItems(data.results);
            setTotalCount(data.count);
            setCounts(data.counts);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load leave requests';
            Swal.fire('Error', message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(loadLeaves, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter, page, pageSize]);

    const handleAction = async (leaveId: number, action: 'approve' | 'reject') => {
        try {
            let rejection_reason = '';
            if (action === 'reject') {
                const result = await Swal.fire({
                    title: 'Reject Leave Request',
                    input: 'textarea',
                    inputLabel: 'Reason for rejection',
                    inputPlaceholder: 'Optional reason',
                    showCancelButton: true,
                    confirmButtonText: 'Reject',
                    confirmButtonColor: '#e7515a',
                });
                if (!result.isConfirmed) return;
                rejection_reason = result.value || '';
            } else {
                const result = await Swal.fire({
                    title: 'Approve leave request?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Approve',
                    confirmButtonColor: '#00ab55',
                });
                if (!result.isConfirmed) return;
            }

            const data = action === 'approve'
                ? await approveManagerLeave(leaveId)
                : await rejectManagerLeave(leaveId, rejection_reason);

            Swal.fire('Success', (data as { detail?: string }).detail || `Leave ${action}d`, 'success');
            loadLeaves();
        } catch (err) {
            const message = err instanceof Error ? err.message : `Failed to ${action} leave`;
            Swal.fire('Error', message, 'error');
        }
    };

    const statusBadge = (st: string) =>
        st === 'Pending' ? 'bg-warning-light text-warning' : st === 'Approved' ? 'bg-success-light text-success' : st === 'Rejected' ? 'bg-danger-light text-danger' : 'bg-dark-light text-white-dark';

    const columns: Column<ManagerLeaveRequest>[] = [
        { key: 'employee_name', title: 'Employee', render: (v) => <span className="font-semibold">{v}</span> },
        { key: 'leave_type_name', title: 'Leave Type', hideBelow: 'md', render: (v) => v || '-' },
        { key: 'from_date', title: 'Period', render: (_v, r) => `${formatLeaveDateDdMmYyyy(r.from_date)} - ${formatLeaveDateDdMmYyyy(r.to_date)}` },
        { key: 'leave_duration', title: 'Duration', hideBelow: 'lg', render: (v) => <span className="whitespace-nowrap">{formatLeaveDuration(v)}</span> },
        {
            key: 'reason', title: 'Reason', hideBelow: 'lg',
            render: (_v, r) => (
                <div className="max-w-[260px]">
                    <p className="line-clamp-2">{r.reason || '-'}</p>
                    {r.rejection_reason && <p className="mt-1 text-xs text-danger">Rejected: {r.rejection_reason}</p>}
                </div>
            ),
        },
        { key: 'status', title: 'Status', render: (v) => <span className={`badge ${statusBadge(v)}`}>{v}</span> },
        {
            key: 'actions', title: 'Action', align: 'center',
            render: (_v, r) =>
                r.status === 'Pending' ? (
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="success" size="sm" leftIcon={<IconChecks />} onClick={() => handleAction(r.id, 'approve')}>Approve</Button>
                        <Button variant="danger" size="sm" leftIcon={<IconX />} onClick={() => handleAction(r.id, 'reject')}>Reject</Button>
                    </div>
                ) : (
                    <span className="text-xs text-white-dark">Processed</span>
                ),
        },
    ];

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <PageHeader
                title="Leave Request Approval"
                subtitle="Review and process leave requests from your reportees."
            />

            <StatGrid cols={3} className="!mb-0">
                <StatCard label="Pending" value={counts.Pending ?? 0} tone="warning" icon={<IconClock />} onClick={() => { setStatusFilter('Pending'); setPage(1); }} active={statusFilter === 'Pending'} />
                <StatCard label="Approved" value={counts.Approved ?? 0} tone="success" icon={<IconChecks />} onClick={() => { setStatusFilter('Approved'); setPage(1); }} active={statusFilter === 'Approved'} />
                <StatCard label="Rejected" value={counts.Rejected ?? 0} tone="danger" icon={<IconCalendar />} onClick={() => { setStatusFilter('Rejected'); setPage(1); }} active={statusFilter === 'Rejected'} />
            </StatGrid>

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
                onRefresh={loadLeaves}
                searchPlaceholder="Search employee / leave type / reason..."
                emptyMessage="No leave requests found"
                filters={
                    <select className="form-select h-10 w-44 rounded-xl" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as 'all' | LeaveStatus); setPage(1); }}>
                        <option value="all">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                }
            />
        </div>
    );
};

export default LeaveApprovals;
