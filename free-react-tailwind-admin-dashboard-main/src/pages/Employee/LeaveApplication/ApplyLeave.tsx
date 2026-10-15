import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconCalendar from '../../../components/Icon/IconCalendar';
import PageHeader from '../../../components/Common/PageHeader';
import Button from '../../../components/Common/Button';
import DataTable, { Column } from '../../../components/Common/DataTable';
import Modal from '../../../components/Common/Modal';
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
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
};

const dateDiff = (fromDate: string, toDate: string) => {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    const diff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diff);
};

const getLocalTodayISO = (): string => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

/** Compare yyyy-mm-dd to local calendar "today" (avoids UTC midnight parsing issues). */
const isLocalDateBeforeToday = (isoDate: string): boolean => {
    const parts = isoDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
    const [y, m, d] = parts;
    const cand = new Date(y, m - 1, d);
    cand.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return cand.getTime() < today.getTime();
};

const formatLeaveDurationLabel = (d?: string) => (d === 'half_day' ? 'Half day' : 'Full day');

const requestDayUnits = (fromDate: string, toDate: string, leaveDuration?: string) => {
    const days = dateDiff(fromDate, toDate);
    if (leaveDuration === 'half_day' && fromDate && toDate && fromDate === toDate) return 0.5;
    return days;
};

const canCancelLeaveRequest = (request: LeaveRequest) => {
    if (!(request.status === 'Pending' || request.status === 'Approved')) return false;
    if (!request.from_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(request.from_date);
    from.setHours(0, 0, 0, 0);
    if (Number.isNaN(from.getTime())) return false;
    // Allow cancellation only before leave starts, or on the start date.
    return today.getTime() <= from.getTime();
};

const ApplyLeave = () => {
    const dispatch = useDispatch();
    const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
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

    const minLeaveDateStr = getLocalTodayISO();
    const toDateInputMin =
        leaveDuration === 'half_day' && fromDate
            ? fromDate
            : fromDate && fromDate >= minLeaveDateStr
              ? fromDate
              : minLeaveDateStr;

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

    const requestedDayUnits = useMemo(() => requestDayUnits(fromDate, toDate, leaveDuration), [fromDate, toDate, leaveDuration]);

    const resetForm = () => {
        setLeaveType('');
        setFromDate('');
        setToDate('');
        setReason('');
        setLeaveDuration('full_day');
        setFormError(null);
    };

    const submitLeave = async (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);

        if (!leaveType) {
            setFormError('Please select a leave type.');
            return;
        }
        if (!fromDate || !toDate) {
            setFormError('Please choose both from and to dates.');
            return;
        }
        if (isLocalDateBeforeToday(fromDate)) {
            setFormError('From date cannot be in the past.');
            return;
        }
        if (isLocalDateBeforeToday(toDate)) {
            setFormError('To date cannot be in the past.');
            return;
        }
        if (new Date(fromDate).getTime() > new Date(toDate).getTime()) {
            setFormError('From date cannot be after to date.');
            return;
        }
        if (leaveDuration === 'half_day' && fromDate !== toDate) {
            setFormError('Half day leave must use the same from and to date.');
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
            setFormError(message);
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

    const columns: Column<LeaveRequest>[] = [
        { key: 'leave_type_name', title: 'Leave Type', render: (v) => <span className="font-semibold">{v || '-'}</span> },
        { key: 'leave_duration', title: 'Duration', hideBelow: 'md', render: (v) => formatLeaveDurationLabel(v) },
        { key: 'from_date', title: 'From', render: (v) => formatDate(v) },
        { key: 'to_date', title: 'To', render: (v) => formatDate(v) },
        { key: 'days', title: 'Days', hideBelow: 'md', render: (_v, r) => requestDayUnits(r.from_date, r.to_date, r.leave_duration) },
        { key: 'status', title: 'Status', render: (v) => <span className={`badge ${statusStyleMap[v as keyof typeof statusStyleMap]}`}>{v}</span> },
        {
            key: 'reason', title: 'Reason', hideBelow: 'lg',
            render: (_v, r) => (
                <div className="max-w-[320px]">
                    <p className="truncate" title={r.reason || ''}>{r.reason || '-'}</p>
                    {r.status === 'Rejected' && r.rejection_reason && <p className="mt-1 whitespace-normal text-xs text-danger">Reason: {r.rejection_reason}</p>}
                </div>
            ),
        },
        {
            key: 'actions', title: 'Action', align: 'center',
            render: (_v, r) =>
                canCancelLeaveRequest(r) ? (
                    <Button variant="outline-danger" size="sm" disabled={cancellingId === r.id} onClick={() => onCancelLeave(r.id)}>
                        {cancellingId === r.id ? 'Cancelling...' : 'Cancel'}
                    </Button>
                ) : (
                    <span className="text-xs text-white-dark">-</span>
                ),
        },
    ];

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <PageHeader
                title="Leave Application"
                subtitle="Apply for leave, track manager approvals, check your available leave balances, and review history."
                icon={<IconCalendar />}
                badge="Time Off & Leaves"
                variant="primary"
                actions={
                    <Button className="w-full md:w-auto"
                        type="button"
                        
                        onClick={() => {
                            setLeaveDuration('full_day');
                            setFormError(null);
                            setIsApplyModalOpen(true);
                        }}
                    >
                        Apply Leave
                    </Button>
                }
            />

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
                        <Button variant="outline" size="sm" type="button"  onClick={() => setShowAllBalances((prev) => !prev)}>
                            {showAllBalances ? 'Show Less' : `Show All (${leaveBalances.length})`}
                        </Button>
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

            <DataTable
                title="My Leave Requests"
                columns={columns}
                data={leaveRequests}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                onRefresh={loadData}
                searchPlaceholder="Search leave request..."
                emptyMessage="No leave requests found"
                entityLabel="requests"
                filters={
                    <select className="form-select h-10 w-44 rounded-xl" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}>
                        <option value="all">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                }
            />

            <Modal open={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Apply for Leave" size="2xl">
                                {formError && (
                                    <div className="mb-4 rounded-md border border-danger/30 bg-danger-light text-danger px-3 py-2 text-sm whitespace-pre-line">
                                        {formError}
                                    </div>
                                )}
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
                                            <input
                                                type="date"
                                                className="form-input"
                                                min={minLeaveDateStr}
                                                value={fromDate}
                                                onChange={(e) => setFromDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">To Date</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                min={toDateInputMin}
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
                                    <Button className="w-full" type="submit"  disabled={submitting}>
                                        {submitting ? 'Submitting...' : 'Submit Leave Request'}
                                    </Button>
                                </form>
            </Modal>
        </div>
    );
};

export default ApplyLeave;
