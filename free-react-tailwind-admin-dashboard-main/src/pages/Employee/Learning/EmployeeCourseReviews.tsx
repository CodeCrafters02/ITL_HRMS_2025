import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import Swal from 'sweetalert2';

const API_BASE_URL = 'http://localhost:8000';
const REVIEWS_API = `${API_BASE_URL}/employee/course-reviews/`;
const CERTIFICATES_API = `${API_BASE_URL}/employee/certificates/`;

interface ReviewItem {
    id: number;
    course: number;
    course_title: string;
    course_category: string;
    rating: number;
    review_text: string;
    created_at: string;
}

const EmployeeCourseReviews = () => {
    const dispatch = useDispatch();
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageInput, setPageInput] = useState('1');

    // Modal state variables
    const [showModal, setShowModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('My Course Reviews'));
        fetchReviews(1);
        fetchCourses();
    }, [dispatch]);

    useEffect(() => {
        setPage(1);
        setPageInput('1');
        fetchReviews(1);
    }, [search]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchReviews = async (requestedPage = page) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: requestedPage.toString(),
                limit: limit.toString(),
            });
            if (search.trim()) params.set('search', search.trim());

            const res = await fetch(`${REVIEWS_API}?${params.toString()}`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setReviews(data.results || data || []);
                setTotalCount(data.count || 0);
                setTotalPages(data.total_pages || 1);
                setPageInput(String(requestedPage));
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            Swal.fire('Error!', 'Could not load course reviews.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch(`${CERTIFICATES_API}?mine=true`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                const certs = data.results || data || [];
                const seen = new Set<number>();
                const completedCourses = certs
                    .filter((c: any) => c.course != null && !seen.has(c.course) && seen.add(c.course))
                    .map((c: any) => ({ id: c.course, title: c.course_title }));
                setCourses(completedCourses);
            }
        } catch (error) {
            console.error('Error fetching completed courses:', error);
        }
    };

    const handleDeleteReview = async (id: number) => {
        try {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: 'Your review rating and comments will be permanently deleted.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            });

            if (!result.isConfirmed) return;

            const res = await fetch(`${REVIEWS_API}${id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (res.ok) {
                setReviews((prev) => prev.filter((r) => r.id !== id));
                Swal.fire('Deleted!', 'Your review feedback was successfully removed.', 'success');
            } else {
                Swal.fire('Error!', 'Could not delete review.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) {
            Swal.fire('Error!', 'Please select a course.', 'error');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(REVIEWS_API, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    course: Number(selectedCourse),
                    rating: rating,
                    review_text: reviewText,
                }),
            });

            if (res.ok) {
                Swal.fire('Submitted!', 'Your review feedback was successfully submitted.', 'success');
                setShowModal(false);
                setSelectedCourse('');
                setRating(5);
                setReviewText('');
                fetchReviews(1);
            } else {
                const err = await res.json();
                Swal.fire('Error!', err.detail || err.non_field_errors?.[0] || 'You have already submitted a review for this course.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`w-4 h-4 ${star <= rating ? 'text-amber-500 fill-current' : 'text-gray-200 dark:text-gray-700'}`}
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                ))}
            </div>
        );
    };

    const availableCourses = courses.filter((c: any) => !reviews.some((r) => r.course === c.id));

    return (
        <div className="space-y-6">
            <div className="panel border-0 shadow-sm rounded-xl p-5 bg-white dark:bg-[#0e1726]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-800 dark:text-white-light">My Course Reviews</h2>
                        <p className="text-xs text-gray-450 mt-1">Manage and view course ratings and comments you submitted.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Search reviews..."
                            className="form-input text-xs rounded-lg w-full sm:w-60"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (availableCourses.length === 0) {
                                    Swal.fire('No Courses to Review', 'You can only review courses you have completed and earned a certificate for.', 'info');
                                    return;
                                }
                                setShowModal(true);
                            }}
                            className="btn btn-primary rounded-lg text-xs py-2 px-4 shadow-sm w-full sm:w-auto"
                        >
                            + Write a Review
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin border-4 border-primary border-l-transparent w-9 h-9 rounded-full inline-block"></span>
                </div>
            ) : reviews.length === 0 ? (
                <div className="panel text-center py-16 bg-white dark:bg-[#0e1726] border-0 shadow-sm rounded-xl">
                    <span className="text-5xl block mb-3">💬</span>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">No course reviews submitted</h3>
                    <p className="text-xs text-gray-450 mt-1.5 max-w-xs mx-auto">
                        Your reviews will show up here after you complete courses and leave rating feedbacks!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reviews.map((r) => (
                        <div key={r.id} className="panel bg-white dark:bg-[#0e1726] border-0 shadow-sm rounded-xl p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="badge badge-outline-primary text-[9px] uppercase font-bold">{r.course_category}</span>
                                        <h3 className="font-extrabold text-sm text-gray-800 dark:text-white-light leading-snug line-clamp-1">{r.course_title}</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteReview(r.id)}
                                        className="text-gray-300 hover:text-danger p-1 rounded-lg hover:bg-danger/5 transition-all duration-300"
                                        title="Delete Review"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    {renderStars(r.rating)}
                                    <span className="text-[11px] font-bold text-amber-500">{r.rating}.0 / 5.0</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium bg-gray-50/50 dark:bg-black/10 p-3 rounded-lg border border-gray-100 dark:border-gray-850 min-h-[60px]">
                                    {r.review_text || <span className="italic text-gray-400">No comment feedback left.</span>}
                                </p>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-4 text-right font-medium">
                                Submitted on: <strong>{new Date(r.created_at).toLocaleDateString()}</strong>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                    <div className="text-xs text-gray-500">Showing {reviews.length} of {totalCount} reviews</div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm rounded-lg"
                            onClick={() => {
                                const nextPage = Math.max(1, page - 1);
                                setPage(nextPage);
                                fetchReviews(nextPage);
                            }}
                            disabled={page <= 1}
                        >
                            Previous
                        </button>
                        <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            className="form-input w-16 rounded-lg text-xs"
                        />
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm rounded-lg"
                            onClick={() => {
                                const nextPage = Math.min(totalPages, page + 1);
                                setPage(nextPage);
                                fetchReviews(nextPage);
                            }}
                            disabled={page >= totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Write a Review Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate__animated animate__fadeIn">
                    <div className="bg-white dark:bg-[#0e1726] rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-150 dark:border-gray-800 animate__animated animate__zoomIn">
                        <div className="flex justify-between items-center border-b border-gray-150 dark:border-gray-800 pb-3">
                            <h3 className="text-base font-bold text-gray-800 dark:text-white">Submit a Course Review</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSubmitReview} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold mb-2">Select Course <span className="text-danger">*</span></label>
                                <select
                                    required
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    className="form-select text-xs rounded-lg w-full"
                                >
                                    <option value="">-- Choose Course --</option>
                                    {availableCourses.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1.5">Only courses you've completed and earned a certificate for are listed.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-2">Rating Star <span className="text-danger">*</span></label>
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className="text-amber-500 transition-all duration-300 hover:scale-110"
                                        >
                                            <svg
                                                className={`w-6 h-6 ${star <= rating ? 'text-amber-500 fill-current' : 'text-gray-200 dark:text-gray-700'}`}
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-2">Your Comments</label>
                                <textarea
                                    className="form-textarea text-xs rounded-lg min-h-[90px] w-full"
                                    placeholder="Write your rating feedback comments here..."
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-3 border-t border-gray-150 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-outline-danger btn-sm rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-primary btn-sm rounded-lg"
                                >
                                    {saving ? 'Saving...' : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeCourseReviews;
