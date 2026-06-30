import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface KRA {
    id: number;
    employee: number;
    kra_master: number;
    kra_title: string;
    kra_description: string;
    reviewer_name: string | null;
    weightage: number;
    target_description: string;
    created_at: string;
}

const KRAs = () => {
    const dispatch = useDispatch();
    const [kras, setKras] = useState<KRA[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    useEffect(() => {
        dispatch(setPageTitle('My Key Result Areas'));
        fetchEmployeeKRAs();
    }, [dispatch]);

    const fetchEmployeeKRAs = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch employee ID
            const idRes = await axios.get(`${API_BASE}/employee/employee-id/`, { headers: headers() });
            const empId = idRes.data?.id;
            if (!empId) {
                setLoading(false);
                return;
            }

            // 2. Fetch assigned KRAs for the logged-in employee
            const kraRes = await axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${empId}`, { headers: headers() });
            setKras(asArray(kraRes.data));

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to load assigned KRAs.');
        } finally {
            setLoading(false);
        }
    };

    const totalWeight = useMemo(() => kras.reduce((sum, k) => sum + k.weightage, 0), [kras]);

    if (loading) {
        return (
            <div className="space-y-6 py-2 animate-pulse">
                <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="h-36 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="text-rose-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Error Loading KRAs</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                <button
                    onClick={fetchEmployeeKRAs}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md"
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
                    <div className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 mb-1">Performance Criteria</div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Designation Key Result Areas</h2>
                    <p className="text-xs text-gray-450 mt-0.5">Understand your assigned Key Result Areas mapping out the primary operational expectations.</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/employee/performance/self-map-kras"
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10"
                    >
                        Propose Self-Map KRA
                    </Link>
                    <Link
                        to="/employee/performance"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition whitespace-nowrap"
                    >
                        ← Back
                    </Link>
                </div>
            </div>

            {/* Total weight check banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-black text-teal-600 dark:text-teal-400 leading-none mb-1">{kras.length}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">KRAs Mapped</div>
                    </div>
                    <span className="text-2xl">📋</span>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-black text-indigo-650 dark:text-indigo-400 leading-none mb-1">{totalWeight}%</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Weightage Sum</div>
                    </div>
                    {totalWeight !== 100 ? (
                        <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-500/15 px-3 py-1 rounded-full animate-pulse border border-amber-500/20">
                            Warning: Must sum to 100%
                        </span>
                    ) : (
                        <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/20">
                            Balanced
                        </span>
                    )}
                </div>
            </div>

            {/* KRAs list cards */}
            {kras.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-14 text-center">
                    <div className="text-5xl mb-3">📋</div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">No KRAs assigned</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Submit a self-mapping request or contact HR to map your role goals.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {kras.map((k) => (
                        <div
                            key={k.id}
                            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4"
                        >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-50 dark:border-gray-850 pb-3">
                                <div>
                                    <h3 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2">
                                        {k.kra_title}
                                        <span className="text-[9px] font-black uppercase text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full">
                                            {k.weightage}% weightage
                                        </span>
                                    </h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Assigned Reviewer: {k.reviewer_name || 'Designated Manager'}</p>
                                </div>
                                <span className="text-[9px] text-gray-450">Linked on {new Date(k.created_at).toLocaleDateString('en-IN')}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[8px] font-black uppercase tracking-wider text-gray-400">KRA Core Focus Description</label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50/50 dark:bg-gray-850/50 p-3.5 rounded-2xl">
                                        {k.kra_description || 'Operational and execution targets as mapped by role.'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[8px] font-black uppercase tracking-wider text-gray-400">Target Milestones Description</label>
                                    <p className="text-xs text-gray-800 dark:text-white font-semibold leading-relaxed bg-teal-500/5 p-3.5 rounded-2xl border border-teal-500/10">
                                        {k.target_description || 'Achieve objectives as per designated KPIs.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KRAs;
