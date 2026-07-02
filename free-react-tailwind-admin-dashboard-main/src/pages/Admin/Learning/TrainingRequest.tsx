import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconSearch from '../../../components/Icon/IconSearch';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconX from '../../../components/Icon/IconX';

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
        fetchRequests();
    }, [dispatch]);

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
            const response = await authFetch(REQUESTS_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setRequests(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching training requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = useMemo(() => {
        return requests.filter((r) => {
            const name = r.employee_name || '';
            const email = r.employee_email || '';
            const courseTitle = r.course_title || r.custom_course_title || '';
            const matchesSearch =
                name.toLowerCase().includes(search.toLowerCase()) ||
                email.toLowerCase().includes(search.toLowerCase()) ||
                courseTitle.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = filterStatus === 'all' || r.admin_status === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [requests, search, filterStatus]);

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

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Training Requests</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        Evaluate skill development request tickets from team members, allocate budgets, and set approvals.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-72"
                            placeholder="Search employee or course..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <select
                        className="form-select w-44"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Admin Status (All)</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* List Table */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading training requests...</span>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">No training requests submitted yet.</div>
            ) : (
                <div className="panel p-0 border-0 overflow-hidden shadow-md">
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Requested Program</th>
                                    <th>Reason</th>
                                    <th>Manager Status</th>
                                    <th>Admin Status</th>
                                    <th>Budget Status</th>
                                    <th>Submitted Date</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((r) => (
                                    <tr key={r.id}>
                                        <td>
                                            <div className="font-semibold text-gray-800 dark:text-gray-200">{r.employee_name}</div>
                                            <span className="text-xs text-gray-450 block truncate max-w-[150px]">{r.employee_email}</span>
                                        </td>
                                        <td className="font-bold text-primary">
                                            {r.course_title || r.custom_course_title}
                                            {r.course_title ? (
                                                <span className="badge badge-outline-primary text-[9px] block mt-1 w-max">Catalog Course</span>
                                            ) : (
                                                <span className="badge badge-outline-secondary text-[9px] block mt-1 w-max font-semibold">Custom request</span>
                                            )}
                                        </td>
                                        <td className="text-xs max-w-[200px] truncate" title={r.reason}>{r.reason}</td>
                                        <td>
                                            <span className={`badge uppercase text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                r.manager_status === 'approved' 
                                                    ? 'bg-success text-white' 
                                                    : r.manager_status === 'rejected' 
                                                    ? 'bg-danger text-white' 
                                                    : 'bg-amber-500 text-white'
                                            }`}>
                                                {r.manager_status}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge uppercase text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                r.admin_status === 'approved' 
                                                    ? 'bg-success text-white' 
                                                    : r.admin_status === 'rejected' 
                                                    ? 'bg-danger text-white' 
                                                    : 'bg-amber-500 text-white'
                                            }`}>
                                                {r.admin_status}
                                            </span>
                                        </td>
                                        <td>
                                            {r.budget_required ? (
                                                <span className={`badge uppercase text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    r.budget_status === 'approved' 
                                                        ? 'bg-success text-white' 
                                                        : r.budget_status === 'rejected' 
                                                        ? 'bg-danger text-white' 
                                                        : 'bg-amber-500 text-white'
                                                }`}>
                                                    Budget: {r.budget_status}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Not Required</span>
                                            )}
                                        </td>
                                        <td className="text-xs">
                                            {new Date(r.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button type="button" className="text-primary hover:text-primary-dark p-2" onClick={() => openReviewModal(r)}>
                                                    <IconPencil className="w-4.5 h-4.5" />
                                                </button>
                                                <button type="button" className="text-danger hover:text-danger-dark p-2" onClick={() => handleDelete(r)}>
                                                    <IconTrashLines className="w-4.5 h-4.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Review Request Modal */}
            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Review Skill Request
                                    </div>
                                    <div className="p-6">
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

                                                <form onSubmit={handleSaveReview} className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="font-semibold mb-1 block text-xs">Admin Approval Status</label>
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
                                                        <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setModalOpen(false)}>Cancel</button>
                                                        <button type="submit" className="btn btn-primary rounded-lg px-5 shadow-md" disabled={saving}>
                                                            {saving ? 'Updating...' : 'Save Decision'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default TrainingRequest;
