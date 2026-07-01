import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
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

const EMPTY_FORM: FormState = {
    name: '', start_date: '', end_date: '',
    self_appraisal_deadline: '', manager_eval_deadline: '', status: 'draft',
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
    const navigate = useNavigate();
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

    const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); setErrorMsg(''); };
    const openEdit = (c: Cycle) => {
        setForm({
            name: c.name, start_date: c.start_date, end_date: c.end_date,
            self_appraisal_deadline: c.self_appraisal_deadline?.slice(0, 10) || '',
            manager_eval_deadline: c.manager_eval_deadline?.slice(0, 10) || '',
            status: c.status,
        });
        setEditId(c.id);
        setShowForm(true);
        setErrorMsg('');
    };

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
                setSuccessMsg('Cycle updated.');
            } else {
                const res = await axios.post(`${API_BASE}/employee/appraisal-cycles/`, payload, { headers: headers() });
                setCycles(prev => [res.data, ...prev]);
                setSelectedId(res.data.id);
                setSuccessMsg('Cycle created.');
            }
            setShowForm(false);
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

                            {/* CTA to question builder */}
                            <div className="flex-1 flex flex-col justify-end">
                                <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-gray-700 dark:text-white">Manage Review Questions</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">Build self, manager, peer & HR question sets for this cycle.</div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/admin/performance/review-questions?cycle=${selected.id}`)}
                                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold whitespace-nowrap ml-4">
                                        Open Builder →
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create / Edit Modal */}
            {showForm && createPortal((<div className="fixed inset-0 z-[70000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate__animated animate__zoomIn">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800 mb-5">
                            <h3 className="text-sm font-black text-gray-800 dark:text-white">{editId ? 'Edit Cycle' : 'New Appraisal Cycle'}</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
                        </div>
                        {errorMsg && <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-2 rounded-lg text-xs font-bold mb-4">⚠️ {errorMsg}</div>}
                        <form onSubmit={handleSave} className="space-y-4">
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
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Status</label>
                                <div className="flex gap-2">
                                    {(['draft', 'active', 'completed'] as const).map(s => (
                                        <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold capitalize transition ${form.status === s ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold">Cancel</button>
                                <button type="submit" disabled={saving} className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold">
                                    {saving ? 'Saving...' : editId ? 'Update Cycle' : 'Create Cycle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ), document.body)}
        </div>
    );
};

export default AppraisalCycles;
