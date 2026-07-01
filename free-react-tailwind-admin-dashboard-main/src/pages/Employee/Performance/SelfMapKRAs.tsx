import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

interface KRAMaster { id: number; title: string; description: string; department_names: string[]; status: string; }
interface MappedKRA { id: number; kra_master: number; kra_title: string; kra_description: string; weightage: number; target_description: string; created_at: string; reviewer_name: string | null; }

const SelfMapKRAs = () => {
    const dispatch = useDispatch();
    const [empId, setEmpId] = useState<number | null>(null);
    const [masters, setMasters] = useState<KRAMaster[]>([]);
    const [mapped, setMapped] = useState<MappedKRA[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [addingId, setAddingId] = useState<number | null>(null);
    const [form, setForm] = useState<{ target_description: string; weightage: string }>({ target_description: '', weightage: '' });
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => { dispatch(setPageTitle('Self Map KRAs')); }, [dispatch]);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = async (id: number) => {
        const [mRes, kraRes] = await Promise.all([
            axios.get(`${API_BASE}/employee/kra-master/`, { headers: auth() }),
            axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${id}`, { headers: auth() }),
        ]);
        setMasters(Array.isArray(mRes.data) ? mRes.data : mRes.data?.results ?? []);
        setMapped(Array.isArray(kraRes.data) ? kraRes.data : kraRes.data?.results ?? []);
    };

    useEffect(() => {
        (async () => {
            try {
                const idRes = await axios.get(`${API_BASE}/employee/employee-id/`, { headers: auth() });
                const id = idRes.data?.id;
                setEmpId(id);
                if (id) await loadData(id);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const mappedKraMasterIds = new Set(mapped.map(m => m.kra_master));
    const usedWeight = mapped.reduce((s, m) => s + (m.weightage || 0), 0);
    const remaining = 100 - usedWeight;

    const filteredMasters = masters.filter(m =>
        m.status === 'active' &&
        m.title.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = async (masterId: number) => {
        if (!empId) return;
        setSubmitting(true);
        try {
            await axios.post(`${API_BASE}/employee/employee-kra/`, {
                employee: empId,
                kra_master: masterId,
                weightage: parseInt(form.weightage) || 0,
                target_description: form.target_description,
            }, { headers: auth() });
            await loadData(empId);
            setAddingId(null);
            setForm({ target_description: '', weightage: '' });
            showToast('KRA added successfully.', 'success');
        } catch (e: any) {
            showToast(e?.response?.data?.detail || 'Failed to add KRA.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (mappedKRAId: number) => {
        if (!empId) return;
        setDeletingId(mappedKRAId);
        try {
            await axios.delete(`${API_BASE}/employee/employee-kra/${mappedKRAId}/`, { headers: auth() });
            setMapped(prev => prev.filter(m => m.id !== mappedKRAId));
            showToast('KRA removed.', 'success');
        } catch {
            showToast('Failed to remove KRA.', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-gray-400">Loading KRA catalogue...</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-xs font-bold transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black text-gray-800 dark:text-white">Self Map KRAs</h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Browse the KRA catalogue and add relevant key result areas to your profile.</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <div className="text-center bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl px-5 py-3">
                            <span className="block text-2xl font-black text-indigo-600 dark:text-indigo-400">{mapped.length}</span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-500 mt-0.5">Mapped</span>
                        </div>
                        <div className={`text-center rounded-2xl px-5 py-3 border ${remaining >= 0 ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/40' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40'}`}>
                            <span className={`block text-2xl font-black ${remaining >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>{remaining}%</span>
                            <span className={`block text-[10px] font-bold uppercase tracking-wider mt-0.5 ${remaining >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>Remaining</span>
                        </div>
                    </div>
                </div>

                {/* Weight bar */}
                <div className="mt-5">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Weightage Used</span>
                        <span className={`text-[10px] font-black ${usedWeight <= 100 ? 'text-teal-600' : 'text-rose-600'}`}>{usedWeight}% / 100%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${usedWeight > 100 ? 'bg-rose-500' : usedWeight === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(usedWeight, 100)}%` }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Left: My Mapped KRAs */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">My Mapped KRAs</h2>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">{mapped.length}</span>
                    </div>

                    {mapped.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-10 text-center">
                            <p className="text-xs font-bold text-gray-400">No KRAs mapped yet</p>
                            <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">Select from the catalogue →</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {mapped.map(m => (
                                <div key={m.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm group">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-black text-gray-800 dark:text-white leading-tight">{m.kra_title}</h4>
                                            {m.kra_description && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{m.kra_description}</p>}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(m.id)}
                                            disabled={deletingId === m.id}
                                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-gray-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition opacity-0 group-hover:opacity-100"
                                        >
                                            {deletingId === m.id
                                                ? <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            }
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full">{m.weightage}% weight</span>
                                        {m.reviewer_name && <span className="text-[10px] font-semibold text-gray-400">Reviewer: {m.reviewer_name}</span>}
                                    </div>
                                    {m.target_description && (
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-2 line-clamp-2">
                                            Target: {m.target_description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: KRA Catalogue */}
                <div className="lg:col-span-3 space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">KRA Catalogue</h2>
                        <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold px-2 py-0.5 rounded-full">{filteredMasters.length} available</span>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search KRAs..."
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 transition"
                        />
                    </div>

                    {filteredMasters.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-10 text-center">
                            <p className="text-xs font-bold text-gray-400">No KRAs match your search</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {filteredMasters.map(master => {
                                const isAlreadyMapped = mappedKraMasterIds.has(master.id);
                                const isAdding = addingId === master.id;

                                return (
                                    <div key={master.id} className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm transition-all duration-200 ${isAlreadyMapped ? 'border-emerald-200 dark:border-emerald-900/40' : 'border-gray-100 dark:border-gray-800'}`}>
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-xs font-black text-gray-800 dark:text-white">{master.title}</h4>
                                                        {isAlreadyMapped && (
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Mapped</span>
                                                        )}
                                                    </div>
                                                    {master.description && <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{master.description}</p>}
                                                    {master.department_names?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {master.department_names.map((d, i) => (
                                                                <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{d}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {!isAlreadyMapped && (
                                                    <button
                                                        onClick={() => setAddingId(isAdding ? null : master.id)}
                                                        className={`shrink-0 px-3.5 py-2 rounded-xl text-[10px] font-black transition ${isAdding ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm'}`}
                                                    >
                                                        {isAdding ? 'Cancel' : '+ Add'}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Inline Add Form */}
                                            {isAdding && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="col-span-2">
                                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Target Description</label>
                                                            <textarea
                                                                rows={2}
                                                                value={form.target_description}
                                                                onChange={e => setForm(p => ({ ...p, target_description: e.target.value }))}
                                                                placeholder="Describe your target for this KRA..."
                                                                className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-850/50 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-400 resize-none transition"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                                                                Weight % <span className="text-indigo-500 normal-case font-semibold">(max {remaining}%)</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={remaining}
                                                                value={form.weightage}
                                                                onChange={e => setForm(p => ({ ...p, weightage: e.target.value }))}
                                                                placeholder={`0–${remaining}`}
                                                                className="w-full text-xs font-bold bg-gray-50 dark:bg-gray-850/50 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-400 transition"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => { setAddingId(null); setForm({ target_description: '', weightage: '' }); }}
                                                            className="px-4 py-2 rounded-xl text-[11px] font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                                        >Cancel</button>
                                                        <button
                                                            onClick={() => handleAdd(master.id)}
                                                            disabled={submitting}
                                                            className="px-5 py-2 rounded-xl text-[11px] font-black bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm disabled:opacity-60 transition flex items-center gap-2"
                                                        >
                                                            {submitting && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                                            Confirm Add
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SelfMapKRAs;
