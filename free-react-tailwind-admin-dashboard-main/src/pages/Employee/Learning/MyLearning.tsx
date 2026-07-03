import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
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
    certificate_name?: string | null;
    issue_date: string;
    certificate_file_url?: string | null;
    certificate_number?: string;
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
                authFetch(ENROLLMENTS_API, { headers: getHeaders() }),
                authFetch(COMPLIANCE_API, { headers: getHeaders() }),
                authFetch(CERTIFICATES_API, { headers: getHeaders() }),
                authFetch(WISHLISTS_API, { headers: getHeaders() }),
                authFetch(PATHS_API, { headers: getHeaders() }),
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
            const response = await authFetch(ENROLLMENTS_API, {
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
                    await authFetch(`${WISHLISTS_API}${existingWish.id}/`, {
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
            const response = await authFetch(`${WISHLISTS_API}${wishId}/`, {
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

    // The in-progress course closest to finishing, surfaced as a "continue learning" spotlight
    const continueLearning = enrollments
        .filter((e) => e.progress_percentage > 0 && e.progress_percentage < 100)
        .sort((a, b) => b.progress_percentage - a.progress_percentage)[0];

    const difficultyBadgeClass = (level?: string) => {
        if (level === 'advanced') return 'bg-danger text-white';
        if (level === 'intermediate') return 'bg-amber-500 text-white';
        return 'bg-success text-white';
    };

    const daysUntil = (dateStr: string) => {
        const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] via-[#4338ca] to-[#8b5cf6] p-6 sm:p-8 rounded-2xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                        <span>🎓</span> My Learning Space
                    </h1>
                    <p className="text-white/80 mt-1.5 text-sm font-medium max-w-xl">
                        Resume your curriculum, stay ahead of compliance deadlines, and collect the credentials you've earned along the way.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-10 -mb-10 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Quick stats banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                {[
                    {
                        label: 'Active Enrollments', value: activeCount, suffix: activeCount === 1 ? 'Course' : 'Courses',
                        icon: <IconMenuCalendar className="w-6 h-6" />,
                        bar: 'bg-primary', text: 'text-primary', iconWrap: 'bg-primary/10 text-primary',
                    },
                    {
                        label: 'Completed Courses', value: completedCount, suffix: completedCount === 1 ? 'Module' : 'Modules',
                        icon: <IconMenuDocumentation className="w-6 h-6" />,
                        bar: 'bg-success', text: 'text-success', iconWrap: 'bg-success/10 text-success',
                    },
                    {
                        label: 'Compliance Tasks', value: pendingCompliance, suffix: 'Pending',
                        icon: <IconMenuInvoice className="w-6 h-6" />,
                        bar: 'bg-danger', text: 'text-danger', iconWrap: 'bg-danger/10 text-danger',
                    },
                    {
                        label: 'Course Wishlist', value: wishlist.length, suffix: 'Starred',
                        icon: <IconOpenBook className="w-6 h-6" />,
                        bar: 'bg-amber-500', text: 'text-amber-500', iconWrap: 'bg-amber-500/10 text-amber-500',
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="group relative overflow-hidden border border-[#e0e6ed] dark:border-[#1b2e4b] p-5 rounded-xl bg-white dark:bg-[#0e1726]/40 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <div className={`absolute top-0 left-0 w-full h-1 ${stat.bar}`}></div>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider block">{stat.label}</span>
                                <span className={`text-2xl font-extrabold ${stat.text} block mt-1`}>
                                    {stat.value} <span className="text-sm font-semibold text-gray-400">{stat.suffix}</span>
                                </span>
                            </div>
                            <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform duration-300 ${stat.iconWrap}`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Continue Learning spotlight */}
            {!loading && continueLearning && (
                <div className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl mb-6 overflow-hidden bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-stretch">
                        <div className="w-full sm:w-56 h-32 sm:h-auto bg-gradient-to-br from-[#8b5cf6]/25 to-[#0e1726]/10 flex items-center justify-center shrink-0">
                            {continueLearning.course_image_url ? (
                                <img src={continueLearning.course_image_url} alt={continueLearning.course_title} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl">📖</span>
                            )}
                        </div>
                        <div className="flex-1 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Continue Learning</span>
                                <h3 className="text-lg font-extrabold text-gray-800 dark:text-white-light truncate">{continueLearning.course_title}</h3>
                                <div className="flex items-center gap-2 mt-2 max-w-xs">
                                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                        <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${continueLearning.progress_percentage}%` }}></div>
                                    </div>
                                    <span className="text-xs font-bold text-primary shrink-0">{continueLearning.progress_percentage}%</span>
                                </div>
                            </div>
                            <Link
                                to={`/employee/learning-management/course-player/${continueLearning.id}`}
                                className="btn btn-primary rounded-lg font-bold text-sm px-6 py-2 shrink-0 shadow-md hover:shadow-lg transition-shadow"
                            >
                                Resume →
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab links */}
            <div className="flex border-b border-[#ebedf2] dark:border-[#1b2e4b] mb-6 overflow-x-auto">
                {[
                    { key: 'courses' as const, label: 'My Enrolled Courses', icon: '📚', count: enrollments.length },
                    { key: 'compliance' as const, label: 'Compliance Assignments', icon: '⚠️', count: pendingCompliance },
                    { key: 'certificates' as const, label: 'Certificates Archive', icon: '🎓', count: certificates.length },
                    { key: 'wishlist' as const, label: 'My Wishlist', icon: '⭐', count: wishlist.length },
                    { key: 'paths' as const, label: 'Learning Paths', icon: '🗺️', count: learningPaths.length },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`py-3 px-5 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
                            activeTab === tab.key
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-primary'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                            activeTab === tab.key ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content rendering */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl overflow-hidden p-0 animate-pulse">
                            <div className="h-36 bg-gray-100 dark:bg-gray-800"></div>
                            <div className="p-5 space-y-3">
                                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full"></div>
                                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6"></div>
                                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full w-full mt-4"></div>
                                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg w-full"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="animate-fade-in">
                    {/* Courses Tab */}
                    {activeTab === 'courses' && (
                        <div>
                            {enrollments.length === 0 ? (
                                <div className="panel text-center py-14 text-gray-500 border border-dashed border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl">
                                    <span className="text-4xl block mb-3">📚</span>
                                    <p className="font-semibold mb-3">You have not enrolled in any courses yet.</p>
                                    <Link to="/employee/learning-management/course-catalog" className="btn btn-primary rounded-lg text-xs px-5 py-2 font-bold">
                                        Browse Course Catalog
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {enrollments.map((enr) => {
                                        const isComplete = enr.progress_percentage === 100;
                                        return (
                                            <div
                                                key={enr.id}
                                                className="group panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden p-0 bg-white dark:bg-[#0e1726]/40"
                                            >
                                                <div className="h-36 bg-gradient-to-br from-[#8b5cf6]/20 to-[#0e1726]/10 relative flex items-center justify-center border-b border-gray-150 dark:border-gray-800 overflow-hidden">
                                                    {enr.course_image_url ? (
                                                        <img
                                                            src={enr.course_image_url}
                                                            alt={enr.course_title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <span className="text-4xl">📚</span>
                                                    )}
                                                    <span className={`absolute top-3 left-3 text-[9px] uppercase font-bold px-2 py-0.5 rounded shadow ${difficultyBadgeClass(enr.course_difficulty)}`}>
                                                        {enr.course_difficulty}
                                                    </span>
                                                    {isComplete && (
                                                        <span className="absolute top-3 right-3 bg-success text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                                                            ✓ Completed
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="p-5 flex flex-col justify-between flex-grow">
                                                    <div>
                                                        <h3 className="text-base font-bold text-gray-800 dark:text-white-light line-clamp-1 mb-1">
                                                            {enr.course_title}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2">
                                                            {enr.course_description || 'Resume your course lectures and tests.'}
                                                        </p>
                                                        {enr.course_estimated_hours > 0 && (
                                                            <span className="text-[10px] text-gray-400 font-semibold">⏱ {enr.course_estimated_hours} hrs</span>
                                                        )}
                                                    </div>

                                                    <div className="border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 mt-4">
                                                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 font-bold">
                                                            <span>Course Syllabus Progress</span>
                                                            <span>{enr.progress_percentage}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-4">
                                                            <div
                                                                className={`h-1.5 rounded-full transition-all duration-500 ${isComplete ? 'bg-success' : 'bg-primary'}`}
                                                                style={{ width: `${enr.progress_percentage}%` }}
                                                            ></div>
                                                        </div>

                                                        <Link
                                                            to={`/employee/learning-management/course-player/${enr.id}`}
                                                            className={`btn btn-sm w-full rounded-lg text-xs py-1.5 font-bold ${
                                                                isComplete ? 'btn-success' : 'btn-primary'
                                                            }`}
                                                        >
                                                            {isComplete ? 'Review Syllabus' : 'Resume Learning'}
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Compliance Tab */}
                    {activeTab === 'compliance' && (
                        <div>
                            {compliances.length === 0 ? (
                                <div className="panel text-center py-14 text-gray-500 border border-dashed border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl">
                                    <span className="text-4xl block mb-3">✅</span>
                                    <p className="font-semibold">No compliance assignments mapped to your account.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {compliances.map((c) => {
                                        const remaining = daysUntil(c.due_date);
                                        return (
                                            <div
                                                key={c.id}
                                                className={`panel flex items-center justify-between gap-4 border rounded-xl p-4 bg-white dark:bg-[#0e1726]/40 shadow-sm ${
                                                    c.status === 'overdue' ? 'border-danger/40' : 'border-[#e0e6ed] dark:border-[#1b2e4b]'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-2xl shrink-0">
                                                        {c.status === 'completed' ? '✅' : c.status === 'overdue' ? '🚨' : '⏳'}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-gray-800 dark:text-gray-200 truncate">{c.course_title}</div>
                                                        <div className="text-[11px] text-gray-400 mt-0.5">
                                                            Due {new Date(c.due_date).toLocaleDateString()}
                                                            {c.status !== 'completed' && (
                                                                <span className={remaining < 0 ? 'text-danger font-bold' : remaining <= 3 ? 'text-amber-500 font-bold' : ''}>
                                                                    {' '}• {remaining < 0 ? `${Math.abs(remaining)} day(s) overdue` : remaining === 0 ? 'Due today' : `${remaining} day(s) left`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`badge text-[9px] uppercase font-bold px-2.5 py-1 rounded-full shrink-0 ${
                                                    c.status === 'completed'
                                                        ? 'bg-success text-white'
                                                        : c.status === 'overdue'
                                                        ? 'bg-danger text-white animate-pulse'
                                                        : 'bg-amber-500 text-white'
                                                }`}>
                                                    {c.status}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Certificates Tab */}
                    {activeTab === 'certificates' && (
                        <div>
                            {certificates.length === 0 ? (
                                <div className="panel text-center py-14 text-gray-500 border border-dashed border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl">
                                    <span className="text-4xl block mb-3">🎓</span>
                                    <p className="font-semibold">You have not achieved any course credentials yet. Keep studying!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {certificates.map((cert) => (
                                        <div
                                            key={cert.id}
                                            className="group relative panel border border-dashed border-[#8b5cf6]/50 bg-gradient-to-br from-[#8b5cf6]/10 to-transparent dark:from-[#8b5cf6]/10 p-5 rounded-xl hover:shadow-lg hover:border-[#8b5cf6] transition-all duration-300 flex flex-col justify-between overflow-hidden"
                                        >
                                            <div className="absolute -right-4 -top-4 text-7xl opacity-5 group-hover:opacity-10 transition-opacity">🎓</div>
                                            <div className="relative">
                                                <span className="text-2xl mb-2 block">🎓</span>
                                                <h4 className="text-sm font-extrabold text-gray-800 dark:text-white-light leading-tight">
                                                    {cert.course_title || cert.certificate_name}
                                                </h4>
                                                <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                                                    Certificate No: {cert.certificate_number || 'ITL-LMS-2025'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-2">
                                                    Achieved: {new Date(cert.issue_date).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="relative mt-4 pt-3 border-t border-[#8b5cf6]/10">
                                                {cert.certificate_file_url ? (
                                                    <a
                                                        href={cert.certificate_file_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="btn btn-primary btn-sm w-full text-[11px] py-1.5 font-bold block text-center rounded-lg"
                                                    >
                                                        ⬇ Download Credential
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
                                <div className="panel text-center py-14 text-gray-500 border border-dashed border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl">
                                    <span className="text-4xl block mb-3">⭐</span>
                                    <p className="font-semibold mb-3">Your wishlist is empty.</p>
                                    <Link to="/employee/learning-management/course-catalog" className="btn btn-primary rounded-lg text-xs px-5 py-2 font-bold">
                                        Browse Course Catalog
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {wishlist.map((item) => (
                                        <div
                                            key={item.id}
                                            className="group panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl p-5 flex flex-col justify-between overflow-hidden bg-white dark:bg-[#0e1726]/40 hover:shadow-lg transition-all duration-300"
                                        >
                                            <div>
                                                <div className="h-32 bg-gray-50 dark:bg-black/10 rounded-lg flex items-center justify-center mb-4 overflow-hidden border border-gray-100 dark:border-gray-800">
                                                    {item.course_image_url ? (
                                                        <img src={item.course_image_url} alt={item.course_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <span className="text-3xl">📚</span>
                                                    )}
                                                </div>
                                                <h4 className="text-base font-bold text-gray-800 dark:text-white-light leading-snug line-clamp-1">
                                                    ⭐ {item.course_title}
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
                                <div className="panel text-center py-14 text-gray-500 border border-dashed border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl">
                                    <span className="text-4xl block mb-3">🗺️</span>
                                    <p className="font-semibold">No learning paths assigned to you.</p>
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
