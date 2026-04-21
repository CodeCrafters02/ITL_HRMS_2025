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

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [leaveType, setLeaveType] = useState<number | ''>('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [reason, setReason] = useState('');

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

    const totalBalance = useMemo(() => leaveBalances.reduce((sum, leave) => sum + leave.count, 0), [leaveBalances]);
    const totalRemaining = useMemo(() => leaveBalances.reduce((sum, leave) => sum + leave.remaining_count, 0), [leaveBalances]);
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
            {/* ─── Premium Header Banner ─── */}
            <div className="relative bg-gradient-to-r from-[#f43f5e] to-[#fb923c] rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-lg">
                {/* Decorative blurs */}
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-1/4 -mb-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
                            <IconCalendar className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Leave Application</h1>
                            <p className="text-white/80 mt-1 font-medium max-w-md">
                                Plan your time off, track approval workflows, and manage your leave balances seamlessly.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                            type="button" 
                            className="bg-white text-rose-600 hover:bg-rose-50 transition-all px-8 py-3 rounded-xl font-bold text-sm shadow-xl active:scale-95 flex items-center gap-2 w-full md:w-auto justify-center" 
                            onClick={() => setIsApplyModalOpen(true)}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                            Apply for Leave
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            {/* ─── Leave Balances Bar ─── */}
            <div className="panel p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold">Leave Balances</h3>
                        <p className="text-xs text-white-dark mt-1">Check your remaining leave quotas per type.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-white-dark tracking-wider leading-none">Total Yearly</p>
                            <p className="text-lg font-bold text-primary">{totalBalance} Days</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-800"></div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-white-dark tracking-wider leading-none">Total Remaining</p>
                            <p className="text-lg font-bold text-success">{totalRemaining} Days</p>
                        </div>
                        {leaveBalances.length > leaveBalancePreviewCount && (
                            <button type="button" className="btn btn-sm btn-outline-primary ml-2 py-1.5" onClick={() => setShowAllBalances((prev) => !prev)}>
                                {showAllBalances ? 'Show Less' : `Show All (${leaveBalances.length})`}
                            </button>
                        )}
                    </div>
                </div>
                
                {loading && leaveBalances.length === 0 ? (
                    <div className="flex items-center gap-2 text-white-dark py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Loading balances...</span>
                    </div>
                ) : leaveBalances.length === 0 ? (
                    <p className="text-white-dark py-4">No leave policies assigned yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                        {visibleLeaveBalances.map((leave) => {
                            const percentUsed = leave.count ? Math.min(100, Math.round((leave.used_count / leave.count) * 100)) : 0;
                            return (
                                <div key={leave.id} className="rounded-xl border border-white-light dark:border-[#1b2e4b] p-3.5 bg-white dark:bg-[#111c2d] hover:shadow-md transition-shadow">
                                    <div className="mb-2.5 flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold truncate text-primary uppercase tracking-tight">{leave.leave_name}</p>
                                            <p className="text-lg font-extrabold mt-0.5">{leave.remaining_count}<span className="text-[10px] text-white-dark font-normal ml-0.5">left</span></p>
                                        </div>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${leave.is_paid ? 'bg-success-light text-success' : 'bg-dark-light text-white-dark'}`}>
                                            {leave.is_paid ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>

                                    <div className="h-1.5 bg-[#ebedf2] dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${percentUsed}%` }} />
                                    </div>

                                    <div className="mt-2 flex items-center justify-between text-[10px] text-white-dark font-semibold">
                                        <span>Total: {leave.count}</span>
                                        <span>{percentUsed}% used</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── My Leave Requests Table ─── */}
            <div className="panel p-0 border-0 overflow-hidden">
                {/* Filters Row */}
                <div className="p-5 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold">My Leave Requests</h3>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-bold text-white-dark uppercase tracking-wider">Status</label>
                                <select 
                                    className="form-select sm:w-[140px] text-xs py-1.5 h-9" 
                                    value={statusFilter} 
                                    onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                                >
                                    <option value="all">All Request</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div className="relative sm:w-[240px]">
                                <input
                                    type="text"
                                    className="form-input pl-9 text-xs py-1.5 h-9"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Search by reason or type..."
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                    <IconSearch className="w-4 h-4" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Data */}
                <div className="table-responsive">
                    <table className="table-hover text-sm">
                        <thead className="bg-[#f6f8fa] dark:bg-[#1a2941]">
                            <tr>
                                <th className="!py-3 font-bold uppercase tracking-wider text-xs">Leave Type</th>
                                <th className="!py-3 font-bold uppercase tracking-wider text-xs">From Date</th>
                                <th className="!py-3 font-bold uppercase tracking-wider text-xs">To Date</th>
                                <th className="!py-3 font-bold uppercase tracking-wider text-xs text-center">Days</th>
                                <th className="!py-3 font-bold uppercase tracking-wider text-xs">Status</th>
                                <th className="!py-3 font-bold uppercase tracking-wider text-xs">Reason / Response</th>
                                <th className="!py-3 font-bold uppercase tracking-wider text-xs text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && leaveRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            <span className="text-sm text-white-dark">Fetching your requests...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : leaveRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-2">
                                            <IconCalendar className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                                            <span className="text-sm font-medium text-gray-400">No leave requests found</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                leaveRequests.map((request) => (
                                    <tr key={request.id} className="group transition-colors">
                                        <td className="!py-4 font-bold text-gray-700 dark:text-gray-300">{request.leave_type_name || '-'}</td>
                                        <td className="!py-4">{formatDate(request.from_date)}</td>
                                        <td className="!py-4">{formatDate(request.to_date)}</td>
                                        <td className="!py-4 text-center font-bold">{dateDiff(request.from_date, request.to_date)}</td>
                                        <td className="!py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-tighter ${statusStyleMap[request.status]}`}>
                                                {request.status}
                                            </span>
                                        </td>
                                        <td className="!py-4 max-w-[300px]">
                                            <p className="truncate text-xs" title={request.reason || ''}>{request.reason || '-'}</p>
                                            {request.status === 'Rejected' && request.rejection_reason && (
                                                <p className="text-danger mt-1 text-[11px] font-medium leading-relaxed bg-danger/5 p-1.5 rounded border border-danger/20">
                                                    Manager: {request.rejection_reason}
                                                </p>
                                            )}
                                        </td>
                                        <td className="!py-4 text-center">
                                            {(request.status === 'Pending' || request.status === 'Approved') ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger h-8 font-bold px-4 hover:bg-danger hover:text-white"
                                                    disabled={cancellingId === request.id}
                                                    onClick={() => onCancelLeave(request.id)}
                                                >
                                                    {cancellingId === request.id ? '...' : 'Cancel'}
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

                {/* Pagination Integration */}
                {totalCount > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center p-5 gap-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] bg-[#fbfbfb] dark:bg-[#0e1726]/30">
                        <div className="flex items-center gap-5">
                            <div className="text-xs text-white-dark font-bold">
                                Showing <span className="text-primary">{(page - 1) * pageSize + 1}</span> to{' '}
                                <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                                <span className="text-primary">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-white-dark uppercase tracking-widest">Entry:</span>
                                <select
                                    className="form-select w-16 text-xs font-bold py-1 h-8"
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>
                        
                        <ul className="inline-flex items-center space-x-1 font-bold">
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center p-2 rounded-xl transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-30 disabled:cursor-not-allowed h-9 w-9 items-center"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                </button>
                            </li>
                            {getPageNumbers().map((p, idx) =>
                                p === '...' ? (
                                    <li key={`dots-${idx}`} className="px-1 text-white-dark">…</li>
                                ) : (
                                    <li key={p}>
                                        <button
                                            type="button"
                                            className={`flex justify-center px-3.5 h-9 min-w-[36px] rounded-xl transition items-center text-xs ${
                                                page === p
                                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                                    : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'
                                            }`}
                                            onClick={() => setPage(p as number)}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                )
                            )}
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center p-2 rounded-xl transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-30 disabled:cursor-not-allowed h-9 w-9 items-center"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Apply Modal */}
            {isApplyModalOpen && (
                <div className="fixed inset-0 z-[1000] bg-black/60 p-4 flex items-center justify-center p-4" onClick={() => setIsApplyModalOpen(false)}>
                    <div className="panel w-full max-w-2xl max-h-[92vh] overflow-auto dark:bg-[#0e1726] border-0 shadow-2xl rounded-2xl animate__animated animate__zoomIn" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 mb-6 p-1">
                            <div>
                                <h3 className="text-xl font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">Apply for Leave</h3>
                                <p className="text-xs text-white-dark mt-0.5">Please provide accurate details for your request.</p>
                            </div>
                            <button type="button" className="p-2 text-white-dark hover:text-danger hover:bg-danger/10 rounded-full transition-all" onClick={() => setIsApplyModalOpen(false)}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form className="space-y-5" onSubmit={submitLeave}>
                            <div className="grid grid-cols-1 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Leave Category</label>
                                    <select className="form-select h-11 rounded-xl" value={leaveType} onChange={(e) => setLeaveType(e.target.value ? Number(e.target.value) : '')} required>
                                        <option value="">Choose leave type</option>
                                        {leaveBalances.map((leave) => (
                                            <option key={leave.id} value={leave.id}>
                                                {leave.leave_name} — ({leave.remaining_count} remaining)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Start Date</label>
                                        <input type="date" className="form-input h-11 rounded-xl" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">End Date</label>
                                        <input type="date" className="form-input h-11 rounded-xl" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Purpose / Reason</label>
                                    <textarea
                                        className="form-textarea min-h-[120px] rounded-xl pt-3"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Explain the reason for your leave..."
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">Total Duration</span>
                                <div className="flex items-center gap-1.5 text-primary">
                                    <span className="text-2xl font-black">{requestedDays || 0}</span>
                                    <span className="text-xs font-bold uppercase">Days</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" className="btn btn-outline-danger flex-1 h-11 rounded-xl font-bold" onClick={() => setIsApplyModalOpen(false)}>Cancel</button>
                                <button type="submit" className="bg-gradient-to-r from-rose-600 to-orange-500 text-white flex-1 h-11 rounded-xl font-bold shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-all disabled:opacity-50" disabled={submitting}>
                                    {submitting ? 'Processing...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplyLeave;
