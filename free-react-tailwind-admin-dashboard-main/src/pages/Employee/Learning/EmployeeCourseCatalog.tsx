import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconSearch from '../../../components/Icon/IconSearch';
import IconClock from '../../../components/Icon/IconClock';
import IconOpenBook from '../../../components/Icon/IconOpenBook';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const COURSES_API = `${API_BASE_URL}/employee/courses/`;
const ENROLLMENTS_API = `${API_BASE_URL}/employee/enrollments/`;
const TRAINING_REQUESTS_API = `${API_BASE_URL}/employee/training-requests/`;
const CATEGORIES_API = `${API_BASE_URL}/employee/course-categories/`;

type CategoryType = {
    id: number;
    name: string;
};

type CourseType = {
    id: number;
    title: string;
    description?: string;
    category?: number | null;
    category_name?: string | null;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimated_hours?: number | null;
    is_published: boolean;
    course_image?: string | null;
};

type EnrollmentType = {
    id: number;
    course: number;
    status: string;
    progress_percentage: number;
};

type TrainingRequestType = {
    id: number;
    course?: number | null;
    final_status: 'pending' | 'approved' | 'rejected';
    decided_by: 'manager' | 'admin' | null;
    manager_remarks?: string;
    admin_remarks?: string;
    created_at: string;
};

const EmployeeCourseCatalog = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<CourseType[]>([]);
    const [categories, setCategories] = useState<CategoryType[]>([]);
    const [enrollments, setEnrollments] = useState<EnrollmentType[]>([]);
    const [trainingRequests, setTrainingRequests] = useState<TrainingRequestType[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestingId, setRequestingId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(9);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageInput, setPageInput] = useState('1');

    useEffect(() => {
        dispatch(setPageTitle('Course Catalog'));
        fetchCategories();
        fetchCatalogData(page);
    }, [dispatch, page, limit, search, selectedCategory, selectedDifficulty]);

    useEffect(() => {
        setPage(1);
        setPageInput('1');
    }, [search, selectedCategory, selectedDifficulty]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchCategories = async () => {
        try {
            const response = await authFetch(`${CATEGORIES_API}?limit=100`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCategories(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchCatalogData = async (requestedPage = page) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: requestedPage.toString(),
                limit: limit.toString(),
                status: 'published',
            });
            if (search.trim()) params.set('search', search.trim());
            if (selectedDifficulty !== 'all') params.set('difficulty_level', selectedDifficulty);
            if (selectedCategory !== 'all') params.set('category', selectedCategory);

            const [coursesRes, enrollmentsRes, requestsRes] = await Promise.all([
                authFetch(`${COURSES_API}?${params.toString()}`, { headers: getHeaders() }),
                authFetch(ENROLLMENTS_API, { headers: getHeaders() }),
                authFetch(TRAINING_REQUESTS_API, { headers: getHeaders() }),
            ]);

            if (coursesRes.ok && enrollmentsRes.ok) {
                const coursesData = await coursesRes.json();
                const enrollmentsData = await enrollmentsRes.json();

                const coursesList = (coursesData.results || coursesData || []).map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    description: c.description,
                    category: c.category,
                    category_name: c.category_name,
                    difficulty: c.difficulty_level || 'beginner',
                    estimated_hours: Number(c.duration_hours) || 0,
                    is_published: c.status === 'published',
                    course_image: c.thumbnail_url || c.thumbnail || null,
                }));
                setCourses(coursesList.filter((c: any) => c.is_published));
                setTotalCount(coursesData.count || coursesList.length || 0);
                setTotalPages(coursesData.total_pages || 1);
                setPageInput(String(requestedPage));
                setEnrollments(enrollmentsData.results || enrollmentsData || []);
            }

            if (requestsRes.ok) {
                const requestsData = await requestsRes.json();
                setTrainingRequests(requestsData.results || requestsData || []);
            }
        } catch (error) {
            console.error('Error fetching catalog data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestEnrollment = async (courseId: number) => {
        const result = await Swal.fire({
            title: 'Request Enrollment',
            html: `
                <p class="text-sm text-gray-500 mb-3">Your enrollment request will be sent to your manager and admin for approval.</p>
                <textarea id="swal-reason" class="swal2-textarea" placeholder="Why do you want to enroll in this course? (optional)" style="font-size: 13px; min-height: 80px;"></textarea>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Submit Request',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
            preConfirm: () => {
                const reason = (document.getElementById('swal-reason') as HTMLTextAreaElement)?.value || '';
                return { reason };
            },
        });

        if (!result.isConfirmed) return;

        setRequestingId(courseId);
        try {
            const response = await authFetch(TRAINING_REQUESTS_API, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    course: courseId,
                    reason: result.value?.reason || 'Self-enrollment request from course catalog',
                }),
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Request Submitted!',
                    text: 'Your enrollment request has been sent to your manager and admin for approval.',
                    icon: 'success',
                    timer: 2500,
                    showConfirmButton: false,
                });
                fetchCatalogData(1);
            } else {
                const err = await response.json().catch(() => null);
                const errMsg = err?.course?.[0] || err?.detail || err?.non_field_errors?.[0] || 'Failed to submit enrollment request.';
                Swal.fire('Error!', errMsg, 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        } finally {
            setRequestingId(null);
        }
    };

    // Map enrollments for rapid checkups
    const enrollmentMap = useMemo(() => {
        const map = new Map<number, EnrollmentType>();
        enrollments.forEach((e) => map.set(e.course, e));
        return map;
    }, [enrollments]);

    // Map training requests by course ID (latest request per course)
    const requestMap = useMemo(() => {
        const map = new Map<number, TrainingRequestType>();
        // Sort by created_at desc so latest request per course wins
        const sorted = [...trainingRequests].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        sorted.forEach((r) => {
            if (r.course && !map.has(r.course)) {
                map.set(r.course, r);
            }
        });
        return map;
    }, [trainingRequests]);

    const filteredCourses = useMemo(() => {
        return courses.filter((c) => {
            if (selectedCategory === 'all') return true;
            return String(c.category) === selectedCategory || c.category_name === selectedCategory;
        });
    }, [courses, selectedCategory]);

    // Render the action section for a course card
    const renderCourseAction = (course: CourseType) => {
        const isEnrolled = enrollmentMap.has(course.id);
        const enr = enrollmentMap.get(course.id);
        const request = requestMap.get(course.id);

        // Already enrolled — show progress & syllabus link
        if (isEnrolled && enr) {
            return (
                <div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 font-bold">
                        <span>Enrolled</span>
                        <span>{enr.progress_percentage}% completed</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-3">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${enr.progress_percentage}%` }}></div>
                    </div>
                    <Link
                        to={`/employee/learning-management/course-player/${enr.id}`}
                        className="btn btn-outline-primary btn-sm w-full rounded-lg text-xs py-1.5 font-bold"
                    >
                        Go to Syllabus
                    </Link>
                </div>
            );
        }

        // Pending approval request
        if (request && request.final_status === 'pending') {
            return (
                <div>
                    <div className="btn btn-outline-warning btn-sm w-full rounded-lg text-xs py-1.5 font-bold cursor-default opacity-90 flex items-center justify-center gap-1.5">
                        <span className="animate-pulse">⏳</span> Pending Approval
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1 text-center">Awaiting manager/admin review</p>
                </div>
            );
        }

        // Rejected — allow re-request
        if (request && request.final_status === 'rejected') {
            const rejectionRemark = request.decided_by === 'manager' ? request.manager_remarks : request.admin_remarks;
            return (
                <div>
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="badge bg-danger/10 text-danger text-[9px] uppercase font-bold px-2 py-0.5 rounded">
                            ❌ Rejected
                        </span>
                        <span className="text-[9px] text-gray-400 capitalize">by {request.decided_by}</span>
                    </div>
                    {rejectionRemark && (
                        <p className="text-[9px] text-gray-500 italic mb-2 line-clamp-2" title={rejectionRemark}>
                            "{rejectionRemark}"
                        </p>
                    )}
                    <button
                        type="button"
                        className="btn btn-primary btn-sm w-full rounded-lg text-xs py-1.5 font-bold"
                        onClick={() => handleRequestEnrollment(course.id)}
                        disabled={requestingId === course.id}
                    >
                        {requestingId === course.id ? 'Submitting...' : '🔄 Re-request Enrollment'}
                    </button>
                </div>
            );
        }

        // No request yet — show "Request Enrollment" button
        return (
            <button
                type="button"
                className="btn btn-primary btn-sm w-full rounded-lg text-xs py-1.5 font-bold"
                onClick={() => handleRequestEnrollment(course.id)}
                disabled={requestingId === course.id}
            >
                {requestingId === course.id ? 'Submitting...' : '📩 Request Enrollment'}
            </button>
        );
    };

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Interactive Course Catalog</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        Browse, request enrollment, and upgrade your skills. Enrollment requires manager or admin approval.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Filter and search controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                    <button
                        type="button"
                        className={`btn btn-sm rounded-lg text-xs py-1.5 px-3 uppercase font-bold tracking-wider transition-all duration-300 ${
                            selectedCategory === 'all'
                                ? 'btn-primary'
                                : 'btn-outline-primary bg-white dark:bg-[#0e1726]/40'
                        }`}
                        onClick={() => setSelectedCategory('all')}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            className={`btn btn-sm rounded-lg text-xs py-1.5 px-3 uppercase font-bold tracking-wider transition-all duration-300 ${
                                selectedCategory === String(cat.id)
                                    ? 'btn-primary'
                                    : 'btn-outline-primary bg-white dark:bg-[#0e1726]/40'
                            }`}
                            onClick={() => setSelectedCategory(String(cat.id))}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        className="form-select rounded-lg text-xs w-36"
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value as 'all' | 'beginner' | 'intermediate' | 'advanced')}
                    >
                        <option value="all">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                    <div className="relative w-72">
                        <input
                            type="text"
                            className="form-input pr-10 rounded-lg text-xs"
                            placeholder="Search courses..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                </div>
            </div>

            {/* Course Grid */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400 font-semibold">Loading catalog...</span>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">No published courses found.</div>
            ) : (
                <>
                    <div className="mb-4 text-xs text-gray-500">
                        Showing <span className="text-primary font-semibold">{totalCount === 0 ? 0 : ((page - 1) * limit) + 1}</span> to <span className="text-primary font-semibold">{Math.min(page * limit, totalCount)}</span> of <span className="text-primary font-semibold">{totalCount}</span> courses
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((c) => (
                        <div
                            key={c.id}
                            className="group relative rounded-2xl overflow-hidden flex flex-col justify-between bg-white dark:bg-[#0e1726] shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none ring-1 ring-[#e0e6ed] dark:ring-[#1b2e4b] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(139,92,246,0.25)] hover:ring-[#8b5cf6]/40"
                        >
                            <div className="h-44 relative overflow-hidden bg-gradient-to-br from-[#8b5cf6]/25 via-[#6366f1]/15 to-[#0e1726]/10">
                                {c.course_image ? (
                                    <img
                                        src={c.course_image.startsWith('http') ? c.course_image : `${API_BASE_URL}${c.course_image}`}
                                        alt={c.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <IconOpenBook className="w-12 h-12 text-white/70" />
                                    </div>
                                )}
                                {/* Gradient scrim for badge/text legibility */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20 pointer-events-none" />

                                <span className="absolute top-3 left-3 backdrop-blur-md bg-white/15 border border-white/25 text-white text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                                    {c.category_name || 'General'}
                                </span>
                                <span className={`absolute top-3 right-3 text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full shadow-sm ring-1 ring-white/20 ${
                                    c.difficulty === 'beginner'
                                        ? 'bg-success/90 text-white'
                                        : c.difficulty === 'intermediate'
                                        ? 'bg-amber-500/90 text-white'
                                        : 'bg-danger/90 text-white'
                                }`}>
                                    {c.difficulty}
                                </span>

                                <div className="absolute bottom-3 left-4 right-4 flex items-center gap-1.5 text-white/90 text-[11px] font-semibold drop-shadow">
                                    <IconClock className="w-3.5 h-3.5" />
                                    <span>{c.estimated_hours || 0} hrs &middot; Self-paced</span>
                                </div>
                            </div>

                            <div className="p-5 flex flex-col justify-between flex-grow">
                                <div>
                                    <h3 className="text-base font-bold text-gray-800 dark:text-white-light line-clamp-1 mb-1.5 group-hover:text-primary transition-colors duration-300">
                                        {c.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4 min-h-[2rem]">
                                        {c.description || 'No description available for this course.'}
                                    </p>
                                </div>

                                <div className="border-t border-dashed border-[#e0e6ed] dark:border-[#1b2e4b] pt-4 mt-auto">
                                    {renderCourseAction(c)}
                                </div>
                            </div>
                        </div>
                        ))}
                    </div>
                    {totalPages >= 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
                            <div className="flex items-center gap-4">
                                <div className="text-xs text-gray-500">Page {page} of {totalPages}</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-500">Per page:</span>
                                    <select
                                        className="form-select w-20 text-xs font-semibold py-1"
                                        value={limit}
                                        onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                    >
                                        <option value="3">3</option>
                                        <option value="6">6</option>
                                        <option value="9">9</option>
                                        <option value="12">12</option>
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
                                                    className={`flex justify-center font-semibold px-3 py-1.5 rounded-lg transition text-xs ${
                                                        page === p
                                                            ? 'bg-primary text-white shadow-md'
                                                            : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'
                                                    }`}
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
                </>
            )}
        </div>
    );
};

export default EmployeeCourseCatalog;
