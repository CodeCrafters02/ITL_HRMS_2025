import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { NavLink } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';

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
};

const NAV_LINKS = [
    { to: '/employee/learning-management/my-learning', label: 'My Learning' },
    { to: '/employee/learning-management/course-catalog', label: 'Course Catalog' },
    { to: '/employee/learning-management/certifications', label: 'Certifications' },
    { to: '/employee/learning-management/training-requests', label: 'Training Requests' },
    { to: '/employee/learning-management/reviews', label: 'Course Reviews' },
];

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

const last6MonthLabels = () => {
    const labels: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-US', { month: 'short' }) });
    }
    return labels;
};

const EmployeeLearningDashboard = () => {
    const dispatch = useDispatch();
    const [enrollments, setEnrollments] = useState<EnrollmentType[]>([]);
    const [compliances, setCompliances] = useState<ComplianceType[]>([]);
    const [certificates, setCertificates] = useState<CertificateType[]>([]);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [pathsCount, setPathsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => { dispatch(setPageTitle('My Learning Dashboard')); }, [dispatch]);

    useEffect(() => {
        (async () => {
            try {
                const [enrRes, compRes, certRes, wishRes, pathsRes] = await Promise.all([
                    authFetch(ENROLLMENTS_API, { headers: getHeaders() }),
                    authFetch(COMPLIANCE_API, { headers: getHeaders() }),
                    authFetch(`${CERTIFICATES_API}?mine=true`, { headers: getHeaders() }),
                    authFetch(WISHLISTS_API, { headers: getHeaders() }),
                    authFetch(PATHS_API, { headers: getHeaders() }),
                ]);
                if (enrRes.ok) setEnrollments((await enrRes.json()).results || []);
                if (compRes.ok) setCompliances((await compRes.json()).results || []);
                if (certRes.ok) setCertificates((await certRes.json()).results || []);
                if (wishRes.ok) { const d = await wishRes.json(); setWishlistCount((d.results || d || []).length); }
                if (pathsRes.ok) { const d = await pathsRes.json(); setPathsCount((d.results || d || []).length); }
            } catch (e) {
                console.error('Failed to load learning dashboard', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const totalEnrollments = enrollments.length;
    const completedCount = enrollments.filter((e) => e.progress_percentage === 100).length;
    const activeCount = enrollments.filter((e) => e.progress_percentage > 0 && e.progress_percentage < 100).length;
    const notStartedCount = enrollments.filter((e) => e.progress_percentage === 0).length;
    const avgProgress = totalEnrollments ? Math.round(enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / totalEnrollments) : 0;
    const completionRate = totalEnrollments ? Math.round((completedCount / totalEnrollments) * 100) : 0;

    const totalCompliance = compliances.length;
    const completedCompliance = compliances.filter((c) => c.status === 'completed').length;
    const pendingCompliance = compliances.filter((c) => c.status === 'pending').length;
    const overdueCompliance = compliances.filter((c) => c.status === 'overdue').length;
    const complianceRate = totalCompliance ? Math.round((completedCompliance / totalCompliance) * 100) : 0;

    // ── Course progress overview (horizontal bar) ──
    const progressCourses = useMemo(() => [...enrollments].sort((a, b) => b.progress_percentage - a.progress_percentage).slice(0, 8), [enrollments]);
    const progressOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'bar', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        colors: ['#8b5cf6'],
        plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '50%' } },
        dataLabels: { enabled: true, formatter: (v: number) => `${v}%`, style: { fontSize: '10px' } },
        xaxis: { categories: progressCourses.map((c) => c.course_title), max: 100, labels: { style: { fontSize: '10px' } } },
        grid: { borderColor: '#f1f5f9' },
    }), [progressCourses]);
    const progressSeries = useMemo(() => [{ name: 'Progress', data: progressCourses.map((c) => c.progress_percentage) }], [progressCourses]);

    // ── Overall completion gauge (radialBar) ──
    const completionOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'radialBar', fontFamily: 'Inter, sans-serif' },
        colors: ['#8b5cf6'],
        plotOptions: {
            radialBar: {
                hollow: { size: '60%' },
                dataLabels: {
                    value: { fontSize: '22px', fontWeight: 800, formatter: (v: number) => `${v}%` },
                    name: { fontSize: '10px', color: '#9ca3af', offsetY: 24 },
                },
            },
        },
        labels: ['Completed'],
    }), []);

    // ── Courses by difficulty (distributed bar) ──
    const difficultyCounts = useMemo(() => {
        const map: Record<string, number> = {};
        enrollments.forEach((e) => { const k = e.course_difficulty || 'unspecified'; map[k] = (map[k] || 0) + 1; });
        return Object.entries(map).map(([level, count]) => ({ level, count }));
    }, [enrollments]);
    const difficultyOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'bar', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        colors: ['#6366f1', '#8b5cf6', '#ec4899'],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', distributed: true } },
        legend: { show: false },
        dataLabels: { enabled: false },
        xaxis: { categories: difficultyCounts.map((d) => d.level), labels: { style: { fontSize: '10px' } } },
        grid: { borderColor: '#f1f5f9' },
    }), [difficultyCounts]);

    // ── Enrollment status split (pie) ──
    const statusSeries = useMemo(() => [completedCount, activeCount, notStartedCount], [completedCount, activeCount, notStartedCount]);
    const statusOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'pie', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        labels: ['Completed', 'In Progress', 'Not Started'],
        colors: ['#10b981', '#f59e0b', '#94a3b8'],
        legend: { position: 'bottom', fontSize: '10px' },
        dataLabels: { enabled: true, style: { fontSize: '9px' } },
        stroke: { width: 2 },
    }), []);

    // ── Compliance status split (donut) ──
    const complianceSeries = useMemo(() => [completedCompliance, pendingCompliance, overdueCompliance], [completedCompliance, pendingCompliance, overdueCompliance]);
    const complianceSplitOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'donut', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        labels: ['Completed', 'Pending', 'Overdue'],
        colors: ['#10b981', '#f59e0b', '#ef4444'],
        legend: { position: 'bottom', fontSize: '10px' },
        plotOptions: { pie: { donut: { size: '60%' } } },
        stroke: { width: 2 },
        dataLabels: { enabled: false },
    }), []);

    // ── Certificates earned trend (bar, 6 months) ──
    const certTrend = useMemo(() => {
        const buckets = last6MonthLabels();
        const counts = buckets.map(() => 0);
        certificates.forEach((c) => {
            const d = new Date(c.issue_date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const idx = buckets.findIndex((b) => b.key === key);
            if (idx !== -1) counts[idx] += 1;
        });
        return { labels: buckets.map((b) => b.label), counts };
    }, [certificates]);
    const certOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'bar', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        colors: ['#ec4899'],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '40%' } },
        dataLabels: { enabled: false },
        xaxis: { categories: certTrend.labels, labels: { style: { fontSize: '10px' } } },
        grid: { borderColor: '#f1f5f9' },
    }), [certTrend]);
    const certSeries = useMemo(() => [{ name: 'Certificates Earned', data: certTrend.counts }], [certTrend]);

    // ── Upcoming compliance deadlines ──
    const upcomingCompliance = useMemo(() => [...compliances]
        .filter((c) => c.status !== 'completed')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 6), [compliances]);

    const daysUntil = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400 font-semibold">Loading your learning dashboard...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* ── Hero Banner ── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-7 shadow-xl">
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-0.5">Learning Management</p>
                        <h1 className="text-2xl font-extrabold leading-tight">My Learning Overview</h1>
                        <p className="text-white/80 text-xs mt-1">Your enrolled courses, compliance progress, and certifications at a glance.</p>
                    </div>
                    <div className="flex gap-4 shrink-0">
                        <div className="text-center bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
                            <div className="text-2xl font-extrabold">{completionRate}%</div>
                            <div className="text-[10px] font-bold text-white/70 uppercase">Completion Rate</div>
                        </div>
                        <div className="text-center bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
                            <div className="text-2xl font-extrabold">{activeCount}</div>
                            <div className="text-[10px] font-bold text-white/70 uppercase">Active Courses</div>
                        </div>
                    </div>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/20">
                    {NAV_LINKS.map((l) => (
                        <NavLink key={l.to} to={l.to}
                            className="text-[10px] font-bold uppercase tracking-wider bg-white/15 hover:bg-white/25 transition px-3 py-1.5 rounded-full">
                            {l.label}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Enrollments', value: totalEnrollments, sub: `${completedCount} completed`, color: 'violet' },
                    { label: 'Active Courses', value: activeCount, sub: `${notStartedCount} not started`, color: 'indigo' },
                    { label: 'Avg Progress', value: `${avgProgress}%`, sub: 'across all enrollments', color: 'teal' },
                    { label: 'Certificates Earned', value: certificates.length, sub: 'credentials collected', color: 'emerald' },
                    { label: 'Compliance Tasks', value: totalCompliance, sub: `${completedCompliance} completed`, color: 'amber' },
                    { label: 'Compliance Rate', value: `${complianceRate}%`, sub: 'mandatory training', color: 'rose' },
                    { label: 'Overdue Compliance', value: overdueCompliance, sub: 'needs attention', color: 'pink' },
                    { label: 'Wishlist / Paths', value: `${wishlistCount} / ${pathsCount}`, sub: 'saved & assigned', color: 'cyan' },
                ].map((c, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <div className={`text-3xl font-extrabold text-${c.color}-600 dark:text-${c.color}-400 mb-1`}>{c.value}</div>
                        <div className="text-xs font-bold text-gray-800 dark:text-white">{c.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── Progress overview + completion gauge ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Course Progress Overview</h3>
                    {progressCourses.length > 0 ? (
                        <ReactApexChart options={progressOptions} series={progressSeries} type="bar" height={280} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No enrolled courses yet.</div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Overall Completion</h3>
                    <ReactApexChart options={completionOptions} series={[completionRate]} type="radialBar" height={280} />
                </div>
            </div>

            {/* ── Difficulty / Enrollment status / Compliance status ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Courses by Difficulty</h3>
                    {difficultyCounts.length > 0 ? (
                        <ReactApexChart options={difficultyOptions} series={[{ name: 'Courses', data: difficultyCounts.map((d) => d.count) }]} type="bar" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No courses yet.</div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Enrollment Status Split</h3>
                    {totalEnrollments > 0 ? (
                        <ReactApexChart options={statusOptions} series={statusSeries} type="pie" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No enrollments yet.</div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Compliance Status Split</h3>
                    {totalCompliance > 0 ? (
                        <ReactApexChart options={complianceSplitOptions} series={complianceSeries} type="donut" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No compliance assignments yet.</div>
                    )}
                </div>
            </div>

            {/* ── Certificate trend + In-progress + Upcoming deadlines ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Certificates Earned (6 Months)</h3>
                    {certificates.length > 0 ? (
                        <ReactApexChart options={certOptions} series={certSeries} type="bar" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No certificates earned yet.</div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">In-Progress Courses</h3>
                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                        {enrollments.filter((e) => e.progress_percentage < 100).sort((a, b) => b.progress_percentage - a.progress_percentage).map((e) => (
                            <div key={e.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-gray-800 dark:text-white truncate">{e.course_title}</span>
                                    <span className="text-[9px] font-black bg-violet-500/10 text-violet-600 px-2 py-0.5 rounded-full shrink-0 capitalize">{e.course_difficulty}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
                                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" style={{ width: `${e.progress_percentage}%` }} />
                                </div>
                                <div className="text-[9px] text-gray-400 mt-1">{e.progress_percentage}% complete</div>
                            </div>
                        ))}
                        {enrollments.filter((e) => e.progress_percentage < 100).length === 0 && (
                            <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No courses in progress.</div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Upcoming Compliance Deadlines</h3>
                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                        {upcomingCompliance.map((c) => {
                            const remaining = daysUntil(c.due_date);
                            return (
                                <div key={c.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-800 dark:text-white truncate">{c.course_title}</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${c.status === 'overdue' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400">Due {new Date(c.due_date).toLocaleDateString()}</div>
                                    <div className="text-[9px] text-gray-400 mt-1">
                                        {remaining < 0 ? `${Math.abs(remaining)} day(s) overdue` : remaining === 0 ? 'Due today' : `${remaining} day(s) left`}
                                    </div>
                                </div>
                            );
                        })}
                        {upcomingCompliance.length === 0 && (
                            <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No pending compliance deadlines.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeLearningDashboard;
