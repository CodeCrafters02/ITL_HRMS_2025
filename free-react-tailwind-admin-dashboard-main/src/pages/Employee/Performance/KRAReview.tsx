import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

interface EvalData { id: number; score: number; remarks: string; evaluated_at: string; }

interface KRAItem {
    id: number;
    employee: number;
    employee_name: string;
    employee_designation: string;
    employee_department: string;
    kra_title: string;
    kra_description: string;
    reviewer: number | null;
    reviewer_name: string | null;
    weightage: number;
    target_description: string;
    created_at: string;
    evaluation: EvalData | null;
}

const scoreLabel = (s: number) => s >= 4 ? 'Excellent' : s >= 3 ? 'Good' : s >= 2 ? 'Average' : 'Below Average';
const scoreColor = (s: number) => s >= 4 ? 'text-emerald-600 dark:text-emerald-400' : s >= 3 ? 'text-teal-600 dark:text-teal-400' : s >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400';
const scoreBg = (s: number) => s >= 4 ? 'bg-emerald-500' : s >= 3 ? 'bg-teal-500' : s >= 2 ? 'bg-amber-500' : 'bg-rose-500';

const KRAReview = () => {
    const dispatch = useDispatch();
    const [myEmpId, setMyEmpId] = useState<number | null>(null);
    const [kras, setKras] = useState<KRAItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
    const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null);
    const [forms, setForms] = useState<Record<number, { score: string; remarks: string }>>({});
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => { dispatch(setPageTitle('KRA Review')); }, [dispatch]);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadKRAs = async (id: number) => {
        const res = await axios.get(`${API_BASE}/employee/employee-kra/?reviewer_id=${id}`, { headers: auth() });
        setKras(Array.isArray(res.data) ? res.data : res.data?.results ?? []);
    };

    useEffect(() => {
        (async () => {
            try {
                const idRes = await axios.get(`${API_BASE}/employee/employee-id/`, { headers: auth() });
                const id = idRes.data?.id;
                setMyEmpId(id);
                if (id) await loadKRAs(id);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    const handleSubmit = async (kra: KRAItem) => {
        const f = forms[kra.id];
        if (!f?.score || isNaN(parseFloat(f.score))) return showToast('Enter a valid score (0–5).', 'error');
        const score = parseFloat(f.score);
        if (score < 0 || score > 5) return showToast('Score must be 0–5.', 'error');
        setSubmitting(kra.id);
        try {
            await axios.post(`${API_BASE}/employee/kra-evaluations/`, {
                employee_kra: kra.id, score, remarks: f.remarks || '',
            }, { headers: auth() });
            if (myEmpId) await loadKRAs(myEmpId);
            setForms(p => { const n = { ...p }; delete n[kra.id]; return n; });
            showToast('Evaluation submitted.', 'success');
        } catch (e: any) {
            showToast(e?.response?.data?.detail || 'Failed.', 'error');
        } finally { setSubmitting(null); }
    };

    // Group by employee
    const grouped = kras.reduce<Record<number, { name: string; designation: string; department: string; kras: KRAItem[] }>>((acc, k) => {
        if (!acc[k.employee]) acc[k.employee] = { name: k.employee_name, designation: k.employee_designation, department: k.employee_department, kras: [] };
        acc[k.employee].kras.push(k);
        return acc;
    }, {});

    const filteredKRAs = (list: KRAItem[]) => list.filter(k => {
        if (filter === 'pending') return !k.evaluation;
        if (filter === 'reviewed') return !!k.evaluation;
        return true;
    });

    const pendingTotal = kras.filter(k => !k.evaluation).length;
    const reviewedTotal = kras.filter(k => k.evaluation).length;

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-gray-400">Loading KRAs assigned for your review...</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {toast && (
                <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-xs font-bold ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black text-gray-800 dark:text-white">KRA Review Queue</h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            KRAs assigned to you for performance evaluation. Score each KRA to contribute to the employee's performance rating.
                        </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <div className="text-center bg-gray-50 dark:bg-gray-850/40 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-3">
                            <span className="block text-2xl font-black text-gray-800 dark:text-white">{kras.length}</span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Total KRAs</span>
                        </div>
                        <div className="text-center bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-2xl px-5 py-3">
                            <span className="block text-2xl font-black text-amber-600 dark:text-amber-400">{pendingTotal}</span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-500 mt-0.5">Pending</span>
                        </div>
                        <div className="text-center bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl px-5 py-3">
                            <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400">{reviewedTotal}</span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-0.5">Reviewed</span>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                {kras.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Review Progress</span>
                            <span className="text-[10px] font-black text-emerald-600">{Math.round((reviewedTotal / kras.length) * 100)}% complete</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(reviewedTotal / kras.length) * 100}%` }} />
                        </div>
                    </div>
                )}

                {/* Filter tabs */}
                <div className="flex gap-2 mt-4">
                    {(['all', 'pending', 'reviewed'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition ${filter === f ? 'bg-indigo-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            {f === 'all' ? `All (${kras.length})` : f === 'pending' ? `Pending (${pendingTotal})` : `Reviewed (${reviewedTotal})`}
                        </button>
                    ))}
                </div>
            </div>

            {kras.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-20 text-center shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-sm font-bold text-gray-400">No KRAs assigned for your review</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">You'll appear here when assigned as a reviewer on an employee's KRA.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(grouped).map(([empIdStr, group]) => {
                        const empIdNum = parseInt(empIdStr);
                        const visible = filteredKRAs(group.kras);
                        if (visible.length === 0) return null;
                        const isOpen = expandedEmployee === empIdNum || expandedEmployee === null;
                        const doneCount = group.kras.filter(k => k.evaluation).length;

                        return (
                            <div key={empIdStr} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                {/* Employee header */}
                                <button
                                    onClick={() => setExpandedEmployee(isOpen && expandedEmployee === empIdNum ? null : empIdNum)}
                                    className="w-full flex items-center gap-4 p-5 hover:bg-gray-50/50 dark:hover:bg-gray-850/20 transition text-left"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                                        {group.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-sm font-black text-gray-800 dark:text-white">{group.name}</span>
                                        <span className="block text-[11px] text-gray-400 mt-0.5">{group.designation || '—'} · {group.department || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(doneCount / group.kras.length) * 100}%` }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400">{doneCount}/{group.kras.length}</span>
                                        </div>
                                        {doneCount === group.kras.length ? (
                                            <span className="text-[9px] font-black px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Done</span>
                                        ) : (
                                            <span className="text-[9px] font-black px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider">{group.kras.length - doneCount} left</span>
                                        )}
                                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedEmployee === empIdNum ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </button>

                                {/* KRAs for this employee */}
                                {(expandedEmployee === empIdNum || expandedEmployee === null) && (
                                    <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800/60">
                                        {visible.map((kra, idx) => {
                                            const ev = kra.evaluation;
                                            const f = forms[kra.id];
                                            const isEditing = f !== undefined;
                                            const colors = ['#14b8a6','#6366f1','#8b5cf6','#f59e0b','#f43f5e','#06b6d4'];
                                            const color = colors[idx % colors.length];
                                            const circumference = 2 * Math.PI * 14;
                                            const dash = (kra.weightage / 100) * circumference;

                                            return (
                                                <div key={kra.id} className="p-5">
                                                    <div className="flex items-start gap-4">
                                                        <div className="shrink-0 relative w-10 h-10">
                                                            <svg viewBox="0 0 32 32" className="w-10 h-10 -rotate-90">
                                                                <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-gray-800" />
                                                                <circle cx="16" cy="16" r="14" fill="none" strokeWidth="3"
                                                                    stroke={color}
                                                                    strokeDasharray={`${dash} ${circumference - dash}`}
                                                                    strokeLinecap="round"
                                                                />
                                                            </svg>
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <span className="text-[9px] font-black" style={{ color }}>{kra.weightage}%</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <h4 className="text-xs font-black text-gray-800 dark:text-white">{kra.kra_title}</h4>
                                                                {ev ? (
                                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase shrink-0">Reviewed</span>
                                                                ) : (
                                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase shrink-0">Pending</span>
                                                                )}
                                                            </div>
                                                            {kra.kra_description && <p className="text-[11px] text-gray-400 line-clamp-1 mb-2">{kra.kra_description}</p>}
                                                            {kra.target_description && (
                                                                <div className="bg-gray-50 dark:bg-gray-850/40 rounded-lg px-3 py-1.5 mb-3">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Target: </span>
                                                                    <span className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold">{kra.target_description}</span>
                                                                </div>
                                                            )}

                                                            {/* Eval area */}
                                                            {ev && !isEditing ? (
                                                                <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl px-4 py-3">
                                                                    <div>
                                                                        <span className={`block text-2xl font-black ${scoreColor(ev.score)}`}>{ev.score.toFixed(1)}</span>
                                                                        <span className={`block text-[9px] font-black uppercase ${scoreColor(ev.score)}`}>{scoreLabel(ev.score)}</span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="h-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full overflow-hidden">
                                                                            <div className={`h-full rounded-full ${scoreBg(ev.score)}`} style={{ width: `${(ev.score / 5) * 100}%` }} />
                                                                        </div>
                                                                        {ev.remarks && <p className="text-[10px] text-indigo-600 dark:text-indigo-300 mt-1.5 font-semibold italic">"{ev.remarks}"</p>}
                                                                        <span className="text-[9px] text-gray-400 mt-1 block">Evaluated {ev.evaluated_at}</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setForms(p => ({ ...p, [kra.id]: { score: String(ev.score), remarks: ev.remarks } }))}
                                                                        className="px-3 py-1.5 rounded-lg text-[10px] font-black border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-indigo-950/40 transition"
                                                                    >Edit</button>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2.5">
                                                                    <div className="grid grid-cols-4 gap-2.5">
                                                                        <div>
                                                                            <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Score (0–5)</label>
                                                                            <input
                                                                                type="number" min={0} max={5} step={0.1}
                                                                                value={f?.score ?? ''}
                                                                                onChange={e => setForms(p => ({ ...p, [kra.id]: { ...(p[kra.id] ?? { remarks: '' }), score: e.target.value } }))}
                                                                                onFocus={() => !f && setForms(p => ({ ...p, [kra.id]: { score: ev ? String(ev.score) : '', remarks: ev?.remarks ?? '' } }))}
                                                                                placeholder="0–5"
                                                                                className="w-full text-sm font-black bg-white dark:bg-gray-850/50 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 transition"
                                                                            />
                                                                        </div>
                                                                        <div className="col-span-3">
                                                                            <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Remarks</label>
                                                                            <input
                                                                                type="text"
                                                                                value={f?.remarks ?? ''}
                                                                                onChange={e => setForms(p => ({ ...p, [kra.id]: { ...(p[kra.id] ?? { score: '' }), remarks: e.target.value } }))}
                                                                                onFocus={() => !f && setForms(p => ({ ...p, [kra.id]: { score: ev ? String(ev.score) : '', remarks: ev?.remarks ?? '' } }))}
                                                                                placeholder="Performance remarks..."
                                                                                className="w-full text-xs font-semibold bg-white dark:bg-gray-850/50 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 transition"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 shrink-0">Quick:</span>
                                                                        {[1,2,3,4,5].map(s => (
                                                                            <button key={s}
                                                                                onClick={() => setForms(p => ({ ...p, [kra.id]: { ...(p[kra.id] ?? { remarks: '' }), score: String(s) } }))}
                                                                                className={`w-7 h-7 rounded-lg text-xs font-black transition ${f?.score === String(s) ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-950/30 hover:text-indigo-600'}`}
                                                                            >{s}</button>
                                                                        ))}
                                                                        <div className="ml-auto flex gap-2">
                                                                            {isEditing && <button onClick={() => setForms(p => { const n={...p}; delete n[kra.id]; return n; })} className="px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600 transition">Cancel</button>}
                                                                            <button
                                                                                onClick={() => handleSubmit(kra)}
                                                                                disabled={submitting === kra.id}
                                                                                className="px-4 py-1.5 rounded-xl text-[10px] font-black bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm disabled:opacity-60 transition flex items-center gap-1.5"
                                                                            >
                                                                                {submitting === kra.id && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                                                                {ev ? 'Update' : 'Submit'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
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

export default KRAReview;
