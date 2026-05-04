import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconCalendar from '../../../components/Icon/IconCalendar';
import IconSearch from '../../../components/Icon/IconSearch';
import {
    LeaveBalance,
    LeaveDuration,
    LeaveRequest,
    LeaveStatus,
    cancelLeaveRequest,
    createLeaveRequest,
    fetchLeaveBalances,
    fetchMyLeaveRequests,
} from './api';

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

const formatLeaveDurationLabel = (d?: string) => (d === 'half_day' ? 'Half day' : 'Full day');

const requestDayUnits = (fromDate: string, toDate: string, leaveDuration?: string) => {
    const days = dateDiff(fromDate, toDate);
    if (leaveDuration === 'half_day' && fromDate && toDate && fromDate === toDate) return 0.5;
    return days;
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

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [leaveType, setLeaveType] = useState<number | ''>('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [reason, setReason] = useState('');
    const [leaveDuration, setLeaveDuration] = useState<LeaveDuration>('full_day');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [balances, requestsData] = await Promise.all([
                fetchLeaveBalances(), 
                fetchMyLeaveRequests({ 
                    page, 
                    page_size: pageSize, 
                    search: search.trim(), 
                    status: statusFilter 
                })
            ]);
            setLeaveBalances(balances);
            setLeaveRequests(requestsData.results);
            setTotalCount(requestsData.count);
            setTotalPages(requestsData.total_pages);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load leave data';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, statusFilter]);

    useEffect(() => {
        dispatch(setPageTitle('Leave Application'));
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadData]);

    useEffect(() => {
        if (leaveDuration === 'half_day' && fromDate) {
            setToDate(fromDate);
        }
    }, [leaveDuration, fromDate]);

    const totalBalance = useMemo(() => leaveBalances.reduce((sum, leave) => sum + leave.count, 0), [leaveBalances]);
    const totalRemaining = useMemo(() => leaveBalances.reduce((sum, leave) => sum + leave.remaining_count, 0), [leaveBalances]);
    const pendingCount = useMemo(() => leaveRequests.filter((request) => request.status === 'Pending').length, [leaveRequests]);
    const approvedCount = useMemo(() => leaveRequests.filter((request) => request.status === 'Approved').length, [leaveRequests]);
    const leaveBalancePreviewCount = 6;
    const visibleLeaveBalances = useMemo(() => {
        if (showAllBalances) return leaveBalances;
        return leaveBalances.slice(0, leaveBalancePreviewCount);
    }, [leaveBalances, showAllBalances]);

    // Smart Pagination logic
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const requestedDayUnits = useMemo(() => requestDayUnits(fromDate, toDate, leaveDuration), [fromDate, toDate, leaveDuration]);

    const resetForm = () => {
        setLeaveType('');
        setFromDate('');
        setToDate('');
        setReason('');
        setLeaveDuration('full_day');
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
        if (leaveDuration === 'half_day' && fromDate !== toDate) {
            setError('Half day leave must use the same from and to date.');
            return;
        }

        try {
            setSubmitting(true);
            await createLeaveRequest({
                leave_type: Number(leaveType),
                from_date: fromDate,
                to_date: toDate,
                reason,
                leave_duration: leaveDuration,
            });
            resetForm();
            setIsApplyModalOpen(false);
            setPage(1); // Reset to first page to see new request
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
            <div className="panel bg-gradient-to-r from-[#220fb6] via-[#4f6be5] to-[#0f52af] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <IconCalendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold">Leave Application</h1>
                            <p className="mt-1 text-white/80">Apply for leave, monitor approvals, and manage balance usage.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary w-full md:w-auto"
                        onClick={() => {
                            setLeaveDuration('full_day');
                            setError(null);
                            setIsApplyModalOpen(true);
                        }}
                    >
                        Apply Leave
                    </button>
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
                {loading && leaveBalances.length === 0 ? (
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
                                        <div>
                                            <p className="font-semibold">{leave.leave_name}</p>
                                            <p className="text-sm text-white-dark mt-1">{leave.remaining_count} / {leave.count} remaining</p>
                                        </div>
                                        <span className={`badge ${leave.is_paid ? 'bg-success-light text-success' : 'bg-dark-light text-white-dark'}`}>
                                            {leave.is_paid ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-[#ebedf2] dark:bg-[#1b2e4b] rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full" style={{ width: `${percentUsed}%` }} />
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-white-dark">
                                        <span>Used: {leave.used_count}</span>
                                        <span>{percentUsed}%</span>
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
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search leave request..."
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                <IconSearch className="w-4 h-4" />
                            </span>
                        </div>
                        <select className="form-select sm:w-[180px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}>
                            <option value="all">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {totalCount > 0 && (
                    <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-xs text-white-dark">
                            Showing <span className="text-primary font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
                            <span className="text-primary font-semibold">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                            <span className="text-primary font-semibold">{totalCount}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-white-dark">Per page</span>
                            <select
                                className="form-select w-20 text-xs"
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                        </div>

                        <ul className="inline-flex items-center gap-1">
                            <li>
                                <button type="button" className="btn btn-sm btn-outline-primary px-2.5" onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page === 1}>
                                    Prev
                                </button>
                            </li>
                            {getPageNumbers().map((p, idx) =>
                                p === '...' ? <li key={`dots-${idx}`} className="px-2 text-white-dark">...</li> : (
                                    <li key={p}>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-outline-primary'} min-w-[34px]`}
                                            onClick={() => setPage(p as number)}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                ),
                            )}
                            <li>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary px-2.5"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                )}

                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                            <th>Leave Type</th>
                            <th>Duration</th>
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
                                    <td colSpan={8} className="text-center py-8 text-white-dark">
                                        Loading leave requests...
                                    </td>
                                </tr>
                            ) : leaveRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-white-dark">
                                        No leave requests found.
                                    </td>
                                </tr>
                            ) : (
                                leaveRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td className="font-semibold">{request.leave_type_name || '-'}</td>
                                        <td>{formatLeaveDurationLabel(request.leave_duration)}</td>
                                        <td>{formatDate(request.from_date)}</td>
                                        <td>{formatDate(request.to_date)}</td>
                                        <td>{requestDayUnits(request.from_date, request.to_date, request.leave_duration)}</td>
                                        <td>
                                            <span className={`badge ${statusStyleMap[request.status]}`}>
                                                {request.status}
                                            </span>
                                        </td>
                                        <td className="max-w-[320px] truncate" title={request.reason || ''}>
                                            {request.reason || '-'}
                                            {request.status === 'Rejected' && request.rejection_reason && (
                                                <p className="text-danger mt-1 whitespace-normal text-xs">
                                                    Reason: {request.rejection_reason}
                                                </p>
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
                            <div>
                                <label className="form-label">Leave duration</label>
                                <div className="flex flex-wrap gap-4 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="leave_duration"
                                            className="form-radio"
                                            checked={leaveDuration === 'full_day'}
                                            onChange={() => setLeaveDuration('full_day')}
                                        />
                                        <span>Full day</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="leave_duration"
                                            className="form-radio"
                                            checked={leaveDuration === 'half_day'}
                                            onChange={() => setLeaveDuration('half_day')}
                                        />
                                        <span>Half day (same from / to date)</span>
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">From Date</label>
                                    <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="form-label">To Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        disabled={leaveDuration === 'half_day'}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Reason</label>
                                <textarea
                                    className="form-textarea min-h-[120px]"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Enter leave reason..."
                                    required
                                />
                            </div>
                            <div className="rounded-md bg-primary-light/20 text-primary px-3 py-2 text-sm">
                                Requested duration: <span className="font-bold">{requestedDayUnits || 0}</span> day(s)
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
