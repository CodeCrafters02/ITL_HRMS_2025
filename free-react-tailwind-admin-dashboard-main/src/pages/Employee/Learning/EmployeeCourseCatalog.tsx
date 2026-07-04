import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconSearch from '../../../components/Icon/IconSearch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const COURSES_API = `${API_BASE_URL}/employee/courses/`;
const ENROLLMENTS_API = `${API_BASE_URL}/employee/enrollments/`;
const WISHLISTS_API = `${API_BASE_URL}/employee/course-wishlists/`;
const TRAINING_REQUESTS_API = `${API_BASE_URL}/employee/training-requests/`;

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

type WishlistItem = {
    id: number;
    course: number;
    course_title: string;
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
    const [enrollments, setEnrollments] = useState<EnrollmentType[]>([]);
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [trainingRequests, setTrainingRequests] = useState<TrainingRequestType[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestingId, setRequestingId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        dispatch(setPageTitle('Course Catalog'));
        fetchCatalogData();
    }, [dispatch]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchCatalogData = async () => {
        setLoading(true);
        try {
            const [coursesRes, enrollmentsRes, wishlistsRes, requestsRes] = await Promise.all([
                authFetch(COURSES_API, { headers: getHeaders() }),
                authFetch(ENROLLMENTS_API, { headers: getHeaders() }),
                authFetch(WISHLISTS_API, { headers: getHeaders() }),
                authFetch(TRAINING_REQUESTS_API, { headers: getHeaders() }),
            ]);

            if (coursesRes.ok && enrollmentsRes.ok && wishlistsRes.ok) {
                const coursesData = await coursesRes.json();
                const enrollmentsData = await enrollmentsRes.json();
                const wishlistsData = await wishlistsRes.json();

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
                setEnrollments(enrollmentsData.results || enrollmentsData || []);
                setWishlist(wishlistsData.results || wishlistsData || []);
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
                fetchCatalogData();
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

    const handleToggleWishlist = async (courseId: number) => {
        const existing = wishlist.find((w) => w.course === courseId);
        if (existing) {
            try {
                const response = await authFetch(`${WISHLISTS_API}${existing.id}/`, {
                    method: 'DELETE',
                    headers: getHeaders(),
                });
                if (response.ok || response.status === 204) {
                    setWishlist((prev) => prev.filter((w) => w.id !== existing.id));
                }
            } catch (error) {
                console.error('Error removing from wishlist:', error);
            }
        } else {
            try {
                const response = await authFetch(WISHLISTS_API, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ course: courseId }),
                });
                if (response.ok) {
                    const data = await response.json();
                    setWishlist((prev) => [...prev, data]);
                }
            } catch (error) {
                console.error('Error adding to wishlist:', error);
            }
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

    const wishlistSet = useMemo(() => {
        return new Set(wishlist.map((w) => w.course));
    }, [wishlist]);

    // Categories
    const categories = useMemo(() => {
        const set = new Set<string>();
        courses.forEach((c) => {
            if (c.category_name) set.add(c.category_name);
        });
        return ['all', ...Array.from(set)];
    }, [courses]);

    const filteredCourses = useMemo(() => {
        return courses.filter((c) => {
            const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                (c.description || '').toLowerCase().includes(search.toLowerCase());
            
            const matchesCategory = selectedCategory === 'all' || c.category_name === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [courses, search, selectedCategory]);

    // Render the action section for a course card
    const renderCourseAction = (course: CourseType) => {
        const isEnrolled = enrollmentMap.has(course.id);
        const enr = enrollmentMap.get(course.id);
        const request = requestMap.get(course.id);
        const isWishlisted = wishlistSet.has(course.id);

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
                    <div className="flex items-center gap-2">
                        <Link
                            to={`/employee/learning-management/course-player/${enr.id}`}
                            className="btn btn-outline-primary btn-sm flex-grow rounded-lg text-xs py-1.5 font-bold"
                        >
                            Go to Syllabus
                        </Link>
                        <button
                            type="button"
                            className={`btn btn-sm rounded-lg py-1.5 px-2.5 font-bold border transition-all duration-300 ${
                                isWishlisted
                                    ? 'border-danger bg-danger/5 text-danger'
                                    : 'border-gray-200 dark:border-gray-800 text-gray-400 hover:text-danger'
                            }`}
                            onClick={() => handleToggleWishlist(course.id)}
                        >
                            ♥
                        </button>
                    </div>
                </div>
            );
        }

        // Pending approval request
        if (request && request.final_status === 'pending') {
            return (
                <div className="flex items-center gap-2">
                    <div className="flex-grow">
                        <div className="btn btn-outline-warning btn-sm w-full rounded-lg text-xs py-1.5 font-bold cursor-default opacity-90 flex items-center justify-center gap-1.5">
                            <span className="animate-pulse">⏳</span> Pending Approval
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1 text-center">Awaiting manager/admin review</p>
                    </div>
                    <button
                        type="button"
                        className={`btn btn-sm rounded-lg py-1.5 px-2.5 font-bold border transition-all duration-300 ${
                            isWishlisted
                                ? 'border-danger bg-danger/5 text-danger'
                                : 'border-gray-200 dark:border-gray-800 text-gray-400 hover:text-danger'
                        }`}
                        onClick={() => handleToggleWishlist(course.id)}
                    >
                        ♥
                    </button>
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
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-primary btn-sm flex-grow rounded-lg text-xs py-1.5 font-bold"
                            onClick={() => handleRequestEnrollment(course.id)}
                            disabled={requestingId === course.id}
                        >
                            {requestingId === course.id ? 'Submitting...' : '🔄 Re-request Enrollment'}
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm rounded-lg py-1.5 px-2.5 font-bold border transition-all duration-300 ${
                                isWishlisted
                                    ? 'border-danger bg-danger/5 text-danger'
                                    : 'border-gray-200 dark:border-gray-800 text-gray-400 hover:text-danger'
                            }`}
                            onClick={() => handleToggleWishlist(course.id)}
                        >
                            ♥
                        </button>
                    </div>
                </div>
            );
        }

        // No request yet — show "Request Enrollment" button
        return (
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className="btn btn-primary btn-sm flex-grow rounded-lg text-xs py-1.5 font-bold"
                    onClick={() => handleRequestEnrollment(course.id)}
                    disabled={requestingId === course.id}
                >
                    {requestingId === course.id ? 'Submitting...' : '📩 Request Enrollment'}
                </button>
                <button
                    type="button"
                    className={`btn btn-sm rounded-lg py-1.5 px-2.5 font-bold border transition-all duration-300 ${
                        isWishlisted
                            ? 'border-danger bg-danger/5 text-danger'
                            : 'border-gray-200 dark:border-gray-800 text-gray-400 hover:text-danger'
                    }`}
                    onClick={() => handleToggleWishlist(course.id)}
                >
                    ♥
                </button>
            </div>
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
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            className={`btn btn-sm rounded-lg text-xs py-1.5 px-3 uppercase font-bold tracking-wider transition-all duration-300 ${
                                selectedCategory === cat
                                    ? 'btn-primary'
                                    : 'btn-outline-primary bg-white dark:bg-[#0e1726]/40'
                            }`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
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

            {/* Course Grid */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400 font-semibold">Loading catalog...</span>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">No published courses found.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((c) => (
                        <div
                            key={c.id}
                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden p-0 bg-white dark:bg-[#0e1726]/40"
                        >
                            <div className="h-40 bg-gradient-to-br from-[#8b5cf6]/20 to-[#0e1726]/10 relative flex items-center justify-center border-b border-gray-150 dark:border-gray-800">
                                {c.course_image ? (
                                    <img
                                        src={c.course_image.startsWith('http') ? c.course_image : `${API_BASE_URL}${c.course_image}`}
                                        alt={c.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-4xl">📚</span>
                                )}
                                <span className="absolute top-3 left-3 badge badge-primary text-[9px] uppercase font-bold px-2 py-0.5 rounded shadow">
                                    {c.category_name || 'General'}
                                </span>
                                <span className={`absolute top-3 right-3 badge text-[9px] uppercase font-bold px-2 py-0.5 rounded shadow ${
                                    c.difficulty === 'beginner'
                                        ? 'bg-success text-white'
                                        : c.difficulty === 'intermediate'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-danger text-white'
                                }`}>
                                    {c.difficulty}
                                </span>
                            </div>

                            <div className="p-5 flex flex-col justify-between flex-grow">
                                <div>
                                    <h3 className="text-base font-bold text-gray-800 dark:text-white-light line-clamp-1 mb-1">
                                        {c.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
                                        {c.description || 'No description available for this course.'}
                                    </p>
                                </div>

                                <div className="border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 mt-auto">
                                    <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                                        <span>Self-Paced Learning</span>
                                        <span>Est: <strong className="text-gray-700 dark:text-gray-200">{c.estimated_hours || 0} Hours</strong></span>
                                    </div>

                                    {renderCourseAction(c)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployeeCourseCatalog;
