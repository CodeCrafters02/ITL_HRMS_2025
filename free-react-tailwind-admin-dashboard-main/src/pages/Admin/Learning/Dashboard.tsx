import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { NavLink } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

interface Summary {
    total_courses: number;
    published_courses: number;
    total_enrollments: number;
    completed_enrollments: number;
    completion_rate: number;
    avg_progress: number;
    active_learners: number;
    total_certificates: number;
    valid_certificates: number;
    compliance_completion_rate: number;
    avg_course_rating: number;
    pending_training_requests: number;
}
interface NamedCount { name?: string; level?: string; status?: string; stage?: string; count: number; }
interface MonthTrend { month: string; enrollments: number; completions: number; }
interface CertTrend { month: string; count: number; }
interface TopCourse { id: number; title: string; category: string; enrollments: number; completion_rate: number; avg_rating: number; }
interface DeptCompletion { department: string; enrolled: number; completed: number; completion_rate: number; }
interface UpcomingSession { id: number; title: string; session_type: string; start_datetime: string; registered_count: number; }

interface LMSDashboardData {
    summary: Summary;
    courses_by_category: NamedCount[];
    courses_by_difficulty: NamedCount[];
    enrollment_status_breakdown: NamedCount[];
    monthly_enrollment_trend: MonthTrend[];
    top_courses: TopCourse[];
    department_completion: DeptCompletion[];
    compliance_status: NamedCount[];
    certificate_trend: CertTrend[];
    training_request_funnel: NamedCount[];
    upcoming_sessions: UpcomingSession[];
}

const NAV_LINKS = [
    { to: '/admin/learning-management/course-catalog', label: 'Course Catalog' },
    { to: '/admin/learning-management/compliance-training', label: 'Employee Course Activity' },
    { to: '/admin/learning-management/certifications', label: 'Certifications' },
    { to: '/admin/learning-management/training-requests', label: 'Training Requests' },
    { to: '/admin/learning-management/administration', label: 'Administration' },
];

const CATEGORY_COLORS = ['#8b5cf6', '#14b8a6', '#f59e0b', '#6366f1', '#ec4899', '#10b981', '#06b6d4', '#ef4444'];

const AdminLearningDashboard = () => {
    const dispatch = useDispatch();
    const [data, setData] = useState<LMSDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { dispatch(setPageTitle('Learning Management Dashboard')); }, [dispatch]);

    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get(`${API_BASE}/employee/lms-dashboard/`, { headers: getHeaders() });
                setData(res.data);
            } catch (e) {
                console.error('Failed to load LMS dashboard', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const s = data?.summary;

    // ── Enrollment & Completion Trend (area) ──
    const trendOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'area', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        colors: ['#8b5cf6', '#14b8a6'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 90, 100] } },
        stroke: { curve: 'smooth', width: 3 },
        dataLabels: { enabled: false },
        xaxis: { categories: (data?.monthly_enrollment_trend || []).map(m => m.month), labels: { style: { fontSize: '10px' } } },
        yaxis: { labels: { style: { fontSize: '10px' } } },
        legend: { position: 'top', fontSize: '11px' },
        grid: { borderColor: '#f1f5f9' },
        tooltip: { y: { formatter: (v: number) => `${v}` } },
    }), [data]);

    const trendSeries = useMemo(() => [
        { name: 'Enrollments', data: (data?.monthly_enrollment_trend || []).map(m => m.enrollments) },
        { name: 'Completions', data: (data?.monthly_enrollment_trend || []).map(m => m.completions) },
    ], [data]);

    // ── Compliance completion gauge (radialBar) ──
    const complianceOptions: ApexCharts.ApexOptions = useMemo(() => ({
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
        labels: ['Compliance'],
    }), []);

    // ── Courses by category (donut) ──
    const categoryOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'donut', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        labels: (data?.courses_by_category || []).map(c => c.name || 'Uncategorized'),
        colors: CATEGORY_COLORS,
        legend: { position: 'bottom', fontSize: '10px' },
        plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Courses', fontSize: '11px', color: '#6b7280' } } } } },
        stroke: { width: 2 },
        dataLabels: { enabled: false },
    }), [data]);

    // ── Courses by difficulty (bar) ──
    const difficultyOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'bar', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        colors: ['#6366f1', '#8b5cf6', '#ec4899'],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', distributed: true } },
        legend: { show: false },
        dataLabels: { enabled: false },
        xaxis: { categories: (data?.courses_by_difficulty || []).map(d => d.level), labels: { style: { fontSize: '10px' } } },
        grid: { borderColor: '#f1f5f9' },
    }), [data]);

    // ── Enrollment status breakdown (pie) ──
    const statusOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'pie', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        labels: (data?.enrollment_status_breakdown || []).map(e => e.status || ''),
        colors: ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#94a3b8'],
        legend: { position: 'bottom', fontSize: '10px' },
        dataLabels: { enabled: true, style: { fontSize: '9px' } },
        stroke: { width: 2 },
    }), [data]);

    // ── Department-wise completion (horizontal bar) ──
    const deptOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'bar', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        colors: ['#14b8a6'],
        plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '50%' } },
        dataLabels: { enabled: true, formatter: (v: number) => `${v}%`, style: { fontSize: '10px' } },
        xaxis: { categories: (data?.department_completion || []).map(d => d.department), max: 100, labels: { style: { fontSize: '10px' } } },
        grid: { borderColor: '#f1f5f9' },
        tooltip: { y: { formatter: (v: number) => `${v}% completion rate` } },
    }), [data]);

    const deptSeries = useMemo(() => [
        { name: 'Completion Rate', data: (data?.department_completion || []).map(d => d.completion_rate) },
    ], [data]);

    // ── Compliance status split (donut) ──
    const complianceSplitOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'donut', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        labels: (data?.compliance_status || []).map(c => c.status || ''),
        colors: ['#10b981', '#ef4444', '#f59e0b'],
        legend: { position: 'bottom', fontSize: '10px' },
        plotOptions: { pie: { donut: { size: '60%' } } },
        stroke: { width: 2 },
        dataLabels: { enabled: false },
    }), [data]);

    // ── Certificate issuance trend (bar) ──
    const certOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'bar', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        colors: ['#ec4899'],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '40%' } },
        dataLabels: { enabled: false },
        xaxis: { categories: (data?.certificate_trend || []).map(c => c.month), labels: { style: { fontSize: '10px' } } },
        grid: { borderColor: '#f1f5f9' },
    }), [data]);

    const certSeries = useMemo(() => [{ name: 'Certificates Issued', data: (data?.certificate_trend || []).map(c => c.count) }], [data]);

    // ── Training request funnel (horizontal bar, descending) ──
    const funnelOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'bar', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        colors: ['#8b5cf6', '#6366f1', '#14b8a6', '#ef4444'],
        plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '55%', distributed: true } },
        legend: { show: false },
        dataLabels: { enabled: true, style: { fontSize: '10px' } },
        xaxis: { categories: (data?.training_request_funnel || []).map(f => f.stage), labels: { style: { fontSize: '10px' } } },
        grid: { borderColor: '#f1f5f9' },
    }), [data]);

    const funnelSeries = useMemo(() => [{ name: 'Requests', data: (data?.training_request_funnel || []).map(f => f.count) }], [data]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400 font-semibold">Loading learning management data...</span>
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
                        <h1 className="text-2xl font-extrabold leading-tight">Organization Learning Overview</h1>
                        <p className="text-white/80 text-xs mt-1">Courses, enrollments, compliance, and certification activity across the company.</p>
                    </div>
                    <div className="flex gap-4 shrink-0">
                        <div className="text-center bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
                            <div className="text-2xl font-extrabold">{s?.completion_rate ?? 0}%</div>
                            <div className="text-[10px] font-bold text-white/70 uppercase">Completion Rate</div>
                        </div>
                        <div className="text-center bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
                            <div className="text-2xl font-extrabold">{s?.active_learners ?? 0}</div>
                            <div className="text-[10px] font-bold text-white/70 uppercase">Active Learners</div>
                        </div>
                    </div>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/20">
                    {NAV_LINKS.map(l => (
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
                    { label: 'Total Courses', value: s?.total_courses ?? 0, sub: `${s?.published_courses ?? 0} published`, color: 'violet' },
                    { label: 'Total Enrollments', value: s?.total_enrollments ?? 0, sub: `${s?.completed_enrollments ?? 0} completed`, color: 'indigo' },
                    { label: 'Certificates Issued', value: s?.total_certificates ?? 0, sub: `${s?.valid_certificates ?? 0} currently valid`, color: 'emerald' },
                    { label: 'Avg Course Rating', value: s?.avg_course_rating ?? 0, sub: `out of 5.00`, color: 'amber' },
                    { label: 'Avg Progress', value: `${s?.avg_progress ?? 0}%`, sub: 'across active enrollments', color: 'teal' },
                    { label: 'Compliance Rate', value: `${s?.compliance_completion_rate ?? 0}%`, sub: 'mandatory training', color: 'rose' },
                    { label: 'Pending Requests', value: s?.pending_training_requests ?? 0, sub: 'awaiting approval', color: 'pink' },
                    { label: 'Published Courses', value: s?.published_courses ?? 0, sub: `of ${s?.total_courses ?? 0} total`, color: 'cyan' },
                ].map((c, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <div className={`text-3xl font-extrabold text-${c.color}-600 dark:text-${c.color}-400 mb-1`}>{c.value}</div>
                        <div className="text-xs font-bold text-gray-800 dark:text-white">{c.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── Trend + Compliance Gauge ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Enrollment &amp; Completion Trend (6 Months)</h3>
                    {(data?.monthly_enrollment_trend?.length ?? 0) > 0 ? (
                        <ReactApexChart options={trendOptions} series={trendSeries} type="area" height={280} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No enrollment data yet.</div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Compliance Completion</h3>
                    <ReactApexChart options={complianceOptions} series={[s?.compliance_completion_rate ?? 0]} type="radialBar" height={280} />
                </div>
            </div>

            {/* ── Category / Difficulty / Status ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Courses by Category</h3>
                    {(data?.courses_by_category?.length ?? 0) > 0 ? (
                        <ReactApexChart options={categoryOptions} series={(data?.courses_by_category || []).map(c => c.count)} type="donut" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No courses yet.</div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Courses by Difficulty</h3>
                    {(data?.courses_by_difficulty?.length ?? 0) > 0 ? (
                        <ReactApexChart options={difficultyOptions} series={[{ name: 'Courses', data: (data?.courses_by_difficulty || []).map(d => d.count) }]} type="bar" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No courses yet.</div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Enrollment Status Split</h3>
                    {(data?.enrollment_status_breakdown?.length ?? 0) > 0 ? (
                        <ReactApexChart options={statusOptions} series={(data?.enrollment_status_breakdown || []).map(e => e.count)} type="pie" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No enrollments yet.</div>
                    )}
                </div>
            </div>

            {/* ── Department completion / Certificates / Funnel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Department-wise Completion</h3>
                    {(data?.department_completion?.length ?? 0) > 0 ? (
                        <ReactApexChart options={deptOptions} series={deptSeries} type="bar" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No department data yet.</div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Compliance Status Split</h3>
                    {(data?.compliance_status?.length ?? 0) > 0 ? (
                        <ReactApexChart options={complianceSplitOptions} series={(data?.compliance_status || []).map(c => c.count)} type="donut" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No compliance assignments yet.</div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Certificates Issued (6 Months)</h3>
                    {(data?.certificate_trend?.length ?? 0) > 0 ? (
                        <ReactApexChart options={certOptions} series={certSeries} type="bar" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No certificates issued yet.</div>
                    )}
                </div>
            </div>

            {/* ── Funnel + Top Courses + Upcoming Sessions ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Training Request Funnel</h3>
                    {(data?.training_request_funnel?.length ?? 0) > 0 ? (
                        <ReactApexChart options={funnelOptions} series={funnelSeries} type="bar" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No training requests yet.</div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Top Courses by Enrollment</h3>
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {(data?.top_courses || []).map(c => (
                            <div key={c.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-gray-800 dark:text-white truncate">{c.title}</span>
                                    <span className="text-[9px] font-black bg-violet-500/10 text-violet-600 px-2 py-0.5 rounded-full shrink-0">{c.category}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                    <span>{c.enrollments} enrolled</span>
                                    <span>★ {c.avg_rating.toFixed(1)}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
                                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" style={{ width: `${c.completion_rate}%` }} />
                                </div>
                                <div className="text-[9px] text-gray-400 mt-1">{c.completion_rate}% completion rate</div>
                            </div>
                        ))}
                        {(data?.top_courses?.length ?? 0) === 0 && (
                            <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No enrolled courses yet.</div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Upcoming Training Sessions</h3>
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {(data?.upcoming_sessions || []).map(sess => (
                            <div key={sess.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-gray-800 dark:text-white truncate">{sess.title}</span>
                                    <span className="text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded-full shrink-0">{sess.session_type}</span>
                                </div>
                                <div className="text-[10px] text-gray-400">
                                    {new Date(sess.start_datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-[9px] text-gray-400 mt-1">{sess.registered_count} registered</div>
                            </div>
                        ))}
                        {(data?.upcoming_sessions?.length ?? 0) === 0 && (
                            <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No upcoming sessions scheduled.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLearningDashboard;
