import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

interface KRAEvaluation {
    id: number;
    employee_kra: number;
    score: number;
    remarks: string;
    reviewer_name: string | null;
    evaluated_at: string;
}

interface EmployeeKRA {
    id: number;
    kra_title: string;
    kra_description: string;
    reviewer_name: string | null;
    reviewer: number | null;
    weightage: number;
    target_description: string;
    created_at: string;
}

interface KPI {
    id: number;
    name: string;
    kra_master: number | null;
    measurement_unit: string;
    target_value: string;
    description: string;
}

const WEIGHT_COLOR = (w: number) => w >= 30 ? 'text-emerald-600' : w >= 15 ? 'text-amber-600' : 'text-rose-500';
const RING_DASH = (w: number) => `${Math.round((w / 100) * 100)} 100`;

const KRAs = () => {
    const dispatch = useDispatch();
    const [empId, setEmpId] = useState<number | null>(null);
    const [reviewerId, setReviewerId] = useState<number | null>(null);
    const [kras, setKras] = useState<EmployeeKRA[]>([]);
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [evaluations, setEvaluations] = useState<KRAEvaluation[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [evalForm, setEvalForm] = useState<Record<number, { score: string; remarks: string }>>({});
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => { dispatch(setPageTitle('My KRAs')); }, [dispatch]);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadAll = async (empId: number) => {
        const [kraRes, kpiRes, evalRes] = await Promise.all([
            axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${empId}`, { headers: headers() }),
            axios.get(`${API_BASE}/employee/kpi-master/`, { headers: headers() }),
            axios.get(`${API_BASE}/employee/kra-evaluations/?employee_id=${empId}`, { headers: headers() }),
        ]);
        setKras(Array.isArray(kraRes.data) ? kraRes.data : kraRes.data?.results ?? []);
        setKpis(Array.isArray(kpiRes.data) ? kpiRes.data : kpiRes.data?.results ?? []);
        setEvaluations(Array.isArray(evalRes.data) ? evalRes.data : evalRes.data?.results ?? []);
    };

    useEffect(() => {
        (async () => {
            try {
                const idRes = await axios.get(`${API_BASE}/employee/employee-id/`, { headers: headers() });
                const id = idRes.data?.id;
                setEmpId(id);
                setReviewerId(id);
                if (id) await loadAll(id);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSubmitEval = async (kraId: number) => {
        const f = evalForm[kraId];
        if (!f?.score) return showToast('Score is required.', 'error');
        setSubmitting(kraId);
        try {
            await axios.post(`${API_BASE}/employee/kra-evaluations/`, {
                employee_kra: kraId,
                score: parseFloat(f.score),
                remarks: f.remarks || '',
            }, { headers: headers() });
            if (empId) await loadAll(empId);
            setEvalForm(p => { const n = { ...p }; delete n[kraId]; return n; });
            showToast('Evaluation submitted.', 'success');
        } catch (e: any) {
            showToast(e?.response?.data?.detail || 'Failed to submit.', 'error');
        } finally {
            setSubmitting(null);
        }
    };

    const totalWeight = kras.reduce((s, k) => s + (k.weightage || 0), 0);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-gray-400">Loading your KRAs...</span>
            </div>
        </div>
    );

    const evalMap = Object.fromEntries(evaluations.map(e => [e.employee_kra, e]));
    const evaluatedCount = kras.filter(k => evalMap[k.id]).length;
    const weightedPerfScore = (() => {
        const evaled = kras.filter(k => evalMap[k.id]);
        if (!evaled.length) return null;
        const totalW = evaled.reduce((s, k) => s + k.weightage, 0);
        if (!totalW) return evaled.reduce((s, k) => s + evalMap[k.id].score, 0) / evaled.length;
        return evaled.reduce((s, k) => s + evalMap[k.id].score * k.weightage, 0) / totalW;
    })();

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-xs font-bold ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black text-gray-800 dark:text-white">My Key Result Areas</h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">KRAs assigned to your role — defining your core performance expectations.</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <div className="text-center bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 rounded-2xl px-5 py-3">
                            <span className="block text-2xl font-black text-teal-600 dark:text-teal-400">{kras.length}</span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-500 mt-0.5">KRAs Assigned</span>
                        </div>
                        <div className={`text-center rounded-2xl px-5 py-3 border ${totalWeight === 100 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40'}`}>
                            <span className={`block text-2xl font-black ${totalWeight === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{totalWeight}%</span>
                            <span className={`block text-[10px] font-bold uppercase tracking-wider mt-0.5 ${totalWeight === 100 ? 'text-emerald-500' : 'text-amber-500'}`}>Total Weight</span>
                        </div>
                        <div className="text-center bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl px-5 py-3">
                            <span className="block text-2xl font-black text-indigo-600 dark:text-indigo-400">{evaluatedCount}/{kras.length}</span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-500 mt-0.5">Evaluated</span>
                        </div>
                        {weightedPerfScore !== null && (
                            <div className="text-center bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 rounded-2xl px-5 py-3">
                                <span className="block text-2xl font-black text-violet-600 dark:text-violet-400">{weightedPerfScore.toFixed(2)}</span>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-500 mt-0.5">KRA Score /5</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Weight distribution bar */}
                {kras.length > 0 && (
                    <div className="mt-5">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Weightage Distribution</span>
                            <span className={`text-[10px] font-black ${totalWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{totalWeight}/100%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                            {kras.map((k, i) => {
                                const colors = ['bg-teal-500','bg-indigo-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-cyan-500'];
                                return <div key={k.id} className={`h-full ${colors[i % colors.length]} transition-all`} style={{ width: `${k.weightage}%` }} title={`${k.kra_title}: ${k.weightage}%`} />;
                            })}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {kras.map((k, i) => {
                                const colors = ['bg-teal-500','bg-indigo-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-cyan-500'];
                                return (
                                    <div key={k.id} className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{k.kra_title} ({k.weightage}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* KRA Cards */}
            {kras.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No KRAs assigned yet</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Your manager will assign KRAs to your profile.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {kras.map((kra, idx) => {
                        const linkedKPIs = kpis.filter(k => k.kra_master === (kra as any).kra_master);
                        const isExpanded = expandedId === kra.id;
                        const colors = [
                            { ring: '#14b8a6', bg: 'from-teal-500/5 to-teal-500/0', badge: 'bg-teal-500/10 text-teal-700 dark:text-teal-300', border: 'border-teal-100 dark:border-teal-900/40' },
                            { ring: '#6366f1', bg: 'from-indigo-500/5 to-indigo-500/0', badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300', border: 'border-indigo-100 dark:border-indigo-900/40' },
                            { ring: '#8b5cf6', bg: 'from-violet-500/5 to-violet-500/0', badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', border: 'border-violet-100 dark:border-violet-900/40' },
                            { ring: '#f59e0b', bg: 'from-amber-500/5 to-amber-500/0', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', border: 'border-amber-100 dark:border-amber-900/40' },
                            { ring: '#f43f5e', bg: 'from-rose-500/5 to-rose-500/0', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300', border: 'border-rose-100 dark:border-rose-900/40' },
                            { ring: '#06b6d4', bg: 'from-cyan-500/5 to-cyan-500/0', badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300', border: 'border-cyan-100 dark:border-cyan-900/40' },
                        ];
                        const c = colors[idx % colors.length];
                        const circumference = 2 * Math.PI * 18;
                        const dash = (kra.weightage / 100) * circumference;

                        return (
                            <div key={kra.id} className={`bg-white dark:bg-gray-900 rounded-3xl border ${c.border} shadow-sm overflow-hidden transition-all duration-300`}>
                                {/* Card Top gradient strip */}
                                <div className={`h-1.5 bg-gradient-to-r ${c.bg.replace('from-', 'from-').replace('/5', '').replace('/0', '/0')}`}
                                    style={{ background: `${c.ring}` }} />

                                <div className="p-5">
                                    <div className="flex items-start gap-4">
                                        {/* Weightage Ring */}
                                        <div className="shrink-0 relative w-14 h-14">
                                            <svg viewBox="0 0 44 44" className="w-14 h-14 -rotate-90">
                                                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-100 dark:text-gray-800" />
                                                <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4"
                                                    stroke={c.ring}
                                                    strokeDasharray={`${dash} ${circumference - dash}`}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className={`text-[11px] font-black ${WEIGHT_COLOR(kra.weightage)}`}>{kra.weightage}%</span>
                                            </div>
                                        </div>

                                        {/* KRA Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-sm font-black text-gray-800 dark:text-white leading-tight">{kra.kra_title}</h3>
                                                <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${c.badge}`}>
                                                    KRA #{idx + 1}
                                                </span>
                                            </div>
                                            {kra.kra_description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">{kra.kra_description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Target Description */}
                                    {kra.target_description && (
                                        <div className="mt-4 bg-gray-50 dark:bg-gray-850/40 rounded-xl p-3">
                                            <span className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Target / Objective</span>
                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">{kra.target_description}</p>
                                        </div>
                                    )}

                                    {/* Meta row */}
                                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                                        {kra.reviewer_name && (
                                            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/20 px-3 py-1.5 rounded-xl">
                                                <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Reviewer: {kra.reviewer_name}</span>
                                            </div>
                                        )}
                                        {linkedKPIs.length > 0 && (
                                            <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-950/20 px-3 py-1.5 rounded-xl">
                                                <svg className="w-3 h-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">{linkedKPIs.length} KPI{linkedKPIs.length !== 1 ? 's' : ''}</span>
                                            </div>
                                        )}
                                        <span className="text-[10px] font-semibold text-gray-400 ml-auto">
                                            {kra.created_at ? new Date(kra.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                        </span>
                                    </div>

                                    {/* Evaluation Status */}
                                    {(() => {
                                        const ev = evalMap[kra.id];
                                        const isReviewer = kra.reviewer === reviewerId;
                                        const f = evalForm[kra.id];
                                        const isEditingEval = f !== undefined;

                                        return (
                                            <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Reviewer Evaluation</span>
                                                    {ev && !isEditingEval && isReviewer && (
                                                        <button
                                                            onClick={() => setEvalForm(p => ({ ...p, [kra.id]: { score: String(ev.score), remarks: ev.remarks } }))}
                                                            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition"
                                                        >Edit</button>
                                                    )}
                                                </div>

                                                {ev && !isEditingEval ? (
                                                    /* Submitted evaluation display */
                                                    <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-xl p-3 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{Number(ev.score).toFixed(1)}</span>
                                                                <span className="text-[10px] text-indigo-400 font-bold">/ 5.00</span>
                                                                <div className="flex gap-0.5 ml-1">
                                                                    {[1,2,3,4,5].map(s => (
                                                                        <div key={s} className={`w-4 h-1.5 rounded-full ${s <= Math.round(ev.score) ? 'bg-indigo-500' : 'bg-indigo-100 dark:bg-indigo-900/40'}`} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <span className="text-[9px] text-gray-400 font-semibold">by {ev.reviewer_name || 'Reviewer'} · {new Date(ev.evaluated_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>
                                                        </div>
                                                        {ev.remarks && <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold leading-relaxed">"{ev.remarks}"</p>}
                                                    </div>
                                                ) : isReviewer || !ev ? (
                                                    /* Evaluation form — shown to reviewer or when pending */
                                                    isReviewer ? (
                                                        <div className="space-y-2">
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div>
                                                                    <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Score (0–5)</label>
                                                                    <input
                                                                        type="number" min={0} max={5} step={0.1}
                                                                        value={f?.score ?? ''}
                                                                        onChange={e => setEvalForm(p => ({ ...p, [kra.id]: { ...p[kra.id], score: e.target.value } }))}
                                                                        placeholder="e.g. 4.2"
                                                                        className="w-full text-xs font-bold bg-gray-50 dark:bg-gray-850/50 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 transition"
                                                                    />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Remarks (optional)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={f?.remarks ?? ''}
                                                                        onChange={e => setEvalForm(p => ({ ...p, [kra.id]: { ...p[kra.id], remarks: e.target.value } }))}
                                                                        placeholder="Add reviewer remarks..."
                                                                        className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-850/50 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 transition"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 justify-end">
                                                                {isEditingEval && (
                                                                    <button onClick={() => setEvalForm(p => { const n={...p}; delete n[kra.id]; return n; })} className="px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600 transition">Cancel</button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleSubmitEval(kra.id)}
                                                                    disabled={submitting === kra.id}
                                                                    className="px-4 py-1.5 rounded-xl text-[10px] font-black bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm disabled:opacity-60 transition flex items-center gap-1.5"
                                                                >
                                                                    {submitting === kra.id && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                                                    {ev ? 'Update' : 'Submit'} Evaluation
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 rounded-xl px-3 py-2.5">
                                                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Awaiting evaluation from {kra.reviewer_name || 'reviewer'}</span>
                                                        </div>
                                                    )
                                                ) : null}
                                            </div>
                                        );
                                    })()}

                                    {/* KPIs Expandable */}
                                    {linkedKPIs.length > 0 && (
                                        <div className="mt-3">
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : kra.id)}
                                                className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 border-t border-gray-100 dark:border-gray-800 transition"
                                            >
                                                <span>KPIs linked to this KRA</span>
                                                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                            </button>
                                            {isExpanded && (
                                                <div className="space-y-2 mt-2">
                                                    {linkedKPIs.map(kpi => (
                                                        <div key={kpi.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-850/40 rounded-xl px-3 py-2.5">
                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.ring }} />
                                                            <div className="flex-1 min-w-0">
                                                                <span className="block text-[11px] font-bold text-gray-800 dark:text-white truncate">{kpi.name}</span>
                                                                {kpi.description && <span className="block text-[10px] text-gray-400 mt-0.5 truncate">{kpi.description}</span>}
                                                            </div>
                                                            {kpi.target_value && (
                                                                <div className="shrink-0 text-right">
                                                                    <span className="block text-[10px] font-black text-gray-700 dark:text-gray-200">{kpi.target_value}</span>
                                                                    {kpi.measurement_unit && <span className="block text-[9px] text-gray-400">{kpi.measurement_unit}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default KRAs;
