import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconChecks from '../../../components/Icon/IconChecks';
import IconSearch from '../../../components/Icon/IconSearch';
import IconX from '../../../components/Icon/IconX';
import { approveManagerLeave, fetchManagerLeaveRequests, LeaveStatus, ManagerLeaveRequest, rejectManagerLeave } from './api';

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

    useEffect(() => {
        dispatch(setPageTitle('Leave Request'));
    }, [dispatch]);

    const loadLeaves = async () => {
        setLoading(true);
        try {
            const data = await fetchManagerLeaveRequests();
            setItems(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load leave requests';
            Swal.fire('Error', message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeaves();
    }, []);

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

    const filtered = useMemo(() => {
        return items.filter((item) => {
            const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
            const q = search.trim().toLowerCase();
            const matchesSearch = !q
                || item.employee_name.toLowerCase().includes(q)
                || item.leave_type_name.toLowerCase().includes(q)
                || (item.reason || '').toLowerCase().includes(q);
            return matchesStatus && matchesSearch;
        });
    }, [items, search, statusFilter]);

    const pendingCount = items.filter((item) => item.status === 'Pending').length;
    const approvedCount = items.filter((item) => item.status === 'Approved').length;
    const rejectedCount = items.filter((item) => item.status === 'Rejected').length;

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#220fb6] via-[#4f6be5] to-[#0f52af] text-white border-0">
                <h1 className="text-2xl md:text-3xl font-bold">Leave Request Approval</h1>
                <p className="mt-1 text-white/75 text-sm md:text-base">Review and process leave requests from your reportees.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="panel">
                    <p className="text-xs uppercase text-white-dark">Pending</p>
                    <p className="text-2xl font-bold mt-2 text-warning">{pendingCount}</p>
                </div>
                <div className="panel">
                    <p className="text-xs uppercase text-white-dark">Approved</p>
                    <p className="text-2xl font-bold mt-2 text-success">{approvedCount}</p>
                </div>
                <div className="panel">
                    <p className="text-xs uppercase text-white-dark">Rejected</p>
                    <p className="text-2xl font-bold mt-2 text-danger">{rejectedCount}</p>
                </div>
            </div>

            <div className="panel">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <input className="form-input pl-10" placeholder="Search employee / leave type / reason..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <select className="form-select md:w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | LeaveStatus)}>
                        <option value="all">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="panel p-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Leave Type</th>
                                <th>Period</th>
                                <th>Duration</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-white-dark">Loading leave requests...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-white-dark">No leave requests found.</td>
                                </tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item.id}>
                                        <td className="font-semibold">{item.employee_name}</td>
                                        <td>{item.leave_type_name || '-'}</td>
                                        <td>
                                            {formatLeaveDateDdMmYyyy(item.from_date)} - {formatLeaveDateDdMmYyyy(item.to_date)}
                                        </td>
                                        <td className="whitespace-nowrap">{formatLeaveDuration(item.leave_duration)}</td>
                                        <td className="max-w-[260px]">
                                            <p className="line-clamp-2">{item.reason || '-'}</p>
                                            {item.rejection_reason && <p className="text-xs text-danger mt-1">Rejected: {item.rejection_reason}</p>}
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${
                                                    item.status === 'Pending'
                                                        ? 'bg-warning-light text-warning'
                                                        : item.status === 'Approved'
                                                          ? 'bg-success-light text-success'
                                                          : item.status === 'Rejected'
                                                            ? 'bg-danger-light text-danger'
                                                            : 'bg-dark-light text-white-dark'
                                                }`}
                                            >
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            {item.status === 'Pending' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button type="button" className="btn btn-sm btn-success" onClick={() => handleAction(item.id, 'approve')}>
                                                        <IconChecks className="w-4 h-4 mr-1" />
                                                        Approve
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleAction(item.id, 'reject')}>
                                                        <IconX className="w-4 h-4 mr-1" />
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-white-dark">Processed</span>
                                            )}
                                        </td>
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

export default LeaveApprovals;
