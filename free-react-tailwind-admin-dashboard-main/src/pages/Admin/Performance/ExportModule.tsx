import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ReactApexChart from 'react-apexcharts';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';
import IconDownload from '../../../components/Icon/IconDownload';
import IconMenuCharts from '../../../components/Icon/Menu/IconMenuCharts';

interface Evaluation {
    id: number;
    employee: number;
    employee_name: string;
    manager: number | null;
    cycle: number;
    cycle_name: string;
    self_overall_rating: string | null;
    manager_overall_rating: string | null;
    hr_overall_rating: string | null;
    peer_overall_rating: number | null;
    perf_score: number | null;
    status: string;
}

interface EmpBasic {
    id: number;
    full_name: string;
    department_name: string;
    designation_name: string;
}

interface AppraisalExtension {
    id: number;
    cycle: number;
    employee: number;
    status: 'pending' | 'approved' | 'rejected';
}

interface AppraisalCycle {
    id: number;
    name: string;
    status: string;
}

interface HikeBand {
    id: number;
    cycle: number;
    min_rating: string;
    max_rating: string;
    recommended_hike_percentage: string;
}

const ExportModule = () => {
    const dispatch = useDispatch();
    const isDark = useSelector((state: any) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState<string | null>(null);

    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [employees, setEmployees]     = useState<Record<number, EmpBasic>>({});
    const [extensions, setExtensions]   = useState<AppraisalExtension[]>([]);
    const [cycles, setCycles]           = useState<AppraisalCycle[]>([]);
    // all bands keyed by cycle ID
    const [allBands, setAllBands] = useState<Record<number, HikeBand[]>>({});

    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [cycleFilter, setCycleFilter]   = useState('all');

    // Track which evaluation IDs have had hike applied { [evalId]: hike% } — persisted across navigation
    const [appliedHikes, setAppliedHikes] = useState<Record<number, number>>(() => {
        try { return JSON.parse(localStorage.getItem('itl_applied_hikes') || '{}'); } catch { return {}; }
    });
    const [applying, setApplying]         = useState<Record<number, boolean>>({});
    const [applyingAll, setApplyingAll]   = useState(false);
    // Confirm re-apply dialog
    const [reapplyTarget, setReapplyTarget] = useState<{ ev: Evaluation; hike: number; empName: string } | null>(null);

    // Persist applied hikes to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('itl_applied_hikes', JSON.stringify(appliedHikes));
    }, [appliedHikes]);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [evalsRes, empsRes, extsRes, cyclesRes] = await Promise.all([
                axios.get(`${API_BASE}/employee/appraisal-evaluations/?all_evaluations=true`, { headers: headers() }),
                axios.get(`${API_BASE}/employee/all-employees-list/`,      { headers: headers() }),
                axios.get(`${API_BASE}/employee/appraisal-extensions/`,  { headers: headers() }),
                axios.get(`${API_BASE}/employee/appraisal-cycles/`,      { headers: headers() }),
            ]);

            const evals = asArray(evalsRes.data);
            const emps  = asArray(empsRes.data);
            const exts  = asArray(extsRes.data);
            const cycs  = asArray(cyclesRes.data);

            setEvaluations(evals);
            setExtensions(exts);
            setCycles(cycs);

            const empMap: Record<number, EmpBasic> = {};
            emps.forEach((e: any) => {
                empMap[e.id] = {
                    id: e.id,
                    full_name: e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || '—',
                    department_name: e.department_name || e.department || '—',
                    designation_name: e.designation_name || e.designation || '—',
                };
            });
            setEmployees(empMap);

        } catch (err: any) {
            console.error(err);
            setError('Failed to fetch appraisal data report.');
        } finally {
            setLoading(false);
        }
    };

    // Load ALL hike bands once on mount — grouped by cycle
    useEffect(() => {
        axios.get(`${API_BASE}/employee/salary-hike-config/`, { headers: headers() })
            .then(r => {
                const map: Record<number, HikeBand[]> = {};
                asArray(r.data).forEach((b: HikeBand) => {
                    if (!map[b.cycle]) map[b.cycle] = [];
                    map[b.cycle].push(b);
                });
                setAllBands(map);
            })
            .catch(() => setAllBands({}));
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Appraisal Reports & Analytics'));
        loadData();
    }, [dispatch]);

    // Hike % for a specific evaluation's cycle + perf_score
    const getHikePercent = useCallback((cycleId: number, score: number | null): number | null => {
        if (score === null) return null;
        const bands = allBands[cycleId];
        if (!bands || bands.length === 0) return null;
        const band = bands.find(b => score >= parseFloat(b.min_rating) && score <= parseFloat(b.max_rating));
        return band ? parseFloat(band.recommended_hike_percentage) : null;
    }, [allBands]);

    // All feedback present = self + manager + peer ratings all submitted
    const hasAllFeedback = (e: Evaluation) =>
        e.self_overall_rating !== null &&
        e.manager_overall_rating !== null &&
        e.peer_overall_rating !== null;

    // Derived statistics rollup
    const stats = useMemo(() => {
        const total = evaluations.length;
        const completed = evaluations.filter(e => e.status.startsWith('submitted') || e.status === 'completed' || e.status === 'submitted_hr').length;
        const pending = total - completed;
        const scores = evaluations.map(e => e.perf_score).filter((x): x is number => x !== null);
        const avgScore = scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
        const approvedExts = extensions.filter(ext => ext.status === 'approved').length;
        return { total, completed, pending, avgScore, approvedExts };
    }, [evaluations, extensions]);

    // Filter evaluations list
    const filteredEvaluations = useMemo(() => {
        return evaluations.filter(e => {
            const emp = employees[e.employee];
            const nameMatch = emp?.full_name.toLowerCase().includes(search.toLowerCase()) || e.employee_name.toLowerCase().includes(search.toLowerCase());
            const deptMatch = emp?.department_name.toLowerCase().includes(search.toLowerCase());
            const statusMatch = statusFilter === 'all' || e.status === statusFilter;
            const cycleMatch = cycleFilter === 'all' || String(e.cycle) === cycleFilter;
            return (nameMatch || deptMatch) && statusMatch && cycleMatch;
        });
    }, [evaluations, employees, search, statusFilter, cycleFilter]);

    // Department Performance Chart Data
    const deptChartData = useMemo(() => {
        const deptScores: Record<string, { total: number; count: number }> = {};
        filteredEvaluations.forEach(e => {
            const emp = employees[e.employee];
            const dept = emp?.department_name || 'Unmapped';
            if (e.perf_score !== null) {
                if (!deptScores[dept]) deptScores[dept] = { total: 0, count: 0 };
                deptScores[dept].total += e.perf_score;
                deptScores[dept].count += 1;
            }
        });
        const categories = Object.keys(deptScores);
        const data = categories.map(cat => +(deptScores[cat].total / deptScores[cat].count).toFixed(2));
        return { categories, data };
    }, [filteredEvaluations, employees]);

    // Donut Completion Chart Data
    const completionChartData = useMemo(() => {
        const statusCounts: Record<string, number> = {
            'Completed/HR Approved': 0,
            'Submitted Manager': 0,
            'In Draft': 0,
        };
        filteredEvaluations.forEach(e => {
            if (e.status === 'draft') statusCounts['In Draft'] += 1;
            else if (e.status === 'submitted_manager') statusCounts['Submitted Manager'] += 1;
            else statusCounts['Completed/HR Approved'] += 1;
        });
        return {
            series: [statusCounts['Completed/HR Approved'], statusCounts['Submitted Manager'], statusCounts['In Draft']],
            labels: Object.keys(statusCounts),
        };
    }, [filteredEvaluations]);

    // Apply hike for single evaluation
    const applyHike = async (ev: Evaluation) => {
        setApplying(p => ({ ...p, [ev.id]: true }));
        try {
            const res = await axios.post(
                `${API_BASE}/employee/appraisal-evaluations/apply_salary_hike/`,
                { cycle_id: ev.cycle, evaluation_ids: [ev.id] },
                { headers: headers() }
            );
            const result = res.data.results?.[0];
            if (result?.applied) setAppliedHikes(p => ({ ...p, [ev.id]: result.hike_percent }));
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Failed to apply hike.');
        } finally {
            setApplying(p => ({ ...p, [ev.id]: false }));
        }
    };

    // Apply all — only eligible (all feedback present + hike band matched + not yet applied)
    const applyAllHikes = async () => {
        if (cycleFilter === 'all') { alert('Select a specific cycle to apply hikes.'); return; }
        const ids = filteredEvaluations
            .filter(e => hasAllFeedback(e) && getHikePercent(e.cycle, e.perf_score) !== null && !appliedHikes[e.id])
            .map(e => e.id);
        if (ids.length === 0) { alert('No eligible employees (all need self + manager + peer feedback and a matching hike band).'); return; }
        setApplyingAll(true);
        try {
            const res = await axios.post(
                `${API_BASE}/employee/appraisal-evaluations/apply_salary_hike/`,
                { cycle_id: Number(cycleFilter), evaluation_ids: ids },
                { headers: headers() }
            );
            const newApplied: Record<number, number> = { ...appliedHikes };
            (res.data.results || []).forEach((r: any) => {
                if (r.applied) newApplied[r.evaluation_id] = r.hike_percent;
            });
            setAppliedHikes(newApplied);
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Failed to apply hikes.');
        } finally {
            setApplyingAll(false);
        }
    };

    // CSV Export
    const handleExportCSV = () => {
        if (filteredEvaluations.length === 0) return;
        const headersList = ['Employee Name', 'Department', 'Designation', 'Cycle Name', 'Self Rating', 'Manager Rating', 'Peer Rating', 'HR Rating', 'Perf Score', 'Hike %', 'Status'];
        const csvRows = [headersList.join(',')];
        filteredEvaluations.forEach(e => {
            const emp = employees[e.employee];
            const hike = getHikePercent(e.cycle, e.perf_score);
            const row = [
                `"${emp?.full_name || e.employee_name}"`,
                `"${emp?.department_name || '—'}"`,
                `"${emp?.designation_name || '—'}"`,
                `"${e.cycle_name}"`,
                e.self_overall_rating || '—',
                e.manager_overall_rating || '—',
                e.peer_overall_rating !== null ? e.peer_overall_rating : '—',
                e.hr_overall_rating || '—',
                e.perf_score !== null ? e.perf_score : '—',
                hike !== null ? `${hike}%` : '—',
                e.status.toUpperCase(),
            ];
            csvRows.push(row.join(','));
        });
        const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `ITL_Appraisal_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Chart Options
    const donutChartOptions: any = {
        chart: { type: 'donut', fontFamily: 'Inter, sans-serif', background: 'transparent' },
        dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
        labels: completionChartData.labels,
        colors: ['#10b981', '#3b82f6', '#f59e0b'],
        theme: { mode: isDark ? 'dark' : 'light' },
        legend: { position: 'bottom', labels: { colors: isDark ? '#e0e6ed' : '#1f2937' } },
    };

    const barChartOptions: any = {
        chart: { type: 'bar', fontFamily: 'Inter, sans-serif', background: 'transparent', toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 8, columnWidth: '55%', distributed: true } },
        colors: ['#06b6d4', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'],
        theme: { mode: isDark ? 'dark' : 'light' },
        xaxis: { categories: deptChartData.categories, labels: { style: { colors: isDark ? '#e0e6ed' : '#1f2937', fontSize: '10px', fontWeight: 'bold' } } },
        yaxis: { labels: { formatter: (val: number) => `${val}`, style: { colors: isDark ? '#888ea8' : '#4b5563' } } },
        dataLabels: { enabled: true, formatter: (val: number) => `${val}`, style: { fontSize: '10px' } },
        legend: { show: false },
    };

    const hikeEligibleCount = useMemo(() =>
        filteredEvaluations.filter(e => hasAllFeedback(e) && getHikePercent(e.cycle, e.perf_score) !== null && !appliedHikes[e.id]).length,
    [filteredEvaluations, getHikePercent, appliedHikes, allBands]);

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Appraisal Reports & Analytics</h2>
                    <p className="text-xs text-gray-450 mt-0.5">Visualize talent distribution, track review completion rates, and apply salary hikes.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold transition">
                        🔄 Refresh
                    </button>
                    <Link to="/admin/performance" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold transition">
                        ← Control Center
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-4 rounded-xl text-xs font-bold">
                    ⚠️ {error}
                </div>
            )}

            {/* Metrics cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: 'Total Evaluations',   value: stats.total,        color: 'text-teal-600 dark:text-teal-400',    desc: 'Active in cycle' },
                    { title: 'Completed Reviews',   value: stats.completed,    color: 'text-emerald-600 dark:text-emerald-400', desc: 'Manager / HR approved' },
                    { title: 'Avg. Perf Score',     value: stats.avgScore,     color: 'text-indigo-650 dark:text-indigo-400', desc: 'Equal-weight role avg' },
                    { title: 'Grace Extensions',    value: stats.approvedExts, color: 'text-amber-600 dark:text-amber-400',  desc: 'Approved requests' },
                ].map((s, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-sm space-y-1">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">{s.title}</span>
                        <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                        <span className="block text-[9px] text-gray-400 italic">{s.desc}</span>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                        <IconMenuCharts className="w-4 h-4 text-teal-500" />
                        <h3 className="text-sm font-black text-gray-800 dark:text-white">Evaluation Completion Status</h3>
                    </div>
                    {filteredEvaluations.length > 0 ? (
                        <div className="flex justify-center py-4">
                            <ReactApexChart options={donutChartOptions} series={completionChartData.series} type="donut" width="360" />
                        </div>
                    ) : (
                        <div className="text-center py-16 text-xs text-gray-400 italic">No chart data available.</div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                        <span className="text-base text-teal-500">🏢</span>
                        <h3 className="text-sm font-black text-gray-800 dark:text-white">Avg Perf Score by Department</h3>
                    </div>
                    {deptChartData.categories.length > 0 ? (
                        <div className="py-2">
                            <ReactApexChart options={barChartOptions} series={[{ name: 'Avg Score', data: deptChartData.data }]} type="bar" height="240" />
                        </div>
                    ) : (
                        <div className="text-center py-16 text-xs text-gray-400 italic">No department data to chart.</div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h3 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <span>📋</span> Appraisal Logs
                        {Object.keys(allBands).length > 0 && (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full ml-1">
                                Hike bands loaded
                            </span>
                        )}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <input type="text" placeholder="Search name/dept..." value={search} onChange={e => setSearch(e.target.value)}
                                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none w-48" />
                            <IconSearch className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                        </div>

                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none">
                            <option value="all">All Status</option>
                            <option value="draft">In Draft</option>
                            <option value="submitted_manager">Submitted Manager</option>
                            <option value="submitted_hr">HR Approved</option>
                        </select>

                        <select value={cycleFilter} onChange={e => { setCycleFilter(e.target.value); setAppliedHikes({}); localStorage.removeItem('itl_applied_hikes'); }}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none">
                            <option value="all">All Cycles</option>
                            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        {/* Apply All */}
                        {cycleFilter !== 'all' && allBands[Number(cycleFilter)]?.length > 0 && (
                            <button onClick={applyAllHikes} disabled={applyingAll || hikeEligibleCount === 0}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl text-xs font-black transition shadow-sm">
                                {applyingAll ? '⏳ Applying...' : `🚀 Apply All Hikes (${hikeEligibleCount})`}
                            </button>
                        )}

                        <button onClick={handleExportCSV} disabled={filteredEvaluations.length === 0}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-black transition shadow-sm">
                            <IconDownload className="w-3.5 h-3.5" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {cycleFilter !== 'all' && !(allBands[Number(cycleFilter)]?.length > 0) && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 px-4 py-2 rounded-xl font-semibold">
                        ⚠️ No salary hike bands configured for this cycle. Go to <strong>Salary Hike</strong> to set them up before applying hikes.
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-medium">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-bold uppercase text-[9px]">
                                <th className="py-3 px-2">Employee</th>
                                <th className="py-3 px-2">Department</th>
                                <th className="py-3 px-2">Designation</th>
                                <th className="py-3 px-2">Cycle</th>
                                <th className="py-3 px-2 text-center">Self</th>
                                <th className="py-3 px-2 text-center">Manager</th>
                                <th className="py-3 px-2 text-center">Peer</th>
                                <th className="py-3 px-2 text-center">HR</th>
                                <th className="py-3 px-2 text-center">Perf Score</th>
                                <th className="py-3 px-2 text-center">Hike %</th>
                                <th className="py-3 px-2 text-right">Status</th>
                                <th className="py-3 px-2 text-center">Apply Hike</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40 text-gray-700 dark:text-gray-300">
                            {filteredEvaluations.map((e) => {
                                const emp      = employees[e.employee];
                                const hike     = getHikePercent(e.cycle, e.perf_score);
                                const complete = hasAllFeedback(e);
                                const applied  = appliedHikes[e.id];
                                const busy     = applying[e.id];
                                return (
                                    <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                        <td className="py-3.5 px-2 font-bold text-gray-850 dark:text-white">{emp?.full_name || e.employee_name}</td>
                                        <td className="py-3.5 px-2">{emp?.department_name || '—'}</td>
                                        <td className="py-3.5 px-2">{emp?.designation_name || '—'}</td>
                                        <td className="py-3.5 px-2 text-teal-600 dark:text-teal-400 font-semibold">{e.cycle_name}</td>
                                        <td className="py-3.5 px-2 text-center font-extrabold">{e.self_overall_rating || '—'}</td>
                                        <td className="py-3.5 px-2 text-center font-extrabold">{e.manager_overall_rating || '—'}</td>
                                        <td className="py-3.5 px-2 text-center font-extrabold">{e.peer_overall_rating ?? '—'}</td>
                                        <td className="py-3.5 px-2 text-center font-extrabold">{e.hr_overall_rating || '—'}</td>
                                        <td className="py-3.5 px-2 text-center">
                                            {e.perf_score !== null ? (
                                                <span className="font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-450">
                                                    {e.perf_score}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="py-3.5 px-2 text-center">
                                            {hike !== null ? (
                                                <span className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                                                    hike >= 15 ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400' :
                                                    hike >= 10 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                                    hike >= 7  ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400' :
                                                    hike >= 4  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                                                                 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                                }`}>{hike}%</span>
                                            ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                        </td>
                                        <td className="py-3.5 px-2 text-right">
                                            <span className={`px-2 py-0.5 rounded-full uppercase text-[8px] font-black ${
                                                e.status === 'draft'
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                                    : e.status === 'submitted_manager'
                                                    ? 'bg-blue-105 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            }`}>
                                                {e.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-2 text-center">
                                            {applied !== undefined ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">✓ +{applied}% applied</span>
                                                    <button
                                                        onClick={() => setReapplyTarget({ ev: e, hike: applied, empName: employees[e.employee]?.full_name || e.employee_name })}
                                                        className="px-2 py-0.5 text-[8px] font-black bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 dark:text-amber-400 rounded-md transition">
                                                        🔄 Regenerate
                                                    </button>
                                                </div>
                                            ) : !complete ? (
                                                <span className="text-[9px] text-amber-500 dark:text-amber-400" title="Needs self + manager + peer feedback">
                                                    Incomplete
                                                </span>
                                            ) : hike !== null ? (
                                                <button onClick={() => applyHike(e)} disabled={busy}
                                                    className="px-3 py-1 text-[9px] font-black bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white rounded-lg transition">
                                                    {busy ? '...' : `Apply +${hike}%`}
                                                </button>
                                            ) : (
                                                <span className="text-[9px] text-gray-300 dark:text-gray-600">No band</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredEvaluations.length === 0 && (
                                <tr>
                                    <td colSpan={12} className="text-center py-10 text-xs text-gray-400 italic">
                                        No appraisal logs found matching your filter queries.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Re-apply confirmation modal */}
            {reapplyTarget && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    {/* Full-screen backdrop — covers sidebar + navbar */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReapplyTarget(null)} />
                    <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-xl shrink-0">⚠️</div>
                            <div>
                                <p className="text-sm font-black text-gray-800 dark:text-white">Hike Already Applied</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Salary hike confirmation</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                            A <span className="font-black text-amber-600 dark:text-amber-400">+{reapplyTarget.hike}%</span> hike has already been applied to the basic salary of{' '}
                            <span className="font-black text-gray-800 dark:text-white">{reapplyTarget.empName}</span>.
                            Do you want to apply it again?
                        </p>
                        <p className="text-[10px] text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-lg px-3 py-2 font-semibold">
                            This will increase their current basic salary by another {reapplyTarget.hike}%.
                        </p>
                        <div className="flex gap-2 justify-end pt-1">
                            <button
                                onClick={() => setReapplyTarget(null)}
                                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const target = reapplyTarget;
                                    setReapplyTarget(null);
                                    await applyHike(target.ev);
                                }}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition">
                                Yes, Apply Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportModule;
