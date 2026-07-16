import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

/* ─── Types ─────────────────────────────────────────────── */
interface Cycle { id: number; name: string; status: string; }

interface AAnswer {
    id: number;
    question_text: string;
    question_type: 'scale' | 'yes_no';
    max_score: number;
    role_type: 'self' | 'manager' | 'peer' | 'hr';
    rating_score: number | null;
    submitted_by: number | null;
    submitted_by_name: string | null;
    cycle_name?: string; // injected when aggregating all cycles
}

interface DirectFeedback {
    id: number;
    sender_name: string;
    feedback_text: string;
    category: string;
    category_display: string;
    rating: number | null;
    visibility: string;
    acknowledged: boolean;
    created_at: string;
}

type RoleKey  = 'self' | 'manager' | 'peer' | 'hr';
type MainTab  = 'appraisal' | 'direct';

/* ─── Constants ──────────────────────────────────────────── */
const ROLE_CFG: Record<RoleKey, { label: string; icon: string; text: string; ring: string; border: string; headerBg: string; pill: string }> = {
    self:    { label:'Self',    icon:'👤', text:'text-violet-600 dark:text-violet-400', ring:'stroke-violet-500', border:'border-violet-100 dark:border-violet-900/40', headerBg:'bg-violet-50 dark:bg-violet-950/20',  pill:'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
    manager: { label:'Manager', icon:'👔', text:'text-teal-600 dark:text-teal-400',    ring:'stroke-teal-500',   border:'border-teal-100 dark:border-teal-900/40',     headerBg:'bg-teal-50 dark:bg-teal-950/20',     pill:'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
    peer:    { label:'Peer',    icon:'🤝', text:'text-indigo-600 dark:text-indigo-400', ring:'stroke-indigo-500', border:'border-indigo-100 dark:border-indigo-900/40', headerBg:'bg-indigo-50 dark:bg-indigo-950/20', pill:'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
    hr:      { label:'HR',      icon:'🛡️', text:'text-rose-600 dark:text-rose-400',    ring:'stroke-rose-500',   border:'border-rose-100 dark:border-rose-900/40',     headerBg:'bg-rose-50 dark:bg-rose-950/20',     pill:'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
};

const CAT_CFG: Record<string, { icon: string; cls: string }> = {
    peer_recognition: { icon:'🤝', cls:'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
    appreciation:     { icon:'🌟', cls:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    manager_coaching: { icon:'💬', cls:'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
    constructive:     { icon:'🔧', cls:'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    goal_progress:    { icon:'🎯', cls:'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
};

const AVATAR_COLORS = ['bg-indigo-500','bg-teal-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-blue-500','bg-emerald-500','bg-pink-500'];
const avatarBg = (name: string) => AVATAR_COLORS[(name.charCodeAt(0)+(name.charCodeAt(1)||0))%AVATAR_COLORS.length];
const initials = (name: string) => name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'?';

/* ─── Scoring helpers ────────────────────────────────────── */
const toNorm5 = (a: AAnswer): number | null => {
    if (a.rating_score === null) return null;
    if (a.question_type === 'yes_no') return a.rating_score === 1 ? 5 : 0;
    return (a.rating_score / (a.max_score || 5)) * 5;
};
const avg5 = (answers: AAnswer[]) => {
    const s = answers.map(toNorm5).filter((x): x is number => x !== null);
    return s.length ? s.reduce((a,b)=>a+b,0)/s.length : null;
};

/* ─── Sub-components ─────────────────────────────────────── */
const ScoreRing = ({ score, ringCls='stroke-teal-500', size=52 }: { score:number|null; ringCls?:string; size?:number }) => {
    const pct = score !== null ? Math.min((score/5)*100, 100) : 0;
    const r = size*0.38, c = 2*Math.PI*r;
    return (
        <div className="relative shrink-0" style={{ width:size, height:size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ display:'block' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={size*0.1} className="stroke-gray-100 dark:stroke-gray-800"/>
                <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={size*0.1}
                    strokeDasharray={c} strokeDashoffset={c*(1-pct/100)}
                    strokeLinecap="round" className={`${ringCls} transition-all duration-700`}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-black text-gray-800 dark:text-white leading-none" style={{ fontSize:size*0.2 }}>
                    {score !== null ? score.toFixed(1) : '—'}
                </span>
                <span className="text-gray-400 leading-none" style={{ fontSize:size*0.13 }}>/5</span>
            </div>
        </div>
    );
};

const Stars5 = ({ score }: { score:number|null }) => {
    const filled = score !== null ? Math.round(score) : 0;
    return (
        <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(i => <span key={i} className={`text-sm ${i<=filled?'text-amber-400':'text-gray-200 dark:text-gray-700'}`}>★</span>)}
            {score !== null && <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 ml-1">{score.toFixed(1)}</span>}
        </div>
    );
};

const AnswerRow = ({ a, idx }: { a:AAnswer; idx:number }) => {
    const norm = toNorm5(a);
    return (
        <div className="px-5 py-3.5 flex items-start gap-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
            <span className="text-[9px] text-gray-300 font-bold shrink-0 mt-0.5 w-4">{idx+1}.</span>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-snug mb-2">{a.question_text}</p>
                {a.cycle_name && <span className="text-[8px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full mb-1.5 inline-block">{a.cycle_name}</span>}
                <Stars5 score={norm}/>
                {a.question_type === 'yes_no' && (
                    <span className={`mt-1.5 inline-flex text-[8px] font-black px-2 py-0.5 rounded-full ${a.rating_score===1?'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400':'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                        {a.rating_score===1?'✓ Yes (5★)':'✕ No (0★)'}
                    </span>
                )}
            </div>
            {a.question_type==='scale' && a.rating_score !== null && (
                <span className="shrink-0 text-sm font-black text-amber-500">{a.rating_score}<span className="text-[9px] text-gray-400">/{a.max_score}</span></span>
            )}
        </div>
    );
};

/* ─── Main component ─────────────────────────────────────── */
const FeedbackReceived = () => {
    const dispatch = useDispatch();

    // Data
    const [cycles, setCycles]           = useState<Cycle[]>([]);
    const [cycleId, setCycleId]         = useState<number | 'all'>('all');
    const [answers, setAnswers]         = useState<AAnswer[]>([]);
    const [directFBs, setDirectFBs]     = useState<DirectFeedback[]>([]);
    const [loading, setLoading]         = useState(true);
    const [loadingDirect, setLoadingDirect] = useState(true);
    const [error, setError]             = useState<string | null>(null);

    // UI state
    const [mainTab, setMainTab]   = useState<MainTab>('appraisal');
    const [roleTab, setRoleTab]   = useState<RoleKey | 'all'>('all');
    const [ackingId, setAckingId] = useState<number | null>(null);
    const [expandedDirectId, setExpandedDirectId] = useState<number | null>(null);
    const [expandedAppraisalKey, setExpandedAppraisalKey] = useState<string | null>(null);

    const API  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const arr  = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    // Load cycles on mount
    useEffect(() => {
        dispatch(setPageTitle('Feedback Received'));
        (async () => {
            try {
                const res  = await axios.get(`${API}/employee/appraisal-cycles/`, { headers: auth() });
                const list: Cycle[] = arr(res.data);
                setCycles(list);
            } catch (e: any) {
                setError(e.response?.data?.detail || 'Failed to load.');
            }
        })();
    }, [dispatch]);

    // Load appraisal answers when cycleId changes
    useEffect(() => {
        if (!cycles.length) return;
        (async () => {
            setLoading(true); setError(null);
            try {
                const url = cycleId === 'all'
                    ? `${API}/employee/appraisal-evaluations/?mine=true`
                    : `${API}/employee/appraisal-evaluations/?mine=true&cycle=${cycleId}`;
                const res  = await axios.get(url, { headers: auth() });
                const evals = arr(res.data);

                if (cycleId === 'all') {
                    // Merge answers from all evals, inject cycle_name
                    const all: AAnswer[] = [];
                    evals.forEach((ev: any) => {
                        (ev.answers || []).forEach((a: any) => all.push({ ...a, cycle_name: ev.cycle_name }));
                    });
                    setAnswers(all);
                } else {
                    setAnswers(evals[0]?.answers || []);
                }
            } catch (e: any) {
                setError(e.response?.data?.detail || 'Failed to load.');
            } finally {
                setLoading(false);
            }
        })();
    }, [cycleId, cycles]);

    // Load direct (continuous) feedback — scoped to current user via ?mine=true
    useEffect(() => {
        (async () => {
            setLoadingDirect(true);
            try {
                const res = await axios.get(`${API}/employee/continuous-feedback/?mine=true`, { headers: auth() });
                const data: DirectFeedback[] = arr(res.data);
                setDirectFBs(data.sort((a,b) => new Date(b.created_at).getTime()-new Date(a.created_at).getTime()));
            } catch { /* non-blocking */ }
            finally { setLoadingDirect(false); }
        })();
    }, []);

    const handleAck = async (id: number) => {
        setAckingId(id);
        try {
            await axios.patch(`${API}/employee/continuous-feedback/${id}/`, { acknowledged: true }, { headers: auth() });
            setDirectFBs(prev => prev.map(f => f.id===id ? { ...f, acknowledged:true } : f));
        } finally { setAckingId(null); }
    };

    /* ── Appraisal data derived ── */
    const byRole: Partial<Record<RoleKey, AAnswer[]>> = {};
    answers.forEach(a => {
        if (!byRole[a.role_type]) byRole[a.role_type] = [];
        byRole[a.role_type]!.push(a);
    });
    const availRoles = (['self','manager','peer','hr'] as RoleKey[]).filter(r => byRole[r]?.length);

    const peerByReviewer: Record<string, AAnswer[]> = {};
    (byRole.peer || []).forEach(a => {
        const k = a.submitted_by_name || `Reviewer #${a.submitted_by}`;
        if (!peerByReviewer[k]) peerByReviewer[k] = [];
        peerByReviewer[k].push(a);
    });

    const roleAvg   = (r: RoleKey) => avg5(byRole[r] || []);
    const roleScores = availRoles.map(roleAvg).filter((s): s is number => s !== null);
    const combined   = roleScores.length ? roleScores.reduce((a,b)=>a+b,0)/roleScores.length : null;

    const unreadDirect = directFBs.filter(f => !f.acknowledged).length;

    return (
        <div className="space-y-6 py-2">
            {/* ── Page Header ── */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="h-2 w-2 rounded-full bg-teal-500" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">Performance Feedback</p>
                    </div>
                    <h2 className="text-xl font-bold text-gray-850 dark:text-white leading-tight">Feedback Hub</h2>
                    <p className="text-xs text-gray-400 mt-1">View your official appraisal reviews alongside direct continuous coaching notes.</p>
                </div>
                
                {/* Cycle selector — only for appraisal tab */}
                {mainTab === 'appraisal' && cycles.length > 0 && (
                    <div className="flex items-center gap-2.5 shrink-0 bg-gray-50 dark:bg-gray-850 border border-gray-200/60 dark:border-gray-800 px-3.5 py-1.5 rounded-2xl">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Appraisal Cycle</label>
                        <select 
                            value={cycleId} 
                            onChange={e => setCycleId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="bg-transparent border-0 px-1 text-xs font-bold text-gray-800 dark:text-white focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Cycles</option>
                            {cycles.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.status === 'active' ? ' (Active)' : c.status === 'completed' ? ' (Completed)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* ── Main Tab Switcher ── */}
            <div className="flex bg-gray-100/80 dark:bg-gray-800/40 p-1 rounded-2xl w-fit">
                <button 
                    onClick={() => setMainTab('appraisal')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-2 ${
                        mainTab === 'appraisal' 
                            ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-white shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    📋 Appraisal Reviews
                </button>
                <button 
                    onClick={() => setMainTab('direct')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-2 ${
                        mainTab === 'direct' 
                            ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-white shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    💬 Direct Notes
                    {unreadDirect > 0 && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-500 text-white animate-pulse">
                            {unreadDirect}
                        </span>
                    )}
                </button>
            </div>

            {/* ══════════ APPRAISAL TAB ══════════ */}
            {mainTab === 'appraisal' && (
                loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                        <div className="h-44 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                        {[1, 2].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-3xl" />)}
                    </div>
                ) : error ? (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl p-6 text-center text-sm font-bold text-red-500">
                        ⚠️ {error}
                    </div>
                ) : answers.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl py-16 text-center shadow-sm">
                        <div className="text-4xl mb-4">📝</div>
                        <p className="text-sm font-bold text-gray-400">No appraisal feedback recorded yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Official scores and reviewer answers will populate here once submitted.</p>
                    </div>
                ) : (
                    <>
                        {/* Score Summary Circles */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {availRoles.map(role => {
                                const s = roleAvg(role);
                                const cfg = ROLE_CFG[role];
                                return (
                                    <div key={role} className={`bg-white dark:bg-gray-900 border ${cfg.border} rounded-3xl p-5 flex flex-col items-center gap-3 shadow-sm hover:shadow transition-all duration-200`}>
                                        <ScoreRing score={s} ringCls={cfg.ring} size={60}/>
                                        <div className="text-center">
                                            <p className={`text-xs font-black uppercase tracking-wider ${cfg.text}`}>{cfg.icon} {cfg.label}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{(byRole[role] || []).length} answer{(byRole[role] || []).length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Combined Overall Score Banner */}
                        {combined !== null && (
                            <div className="relative overflow-hidden bg-gradient-to-r from-gray-950 via-slate-900 to-gray-950 dark:from-black dark:via-slate-950 dark:to-black rounded-3xl p-6 shadow-md border border-gray-800/80">
                                <div className="absolute -right-16 -top-16 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl" />
                                <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl" />
                                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
                                    <ScoreRing score={combined} ringCls="stroke-teal-400" size={68}/>
                                    <div className="flex-1 text-center sm:text-left">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-1">Combined Average Performance Rating</p>
                                        <p className="text-3xl font-extrabold text-white leading-none">
                                            {combined.toFixed(2)}
                                            <span className="text-sm text-gray-500 ml-1">/ 5.00</span>
                                        </p>
                                        <div className="flex justify-center sm:justify-start gap-1 mt-2">
                                            {[1,2,3,4,5].map(i=><span key={i} className={`text-sm ${i<=Math.round(combined)?'text-amber-400':'text-gray-800'}`}>★</span>)}
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-1/3 shrink-0">
                                        <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-1.5">
                                            <span>Combined Index Score</span>
                                            <span className="text-teal-400">{((combined/5)*100).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-850 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-700 shadow-[0_0_12px_rgba(45,212,191,0.4)]" style={{ width:`${(combined/5)*100}%` }}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sub-tabs for specific Roles */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                            <button 
                                onClick={() => setRoleTab('all')} 
                                className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
                                    roleTab === 'all' 
                                        ? 'bg-gray-900 border-gray-900 text-white shadow-sm dark:bg-gray-100 dark:border-gray-100 dark:text-gray-900' 
                                        : 'bg-white dark:bg-gray-900 border-gray-200/60 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850/50'
                                }`}
                            >
                                All Reviews ({answers.length})
                            </button>
                            {availRoles.map(role => {
                                const cfg = ROLE_CFG[role];
                                const isAct = roleTab === role;
                                return (
                                    <button 
                                        key={role} 
                                        onClick={() => setRoleTab(role)} 
                                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
                                            isAct 
                                                ? `${cfg.pill} ${cfg.border} shadow-sm` 
                                                : 'bg-white dark:bg-gray-900 border-gray-200/60 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850/50'
                                        }`}
                                    >
                                        <span>{cfg.icon}</span>
                                        <span>{cfg.label}</span>
                                        <span className="text-[10px] opacity-75">({(byRole[role] || []).length})</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Collapsible Accordions based on selected role */}
                        {roleTab === 'peer' ? (
                            <div className="space-y-3.5">
                                {Object.entries(peerByReviewer).map(([reviewer, rans], ri) => {
                                    const rScore = avg5(rans);
                                    const bg = AVATAR_COLORS[ri % AVATAR_COLORS.length];
                                    const key = `peer-${reviewer}`;
                                    const isOpen = expandedAppraisalKey === key;
                                    return (
                                        <div key={reviewer} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all duration-200">
                                            <div
                                                onClick={() => setExpandedAppraisalKey(isOpen ? null : key)}
                                                className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-gray-50/40 dark:hover:bg-gray-850/20 transition-colors"
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`w-10 h-10 rounded-2xl ${bg} text-white text-xs font-extrabold flex items-center justify-center shadow-sm shrink-0`}>
                                                        {initials(reviewer)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-850 dark:text-white">{reviewer}</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{rans.length} evaluated response{rans.length !== 1 ? 's' : ''}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {rScore !== null && <ScoreRing score={rScore} ringCls="stroke-indigo-500" size={44}/>}
                                                    <div className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 border-t border-gray-100 dark:border-gray-800/60' : 'max-h-0 opacity-0'}`}>
                                                {rans.map((a, i) => <AnswerRow key={a.id} a={a} idx={i}/>)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {(roleTab === 'all' ? availRoles : [roleTab as RoleKey]).map(role => {
                                    const roleAnswers = byRole[role] || [];
                                    if (!roleAnswers.length) return null;
                                    const cfg = ROLE_CFG[role];
                                    const s = roleAvg(role);
                                    
                                    if (role === 'peer') {
                                        return (
                                            <div key={role} className="space-y-3.5">
                                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${cfg.text}`}>{cfg.icon} Peer Reviews</p>
                                                {Object.entries(peerByReviewer).map(([reviewer, rans], ri) => {
                                                    const rScore = avg5(rans);
                                                    const bg = AVATAR_COLORS[ri % AVATAR_COLORS.length];
                                                    const key = `allpeer-${reviewer}`;
                                                    const isOpen = expandedAppraisalKey === key;
                                                    return (
                                                        <div key={reviewer} className={`bg-white dark:bg-gray-900 border ${cfg.border} rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all duration-200`}>
                                                            <div
                                                                onClick={() => setExpandedAppraisalKey(isOpen ? null : key)}
                                                                className={`${cfg.headerBg} px-6 py-3.5 flex items-center justify-between gap-4 cursor-pointer select-none hover:brightness-95 transition`}
                                                            >
                                                                <div className="flex items-center gap-3.5">
                                                                    <div className={`w-9 h-9 rounded-2xl ${bg} text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm shrink-0`}>
                                                                        {initials(reviewer)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-gray-850 dark:text-white">{reviewer}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    {rScore !== null && <ScoreRing score={rScore} ringCls={cfg.ring} size={38}/>}
                                                                    <div className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 border-t border-gray-100 dark:border-gray-800/60' : 'max-h-0 opacity-0'}`}>
                                                                {rans.map((a, i) => <AnswerRow key={a.id} a={a} idx={i}/>)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }

                                    const submitter = roleAnswers[0]?.submitted_by_name;
                                    const key = `role-${role}`;
                                    const isOpen = expandedAppraisalKey === key;
                                    return (
                                        <div key={role} className={`bg-white dark:bg-gray-900 border ${cfg.border} rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all duration-200`}>
                                            <div
                                                onClick={() => setExpandedAppraisalKey(isOpen ? null : key)}
                                                className={`${cfg.headerBg} px-6 py-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:brightness-95 transition`}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <span className="text-2xl shrink-0">{cfg.icon}</span>
                                                    <div>
                                                        <p className={`text-sm font-bold ${cfg.text}`}>{cfg.label} Feedback</p>
                                                        {submitter && role !== 'self' && (
                                                            <p className="text-[10px] text-gray-400 mt-0.5">Evaluated by {submitter}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {s !== null && <ScoreRing score={s} ringCls={cfg.ring} size={44}/>}
                                                    <div className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 border-t border-gray-100 dark:border-gray-800/60' : 'max-h-0 opacity-0'}`}>
                                                {roleAnswers.map((a, i) => <AnswerRow key={a.id} a={a} idx={i}/>)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )
            )}

            {/* ══════════ DIRECT FEEDBACK TAB ══════════ */}
            {mainTab === 'direct' && (
                loadingDirect ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-3xl" />)}
                    </div>
                ) : directFBs.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl py-16 text-center shadow-sm">
                        <div className="text-4xl mb-4">💬</div>
                        <p className="text-sm font-bold text-gray-400">No direct feedback notes yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Managers can post direct feedback or coaching notes to you outside of regular appraisals.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {directFBs.map((f, fi) => {
                            const cat = CAT_CFG[f.category] ?? { icon: '📝', cls: 'bg-gray-100 text-gray-500' };
                            const bg = AVATAR_COLORS[fi % AVATAR_COLORS.length];
                            const date = new Date(f.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                            const isOpen = expandedDirectId === f.id;
                            return (
                                <div 
                                    key={f.id} 
                                    className={`bg-white dark:bg-gray-900 border rounded-3xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${
                                        !f.acknowledged 
                                            ? 'border-l-4 border-l-violet-500 border-gray-100 dark:border-gray-800' 
                                            : 'border-gray-100 dark:border-gray-800'
                                    }`}
                                >
                                    {/* Collapsed Header */}
                                    <div
                                        onClick={() => setExpandedDirectId(isOpen ? null : f.id)}
                                        className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-gray-50/40 dark:hover:bg-gray-850/15 transition-colors"
                                    >
                                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                            <div className={`w-10 h-10 rounded-2xl ${bg} text-white text-xs font-extrabold flex items-center justify-center shadow-sm shrink-0`}>
                                                {initials(f.sender_name || '?')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <p className="text-sm font-bold text-gray-850 dark:text-white truncate">{f.sender_name}</p>
                                                    <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${cat.cls}`}>{cat.icon} {f.category_display}</span>
                                                    {!f.acknowledged && (
                                                        <span className="text-[8px] font-extrabold bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-2 py-0.5 rounded-md shadow-sm animate-pulse shrink-0">NEW</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                                                    <span>{date}</span>
                                                    {f.rating && (
                                                        <span className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                                            ★ {f.rating.toFixed(1)} / 5.0
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {f.rating && (
                                                <div className="hidden sm:flex gap-0.5">
                                                    {[1,2,3,4,5].map(i => (
                                                        <span key={i} className={`text-base ${i <= f.rating! ? 'text-amber-400' : 'text-gray-200 dark:text-gray-850'}`}>★</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Body Content */}
                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100 border-t border-gray-100 dark:border-gray-800/60' : 'max-h-0 opacity-0'}`}>
                                        <div className="px-6 py-5">
                                            <div className="bg-gray-50/50 dark:bg-gray-805/30 rounded-2xl p-5 mb-4 border border-gray-100/50 dark:border-gray-800/20 shadow-inner">
                                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line font-medium">{f.feedback_text}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                                                    f.visibility === 'public' 
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                                        : f.visibility === 'team' 
                                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' 
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                                }`}>
                                                    {f.visibility === 'public' ? '🌐 Public Visibility' : f.visibility === 'team' ? '👥 Team Visible' : '🔒 Private (Only You)'}
                                                </span>
                                                
                                                {!f.acknowledged ? (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAck(f.id); }} 
                                                        disabled={ackingId === f.id}
                                                        className="text-xs font-bold text-violet-600 hover:text-white hover:bg-violet-600 border border-violet-200 hover:border-violet-600 dark:border-violet-850 dark:hover:bg-violet-900 px-4 py-2 rounded-xl transition-all shadow-sm disabled:opacity-50"
                                                    >
                                                        {ackingId === f.id ? 'Acknowledging...' : 'Acknowledge Feedback'}
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-950">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Acknowledged
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
};

export default FeedbackReceived;
