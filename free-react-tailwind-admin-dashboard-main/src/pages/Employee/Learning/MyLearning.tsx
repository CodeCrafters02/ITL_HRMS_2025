import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconMenuCalendar from '../../../components/Icon/Menu/IconMenuCalendar';
import IconMenuDocumentation from '../../../components/Icon/Menu/IconMenuDocumentation';
import IconMenuInvoice from '../../../components/Icon/Menu/IconMenuInvoice';
import IconOpenBook from '../../../components/Icon/IconOpenBook';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const ENROLLMENTS_API = `${API_BASE_URL}/employee/enrollments/`;
const COMPLIANCE_API = `${API_BASE_URL}/employee/compliance-assignments/`;
const CERTIFICATES_API = `${API_BASE_URL}/employee/certificates/`;
const WISHLISTS_API = `${API_BASE_URL}/employee/course-wishlists/`;
const PATHS_API = `${API_BASE_URL}/employee/learning-path-assignments/`;

type EnrollmentType = {
    id: number;
    course: number;
    course_title: string;
    course_description?: string;
    course_image_url?: string | null;
    course_difficulty: string;
    course_estimated_hours: number;
    progress_percentage: number;
    status: string;
};

type ComplianceType = {
    id: number;
    course_title: string;
    due_date: string;
    status: 'pending' | 'completed' | 'overdue';
};

type CertificateType = {
    id: number;
    course_title?: string | null;
    custom_course_title?: string | null;
    issued_date: string;
    certificate_file_url?: string | null;
    verification_code?: string;
};

type WishlistItem = {
    id: number;
    course: number;
    course_title: string;
    course_image_url?: string | null;
};

const MyLearning = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const [enrollments, setEnrollments] = useState<EnrollmentType[]>([]);
    const [compliances, setCompliances] = useState<ComplianceType[]>([]);
    const [certificates, setCertificates] = useState<CertificateType[]>([]);
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [learningPaths, setLearningPaths] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'courses' | 'compliance' | 'certificates' | 'wishlist' | 'paths'>('courses');
    const [enrollingId, setEnrollingId] = useState<number | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('My Learning'));
        fetchDashboardData();

        if (location.pathname.includes('compliance-training')) {
            setActiveTab('compliance');
        } else if (location.pathname.includes('certifications')) {
            setActiveTab('certificates');
        } else {
            setActiveTab('courses');
        }
    }, [dispatch, location.pathname]);


    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [enrRes, compRes, certRes, wishRes, pathsRes] = await Promise.all([
                fetch(ENROLLMENTS_API, { headers: getHeaders() }),
                fetch(COMPLIANCE_API, { headers: getHeaders() }),
                fetch(CERTIFICATES_API, { headers: getHeaders() }),
                fetch(WISHLISTS_API, { headers: getHeaders() }),
                fetch(PATHS_API, { headers: getHeaders() }),
            ]);

            if (enrRes.ok) {
                const enrData = await enrRes.json();
                setEnrollments(enrData.results || enrData || []);
            }
            if (compRes.ok) {
                const compData = await compRes.json();
                setCompliances(compData.results || compData || []);
            }
            if (certRes.ok) {
                const certData = await certRes.json();
                setCertificates(certData.results || certData || []);
            }
            if (wishRes.ok) {
                const wishData = await wishRes.json();
                setWishlist(wishData.results || wishData || []);
            }
            if (pathsRes.ok) {
                const pathsData = await pathsRes.json();
                setLearningPaths(pathsData.results || pathsData || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard content:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnrollFromWishlist = async (courseId: number) => {
        setEnrollingId(courseId);
        try {
            const response = await fetch(ENROLLMENTS_API, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ course: courseId }),
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Enrolled!',
                    text: 'You have enrolled successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                
                // Clear from wishlist
                const existingWish = wishlist.find((w) => w.course === courseId);
                if (existingWish) {
                    await fetch(`${WISHLISTS_API}${existingWish.id}/`, {
                        method: 'DELETE',
                        headers: getHeaders(),
                    });
                }
                
                fetchDashboardData();
                setActiveTab('courses');
            } else {
                Swal.fire('Error!', 'Enrollment failed.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection error.', 'error');
        } finally {
            setEnrollingId(null);
        }
    };

    const handleRemoveWishlist = async (wishId: number) => {
        try {
            const response = await fetch(`${WISHLISTS_API}${wishId}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (response.ok || response.status === 204) {
                setWishlist((prev) => prev.filter((w) => w.id !== wishId));
            }
        } catch {
            Swal.fire('Error!', 'Failed to remove item.', 'error');
        }
    };

    const activeCount = enrollments.filter((e) => e.progress_percentage < 100).length;
    const completedCount = enrollments.filter((e) => e.progress_percentage === 100).length;
    const pendingCompliance = compliances.filter((c) => c.status !== 'completed').length;

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">My Learning Space</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        Resume your curriculum, verify critical compliance deadlines, and download earned course credentials.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Quick stats banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="panel flex items-center justify-between border border-[#e0e6ed] dark:border-[#1b2e4b] p-5 rounded-xl bg-white dark:bg-[#0e1726]/40 shadow-sm">
                    <div>
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Active Enrollments</span>
                        <span className="text-2xl font-extrabold text-primary block mt-1">{activeCount} Courses</span>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                        <IconMenuCalendar className="w-6 h-6" />
                    </div>
                </div>

                <div className="panel flex items-center justify-between border border-[#e0e6ed] dark:border-[#1b2e4b] p-5 rounded-xl bg-white dark:bg-[#0e1726]/40 shadow-sm">
                    <div>
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Completed Courses</span>
                        <span className="text-2xl font-extrabold text-success block mt-1">{completedCount} Modules</span>
                    </div>
                    <div className="p-3 bg-success/10 rounded-lg text-success">
                        <IconMenuDocumentation className="w-6 h-6" />
                    </div>
                </div>

                <div className="panel flex items-center justify-between border border-[#e0e6ed] dark:border-[#1b2e4b] p-5 rounded-xl bg-white dark:bg-[#0e1726]/40 shadow-sm">
                    <div>
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Compliance Tasks</span>
                        <span className="text-2xl font-extrabold text-danger block mt-1">{pendingCompliance} Pending</span>
                    </div>
                    <div className="p-3 bg-danger/10 rounded-lg text-danger">
                        <IconMenuInvoice className="w-6 h-6" />
                    </div>
                </div>

                <div className="panel flex items-center justify-between border border-[#e0e6ed] dark:border-[#1b2e4b] p-5 rounded-xl bg-white dark:bg-[#0e1726]/40 shadow-sm">
                    <div>
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Course Wishlist</span>
                        <span className="text-2xl font-extrabold text-amber-500 block mt-1">{wishlist.length} Starred</span>
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
                        <IconOpenBook className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Tab links */}
            <div className="flex border-b border-[#ebedf2] dark:border-[#1b2e4b] mb-6 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('courses')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${
                        activeTab === 'courses'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-primary'
                    }`}
                >
                    My Enrolled Courses
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('compliance')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${
                        activeTab === 'compliance'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-primary'
                    }`}
                >
                    Compliance Assignments ({pendingCompliance})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('certificates')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${
                        activeTab === 'certificates'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-primary'
                    }`}
                >
                    Certificates Archive ({certificates.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('wishlist')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${
                        activeTab === 'wishlist'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-primary'
                    }`}
                >
                    My Wishlist ({wishlist.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('paths')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${
                        activeTab === 'paths'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-primary'
                    }`}
                >
                    Learning Paths ({learningPaths.length})
                </button>
            </div>

            {/* Content rendering */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400 font-semibold">Loading data files...</span>
                </div>
            ) : (
                <div className="animate-fade-in">
                    {/* Courses Tab */}
                    {activeTab === 'courses' && (
                        <div>
                            {enrollments.length === 0 ? (
                                <div className="panel text-center py-10 text-gray-500">
                                    You have not enrolled in any courses yet.{' '}
                                    <Link to="/employee/learning-management/course-catalog" className="text-primary hover:underline font-bold">
                                        Browse Course Catalog
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {enrollments.map((enr) => (
                                        <div
                                            key={enr.id}
                                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden p-0 bg-white dark:bg-[#0e1726]/40"
                                        >
                                            <div className="h-36 bg-gradient-to-br from-[#8b5cf6]/20 to-[#0e1726]/10 relative flex items-center justify-center border-b border-gray-150 dark:border-gray-800">
                                                {enr.course_image_url ? (
                                                    <img
                                                        src={enr.course_image_url}
                                                        alt={enr.course_title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-4xl">📚</span>
                                                )}
                                                <span className="absolute top-3 left-3 badge badge-primary text-[9px] uppercase font-bold px-2 py-0.5 rounded shadow">
                                                    {enr.course_difficulty}
                                                </span>
                                            </div>

                                            <div className="p-5 flex flex-col justify-between flex-grow">
                                                <div>
                                                    <h3 className="text-base font-bold text-gray-800 dark:text-white-light line-clamp-1 mb-1">
                                                        {enr.course_title}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
                                                        {enr.course_description || 'Resume your course lectures and tests.'}
                                                    </p>
                                                </div>

                                                <div className="border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 mt-auto">
                                                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 font-bold">
                                                        <span>Course Syllabus Progress</span>
                                                        <span>{enr.progress_percentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-4">
                                                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${enr.progress_percentage}%` }}></div>
                                                    </div>

                                                    <Link
                                                        to={`/employee/learning-management/course-player/${enr.id}`}
                                                        className={`btn btn-sm w-full rounded-lg text-xs py-1.5 font-bold ${
                                                            enr.progress_percentage === 100
                                                                ? 'btn-success'
                                                                : 'btn-primary'
                                                        }`}
                                                    >
                                                        {enr.progress_percentage === 100 ? 'Review Syllabus' : 'Resume Learning'}
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Compliance Tab */}
                    {activeTab === 'compliance' && (
                        <div className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl p-6 bg-white dark:bg-[#0e1726]/40 shadow-sm">
                            {compliances.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 italic">No compliance assignments mapped to your account.</div>
                            ) : (
                                <div className="table-responsive border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg">
                                    <table className="table-hover text-xs">
                                        <thead>
                                            <tr>
                                                <th>Course Title</th>
                                                <th>Deadline Target</th>
                                                <th>Remaining Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {compliances.map((c) => (
                                                <tr key={c.id}>
                                                    <td className="font-bold text-gray-800 dark:text-gray-250">{c.course_title}</td>
                                                    <td>{new Date(c.due_date).toLocaleDateString()}</td>
                                                    <td>
                                                        <span className={`badge text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                                                            c.status === 'completed'
                                                                ? 'bg-success text-white'
                                                                : c.status === 'overdue'
                                                                ? 'bg-danger text-white'
                                                                : 'bg-amber-500 text-white'
                                                        }`}>
                                                            {c.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Certificates Tab */}
                    {activeTab === 'certificates' && (
                        <div>
                            {certificates.length === 0 ? (
                                <div className="panel text-center py-10 text-gray-500 italic">You have not achieved any course credentials yet. Keep studying!</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {certificates.map((cert) => (
                                        <div
                                            key={cert.id}
                                            className="panel border border-dashed border-[#8b5cf6]/50 bg-[#8b5cf6]/5 dark:bg-[#8b5cf6]/5 p-5 rounded-xl hover:shadow transition-all duration-300 flex flex-col justify-between"
                                        >
                                            <div>
                                                <span className="text-2xl mb-2 block">🎓</span>
                                                <h4 className="text-sm font-extrabold text-gray-800 dark:text-white-light leading-tight">
                                                    {cert.course_title || cert.custom_course_title}
                                                </h4>
                                                <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                                                    Verified Key: {cert.verification_code || 'ITL-LMS-2025'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-2">
                                                    Achieved: {new Date(cert.issued_date).toLocaleDateString()}
                                                </div>
                                            </div>
 
                                            <div className="mt-4 pt-3 border-t border-[#8b5cf6]/10">
                                                {cert.certificate_file_url ? (
                                                    <a
                                                        href={cert.certificate_file_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="btn btn-outline-primary btn-xs w-full text-[10px] py-1 font-bold block text-center"
                                                    >
                                                        Download Credential
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic block text-center">Digitally verified on LMS</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Wishlist Tab */}
                    {activeTab === 'wishlist' && (
                        <div>
                            {wishlist.length === 0 ? (
                                <div className="panel text-center py-10 text-gray-500 italic">
                                    Your wishlist is empty.{' '}
                                    <Link to="/employee/learning-management/course-catalog" className="text-primary hover:underline font-bold">
                                        Browse Course Catalog
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {wishlist.map((item) => (
                                        <div
                                            key={item.id}
                                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl p-5 flex flex-col justify-between overflow-hidden bg-white dark:bg-[#0e1726]/40"
                                        >
                                            <div>
                                                <div className="h-32 bg-gray-50 dark:bg-black/10 rounded-lg flex items-center justify-center mb-4 overflow-hidden border border-gray-100 dark:border-gray-800">
                                                    {item.course_image_url ? (
                                                        <img src={item.course_image_url} alt={item.course_title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-3xl">📚</span>
                                                    )}
                                                </div>
                                                <h4 className="text-base font-bold text-gray-800 dark:text-white-light leading-snug line-clamp-1">
                                                    {item.course_title}
                                                </h4>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm flex-1 text-xs py-1.5 font-bold"
                                                    onClick={() => handleEnrollFromWishlist(item.course)}
                                                    disabled={enrollingId === item.course}
                                                >
                                                    Enroll Now
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm text-xs py-1.5 px-3"
                                                    onClick={() => handleRemoveWishlist(item.id)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Learning Paths Tab */}
                    {activeTab === 'paths' && (
                        <div>
                            {learningPaths.length === 0 ? (
                                <div className="panel text-center py-10 text-gray-500 italic">
                                    No learning paths assigned to you.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {learningPaths.map((path: any) => (
                                        <div
                                            key={path.id}
                                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl p-5 bg-white dark:bg-[#0e1726]/40 shadow-sm flex flex-col justify-between"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="text-2xl block mb-1">🗺️</span>
                                                    <h4 className="text-base font-extrabold text-gray-800 dark:text-white-light">
                                                        {path.learning_path_title}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        Assigned by: <strong>{path.assigned_by_name || 'HR Team'}</strong>
                                                    </p>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {new Date(path.assigned_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
                                                Please visit the Course Catalog to enroll in courses assigned to this pathway.
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyLearning;
