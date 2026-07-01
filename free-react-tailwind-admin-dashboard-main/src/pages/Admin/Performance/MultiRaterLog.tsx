import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ReactApexChart from 'react-apexcharts';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';
import IconDownload from '../../../components/Icon/IconDownload';
import IconMenuCharts from '../../../components/Icon/Menu/IconMenuCharts';

interface MultiRaterMapping {
    id: number;
    employee: number;
    reviewer: number;
    cycle: number;
    status: 'nominated' | 'approved' | 'rejected' | 'submitted' | string;
    created_at: string;
    reviewer_name: string;
    reviewer_designation: string;
    reviewer_initials: string;
    reviewer_avatar_bg: string;
    employee_name: string;
    employee_designation: string;
    employee_department: string;
    employee_initials: string;
    cycle_name: string;
}

interface AppraisalCycle {
    id: number;
    name: string;
    status: string;
}

const MultiRaterLog = () => {
    const dispatch = useDispatch();
    const isDark = useSelector((state: any) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const [mappings, setMappings] = useState<MultiRaterMapping[]>([]);
    const [cycles, setCycles]     = useState<AppraisalCycle[]>([]);

    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter]   = useState('all');
    const [cycleFilter, setCycleFilter]     = useState('all');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [mappingsRes, cyclesRes] = await Promise.all([
                axios.get(`${API_BASE}/employee/multirater/`, { headers: headers() }),
                axios.get(`${API_BASE}/employee/appraisal-cycles/`,     { headers: headers() }),
            ]);

            setMappings(asArray(mappingsRes.data));
            setCycles(asArray(cyclesRes.data));

        } catch (err: any) {
            console.error(err);
            setError('Failed to fetch multi-rater peer mapping logs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        dispatch(setPageTitle('Multi-Rater Review Master Log'));
        loadData();
    }, [dispatch]);

    // Derive summary metrics
    const stats = useMemo(() => {
        const total = mappings.length;
        const nominated = mappings.filter(m => m.status === 'nominated').length;
        const approved = mappings.filter(m => m.status === 'approved').length;
        const completed = mappings.filter(m => m.status === 'submitted' || m.status === 'completed').length;

        // Unique active reviewers count
        const uniqueReviewers = new Set(mappings.map(m => m.reviewer)).size;

        return { total, nominated, approved, completed, uniqueReviewers };
    }, [mappings]);

    // Filter mappings list
    const filteredMappings = useMemo(() => {
        return mappings.filter(m => {
            const query = search.toLowerCase();
            const nameMatch = m.employee_name.toLowerCase().includes(query) || m.reviewer_name.toLowerCase().includes(query);
            const deptMatch = m.employee_department.toLowerCase().includes(query);
            
            const statusMatch = statusFilter === 'all' || m.status === statusFilter;
            const cycleMatch = cycleFilter === 'all' || String(m.cycle) === cycleFilter;

            return (nameMatch || deptMatch) && statusMatch && cycleMatch;
        });
    }, [mappings, search, statusFilter, cycleFilter]);

    // Top Nominated Reviewers Chart Data (workload check)
    const reviewerChartData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredMappings.forEach(m => {
            counts[m.reviewer_name] = (counts[m.reviewer_name] || 0) + 1;
        });

        // Sort and slice top 5
        const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const categories = sorted.map(item => item[0]);
        const data = sorted.map(item => item[1]);

        return { categories, data };
    }, [filteredMappings]);

    // Donut Status Chart Data
    const statusChartData = useMemo(() => {
        const statusCounts: Record<string, number> = {
            'Nominated': 0,
            'Approved': 0,
            'Completed': 0,
            'Rejected': 0,
        };

        filteredMappings.forEach(m => {
            if (m.status === 'nominated') {
                statusCounts['Nominated'] += 1;
            } else if (m.status === 'approved') {
                statusCounts['Approved'] += 1;
            } else if (m.status === 'submitted' || m.status === 'completed') {
                statusCounts['Completed'] += 1;
            } else if (m.status === 'rejected') {
                statusCounts['Rejected'] += 1;
            }
        });

        return {
            series: [
                statusCounts['Nominated'],
                statusCounts['Approved'],
                statusCounts['Completed'],
                statusCounts['Rejected'],
            ],
            labels: Object.keys(statusCounts),
        };
    }, [filteredMappings]);

    // CSV Export Generator
    const handleExportCSV = () => {
        if (filteredMappings.length === 0) return;

        const headersList = ['Reviewee (Employee)', 'Department', 'Designation', 'Assigned Peer Reviewer', 'Reviewer Designation', 'Cycle Name', 'Status', 'Nomination Date'];
        const csvRows = [headersList.join(',')];

        filteredMappings.forEach(m => {
            const row = [
                `"${m.employee_name}"`,
                `"${m.employee_department || '—'}"`,
                `"${m.employee_designation || '—'}"`,
                `"${m.reviewer_name}"`,
                `"${m.reviewer_designation || '—'}"`,
                `"${m.cycle_name}"`,
                m.status.toUpperCase(),
                new Date(m.created_at).toLocaleDateString('en-IN'),
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `MultiRater_Peer_Mappings_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Chart Options
    const donutChartOptions: any = {
        chart: {
            type: 'donut',
            fontFamily: 'Inter, sans-serif',
            background: 'transparent',
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `${Math.round(val)}%`,
        },
        labels: statusChartData.labels,
        colors: ['#3b82f6', '#10b981', '#6366f1', '#f43f5e'],
        theme: {
            mode: isDark ? 'dark' : 'light',
        },
        legend: {
            position: 'bottom',
            labels: {
                colors: isDark ? '#e0e6ed' : '#1f2937',
            },
        },
    };

    const barChartOptions: any = {
        chart: {
            type: 'bar',
            fontFamily: 'Inter, sans-serif',
            background: 'transparent',
            toolbar: { show: false },
        },
        plotOptions: {
            bar: {
                borderRadius: 6,
                horizontal: true,
                barHeight: '55%',
                distributed: true,
            },
        },
        colors: ['#4f46e5', '#3b82f6', '#06b6d4', '#0d9488', '#10b981'],
        theme: {
            mode: isDark ? 'dark' : 'light',
        },
        xaxis: {
            categories: reviewerChartData.categories,
            labels: {
                style: {
                    colors: isDark ? '#888ea8' : '#4b5563',
                },
            },
        },
        yaxis: {
            labels: {
                style: {
                    colors: isDark ? '#e0e6ed' : '#1f2937',
                    fontSize: '10px',
                    fontWeight: 'bold',
                },
            },
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `${val} reviews`,
            style: {
                fontSize: '10px',
            },
        },
        legend: { show: false },
    };

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header section */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Multi-Rater Review Master Log</h2>
                    <p className="text-xs text-gray-450 mt-0.5">Track peer assignments, review nominated relationships, audit workload distribution, and generate mappings spreadsheets.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadData}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold transition"
                    >
                        🔄 Refresh Log
                    </button>
                    <Link
                        to="/admin/performance"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-855 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold transition"
                    >
                        ← Control Center
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-4 rounded-xl text-xs font-bold animate__animated animate__fadeIn">
                    ⚠️ {error}
                </div>
            )}

            {/* Stats metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { title: 'Total Peer Mappings', value: stats.total, color: 'text-blue-600 dark:text-blue-400', desc: 'Nominations registered' },
                    { title: 'Nominated Mappings', value: stats.nominated, color: 'text-amber-500 dark:text-amber-400', desc: 'Awaiting validation' },
                    { title: 'Approved Assignments', value: stats.approved, color: 'text-teal-600 dark:text-teal-400', desc: 'Valid feedback paths' },
                    { title: 'Completed Peer Reviews', value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400', desc: 'Feedback submitted' },
                    { title: 'Unique Reviewers', value: stats.uniqueReviewers, color: 'text-indigo-650 dark:text-indigo-400', desc: 'Active participants' }
                ].map((s, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-sm space-y-1">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">{s.title}</span>
                        <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                        <span className="block text-[9px] text-gray-400 italic">{s.desc}</span>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Donut chart */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                        <IconMenuCharts className="w-4 h-4 text-blue-500" />
                        <h3 className="text-sm font-black text-gray-800 dark:text-white">Mapping Status Distribution</h3>
                    </div>
                    {filteredMappings.length > 0 ? (
                        <div className="flex justify-center py-4">
                            <ReactApexChart
                                options={donutChartOptions}
                                series={statusChartData.series}
                                type="donut"
                                width="350"
                            />
                        </div>
                    ) : (
                        <div className="text-center py-16 text-xs text-gray-400 italic">No status data to display.</div>
                    )}
                </div>

                {/* Bar chart workload */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                        <span className="text-base text-blue-500">⚖️</span>
                        <h3 className="text-sm font-black text-gray-800 dark:text-white">Workload Check: Top Nominated Reviewers</h3>
                    </div>
                    {reviewerChartData.categories.length > 0 ? (
                        <div className="py-2">
                            <ReactApexChart
                                options={barChartOptions}
                                series={[{ name: 'Assigned Mappings', data: reviewerChartData.data }]}
                                type="bar"
                                height="220"
                            />
                        </div>
                    ) : (
                        <div className="text-center py-16 text-xs text-gray-400 italic">No workload data to graph.</div>
                    )}
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h3 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <span>👥</span> Multi-Rater Mappings Logs
                    </h3>

                    {/* Filters & Export */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search name/dept..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none w-48"
                            />
                            <IconSearch className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                        >
                            <option value="all">All Status</option>
                            <option value="nominated">Nominated</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="submitted">Completed</option>
                        </select>

                        <select
                            value={cycleFilter}
                            onChange={e => setCycleFilter(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                        >
                            <option value="all">All Cycles</option>
                            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <button
                            onClick={handleExportCSV}
                            disabled={filteredMappings.length === 0}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-black transition shadow-sm"
                        >
                            <IconDownload className="w-3.5 h-3.5" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-medium">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-bold uppercase text-[9px]">
                                <th className="py-3 px-2">Reviewee (Employee)</th>
                                <th className="py-3 px-2">Department</th>
                                <th className="py-3 px-2">Designation</th>
                                <th className="py-3 px-2">Assigned Peer Reviewer</th>
                                <th className="py-3 px-2">Reviewer Designation</th>
                                <th className="py-3 px-2">Cycle</th>
                                <th className="py-3 px-2">Nomination Date</th>
                                <th className="py-3 px-2 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40 text-gray-700 dark:text-gray-300">
                            {filteredMappings.map((m) => (
                                <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                    <td className="py-3.5 px-2 font-bold text-gray-850 dark:text-white">{m.employee_name}</td>
                                    <td className="py-3.5 px-2">{m.employee_department || '—'}</td>
                                    <td className="py-3.5 px-2">{m.employee_designation || '—'}</td>
                                    <td className="py-3.5 px-2 font-semibold text-gray-800 dark:text-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[9px] font-black shrink-0">
                                                {m.reviewer_initials}
                                            </div>
                                            <span>{m.reviewer_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-2">{m.reviewer_designation || '—'}</td>
                                    <td className="py-3.5 px-2 text-blue-600 dark:text-blue-400 font-semibold">{m.cycle_name}</td>
                                    <td className="py-3.5 px-2">{new Date(m.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="py-3.5 px-2 text-right">
                                        <span className={`px-2 py-0.5 rounded-full uppercase text-[8px] font-black ${
                                            m.status === 'nominated'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                                : m.status === 'approved'
                                                ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400'
                                                : m.status === 'rejected'
                                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-455'
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450'
                                        }`}>
                                            {m.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredMappings.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-xs text-gray-400 italic">
                                        No multi-rater peer mappings found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MultiRaterLog;
