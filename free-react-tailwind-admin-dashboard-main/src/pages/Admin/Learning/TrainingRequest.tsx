import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import DataTable, { Column } from '../../../components/Common/DataTable';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconX from '../../../components/Icon/IconX';
import IconOpenBook from '../../../components/Icon/IconOpenBook';
import PageHeader from '../../../components/Common/PageHeader';

import Modal from '../../../components/Common/Modal';
import Button, { IconButton } from '../../../components/Common/Button';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const REQUESTS_API = `${API_BASE_URL}/employee/training-requests/`;

type TrainingRequestType = {
    id: number;
    employee: number;
    employee_name: string;
    employee_id: string;
    employee_email: string;
    course?: number | null;
    course_title?: string | null;
    custom_course_title: string;
    reason: string;
    manager?: number | null;
    manager_name?: string | null;
    manager_status: 'pending' | 'approved' | 'rejected' | 'not_required';
    manager_remarks: string;
    admin_status: 'pending' | 'approved' | 'rejected' | 'not_required';
    admin_remarks: string;
    final_status: 'pending' | 'approved' | 'rejected';
    decided_by: 'manager' | 'admin' | null;
    budget_required: boolean;
    budget_status: 'pending' | 'approved' | 'rejected' | 'not_required';
    created_at: string;
    updated_at: string;
};

const TrainingRequest = () => {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<TrainingRequestType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Review Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<TrainingRequestType | null>(null);
    const [reviewForm, setReviewForm] = useState({
        admin_status: 'pending' as any,
        admin_remarks: '',
        budget_required: false,
        budget_status: 'not_required' as any,
    });

    useEffect(() => {
        dispatch(setPageTitle('Training Requests'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchRequests();
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [search, filterStatus, page, limit]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const url = new URL(REQUESTS_API);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('limit', limit.toString());
            if (search) url.searchParams.append('search', search);
            if (filterStatus !== 'all') url.searchParams.append('final_status', filterStatus);

            const response = await authFetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setRequests(data.results);
                    setTotalCount(data.count);
                    setTotalPages(data.total_pages || Math.ceil(data.count / limit));
                } else if (Array.isArray(data)) {
                    setRequests(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                } else {
                    setRequests([]);
                    setTotalCount(0);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching training requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabCounts = useMemo(() => ({
        all: totalCount,
        approved: filterStatus === 'approved' ? totalCount : 0,
        pending: filterStatus === 'pending' ? totalCount : 0,
        rejected: filterStatus === 'rejected' ? totalCount : 0,
    }), [totalCount, filterStatus]);

    const openReviewModal = (req: TrainingRequestType) => {
        setSelectedRequest(req);
        setReviewForm({
            admin_status: req.admin_status,
            admin_remarks: req.admin_remarks || '',
            budget_required: req.budget_required,
            budget_status: req.budget_status,
        });
        setModalOpen(true);
    };

    const handleSaveReview = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedRequest) return;
        setSaving(true);

        const payload = {
            admin_status: reviewForm.admin_status,
            admin_remarks: reviewForm.admin_remarks,
            budget_required: reviewForm.budget_required,
            budget_status: reviewForm.budget_required ? reviewForm.budget_status : 'not_required',
        };

        try {
            const response = await authFetch(`${REQUESTS_API}${selectedRequest.id}/`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Reviewed!',
                    text: 'Training request status updated.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                setModalOpen(false);
                fetchRequests();
            } else {
                Swal.fire('Error!', 'Failed to update request status.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server communication failure.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (req: TrainingRequestType) => {
        const result = await Swal.fire({
            title: 'Delete Request?',
            text: `Remove training request from ${req.employee_name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${REQUESTS_API}${req.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire('Deleted!', 'Request deleted.', 'success');
                fetchRequests();
            } else {
                Swal.fire('Error!', 'Could not delete request.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection error.', 'error');
        }
    };

    const statusCls = (st: string) => (st === 'approved' ? 'bg-success text-white' : st === 'rejected' ? 'bg-danger text-white' : 'bg-amber-500 text-white');

    const columns: Column<TrainingRequestType>[] = [
        {
            key: 'employee_name', title: 'Employee',
            render: (_v, r) => (
                <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">{r.employee_name}</div>
                    <span className="text-xs text-gray-400 block truncate max-w-[150px]">{r.employee_email}</span>
                </div>
            ),
        },
        {
            key: 'course_title', title: 'Requested Training',
            render: (_v, r) => (
                <div>
                    <div className={`font-bold ${r.course_title ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>{r.course_title || r.custom_course_title}</div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">{r.course_title ? 'Catalog Course' : 'Custom Request'}</span>
                </div>
            ),
        },
        { key: 'reason', title: 'Reason / Business Case', hideBelow: 'lg', render: (v) => <div className="text-xs max-w-[200px] truncate" title={v}>{v || '—'}</div> },
        {
            key: 'manager_status', title: 'Manager Decision', hideBelow: 'md',
            render: (_v, r) => (
                <div className="flex flex-col gap-0.5">
                    <span className={`badge text-[9px] font-bold uppercase w-max px-2 rounded-full ${statusCls(r.manager_status)}`}>{r.manager_status}</span>
                    {r.manager_name && <span className="text-[9px] text-gray-400 block">By: {r.manager_name}</span>}
                </div>
            ),
        },
        { key: 'admin_status', title: 'Admin Decision', hideBelow: 'md', render: (v) => <span className={`badge text-[9px] font-bold uppercase w-max px-2 rounded-full ${statusCls(v)}`}>{v}</span> },
        { key: 'final_status', title: 'Final Outcome', render: (v) => <span className={`badge text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCls(v)}`}>{v}</span> },
        {
            key: 'budget_required', title: 'Budget Allocation', hideBelow: 'xl',
            render: (_v, r) =>
                r.budget_required ? (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200">Required</span>
                        <span className="text-[9px] capitalize text-gray-400">Status: {r.budget_status.replace('_', ' ')}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 text-xs italic">Not Required</span>
                ),
        },
        { key: 'created_at', title: 'Request Date', hideBelow: 'lg', render: (v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
        {
            key: 'actions', title: 'Action', align: 'center', width: '110px',
            render: (_v, r) => (
                <div className="flex items-center justify-center gap-2">
                    {r.final_status === 'pending' && (
                        <IconButton tone="primary" type="button"  title="Review" onClick={() => openReviewModal(r)}><IconPencil className="w-4 h-4" /></IconButton>
                    )}
                    <IconButton tone="danger" type="button"  title="Delete" onClick={() => handleDelete(r)}><IconTrashLines className="w-4 h-4" /></IconButton>
                </div>
            ),
        },
    ];

    return (
        <div>
            {/* Header Banner */}
            <PageHeader
                title="Training Requests"
                subtitle="Evaluate employee skill development and upskilling requests, review course objectives, allocate training budgets, and manage approvals."
                icon={<IconOpenBook />}
                badge="Talent Development"
                variant="purple"
            />

            {/* Status Tabs */}
            <div className="flex border-b border-[#ebedf2] dark:border-[#1b2e4b] mb-5 overflow-x-auto">
                {([
                    { key: 'all', label: 'All' },
                    { key: 'approved', label: 'Approved' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'rejected', label: 'Rejected' },
                ] as const).map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => { setFilterStatus(tab.key); setPage(1); }}
                        className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${filterStatus === tab.key
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-primary'
                            }`}
                    >
                        {tab.label}
                        <span className={`badge rounded-full text-[10px] font-bold px-2 py-0.5 ${filterStatus === tab.key ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                            {tabCounts[tab.key]}
                        </span>
                    </button>
                ))}
            </div>

            <DataTable
                columns={columns}
                data={requests}
                loading={loading}
                page={page}
                pageSize={limit}
                pageSizeOptions={[5, 10, 20, 50]}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(sz) => { setLimit(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                onRefresh={fetchRequests}
                searchPlaceholder="Search employee or course..."
                emptyMessage="No training requests found"
            />

            {/* Review Request Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Review Skill Request" size="xl">
                {selectedRequest && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-[#0e1726]/40 p-4 border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg">
                            <div className="text-xs font-bold text-primary mb-1 uppercase">Syllabus Requested</div>
                            <div className="font-extrabold text-sm">{selectedRequest.course_title || selectedRequest.custom_course_title}</div>

                            <div className="text-xs font-bold text-gray-400 mt-3 mb-1 uppercase">Employee Statement</div>
                            <div className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 italic">"{selectedRequest.reason}"</div>

                            {selectedRequest.manager_remarks && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <span className="font-semibold text-xs block">Manager Remarks ({selectedRequest.manager_name}):</span>
                                    <span className="text-xs italic text-gray-500 block">"{selectedRequest.manager_remarks}"</span>
                                </div>
                            )}
                        </div>

                        {selectedRequest.decided_by === 'manager' && (
                            <div className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-lg px-3 py-2">
                                This request was already <strong className="uppercase">{selectedRequest.manager_status}</strong> by the manager. Only one approval is required — no further action is needed unless you want to override it.
                            </div>
                        )}

                        <form onSubmit={handleSaveReview} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="font-semibold mb-1 block text-xs">Approval Decision</label>
                                    <select className="form-select rounded-lg" value={reviewForm.admin_status} onChange={(e) => setReviewForm({ ...reviewForm, admin_status: e.target.value as any })}>
                                        <option value="pending">Pending Review</option>
                                        <option value="approved">Approve Request</option>
                                        <option value="rejected">Reject Request</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-semibold mb-1 block text-xs">Allocate Budget</label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input type="checkbox" id="budget_required" className="form-checkbox" checked={reviewForm.budget_required} onChange={(e) => setReviewForm({ ...reviewForm, budget_required: e.target.checked })} />
                                        <label htmlFor="budget_required" className="font-semibold cursor-pointer select-none text-xs">
                                            Requires Budget Approval
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {reviewForm.budget_required && (
                                <div className="animate-fade-in">
                                    <label className="font-semibold mb-1 block text-xs">Budget Status</label>
                                    <select className="form-select rounded-lg" value={reviewForm.budget_status} onChange={(e) => setReviewForm({ ...reviewForm, budget_status: e.target.value as any })}>
                                        <option value="pending">Pending Budget Approval</option>
                                        <option value="approved">Budget Approved</option>
                                        <option value="rejected">Budget Rejected</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="font-semibold mb-1 block text-xs">Admin remarks</label>
                                <textarea className="form-textarea min-h-[80px] rounded-lg text-xs" placeholder="e.g. Approved. Will schedule on next quarter's slot..." value={reviewForm.admin_remarks} onChange={(e) => setReviewForm({ ...reviewForm, admin_remarks: e.target.value })} />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                <Button variant="outline-danger" type="button"  onClick={() => setModalOpen(false)}>Cancel</Button>
                                <Button className="!px-5" type="submit"  disabled={saving}>
                                    {saving ? 'Updating...' : 'Save Decision'}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

            </Modal>
        </div>
    );
};

export default TrainingRequest;
