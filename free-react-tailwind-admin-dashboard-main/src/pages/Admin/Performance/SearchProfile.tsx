import { useState, useEffect } from 'react';
import axios from 'axios';
import IconSearch from '../../../components/Icon/IconSearch';
import IconUsers from '../../../components/Icon/IconUsers';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';
import IconLayoutGrid from '../../../components/Icon/IconLayoutGrid';
import IconMenuCharts from '../../../components/Icon/Menu/IconMenuCharts';

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    department: number | null;
    department_name: string | null;
    designation_name: string | null;
    reporting_manager_name: string | null;
    photo: string | null;
    avatarBg: string;
    initials: string;
}

interface KRA {
    id: number;
    kra_name: string;
    weightage: number;
    target_value: number;
    achieved_value: number;
    status: string;
}

interface Skill {
    id: number;
    skill_name: string;
    proficiency_level: string;
    status: string;
}

interface Evaluation {
    id: number;
    cycle_name: string;
    self_rating: number | null;
    manager_rating: number | null;
    final_rating: number | null;
    manager_remarks: string | null;
    answers?: {
        id: number;
        question: number;
        question_text: string;
        question_type: string;
        role_type: string;
        rating_score: number | null;
        comment: string;
    }[];
}

interface Feedback {
    id: number;
    feedback_type: string;
    feedback_text: string;
    rating: number | null;
    given_by_name: string;
    created_at: string | null;
}

interface PerfBreakdown {
    kra: { score: number | null; weight: number; items: { title: string; score: number; weightage: number; remarks: string }[] };
    appraisal: { score: number | null; weight: number; items: { cycle: string; rating: number; source: string }[] };
    feedback: { score: number | null; weight: number; items: { type: string; rating: number }[] };
}
interface PotBreakdown {
    skills:        { score: number | null; weight: number; items: { name: string; level: string; mapped: number }[] };
    self_appraisal:{ score: number | null; weight: number; items: { cycle: string; rating: number }[] };
    self_feedback: { score: number | null; weight: number; items: { type: string; rating: number; text: string }[] };
}

interface PerformanceProfile {
    kras: KRA[];
    skills: Skill[];
    evaluations: Evaluation[];
    feedbacks: Feedback[];
    nine_box: {
        performance_score: number;
        potential_score: number;
        performance_label: 'Low' | 'Medium' | 'High';
        potential_label: 'Low' | 'Medium' | 'High';
        box_title: string;
        perf_breakdown: PerfBreakdown;
        pot_breakdown: PotBreakdown;
    };
}

const SearchProfile = () => {
    // State lists
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [profile, setProfile] = useState<PerformanceProfile | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('');

    // UI Loading & Errors
    const [loadingList, setLoadingList] = useState(true);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [activeTab, setActiveTab] = useState<'matrix' | 'kras' | 'skills' | 'appraisals' | 'feedback'>('matrix');
    const [breakdownOpen, setBreakdownOpen] = useState<'perf' | 'pot' | null>(null);
    const [expandedEvalId, setExpandedEvalId] = useState<number | null>(null);
    const [evalActiveTab, setEvalActiveTab] = useState<'self' | 'manager' | 'peer' | 'hr'>('self');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        return { Authorization: `Bearer ${token}` };
    };

    // 1. Fetch employee list on mount
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoadingList(true);
                const response = await axios.get(`${API_BASE}/employee/all-employees-list/`, {
                    headers: getHeaders(),
                });
                setEmployees(response.data);
            } catch (err) {
                console.error('Error loading employees:', err);
            } finally {
                setLoadingList(false);
            }
        };
        fetchEmployees();
    }, []);

    // 2. Fetch employee performance details when clicked
    const loadPerformanceProfile = async (emp: Employee) => {
        try {
            setLoadingProfile(true);
            setSelectedEmployee(emp);
            const response = await axios.get(`${API_BASE}/employee/performance-profile/${emp.id}/`, {
                headers: getHeaders(),
            });
            setProfile(response.data);
            setActiveTab('matrix');
            setBreakdownOpen(null);
        } catch (err) {
            console.error('Error fetching performance profile:', err);
        } finally {
            setLoadingProfile(false);
        }
    };

    // Filters
    const departments = Array.from(new Set(employees.map(e => e.department_name).filter(Boolean)));
    
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (emp.designation_name && emp.designation_name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesDept = selectedDept === '' || emp.department_name === selectedDept;
        return matchesSearch && matchesDept;
    });

    // 9-Box Grid Layout Mappings
    const gridCells = [
        { key: 'High-High', label: 'Star Performer', pot: 'High', perf: 'High', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500' },
        { key: 'High-Medium', label: 'High Performer', pot: 'High', perf: 'Medium', color: 'bg-emerald-500/5 text-emerald-500 border-emerald-400/50' },
        { key: 'High-Low', label: 'Solid Performer', pot: 'High', perf: 'Low', color: 'bg-blue-500/10 text-blue-600 border-blue-400' },
        
        { key: 'Medium-High', label: 'High Potential', pot: 'Medium', perf: 'High', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500' },
        { key: 'Medium-Medium', label: 'Core Player', pot: 'Medium', perf: 'Medium', color: 'bg-slate-500/10 text-slate-600 border-slate-400' },
        { key: 'Medium-Low', label: 'Average Performer', pot: 'Medium', perf: 'Low', color: 'bg-blue-500/5 text-blue-500 border-blue-300' },
        
        { key: 'Low-High', label: 'Potential Gem', pot: 'Low', perf: 'High', color: 'bg-amber-500/10 text-amber-600 border-amber-500' },
        { key: 'Low-Medium', label: 'Inconsistent Player', pot: 'Low', perf: 'Medium', color: 'bg-rose-500/5 text-rose-500 border-rose-300' },
        { key: 'Low-Low', label: 'Risk', pot: 'Low', perf: 'Low', color: 'bg-rose-500/15 text-rose-600 border-rose-500' }
    ];

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header banner */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Search Employee Profile</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        Access individual employee performance records, KRA score indices, competencies, and 9-box matrices.
                    </p>
                </div>
                {selectedEmployee && (
                    <button
                        onClick={() => setSelectedEmployee(null)}
                        className="btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold px-4 py-2"
                    >
                        ← Back to Directory
                    </button>
                )}
            </div>

            {/* View switcher based on selection */}
            {!selectedEmployee ? (
                /* Directory Grid View */
                <div className="space-y-6">
                    {/* Filters bar */}
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative w-full md:flex-1">
                            <input 
                                type="text" 
                                placeholder="Search by name, ID, or designation..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                            />
                            <IconSearch className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        </div>
                        
                        <div className="w-full md:w-64">
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none"
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => (
                                    <option key={d} value={d || ''}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Employee Directory Grid */}
                    {loadingList ? (
                        <div className="text-center py-20 text-xs text-gray-400">Loading workspace directory...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredEmployees.map(emp => (
                                <div
                                    key={emp.id}
                                    onClick={() => loadPerformanceProfile(emp)}
                                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm hover:shadow-md hover:border-teal-500/20 cursor-pointer transition duration-300 flex flex-col justify-between"
                                >
                                    <div className="space-y-4">
                                        {/* Avatar / Photo */}
                                        <div className="flex items-center gap-3.5">
                                            {emp.photo ? (
                                                <img 
                                                    src={emp.photo} 
                                                    alt={emp.full_name} 
                                                    className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-gray-100 dark:border-gray-850"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white font-black text-sm flex items-center justify-center shadow-sm">
                                                    {emp.initials}
                                                </div>
                                            )}
                                            <div>
                                                <span className="block font-bold text-sm text-gray-800 dark:text-white leading-snug">{emp.full_name}</span>
                                                <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{emp.designation_name || 'Designation Not Set'}</span>
                                            </div>
                                        </div>

                                        {/* Meta badges */}
                                        <div className="flex flex-wrap gap-2">
                                            <span className="bg-gray-100 dark:bg-gray-850 text-gray-600 dark:text-gray-400 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg">
                                                ID: {emp.employee_id}
                                            </span>
                                            <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg">
                                                {emp.department_name || 'No Dept'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Reporting Manager */}
                                    <div className="border-t border-gray-100 dark:border-gray-850 pt-3 mt-4 flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500">
                                        <span>Reporting Mgr:</span>
                                        <span className="text-gray-700 dark:text-gray-300">
                                            {emp.reporting_manager_name || 'Not Mapped'}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {filteredEmployees.length === 0 && (
                                <div className="col-span-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-12 rounded-3xl text-center text-gray-400 italic">
                                    No employees match the filter criteria.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* Profile Workspace Details View */
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                    
                    {/* Left: Employee Profiler Card */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm text-center space-y-5">
                        <div className="flex flex-col items-center">
                            {selectedEmployee.photo ? (
                                <img 
                                    src={selectedEmployee.photo} 
                                    alt={selectedEmployee.full_name} 
                                    className="w-24 h-24 rounded-3xl object-cover shadow-md border border-gray-100 dark:border-gray-800"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-3xl bg-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md">
                                    {selectedEmployee.initials}
                                </div>
                            )}
                            <h3 className="text-base font-black text-gray-800 dark:text-white mt-4 leading-tight">{selectedEmployee.full_name}</h3>
                            <span className="text-xs text-gray-400 mt-1 block">{selectedEmployee.designation_name || 'Designation Not Set'}</span>
                            <span className="text-[10px] bg-teal-500/10 text-teal-600 px-3 py-1 rounded-full font-black uppercase tracking-wider mt-2 block w-fit">
                                {selectedEmployee.department_name || 'No Dept'}
                            </span>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-850 pt-4 space-y-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                            <div className="flex justify-between">
                                <span>Employee ID:</span>
                                <span className="text-gray-800 dark:text-white font-bold">{selectedEmployee.employee_id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Manager:</span>
                                <span className="text-gray-800 dark:text-white font-bold">{selectedEmployee.reporting_manager_name || 'Not Mapped'}</span>
                            </div>
                            {profile && (
                                <div className="flex justify-between items-center pt-2">
                                    <span>Talent 9-Box:</span>
                                    <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                        {profile.nine_box.box_title}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex flex-col gap-2 pt-2">
                            {[
                                { key: 'matrix', label: '9-Box Matrix', icon: IconLayoutGrid },
                                { key: 'kras', label: 'KRAs & Goals', icon: IconTrendingUp },
                                { key: 'skills', label: 'Skills Inventory', icon: IconUsers },
                                { key: 'appraisals', label: 'Appraisal Reviews', icon: IconMenuCharts },
                                { key: 'feedback', label: 'Continuous Feedback', icon: IconUsers }
                            ].map(tab => {
                                const Icon = tab.icon;
                                const isCurrent = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key as any)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition duration-200 ${
                                            isCurrent 
                                            ? 'bg-teal-500 text-white shadow-md shadow-teal-500/10' 
                                            : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Detailed Tab Content Panel */}
                    <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-6 min-h-[500px]">
                        {loadingProfile ? (
                            <div className="flex items-center justify-center h-96 text-xs text-gray-400">Loading folder data...</div>
                        ) : profile ? (
                            <>
                                {/* 9-Box Matrix Tab */}
                                {activeTab === 'matrix' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-black text-gray-800 dark:text-white">Performance-Potential 9-Box Grid</h3>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                                Positioning derived from appraisal ratings (Performance) and skills matrix (Potential).
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto border border-gray-200 dark:border-gray-800 p-3 rounded-2xl bg-gray-50 dark:bg-gray-850/30">
                                            {gridCells.map((cell) => {
                                                const isCurrent = profile.nine_box.performance_label === cell.perf && profile.nine_box.potential_label === cell.pot;
                                                return (
                                                    <div
                                                        key={cell.key}
                                                        className={`border p-4 rounded-xl flex flex-col justify-between items-center text-center h-28 transition duration-200 select-none ${
                                                            isCurrent
                                                            ? `${cell.color} border-2 shadow-sm font-black`
                                                            : 'bg-white dark:bg-gray-900 text-gray-400 border-gray-100 dark:border-gray-800 text-[10px] font-semibold'
                                                        }`}
                                                    >
                                                        <span className="block text-[8px] uppercase tracking-wider text-gray-400">
                                                            {cell.pot} / {cell.perf}
                                                        </span>
                                                        <span className="block text-xs font-black">{cell.label}</span>
                                                        {isCurrent ? (
                                                            <span className="text-[8px] bg-teal-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                Positioned
                                                            </span>
                                                        ) : <div className="h-3" />}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Score Chips + Breakdown */}
                                        {(() => {
                                            const pb = profile.nine_box.perf_breakdown;
                                            const potb = profile.nine_box.pot_breakdown;
                                            const activeW = [pb.kra.score !== null ? pb.kra.weight : 0, pb.appraisal.score !== null ? pb.appraisal.weight : 0, pb.feedback.score !== null ? pb.feedback.weight : 0].reduce((a, b) => a + b, 0);

                                            const SectionHeader = ({ label, weight, score, color }: { label: string; weight: number; score: number | null; color: string }) => (
                                                <div className={`flex items-center justify-between px-4 py-2 bg-${color}-50 dark:bg-${color}-950/20`}>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider text-${color}-700 dark:text-${color}-400`}>{label}</span>
                                                    {score !== null ? (
                                                        <span className={`text-[10px] font-black bg-${color}-100 dark:bg-${color}-950/50 text-${color}-700 dark:text-${color}-300 px-2 py-0.5 rounded-full`}>
                                                            {weight}% → {score.toFixed(2)} pts
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-gray-400 italic">No data — not factored in</span>
                                                    )}
                                                </div>
                                            );

                                            return (
                                                <div className="space-y-3 pt-2">
                                                    <div className="flex gap-3">
                                                        <button onClick={() => setBreakdownOpen(breakdownOpen === 'perf' ? null : 'perf')}
                                                            className={`flex-1 flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-bold transition ${breakdownOpen === 'perf' ? 'bg-teal-500 text-white border-teal-500 shadow-md' : 'bg-gray-50 dark:bg-gray-850 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-teal-400'}`}>
                                                            <div>
                                                                <span className="block">Perf Score</span>
                                                                <span className={`text-[9px] font-bold ${breakdownOpen === 'perf' ? 'text-teal-100' : 'text-gray-400'}`}>KRA · Appraisal · Feedback</span>
                                                            </div>
                                                            <span className="flex items-center gap-1.5">
                                                                <span className={`text-base font-black ${breakdownOpen === 'perf' ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`}>{profile.nine_box.performance_score.toFixed(1)}</span>
                                                                <span className={`text-[10px] ${breakdownOpen === 'perf' ? 'text-teal-100' : 'text-gray-400'}`}>/ 5 {breakdownOpen === 'perf' ? '▲' : '▼'}</span>
                                                            </span>
                                                        </button>
                                                        <button onClick={() => setBreakdownOpen(breakdownOpen === 'pot' ? null : 'pot')}
                                                            className={`flex-1 flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-bold transition ${breakdownOpen === 'pot' ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-gray-50 dark:bg-gray-850 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-400'}`}>
                                                            <div>
                                                                <span className="block">Potential Score</span>
                                                                <span className={`text-[9px] font-bold ${breakdownOpen === 'pot' ? 'text-indigo-100' : 'text-gray-400'}`}>Skills · Self-Rating</span>
                                                            </div>
                                                            <span className="flex items-center gap-1.5">
                                                                <span className={`text-base font-black ${breakdownOpen === 'pot' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>{profile.nine_box.potential_score.toFixed(1)}</span>
                                                                <span className={`text-[10px] ${breakdownOpen === 'pot' ? 'text-indigo-100' : 'text-gray-400'}`}>/ 5 {breakdownOpen === 'pot' ? '▲' : '▼'}</span>
                                                            </span>
                                                        </button>
                                                    </div>

                                                    {/* Perf Breakdown */}
                                                    {breakdownOpen === 'perf' && (
                                                        <div className="border border-teal-200 dark:border-teal-900/50 rounded-2xl overflow-hidden text-xs">
                                                            <div className="bg-teal-50 dark:bg-teal-950/30 px-4 py-2.5 flex items-center justify-between">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">Performance Score Breakdown</span>
                                                                <span className="text-[10px] text-teal-500 font-bold">Blended from {activeW}% active weight</span>
                                                            </div>

                                                            {/* KRA Section */}
                                                            <SectionHeader label="KRA Evaluations" weight={pb.kra.weight} score={pb.kra.score} color="teal" />
                                                            <div className="divide-y divide-gray-50 dark:divide-gray-800/60 px-4">
                                                                {pb.kra.items.length === 0 ? (
                                                                    <p className="text-[11px] text-gray-400 italic py-3">No KRA evaluations submitted yet.</p>
                                                                ) : pb.kra.items.map((item, i) => (
                                                                    <div key={i} className="flex items-center gap-3 py-2.5">
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="block font-bold text-gray-800 dark:text-white truncate">{item.title}</span>
                                                                            {item.remarks && <span className="text-[10px] text-gray-400 italic truncate block">"{item.remarks}"</span>}
                                                                        </div>
                                                                        <span className="text-[9px] text-gray-400 shrink-0">{item.weightage}% wt</span>
                                                                        <div className="w-16 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shrink-0">
                                                                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(item.score / 5) * 100}%` }} />
                                                                        </div>
                                                                        <span className="font-black text-teal-600 dark:text-teal-400 w-8 text-right shrink-0">{item.score.toFixed(1)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Appraisal Section */}
                                                            <SectionHeader label="Appraisal Ratings" weight={pb.appraisal.weight} score={pb.appraisal.score} color="emerald" />
                                                            <div className="divide-y divide-gray-50 dark:divide-gray-800/60 px-4">
                                                                {pb.appraisal.items.length === 0 ? (
                                                                    <p className="text-[11px] text-gray-400 italic py-3">No HR / Manager ratings recorded.</p>
                                                                ) : pb.appraisal.items.map((item, i) => (
                                                                    <div key={i} className="flex items-center gap-3 py-2.5">
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="block font-bold text-gray-800 dark:text-white truncate">{item.cycle}</span>
                                                                            <span className="text-[9px] text-gray-400 uppercase">{item.source} Rating</span>
                                                                        </div>
                                                                        <div className="w-16 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shrink-0">
                                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(item.rating / 5) * 100}%` }} />
                                                                        </div>
                                                                        <span className="font-black text-emerald-600 dark:text-emerald-400 w-8 text-right shrink-0">{item.rating.toFixed(1)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Feedback Section */}
                                                            <SectionHeader label="Continuous Feedback" weight={pb.feedback.weight} score={pb.feedback.score} color="purple" />
                                                            <div className="divide-y divide-gray-50 dark:divide-gray-800/60 px-4">
                                                                {pb.feedback.items.length === 0 ? (
                                                                    <p className="text-[11px] text-gray-400 italic py-3">No rated feedback received.</p>
                                                                ) : pb.feedback.items.map((item, i) => (
                                                                    <div key={i} className="flex items-center gap-3 py-2.5">
                                                                        <span className="flex-1 font-semibold text-gray-700 dark:text-gray-300 truncate">{item.type}</span>
                                                                        <span className="text-amber-400 text-[10px]">{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span>
                                                                        <span className="font-black text-purple-600 dark:text-purple-400 w-8 text-right shrink-0">{item.rating}.0</span>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div className="px-4 py-3 bg-teal-50/50 dark:bg-teal-950/20 flex items-center justify-between border-t border-teal-100 dark:border-teal-900/30">
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">Blended Perf Score</span>
                                                                <span className="text-sm font-black text-teal-600 dark:text-teal-400">{profile.nine_box.performance_score.toFixed(2)} / 5.00</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Potential Breakdown */}
                                                    {breakdownOpen === 'pot' && (
                                                        <div className="border border-indigo-200 dark:border-indigo-900/50 rounded-2xl overflow-hidden text-xs">
                                                            <div className="bg-indigo-50 dark:bg-indigo-950/30 px-4 py-2.5 flex items-center justify-between">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">Potential Score Breakdown</span>
                                                                <span className="text-[10px] text-indigo-500 font-bold">Skills 60% · Self-Appraisal 24% · Self-Feedback 16%</span>
                                                            </div>

                                                            {/* Skills */}
                                                            <SectionHeader label="Skills Proficiency" weight={potb.skills.weight} score={potb.skills.score} color="indigo" />
                                                            <div className="divide-y divide-gray-50 dark:divide-gray-800/60 px-4">
                                                                {potb.skills.items.length === 0 ? (
                                                                    <p className="text-[11px] text-gray-400 italic py-3">No skills added — add skills in the Skills tab to improve this score.</p>
                                                                ) : potb.skills.items.map((s, i) => (
                                                                    <div key={i} className="flex items-center gap-2 py-2.5">
                                                                        <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                                                                        <span className="flex-1 font-semibold text-gray-700 dark:text-gray-300">{s.name}</span>
                                                                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full ${s.level?.toLowerCase() === 'expert' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : s.level?.toLowerCase() === 'intermediate' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400' : 'bg-gray-100 text-gray-500'}`}>{s.level || '—'}</span>
                                                                        <div className="w-16 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shrink-0">
                                                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(s.mapped / 5) * 100}%` }} />
                                                                        </div>
                                                                        <span className="font-black text-indigo-600 dark:text-indigo-400 w-8 text-right shrink-0">{s.mapped.toFixed(1)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Self Appraisal */}
                                                            <SectionHeader label="Self Appraisal" weight={potb.self_appraisal.weight} score={potb.self_appraisal.score} color="violet" />
                                                            <div className="divide-y divide-gray-50 dark:divide-gray-800/60 px-4">
                                                                {potb.self_appraisal.items.length === 0 ? (
                                                                    <p className="text-[11px] text-gray-400 italic py-3">No self-appraisal submitted yet — complete a self-appraisal cycle.</p>
                                                                ) : potb.self_appraisal.items.map((r, i) => (
                                                                    <div key={i} className="flex items-center gap-3 py-2.5">
                                                                        <span className="flex-1 font-semibold text-gray-700 dark:text-gray-300">{r.cycle}</span>
                                                                        <div className="w-16 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shrink-0">
                                                                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(r.rating / 5) * 100}%` }} />
                                                                        </div>
                                                                        <span className="font-black text-violet-600 dark:text-violet-400 w-8 text-right shrink-0">{r.rating.toFixed(1)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Self Feedback */}
                                                            <SectionHeader label="Self Assessment Notes" weight={potb.self_feedback.weight} score={potb.self_feedback.score} color="fuchsia" />
                                                            <div className="divide-y divide-gray-50 dark:divide-gray-800/60 px-4">
                                                                {potb.self_feedback.items.length === 0 ? (
                                                                    <p className="text-[11px] text-gray-400 italic py-3">No self-assessment notes — log reflections from Feedback Provided page.</p>
                                                                ) : potb.self_feedback.items.map((f, i) => (
                                                                    <div key={i} className="py-2.5">
                                                                        <div className="flex items-center gap-3 mb-1">
                                                                            <span className="flex-1 font-semibold text-gray-700 dark:text-gray-300 text-[10px] uppercase tracking-wider">{f.type}</span>
                                                                            <span className="text-amber-400 text-[10px]">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                                                                            <span className="font-black text-fuchsia-600 dark:text-fuchsia-400 w-8 text-right shrink-0">{f.rating}.0</span>
                                                                        </div>
                                                                        {f.text && <p className="text-[10px] text-gray-400 italic truncate">"{f.text}"</p>}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div className="px-4 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-between border-t border-indigo-100 dark:border-indigo-900/30">
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Blended Potential Score</span>
                                                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{profile.nine_box.potential_score.toFixed(2)} / 5.00</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* KRAs Tab */}
                                {activeTab === 'kras' && (
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-gray-800 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
                                            Key Result Areas (KRAs)
                                        </h3>
                                        
                                        <div className="table-responsive border border-gray-100 dark:border-gray-800 rounded-2xl">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 dark:bg-gray-800/40 text-[9px] font-black uppercase text-gray-400 tracking-wider">
                                                        <th className="p-3 pl-4">KRA Metric Name</th>
                                                        <th className="p-3">Weight</th>
                                                        <th className="p-3">Target</th>
                                                        <th className="p-3">Achieved</th>
                                                        <th className="p-3">Progress</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    {profile.kras.map(k => {
                                                        const progress = k.target_value > 0 ? (k.achieved_value / k.target_value) * 100 : 0;
                                                        return (
                                                            <tr key={k.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-805">
                                                                <td className="p-3 pl-4 font-bold text-gray-800 dark:text-white">{k.kra_name}</td>
                                                                <td className="p-3">{k.weightage}%</td>
                                                                <td className="p-3">{k.target_value}</td>
                                                                <td className="p-3">{k.achieved_value}</td>
                                                                <td className="p-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-20 bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden shrink-0">
                                                                            <div className="bg-teal-500 h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                                                                        </div>
                                                                        <span className="font-bold">{progress.toFixed(0)}%</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {profile.kras.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-8 text-gray-400 italic">No KRAs assigned yet.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Skills Tab */}
                                {activeTab === 'skills' && (
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-gray-800 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
                                            Skills & Proficiency Inventory
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {profile.skills.map(s => (
                                                <div key={s.id} className="border border-gray-100 dark:border-gray-800 p-4 rounded-2xl flex justify-between items-center bg-gray-50/30 dark:bg-gray-850/10">
                                                    <div>
                                                        <span className="block font-bold text-gray-800 dark:text-white">{s.skill_name}</span>
                                                        <span className="block text-[9px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider font-extrabold">Status: {s.status}</span>
                                                    </div>
                                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                                        s.proficiency_level === 'Expert' 
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                        : s.proficiency_level === 'Intermediate'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                                                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {s.proficiency_level}
                                                    </span>
                                                </div>
                                            ))}
                                            {profile.skills.length === 0 && (
                                                <div className="col-span-full text-center py-8 text-gray-400 italic">No skills inventory recorded.</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Appraisals Tab */}
                                {activeTab === 'appraisals' && (
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-gray-800 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
                                            Appraisal History
                                        </h3>
                                        
                                        <div className="space-y-4">
                                            {profile.evaluations.map(ev => {
                                                const isExpanded = expandedEvalId === ev.id;
                                                const ROLE_META = {
                                                    self: { label: 'Self Appraisal', icon: '👤' },
                                                    manager: { label: 'Manager Evaluation', icon: '👔' },
                                                    peer: { label: 'Peer Reviews', icon: '🤝' },
                                                    hr: { label: 'Admin/HR Review', icon: '🛡️' },
                                                };

                                                return (
                                                    <div key={ev.id} className="border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-4">
                                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-50 dark:border-gray-850 pb-3 gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-800 dark:text-white text-xs">{ev.cycle_name}</span>
                                                                <button type="button" onClick={() => {
                                                                    setExpandedEvalId(prev => {
                                                                        if (prev === ev.id) return null;
                                                                        setEvalActiveTab('self');
                                                                        return ev.id;
                                                                    });
                                                                }}
                                                                    className="px-2.5 py-1 text-[9px] font-bold text-teal-600 dark:text-teal-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition border border-teal-500/20">
                                                                    {isExpanded ? 'Hide Details ▲' : 'View Full Details ▼'}
                                                                </button>
                                                            </div>
                                                            <span className="bg-teal-500/10 text-teal-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider self-start sm:self-auto">
                                                                Final Score: {ev.final_rating ? ev.final_rating.toFixed(2) : 'Awaiting Review'}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                                                            <div className="bg-gray-50 dark:bg-gray-850/50 p-3 rounded-xl">
                                                                <span className="block text-[9px] uppercase tracking-wider text-gray-400 mb-1">Self Assessment Score</span>
                                                                <span className="text-gray-800 dark:text-white font-bold">{ev.self_rating || 'N/A'} / 5.00</span>
                                                            </div>
                                                            <div className="bg-gray-50 dark:bg-gray-850/50 p-3 rounded-xl">
                                                                <span className="block text-[9px] uppercase tracking-wider text-gray-400 mb-1">Manager Assessment Score</span>
                                                                <span className="text-gray-800 dark:text-white font-bold">{ev.manager_rating || 'N/A'} / 5.00</span>
                                                            </div>
                                                        </div>

                                                        <div className="text-xs">
                                                            <span className="block text-[9px] uppercase tracking-wider text-gray-400 mb-1">Manager Remarks / Feedback</span>
                                                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium bg-gray-50/50 dark:bg-gray-850/20 p-3.5 rounded-xl">
                                                                {ev.manager_remarks || 'No remarks provided.'}
                                                            </p>
                                                        </div>

                                                        {/* Detailed Response Log Section */}
                                                        {isExpanded && ev.answers && (
                                                            <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-4 animate__animated animate__fadeIn">
                                                                <div className="flex gap-2 mb-4 shrink-0 flex-wrap">
                                                                    {(['self', 'manager', 'peer', 'hr'] as const).map(role => {
                                                                        const roleAnsCount = ev.answers?.filter(ans => ans.role_type === role).length ?? 0;
                                                                        const isTabActive = evalActiveTab === role;
                                                                        const meta = ROLE_META[role];
                                                                        return (
                                                                            <button key={role} type="button" onClick={() => setEvalActiveTab(role)}
                                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                                                                                    isTabActive 
                                                                                        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/10' 
                                                                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-755'
                                                                                }`}>
                                                                                <span>{meta.icon}</span>
                                                                                <span>{meta.label}</span>
                                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                                                                    isTabActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                                                                }`}>{roleAnsCount}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {(() => {
                                                                    const roleAnswers = ev.answers?.filter(ans => ans.role_type === evalActiveTab) ?? [];
                                                                    if (roleAnswers.length === 0) {
                                                                        return (
                                                                            <div className="text-center py-8 text-xs text-gray-400 italic bg-gray-50 dark:bg-gray-850/20 rounded-2xl border border-dashed border-gray-100 dark:border-gray-800">
                                                                                No evaluation responses recorded under {ROLE_META[evalActiveTab].label} for this cycle.
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <div className="space-y-3">
                                                                            {roleAnswers.map((ans, idx) => {
                                                                                const isYes = ans.rating_score === 1 || ans.rating_score === 5;
                                                                                return (
                                                                                    <div key={ans.id || idx} className="bg-gray-55 dark:bg-gray-850/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-850 space-y-2">
                                                                                        <div className="flex justify-between items-start gap-3">
                                                                                            <div className="flex gap-2">
                                                                                                <span className="text-xs font-bold text-gray-400 mt-0.5">{idx + 1}.</span>
                                                                                                <p className="text-xs font-bold text-gray-850 dark:text-gray-200">
                                                                                                    {ans.question_text}
                                                                                                </p>
                                                                                            </div>
                                                                                            {ans.rating_score !== null && ans.question_type !== 'text' && (
                                                                                                <span className={`text-[11px] font-black shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full ${
                                                                                                    ans.question_type === 'yes_no'
                                                                                                        ? isYes
                                                                                                            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/10'
                                                                                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10'
                                                                                                        : 'text-amber-500 bg-amber-500/5 border border-amber-500/10'
                                                                                                }`}>
                                                                                                    {ans.question_type === 'yes_no'
                                                                                                        ? isYes ? 'Yes' : 'No'
                                                                                                        : `★ ${ans.rating_score} / 5`
                                                                                                    }
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {ans.comment && (
                                                                                            <div className="pl-4 border-l-2 border-teal-500/20 text-[11px] text-gray-500 dark:text-gray-400 italic">
                                                                                                "{ans.comment}"
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {profile.evaluations.length === 0 && (
                                                <div className="text-center py-8 text-gray-400 italic">No appraisal review records found.</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Feedback Tab */}
                                {activeTab === 'feedback' && (
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-gray-800 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
                                            Continuous Feedback Logs
                                        </h3>
                                        
                                        <div className="relative border-l border-gray-100 dark:border-gray-850 pl-6 ml-3 space-y-6 py-2">
                                            {profile.feedbacks.map(f => (
                                                <div key={f.id} className="relative space-y-1.5">
                                                    {/* Timeline node */}
                                                    <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-teal-500 border-2 border-white dark:border-gray-900" />
                                                    
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-[10px] text-gray-400 font-bold">{f.created_at || 'Date Not Set'}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                            f.feedback_type === 'Praise' 
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                                                        }`}>
                                                            {f.feedback_type}
                                                        </span>
                                                        {f.rating ? (
                                                            <span className="text-[11px] text-amber-400 font-bold leading-none">
                                                                {'★'.repeat(f.rating)}<span className="text-gray-300 dark:text-gray-600">{'★'.repeat(5 - f.rating)}</span>
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                                                        "{f.feedback_text}"
                                                    </p>
                                                    
                                                    <span className="block text-[9px] text-gray-400">
                                                        Given by: <strong className="text-gray-600 dark:text-gray-300">{f.given_by_name}</strong>
                                                    </span>
                                                </div>
                                            ))}
                                            {profile.feedbacks.length === 0 && (
                                                <div className="text-center py-8 text-gray-400 italic -ml-6">No continuous feedback records found.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-96 text-xs text-rose-500 font-bold">Failed to load performance data.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchProfile;
