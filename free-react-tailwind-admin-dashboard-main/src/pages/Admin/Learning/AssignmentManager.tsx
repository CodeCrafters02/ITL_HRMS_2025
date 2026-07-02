import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconEye from '../../../components/Icon/IconEye';
import IconX from '../../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const ASSIGNMENTS_API = `${API_BASE_URL}/employee/assignments/`;
const SUBMISSIONS_API = `${API_BASE_URL}/employee/assignment-submissions/`;
const COURSES_API = `${API_BASE_URL}/employee/courses/`;

type AssignmentType = {
    id: number;
    course: number;
    course_title: string;
    title: string;
    description: string;
    due_date: string;
    max_marks: number;
    created_at: string;
    submissions_count: number;
};

type SubmissionType = {
    id: number;
    assignment: number;
    assignment_title: string;
    employee: number;
    employee_name: string;
    employee_id: string;
    employee_email: string;
    submitted_file?: string | null;
    submitted_file_url?: string | null;
    status: 'submitted' | 'late' | 'graded' | 'resubmit_requested';
    marks_obtained?: number | null;
    trainer_comments?: string;
    submitted_at: string;
    graded_at?: string | null;
};

type CourseOption = { id: number; title: string };

const AssignmentManager = () => {
    const dispatch = useDispatch();
    const [assignments, setAssignments] = useState<AssignmentType[]>([]);
    const [courses, setCourses] = useState<CourseOption[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    // Assignment Modal
    const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<AssignmentType | null>(null);
    const [assignmentForm, setAssignmentForm] = useState({
        course: '',
        title: '',
        description: '',
        due_date: '',
        max_marks: 100,
    });

    // Submissions Modal
    const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<AssignmentType | null>(null);
    const [submissions, setSubmissions] = useState<SubmissionType[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);

    // Grade sub-modal
    const [gradeModalOpen, setGradeModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionType | null>(null);
    const [gradeForm, setGradeForm] = useState({
        marks_obtained: '',
        trainer_comments: '',
    });

    useEffect(() => {
        dispatch(setPageTitle('Assignments Manager'));
        fetchAssignments();
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

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const response = await fetch(ASSIGNMENTS_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setAssignments(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await fetch(COURSES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCourses(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const fetchSubmissions = async (assignmentId: number) => {
        setSubmissionsLoading(true);
        try {
            const response = await fetch(`${SUBMISSIONS_API}?assignment_id=${assignmentId}`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setSubmissions(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching submissions:', error);
        } finally {
            setSubmissionsLoading(false);
        }
    };

    const filteredAssignments = useMemo(() => {
        return assignments.filter((a) => {
            return (
                a.title.toLowerCase().includes(search.toLowerCase()) ||
                (a.course_title || '').toLowerCase().includes(search.toLowerCase())
            );
        });
    }, [assignments, search]);

    const resetAssignmentForm = () => {
        setAssignmentForm({
            course: '',
            title: '',
            description: '',
            due_date: '',
            max_marks: 100,
        });
        setEditingAssignment(null);
    };

    const openCreateAssignmentModal = () => {
        resetAssignmentForm();
        setAssignmentModalOpen(true);
    };

    const openEditAssignmentModal = (a: AssignmentType) => {
        setEditingAssignment(a);
        setAssignmentForm({
            course: String(a.course),
            title: a.title,
            description: a.description || '',
            due_date: a.due_date ? a.due_date.slice(0, 16) : '', // format datetime-local
            max_marks: a.max_marks,
        });
        setAssignmentModalOpen(true);
    };

    const handleSaveAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        const payload = {
            course: Number(assignmentForm.course),
            title: assignmentForm.title,
            description: assignmentForm.description,
            due_date: assignmentForm.due_date,
            max_marks: Number(assignmentForm.max_marks),
        };

        try {
            const url = editingAssignment ? `${ASSIGNMENTS_API}${editingAssignment.id}/` : ASSIGNMENTS_API;
            const method = editingAssignment ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: editingAssignment ? 'Updated!' : 'Created!',
                    text: 'Assignment project saved.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                setAssignmentModalOpen(false);
                fetchAssignments();
            } else {
                Swal.fire('Error!', 'Failed to save assignment.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection failed.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAssignment = async (a: AssignmentType) => {
        const result = await Swal.fire({
            title: 'Delete Assignment?',
            text: `Are you sure you want to delete "${a.title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`${ASSIGNMENTS_API}${a.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire('Deleted!', 'Assignment deleted.', 'success');
                fetchAssignments();
            } else {
                Swal.fire('Error!', 'Could not delete assignment.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection error.', 'error');
        }
    };

    // Submissions and grading logic
    const openSubmissionsModal = (a: AssignmentType) => {
        setSelectedAssignment(a);
        fetchSubmissions(a.id);
        setSubmissionsModalOpen(true);
    };

    const openGradeModal = (sub: SubmissionType) => {
        setSelectedSubmission(sub);
        setGradeForm({
            marks_obtained: sub.marks_obtained !== null ? String(sub.marks_obtained) : '',
            trainer_comments: sub.trainer_comments || '',
        });
        setGradeModalOpen(true);
    };

    const handleSaveGrade = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedSubmission || !selectedAssignment) return;

        const marks = Number(gradeForm.marks_obtained);
        if (marks > selectedAssignment.max_marks) {
            Swal.fire('Error!', `Marks obtained cannot exceed max marks of ${selectedAssignment.max_marks}.`, 'error');
            return;
        }

        setSaving(true);
        const payload = {
            marks_obtained: marks,
            trainer_comments: gradeForm.trainer_comments,
        };

        try {
            const response = await fetch(`${SUBMISSIONS_API}${selectedSubmission.id}/`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Graded!',
                    text: 'Student grade and feedback comments submitted.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                setGradeModalOpen(false);
                fetchSubmissions(selectedAssignment.id);
            } else {
                Swal.fire('Error!', 'Failed to save grade evaluations.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            {/* Control Panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-72"
                            placeholder="Search assignment title..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openCreateAssignmentModal}>
                    <IconPlus /> Create Assignment
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading assignments...</span>
                </div>
            ) : filteredAssignments.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">No homework modules scheduled.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssignments.map((a) => (
                        <div
                            key={a.id}
                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-base font-bold text-gray-800 dark:text-white-light mt-1.5 line-clamp-1">
                                        {a.title}
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <button type="button" className="text-primary hover:text-primary-dark p-1" onClick={() => openEditAssignmentModal(a)}>
                                            <IconPencil className="w-4 h-4" />
                                        </button>
                                        <button type="button" className="text-danger hover:text-danger-dark p-1" onClick={() => handleDeleteAssignment(a)}>
                                            <IconTrashLines className="w-4.5 h-4.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                                    {a.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 mt-auto space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-450 mb-2">
                                    <div>
                                        <span className="font-bold block text-gray-400">Linked Course</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300 truncate block">{a.course_title}</span>
                                    </div>
                                    <div>
                                        <span className="font-bold block text-gray-400">Max Marks</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{a.max_marks} Pts</span>
                                    </div>
                                </div>
                                <div className="text-xs text-danger font-semibold bg-danger-light/10 dark:bg-danger-dark/10 p-2 rounded border border-danger/10">
                                    Due: {new Date(a.due_date).toLocaleString()}
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="badge badge-outline-primary rounded font-bold text-[10px]">
                                        {a.submissions_count} Submissions
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm rounded-lg text-xs py-1 px-3 flex items-center gap-1"
                                        onClick={() => openSubmissionsModal(a)}
                                    >
                                        <IconEye className="w-3.5 h-3.5" /> Review Gradebook
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Transition appear show={assignmentModalOpen} as={Fragment}>
                <Dialog as="div" open={assignmentModalOpen} onClose={() => setAssignmentModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setAssignmentModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        {editingAssignment ? 'Edit Assignment details' : 'Create Assignment project'}
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleSaveAssignment} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block text-xs">Choose Course <span className="text-danger">*</span></label>
                                                <select className="form-select rounded-lg" required value={assignmentForm.course} onChange={(e) => setAssignmentForm({ ...assignmentForm, course: e.target.value })}>
                                                    <option value="">-- Choose Course --</option>
                                                    {courses.map(c => (
                                                        <option key={c.id} value={c.id}>{c.title}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="font-semibold mb-1 block text-xs">Assignment Title <span className="text-danger">*</span></label>
                                                <input className="form-input rounded-lg" required placeholder="e.g. Building React Native Forms" value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} />
                                            </div>

                                            <div>
                                                <label className="font-semibold mb-1 block text-xs">Project instructions</label>
                                                <textarea className="form-textarea min-h-[100px] rounded-lg text-xs" placeholder="Detail project scope and file submissions constraints..." value={assignmentForm.description} onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block text-xs">Due Date & Time <span className="text-danger">*</span></label>
                                                    <input type="datetime-local" className="form-input rounded-lg text-xs" required value={assignmentForm.due_date} onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block text-xs">Max Marks points <span className="text-danger">*</span></label>
                                                    <input type="number" min="1" className="form-input rounded-lg text-xs" required value={assignmentForm.max_marks} onChange={(e) => setAssignmentForm({ ...assignmentForm, max_marks: Number(e.target.value) })} />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg text-xs" onClick={() => setAssignmentModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5 text-xs shadow-md" disabled={saving}>
                                                    {saving ? 'Saving...' : editingAssignment ? 'Save Changes' : 'Create Assignment'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Submissions Gradebook Modal */}
            <Transition appear show={submissionsModalOpen} as={Fragment}>
                <Dialog as="div" open={submissionsModalOpen} onClose={() => setSubmissionsModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-4xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setSubmissionsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Submissions roster: {selectedAssignment?.title}
                                    </div>
                                    <div className="p-6">
                                        {submissionsLoading ? (
                                            <div className="py-10 text-center text-gray-400 animate-pulse">Loading submissions...</div>
                                        ) : submissions.length === 0 ? (
                                            <div className="py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                                                No employees have submitted this homework assignment yet.
                                            </div>
                                        ) : (
                                            <div className="table-responsive border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg">
                                                <table className="table-hover text-xs">
                                                    <thead>
                                                        <tr>
                                                            <th>Employee Details</th>
                                                            <th>ID</th>
                                                            <th>Submitted File</th>
                                                            <th>Submission Date</th>
                                                            <th>Status</th>
                                                            <th>Score / Max</th>
                                                            <th>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {submissions.map((sub) => (
                                                            <tr key={sub.id}>
                                                                <td className="font-semibold text-gray-800 dark:text-gray-205">{sub.employee_name}</td>
                                                                <td className="font-mono text-gray-450">{sub.employee_id}</td>
                                                                <td>
                                                                    {sub.submitted_file_url ? (
                                                                        <a href={sub.submitted_file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">
                                                                            Download File
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-danger italic">No file uploaded</span>
                                                                    )}
                                                                </td>
                                                                <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                                                                <td>
                                                                    <span className={`badge text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                                        sub.status === 'graded'
                                                                            ? 'bg-success text-white'
                                                                            : sub.status === 'late'
                                                                            ? 'bg-danger text-white'
                                                                            : 'bg-amber-500 text-white'
                                                                    }`}>
                                                                        {sub.status}
                                                                    </span>
                                                                </td>
                                                                <td className="font-bold">
                                                                    {sub.marks_obtained !== null ? `${sub.marks_obtained}` : '-'} / {selectedAssignment?.max_marks} Pts
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-outline-primary btn-xs py-0.5 px-2 rounded"
                                                                        onClick={() => openGradeModal(sub)}
                                                                    >
                                                                        Grade Evaluation
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                            <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setSubmissionsModalOpen(false)}>Close Roster</button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Grading evaluation modal */}
            <Transition appear show={gradeModalOpen} as={Fragment}>
                <Dialog as="div" open={gradeModalOpen} onClose={() => setGradeModalOpen(false)} className="relative z-[60]">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-md text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setGradeModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Grade evaluation: {selectedSubmission?.employee_name}
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleSaveGrade} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block text-xs">Marks Obtained <span className="text-danger">*</span> (Max: {selectedAssignment?.max_marks} Pts)</label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    className="form-input rounded-lg text-xs"
                                                    placeholder={`e.g. 85`}
                                                    value={gradeForm.marks_obtained}
                                                    onChange={(e) => setGradeForm({ ...gradeForm, marks_obtained: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="font-semibold mb-1 block text-xs">Feedback remarks comments</label>
                                                <textarea
                                                    className="form-textarea min-h-[80px] rounded-lg text-xs"
                                                    placeholder="Provide feedback on the project implementation..."
                                                    value={gradeForm.trainer_comments}
                                                    onChange={(e) => setGradeForm({ ...gradeForm, trainer_comments: e.target.value })}
                                                />
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg text-xs" onClick={() => setGradeModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5 text-xs shadow-md" disabled={saving}>
                                                    {saving ? 'Submitting...' : 'Submit Evaluation'}
                                                </button>
                                            </div>
                                        </form>
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

export default AssignmentManager;
