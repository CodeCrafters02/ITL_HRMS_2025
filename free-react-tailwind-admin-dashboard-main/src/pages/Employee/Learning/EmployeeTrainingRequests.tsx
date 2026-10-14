import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';
import IconOpenBook from '../../../components/Icon/IconOpenBook';
import PageHeader from '../../../components/Common/PageHeader';
import SearchableSelect from '../../Elements/SearchableSelect';

import Button from '../../../components/Common/Button';
import DataTable, { Column } from '../../../components/Common/DataTable';
import Modal from '../../../components/Common/Modal';
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

    const columns: Column<RequestType>[] = [
        {
            key: 'course_title', title: 'Course Requested',
            render: (_v, req) => (
                <div>
                    <p className="font-bold text-gray-800">{req.course_title || req.custom_course_title}</p>
                    <span className={`block text-[10px] font-normal ${req.course_title ? 'text-gray-400' : 'text-primary'}`}>{req.course_title ? 'Catalog Course' : 'Custom Proposal'}</span>
                </div>
            ),
        },
        {
            key: 'reason', title: 'Reason / Remarks', hideBelow: 'md',
            render: (_v, req) => (
                <div>
                    <div className="max-w-[250px] truncate" title={req.reason}>{req.reason}</div>
                    {req.manager_remarks && <div className="mt-1 text-[10px] text-amber-600"><strong>Manager Remark:</strong> {req.manager_remarks}</div>}
                    {req.admin_remarks && <div className="mt-0.5 text-[10px] text-primary"><strong>Admin Remark:</strong> {req.admin_remarks}</div>}
                </div>
            ),
        },
        { key: 'budget_required', title: 'Budget Required', hideBelow: 'lg', render: (v) => <span className={`badge ${v ? 'bg-danger/10 text-danger' : 'bg-gray-100 text-gray-500'}`}>{v ? 'Yes' : 'No'}</span> },
        {
            key: 'final_status', title: 'Status',
            render: (_v, req) => (
                <div>
                    <span className={`badge rounded px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusBadge(req.final_status)}`}>{req.final_status}</span>
                    {isReportingManager && req.decided_by && (
                        <span className="mt-1 block text-[9px] capitalize text-gray-400">by {req.decided_by}{req.decided_by === 'manager' && req.manager_name ? ` (${req.manager_name})` : ''}</span>
                    )}
                </div>
            ),
        },
        {
            key: 'created_at', title: 'Requested On',
            render: (_v, req) => (
                <div className="space-y-2">
                    <div>{new Date(req.created_at).toLocaleDateString()}</div>
                    {isReportingManager && req.manager_status === 'pending' && (
                        <div className="flex flex-col gap-2">
                            <select className="form-select rounded-lg text-[10px]" value={managerDecision[req.id] || 'approved'} onChange={(e) => setManagerDecision((prev) => ({ ...prev, [req.id]: e.target.value as 'approved' | 'rejected' }))}>
                                <option value="approved">Approve</option>
                                <option value="rejected">Reject</option>
                            </select>
                            <textarea className="form-textarea min-h-[60px] rounded-lg text-[10px]" placeholder="Manager remarks" value={managerRemarks[req.id] || ''} onChange={(e) => setManagerRemarks((prev) => ({ ...prev, [req.id]: e.target.value }))} />
                            <Button size="sm" onClick={() => handleManagerDecision(req.id)} disabled={savingDecisionId === req.id}>{savingDecisionId === req.id ? 'Saving...' : 'Submit'}</Button>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            {/* Header Banner */}
            <PageHeader
                title="Training Requests"
                subtitle="Request corporate training sponsorships, track supervisor approvals, and audit pending learning applications."
                icon={<IconOpenBook />}
                badge="Upskilling Applications"
                variant="purple"
            />

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

            <DataTable
                columns={columns}
                data={requests}
                loading={loading}
                page={page}
                pageSize={limit}
                pageSizeOptions={[5, 10, 20, 50]}
                totalCount={totalCount}
                onPageChange={(pg) => { setPage(pg); setPageInput(String(pg)); fetchRequests(pg); }}
                onPageSizeChange={(sz) => { setLimit(sz); setPage(1); setPageInput('1'); fetchRequests(1, sz); }}
                searchValue={search}
                onSearchChange={(v) => setSearch(v)}
                onRefresh={() => fetchRequests()}
                searchPlaceholder="Search requests..."
                emptyMessage={statusTab === 'all' ? 'No training requests submitted yet' : `No ${statusTab} training requests`}
                entityLabel="requests"
                actionButton={
                    <Button onClick={() => setModalOpen(true)}>
                        <IconPlus /> Submit Request
                    </Button>
                }
            />


            {/* Request Modal */}
            {modalOpen && (
                <Modal open onClose={() => setModalOpen(false)} title="Submit Training Proposal" size="lg" dismissible={false}>
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
                                <Button variant="outline-danger" size="sm"
                                    type="button"
                                    
                                    onClick={() => setModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button size="sm" className="!px-5"
                                    type="submit"
                                    disabled={saving}>
                                    {saving ? 'Submitting...' : 'Submit Request'}
                                </Button>
                            </div>
                        </form>
                </Modal>
            )}
        </div>
    );
};

export default EmployeeTrainingRequests;
