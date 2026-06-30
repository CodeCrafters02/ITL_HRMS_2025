import { useState, useEffect } from 'react';
import axios from 'axios';

interface Cycle {
    id: number;
    name: string;
    status: 'draft' | 'active' | 'completed';
}

interface HikeBand {
    id: number;
    cycle: number;
    cycle_name: string;
    min_rating: string;
    max_rating: string;
    recommended_hike_percentage: string;
}

type FormState = { min_rating: string; max_rating: string; recommended_hike_percentage: string };
const EMPTY_FORM: FormState = { min_rating: '', max_rating: '', recommended_hike_percentage: '' };

// Derive a performance label + color from hike %
const bandMeta = (hike: number): { label: string; color: string; bar: string; bg: string } => {
    if (hike >= 15) return { label: 'Outstanding',         color: 'text-violet-600 dark:text-violet-400', bar: 'bg-violet-500', bg: 'bg-violet-500/10' };
    if (hike >= 10) return { label: 'Exceeds Expectations', color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-500/10' };
    if (hike >= 7)  return { label: 'Meets Expectations',  color: 'text-teal-600 dark:text-teal-400',    bar: 'bg-teal-500',    bg: 'bg-teal-500/10' };
    if (hike >= 4)  return { label: 'Needs Improvement',   color: 'text-amber-600 dark:text-amber-400',  bar: 'bg-amber-400',   bg: 'bg-amber-500/10' };
    return            { label: 'Below Expectations',        color: 'text-rose-600 dark:text-rose-400',    bar: 'bg-rose-400',    bg: 'bg-rose-500/10' };
};

const PRESETS = [
    {
        label: '3-Band (Simple)',
        desc: 'High / Mid / Low',
        bands: [
            { min_rating: '4.00', max_rating: '5.00', recommended_hike_percentage: '15.00' },
            { min_rating: '2.50', max_rating: '3.99', recommended_hike_percentage: '7.00' },
            { min_rating: '1.00', max_rating: '2.49', recommended_hike_percentage: '0.00' },
        ],
    },
    {
        label: '5-Band (Standard)',
        desc: 'Industry standard split',
        bands: [
            { min_rating: '4.50', max_rating: '5.00', recommended_hike_percentage: '18.00' },
            { min_rating: '4.00', max_rating: '4.49', recommended_hike_percentage: '12.00' },
            { min_rating: '3.00', max_rating: '3.99', recommended_hike_percentage: '7.00' },
            { min_rating: '2.00', max_rating: '2.99', recommended_hike_percentage: '3.00' },
            { min_rating: '1.00', max_rating: '1.99', recommended_hike_percentage: '0.00' },
        ],
    },
];

const STATUS_STYLE: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
};

const SalaryHike = () => {
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
    const [bands, setBands] = useState<HikeBand[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingBands, setLoadingBands] = useState(false);

    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [editId, setEditId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [applyingPreset, setApplyingPreset] = useState(false);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get(`${API_BASE}/employee/appraisal-cycles/`, { headers: headers() });
                const data: Cycle[] = Array.isArray(res.data) ? res.data : res.data.results ?? [];
                setCycles(data);
                const active = data.find(c => c.status === 'active') || data[0];
                if (active) setSelectedCycleId(active.id);
            } catch {
                setErrorMsg('Failed to load appraisal cycles.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!selectedCycleId) return;
        (async () => {
            try {
                setLoadingBands(true);
                setBands([]);
                const res = await axios.get(`${API_BASE}/employee/salary-hike-config/?cycle=${selectedCycleId}`, { headers: headers() });
                const data: HikeBand[] = Array.isArray(res.data) ? res.data : res.data.results ?? [];
                setBands(data.sort((a, b) => parseFloat(b.min_rating) - parseFloat(a.min_rating)));
            } catch {
                setErrorMsg('Failed to load hike bands.');
            } finally {
                setLoadingBands(false);
            }
        })();
    }, [selectedCycleId]);

    const selectedCycle = cycles.find(c => c.id === selectedCycleId) || null;
    const maxHike = Math.max(...bands.map(b => parseFloat(b.recommended_hike_percentage)), 1);

    const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); setErrorMsg(''); };

    const startEdit = (b: HikeBand) => {
        setEditId(b.id);
        setForm({ min_rating: b.min_rating, max_rating: b.max_rating, recommended_hike_percentage: b.recommended_hike_percentage });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCycleId) return;
        setErrorMsg(''); setSuccessMsg(''); setSaving(true);
        try {
            const payload = { cycle: selectedCycleId, ...form };
            if (editId) {
                const res = await axios.patch(`${API_BASE}/employee/salary-hike-config/${editId}/`, payload, { headers: headers() });
                setBands(prev => prev.map(b => b.id === editId ? res.data : b).sort((a, b) => parseFloat(b.min_rating) - parseFloat(a.min_rating)));
                setSuccessMsg('Band updated.');
            } else {
                const res = await axios.post(`${API_BASE}/employee/salary-hike-config/`, payload, { headers: headers() });
                setBands(prev => [...prev, res.data].sort((a, b) => parseFloat(b.min_rating) - parseFloat(a.min_rating)));
                setSuccessMsg('Band added.');
            }
            resetForm();
        } catch (err: any) {
            const d = err.response?.data;
            setErrorMsg(d?.non_field_errors?.[0] || d?.min_rating?.[0] || d?.detail || 'Failed to save band.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Remove this hike band?')) return;
        setErrorMsg(''); setSuccessMsg('');
        try {
            await axios.delete(`${API_BASE}/employee/salary-hike-config/${id}/`, { headers: headers() });
            setBands(prev => prev.filter(b => b.id !== id));
            setSuccessMsg('Band removed.');
        } catch {
            setErrorMsg('Failed to remove band.');
        }
    };

    const applyPreset = async (preset: typeof PRESETS[0]) => {
        if (!selectedCycleId) return;
        if (!window.confirm(`Apply "${preset.label}" preset? This will add ${preset.bands.length} bands to the current cycle.`)) return;
        setApplyingPreset(true); setErrorMsg(''); setSuccessMsg('');
        try {
            const created = await Promise.all(
                preset.bands.map(b => axios.post(`${API_BASE}/employee/salary-hike-config/`, { cycle: selectedCycleId, ...b }, { headers: headers() }))
            );
            setBands(prev => [...prev, ...created.map(r => r.data)].sort((a, b) => parseFloat(b.min_rating) - parseFloat(a.min_rating)));
            setSuccessMsg(`Applied "${preset.label}" — ${preset.bands.length} bands added.`);
        } catch {
            setErrorMsg('Failed to apply preset. Some bands may already overlap.');
        } finally {
            setApplyingPreset(false);
        }
    };

    const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none';

    return (
        <div className="space-y-5 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Configure Salary Hikes</h2>
                <p className="text-xs text-gray-400 mt-0.5">Map appraisal score ranges to recommended salary hike percentages per cycle.</p>
            </div>

            {errorMsg && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-xs font-bold">⚠️ {errorMsg}</div>}
            {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-xs font-bold">✓ {successMsg}</div>}

            {/* Cycle picker */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Select Appraisal Cycle</label>
                {loading ? (
                    <div className="text-xs text-gray-400">Loading cycles...</div>
                ) : cycles.length === 0 ? (
                    <div className="text-xs text-gray-400 italic">No cycles found. Create one in Appraisal Cycles.</div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {cycles.map(c => (
                            <button key={c.id} onClick={() => { setSelectedCycleId(c.id); resetForm(); }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition ${
                                    selectedCycleId === c.id
                                        ? 'bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-500/20'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-400'
                                }`}>
                                <span>{c.name}</span>
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${selectedCycleId === c.id ? 'bg-white/20 text-white' : STATUS_STYLE[c.status]}`}>{c.status}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedCycle && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

                    {/* Left: bands + visual */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Stats bar */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Bands', value: bands.length, icon: '📊' },
                                { label: 'Max Hike', value: bands.length ? `${Math.max(...bands.map(b => parseFloat(b.recommended_hike_percentage))).toFixed(1)}%` : '—', icon: '🚀' },
                                { label: 'Min Hike', value: bands.length ? `${Math.min(...bands.map(b => parseFloat(b.recommended_hike_percentage))).toFixed(1)}%` : '—', icon: '📌' },
                            ].map(s => (
                                <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-center">
                                    <div className="text-xl mb-1">{s.icon}</div>
                                    <div className="text-lg font-black text-gray-800 dark:text-white">{s.value}</div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Band cards */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold text-gray-800 dark:text-white">Hike Bands — {selectedCycle.name}</span>
                                <span className="text-[9px] font-black text-gray-400">{bands.length} configured</span>
                            </div>

                            {loadingBands ? (
                                <div className="text-center py-10 text-xs text-gray-400">Loading bands...</div>
                            ) : bands.length === 0 ? (
                                <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl py-10 text-center">
                                    <div className="text-3xl mb-2">📊</div>
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">No bands configured</div>
                                    <p className="text-[10px] text-gray-400 mt-1">Add bands manually or apply a preset template →</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {bands.map(b => {
                                        const hike = parseFloat(b.recommended_hike_percentage);
                                        const meta = bandMeta(hike);
                                        const barPct = maxHike > 0 ? Math.round((hike / maxHike) * 100) : 0;
                                        const isEditing = editId === b.id;
                                        return (
                                            <div key={b.id} className={`rounded-2xl border p-4 transition ${isEditing ? 'border-teal-400 bg-teal-500/5' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}`}>
                                                {isEditing ? (
                                                    <form onSubmit={handleSave} className="space-y-3">
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="block text-[9px] font-bold uppercase text-gray-400 mb-1">Min Rating</label>
                                                                <input type="number" step="0.01" min="0" max="10" required value={form.min_rating}
                                                                    onChange={e => setForm(f => ({ ...f, min_rating: e.target.value }))} className={inputCls} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[9px] font-bold uppercase text-gray-400 mb-1">Max Rating</label>
                                                                <input type="number" step="0.01" min="0" max="10" required value={form.max_rating}
                                                                    onChange={e => setForm(f => ({ ...f, max_rating: e.target.value }))} className={inputCls} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[9px] font-bold uppercase text-gray-400 mb-1">Hike %</label>
                                                                <input type="number" step="0.1" min="0" required value={form.recommended_hike_percentage}
                                                                    onChange={e => setForm(f => ({ ...f, recommended_hike_percentage: e.target.value }))} className={inputCls} />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <button type="button" onClick={resetForm} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-[10px] font-bold">Cancel</button>
                                                            <button type="submit" disabled={saving} className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-[10px] font-bold">
                                                                {saving ? 'Saving...' : 'Update Band'}
                                                            </button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <div className="flex items-center gap-4">
                                                        {/* Hike % circle */}
                                                        <div className={`w-14 h-14 rounded-2xl ${meta.bg} flex flex-col items-center justify-center shrink-0`}>
                                                            <span className={`text-base font-black ${meta.color}`}>{hike === 0 ? '0' : `${hike.toFixed(0)}`}</span>
                                                            <span className={`text-[8px] font-bold ${meta.color} opacity-70`}>% hike</span>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
                                                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                                                    Score {parseFloat(b.min_rating).toFixed(2)} – {parseFloat(b.max_rating).toFixed(2)}
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div className={`h-full ${meta.bar} rounded-full transition-all duration-700`} style={{ width: `${barPct}%` }} />
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 shrink-0">
                                                            <button onClick={() => startEdit(b)} className="text-[9px] font-bold text-teal-600 dark:text-teal-400 hover:underline">Edit</button>
                                                            <button onClick={() => handleDelete(b.id)} className="text-[9px] font-bold text-rose-500 hover:underline">Remove</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Add form + presets */}
                    <div className="space-y-4">
                        {/* Add band form */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5">
                            <h3 className="text-xs font-black text-gray-700 dark:text-white uppercase tracking-wider mb-4">
                                {editId ? 'Edit Band' : '+ Add Hike Band'}
                            </h3>
                            <form onSubmit={handleSave} className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Min Score</label>
                                    <input type="number" step="0.01" min="0" max="10" required placeholder="e.g. 4.00" value={form.min_rating}
                                        onChange={e => setForm(f => ({ ...f, min_rating: e.target.value }))} className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Max Score</label>
                                    <input type="number" step="0.01" min="0" max="10" required placeholder="e.g. 4.99" value={form.max_rating}
                                        onChange={e => setForm(f => ({ ...f, max_rating: e.target.value }))} className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Hike Percentage (%)</label>
                                    <input type="number" step="0.1" min="0" required placeholder="e.g. 12.0" value={form.recommended_hike_percentage}
                                        onChange={e => setForm(f => ({ ...f, recommended_hike_percentage: e.target.value }))} className={inputCls} />
                                </div>

                                {/* Preview */}
                                {form.min_rating && form.max_rating && form.recommended_hike_percentage && (
                                    <div className={`rounded-xl p-3 ${bandMeta(parseFloat(form.recommended_hike_percentage)).bg} flex items-center gap-3`}>
                                        <span className={`text-sm font-black ${bandMeta(parseFloat(form.recommended_hike_percentage)).color}`}>
                                            {parseFloat(form.recommended_hike_percentage).toFixed(1)}%
                                        </span>
                                        <div>
                                            <div className={`text-[9px] font-black ${bandMeta(parseFloat(form.recommended_hike_percentage)).color}`}>
                                                {bandMeta(parseFloat(form.recommended_hike_percentage)).label}
                                            </div>
                                            <div className="text-[9px] text-gray-400">Score {form.min_rating} – {form.max_rating}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-1">
                                    {editId && <button type="button" onClick={resetForm} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl text-[10px] font-bold">Cancel</button>}
                                    <button type="submit" disabled={saving}
                                        className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-[10px] font-bold">
                                        {saving ? 'Saving...' : editId ? 'Update Band' : 'Add Band'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Preset templates */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Quick Presets</div>
                            <div className="space-y-2">
                                {PRESETS.map(preset => (
                                    <div key={preset.label} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-3 hover:border-gray-200 dark:hover:border-gray-700 transition">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-xs font-bold text-gray-800 dark:text-white">{preset.label}</div>
                                                <div className="text-[9px] text-gray-400 mt-0.5">{preset.desc} · {preset.bands.length} bands</div>
                                            </div>
                                            <button onClick={() => applyPreset(preset)} disabled={applyingPreset}
                                                className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500 hover:text-white text-teal-600 dark:text-teal-400 rounded-lg text-[9px] font-black transition disabled:opacity-50">
                                                Apply
                                            </button>
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            {preset.bands.map((b, i) => {
                                                const m = bandMeta(parseFloat(b.recommended_hike_percentage));
                                                return <div key={i} className={`flex-1 h-1.5 rounded-full ${m.bar}`} title={`${b.recommended_hike_percentage}%`} />;
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[9px] text-gray-400 mt-3 leading-relaxed">Presets add bands on top of existing ones. Remove duplicates manually if needed.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryHike;
