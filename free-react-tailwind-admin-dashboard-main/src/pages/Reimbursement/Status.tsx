import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchReimbursements, ReimbursementRequest } from './api';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconFile from '../../components/Icon/IconFile';

const Status = () => {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Pagination and Search
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        dispatch(setPageTitle('Reimbursement Status'));
        loadRequests();
    }, [dispatch, page, pageSize, search]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await fetchReimbursements({
                search: search,
                page: page,
                page_size: pageSize,
            });
            setRequests(data.results);
            setTotalCount(data.count);
        } catch (error) {
            console.error('Failed to load requests', error);
        } finally {
            setLoading(false);
        }
    };
    
    const totalPages = Math.ceil(totalCount / pageSize);

    const stats = useMemo(() => {
        // Note: These stats are only for the current page. 
        // For accurate total stats, a separate "totals" endpoint would be ideal.
        const total = requests.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const approved = requests.filter(r => r.status === 'approved').reduce((acc, curr) => acc + Number(curr.amount), 0);
        const pending = requests.filter(r => r.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0);
        return { total, approved, pending };
    }, [requests]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="badge bg-success-light text-success border-0 capitalize px-3">{status}</span>;
            case 'rejected':
                return <span className="badge bg-danger-light text-danger border-0 capitalize px-3">{status}</span>;
            default:
                return <span className="badge bg-warning-light text-warning border-0 capitalize px-3">{status}</span>;
        }
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            {/* Header Banner */}
            <div className="panel bg-gradient-to-r from-[#22c55e] via-[#16a34a] to-[#15803d] text-white border-0 shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <IconListCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold">My Reimbursement Status</h1>
                            <p className="mt-1 text-white/80">Track your submitted expense claims and their approval status.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="panel bg-white dark:bg-[#0e1726] border-white-light dark:border-[#1b2e4b] shadow-md">
                    <p className="text-white-dark text-xs uppercase tracking-wider font-bold">Page Total Claimed</p>
                    <p className="text-2xl font-extrabold mt-1">₹{stats.total.toLocaleString()}</p>
                </div>
                <div className="panel bg-white dark:bg-[#0e1726] border-white-light dark:border-[#1b2e4b] shadow-md">
                    <p className="text-white-dark text-xs uppercase tracking-wider font-bold">Page Approved</p>
                    <p className="text-2xl font-extrabold mt-1 text-success">₹{stats.approved.toLocaleString()}</p>
                </div>
                <div className="panel bg-white dark:bg-[#0e1726] border-white-light dark:border-[#1b2e4b] shadow-md">
                    <p className="text-white-dark text-xs uppercase tracking-wider font-bold">Page Pending</p>
                    <p className="text-2xl font-extrabold mt-1 text-warning">₹{stats.pending.toLocaleString()}</p>
                </div>
            </div>

            {/* Table Panel */}
            <div className="panel p-0 border-0 overflow-hidden shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-5 gap-4 border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
                    <h5 className="font-bold text-xl dark:text-white-light">Request History</h5>
                    <div className="relative group">
                        <input
                            type="text"
                            className="form-input pr-10 w-full md:w-72 h-10 text-sm rounded-lg"
                            placeholder="Search by category, description..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                    </div>
                </div>

                <div className="table-responsive min-h-[400px]">
                    <table className="table-hover">
                                <thead>
                                    <tr className="bg-[#f8fafc] dark:bg-[#1a2234]">
                                        <th>Date</th>
                                        <th>Category</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Manager</th>
                                        <th>Description / Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-20">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-8 h-8 border-4 border-primary border-l-transparent rounded-full animate-spin"></div>
                                                    <span className="text-gray-500 font-semibold tracking-wide">Loading your requests...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : requests.length > 0 ? (
                                        requests.map((req) => (
                                            <tr key={req.id}>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <IconCalendar className="w-4 h-4 text-white-dark" />
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(req.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="font-semibold text-primary">{req.category_name}</td>
                                                <td className="font-bold text-lg">₹{req.amount}</td>
                                                <td>{getStatusBadge(req.status)}</td>
                                                <td className="text-white-dark">
                                                    <div className="flex flex-col">
                                                        <span>{req.reporting_manager_name || 'System Admin'}</span>
                                                        {req.bill_attachment && (
                                                            <a href={req.bill_attachment} target="_blank" rel="noreferrer" className="text-primary hover:underline text-[10px] flex items-center gap-1 mt-1">
                                                                <IconFile className="w-2.5 h-2.5" /> View My Bill
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="max-w-xs">
                                                    <p className="truncate text-gray-600 dark:text-gray-400" title={req.description}>{req.description}</p>
                                                    {req.status === 'rejected' && req.rejection_reason && (
                                                        <p className="text-danger mt-1 text-xs whitespace-normal bg-danger-light/20 p-2 rounded border border-danger/10">
                                                            <span className="font-bold">Rejected:</span> {req.rejection_reason}
                                                        </p>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-2">
                                            <IconListCheck className="w-12 h-12 text-gray-300" />
                                            <p className="text-gray-500 font-medium text-lg">No reimbursement requests found</p>
                                            {search && <p className="text-sm text-gray-400">Try adjusting your search query</p>}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalCount > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center p-5 gap-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b] bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 font-bold dark:text-gray-400">
                                Showing <span className="text-primary">{(page - 1) * pageSize + 1}</span> to <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-primary">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Per page:</span>
                                <select
                                    className="form-select w-20 h-9 text-sm font-semibold py-1 rounded-lg border-gray-200"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>
                        <ul className="inline-flex items-center space-x-2 font-bold">
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-bold px-4 py-2 rounded-lg transition bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    Previous
                                </button>
                            </li>
                            {(() => {
                                const pages: (number | string)[] = [];
                                if (totalPages <= 3) {
                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                    pages.push(1);
                                    let start = Math.max(2, page - 1);
                                    let end = Math.min(totalPages - 1, page + 1);
                                    if (page <= 2) {
                                        end = Math.min(totalPages - 1, 3);
                                    } else if (page >= totalPages - 1) {
                                        start = Math.max(2, totalPages - 2);
                                    }
                                    if (start > 2) pages.push('left-ellipsis');
                                    for (let i = start; i <= end; i++) pages.push(i);
                                    if (end < totalPages - 1) pages.push('right-ellipsis');
                                    pages.push(totalPages);
                                }
                                return pages.map((p, idx) => {
                                    if (p === 'left-ellipsis' || p === 'right-ellipsis') {
                                        const jumpPage = p === 'left-ellipsis' ? Math.max(1, page - 3) : Math.min(totalPages, page + 3);
                                        return (
                                            <li key={`${p}-${idx}`}>
                                                <button
                                                    type="button"
                                                    title={p === 'left-ellipsis' ? "Previous 3 pages" : "Next 3 pages"}
                                                    className="flex justify-center font-bold px-4 py-2 rounded-lg transition bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary cursor-pointer text-xs uppercase"
                                                    onClick={() => setPage(jumpPage)}
                                                >
                                                    ...
                                                </button>
                                            </li>
                                        );
                                    }
                                    return (
                                        <li key={p}>
                                            <button
                                                type="button"
                                                className={`flex justify-center font-bold px-4 py-2 rounded-lg transition text-xs ${page === p ? 'bg-primary text-white shadow-lg border-primary' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'}`}
                                                onClick={() => setPage(p as number)}
                                            >
                                                {p}
                                            </button>
                                        </li>
                                    );
                                });
                            })()}
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-bold px-4 py-2 rounded-lg transition bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Status;
