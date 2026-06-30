import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface KRAMaster {
    id: number;
    title: string;
    description: string;
}

interface LinkedKRA {
    id: number;
    kra_master: number;
    kra_title: string;
    weightage: number;
    target_description: string;
}

const SelfMapKRAs = () => {
    const dispatch = useDispatch();
    
    const [kraMasters, setKraMasters] = useState<KRAMaster[]>([]);
    const [linkedKras, setLinkedKras] = useState<LinkedKRA[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [empId, setEmpId] = useState<number | null>(null);

    // Form inputs
    const [selectedMasterId, setSelectedMasterId] = useState('');
    const [weightage, setWeightage] = useState('20');
    const [targetDesc, setTargetDesc] = useState('');
    
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    useEffect(() => {
        dispatch(setPageTitle('Self-Map KRAs'));
        loadSelfMappingData();
    }, [dispatch]);

    const loadSelfMappingData = async () => {
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

            // 2. Fetch templates (KRA masters)
            const masterRes = await axios.get(`${API_BASE}/employee/kra-master/`, { headers: headers() });
            setKraMasters(asArray(masterRes.data));

            // 3. Fetch current linked KRAs
            const linkedRes = await axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${id}`, { headers: headers() });
            setLinkedKras(asArray(linkedRes.data));

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to load KRA configuration details.');
        } finally {
            setLoading(false);
        }
    };

    // Calculate current total weightage mapped
    const totalWeight = useMemo(() => linkedKras.reduce((sum, k) => sum + k.weightage, 0), [linkedKras]);

    // Filter available templates to exclude already mapped KRAs
    const availableMasters = useMemo(() => {
        const linkedIds = new Set(linkedKras.map(k => k.kra_master));
        return kraMasters.filter(m => !linkedIds.has(m.id));
    }, [kraMasters, linkedKras]);

    // Handle KRA template linkage submission
    const handleLinkageSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empId || !selectedMasterId || !weightage || !targetDesc.trim()) {
            setFormError('Please select a template, assign weightage, and define targets.');
            return;
        }

        const numericWeight = parseInt(weightage);
        if (totalWeight + numericWeight > 100) {
            setFormError(`Total weightage cannot exceed 100%. Mapped is ${totalWeight}%, you proposed +${numericWeight}%.`);
            return;
        }

        setSaving(true);
        setSuccessMsg(null);
        setFormError(null);

        try {
            await axios.post(
                `${API_BASE}/employee/employee-kra/`,
                {
                    employee: empId,
                    kra_master: parseInt(selectedMasterId),
                    weightage: numericWeight,
                    target_description: targetDesc
                },
                { headers: headers() }
            );

            setSuccessMsg('KRA mapped successfully!');
            setSelectedMasterId('');
            setWeightage('20');
            setTargetDesc('');

            // Reload linkages
            const linkedRes = await axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${empId}`, { headers: headers() });
            setLinkedKras(asArray(linkedRes.data));

        } catch (err: any) {
            console.error(err);
            setFormError(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to map selected KRA.');
        } finally {
            setSaving(false);
        }
    };

    // Handle unlinking (deleting) a KRA linkage
    const handleUnlink = async (linkId: number) => {
        if (!window.confirm('Are you sure you want to unlink this Key Result Area (KRA) assignment?')) {
            return;
        }

        setSaving(true);
        setSuccessMsg(null);
        setFormError(null);

        try {
            await axios.delete(`${API_BASE}/employee/employee-kra/${linkId}/`, { headers: headers() });
            setSuccessMsg('KRA unlinked successfully.');
            
            // Reload linkages
            const linkedRes = await axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${empId}`, { headers: headers() });
            setLinkedKras(asArray(linkedRes.data));
        } catch (err: any) {
            console.error(err);
            setFormError(err.response?.data?.detail || 'Failed to unlink KRA.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 py-2 animate-pulse">
                <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 h-80 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                    <div className="md:col-span-2 h-80 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="text-rose-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Error</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                <button
                    onClick={loadSelfMappingData}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 mb-1">Self Alignment</div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Self-Map Key Result Areas</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Link available KRA designation templates to yourself and allocate custom operational target scopes.</p>
                </div>
                <Link
                    to="/employee/performance"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0"
                >
                    ← Back to Hub
                </Link>
            </div>

            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl text-xs font-bold">
                    ✓ {successMsg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form to Map KRA */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm h-fit">
                    <h3 className="text-sm font-black text-gray-800 dark:text-white mb-4">Propose KRA Linkage</h3>
                    
                    {formError && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-455 p-3 rounded-xl text-[11px] font-bold mb-4">
                            ⚠️ {formError}
                        </div>
                    )}

                    <form onSubmit={handleLinkageSubmit} className="space-y-4">
                        {/* Selected KRA master template */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Select KRA Master *</label>
                            <select
                                required
                                value={selectedMasterId}
                                onChange={e => setSelectedMasterId(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                            >
                                <option value="">Choose template...</option>
                                {availableMasters.map(m => (
                                    <option key={m.id} value={m.id}>{m.title}</option>
                                ))}
                            </select>
                            {availableMasters.length === 0 && (
                                <p className="text-[9px] text-gray-400 mt-1 italic">All templates have been mapped to you.</p>
                            )}
                        </div>

                        {/* Weightage */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Assign Weightage (%) *</label>
                            <div className="flex items-center gap-3">
                                <input
                                    required
                                    type="range"
                                    min="5"
                                    max="100"
                                    step="5"
                                    value={weightage}
                                    onChange={e => setWeightage(e.target.value)}
                                    className="flex-1 accent-teal-500 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                                />
                                <span className="text-xs font-black text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg shrink-0">
                                    {weightage}%
                                </span>
                            </div>
                        </div>

                        {/* Target Description */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Milestones & Targets *</label>
                            <textarea
                                required
                                rows={4}
                                placeholder="Describe what you plan to accomplish (e.g. Complete 3 major releases, maintain 95% client satisfaction rating)..."
                                value={targetDesc}
                                onChange={e => setTargetDesc(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !selectedMasterId || availableMasters.length === 0}
                            className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10"
                        >
                            {saving ? 'Mapping KRA...' : 'Submit Linkage'}
                        </button>
                    </form>
                </div>

                {/* List of currently linked KRAs */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black text-gray-800 dark:text-white">Current Linked Assignments</h3>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                                Weight Total: <span className={totalWeight > 100 ? 'text-rose-500 font-extrabold' : 'text-teal-555 font-extrabold'}>{totalWeight}%</span> / 100%
                            </span>
                        </div>

                        {linkedKras.length === 0 ? (
                            <div className="text-center py-10 text-xs text-gray-400 italic">
                                No operational KRA linkages mapped to your profile yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {linkedKras.map((k) => (
                                    <div
                                        key={k.id}
                                        className="p-4 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-50 dark:border-gray-800/10 flex justify-between items-start gap-4"
                                    >
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-black text-gray-855 dark:text-white flex flex-wrap items-center gap-2">
                                                {k.kra_title}
                                                <span className="text-[8px] font-black uppercase text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                                                    {k.weightage}% Weight
                                                </span>
                                            </h4>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">"{k.target_description}"</p>
                                        </div>
                                        <button
                                            onClick={() => handleUnlink(k.id)}
                                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-455 text-[9px] font-bold rounded-lg transition"
                                        >
                                            Unlink
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SelfMapKRAs;
