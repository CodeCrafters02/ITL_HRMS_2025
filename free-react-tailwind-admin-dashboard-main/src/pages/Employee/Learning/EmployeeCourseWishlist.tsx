import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import Swal from 'sweetalert2';

const API_BASE_URL = 'http://localhost:8000';
const WISHLISTS_API = `${API_BASE_URL}/employee/course-wishlists/`;
const ENROLLMENTS_API = `${API_BASE_URL}/employee/enrollments/`;

interface WishlistItem {
    id: number;
    course: number;
    course_title: string;
    course_category: string;
    course_trainer: string;
    course_difficulty: string;
    course_duration: string;
    course_image: string | null;
}

const EmployeeCourseWishlist = () => {
    const dispatch = useDispatch();
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(9);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageInput, setPageInput] = useState('1');

    useEffect(() => {
        dispatch(setPageTitle('My Wishlist'));
        fetchData(1);
    }, [dispatch]);

    useEffect(() => {
        setPage(1);
        setPageInput('1');
        fetchData(1);
    }, [search]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchData = async (requestedPage = page) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: requestedPage.toString(),
                limit: limit.toString(),
            });
            if (search.trim()) params.set('search', search.trim());

            const [wishRes, enrollRes] = await Promise.all([
                fetch(`${WISHLISTS_API}?${params.toString()}`, { headers: getHeaders() }),
                fetch(ENROLLMENTS_API, { headers: getHeaders() }),
            ]);

            if (wishRes.ok && enrollRes.ok) {
                const wishData = await wishRes.json();
                const enrollData = await enrollRes.json();
                setWishlist(wishData.results || wishData || []);
                setTotalCount(wishData.count || 0);
                setTotalPages(wishData.total_pages || 1);
                setPageInput(String(requestedPage));
                setEnrollments(enrollData.results || enrollData || []);
            }
        } catch (error) {
            console.error('Error fetching wishlist data:', error);
            Swal.fire('Error!', 'Could not load wishlist courses.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveWishlist = async (id: number) => {
        try {
            const res = await fetch(`${WISHLISTS_API}${id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (res.ok) {
                setWishlist((prev) => prev.filter((item) => item.id !== id));
                Swal.fire('Removed!', 'Course removed from your wishlist.', 'success');
            } else {
                Swal.fire('Error!', 'Could not remove item.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        }
    };

    const handleEnroll = async (courseId: number) => {
        try {
            const res = await fetch(ENROLLMENTS_API, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ course: courseId }),
            });

            if (res.ok) {
                Swal.fire('Success!', 'Successfully enrolled in course.', 'success');
                fetchData(1);
            } else {
                const err = await res.json();
                Swal.fire('Error!', err.detail || 'Could not complete enrollment.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection error.', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="panel border-0 shadow-sm rounded-xl p-5 bg-white dark:bg-[#0e1726]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-800 dark:text-white-light">My Starred Wishlist</h2>
                        <p className="text-xs text-gray-450 mt-1">Manage all course collections you intend to enroll and complete.</p>
                    </div>
                    <div className="w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Search wishlisted courses..."
                            className="form-input text-xs rounded-lg w-full sm:w-72"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin border-4 border-primary border-l-transparent w-9 h-9 rounded-full inline-block"></span>
                </div>
            ) : wishlist.length === 0 ? (
                <div className="panel text-center py-16 bg-white dark:bg-[#0e1726] border-0 shadow-sm rounded-xl">
                    <span className="text-5xl block mb-3">⭐</span>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">No wishlisted courses found</h3>
                    <p className="text-xs text-gray-450 mt-1.5 max-w-xs mx-auto">
                        Navigate to the Course Catalog to bookmark courses that you find interesting!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlist.map((item) => {
                        const isEnrolled = enrollments.some((e: any) => e.course === item.course);
                        return (
                            <div key={item.id} className="panel bg-white dark:bg-[#0e1726] border-0 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col justify-between p-0">
                                <div>
                                    <div className="relative h-44 bg-gray-100 dark:bg-black/25 flex items-center justify-center">
                                        {item.course_image ? (
                                            <img
                                                src={item.course_image.startsWith('http') ? item.course_image : `${API_BASE_URL}${item.course_image}`}
                                                alt={item.course_title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-5xl text-gray-300">🎓</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveWishlist(item.id)}
                                            className="absolute top-3 right-3 p-2 rounded-full bg-white dark:bg-gray-800 text-danger hover:scale-110 shadow-sm transition-all duration-300"
                                            title="Remove from Wishlist"
                                        >
                                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <span className="badge badge-outline-primary text-[10px] uppercase font-bold">{item.course_category}</span>
                                        <h3 className="font-extrabold text-sm text-gray-800 dark:text-white-light leading-snug line-clamp-2">{item.course_title}</h3>
                                        <div className="flex justify-between items-center text-xs text-gray-400 font-medium">
                                            <span>Instructor: <strong>{item.course_trainer}</strong></span>
                                            <span>Duration: <strong>{item.course_duration} hrs</strong></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/10 flex gap-3">
                                    {isEnrolled ? (
                                        <button disabled className="btn btn-success flex-1 rounded-lg text-xs py-2">
                                            ✓ Enrolled
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleEnroll(item.course)}
                                            className="btn btn-primary flex-1 rounded-lg text-xs py-2 shadow-sm"
                                        >
                                            Enroll Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                    <div className="text-xs text-gray-500">Showing {wishlist.length} of {totalCount} wishlisted courses</div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm rounded-lg"
                            onClick={() => {
                                const nextPage = Math.max(1, page - 1);
                                setPage(nextPage);
                                fetchData(nextPage);
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
                                fetchData(nextPage);
                            }}
                            disabled={page >= totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeCourseWishlist;
