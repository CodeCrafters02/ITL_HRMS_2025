import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconCalendar from '../../../components/Icon/IconCalendar';
import IconSearch from '../../../components/Icon/IconSearch';
import { LeaveBalance, LeaveRequest, LeaveStatus, cancelLeaveRequest, createLeaveRequest, fetchLeaveBalances, fetchMyLeaveRequests } from './api';

type StatusFilter = 'all' | LeaveStatus;

const statusStyleMap: Record<LeaveStatus, string> = {
    Pending: 'bg-warning-light text-warning',
    Approved: 'bg-success-light text-success',
    Rejected: 'bg-danger-light text-danger',
    Cancelled: 'bg-dark-light text-white-dark',
};

const formatDate = (date?: string) => {
    if (!date) return '-';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString();
};

const dateDiff = (fromDate: string, toDate: string) => {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    const diff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diff);
};

const ApplyLeave = () => {
    const dispatch = useDispatch();
    const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [search, setSearch] = useState('');
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [showAllBalances, setShowAllBalances] = useState(false);

    const [leaveType, setLeaveType] = useState<number | ''>('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [reason, setReason] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [balances, requests] = await Promise.all([fetchLeaveBalances(), fetchMyLeaveRequests()]);
            setLeaveBalances(balances);
            setLeaveRequests(requests);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load leave data';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Leave Application'));
    }, [dispatch]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const totalBalance = useMemo(() => leaveBalances.reduce((sum, leave) => sum + leave.count, 0), [leaveBalances]);
    const totalRemaining = useMemo(() => leaveBalances.reduce((sum, leave) => sum + leave.remaining_count, 0), [leaveBalances]);
    const pendingCount = useMemo(() => leaveRequests.filter((request) => request.status === 'Pending').length, [leaveRequests]);
    const approvedCount = useMemo(() => leaveRequests.filter((request) => request.status === 'Approved').length, [leaveRequests]);
    const leaveBalancePreviewCount = 6;
    const visibleLeaveBalances = useMemo(() => {
        if (showAllBalances) return leaveBalances;
        return leaveBalances.slice(0, leaveBalancePreviewCount);
    }, [leaveBalances, showAllBalances]);

    const filteredRequests = useMemo(() => {
        const loweredSearch = search.trim().toLowerCase();
        return leaveRequests.filter((request) => {
            const statusMatch = statusFilter === 'all' || request.status === statusFilter;
            const searchMatch =
                !loweredSearch ||
                request.leave_type_name?.toLowerCase().includes(loweredSearch) ||
                request.reason?.toLowerCase().includes(loweredSearch) ||
                request.status?.toLowerCase().includes(loweredSearch);
            return statusMatch && searchMatch;
        });
    }, [leaveRequests, search, statusFilter]);

    const requestedDays = dateDiff(fromDate, toDate);

    const resetForm = () => {
        setLeaveType('');
        setFromDate('');
        setToDate('');
        setReason('');
    };

    const submitLeave = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);

        if (!leaveType) {
            setError('Please select a leave type.');
            return;
        }
        if (!fromDate || !toDate) {
            setError('Please choose both from and to dates.');
            return;
        }
        if (new Date(fromDate).getTime() > new Date(toDate).getTime()) {
            setError('From date cannot be after to date.');
            return;
        }

        try {
            setSubmitting(true);
            await createLeaveRequest({
                leave_type: Number(leaveType),
                from_date: fromDate,
                to_date: toDate,
                reason,
            });
            resetForm();
            setIsApplyModalOpen(false);
            await loadData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to apply leave';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const onCancelLeave = async (leaveId: number) => {
        try {
            setCancellingId(leaveId);
            setError(null);
            await cancelLeaveRequest(leaveId);
            await loadData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to cancel leave';
            setError(message);
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#0e1726] to-[#1b2e4b] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold">Leave Application</h1>
                        <p className="mt-1 text-white/80">Apply for leave, track approval status, and manage your requests.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => setIsApplyModalOpen(true)}>
                            Apply Leave
                        </button>
                        {/* <button type="button" onClick={loadData} className="btn btn-outline-light w-full sm:w-auto" disabled={loading}>
                            Refresh
                        </button> */}
                    </div>
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Total Annual Balance</p>
                    <p className="text-2xl font-bold mt-2">{totalBalance}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Remaining Leaves</p>
                    <p className="text-2xl font-bold mt-2 text-success">{totalRemaining}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Pending Requests</p>
                    <p className="text-2xl font-bold mt-2 text-warning">{pendingCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Approved Requests</p>
                    <p className="text-2xl font-bold mt-2 text-info">{approvedCount}</p>
                </div>
            </div>

            <div className="panel">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">Leave Balances</h3>
                    {leaveBalances.length > leaveBalancePreviewCount && (
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowAllBalances((prev) => !prev)}>
                            {showAllBalances ? 'Show Less' : `Show All (${leaveBalances.length})`}
                        </button>
                    )}
                </div>
                {loading ? (
                    <p className="text-white-dark">Loading balances...</p>
                ) : leaveBalances.length === 0 ? (
                    <p className="text-white-dark">No leave policies assigned yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {visibleLeaveBalances.map((leave) => {
                            const percentUsed = leave.count ? Math.min(100, Math.round((leave.used_count / leave.count) * 100)) : 0;
                            return (
                                <div key={leave.id} className="rounded-md border border-white-light dark:border-[#1b2e4b] p-4 bg-white dark:bg-[#111c2d]">
                                    <div className="mb-3 flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <IconCalendar className="h-4 w-4 text-primary shrink-0" />
                                                <p className="font-semibold truncate">{leave.leave_name}</p>
                                            </div>
                                            <span className={`mt-2 inline-block badge ${leave.is_paid ? 'bg-success-light text-success' : 'bg-dark-light text-white-dark'}`}>
                                                {leave.is_paid ? 'Paid' : 'Unpaid'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-primary whitespace-nowrap">{leave.remaining_count} left</p>
                                    </div>

                                    <div className="h-2 bg-[#ebedf2] dark:bg-[#1b2e4b] rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full" style={{ width: `${percentUsed}%` }} />
                                    </div>

                                    <div className="mt-3 flex items-center justify-between text-xs text-white-dark">
                                        <span>Total: {leave.count}</span>
                                        <span>Used: {leave.used_count}</span>
                                        <span>{percentUsed}% used</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="panel">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-lg font-bold">My Leave Requests</h3>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative sm:w-[240px]">
                            <input
                                type="text"
                                className="form-input pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search leave request..."
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                <IconSearch className="w-4 h-4" />
                            </span>
                        </div>
                        <select className="form-select sm:w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                            <option value="all">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Leave Type</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Days</th>
                                <th>Status</th>
                                <th>Reason</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-white-dark">
                                        Loading leave requests...
                                    </td>
                                </tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-white-dark">
                                        No leave requests found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td className="font-semibold">{request.leave_type_name || '-'}</td>
                                        <td>{formatDate(request.from_date)}</td>
                                        <td>{formatDate(request.to_date)}</td>
                                        <td>{dateDiff(request.from_date, request.to_date)}</td>
                                        <td>
                                            <span className={`badge ${statusStyleMap[request.status]}`}>{request.status}</span>
                                        </td>
                                        <td className="max-w-[300px] truncate" title={request.reason || ''}>
                                            {request.reason || '-'}
                                            {request.status === 'Rejected' && request.rejection_reason && (
                                                <p className="text-danger mt-1 whitespace-normal">Reason: {request.rejection_reason}</p>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {(request.status === 'Pending' || request.status === 'Approved') ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    disabled={cancellingId === request.id}
                                                    onClick={() => onCancelLeave(request.id)}
                                                >
                                                    {cancellingId === request.id ? 'Cancelling...' : 'Cancel'}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-white-dark">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isApplyModalOpen && (
                <div className="fixed inset-0 z-[1000] bg-black/60 p-4 flex items-center justify-center" onClick={() => setIsApplyModalOpen(false)}>
                    <div className="panel w-full max-w-2xl max-h-[92vh] overflow-auto dark:bg-[#0e1726]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h3 className="text-lg font-bold">Apply for Leave</h3>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setIsApplyModalOpen(false)}>
                                Close
                            </button>
                        </div>
                        <form className="space-y-4" onSubmit={submitLeave}>
                            <div>
                                <label className="form-label">Leave Type</label>
                                <select className="form-select" value={leaveType} onChange={(e) => setLeaveType(e.target.value ? Number(e.target.value) : '')} required>
                                    <option value="">Select leave type</option>
                                    {leaveBalances.map((leave) => (
                                        <option key={leave.id} value={leave.id}>
                                            {leave.leave_name} ({leave.remaining_count} remaining)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">From Date</label>
                                    <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="form-label">To Date</label>
                                    <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Reason</label>
                                <textarea
                                    className="form-textarea min-h-[120px]"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Enter leave reason..."
                                />
                            </div>
                            <div className="rounded-md bg-primary-light/20 text-primary px-3 py-2 text-sm">
                                Requested duration: <span className="font-bold">{requestedDays || 0}</span> day(s)
                            </div>
                            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Leave Request'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplyLeave;
