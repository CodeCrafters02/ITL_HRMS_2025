import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import ReactApexChart from 'react-apexcharts';
import axios from 'axios';
import { NavLink } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

interface KRA { id: number; kra_name: string; weightage: number; target_description: string; created_at: string | null; }
interface Skill { id: number; skill_name: string; proficiency_level: string; approval_status: string; }
interface Evaluation { id: number; cycle_name: string; cycle_start: string | null; cycle_end: string | null; self_rating: number | null; manager_rating: number | null; final_rating: number | null; status: string; }
interface Feedback { id: number; feedback_type: string; feedback_text: string; rating: number | null; given_by_name: string; created_at: string; }
interface NineBox { performance_score: number; potential_score: number; performance_label: string; potential_label: string; box_title: string; }

interface PerfData {
    kras: KRA[];
    skills: Skill[];
    evaluations: Evaluation[];
    feedbacks: Feedback[];
    nine_box: NineBox;
    date_range: { start: string | null; end: string | null };
}

const PROF_COLOR: Record<string, string> = {
    beginner: 'bg-amber-500',
    intermediate: 'bg-teal-500',
    expert: 'bg-indigo-500',
};
const PROF_SCORE: Record<string, number> = { beginner: 40, intermediate: 70, expert: 100 };

const BOX_COLOR: Record<string, string> = {
    'Star Performer': 'from-violet-500 to-indigo-600',
    'High Performer': 'from-teal-500 to-emerald-600',
    'High Potential': 'from-cyan-500 to-teal-600',
    'Solid Performer': 'from-emerald-500 to-green-600',
    'Core Player': 'from-blue-500 to-indigo-500',
    'Average Performer': 'from-amber-400 to-orange-500',
    'Potential Gem': 'from-purple-500 to-violet-600',
    'Inconsistent Player': 'from-orange-400 to-amber-500',
    'Risk': 'from-rose-500 to-red-600',
};

const FEEDBACK_BADGE: Record<string, string> = {
    'Peer Recognition': 'bg-violet-500/10 text-violet-600',
    'Appreciation': 'bg-emerald-500/10 text-emerald-600',
    'Manager Coaching': 'bg-blue-500/10 text-blue-600',
    'Constructive': 'bg-amber-500/10 text-amber-600',
    'Goal Progress': 'bg-teal-500/10 text-teal-600',
};

const NAV_LINKS = [
    { to: '/employee/performance/kras', label: 'My KRAs' },
    { to: '/employee/performance/self-map-kras', label: 'Self Map KRAs' },
    { to: '/employee/performance/skills-inventory', label: 'Skills' },
    { to: '/employee/performance/feedback-received', label: 'Feedback' },
    { to: '/employee/performance/manager-direct-feedback', label: 'Give Feedback' },
    { to: '/employee/performance/appraisal-history', label: 'History' },
];

const PerformanceDashboard = () => {
    const dispatch = useDispatch();
    const [data, setData] = useState<PerfData | null>(null);
    const [loading, setLoading] = useState(true);
    const [filtering, setFiltering] = useState(false);
    const [empName, setEmpName] = useState('');
    const [empId, setEmpId] = useState<number | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [appliedStart, setAppliedStart] = useState('');
    const [appliedEnd, setAppliedEnd] = useState('');

    useEffect(() => { dispatch(setPageTitle('My Performance Dashboard')); }, [dispatch]);

    const fetchData = async (id: number, start = '', end = '') => {
        const params = new URLSearchParams();
        if (start) params.set('start_date', start);
        if (end)   params.set('end_date', end);
        const url = `${API_BASE}/employee/performance-profile/${id}/${params.toString() ? '?' + params.toString() : ''}`;
        const res = await axios.get(url, { headers: getHeaders() });
        setData(res.data);
    };

    useEffect(() => {
        (async () => {
            try {
                const idRes = await axios.get(`${API_BASE}/employee/employee-id/`, { headers: getHeaders() });
                const id = idRes.data?.id;
                setEmpId(id);
                setEmpName(idRes.data?.full_name || '');
                if (!id) return;
                await fetchData(id);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleApplyFilter = async () => {
        if (!empId) return;
        setFiltering(true);
        try {
            await fetchData(empId, startDate, endDate);
            setAppliedStart(startDate);
            setAppliedEnd(endDate);
        } finally {
            setFiltering(false);
        }
    };

    const handleClearFilter = async () => {
        setStartDate('');
        setEndDate('');
        setAppliedStart('');
        setAppliedEnd('');
        if (!empId) return;
        setFiltering(true);
        try {
            await fetchData(empId);
        } finally {
            setFiltering(false);
        }
    };

    const isFiltered = !!(appliedStart || appliedEnd);

    const totalWeight = useMemo(() => (data?.kras || []).reduce((s, k) => s + k.weightage, 0), [data]);
    const avgRating = useMemo(() => {
        const rated = (data?.evaluations || []).filter(e => e.final_rating !== null);
        if (!rated.length) return null;
        return (rated.reduce((s, e) => s + (e.final_rating ?? 0), 0) / rated.length).toFixed(1);
    }, [data]);

    // Donut chart — KRA weightage distribution
    const donutOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'donut', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        labels: (data?.kras || []).map(k => k.kra_name || 'KRA'),
        colors: ['#14b8a6', '#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'],
        legend: { position: 'bottom', fontSize: '11px' },
        plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total Weight', fontSize: '11px', color: '#6b7280', formatter: () => `${totalWeight}%` } } } } },
        stroke: { width: 2 },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: (v: number) => `${v}%` } },
    }), [data, totalWeight]);

    // Bar chart — Appraisal ratings per cycle
    const barOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'bar', fontFamily: 'Inter, sans-serif', toolbar: { show: false }, stacked: false },
        colors: ['#14b8a6', '#6366f1', '#f59e0b'],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: { categories: (data?.evaluations || []).map(e => e.cycle_name), labels: { style: { fontSize: '10px' } } },
        yaxis: { max: 5, labels: { formatter: (v: number) => v.toFixed(1), style: { fontSize: '10px' } } },
        legend: { position: 'top', fontSize: '11px' },
        tooltip: { y: { formatter: (v: number) => v?.toFixed(2) ?? '-' } },
        grid: { borderColor: '#f1f5f9' },
    }), [data]);

    const barSeries = useMemo(() => [
        { name: 'Self Rating', data: (data?.evaluations || []).map(e => e.self_rating ?? 0) },
        { name: 'Manager Rating', data: (data?.evaluations || []).map(e => e.manager_rating ?? 0) },
        { name: 'Final Rating', data: (data?.evaluations || []).map(e => e.final_rating ?? 0) },
    ], [data]);

    // Radar chart — Skills
    const radarOptions: ApexCharts.ApexOptions = useMemo(() => ({
        chart: { type: 'radar', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        colors: ['#14b8a6'],
        fill: { opacity: 0.15 },
        stroke: { width: 2 },
        markers: { size: 4 },
        xaxis: { categories: (data?.skills || []).slice(0, 8).map(s => s.skill_name) },
        yaxis: { show: false, max: 100 },
        plotOptions: { radar: { polygons: { strokeColors: '#e2e8f0', connectorColors: '#e2e8f0' } } },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: (v: number) => `${v}%` } },
    }), [data]);

    const radarSeries = useMemo(() => [{
        name: 'Proficiency',
        data: (data?.skills || []).slice(0, 8).map(s => PROF_SCORE[s.proficiency_level?.toLowerCase()] ?? 40),
    }], [data]);

    const box = data?.nine_box;
    const gradient = BOX_COLOR[box?.box_title ?? ''] || 'from-teal-500 to-emerald-600';
    const initials = empName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400 font-semibold">Loading your performance data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">

            {/* ── Hero Banner ── */}
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${gradient} text-white p-7 shadow-xl`}>
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-extrabold shadow-lg shrink-0">
                            {initials || '?'}
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-0.5">My Performance</p>
                            <h1 className="text-2xl font-extrabold leading-tight">{empName || 'Employee'}</h1>
                            {box && (
                                <span className="inline-block mt-1.5 text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur px-3 py-0.5 rounded-full">
                                    {box.box_title}
                                </span>
                            )}
                        </div>
                    </div>
                    {box && (
                        <div className="flex gap-4 shrink-0">
                            <div className="text-center bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
                                <div className="text-2xl font-extrabold">{box.performance_score.toFixed(1)}</div>
                                <div className="text-[10px] font-bold text-white/70 uppercase">Perf Score</div>
                                <div className="text-[9px] font-black text-white/90 uppercase mt-0.5">{box.performance_label}</div>
                            </div>
                            <div className="text-center bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
                                <div className="text-2xl font-extrabold">{box.potential_score.toFixed(1)}</div>
                                <div className="text-[10px] font-bold text-white/70 uppercase">Potential</div>
                                <div className="text-[9px] font-black text-white/90 uppercase mt-0.5">{box.potential_label}</div>
                            </div>
                        </div>
                    )}
                </div>
                {/* Quick Nav */}
                <div className="relative z-10 flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/20">
                    {NAV_LINKS.map(l => (
                        <NavLink key={l.to} to={l.to}
                            className="text-[10px] font-bold uppercase tracking-wider bg-white/15 hover:bg-white/25 transition px-3 py-1.5 rounded-full">
                            {l.label}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* ── Date Range Filter ── */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex items-center gap-2 shrink-0">
                    <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-black text-gray-700 dark:text-white uppercase tracking-wider">Date Range</span>
                    {isFiltered && (
                        <span className="text-[9px] font-black bg-teal-500 text-white px-2 py-0.5 rounded-full animate-pulse">Active</span>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <div className="flex flex-col gap-1 flex-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">From</label>
                        <input
                            type="date"
                            value={startDate}
                            max={endDate || undefined}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">To</label>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        />
                    </div>
                </div>

                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={handleApplyFilter}
                        disabled={filtering || (!startDate && !endDate)}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/10 transition disabled:cursor-not-allowed"
                    >
                        {filtering ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Applying...
                            </span>
                        ) : 'Apply'}
                    </button>
                    {isFiltered && (
                        <button
                            onClick={handleClearFilter}
                            disabled={filtering}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {isFiltered && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded-xl shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        {appliedStart && appliedEnd
                            ? `${appliedStart} → ${appliedEnd}`
                            : appliedStart
                            ? `From ${appliedStart}`
                            : `Until ${appliedEnd}`}
                    </div>
                )}
            </div>

            {/* ── Stat Cards ── */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${filtering ? 'opacity-50 pointer-events-none' : ''}`}>
                {[
                    { label: 'KRAs Assigned', value: data?.kras.length ?? 0, sub: `${totalWeight}% total weight`, color: 'teal' },
                    { label: 'Avg Rating', value: avgRating ?? '—', sub: `across ${data?.evaluations.length ?? 0} appraisals`, color: 'indigo' },
                    { label: 'Skills Listed', value: data?.skills.length ?? 0, sub: `${data?.skills.filter(s => s.proficiency_level === 'expert').length ?? 0} expert level`, color: 'violet' },
                    { label: 'Feedback Received', value: data?.feedbacks.length ?? 0, sub: `last: ${data?.feedbacks[0]?.created_at?.slice(0, 10) ?? '—'}`, color: 'emerald' },
                ].map((c, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <div className={`text-3xl font-extrabold text-${c.color}-600 dark:text-${c.color}-400 mb-1`}>{c.value}</div>
                        <div className="text-xs font-bold text-gray-800 dark:text-white">{c.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── Charts Row ── */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-opacity ${filtering ? 'opacity-50 pointer-events-none' : ''}`}>

                {/* KRA Donut */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">KRA Weight Distribution</h3>
                    {(data?.kras.length ?? 0) > 0 ? (
                        <ReactApexChart
                            options={donutOptions}
                            series={(data?.kras || []).map(k => k.weightage || 0)}
                            type="donut"
                            height={260}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No KRAs assigned yet.</div>
                    )}
                </div>

                {/* Appraisal Bar */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Appraisal Ratings by Cycle</h3>
                    {(data?.evaluations.length ?? 0) > 0 ? (
                        <ReactApexChart options={barOptions} series={barSeries} type="bar" height={260} />
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No appraisal cycles completed yet.</div>
                    )}
                </div>
            </div>

            {/* ── Skills + 9-box ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Skills Radar */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Skills Proficiency Radar</h3>
                    {(data?.skills.length ?? 0) > 0 ? (
                        <>
                            <ReactApexChart options={radarOptions} series={radarSeries} type="radar" height={260} />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {data?.skills.map(s => (
                                    <span key={s.id} className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white ${PROF_COLOR[s.proficiency_level?.toLowerCase()] ?? 'bg-gray-400'}`}>
                                        {s.skill_name} · {s.proficiency_level}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-52 text-xs text-gray-400 italic">No skills added yet.</div>
                    )}
                </div>

                {/* 9-Box Position */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">9-Box Position</h3>
                    {box ? (
                        <>
                            {/* Mini 9-box grid */}
                            {(() => {
                                const rows = ['high', 'medium', 'low'];
                                const cols = ['low', 'medium', 'high'];
                                const labels: Record<string, string> = {
                                    'high-low': 'Solid', 'high-medium': 'High\nPerformer', 'high-high': '⭐ Star',
                                    'medium-low': 'Average', 'medium-medium': 'Core', 'medium-high': 'High\nPotential',
                                    'low-low': 'Risk', 'low-medium': 'Inconsistent', 'low-high': 'Gem',
                                };
                                return (
                                    <div className="grid grid-cols-3 gap-1 mb-4 flex-1">
                                        {rows.map(r => cols.map(c => {
                                            const key = `${r}-${c}`;
                                            const isMe = r === box.performance_label.toLowerCase() && c === box.potential_label.toLowerCase();
                                            return (
                                                <div key={key} className={`relative rounded-lg text-center py-3 px-1 text-[9px] font-bold leading-tight transition-all ${
                                                    isMe
                                                        ? `bg-gradient-to-br ${gradient} text-white shadow-lg scale-105 ring-2 ring-offset-1 ring-white dark:ring-gray-900`
                                                        : 'bg-gray-50 dark:bg-gray-800/40 text-gray-400'
                                                }`}>
                                                    {isMe && <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white rounded-full shadow flex items-center justify-center text-[7px]">✦</div>}
                                                    {(labels[key] || '').split('\n').map((ln, i) => <div key={i}>{ln}</div>)}
                                                </div>
                                            );
                                        }))}
                                    </div>
                                );
                            })()}
                            <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase mb-2 px-0.5">
                                <span>← Low Potential</span><span>High Potential →</span>
                            </div>
                            <div className={`bg-gradient-to-r ${gradient} text-white rounded-xl p-3 text-center mt-auto`}>
                                <div className="text-base font-extrabold">{box.box_title}</div>
                                <div className="text-[10px] text-white/80 mt-0.5">Perf {box.performance_score.toFixed(1)} · Potential {box.potential_score.toFixed(1)}</div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center flex-1 text-xs text-gray-400 italic">Not enough data to compute position.</div>
                    )}
                </div>
            </div>

            {/* ── KRA Progress Table ── */}
            {(data?.kras.length ?? 0) > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">My KRA Assignments</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/40 text-[9px] font-black uppercase text-gray-400 tracking-wider">
                                    <th className="p-3 pl-4 rounded-tl-xl">KRA</th>
                                    <th className="p-3">Weight</th>
                                    <th className="p-3">Weight Bar</th>
                                    <th className="p-3 rounded-tr-xl">Target</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {data?.kras.map((k, i) => (
                                    <tr key={k.id} className="text-xs hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                                        <td className="p-3 pl-4 font-bold text-gray-800 dark:text-white">{k.kra_name}</td>
                                        <td className="p-3 font-extrabold text-teal-600 dark:text-teal-400">{k.weightage}%</td>
                                        <td className="p-3 w-40">
                                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                <div className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all"
                                                    style={{ width: `${Math.min(k.weightage, 100)}%` }} />
                                            </div>
                                        </td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400 max-w-xs truncate text-[11px]">{k.target_description || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Feedback Cards ── */}
            {(data?.feedbacks.length ?? 0) > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Recent Feedback</h3>
                        <NavLink to="/employee/performance/feedback-received"
                            className="text-[10px] font-bold text-teal-600 hover:underline">View all →</NavLink>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {data?.feedbacks.slice(0, 6).map(f => (
                            <div key={f.id} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-2">
                                <div className="flex justify-between items-start gap-2">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${FEEDBACK_BADGE[f.feedback_type] ?? 'bg-gray-100 text-gray-500'}`}>
                                        {f.feedback_type}
                                    </span>
                                    {f.rating && (
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <div key={i} className={`w-2 h-2 rounded-full ${i < f.rating! ? 'bg-amber-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">{f.feedback_text}</p>
                                <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <span className="text-[10px] font-bold text-gray-500">{f.given_by_name}</span>
                                    <span className="text-[9px] text-gray-400">{f.created_at?.slice(0, 10)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Appraisal History Cards ── */}
            {(data?.evaluations.length ?? 0) > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Appraisal History</h3>
                        <NavLink to="/employee/performance/appraisal-history"
                            className="text-[10px] font-bold text-teal-600 hover:underline">View all →</NavLink>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {data?.evaluations.map(ev => {
                            const score = ev.final_rating ?? ev.manager_rating ?? ev.self_rating;
                            const pct = score ? Math.round((score / 5) * 100) : 0;
                            const color = pct >= 80 ? 'emerald' : pct >= 60 ? 'teal' : pct >= 40 ? 'amber' : 'rose';
                            return (
                                <div key={ev.id} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="text-xs font-bold text-gray-800 dark:text-white leading-tight">{ev.cycle_name}</div>
                                            <div className={`text-[9px] font-black uppercase mt-0.5 text-${color}-600`}>{ev.status}</div>
                                        </div>
                                        <div className={`text-2xl font-extrabold text-${color}-600`}>{score?.toFixed(1) ?? '—'}<span className="text-xs text-gray-400">/5</span></div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {[
                                            { label: 'Self', val: ev.self_rating, color: 'blue' },
                                            { label: 'Manager', val: ev.manager_rating, color: 'indigo' },
                                            { label: 'Final', val: ev.final_rating, color: color },
                                        ].map(r => (
                                            <div key={r.label} className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-gray-400 w-14 shrink-0">{r.label}</span>
                                                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                                                    <div className={`h-1.5 rounded-full bg-${r.color}-500`} style={{ width: `${r.val ? (r.val / 5) * 100 : 0}%` }} />
                                                </div>
                                                <span className={`text-[9px] font-bold text-${r.color}-600 w-6 text-right`}>{r.val?.toFixed(1) ?? '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && !data?.kras.length && !data?.evaluations.length && !data?.feedbacks.length && !data?.skills.length && (
                <div className="text-center py-16 text-sm text-gray-400 italic border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                    No performance data yet. KRAs, appraisals and feedback will appear here once set up by your manager.
                </div>
            )}
        </div>
    );
};

export default PerformanceDashboard;
