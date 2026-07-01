import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';
import IconSearch from '../../../components/Icon/IconSearch';
import IconUsers from '../../../components/Icon/IconUsers';
import IconMenuCharts from '../../../components/Icon/Menu/IconMenuCharts';

interface Employee {
    id: number;
    name: string;
    avatarBg: string;
    initials: string;
    designation: string;
    department: string;
    performance: 'low' | 'medium' | 'high';
    potential: 'low' | 'medium' | 'high';
    performanceScore: number;
    potentialScore: number;
}

interface MetricGroup {
    title: string;
    desc: string;
    badge: string;
    features: string[];
}

const groups: MetricGroup[] = [
    {
        title: 'User Specific Operations',
        desc: 'Perform individual workforce management, search profile histories, assign custom KRAs/goals, and review manager recording summaries.',
        badge: 'Individual',
        features: ['Search Profiles', 'Assign KRAs & Goals', 'Track Feedback Logs', 'Manager Summaries'],
    },
    {
        title: 'Methods & Setup Templates',
        desc: 'Configure bulk templates, build review questionnaires, and map bulk competency requirements across departments.',
        badge: 'Setup Templates',
        features: ['Bulk Map KRAs', 'Review Questions'],
    },
    {
        title: 'Appraisals Lifecycle',
        desc: 'Launch review cycles, map self-appraisal scorecards, allocate multi-rater peer reviewers, and structure salary hike parameters.',
        badge: 'Cycles',
        features: ['Create Cycles', 'Configure Salary Hikes', 'Review Grace Extensions', 'Multi-Rater Mapping'],
    },
    {
        title: 'Continuous Review',
        desc: 'Coordinate ongoing checkpoints, check mid-year milestones, and authorize grace extensions for missed deadlines.',
        badge: 'Continuous',
        features: ['Ongoing Progress', 'Manage Extensions', 'Checkpoint Calendars'],
    },
    {
        title: 'Master Registries',
        desc: 'Establish master corporate directories, assign designations to KRA indices, and manage key skills mappings.',
        badge: 'Master Registries',
        features: ['Import Corporate Goals', 'KRA Registry', 'Skills Master Inventory'],
    },
    {
        title: 'Data Utilities & Multi-Rater Logs',
        desc: 'Import historical reviews database, export system ratings matrices, and track complete multi-rater peer groupings.',
        badge: 'Utilities',
        features: ['Import Reviews', 'Export Metrics', 'Multi-Rater Master Log'],
    },
];

// 9-box cell definitions
interface BoxCell {
    performance: 'low' | 'medium' | 'high';
    potential: 'low' | 'medium' | 'high';
    label: string;
    badgeColor: string;
    cellBg: string;
    desc: string;
    themeColor: string;
}

const boxCells: BoxCell[] = [
    // Top Row: High Potential
    { potential: 'high', performance: 'low', label: 'Enigma / High Potential', badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300', cellBg: 'bg-indigo-500/5 hover:bg-indigo-500/10 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border-indigo-200/50 dark:border-indigo-800/40', desc: 'High capability but currently underperforming.', themeColor: 'indigo' },
    { potential: 'high', performance: 'medium', label: 'Growth Star', badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300', cellBg: 'bg-cyan-500/5 hover:bg-cyan-500/10 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 border-cyan-200/50 dark:border-cyan-800/40', desc: 'On track to be a star performer soon.', themeColor: 'cyan' },
    { potential: 'high', performance: 'high', label: 'Star Performer', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', cellBg: 'bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border-emerald-300/50 dark:border-emerald-700/50', desc: 'Exceptional results and leadership growth capacity.', themeColor: 'emerald' },
    
    // Middle Row: Medium Potential
    { potential: 'medium', performance: 'low', label: 'Dilemma', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300', cellBg: 'bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-amber-200/50 dark:border-amber-800/40', desc: 'Needs active coaching or redirection.', themeColor: 'amber' },
    { potential: 'medium', performance: 'medium', label: 'Key Contributor', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', cellBg: 'bg-blue-500/5 hover:bg-blue-500/10 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border-blue-200/50 dark:border-blue-800/40', desc: 'Reliable team player providing solid results.', themeColor: 'blue' },
    { potential: 'medium', performance: 'high', label: 'High Performer', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300', cellBg: 'bg-teal-500/5 hover:bg-teal-500/10 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 border-teal-200/50 dark:border-teal-800/40', desc: 'Delivering great results, moderate development room.', themeColor: 'teal' },
    
    // Bottom Row: Low Potential
    { potential: 'low', performance: 'low', label: 'Underperformer', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300', cellBg: 'bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border-rose-200/50 dark:border-rose-800/40', desc: 'Action required: performance plan needed.', themeColor: 'rose' },
    { potential: 'low', performance: 'medium', label: 'Solid Professional', badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', cellBg: 'bg-slate-500/5 hover:bg-slate-500/10 dark:bg-slate-500/5 dark:hover:bg-slate-500/15 border-slate-200/50 dark:border-slate-800/40', desc: 'Performs standard roles well with low potential.', themeColor: 'slate' },
    { potential: 'low', performance: 'high', label: 'Trusted Specialist', badgeColor: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300', cellBg: 'bg-lime-500/5 hover:bg-lime-500/10 dark:bg-lime-500/10 dark:hover:bg-lime-500/20 border-lime-200/50 dark:border-lime-800/40', desc: 'Expert in specialized role, lacks leadership interest.', themeColor: 'lime' },
];

const AdminPerformanceDashboard = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState<'matrix'>('matrix');

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [designations, setDesignations] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [desigFilter, setDesigFilter] = useState('');
    const [selectedCell, setSelectedCell] = useState<BoxCell | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

    const fetchDashboard = (search: string, dept: string, desig: string) => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (dept) params.set('department', dept);
        if (desig) params.set('designation', desig);
        setLoading(true);
        axios.get(`${API_BASE}/employee/performance-dashboard/?${params}`, { headers: headers() })
            .then(res => {
                setEmployees(res.data.employees || []);
                setDepartments(res.data.departments || []);
                setDesignations(res.data.designations || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        dispatch(setPageTitle('Performance Overview'));
        fetchDashboard('', '', '');
    }, [dispatch]);

    const handleSearch = (val: string) => {
        setSearchQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchDashboard(val, deptFilter, desigFilter), 400);
    };

    const handleDept = (val: string) => { setDeptFilter(val); fetchDashboard(searchQuery, val, desigFilter); };
    const handleDesig = (val: string) => { setDesigFilter(val); fetchDashboard(searchQuery, deptFilter, val); };
    const handleReset = () => { setSearchQuery(''); setDeptFilter(''); setDesigFilter(''); fetchDashboard('', '', ''); };

    const getCellEmployees = (cell: BoxCell) =>
        employees.filter(e => e.performance === cell.performance && e.potential === cell.potential);

    const starsCount = employees.filter(e => e.performance === 'high' && e.potential === 'high').length;
    const underperformersCount = employees.filter(e => e.performance === 'low' && e.potential === 'low').length;

    return (
        <div className="min-h-[75vh] flex flex-col gap-6 py-2 animate__animated animate__fadeIn">
            
            {/* Dynamic Welcome & Stat Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-8 shadow-lg shadow-teal-500/10">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
                
                <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                            <IconTrendingUp className="w-4 h-4" />
                            Admin Performance Control Center
                        </div>
                        <h1 className="text-3xl font-extrabold mb-1">Performance Management Systems</h1>
                        <p className="text-white/80 text-sm max-w-xl leading-relaxed">
                            Evaluate organizational talent distribution, setup cyclical appraisals, map continuous reviews, and analyze high-potential contributors.
                        </p>
                    </div>
                    
                    {/* Live Metric Badges */}
                    <div className="flex flex-wrap gap-4 shrink-0 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                        <div className="text-center px-4 border-r border-white/10">
                            <span className="block text-xl font-extrabold text-white">{employees.length}</span>
                            <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Total Evaluated</span>
                        </div>
                        <div className="text-center px-4 border-r border-white/10">
                            <span className="block text-xl font-extrabold text-emerald-300">{starsCount}</span>
                            <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Star Performers</span>
                        </div>
                        <div className="text-center px-4">
                            <span className="block text-xl font-extrabold text-rose-300">{underperformersCount}</span>
                            <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Underperformers</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Tab Bar switcher */}
            <div className="flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2.5 rounded-2xl shadow-sm">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition duration-300 ${
                            activeTab === 'matrix' 
                            ? 'bg-teal-500 text-white shadow-md shadow-teal-500/10' 
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <IconMenuCharts className="w-4 h-4" />
                        9-Box Talent Matrix
                    </button>
                    <NavLink
                        to="/admin/performance/appraisal"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-300"
                    >
                        <IconUsers className="w-4 h-4" />
                        Admin/HR Appraisal
                    </NavLink>
                </div>

                {activeTab === 'matrix' && (
                    <div className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-3.5 py-1.5 rounded-xl animate__animated animate__fadeIn">
                        Talent Distribution Analysis
                    </div>
                )}
            </div>

            {/* TAB CONTENT: 9-BOX TALENT MATRIX */}
            {activeTab === 'matrix' && (
                <div className="flex flex-col lg:flex-row gap-6 animate__animated animate__fadeIn">
                    
                    {/* Left: Filters & Main 9-Box Grid */}
                    <div className="flex-1 flex flex-col gap-6">
                        
                        {/* Interactive Filters Panel */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="relative min-w-[200px]">
                                    <input
                                        type="text"
                                        placeholder="Search employee or designation..."
                                        value={searchQuery}
                                        onChange={e => handleSearch(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-4 py-2 rounded-xl text-xs font-medium text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-teal-500 transition"
                                    />
                                    <IconSearch className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Dept:</span>
                                    <select value={deptFilter} onChange={e => handleDept(e.target.value)}
                                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-white focus:outline-none focus:border-teal-500">
                                        <option value="">All</option>
                                        {departments.map((d, i) => <option key={i} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Designation:</span>
                                    <select value={desigFilter} onChange={e => handleDesig(e.target.value)}
                                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-white focus:outline-none focus:border-teal-500">
                                        <option value="">All</option>
                                        {designations.map((d, i) => <option key={i} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                {loading && <span className="text-[10px] text-teal-500 font-bold animate-pulse">Updating...</span>}
                            </div>

                            <button onClick={handleReset}
                                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                                Reset Filters
                            </button>
                        </div>

                        {/* Interactive 3x3 Matrix Board */}
                        <div className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm flex flex-col gap-4 transition-opacity ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                            
                            <div className="flex flex-row items-stretch">
                                {/* Potential Y-Axis Label */}
                                <div className="flex flex-col justify-around items-center pr-4 select-none shrink-0 w-8">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -rotate-90 origin-center whitespace-nowrap">
                                        Potential (Y-Axis)
                                    </span>
                                </div>

                                {/* The 9 cells grid */}
                                <div className="flex-1 grid grid-cols-3 gap-4">
                                    {/* 3x3 Quadrants */}
                                    {boxCells.map((cell, idx) => {
                                        const employees = getCellEmployees(cell);
                                        const isSelected = selectedCell?.label === cell.label;
                                        
                                        return (
                                            <div 
                                                key={idx}
                                                onClick={() => setSelectedCell(cell)}
                                                className={`border rounded-2xl p-4 flex flex-col justify-between min-h-[160px] cursor-pointer transition-all duration-300 select-none ${cell.cellBg} ${
                                                    isSelected 
                                                    ? 'ring-2 ring-teal-500 scale-[1.01] shadow-lg shadow-teal-500/10 border-transparent' 
                                                    : 'hover:scale-[1.01] hover:shadow-md'
                                                }`}
                                            >
                                                {/* Header Cell Details */}
                                                <div>
                                                    <div className="flex justify-between items-start gap-2 mb-1.5">
                                                        <span className="text-[11px] font-black text-gray-800 dark:text-white leading-tight">
                                                            {cell.label}
                                                        </span>
                                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${cell.badgeColor}`}>
                                                            {employees.length}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-snug block">
                                                        {cell.desc}
                                                    </span>
                                                </div>

                                                {/* Employee Avatars Rollup */}
                                                <div className="flex flex-wrap gap-1 items-end mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                                                    {employees.slice(0, 4).map((emp) => (
                                                        <div 
                                                            key={emp.id} 
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white shadow-sm ring-1 ring-white dark:ring-gray-900 ${emp.avatarBg}`}
                                                            title={`${emp.name} (${emp.designation})`}
                                                        >
                                                            {emp.initials}
                                                        </div>
                                                    ))}
                                                    {employees.length > 4 && (
                                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 ring-1 ring-white dark:ring-gray-900">
                                                            +{employees.length - 4}
                                                        </div>
                                                    )}
                                                    {employees.length === 0 && (
                                                        <span className="text-[9px] text-gray-400 italic">No employees</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Performance X-Axis Label */}
                            <div className="flex justify-center items-center pt-2 select-none">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Performance (X-Axis)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Quadrant Detail Panel */}
                    <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6">
                        {selectedCell ? (
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm animate__animated animate__fadeInRight">
                                {/* Header Details */}
                                <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                                    <div>
                                        <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${selectedCell.badgeColor}`}>
                                            Quadrant Selected
                                        </span>
                                        <h3 className="text-lg font-black text-gray-800 dark:text-white mt-1.5">{selectedCell.label}</h3>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
                                            {selectedCell.desc}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedCell(null)}
                                        className="text-gray-400 hover:text-gray-600 text-sm font-semibold p-1"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Employee List inside selected quadrant */}
                                <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                                    {getCellEmployees(selectedCell).map((emp) => (
                                        <div 
                                            key={emp.id} 
                                            className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 p-3 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Initials Avatar */}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0 ${emp.avatarBg}`}>
                                                    {emp.initials}
                                                </div>
                                                
                                                <div>
                                                    <span className="block text-xs font-bold text-gray-800 dark:text-white leading-tight">
                                                        {emp.name}
                                                    </span>
                                                    <span className="block text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                                                        {emp.designation} • {emp.department}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Score indicators */}
                                            <div className="text-right shrink-0">
                                                <span className="block text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                                    Perf: {emp.performanceScore}%
                                                </span>
                                                <span className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mt-0.5">
                                                    Pot: {emp.potentialScore}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {getCellEmployees(selectedCell).length === 0 && (
                                        <div className="text-center py-10 text-xs text-gray-400 italic">
                                            No employees matched your active filter configuration in this quadrant.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-3xl text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                                <IconUsers className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400">Quadrant Analysis Panel</h4>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-xs mt-1.5 leading-relaxed">
                                    Click on any box in the Talent Matrix grid to view lists of employees, score breakups, and department distributions.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Development indicator */}
            <div className="flex items-center gap-2.5 px-5 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 max-w-max mx-auto mt-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400">All Performance sub-modules are under active development — Launching soon!</span>
            </div>
        </div>
    );
};

export default AdminPerformanceDashboard;
