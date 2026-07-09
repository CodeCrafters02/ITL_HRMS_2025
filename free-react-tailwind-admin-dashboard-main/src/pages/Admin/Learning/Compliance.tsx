import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconSearch from '../../../components/Icon/IconSearch';
import IconX from '../../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const ENROLLMENTS_API = `${API_BASE_URL}/employee/enrollments/`;
const CONTENTS_API = `${API_BASE_URL}/employee/course-contents/`;
const PROGRESS_API = `${API_BASE_URL}/employee/lesson-progresses/`;

type EnrollmentType = {
    id: number;
    course: number;
    course_title: string;
    course_difficulty?: string;
    course_estimated_hours?: number;
    employee: number;
    employee_name: string;
    employee_code: string | null;
    department_name: string | null;
    status: 'waitlisted' | 'enrolled' | 'in_progress' | 'completed' | 'cancelled';
    progress_percentage: number;
    enrolled_at: string;
    completed_at?: string | null;
};

type ContentType = {
    id: number;
    title: string;
    content_type: string;
    sequence: number;
};

type LessonProgressType = {
    id: number;
    content: number;
    is_completed: boolean;
};

const Compliance = () => {
    const dispatch = useDispatch();

    // Employee Course Activity state
    const [enrollments, setEnrollments] = useState<EnrollmentType[]>([]);
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
    const [activitySearch, setActivitySearch] = useState('');

    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [activityModalOpen, setActivityModalOpen] = useState(false);
    const [activeEmployeeId, setActiveEmployeeId] = useState<number | null>(null);
    const [expandedEnrollmentId, setExpandedEnrollmentId] = useState<number | null>(null);
    const [contentsCache, setContentsCache] = useState<Record<number, ContentType[]>>({});
    const [progressCache, setProgressCache] = useState<Record<number, LessonProgressType[]>>({});
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Employee Course Activity'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchEnrollments();
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [activitySearch, page, limit]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchEnrollments = async () => {
        setEnrollmentsLoading(true);
        try {
            const url = new URL(ENROLLMENTS_API);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('limit', limit.toString());
            if (activitySearch) url.searchParams.append('search', activitySearch);

            const response = await authFetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setEnrollments(data.results);
                    setTotalCount(data.count);
                    setTotalPages(data.total_pages || Math.ceil(data.count / limit));
                } else if (Array.isArray(data)) {
                    setEnrollments(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                } else {
                    setEnrollments([]);
                    setTotalCount(0);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        } finally {
            setEnrollmentsLoading(false);
        }
    };

    const fetchEnrollmentDetail = async (enrollment: EnrollmentType) => {
        if (contentsCache[enrollment.course] && progressCache[enrollment.id]) return;
        setDetailLoading(true);
        try {
            const [contentsRes, progressRes] = await Promise.all([
                contentsCache[enrollment.course]
                    ? Promise.resolve(null)
                    : authFetch(`${CONTENTS_API}?course_id=${enrollment.course}`, { headers: getHeaders() }),
                authFetch(`${PROGRESS_API}?enrollment=${enrollment.id}`, { headers: getHeaders() }),
            ]);

            if (contentsRes && contentsRes.ok) {
                const data = await contentsRes.json();
                setContentsCache((prev) => ({ ...prev, [enrollment.course]: data.results || data || [] }));
            }
            if (progressRes.ok) {
                const data = await progressRes.json();
                setProgressCache((prev) => ({ ...prev, [enrollment.id]: data.results || data || [] }));
            }
        } catch (error) {
            console.error('Error fetching enrollment detail:', error);
        } finally {
            setDetailLoading(false);
        }
    };

    // One card per employee who has at least one enrollment, with aggregate counts
    const employeeActivitySummaries = useMemo(() => {
        const map = new Map<number, {
            employee: number;
            employee_name: string;
            employee_code: string | null;
            department_name: string | null;
            total: number;
            completed: number;
            inProgress: number;
            pending: number;
        }>();

        enrollments.forEach((e) => {
            const existing = map.get(e.employee) || {
                employee: e.employee,
                employee_name: e.employee_name,
                employee_code: e.employee_code,
                department_name: e.department_name,
                total: 0,
                completed: 0,
                inProgress: 0,
                pending: 0,
            };
            existing.total += 1;
            if (e.status === 'completed') existing.completed += 1;
            else if (e.status === 'in_progress') existing.inProgress += 1;
            else existing.pending += 1;
            map.set(e.employee, existing);
        });

        return Array.from(map.values()).filter((s) => {
            const q = activitySearch.toLowerCase();
            return (
                s.employee_name.toLowerCase().includes(q) ||
                (s.employee_code || '').toLowerCase().includes(q) ||
                (s.department_name || '').toLowerCase().includes(q)
            );
        }).sort((a, b) => a.employee_name.localeCompare(b.employee_name));
    }, [enrollments, activitySearch]);

    const activeEmployeeEnrollments = useMemo(() => {
        if (activeEmployeeId === null) return [];
        return enrollments.filter((e) => e.employee === activeEmployeeId);
    }, [enrollments, activeEmployeeId]);

    const activeEmployeeSummary = useMemo(() => {
        return employeeActivitySummaries.find((s) => s.employee === activeEmployeeId) || null;
    }, [employeeActivitySummaries, activeEmployeeId]);

    const openActivityModal = (employeeId: number) => {
        setActiveEmployeeId(employeeId);
        setExpandedEnrollmentId(null);
        setActivityModalOpen(true);
    };

    const toggleEnrollmentExpand = (enrollment: EnrollmentType) => {
        if (expandedEnrollmentId === enrollment.id) {
            setExpandedEnrollmentId(null);
            return;
        }
        setExpandedEnrollmentId(enrollment.id);
        fetchEnrollmentDetail(enrollment);
    };

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Employee Course Activity</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        See every employee with course activity — enrolled, completed, and pending courses, and exactly which syllabus items they've finished.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        className="form-input pr-10 w-80"
                        placeholder="Search employee, ID, or department..."
                        value={activitySearch}
                        onChange={(e) => { setActivitySearch(e.target.value); setPage(1); }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <IconSearch className="w-4 h-4" />
                    </span>
                </div>
                <span className="text-xs text-gray-400 font-semibold">{employeeActivitySummaries.length} employee(s) showing on page</span>
            </div>

            {enrollmentsLoading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading employee course activity...</span>
                </div>
            ) : employeeActivitySummaries.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">No employees have enrolled in any course yet.</div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {employeeActivitySummaries.map((s) => (
                            <button
                                key={s.employee}
                                type="button"
                                onClick={() => openActivityModal(s.employee)}
                                className="panel text-left border border-[#e0e6ed] dark:border-[#1b2e4b] hover:shadow-lg hover:border-primary/40 transition-all duration-300 rounded-xl p-5"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="font-bold text-gray-800 dark:text-white-light">{s.employee_name}</div>
                                        <div className="text-xs text-gray-400">{s.employee_code || '—'} • {s.department_name || 'No Dept'}</div>
                                    </div>
                                    <span className="badge badge-outline-primary rounded-full px-2.5 py-0.5 text-[11px] font-bold">{s.total} course{s.total === 1 ? '' : 's'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                                    <span className="badge bg-success text-white rounded-full px-2 py-0.5">{s.completed} Completed</span>
                                    <span className="badge bg-primary text-white rounded-full px-2 py-0.5">{s.inProgress} In Progress</span>
                                    <span className="badge bg-amber-500 text-white rounded-full px-2 py-0.5">{s.pending} Pending</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {totalCount > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl mt-6">
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                                    Showing <span className="text-primary">{((page - 1) * limit) + 1}</span> to <span className="text-primary">{Math.min(page * limit, totalCount)}</span> of <span className="text-primary">{totalCount}</span> enrollment records
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">Per page:</span>
                                    <select
                                        className="form-select w-20 text-sm font-semibold py-1"
                                        value={limit}
                                        onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
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
                                        onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                        disabled={page === 1}
                                    >
                                        Prev
                                    </button>
                                </li>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <li key={p}>
                                        <button
                                            type="button"
                                            className={`flex justify-center font-semibold px-3 py-1.5 rounded-lg transition text-xs ${page === p ? 'bg-primary text-white shadow-md' : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'}`}
                                            onClick={() => setPage(p)}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                ))}
                                <li>
                                    <button
                                        type="button"
                                        className="flex justify-center font-semibold px-3 py-1.5 rounded-lg transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                        onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                        disabled={page === totalPages || totalPages === 0}
                                    >
                                        Next
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Employee Course Activity Modal */}
            <Transition appear show={activityModalOpen} as={Fragment}>
                <Dialog as="div" open={activityModalOpen} onClose={() => setActivityModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-3xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setActivityModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        <div className="text-lg font-bold">{activeEmployeeSummary?.employee_name || 'Employee'} — Course Activity</div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {activeEmployeeSummary?.employee_code || '—'} • {activeEmployeeSummary?.department_name || 'No Dept'}
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        {activeEmployeeSummary && (
                                            <div className="flex items-center gap-2 mb-5 text-[10px] font-bold uppercase">
                                                <span className="badge badge-outline-primary rounded-full px-2.5 py-1">{activeEmployeeSummary.total} Total</span>
                                                <span className="badge bg-success text-white rounded-full px-2.5 py-1">{activeEmployeeSummary.completed} Completed</span>
                                                <span className="badge bg-primary text-white rounded-full px-2.5 py-1">{activeEmployeeSummary.inProgress} In Progress</span>
                                                <span className="badge bg-amber-500 text-white rounded-full px-2.5 py-1">{activeEmployeeSummary.pending} Pending</span>
                                            </div>
                                        )}

                                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                            {activeEmployeeEnrollments.map((en) => {
                                                const expanded = expandedEnrollmentId === en.id;
                                                const contents = (contentsCache[en.course] || []).slice().sort((a, b) => a.sequence - b.sequence);
                                                const completedContentIds = new Set(
                                                    (progressCache[en.id] || []).filter((p) => p.is_completed).map((p) => p.content)
                                                );

                                                return (
                                                    <div key={en.id} className="border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg overflow-hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleEnrollmentExpand(en)}
                                                            className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors"
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-gray-800 dark:text-white-light truncate">{en.course_title}</div>
                                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                                    Enrolled {new Date(en.enrolled_at).toLocaleDateString()}
                                                                    {en.completed_at && ` • Completed ${new Date(en.completed_at).toLocaleDateString()}`}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <div className="w-24">
                                                                    <div className="flex justify-between text-[9px] text-gray-400 font-bold mb-0.5">
                                                                        <span>{en.progress_percentage}%</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-100 dark:bg-gray-850 rounded-full h-1.5">
                                                                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${en.progress_percentage}%` }}></div>
                                                                    </div>
                                                                </div>
                                                                <span className={`badge uppercase text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                                                    en.status === 'completed'
                                                                        ? 'bg-success text-white'
                                                                        : en.status === 'in_progress'
                                                                        ? 'bg-primary text-white'
                                                                        : en.status === 'cancelled'
                                                                        ? 'bg-gray-400 text-white'
                                                                        : 'bg-amber-500 text-white'
                                                                }`}>
                                                                    {en.status.replace('_', ' ')}
                                                                </span>
                                                                <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
                                                            </div>
                                                        </button>

                                                        {expanded && (
                                                            <div className="border-t border-[#ebedf2] dark:border-[#1b2e4b] p-4 bg-gray-50 dark:bg-[#0e1726]/20">
                                                                {detailLoading && !contentsCache[en.course] ? (
                                                                    <div className="text-xs text-gray-400 animate-pulse text-center py-3">Loading syllabus details...</div>
                                                                ) : contents.length === 0 ? (
                                                                    <div className="text-xs text-gray-400 italic text-center py-3">No syllabus items in this course.</div>
                                                                ) : (
                                                                    <ul className="space-y-1.5">
                                                                        {contents.map((c) => {
                                                                            const done = completedContentIds.has(c.id);
                                                                            return (
                                                                                <li key={c.id} className="flex items-center justify-between text-xs bg-white dark:bg-[#0e1726]/40 border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg px-3 py-2">
                                                                                    <div className="flex items-center gap-2 truncate">
                                                                                        <span>{c.content_type === 'video' ? '🎥' : c.content_type === 'link' ? '🔗' : '📄'}</span>
                                                                                        <span className="truncate font-medium">{c.title}</span>
                                                                                    </div>
                                                                                    {done ? (
                                                                                        <span className="text-success font-bold shrink-0">✓ Completed</span>
                                                                                    ) : (
                                                                                        <span className="text-gray-400 shrink-0">Pending</span>
                                                                                    )}
                                                                                </li>
                                                                            );
                                                                        })}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                            <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setActivityModalOpen(false)}>Close</button>
                                        </div>
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

export default Compliance;
