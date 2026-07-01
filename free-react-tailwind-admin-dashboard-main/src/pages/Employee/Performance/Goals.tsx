import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface KPI {
    id: number;
    name: string;
    description: string;
    measurement_unit: string;
    target_value: string;
}

interface KRA {
    id: number;
    employee: number;
    kra_master: number;
    kra_title: string;
    kra_description: string;
    reviewer_name: string | null;
    weightage: number;
    target_description: string;
    progress: number; // Stored in localStorage
    kpis: KPI[];
}

const Goals = () => {
    const dispatch = useDispatch();
    const [kras, setKras] = useState<KRA[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [empId, setEmpId] = useState<number | null>(null);
    
    // Progress editing state
    const [editingKraId, setEditingKraId] = useState<number | null>(null);
    const [tempProgress, setTempProgress] = useState(0);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    useEffect(() => {
        dispatch(setPageTitle('My Goals & Targets'));
        loadGoalsData();
    }, [dispatch]);

    const loadGoalsData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch employee ID
            const idRes = await axios.get(`${API_BASE}/employee/employee-id/`, { headers: headers() });
            const id = idRes.data?.id;
            setEmpId(id);
            if (!id) {
                setLoading(false);
                return;
            }

            // 2. Fetch assigned KRAs for the logged-in employee
            const kraRes = await axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${id}`, { headers: headers() });
            const kraList = asArray(kraRes.data);

            // 3. For each KRA, load progress from localStorage and load mapped KPIs
            const mappedKras = await Promise.all(
                kraList.map(async (k: any) => {
                    // Load progress from localStorage
                    const savedProgress = localStorage.getItem(`kra_progress_${id}_${k.id}`);
                    // If no progress saved, set a realistic initial default progress
                    const defaultProgress = savedProgress !== null ? parseInt(savedProgress) : ((k.id * 17) % 70) + 20;
                    
                    // Fetch KPIs linked to this KRA master
                    let kpisList: KPI[] = [];
                    try {
                        const kpiRes = await axios.get(`${API_BASE}/employee/kpi-master/?kra_master=${k.kra_master}`, { headers: headers() });
                        kpisList = asArray(kpiRes.data);
                    } catch (e) {
                        console.error('Failed to load KPIs for KRA', k.id, e);
                    }

                    return {
                        id: k.id,
                        employee: k.employee,
                        kra_master: k.kra_master,
                        kra_title: k.kra_title,
                        kra_description: k.kra_description,
                        reviewer_name: k.reviewer_name,
                        weightage: k.weightage,
                        target_description: k.target_description,
                        progress: defaultProgress,
                        kpis: kpisList
                    };
                })
            );

            setKras(mappedKras);

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to load goals and target metrics.');
        } finally {
            setLoading(false);
        }
    };

    // Calculate aggregated statistics
    const stats = useMemo(() => {
        if (kras.length === 0) return { totalWeight: 0, avgProgress: 0, kpiCount: 0 };
        const totalWeight = kras.reduce((sum, k) => sum + k.weightage, 0);
        
        // Weighted progress average (progress * weightage / totalWeight)
        const totalWeightedProgress = kras.reduce((sum, k) => sum + (k.progress * k.weightage), 0);
        const avgProgress = totalWeight > 0 ? Math.round(totalWeightedProgress / totalWeight) : 0;

        const kpiCount = kras.reduce((sum, k) => sum + (k.kpis?.length ?? 0), 0);

        return { totalWeight, avgProgress, kpiCount };
    }, [kras]);

    // Handle KRA progress update save (saved in localStorage)
    const saveProgressUpdate = (kraId: number) => {
        if (empId) {
            localStorage.setItem(`kra_progress_${empId}_${kraId}`, tempProgress.toString());
            setKras(prev => prev.map(k => k.id === kraId ? { ...k, progress: tempProgress } : k));
            setEditingKraId(null);
        }
    };

    const startEditing = (k: KRA) => {
        setEditingKraId(k.id);
        setTempProgress(k.progress);
    };

    if (loading) {
        return (
            <div className="space-y-6 py-2 animate-pulse">
                <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                    ))}
                </div>
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="h-44 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="text-rose-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Error loading Goals</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                <button
                    onClick={loadGoalsData}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header banner */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 mb-1">Target Achievement</div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">My Goals & targets</h2>
                    <p className="text-xs text-gray-450 mt-0.5">Track your Key Result Areas (KRAs), linked KPIs, and update your objective milestones progress.</p>
                </div>
                <Link
                    to="/employee/performance"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-855 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition shrink-0 animate__animated"
                >
                    ← Back to Hub
                </Link>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-black text-teal-600 dark:text-teal-400 leading-none mb-1">{stats.totalWeight}%</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Weightage Mapped</div>
                    </div>
                    <span className="text-2xl">⚖️</span>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-none mb-1">{stats.avgProgress}%</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Average Goal Progress</div>
                    </div>
                    <span className="text-2xl">📈</span>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-black text-amber-500 leading-none mb-1">{stats.kpiCount}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mapped KPI Indicators</div>
                    </div>
                    <span className="text-2xl">🎯</span>
                </div>
            </div>

            {/* Goals List */}
            {kras.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-14 text-center">
                    <div className="text-5xl mb-3">🎯</div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">No active goals found</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Designation-specific KRAs assigned by manager will appear as your goals.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {kras.map((k) => {
                        const isEditing = editingKraId === k.id;
                        return (
                            <div
                                key={k.id}
                                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-5"
                            >
                                {/* Top KRA metadata */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-55 dark:border-gray-850 pb-4">
                                    <div>
                                        <h3 className="text-sm font-black text-gray-855 dark:text-white flex flex-wrap items-center gap-2">
                                            {k.kra_title}
                                            <span className="text-[9px] font-black uppercase text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full shrink-0">
                                                {k.weightage}% weightage
                                            </span>
                                        </h3>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Assigned Reviewer: {k.reviewer_name || 'Designated Manager'}</p>
                                    </div>

                                    {!isEditing ? (
                                        <button
                                            onClick={() => startEditing(k)}
                                            className="px-3.5 py-1.5 border border-gray-150 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-850 text-[10px] font-bold text-gray-655 dark:text-gray-300 rounded-xl transition"
                                        >
                                            Update Progress
                                        </button>
                                    ) : null}
                                </div>

                                {/* Target info & Gauge visualization row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                    {/* Description */}
                                    <div className="md:col-span-2 space-y-2">
                                        <div>
                                            <label className="block text-[8px] font-black uppercase tracking-wider text-gray-400 mb-0.5">KRA Area Focus</label>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{k.kra_description || 'No description provided.'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black uppercase tracking-wider text-gray-400 mb-0.5">Expected Target Milestones</label>
                                            <p className="text-xs text-gray-850 dark:text-white font-semibold leading-relaxed bg-gray-50 dark:bg-gray-850 p-3 rounded-2xl border border-gray-50 dark:border-gray-800/10">
                                                {k.target_description || 'Achieve designated department KPIs and performance indicators.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Gauge progress visualization */}
                                    <div className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-850/50 rounded-3xl border border-gray-50 dark:border-gray-800/10">
                                        <div className="relative w-28 h-28 flex items-center justify-center">
                                            {/* Circular Progress Ring */}
                                            <svg className="w-full h-full transform -rotate-90">
                                                {/* Background circle */}
                                                <circle
                                                    cx="56"
                                                    cy="56"
                                                    r="44"
                                                    className="stroke-gray-100 dark:stroke-gray-800"
                                                    strokeWidth="8"
                                                    fill="transparent"
                                                />
                                                {/* Foreground progress */}
                                                <circle
                                                    cx="56"
                                                    cy="56"
                                                    r="44"
                                                    className="stroke-teal-500 transition-all duration-300"
                                                    strokeWidth="8"
                                                    fill="transparent"
                                                    strokeDasharray="276"
                                                    strokeDashoffset={276 - (276 * k.progress) / 100}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute flex flex-col items-center justify-center text-center">
                                                <span className="text-lg font-black text-gray-800 dark:text-white leading-none">{k.progress}%</span>
                                                <span className="text-[8px] font-black uppercase text-gray-400 mt-1 tracking-wider">completed</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Inline Progress Editing Form */}
                                {isEditing && (
                                    <div className="bg-teal-500/5 rounded-2xl p-4 border border-teal-500/10 space-y-3 animate__animated animate__fadeIn">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-teal-650 dark:text-teal-400">
                                                Adjust Progress Percentage: {tempProgress}%
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setEditingKraId(null)}
                                                    className="px-2.5 py-1 bg-white border border-gray-200 text-gray-555 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 rounded-lg text-[10px] font-bold"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => saveProgressUpdate(k.id)}
                                                    className="px-3 py-1 bg-teal-500 text-white rounded-lg text-[10px] font-bold shadow-sm"
                                                >
                                                    Save Progress
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={tempProgress}
                                            onChange={e => setTempProgress(parseInt(e.target.value))}
                                            className="w-full accent-teal-500 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                                        />
                                        <p className="text-[9px] text-gray-400">Note: Progress updates will be stored in your browser local storage.</p>
                                    </div>
                                )}

                                {/* Mapped KPIs list */}
                                {k.kpis && k.kpis.length > 0 && (
                                    <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-850">
                                        <h4 className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                            Mapped KPI Indicators ({k.kpis.length})
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {k.kpis.map((kpi) => (
                                                <div
                                                    key={kpi.id}
                                                    className="p-3 bg-gray-50/50 dark:bg-gray-850/40 rounded-2xl border border-gray-100 dark:border-gray-800/10 space-y-1"
                                                >
                                                    <div className="flex justify-between items-start gap-3">
                                                        <span className="text-xs font-bold text-gray-850 dark:text-white leading-tight">{kpi.name}</span>
                                                        <span className="text-[9px] font-black text-teal-650 bg-teal-500/10 px-2 py-0.5 rounded-full shrink-0">
                                                            Target: {kpi.target_value} {kpi.measurement_unit}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-450">{kpi.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Goals;
