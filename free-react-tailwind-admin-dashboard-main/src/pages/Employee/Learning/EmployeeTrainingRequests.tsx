import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';
import SearchableSelect from '../../Elements/SearchableSelect';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const REQUESTS_API = `${API_BASE_URL}/employee/training-requests/`;
const COURSES_API = `${API_BASE_URL}/employee/courses/`;
const ENROLLMENTS_API = `${API_BASE_URL}/employee/enrollments/`;
const EMP_INFO_API = `${API_BASE_URL}/employee/company-info/`;

type RequestType = {
    id: number;
    employee_id?: number; // Added to identify request owner
    course?: number | null;
    course_title?: string | null;
    custom_course_title: string;
    reason: string;
    manager_name?: string | null;
    manager_status: string;
    manager_remarks?: string;
    admin_status: string;
    admin_remarks?: string;
    final_status: 'pending' | 'approved' | 'rejected';
    decided_by: 'manager' | 'admin' | null;
    budget_required: boolean;
    budget_status: string;
    created_at: string;
};

type CourseType = {
    id: number;
    title: string;
};

const EmployeeTrainingRequests = () => {
    // Determine user role and ID from localStorage
    const userRole = localStorage.getItem('user_role') || '';
    const userId = Number(localStorage.getItem('user_id')) || null;
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<RequestType[]>([]);
    const [courses, setCourses] = useState<CourseType[]>([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const [isReportingManager, setIsReportingManager] = useState(false);
    const [managerDecision, setManagerDecision] = useState<Record<number, 'approved' | 'rejected' | 'pending'>>({});
    const [managerRemarks, setManagerRemarks] = useState<Record<number, string>>({});
    const [savingDecisionId, setSavingDecisionId] = useState<number | null>(null);

    const [form, setForm] = useState({
        course: '',
        custom_course_title: '',
        reason: '',
        budget_required: false,
    });

    useEffect(() => {
        dispatch(setPageTitle('Training Requests'));
        setIsReportingManager(localStorage.getItem('is_reporting_manager') === 'true');
        fetchRequests();
        fetchCourses();
        fetchEnrollments();
    }, [dispatch]);

    useEffect(() => {
        setPage(1);
        setPageInput('1');
        fetchRequests(1);
    }, [statusTab, search]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchRequests = async (requestedPage = page, requestedLimit = limit) => {
        setLoading(true);
        try {
            const url = new URL(REQUESTS_API);
            if (statusTab !== 'all') {
                url.searchParams.append('status', statusTab);
            }
            url.searchParams.append('page', requestedPage.toString());
            url.searchParams.append('limit', requestedLimit.toString());
            if (search.trim()) {
                url.searchParams.append('search', search.trim());
            }
            const response = await authFetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setRequests(data.results || data || []);
                setTotalCount(data.count || 0);
                setTotalPages(data.total_pages || 1);
                setPageInput(String(requestedPage));
            }
        } catch (error) {
            console.error('Error fetching training requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const url = new URL(COURSES_API);
            url.searchParams.append('page', '1');
            url.searchParams.append('limit', '100');
            const response = await authFetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCourses((data.results || data || []).filter((c: any) => c.status === 'published'));
            }
        } catch (error) {
            console.error('Error fetching catalog courses:', error);
        }
    };

    const fetchEnrollments = async () => {
        try {
            const url = new URL(ENROLLMENTS_API);
            url.searchParams.append('limit', '100');
            const response = await authFetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                const enrollments = data.results || data || [];
                setEnrolledCourseIds(new Set(enrollments.map((e: any) => e.course)));
            }
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        }
    };

    const handleSubmitRequest = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!form.course && !form.custom_course_title) {
            Swal.fire('Error!', 'Please select a catalog course or enter a custom course title.', 'error');
            return;
        }

        setSaving(true);
        try {
            const response = await authFetch(REQUESTS_API, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    course: form.course ? Number(form.course) : null,
                    custom_course_title: form.custom_course_title,
                    reason: form.reason,
                    budget_required: form.budget_required,
                }),
            });

            if (response.ok) {
                Swal.fire('Submitted!', 'Your training request has been recorded.', 'success');
                setModalOpen(false);
                setForm({ course: '', custom_course_title: '', reason: '', budget_required: false });
                fetchRequests(1);
            } else {
                Swal.fire('Error!', 'Failed to submit request.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleManagerDecision = async (requestId: number) => {
        const decision = managerDecision[requestId] || 'approved';
        const remarks = managerRemarks[requestId] || '';

        if (!decision) {
            Swal.fire('Error!', 'Choose an approval decision first.', 'error');
            return;
        }

        setSavingDecisionId(requestId);
        try {
            const response = await authFetch(`${REQUESTS_API}${requestId}/`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({
                    manager_status: decision,
                    manager_remarks: remarks,
                }),
            });

            if (response.ok) {
                Swal.fire('Updated!', 'Manager decision saved.', 'success');
                setManagerDecision((prev) => ({ ...prev, [requestId]: 'pending' }));
                setManagerRemarks((prev) => ({ ...prev, [requestId]: '' }));
                fetchRequests(1);
            } else {
                Swal.fire('Error!', 'Failed to update decision.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        } finally {
            setSavingDecisionId(null);
        }
    };

    const statusTabs = [
        { key: 'all' as const, label: 'All' },
        { key: 'pending' as const, label: 'Pending' },
        { key: 'approved' as const, label: 'Approved' },
        { key: 'rejected' as const, label: 'Rejected' },
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-success text-white';
            case 'rejected':
                return 'bg-danger text-white';
            case 'pending':
                return 'bg-amber-500 text-white';
            default:
                return 'bg-gray-500 text-white';
        }
    };

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Training Requests</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        Request custom corporate certifications, view supervisor comments, and audit pending approvals.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-72">
                        <input
                            type="text"
                            className="form-input pr-10 rounded-lg text-xs"
                            placeholder="Search requests..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <select
                        className="form-select rounded-lg text-xs w-36"
                        value={statusTab}
                        onChange={(e) => setStatusTab(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                    >
                        {statusTabs.map((tab) => (
                            <option key={tab.key} value={tab.key}>{tab.label}</option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    className="btn btn-primary gap-2 rounded-lg text-xs py-2 font-bold"
                    onClick={() => setModalOpen(true)}
                >
                    <IconPlus /> Submit Request
                </button>
            </div>

            {/* Status Tabs */}
            <div className="flex border-b border-[#ebedf2] dark:border-[#1b2e4b] mb-6 overflow-x-auto">
                {statusTabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setStatusTab(tab.key)}
                        className={`py-3 px-5 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${statusTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-primary'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List Table */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400 font-semibold">Loading request lifecycle logs...</span>
                </div>
            ) : requests.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">
                    {statusTab === 'all' ? 'No training requests submitted yet.' : `No ${statusTab} training requests.`}
                </div>
            ) : (
                <div className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl p-0 overflow-hidden bg-white dark:bg-[#0e1726]/40">
                    <div className="table-responsive">
                        <table className="table-hover text-xs">
                            <thead>
                                <tr>
                                    <th>Course Requested</th>
                                    <th>Reason / Remarks</th>
                                    <th>Budget Required</th>
                                    <th>Status</th>
                                    <th>Requested On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req.id}>
                                        <td className="font-bold text-gray-800 dark:text-gray-250">
                                            {req.course_title || req.custom_course_title}
                                            {req.course_title && <span className="block text-[10px] text-gray-400 font-normal">Catalog Course</span>}
                                            {!req.course_title && <span className="block text-[10px] text-primary font-normal">Custom Proposal</span>}
                                        </td>
                                        <td>
                                            <div className="max-w-[250px] truncate" title={req.reason}>
                                                {req.reason}
                                            </div>
                                            {req.manager_remarks && (
                                                <div className="text-[10px] text-amber-600 mt-1">
                                                    <strong>Manager Remark:</strong> {req.manager_remarks}
                                                </div>
                                            )}
                                            {req.admin_remarks && (
                                                <div className="text-[10px] text-primary mt-0.5">
                                                    <strong>Admin Remark:</strong> {req.admin_remarks}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${req.budget_required ? 'bg-danger/10 text-danger' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'} text-[9px] uppercase font-bold`}>
                                                {req.budget_required ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge text-[9px] uppercase font-bold px-2 py-0.5 rounded ${getStatusBadge(req.final_status)}`}>
                                                {req.final_status}
                                            </span>
                                            {/* Show manager decision only for managers */}
                                            {isReportingManager && req.decided_by && (
                                                <span className="block text-[9px] text-gray-400 mt-1 capitalize">
                                                    by {req.decided_by}{req.decided_by === 'manager' && req.manager_name ? ` (${req.manager_name})` : ''}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="space-y-2">
                                                <div>{new Date(req.created_at).toLocaleDateString()}</div>
                                                {isReportingManager && req.manager_status === 'pending' && (
                                                    <div className="flex flex-col gap-2">
                                                        <select
                                                            className="form-select rounded-lg text-[10px]"
                                                            value={managerDecision[req.id] || 'approved'}
                                                            onChange={(e) => setManagerDecision((prev) => ({ ...prev, [req.id]: e.target.value as 'approved' | 'rejected' }))}
                                                        >
                                                            <option value="approved">Approve</option>
                                                            <option value="rejected">Reject</option>
                                                        </select>
                                                        <textarea
                                                            className="form-textarea min-h-[60px] rounded-lg text-[10px]"
                                                            placeholder="Manager remarks"
                                                            value={managerRemarks[req.id] || ''}
                                                            onChange={(e) => setManagerRemarks((prev) => ({ ...prev, [req.id]: e.target.value }))}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm rounded-lg"
                                                            onClick={() => handleManagerDecision(req.id)}
                                                            disabled={savingDecisionId === req.id}
                                                        >
                                                            {savingDecisionId === req.id ? 'Saving...' : 'Submit'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {totalPages >= 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-gray-500">
                            Showing <span className="text-primary font-semibold">{totalCount === 0 ? 0 : ((page - 1) * limit) + 1}</span> to <span className="text-primary font-semibold">{Math.min(page * limit, totalCount)}</span> of <span className="text-primary font-semibold">{totalCount}</span> requests
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">Per page:</span>
                            <select
                                className="form-select w-20 text-xs font-semibold py-1"
                                value={limit}
                                onChange={(e) => {
                                    const newLimit = Number(e.target.value);
                                    setLimit(newLimit);
                                    setPage(1);
                                    setPageInput('1');
                                    fetchRequests(1, newLimit);
                                }}
                            >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                        </div>
                    </div>
                    <ul className="inline-flex items-center space-x-1 font-semibold">
                        <li>
                            <button
                                type="button"
                                className="flex justify-center font-semibold px-3 py-1.5 rounded-lg transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                onClick={() => {
                                    const prevPage = page > 1 ? page - 1 : 1;
                                    setPage(prevPage);
                                    fetchRequests(prevPage);
                                }}
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
                                                className="flex justify-center font-semibold px-3 py-1.5 rounded-lg transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary cursor-pointer text-xs"
                                                onClick={() => {
                                                    setPage(jumpPage);
                                                    fetchRequests(jumpPage);
                                                }}
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
                                            className={`flex justify-center font-semibold px-3 py-1.5 rounded-lg transition text-xs ${
                                                page === p
                                                    ? 'bg-primary text-white shadow-md'
                                                    : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'
                                            }`}
                                            onClick={() => {
                                                setPage(p as number);
                                                fetchRequests(p as number);
                                            }}
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
                                className="flex justify-center font-semibold px-3 py-1.5 rounded-lg transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                onClick={() => {
                                    const nextPage = page < totalPages ? page + 1 : totalPages;
                                    setPage(nextPage);
                                    fetchRequests(nextPage);
                                }}
                                disabled={page === totalPages || totalPages === 0}
                            >
                                Next
                            </button>
                        </li>
                    </ul>
                </div>
            )}

            {/* Request Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-[black]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl relative bg-white dark:bg-[#0e1726]">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-white"
                        >
                            ✕
                        </button>
                        <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                            Submit Training Proposal
                        </div>
                        <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
                            <div>
                                <label className="font-bold text-xs mb-1 block">Catalog Course</label>
                                <SearchableSelect
                                    options={courses.filter((c) => !enrolledCourseIds.has(c.id)).map((c) => ({ label: c.title, value: String(c.id) }))}
                                    value={form.course}
                                    onChange={(value) => setForm({ ...form, course: String(value) })}
                                    placeholder="Select a course"
                                    className="rounded-lg text-xs"
                                />
                            </div>

                            {!form.course && (
                                <div className="animate-fade-in">
                                    <label className="font-bold text-xs mb-1 block">Custom Course Title <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-input rounded-lg text-xs"
                                        required
                                        placeholder="e.g. Advanced System Engineering with Rust"
                                        value={form.custom_course_title}
                                        onChange={(e) => setForm({ ...form, custom_course_title: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="font-bold text-xs mb-1 block">Reason & Proposal Remarks <span className="text-danger">*</span></label>
                                <textarea
                                    className="form-textarea min-h-[90px] rounded-lg text-xs"
                                    required
                                    placeholder="Explain why you need this training, potential budget estimates, or other justification details..."
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="budget_required"
                                    className="form-checkbox"
                                    checked={form.budget_required}
                                    onChange={(e) => setForm({ ...form, budget_required: e.target.checked })}
                                />
                                <label htmlFor="budget_required" className="text-xs font-semibold cursor-pointer select-none text-gray-700 dark:text-gray-300">
                                    This request requires budget funding approval
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b]">
                                <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm rounded-lg"
                                    onClick={() => setModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-primary btn-sm rounded-lg px-5 shadow-md"
                                >
                                    {saving ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeTrainingRequests;
