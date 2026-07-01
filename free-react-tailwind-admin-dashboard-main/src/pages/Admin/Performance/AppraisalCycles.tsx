import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import IconSearch from '../../../components/Icon/IconSearch';

interface Cycle {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    self_appraisal_deadline: string;
    manager_eval_deadline: string;
    status: 'draft' | 'active' | 'completed';
    question_count: number;
    self_count: number;
    manager_count: number;
    peer_count: number;
    hr_count: number;
}

type FormState = {
    name: string;
    start_date: string;
    end_date: string;
    self_appraisal_deadline: string;
    manager_eval_deadline: string;
    status: 'draft' | 'active' | 'completed';
};

type RoleKey = 'self' | 'manager' | 'peer' | 'hr';
type DraftQuestion = { text: string; type: 'scale' | 'yes_no'; maxScore: number };
type DraftQuestions = Record<RoleKey, DraftQuestion[]>;
type ExistingQuestion = { id: number; text: string; type: 'scale' | 'yes_no'; maxScore: number; role: RoleKey; _deleted?: boolean };
type DraftBand = { minRating: string; maxRating: string; hikePercent: string };
type ExistingBand = DraftBand & { id: number; _deleted?: boolean };

const EMPTY_BAND: DraftBand = { minRating: '', maxRating: '', hikePercent: '' };
const BAND_PRESETS = [
    { label: '3-Band', bands: [{ minRating: '4.00', maxRating: '5.00', hikePercent: '15.00' }, { minRating: '2.50', maxRating: '3.99', hikePercent: '7.00' }, { minRating: '1.00', maxRating: '2.49', hikePercent: '0.00' }] },
    { label: '5-Band', bands: [{ minRating: '4.50', maxRating: '5.00', hikePercent: '18.00' }, { minRating: '4.00', maxRating: '4.49', hikePercent: '12.00' }, { minRating: '3.00', maxRating: '3.99', hikePercent: '7.00' }, { minRating: '2.00', maxRating: '2.99', hikePercent: '3.00' }, { minRating: '1.00', maxRating: '1.99', hikePercent: '0.00' }] },
];
const bandColor = (h: number) => h >= 15 ? 'text-violet-600 dark:text-violet-400 bg-violet-500/10' : h >= 10 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : h >= 7 ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10' : h >= 4 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' : 'text-rose-600 dark:text-rose-400 bg-rose-500/10';

const EMPTY_FORM: FormState = {
    name: '', start_date: '', end_date: '',
    self_appraisal_deadline: '', manager_eval_deadline: '', status: 'draft',
};

const EMPTY_DRAFTS: DraftQuestions = { self: [], manager: [], peer: [], hr: [] };

const ROLE_META: Record<RoleKey, { label: string; icon: string; color: string }> = {
    self:    { label: 'Self',     icon: '👤', color: 'text-violet-600 dark:text-violet-400' },
    manager: { label: 'Manager',  icon: '👔', color: 'text-teal-600 dark:text-teal-400' },
    peer:    { label: 'Peer',     icon: '🤝', color: 'text-amber-600 dark:text-amber-400' },
    hr:      { label: 'Admin/HR', icon: '🛡️', color: 'text-rose-600 dark:text-rose-400' },
};

const STATUS_FLOW: Record<Cycle['status'], Cycle['status']> = {
    draft: 'active', active: 'completed', completed: 'draft',
};

const STATUS_STYLE: Record<Cycle['status'], string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
};

const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysLeft = (end: string) => {
    const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
    return diff;
};

const AppraisalCycles = () => {
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [draftQs, setDraftQs] = useState<DraftQuestions>(EMPTY_DRAFTS);
    const [existingQs, setExistingQs] = useState<ExistingQuestion[]>([]);
    const [qRole, setQRole] = useState<RoleKey>('self');
    const [qText, setQText] = useState('');
    const [qType, setQType] = useState<'scale' | 'yes_no'>('scale');
    const [qMax, setQMax] = useState(5);
    const [draftBands, setDraftBands] = useState<DraftBand[]>([]);
    const [existingBands, setExistingBands] = useState<ExistingBand[]>([]);
    const [bandForm, setBandForm] = useState<DraftBand>(EMPTY_BAND);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

    const fetchCycles = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/employee/appraisal-cycles/`, { headers: headers() });
            const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
            setCycles(data);
            if (data.length && !selectedId) setSelectedId(data[0].id);
        } catch {
            setErrorMsg('Failed to load appraisal cycles.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCycles(); }, []);

    const selected = cycles.find(c => c.id === selectedId) || null;
    const filtered = cycles.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    const resetModal = () => {
        setStep(1); setDraftQs(EMPTY_DRAFTS); setExistingQs([]);
        setQRole('self'); setQText(''); setQType('scale'); setQMax(5);
        setDraftBands([]); setExistingBands([]); setBandForm(EMPTY_BAND);
        setErrorMsg('');
    };
    const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); resetModal(); setShowForm(true); };
    const openEdit = async (c: Cycle) => {
        setForm({
            name: c.name, start_date: c.start_date, end_date: c.end_date,
            self_appraisal_deadline: c.self_appraisal_deadline?.slice(0, 10) || '',
            manager_eval_deadline: c.manager_eval_deadline?.slice(0, 10) || '',
            status: c.status,
        });
        setEditId(c.id); resetModal(); setShowForm(true);
        try {
            const [qRes, hRes] = await Promise.allSettled([
                axios.get(`${API_BASE}/employee/appraisal-questions/?cycle=${c.id}`, { headers: headers() }),
                axios.get(`${API_BASE}/employee/salary-hike-config/?cycle=${c.id}`, { headers: headers() }),
            ]);
            if (qRes.status === 'fulfilled') {
                const data: any[] = Array.isArray(qRes.value.data) ? qRes.value.data : qRes.value.data.results ?? [];
                setExistingQs(data.map(q => ({ id: q.id, text: q.question_text, type: q.question_type as 'scale' | 'yes_no', maxScore: q.max_score ?? 5, role: q.role_type as RoleKey })));
            }
            if (hRes.status === 'fulfilled') {
                const data: any[] = Array.isArray(hRes.value.data) ? hRes.value.data : hRes.value.data.results ?? [];
                setExistingBands(data.map(b => ({ id: b.id, minRating: b.min_rating, maxRating: b.max_rating, hikePercent: b.recommended_hike_percentage })));
            }
        } catch { /* non-critical */ }
    };
    const updateExistingQ = (id: number, patch: Partial<ExistingQuestion>) =>
        setExistingQs(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
    const deleteExistingQ = (id: number) =>
        setExistingQs(prev => prev.map(q => q.id === id ? { ...q, _deleted: true } : q));

    const addDraftQ = () => {
        if (!qText.trim()) return;
        setDraftQs(prev => ({ ...prev, [qRole]: [...prev[qRole], { text: qText.trim(), type: qType, maxScore: qMax }] }));
        setQText('');
    };
    const removeDraftQ = (role: RoleKey, idx: number) =>
        setDraftQs(prev => ({ ...prev, [role]: prev[role].filter((_, i) => i !== idx) }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(''); setSuccessMsg('');
        if (!form.name || !form.start_date || !form.end_date) return setErrorMsg('Name, start date and end date are required.');
        setSaving(true);
        try {
            const payload = {
                ...form,
                self_appraisal_deadline: form.self_appraisal_deadline ? `${form.self_appraisal_deadline}T23:59:00` : `${form.end_date}T23:59:00`,
                manager_eval_deadline: form.manager_eval_deadline ? `${form.manager_eval_deadline}T23:59:00` : `${form.end_date}T23:59:00`,
            };
            if (editId) {
                const res = await axios.patch(`${API_BASE}/employee/appraisal-cycles/${editId}/`, payload, { headers: headers() });
                setCycles(prev => prev.map(c => c.id === editId ? res.data : c));
                // Sync questions: delete, patch edits, post new
                const toDelete = existingQs.filter(q => q._deleted);
                const toUpdate = existingQs.filter(q => !q._deleted);
                const allNew   = (Object.keys(draftQs) as RoleKey[]).flatMap(role =>
                    draftQs[role].map(q => ({ cycle: editId, question_text: q.text, question_type: q.type, role_type: role, max_score: q.type === 'scale' ? q.maxScore : null }))
                );
                const bandDelete = existingBands.filter(b => b._deleted);
                const bandUpdate = existingBands.filter(b => !b._deleted);
                await Promise.all([
                    ...toDelete.map(q => axios.delete(`${API_BASE}/employee/appraisal-questions/${q.id}/`, { headers: headers() })),
                    ...toUpdate.map(q => axios.patch(`${API_BASE}/employee/appraisal-questions/${q.id}/`, { question_text: q.text, question_type: q.type, max_score: q.type === 'scale' ? q.maxScore : null }, { headers: headers() })),
                    ...allNew.map(q => axios.post(`${API_BASE}/employee/appraisal-questions/`, q, { headers: headers() })),
                    ...bandDelete.map(b => axios.delete(`${API_BASE}/employee/salary-hike-config/${b.id}/`, { headers: headers() })),
                    ...bandUpdate.map(b => axios.patch(`${API_BASE}/employee/salary-hike-config/${b.id}/`, { min_rating: b.minRating, max_rating: b.maxRating, recommended_hike_percentage: b.hikePercent }, { headers: headers() })),
                    ...draftBands.map(b => axios.post(`${API_BASE}/employee/salary-hike-config/`, { cycle: editId, min_rating: b.minRating, max_rating: b.maxRating, recommended_hike_percentage: b.hikePercent }, { headers: headers() })),
                ]);
                await fetchCycles();
                setSuccessMsg('Cycle, questions and hike bands updated.');
                setShowForm(false);
            } else {
                const cycleRes = await axios.post(`${API_BASE}/employee/appraisal-cycles/`, payload, { headers: headers() });
                const cycleId = cycleRes.data.id;
                const allQ = (Object.keys(draftQs) as RoleKey[]).flatMap(role =>
                    draftQs[role].map(q => ({
                        cycle: cycleId, question_text: q.text,
                        question_type: q.type, role_type: role,
                        max_score: q.type === 'scale' ? q.maxScore : null,
                    }))
                );
                await Promise.all([
                    ...allQ.map(q => axios.post(`${API_BASE}/employee/appraisal-questions/`, q, { headers: headers() })),
                    ...draftBands.map(b => axios.post(`${API_BASE}/employee/salary-hike-config/`, { cycle: cycleId, min_rating: b.minRating, max_rating: b.maxRating, recommended_hike_percentage: b.hikePercent }, { headers: headers() })),
                ]);
                await fetchCycles();
                setSelectedId(cycleId);
                setSuccessMsg(`Cycle created with ${allQ.length}Q and ${draftBands.length} hike band${draftBands.length !== 1 ? 's' : ''}.`);
                setShowForm(false);
            }
        } catch (err: any) {
            const d = err.response?.data;
            setErrorMsg(d?.name?.[0] || d?.detail || d?.non_field_errors?.[0] || 'Failed to save cycle.');
        } finally {
            setSaving(false);
        }
    };

    const handleTransition = async (c: Cycle) => {
        const nextStatus = STATUS_FLOW[c.status];
        try {
            const res = await axios.patch(`${API_BASE}/employee/appraisal-cycles/${c.id}/`, { status: nextStatus }, { headers: headers() });
            setCycles(prev => prev.map(x => x.id === c.id ? { ...x, ...res.data } : x));
        } catch {
            setErrorMsg('Failed to update status.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this appraisal cycle? All linked questions will be removed.')) return;
        try {
            await axios.delete(`${API_BASE}/employee/appraisal-cycles/${id}/`, { headers: headers() });
            setCycles(prev => prev.filter(c => c.id !== id));
            if (selectedId === id) setSelectedId(cycles.find(c => c.id !== id)?.id || null);
            setSuccessMsg('Cycle deleted.');
        } catch {
            setErrorMsg('Failed to delete cycle.');
        }
    };

    const stats = {
        total: cycles.length,
        active: cycles.filter(c => c.status === 'active').length,
        draft: cycles.filter(c => c.status === 'draft').length,
        completed: cycles.filter(c => c.status === 'completed').length,
    };

    return (
        <div className="space-y-5 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Appraisal Cycles</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Manage performance review periods, deadlines and question banks.</p>
                </div>
                <button onClick={openCreate} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/10 whitespace-nowrap">
                    + New Cycle
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-gray-700 dark:text-white', bg: 'bg-white dark:bg-gray-900' },
                    { label: 'Active', value: stats.active, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                    { label: 'Draft', value: stats.draft, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800/40' },
                    { label: 'Completed', value: stats.completed, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-center`}>
                        <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {errorMsg && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-xs font-bold">⚠️ {errorMsg}</div>}
            {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-xs font-bold">✓ {successMsg}</div>}

            {/* Two-panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                {/* Left: cycle list */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-4 flex flex-col h-[600px]">
                    <div className="relative mb-3">
                        <input type="text" placeholder="Search cycles..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                        <IconSearch className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Cycles ({filtered.length})</span>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {loading ? <div className="text-center py-10 text-xs text-gray-400">Loading...</div> : filtered.map(c => (
                            <div key={c.id} onClick={() => setSelectedId(c.id)}
                                className={`p-3 rounded-xl border cursor-pointer transition select-none ${selectedId === c.id ? 'bg-teal-500/10 border-teal-500' : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                                <div className="flex justify-between items-start gap-2">
                                    <span className="text-xs font-bold text-gray-800 dark:text-white leading-tight">{c.name}</span>
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[9px] text-gray-400">{fmt(c.start_date)} → {fmt(c.end_date)}</span>
                                    <span className="text-[8px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">{c.question_count}Q</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        onClick={e => { e.stopPropagation(); openEdit(c); }}
                                        className="text-[9px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                                    >Edit</button>
                                    <span className="text-gray-300 dark:text-gray-700">|</span>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleTransition(c); }}
                                        className="text-[9px] font-bold text-gray-400 hover:text-teal-500 hover:underline"
                                    >→ {STATUS_FLOW[c.status]}</button>
                                    <span className="text-gray-300 dark:text-gray-700">|</span>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDelete(c.id); }}
                                        className="text-[9px] font-bold text-rose-500 hover:underline"
                                    >Delete</button>
                                </div>
                            </div>
                        ))}
                        {!loading && filtered.length === 0 && <div className="text-center py-10 text-xs text-gray-400 italic">No cycles found.</div>}
                    </div>
                </div>

                {/* Right: cycle detail */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 h-[600px] flex flex-col">
                    {!selected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4">
                                <span className="text-2xl">📋</span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400">Select a cycle</h4>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-xs leading-relaxed">Click a cycle from the list or create a new one to view its details and question bank.</p>
                            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold">
                                + Create First Cycle
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Banner */}
                            <div className="pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-800 dark:text-white">{selected.name}</h3>
                                        <span className={`inline-block mt-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${STATUS_STYLE[selected.status]}`}>{selected.status}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEdit(selected)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold">Edit</button>
                                        <button onClick={() => handleTransition(selected)}
                                            className="px-3 py-1.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg text-[10px] font-bold">
                                            → {STATUS_FLOW[selected.status].charAt(0).toUpperCase() + STATUS_FLOW[selected.status].slice(1)}
                                        </button>
                                        <button onClick={() => handleDelete(selected.id)} className="px-3 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold">Delete</button>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                {[
                                    { label: 'Start Date', value: fmt(selected.start_date), icon: '🗓️' },
                                    { label: 'Self Deadline', value: fmt(selected.self_appraisal_deadline), icon: '👤' },
                                    { label: 'Manager Deadline', value: fmt(selected.manager_eval_deadline), icon: '👔' },
                                    { label: 'End Date', value: fmt(selected.end_date), icon: '🏁', extra: selected.status !== 'completed' ? `${daysLeft(selected.end_date)}d left` : 'Closed' },
                                ].map(t => (
                                    <div key={t.label} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3">
                                        <span className="text-base">{t.icon}</span>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">{t.label}</div>
                                        <div className="text-xs font-bold text-gray-800 dark:text-white mt-0.5">{t.value}</div>
                                        {t.extra && <div className={`text-[9px] font-black mt-0.5 ${daysLeft(selected.end_date) < 7 && selected.status !== 'completed' ? 'text-rose-500' : 'text-teal-500'}`}>{t.extra}</div>}
                                    </div>
                                ))}
                            </div>

                            {/* Question stats */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Question Bank</span>
                                    <span className="text-[9px] font-black text-gray-400">{selected.question_count} total</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: 'Self', count: selected.self_count, color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10' },
                                        { label: 'Manager', count: selected.manager_count, color: 'text-teal-600 dark:text-teal-400 bg-teal-500/10' },
                                        { label: 'Peer', count: selected.peer_count, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
                                        { label: 'Admin/HR', count: selected.hr_count, color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
                                    ].map(r => (
                                        <div key={r.label} className={`rounded-2xl p-3 text-center ${r.color}`}>
                                            <div className="text-xl font-black">{r.count}</div>
                                            <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">{r.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Edit questions hint */}
                            <div className="flex-1 flex flex-col justify-end">
                                <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-gray-700 dark:text-white">Review Questions</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">Edit questions via the ✏️ Edit button above to open the question builder.</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create / Edit Modal */}
            {showForm && createPortal((
                <div className="fixed inset-0 z-[70000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl animate__animated animate__zoomIn flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-black text-gray-800 dark:text-white">
                                    {editId ? 'Edit Cycle' : 'New Appraisal Cycle'}
                                </h3>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3].map(s => (
                                        <div key={s} className="flex items-center gap-1">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition ${step >= s ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>{s}</div>
                                            {s < 3 && <div className={`w-5 h-0.5 rounded ${step > s ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                                        </div>
                                    ))}
                                    <span className="text-[10px] font-bold text-gray-400 ml-1">{step === 1 ? 'Details' : step === 2 ? 'Questions' : 'Hike Bands'}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold leading-none">✕</button>
                        </div>

                        {errorMsg && <div className="mx-6 mt-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 p-2 rounded-lg text-xs font-bold shrink-0">⚠️ {errorMsg}</div>}

                        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                            {/* ── Step 1: Cycle Details ── */}
                            {step === 1 && (
                                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Cycle Name *</label>
                                        <input type="text" required placeholder="e.g. Annual Appraisal 2026" value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Start Date *</label>
                                            <input type="date" required value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">End Date *</label>
                                            <input type="date" required value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Self Appraisal Deadline</label>
                                            <input type="date" value={form.self_appraisal_deadline} onChange={e => setForm(f => ({ ...f, self_appraisal_deadline: e.target.value }))}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Manager Eval Deadline</label>
                                            <input type="date" value={form.manager_eval_deadline} onChange={e => setForm(f => ({ ...f, manager_eval_deadline: e.target.value }))}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Initial Status</label>
                                        <div className="flex gap-2">
                                            {(['draft', 'active', 'completed'] as const).map(s => (
                                                <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                                                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold capitalize transition ${form.status === s ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 2: Question Builder (create + edit) ── */}
                            {step === 2 && (
                                <div className="flex flex-col flex-1 overflow-hidden p-6 gap-4">
                                    {/* Role tabs */}
                                    <div className="flex gap-2 shrink-0 flex-wrap">
                                        {(Object.keys(ROLE_META) as RoleKey[]).map(role => {
                                            const existCount = existingQs.filter(q => q.role === role && !q._deleted).length;
                                            const newCount   = draftQs[role].length;
                                            return (
                                                <button key={role} type="button" onClick={() => setQRole(role)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${qRole === role ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                                    <span>{ROLE_META[role].icon}</span>
                                                    <span>{ROLE_META[role].label}</span>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${qRole === role ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                                        {existCount + newCount}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Question list */}
                                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                                        {/* Existing questions (edit mode) */}
                                        {existingQs.filter(q => q.role === qRole && !q._deleted).map(q => (
                                            <div key={q.id} className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl px-3 py-2.5">
                                                <span className="text-[8px] font-black text-blue-400 mt-1 shrink-0 uppercase">saved</span>
                                                <div className="flex-1 min-w-0 space-y-1.5">
                                                    <input type="text" value={q.text} onChange={e => updateExistingQ(q.id, { text: e.target.value })}
                                                        className="w-full bg-transparent text-xs font-semibold text-gray-800 dark:text-white focus:outline-none border-b border-transparent hover:border-blue-200 dark:hover:border-blue-800 focus:border-blue-400 transition" />
                                                    <div className="flex items-center gap-2">
                                                        {(['scale', 'yes_no'] as const).map(t => (
                                                            <button key={t} type="button" onClick={() => updateExistingQ(q.id, { type: t })}
                                                                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition ${q.type === t ? 'bg-teal-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                                                                {t === 'scale' ? '⭐ Rating' : '✅ Yes/No'}
                                                            </button>
                                                        ))}
                                                        {q.type === 'scale' && [3, 5, 7, 10].map(n => (
                                                            <button key={n} type="button" onClick={() => updateExistingQ(q.id, { maxScore: n })}
                                                                className={`w-6 h-6 rounded-lg text-[9px] font-black transition ${q.maxScore === n ? 'bg-teal-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400'}`}>{n}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => deleteExistingQ(q.id)} className="shrink-0 text-gray-300 hover:text-rose-500 text-xs font-bold transition mt-0.5">🗑</button>
                                            </div>
                                        ))}

                                        {/* New draft questions */}
                                        {draftQs[qRole].map((q, i) => (
                                            <div key={`new-${i}`} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2.5">
                                                <span className="text-[8px] font-black text-emerald-400 mt-0.5 shrink-0 uppercase">new</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-800 dark:text-white leading-snug">{q.text}</p>
                                                    <span className={`inline-block mt-1 text-[8px] font-black px-2 py-0.5 rounded-full ${q.type === 'scale' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                                        {q.type === 'scale' ? `⭐ Rating 1–${q.maxScore}` : '✅ Yes / No'}
                                                    </span>
                                                </div>
                                                <button type="button" onClick={() => removeDraftQ(qRole, i)} className="shrink-0 text-gray-300 hover:text-rose-500 text-xs font-bold transition">✕</button>
                                            </div>
                                        ))}

                                        {existingQs.filter(q => q.role === qRole && !q._deleted).length === 0 && draftQs[qRole].length === 0 && (
                                            <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-6 text-center text-[11px] text-gray-400 italic">
                                                No {ROLE_META[qRole].label} questions yet — add one below
                                            </div>
                                        )}
                                    </div>

                                    {/* Add question input */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2.5 shrink-0">
                                        <textarea rows={2} placeholder={`Write a ${ROLE_META[qRole].label.toLowerCase()} appraisal question...`}
                                            value={qText} onChange={e => setQText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addDraftQ(); } }}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none resize-none" />
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Type:</span>
                                            {(['scale', 'yes_no'] as const).map(t => (
                                                <button key={t} type="button" onClick={() => setQType(t)}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${qType === t ? 'bg-teal-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                                    {t === 'scale' ? '⭐ Rating' : '✅ Yes / No'}
                                                </button>
                                            ))}
                                            {qType === 'scale' && (
                                                <>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase ml-2">Max:</span>
                                                    {[3, 5, 7, 10].map(n => (
                                                        <button key={n} type="button" onClick={() => setQMax(n)}
                                                            className={`w-7 h-7 rounded-lg text-[10px] font-black transition ${qMax === n ? 'bg-teal-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                                            {n}
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                            <button type="button" onClick={addDraftQ} disabled={!qText.trim()}
                                                className="ml-auto px-3 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-[10px] font-black transition">
                                                + Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 3: Salary Hike Bands ── */}
                            {step === 3 && (
                                <div className="flex flex-col flex-1 overflow-hidden p-6 gap-4">
                                    {/* Preset buttons */}
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                        <span className="text-[9px] font-black uppercase text-gray-400">Presets:</span>
                                        {BAND_PRESETS.map(p => (
                                            <button key={p.label} type="button"
                                                onClick={() => { setDraftBands([]); setExistingBands([]); setDraftBands(p.bands); }}
                                                className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-teal-500 hover:text-white transition">
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Band list */}
                                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                                        {/* Existing bands (edit mode) */}
                                        {existingBands.filter(b => !b._deleted).map(b => {
                                            const h = parseFloat(b.hikePercent) || 0;
                                            return (
                                                <div key={b.id} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl px-3 py-2">
                                                    <span className="text-[8px] font-black text-blue-400 shrink-0 uppercase">saved</span>
                                                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                                                        <span className="text-[9px] text-gray-400">Rating</span>
                                                        <input type="number" step="0.01" value={b.minRating} onChange={e => setExistingBands(prev => prev.map(x => x.id === b.id ? { ...x, minRating: e.target.value } : x))}
                                                            className="w-14 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-[10px] font-semibold text-center focus:outline-none" />
                                                        <span className="text-[9px] text-gray-400">–</span>
                                                        <input type="number" step="0.01" value={b.maxRating} onChange={e => setExistingBands(prev => prev.map(x => x.id === b.id ? { ...x, maxRating: e.target.value } : x))}
                                                            className="w-14 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-[10px] font-semibold text-center focus:outline-none" />
                                                        <span className="text-[9px] text-gray-400">→ Hike</span>
                                                        <input type="number" step="0.01" value={b.hikePercent} onChange={e => setExistingBands(prev => prev.map(x => x.id === b.id ? { ...x, hikePercent: e.target.value } : x))}
                                                            className="w-14 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-[10px] font-semibold text-center focus:outline-none" />
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${bandColor(h)}`}>{h}%</span>
                                                    </div>
                                                    <button type="button" onClick={() => setExistingBands(prev => prev.map(x => x.id === b.id ? { ...x, _deleted: true } : x))} className="shrink-0 text-gray-300 hover:text-rose-500 text-xs font-bold">🗑</button>
                                                </div>
                                            );
                                        })}

                                        {/* Draft new bands */}
                                        {draftBands.map((b, i) => {
                                            const h = parseFloat(b.hikePercent) || 0;
                                            return (
                                                <div key={`nb-${i}`} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2">
                                                    <span className="text-[8px] font-black text-emerald-400 shrink-0 uppercase">new</span>
                                                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                                                        <span className="text-[9px] text-gray-400">Rating</span>
                                                        <input type="number" step="0.01" value={b.minRating} onChange={e => setDraftBands(prev => prev.map((x, j) => j === i ? { ...x, minRating: e.target.value } : x))}
                                                            className="w-14 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-[10px] font-semibold text-center focus:outline-none" />
                                                        <span className="text-[9px] text-gray-400">–</span>
                                                        <input type="number" step="0.01" value={b.maxRating} onChange={e => setDraftBands(prev => prev.map((x, j) => j === i ? { ...x, maxRating: e.target.value } : x))}
                                                            className="w-14 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-[10px] font-semibold text-center focus:outline-none" />
                                                        <span className="text-[9px] text-gray-400">→ Hike</span>
                                                        <input type="number" step="0.01" value={b.hikePercent} onChange={e => setDraftBands(prev => prev.map((x, j) => j === i ? { ...x, hikePercent: e.target.value } : x))}
                                                            className="w-14 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-[10px] font-semibold text-center focus:outline-none" />
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${bandColor(h)}`}>{h}%</span>
                                                    </div>
                                                    <button type="button" onClick={() => setDraftBands(prev => prev.filter((_, j) => j !== i))} className="shrink-0 text-gray-300 hover:text-rose-500 text-xs font-bold">✕</button>
                                                </div>
                                            );
                                        })}

                                        {existingBands.filter(b => !b._deleted).length === 0 && draftBands.length === 0 && (
                                            <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-6 text-center text-[11px] text-gray-400 italic">
                                                No hike bands yet — use a preset or add one below
                                            </div>
                                        )}
                                    </div>

                                    {/* Add band row */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shrink-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Rating</span>
                                            <input type="number" step="0.01" placeholder="1.00" value={bandForm.minRating} onChange={e => setBandForm(f => ({ ...f, minRating: e.target.value }))}
                                                className="w-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-xl text-[10px] font-semibold text-center focus:outline-none" />
                                            <span className="text-[9px] text-gray-400">–</span>
                                            <input type="number" step="0.01" placeholder="5.00" value={bandForm.maxRating} onChange={e => setBandForm(f => ({ ...f, maxRating: e.target.value }))}
                                                className="w-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-xl text-[10px] font-semibold text-center focus:outline-none" />
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Hike %</span>
                                            <input type="number" step="0.01" placeholder="10.00" value={bandForm.hikePercent} onChange={e => setBandForm(f => ({ ...f, hikePercent: e.target.value }))}
                                                className="w-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-xl text-[10px] font-semibold text-center focus:outline-none" />
                                            <button type="button"
                                                disabled={!bandForm.minRating || !bandForm.maxRating || !bandForm.hikePercent}
                                                onClick={() => { setDraftBands(prev => [...prev, bandForm]); setBandForm(EMPTY_BAND); }}
                                                className="ml-auto px-3 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-[10px] font-black transition">
                                                + Add Band
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer buttons */}
                            <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
                                {step === 3 ? (
                                    <>
                                        <button type="button" onClick={() => setStep(2)}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold">← Back</button>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setShowForm(false)}
                                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl text-xs font-bold">Cancel</button>
                                            <button type="submit" disabled={saving}
                                                className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                                                {saving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                                {saving ? (editId ? 'Saving...' : 'Creating...') : editId ? 'Save All Changes' : `Create Cycle`}
                                            </button>
                                        </div>
                                    </>
                                ) : step === 2 ? (
                                    <>
                                        <button type="button" onClick={() => setStep(1)}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold">← Back</button>
                                        <button type="button" onClick={() => setStep(3)}
                                            className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold">
                                            Next: Hike Bands →
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" onClick={() => setShowForm(false)}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl text-xs font-bold">Cancel</button>
                                        <button type="button" disabled={!form.name || !form.start_date || !form.end_date}
                                            onClick={() => { if (!form.name || !form.start_date || !form.end_date) { setErrorMsg('Name, start date and end date are required.'); return; } setErrorMsg(''); setStep(2); }}
                                            className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:text-gray-100 text-white rounded-xl text-xs font-bold">
                                            Next: {editId ? 'Edit Questions →' : 'Add Questions →'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            ), document.body)}
        </div>
    );
};

export default AppraisalCycles;
