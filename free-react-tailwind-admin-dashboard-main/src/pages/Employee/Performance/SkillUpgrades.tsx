import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const CERTIFICATES_API = `${API_BASE_URL}/employee/certificates/`;

type CertificateType = {
    id: number;
    course_title?: string | null;
    certificate_name?: string | null;
    certificate_file_url?: string | null;
    certificate_number?: string;
    issue_date: string;
};

const SkillUpgrades = () => {
    const dispatch = useDispatch();
    const [certificates, setCertificates] = useState<CertificateType[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(6);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        dispatch(setPageTitle('Skill Upgrades'));
        fetchCertificates(page);
    }, [dispatch, page]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchCertificates = async (pageNumber: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                mine: 'true',
                page: pageNumber.toString(),
                limit: limit.toString(),
            });

            const res = await authFetch(`${CERTIFICATES_API}?${params.toString()}`, {
                headers: getHeaders(),
            });

            if (res.ok) {
                const data = await res.json();
                setCertificates(data.results || data || []);
                setTotalCount(data.count || 0);
                setTotalPages(data.total_pages || 1);
            }
        } catch (error) {
            console.error('Error fetching certificates for skills:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Block matching other Performance pages */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black text-gray-800 dark:text-white">Skill Upgrades</h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Your verified skills and qualifications completed through the Learning Management System (LMS).
                        </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <div className="text-center bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 rounded-2xl px-5 py-3">
                            <span className="block text-2xl font-black text-violet-600 dark:text-violet-400">{totalCount}</span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-500 mt-0.5">Verified Skills</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* List/Grid Content */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
                        <span className="text-xs font-bold text-gray-400">Syncing verified skills from LMS...</span>
                    </div>
                </div>
            ) : certificates.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4 text-3xl">
                        🏆
                    </div>
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No completed skill upgrades yet</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1 mb-4">
                        Complete any skill course with an allocated credential in the LMS catalog to upgrade your profile and display it here.
                    </p>
                    <Link to="/employee/learning-management/course-catalog" className="btn btn-primary px-6 py-2.5 rounded-lg text-xs font-bold shadow-md inline-block">
                        Explore Course Catalog
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {certificates.map((cert, idx) => {
                            const colors = [
                                { border: 'border-violet-100 dark:border-violet-900/40', accent: 'bg-violet-500', iconBg: 'bg-violet-100 dark:bg-violet-950/50', iconColor: 'text-violet-600 dark:text-violet-400' },
                                { border: 'border-indigo-100 dark:border-indigo-900/40', accent: 'bg-indigo-500', iconBg: 'bg-indigo-100 dark:bg-indigo-950/50', iconColor: 'text-indigo-600 dark:text-indigo-400' },
                                { border: 'border-blue-100 dark:border-blue-900/40', accent: 'bg-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-950/50', iconColor: 'text-blue-600 dark:text-blue-400' },
                                { border: 'border-teal-100 dark:border-teal-900/40', accent: 'bg-teal-500', iconBg: 'bg-teal-100 dark:bg-teal-950/50', iconColor: 'text-teal-600 dark:text-teal-400' }
                            ];
                            const c = colors[idx % colors.length];

                            return (
                                <div
                                    key={cert.id}
                                    className={`bg-white dark:bg-gray-900 rounded-3xl border ${c.border} shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col justify-between`}
                                >
                                    {/* Accent Bar */}
                                    <div className="h-1.5 w-full" style={{ background: c.accent }} />

                                    <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className={`h-9 w-9 rounded-xl ${c.iconBg} ${c.iconColor} flex items-center justify-center text-lg font-bold`}>
                                                    🎖️
                                                </div>
                                                <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[9px] font-extrabold bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 uppercase tracking-wider">
                                                    Verified
                                                </span>
                                            </div>

                                            <div>
                                                <h4 className="font-extrabold text-sm text-gray-800 dark:text-white leading-snug">
                                                    {cert.course_title || cert.certificate_name}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1 block uppercase tracking-wider">
                                                    Achieved: {new Date(cert.issue_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Monospaced ID Panel */}
                                            <div className="p-2.5 bg-gray-50 dark:bg-black/30 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                                <div>
                                                    <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold block uppercase tracking-wider">
                                                        Certificate Unique ID
                                                    </span>
                                                    <code className="text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300">
                                                        {cert.certificate_number || 'ITL-LMS-2025'}
                                                    </code>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div>
                                                {cert.certificate_file_url ? (
                                                    <a
                                                        href={cert.certificate_file_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs rounded-xl transition-colors"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                        </svg>
                                                        Download Certificate
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 italic block text-center bg-gray-50 dark:bg-black/10 py-2 rounded-lg font-semibold">
                                                        Digitally verified inside LMS
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages >= 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
                            <div className="text-xs text-gray-500">
                                Showing <span className="text-primary font-semibold">{totalCount === 0 ? 0 : ((page - 1) * limit) + 1}</span> to <span className="text-primary font-semibold">{Math.min(page * limit, totalCount)}</span> of <span className="text-primary font-semibold">{totalCount}</span> skills
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
                </div>
            )}
        </div>
    );
};

export default SkillUpgrades;
