import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface RawAnswer {
    id: number;
    question: number;
    question_text: string;
    question_type: 'scale' | 'yes_no';
    max_score: number;
    role_type: 'self' | 'manager' | 'peer' | 'hr';
    submitted_by: number | null;
    submitted_by_name: string | null;
    rating_score: number | null;
    comment: string;
}

interface Evaluation {
    id: number;
    cycle_name: string;
    self_overall_rating: string | null;
    manager_overall_rating: string | null;
    hr_overall_rating: string | null;
    perf_score: number | null;
    status: string;
    answers: RawAnswer[];
    recommended_hike?: number | null;
}

type RoleKey = 'self' | 'manager' | 'peer' | 'hr';

const ROLE_CFG: Record<RoleKey, { label: string; icon: string; ring: string; pill: string; text: string; border: string }> = {
    self:    { label: 'Self',    icon: '👤', ring: 'stroke-violet-500', pill: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-900/50' },
    manager: { label: 'Manager', icon: '👔', ring: 'stroke-teal-500',   pill: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',       text: 'text-teal-600 dark:text-teal-400',   border: 'border-teal-200 dark:border-teal-900/50' },
    peer:    { label: 'Peer',    icon: '🤝', ring: 'stroke-indigo-500', pill: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-900/50' },
    hr:      { label: 'HR',      icon: '🛡️', ring: 'stroke-rose-500',   pill: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',       text: 'text-rose-600 dark:text-rose-400',   border: 'border-rose-200 dark:border-rose-900/50' },
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    draft:             { label: 'Draft',           cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
    submitted_self:    { label: 'Self Submitted',  cls: 'bg-violet-100 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400' },
    submitted_manager: { label: 'Mgr Reviewed',    cls: 'bg-teal-100 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400' },
    completed:         { label: 'Completed',       cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' },
};

// Yes → 5★, No → 0★; scale → normalised to 5
const toNorm5 = (a: RawAnswer): number | null => {
    if (a.rating_score === null) return null;
    if (a.question_type === 'yes_no') return a.rating_score === 1 ? 5 : 0;
    return (a.rating_score / (a.max_score || 5)) * 5;
};

const avg5 = (answers: RawAnswer[]): number | null => {
    const scores = answers.map(toNorm5).filter((s): s is number => s !== null);
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
};

// SVG ring gauge — always 5-scale
const ScoreRing = ({ score, roleKey, size = 64 }: { score: number | null; roleKey?: RoleKey; size?: number }) => {
    const pct = score !== null ? Math.min((score / 5) * 100, 100) : 0;
    const r = size * 0.4, c = 2 * Math.PI * r;
    const strokeCls = roleKey ? ROLE_CFG[roleKey].ring : 'stroke-teal-500';
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ display: 'block' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={size * 0.09} className="stroke-gray-100 dark:stroke-gray-800" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={size * 0.09}
                    strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
                    strokeLinecap="round" className={`${strokeCls} transition-all duration-700`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-black text-gray-800 dark:text-white leading-none" style={{ fontSize: size * 0.2 }}>
                    {score !== null ? score.toFixed(1) : '—'}
                </span>
                <span className="text-gray-400 leading-none" style={{ fontSize: size * 0.12 }}>/5</span>
            </div>
        </div>
    );
};

// Star bar — normalized to 5 stars regardless of max_score / yes_no
const Stars5 = ({ score }: { score: number | null }) => {
    const filled = score !== null ? Math.round(score) : 0;
    return (
        <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(i => (
                <span key={i} className={`text-base ${i <= filled ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}>★</span>
            ))}
            {score !== null && <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 ml-1">{score.toFixed(1)}</span>}
        </div>
    );
};

const AppraisalHistory = () => {
    const dispatch = useDispatch();
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [expanded, setExpanded]       = useState<number | null>(null);
    const [activeRole, setActiveRole]   = useState<Record<number, RoleKey>>({});

    const API  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const arr  = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    const load = async () => {
        try {
            setLoading(true); setError(null);
            const res = await axios.get(`${API}/employee/appraisal-evaluations/?mine=true`, { headers: auth() });
            setEvaluations(arr(res.data));
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Failed to load.');
        } finally { setLoading(false); }
    };

    useEffect(() => { dispatch(setPageTitle('Appraisal History')); load(); }, [dispatch]);

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            {[1,2].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-3">
            <p className="text-sm text-rose-500">{error}</p>
            <button onClick={load} className="px-4 py-2 bg-teal-500 text-white rounded-xl text-xs font-bold">Retry</button>
        </div>
    );

    return (
        <div className="space-y-5 py-2">
            {/* Page header */}
            <div className="bg-white dark:bg-gray-900 px-5 py-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">Performance Records</p>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mt-0.5">Appraisal History</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Your scorecards with peer, manager, self & combined ratings. Yes/No answers count as 5★ or 0★.</p>
            </div>

            {evaluations.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-16 text-center">
                    <div className="text-4xl mb-3">📂</div>
                    <p className="text-sm font-bold text-gray-400">No appraisal records yet.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Completed cycles will appear here.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {evaluations.map(ev => {
                        const isOpen    = expanded === ev.id;
                        const statusCfg = STATUS_CFG[ev.status] ?? { label: ev.status, cls: 'bg-gray-100 text-gray-500' };

                        // Group by role_type
                        const byRole: Partial<Record<RoleKey, RawAnswer[]>> = {};
                        (ev.answers || []).forEach(a => {
                            if (!byRole[a.role_type]) byRole[a.role_type] = [];
                            byRole[a.role_type]!.push(a);
                        });
                        const availRoles = (['self','manager','peer','hr'] as RoleKey[]).filter(r => byRole[r]?.length);
                        const curRole    = activeRole[ev.id] ?? availRoles[0];

                        // Peer: group by reviewer
                        const peerByReviewer: Record<string, RawAnswer[]> = {};
                        (byRole.peer || []).forEach(a => {
                            const k = a.submitted_by_name || `Reviewer #${a.submitted_by}`;
                            if (!peerByReviewer[k]) peerByReviewer[k] = [];
                            peerByReviewer[k].push(a);
                        });

                        // Per-role averages (normalised to 5)
                        const roleScore = (r: RoleKey) => avg5(byRole[r] || []);

                        // Combined score across all roles (equal weight per role, not per answer)
                        const roleScores = availRoles.map(roleScore).filter((s): s is number => s !== null);
                        const combined   = roleScores.length ? roleScores.reduce((a,b) => a+b, 0) / roleScores.length : null;

                        return (
                            <div key={ev.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">

                                {/* ── Card body ── */}
                                <div className="p-5">
                                    <div className="flex items-start gap-5">
                                        {/* Combined ring */}
                                        <div className="shrink-0 flex flex-col items-center gap-1.5">
                                            <ScoreRing score={combined} size={72} />
                                            <span className="text-[8px] font-black uppercase tracking-wider text-gray-400">Combined</span>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="text-sm font-black text-gray-800 dark:text-white">{ev.cycle_name}</h3>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${statusCfg.cls}`}>{statusCfg.label}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mb-3">{(ev.answers||[]).length} answers · {availRoles.length} role{availRoles.length !== 1 ? 's' : ''}</p>

                                            {/* Per-role score pills */}
                                            <div className="flex flex-wrap gap-2">
                                                {availRoles.map(role => {
                                                    const s = roleScore(role);
                                                    const cfg = ROLE_CFG[role];
                                                    return (
                                                        <div key={role} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${cfg.border} bg-gray-50 dark:bg-gray-800/50`}>
                                                            <span className="text-sm">{cfg.icon}</span>
                                                            <div>
                                                                <p className={`text-xs font-black leading-none ${cfg.text}`}>{s !== null ? s.toFixed(1) : '—'} <span className="text-[8px] text-gray-400 font-semibold">/5</span></p>
                                                                <p className="text-[8px] text-gray-400 uppercase tracking-wide">{cfg.label}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {ev.recommended_hike !== undefined && ev.recommended_hike !== null && (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                                        <span className="text-sm">📈</span>
                                                        <div>
                                                            <p className="text-xs font-black leading-none text-emerald-600 dark:text-emerald-400">+{ev.recommended_hike}%</p>
                                                            <p className="text-[8px] text-gray-400 uppercase tracking-wide">Salary Hike</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rating bar */}
                                    {combined !== null && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-[9px] font-black text-gray-400 mb-1">
                                                <span>Overall Rating</span>
                                                <span className="text-teal-600 dark:text-teal-400">{combined.toFixed(2)} / 5.00</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-700"
                                                    style={{ width: `${(combined / 5) * 100}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[8px] text-gray-300 dark:text-gray-700 mt-0.5">
                                                <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                            </div>
                                        </div>
                                    )}

                                    {availRoles.length > 0 && (
                                        <button onClick={() => {
                                            setExpanded(p => p === ev.id ? null : ev.id);
                                            if (expanded !== ev.id) setActiveRole(r => ({ ...r, [ev.id]: availRoles[0] }));
                                        }} className="mt-4 w-full py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] font-black text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                            {isOpen ? '▲ Hide Breakdown' : '▼ View Breakdown'}
                                        </button>
                                    )}
                                </div>

                                {/* ── Breakdown panel ── */}
                                {isOpen && (
                                    <div className="border-t border-gray-100 dark:border-gray-800">
                                        {/* Role tabs */}
                                        <div className="flex gap-1.5 px-5 pt-4 pb-3 overflow-x-auto border-b border-gray-100 dark:border-gray-800">
                                            {availRoles.map(role => {
                                                const cfg   = ROLE_CFG[role];
                                                const s     = roleScore(role);
                                                const isAct = curRole === role;
                                                return (
                                                    <button key={role} onClick={() => setActiveRole(r => ({ ...r, [ev.id]: role }))}
                                                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border transition ${isAct ? `${cfg.pill} ${cfg.border}` : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400 hover:text-gray-600'}`}>
                                                        {cfg.icon} {cfg.label}
                                                        {s !== null && <span className={`font-black text-[8px] px-1.5 py-0.5 rounded-full ${isAct ? 'bg-white/50 dark:bg-black/20' : 'bg-gray-200 dark:bg-gray-700'}`}>{s.toFixed(1)}★</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 space-y-3">
                                            {curRole === 'peer' ? (
                                                Object.keys(peerByReviewer).length === 0 ? (
                                                    <p className="text-[11px] text-gray-400 italic">No peer feedback recorded.</p>
                                                ) : Object.entries(peerByReviewer).map(([reviewer, answers]) => {
                                                    const pScore = avg5(answers);
                                                    const initials = reviewer.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                                                    return (
                                                        <div key={reviewer} className="border border-indigo-100 dark:border-indigo-900/40 rounded-2xl overflow-hidden">
                                                            {/* Reviewer header */}
                                                            <div className="bg-indigo-50 dark:bg-indigo-950/20 px-4 py-3 flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">{initials}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-black text-indigo-800 dark:text-indigo-200 truncate">{reviewer}</p>
                                                                    <p className="text-[9px] text-indigo-400">{answers.length} question{answers.length !== 1 ? 's' : ''}</p>
                                                                </div>
                                                                {pScore !== null && (
                                                                    <div className="shrink-0 text-right">
                                                                        <ScoreRing score={pScore} roleKey="peer" size={44} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Answers */}
                                                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                                                {answers.map((a, i) => {
                                                                    const norm = toNorm5(a);
                                                                    return (
                                                                        <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                                                                            <span className="text-[9px] text-gray-300 font-bold mt-0.5 shrink-0 w-4">{i+1}.</span>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-snug mb-1.5">{a.question_text}</p>
                                                                                <Stars5 score={norm} />
                                                                                {a.question_type === 'yes_no' && (
                                                                                    <span className={`mt-1 inline-flex text-[8px] font-black px-2 py-0.5 rounded-full ${a.rating_score === 1 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                                                                                        {a.rating_score === 1 ? '✓ Yes (counted as 5★)' : '✕ No (counted as 0★)'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                (byRole[curRole] || []).length === 0 ? (
                                                    <p className="text-[11px] text-gray-400 italic">No {ROLE_CFG[curRole].label.toLowerCase()} feedback recorded.</p>
                                                ) : (
                                                    <>
                                                        {/* Role average mini-ring */}
                                                        {(() => {
                                                            const s = roleScore(curRole);
                                                            return s !== null ? (
                                                                <div className={`flex items-center gap-4 p-4 rounded-2xl border ${ROLE_CFG[curRole].border} bg-gray-50 dark:bg-gray-800/50 mb-1`}>
                                                                    <ScoreRing score={s} roleKey={curRole} size={52} />
                                                                    <div>
                                                                        <p className={`text-base font-black ${ROLE_CFG[curRole].text}`}>{s.toFixed(2)} / 5.00</p>
                                                                        <p className="text-[9px] text-gray-400">{ROLE_CFG[curRole].label} average · {(byRole[curRole]||[]).length} question{(byRole[curRole]||[]).length !== 1 ? 's' : ''}</p>
                                                                        <div className="flex mt-1 gap-0.5">
                                                                            {[1,2,3,4,5].map(i => <span key={i} className={`text-sm ${i <= Math.round(s) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}>★</span>)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : null;
                                                        })()}
                                                        {/* Individual questions */}
                                                        <div className="space-y-2">
                                                            {(byRole[curRole]!).map((a, i) => {
                                                                const norm = toNorm5(a);
                                                                return (
                                                                    <div key={a.id} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 flex items-start gap-3">
                                                                        <span className="text-[9px] text-gray-300 font-bold mt-0.5 shrink-0 w-4">{i+1}.</span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-snug mb-1.5">{a.question_text}</p>
                                                                            <Stars5 score={norm} />
                                                                            {a.question_type === 'yes_no' && (
                                                                                <span className={`mt-1 inline-flex text-[8px] font-black px-2 py-0.5 rounded-full ${a.rating_score === 1 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                                                                                    {a.rating_score === 1 ? '✓ Yes (counted as 5★)' : '✕ No (counted as 0★)'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )
                                            )}
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

export default AppraisalHistory;
