import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchReimbursements, approveReimbursement, rejectReimbursement, ReimbursementRequest } from './api';
import Swal from 'sweetalert2';
import IconChecks from '../../components/Icon/IconChecks';
import IconEye from '../../components/Icon/IconEye';

const Approvals = () => {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Pagination and Search
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        dispatch(setPageTitle('Reimbursement Approvals'));
        loadRequests();
    }, [dispatch, page, pageSize, search]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            // We pass status=pending to the backend to filter at the source
            const data = await fetchReimbursements({
                search: search,
                page: page,
                page_size: pageSize,
                status: 'pending' // Only show pending in approvals
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

    const handleApprove = async (id: number) => {
        const result = await Swal.fire({
            title: 'Approve Claim?',
            text: "Are you sure you want to approve this reimbursement?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Approve',
            confirmButtonColor: '#10b981'
        });

        if (result.isConfirmed) {
            try {
                await approveReimbursement(id);
                Swal.fire('Approved', 'Reimbursement request approved', 'success');
                loadRequests();
            } catch (error) {
                Swal.fire('Error', 'Failed to approve request', 'error');
            }
        }
    };

    const handleReject = async (id: number) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Request',
            input: 'textarea',
            inputLabel: 'Reason for rejection',
            inputPlaceholder: 'Type your reason here...',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'You need to write a reason for rejection!';
                }
            }
        });

        if (reason) {
            try {
                await rejectReimbursement(id, reason);
                Swal.fire('Rejected', 'Reimbursement request rejected', 'info');
                loadRequests();
            } catch (error) {
                Swal.fire('Error', 'Failed to reject request', 'error');
            }
        }
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            {/* Header Banner */}
            <div className="panel bg-gradient-to-r from-[#ef4444] via-[#f97316] to-[#f59e0b] text-white border-0 shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0 shadow-inner">
                            <IconChecks className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Pending Approvals</h1>
                            <p className="mt-1 text-white/90 font-medium">Review and manage pending reimbursement claims from your team.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Panel */}
            <div className="panel p-0 border-0 overflow-hidden shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-5 gap-4 border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
                    <div className="flex items-center gap-3">
                        <h5 className="font-bold text-xl dark:text-white-light">Pending Claims</h5>
                        <span className="badge bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs rounded-full">{totalCount} Total Pending</span>
                    </div>
                    
                    <div className="relative group">
                        <input
                            type="text"
                            className="form-input pr-10 w-full md:w-72 h-11 text-sm rounded-lg border-gray-300 focus:border-primary transition-all shadow-sm"
                            placeholder="Search by employee, category..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                    </div>
                </div>

                <div className="table-responsive min-h-[400px]">
                    <table className="table-hover">
                        <thead>
                            <tr className="bg-[#f8fafc] dark:bg-[#1a2234]">
                                <th className="py-4">Employee</th>
                                <th className="py-4">Category</th>
                                <th className="py-4">Amount</th>
                                <th className="py-4">Description</th>
                                <th className="py-4">Proof</th>
                                <th className="py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-primary border-l-transparent rounded-full animate-spin"></div>
                                            <span className="text-gray-500 font-semibold tracking-wide">Fetching Pending Claims...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : requests.length > 0 ? (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-primary/5 transition-colors group">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-sm">
                                                    {req.employee_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200 block">{req.employee_name}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Employee</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-100 dark:border-blue-800">
                                                {req.category_name}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-black text-lg text-gray-900 dark:text-white">₹{req.amount}</span>
                                                <span className="text-[10px] text-green-500 font-bold uppercase">Tax Included</span>
                                            </div>
                                        </td>
                                        <td className="max-w-xs">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2" title={req.description}>
                                                {req.description}
                                            </p>
                                        </td>
                                        <td>
                                            {req.bill_attachment ? (
                                                <a 
                                                    href={req.bill_attachment} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-primary hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                                                >
                                                    <IconEye className="w-3.5 h-3.5" />
                                                    View Bill
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 text-[11px] font-bold uppercase italic tracking-tighter">No attachment</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <div className="flex justify-center gap-3">
                                                <button 
                                                    className="btn btn-sm bg-green-500 hover:bg-green-600 text-white border-0 shadow-sm hover:shadow-green-500/30 transition-all font-bold px-4" 
                                                    onClick={() => handleApprove(req.id)}
                                                >
                                                    Approve
                                                </button>
                                                <button 
                                                    className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm hover:shadow-red-500/30 transition-all font-bold px-4" 
                                                    onClick={() => handleReject(req.id)}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-200">
                                                <IconChecks className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-2">Zero Pending Requests</h3>
                                            <p className="text-gray-400 text-sm max-w-[250px]">Great job! You have cleared all the reimbursement claims in your queue.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalCount > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center p-6 gap-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b] bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-6">
                            <div className="text-sm text-gray-500 font-bold dark:text-gray-400 uppercase tracking-widest">
                                Showing <span className="text-primary">{(page - 1) * pageSize + 1}</span> - <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-primary">{totalCount}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black uppercase text-gray-400 tracking-tighter">Per page:</span>
                                <select
                                    className="form-select w-24 h-9 text-xs font-bold rounded-lg border-gray-200 shadow-sm"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                >
                                    <option value="10">10 Rows</option>
                                    <option value="20">20 Rows</option>
                                    <option value="50">50 Rows</option>
                                </select>
                            </div>
                        </div>
                        <ul className="inline-flex items-center space-x-2 font-bold">
                            <li>
                                <button
                                    type="button"
                                    className="flex items-center justify-center h-10 px-4 rounded-xl transition bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-white hover:bg-primary hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed shadow-sm text-xs uppercase"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    Prev
                                </button>
                            </li>
                            {(() => {
                                const pages: (number | string)[] = [];
                                if (totalPages <= 3) {
                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                    if (page <= 2) {
                                        pages.push(1, 2, 3, 'right-ellipsis', totalPages);
                                    } else if (page >= totalPages - 1) {
                                        pages.push(1, 'left-ellipsis', totalPages - 2, totalPages - 1, totalPages);
                                    } else {
                                        pages.push(1, 'left-ellipsis', page, 'right-ellipsis', totalPages);
                                    }
                                }
                                return pages.map((p, idx) => {
                                    if (p === 'left-ellipsis' || p === 'right-ellipsis') {
                                        const jumpPage = p === 'left-ellipsis' ? Math.max(1, page - 3) : Math.min(totalPages, page + 3);
                                        return (
                                            <li key={`${p}-${idx}`}>
                                                <button
                                                    type="button"
                                                    title={p === 'left-ellipsis' ? "Previous 3 pages" : "Next 3 pages"}
                                                    className="flex items-center justify-center w-10 h-10 rounded-xl transition text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-white hover:bg-primary cursor-pointer"
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
                                                className={`flex items-center justify-center w-10 h-10 rounded-xl transition text-xs ${page === p ? 'bg-primary text-white shadow-lg shadow-primary/30 border-primary' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-white hover:bg-primary'}`}
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
                                    className="flex items-center justify-center h-10 px-4 rounded-xl transition bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-white hover:bg-primary hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed shadow-sm text-xs uppercase"
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

export default Approvals;
