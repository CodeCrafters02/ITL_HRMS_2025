import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';
import IconEye from '../../../components/Icon/IconEye';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconX from '../../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const SESSIONS_API = `${API_BASE_URL}/employee/training-sessions/`;
const ATTENDANCE_API = `${API_BASE_URL}/employee/session-attendances/`;
const COURSES_API = `${API_BASE_URL}/employee/courses/`;
const EMPLOYEES_API = `${API_BASE_URL}/employee/employee-options/`;

type TrainingSessionType = {
    id: number;
    course?: number | null;
    course_title?: string | null;
    title: string;
    session_type: 'classroom' | 'online' | 'webinar';
    start_datetime: string;
    end_datetime: string;
    location?: string;
    meeting_link?: string;
    max_seats?: number | null;
    created_by?: number | null;
    created_at?: string;
    attendees_count?: number;
};

type SessionAttendanceType = {
    id: number;
    session: number;
    session_title: string;
    employee: number;
    employee_name: string;
    employee_id: string;
    employee_email: string;
    employee_designation?: string | null;
    employee_department?: string | null;
    status: 'registered' | 'attended' | 'absent';
    feedback_rating?: number | null;
    feedback_text?: string;
};

type DropdownOption = { id: number; title: string };
type EmployeeOption = { id: number; full_name: string; designation_name?: string; department_name?: string };

const TrainingCalendar = () => {
    const dispatch = useDispatch();
    const [sessions, setSessions] = useState<TrainingSessionType[]>([]);
    const [courses, setCourses] = useState<DropdownOption[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    // Session Modal
    const [sessionModalOpen, setSessionModalOpen] = useState(false);
    const [sessionForm, setSessionForm] = useState({
        course: '',
        title: '',
        session_type: 'classroom' as 'classroom' | 'online' | 'webinar',
        start_datetime: '',
        end_datetime: '',
        location: '',
        meeting_link: '',
        max_seats: '' as number | string,
    });

    // Attendance Manager Modal
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TrainingSessionType | null>(null);
    const [attendeeList, setAttendeeList] = useState<SessionAttendanceType[]>([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    // Register attendee state
    const [addAttendeeOpen, setAddAttendeeOpen] = useState(false);
    const [newAttendee, setNewAttendee] = useState({ employee: '', status: 'registered' as any });

    useEffect(() => {
        dispatch(setPageTitle('Training Calendar'));
        fetchSessions();
        fetchCourses();
        fetchEmployees();
    }, [dispatch]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const response = await authFetch(SESSIONS_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setSessions(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await authFetch(COURSES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCourses(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await authFetch(EMPLOYEES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data || []);
            }
        } catch (error) {
            console.error('Error fetching employee options:', error);
        }
    };

    const fetchAttendeeList = async (sessionId: number) => {
        setAttendanceLoading(true);
        try {
            const response = await authFetch(`${ATTENDANCE_API}?session_id=${sessionId}`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setAttendeeList(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching session attendance:', error);
        } finally {
            setAttendanceLoading(false);
        }
    };

    const filteredSessions = useMemo(() => {
        return sessions.filter((s) => {
            return (
                s.title.toLowerCase().includes(search.toLowerCase()) ||
                (s.course_title || '').toLowerCase().includes(search.toLowerCase()) ||
                (s.location || '').toLowerCase().includes(search.toLowerCase())
            );
        });
    }, [sessions, search]);

    const openScheduleModal = () => {
        setSessionForm({
            course: '',
            title: '',
            session_type: 'classroom',
            start_datetime: '',
            end_datetime: '',
            location: '',
            meeting_link: '',
            max_seats: '',
        });
        setSessionModalOpen(true);
    };

    const handleSaveSession = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        const payload = {
            ...sessionForm,
            course: sessionForm.course ? Number(sessionForm.course) : null,
            max_seats: sessionForm.max_seats ? Number(sessionForm.max_seats) : null,
        };

        try {
            const response = await authFetch(SESSIONS_API, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Scheduled!',
                    text: 'Session scheduled successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                setSessionModalOpen(false);
                fetchSessions();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire('Error!', err ? Object.values(err).flat().join(' ') : 'Failed to schedule session.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server communication failure.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSession = async (session: TrainingSessionType) => {
        const result = await Swal.fire({
            title: 'Delete Session?',
            text: `Are you sure you want to cancel and delete "${session.title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${SESSIONS_API}${session.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire('Deleted!', 'Session cancelled and deleted.', 'success');
                fetchSessions();
            } else {
                Swal.fire('Error!', 'Could not delete session.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection error.', 'error');
        }
    };

    // Attendance management operations
    const openAttendanceManager = (session: TrainingSessionType) => {
        setSelectedSession(session);
        fetchAttendeeList(session.id);
        setAttendanceModalOpen(true);
    };

    const handleUpdateAttendanceStatus = async (attendanceId: number, status: 'registered' | 'attended' | 'absent') => {
        try {
            const response = await authFetch(`${ATTENDANCE_API}${attendanceId}/`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ status }),
            });

            if (response.ok && selectedSession) {
                fetchAttendeeList(selectedSession.id);
            }
        } catch {
            Swal.fire('Error!', 'Failed to update status.', 'error');
        }
    };

    const handleAddAttendee = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedSession) return;
        setSaving(true);

        const payload = {
            session: selectedSession.id,
            employee: Number(newAttendee.employee),
            status: newAttendee.status,
        };

        try {
            const response = await authFetch(ATTENDANCE_API, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Registered!',
                    text: 'Employee registered to session.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                setAddAttendeeOpen(false);
                setNewAttendee({ employee: '', status: 'registered' });
                fetchAttendeeList(selectedSession.id);
                fetchSessions(); // Refresh main list registration counts
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire('Error!', err ? Object.values(err).flat().join(' ') : 'Failed to register attendee.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection failure.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAttendee = async (attendance: SessionAttendanceType) => {
        try {
            const response = await authFetch(`${ATTENDANCE_API}${attendance.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                if (selectedSession) {
                    fetchAttendeeList(selectedSession.id);
                    fetchSessions();
                }
            }
        } catch {
            Swal.fire('Error!', 'Could not remove registration.', 'error');
        }
    };

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Training Sessions Schedule</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        Schedule offline lectures, virtual webinars, and sync interactive course modules. Keep track of attendee gradebooks.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Top control bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-72"
                            placeholder="Search session title..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openScheduleModal}>
                    <IconPlus /> Schedule Session
                </button>
            </div>

            {/* Grid of Scheduled events */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading schedule...</span>
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">No training sessions scheduled.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSessions.map((session) => (
                        <div
                            key={session.id}
                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <span className={`badge uppercase text-[9px] font-bold px-2 py-0.5 rounded ${
                                            session.session_type === 'classroom'
                                                ? 'badge-outline-primary'
                                                : session.session_type === 'webinar'
                                                ? 'badge-outline-secondary'
                                                : 'badge-outline-success'
                                        }`}>
                                            {session.session_type}
                                        </span>
                                        <h3 className="text-base font-bold text-gray-800 dark:text-white-light mt-1.5 line-clamp-1">
                                            {session.title}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        className="text-danger hover:text-danger-dark p-1"
                                        onClick={() => handleDeleteSession(session)}
                                    >
                                        <IconTrashLines className="w-4.5 h-4.5" />
                                    </button>
                                </div>

                                <div className="space-y-1 text-xs text-gray-500 mb-4">
                                    <div>
                                        <span className="font-semibold text-gray-400 mr-1">Course:</span>
                                        <span className="font-bold text-primary">{session.course_title || 'General Training'}</span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-2 rounded border border-gray-100 dark:border-gray-800 mt-2 space-y-1">
                                        <div>
                                            <span className="font-bold text-gray-400 mr-1">Start:</span>
                                            <span>{new Date(session.start_datetime).toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-400 mr-1">End:</span>
                                            <span>{new Date(session.end_datetime).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 mt-auto">
                                <div className="flex items-center justify-between text-xs mb-3">
                                    <span className="font-bold text-gray-400">Seats Capacity:</span>
                                    <span className="badge badge-outline-primary rounded px-2 font-bold">
                                        {session.attendees_count || 0} / {session.max_seats || '∞'} registered
                                    </span>
                                </div>

                                {session.meeting_link && (
                                    <a
                                        href={session.meeting_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline block text-xs truncate mb-3"
                                    >
                                        Link: {session.meeting_link}
                                    </a>
                                )}
                                {session.location && (
                                    <div className="text-xs text-gray-400 truncate mb-3">
                                        Room: {session.location}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm w-full rounded-lg flex items-center justify-center gap-1.5 text-xs py-1.5"
                                    onClick={() => openAttendanceManager(session)}
                                >
                                    <IconEye className="w-4 h-4" /> Gradebook & Attendances
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Schedule Session Modal */}
            <Transition appear show={sessionModalOpen} as={Fragment}>
                <Dialog as="div" open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-2xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setSessionModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Schedule Training Session
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleSaveSession} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block text-xs">Session Title <span className="text-danger">*</span></label>
                                                    <input className="form-input rounded-lg" required placeholder="e.g. Q3 Sales Alignment" value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block text-xs">Linked Catalog Course</label>
                                                    <select className="form-select rounded-lg" value={sessionForm.course} onChange={(e) => setSessionForm({ ...sessionForm, course: e.target.value })}>
                                                        <option value="">-- Optional Course linkage --</option>
                                                        {courses.map(c => (
                                                            <option key={c.id} value={c.id}>{c.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block text-xs">Session Type</label>
                                                    <select className="form-select rounded-lg" value={sessionForm.session_type} onChange={(e) => setSessionForm({ ...sessionForm, session_type: e.target.value as any })}>
                                                        <option value="classroom">Classroom (Offline)</option>
                                                        <option value="online">Online Virtual</option>
                                                        <option value="webinar">Webinar Stream</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block text-xs">Max seats Capacity</label>
                                                    <input type="number" className="form-input rounded-lg" placeholder="e.g. 25" min="1" value={sessionForm.max_seats} onChange={(e) => setSessionForm({ ...sessionForm, max_seats: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block text-xs">Start Date & Time <span className="text-danger">*</span></label>
                                                    <input type="datetime-local" className="form-input rounded-lg" required value={sessionForm.start_datetime} onChange={(e) => setSessionForm({ ...sessionForm, start_datetime: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block text-xs">End Date & Time <span className="text-danger">*</span></label>
                                                    <input type="datetime-local" className="form-input rounded-lg" required value={sessionForm.end_datetime} onChange={(e) => setSessionForm({ ...sessionForm, end_datetime: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block text-xs">Physical Room Location</label>
                                                    <input className="form-input rounded-lg" placeholder="e.g. Conference Room A" value={sessionForm.location} onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block text-xs">Virtual Meeting Link URL</label>
                                                    <input type="url" className="form-input rounded-lg" placeholder="e.g. https://meet.google.com/..." value={sessionForm.meeting_link} onChange={(e) => setSessionForm({ ...sessionForm, meeting_link: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setSessionModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5 shadow-md" disabled={saving}>
                                                    {saving ? 'Scheduling...' : 'Schedule Session'}
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

            {/* Attendance Manager Modal */}
            <Transition appear show={attendanceModalOpen} as={Fragment}>
                <Dialog as="div" open={attendanceModalOpen} onClose={() => setAttendanceModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-3xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setAttendanceModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Gradebook: {selectedSession?.title}
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-extrabold text-sm uppercase text-gray-400 tracking-wider">Registered Attendances</h4>
                                            <button type="button" className="btn btn-primary btn-sm gap-1" onClick={() => { setNewAttendee({ employee: '', status: 'registered' }); setAddAttendeeOpen(true); }}>
                                                <IconPlus className="w-3.5 h-3.5" /> Register Attendee
                                            </button>
                                        </div>

                                        {attendanceLoading ? (
                                            <div className="py-10 text-center text-gray-400 animate-pulse">Loading gradesheet...</div>
                                        ) : attendeeList.length === 0 ? (
                                            <div className="py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                                                No employees registered to this training slot yet.
                                            </div>
                                        ) : (
                                            <div className="table-responsive border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg">
                                                <table className="table-hover">
                                                    <thead>
                                                        <tr>
                                                            <th>Employee Details</th>
                                                            <th>ID</th>
                                                            <th>Department</th>
                                                            <th>Attendance Status</th>
                                                            <th className="text-center">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {attendeeList.map((att) => (
                                                            <tr key={att.id}>
                                                                <td className="font-semibold text-gray-800 dark:text-gray-200">
                                                                    {att.employee_name}
                                                                </td>
                                                                <td className="text-xs font-mono">{att.employee_id}</td>
                                                                <td className="text-xs">{att.employee_department || 'No Dept'}</td>
                                                                <td>
                                                                    <select
                                                                        className={`form-select form-select-sm w-32 py-1 rounded text-xs font-bold ${
                                                                            att.status === 'attended'
                                                                                ? 'border-success text-success'
                                                                                : att.status === 'absent'
                                                                                ? 'border-danger text-danger'
                                                                                : 'border-amber-500 text-amber-500'
                                                                        }`}
                                                                        value={att.status}
                                                                        onChange={(e) => handleUpdateAttendanceStatus(att.id, e.target.value as any)}
                                                                    >
                                                                        <option value="registered">Registered</option>
                                                                        <option value="attended">Attended</option>
                                                                        <option value="absent">Absent</option>
                                                                    </select>
                                                                </td>
                                                                <td className="text-center">
                                                                    <button type="button" className="text-danger hover:text-danger-dark" onClick={() => handleDeleteAttendee(att)}>
                                                                        <IconTrashLines className="w-4.5 h-4.5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                            <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setAttendanceModalOpen(false)}>Close Gradebook</button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Register Attendee Modal */}
            <Transition appear show={addAttendeeOpen} as={Fragment}>
                <Dialog as="div" open={addAttendeeOpen} onClose={() => setAddAttendeeOpen(false)} className="relative z-[60]">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setAddAttendeeOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Register Employee to Session
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleAddAttendee} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block text-xs">Choose Employee <span className="text-danger">*</span></label>
                                                <select className="form-select rounded-lg" required value={newAttendee.employee} onChange={(e) => setNewAttendee({ ...newAttendee, employee: e.target.value })}>
                                                    <option value="">-- Choose Employee --</option>
                                                    {employees.map(emp => (
                                                        <option key={emp.id} value={emp.id}>
                                                            {emp.full_name} ({emp.designation_name || 'No Designation'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="font-semibold mb-1 block text-xs">Default Status</label>
                                                <select className="form-select rounded-lg" value={newAttendee.status} onChange={(e) => setNewAttendee({ ...newAttendee, status: e.target.value as any })}>
                                                    <option value="registered">Registered</option>
                                                    <option value="attended">Attended</option>
                                                    <option value="absent">Absent</option>
                                                </select>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setAddAttendeeOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5 shadow-md" disabled={saving}>
                                                    {saving ? 'Registering...' : 'Register to Session'}
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

export default TrainingCalendar;
