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
}

interface Feedback {
    id: number;
    feedback_type: string;
    feedback_text: string;
    rating: number | null;
    given_by_name: string;
    created_at: string | null;
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
                                            {/* Row headings logic mapping */}
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
                                            {profile.evaluations.map(ev => (
                                                <div key={ev.id} className="border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-4">
                                                    <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-850 pb-3">
                                                        <span className="font-bold text-gray-800 dark:text-white text-xs">{ev.cycle_name}</span>
                                                        <span className="bg-teal-500/10 text-teal-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
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
                                                </div>
                                            ))}
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
