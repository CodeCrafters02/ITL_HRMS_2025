import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const REQUESTS_API = `${API_BASE_URL}/employee/training-requests/`;
const COURSES_API = `${API_BASE_URL}/employee/courses/`;
const EMP_INFO_API = `${API_BASE_URL}/employee/company-info/`;

type RequestType = {
    id: number;
    course?: number | null;
    course_title?: string | null;
    custom_course_title: string;
    reason: string;
    manager_name?: string | null;
    manager_status: string;
    manager_remarks?: string;
    admin_status: string;
    admin_remarks?: string;
    budget_required: boolean;
    budget_status: string;
    created_at: string;
};

type CourseType = {
    id: number;
    title: string;
};

const EmployeeTrainingRequests = () => {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<RequestType[]>([]);
    const [courses, setCourses] = useState<CourseType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');

    const [form, setForm] = useState({
        course: '',
        custom_course_title: '',
        reason: '',
        budget_required: false,
    });

    useEffect(() => {
        dispatch(setPageTitle('Training Requests'));
        fetchRequests();
        fetchCourses();
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
            const response = await fetch(REQUESTS_API, { headers: getHeaders() });
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

    const fetchCourses = async () => {
        try {
            const response = await fetch(COURSES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCourses((data.results || data || []).filter((c: any) => c.status === 'published'));
            }
        } catch (error) {
            console.error('Error fetching catalog courses:', error);
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
            const response = await fetch(REQUESTS_API, {
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
                fetchRequests();
            } else {
                Swal.fire('Error!', 'Failed to submit request.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredRequests = requests.filter((r) => {
        const query = search.toLowerCase();
        const courseMatch = (r.course_title || '').toLowerCase().includes(query);
        const customMatch = r.custom_course_title.toLowerCase().includes(query);
        const reasonMatch = r.reason.toLowerCase().includes(query);
        return courseMatch || customMatch || reasonMatch;
    });

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
                <button
                    type="button"
                    className="btn btn-primary gap-2 rounded-lg text-xs py-2 font-bold"
                    onClick={() => setModalOpen(true)}
                >
                    <IconPlus /> Submit Request
                </button>
            </div>

            {/* List Table */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400 font-semibold">Loading request lifecycle logs...</span>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">No training requests submitted yet.</div>
            ) : (
                <div className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl p-0 overflow-hidden bg-white dark:bg-[#0e1726]/40">
                    <div className="table-responsive">
                        <table className="table-hover text-xs">
                            <thead>
                                <tr>
                                    <th>Course Requested</th>
                                    <th>Reason / Remarks</th>
                                    <th>Budget Required</th>
                                    <th>Manager Status</th>
                                    <th>Admin Status</th>
                                    <th>Requested On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((req) => (
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
                                            <span className={`badge text-[9px] uppercase font-bold px-2 py-0.5 rounded ${getStatusBadge(req.manager_status)}`}>
                                                {req.manager_status}
                                            </span>
                                            {req.manager_name && <span className="block text-[9px] text-gray-400 mt-1">{req.manager_name}</span>}
                                        </td>
                                        <td>
                                            <span className={`badge text-[9px] uppercase font-bold px-2 py-0.5 rounded ${getStatusBadge(req.admin_status)}`}>
                                                {req.admin_status}
                                            </span>
                                        </td>
                                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                                <select
                                    className="form-select rounded-lg text-xs"
                                    value={form.course}
                                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                                >
                                    <option value="">-- Choose Existing Course (Optional) --</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.title}
                                        </option>
                                    ))}
                                </select>
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
