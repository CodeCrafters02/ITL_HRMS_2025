import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface AppraisalCycle {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    self_appraisal_deadline: string;
    status: string;
}

interface FeedbackTarget {
    id: number;               // employee id
    name: string;
    initials: string;
    designation: string;
    department: string;
    relation: 'peer' | 'reportee' | 'self';
    mappingId?: number;       // MultiRaterMapping id (for peer)
}

interface FeedbackEntry {
    id: number;
    feedback_type: string;
    feedback_text: string;
    rating: number | null;
    receiver_name: string;
    created_at: string | null;
    visibility: string;
}

const CATEGORY_STYLES: Record<string, { badge: string; dot: string }> = {
    'Peer Recognition':  { badge: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',   dot: 'bg-indigo-500'  },
    'Appreciation':      { badge: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
    'Manager Coaching':  { badge: 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',         dot: 'bg-amber-500'   },
    'Constructive':      { badge: 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',             dot: 'bg-rose-500'    },
    'Goal Progress':     { badge: 'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400',             dot: 'bg-cyan-500'    },
};

const RELATION_CONFIG = {
    peer:     { label: 'Peer Review',       icon: '👥', color: 'indigo', defaultCategory: 'peer_recognition',  categories: ['peer_recognition','appreciation','constructive','goal_progress'] },
    reportee: { label: 'Manager Coaching',  icon: '🎯', color: 'amber',  defaultCategory: 'manager_coaching',  categories: ['manager_coaching','appreciation','constructive','goal_progress']  },
    self:     { label: 'Self Assessment',   icon: '🪞', color: 'violet', defaultCategory: 'goal_progress',     categories: ['goal_progress','constructive','appreciation']                      },
};

const CATEGORY_LABELS: Record<string, string> = {
    peer_recognition: 'Peer Recognition', appreciation: 'Appreciation',
    manager_coaching: 'Manager Coaching', constructive: 'Constructive', goal_progress: 'Goal Progress',
};

const AVATAR_COLORS = ['bg-emerald-500','bg-indigo-500','bg-amber-500','bg-teal-500','bg-rose-500','bg-blue-500','bg-purple-500','bg-pink-500','bg-cyan-500','bg-violet-500'];

const FeedbackProvided = () => {
    const dispatch = useDispatch();

    const [myEmpId, setMyEmpId]         = useState<number | null>(null);
    const [myName, setMyName]           = useState('');
    const [activeCycle, setActiveCycle] = useState<AppraisalCycle | null>(null);
    const [targets, setTargets]         = useState<FeedbackTarget[]>([]);
    const [feedbacks, setFeedbacks]     = useState<FeedbackEntry[]>([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);

    // Modal state
    const [activeTarget, setActiveTarget] = useState<FeedbackTarget | null>(null);
    const [category, setCategory]         = useState('peer_recognition');
    const [rating, setRating]             = useState(4);
    const [visibility, setVisibility]     = useState('private');
    const [feedbackText, setFeedbackText] = useState('');
    const [saving, setSaving]             = useState(false);
    const [formError, setFormError]       = useState<string | null>(null);
    const [formSuccess, setFormSuccess]   = useState(false);

    // List tab
    const [activeTab, setActiveTab]   = useState<'targets' | 'history'>('targets');
    const [searchQuery, setSearchQuery] = useState('');

    const API   = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const auth  = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const arr   = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    const load = async () => {
        try {
            setLoading(true);

            // Critical first — need employee id for all subsequent calls
            const idRes = await axios.get(`${API}/employee/employee-id/`, { headers: auth() });
            const id: number = idRes.data?.id;
            if (!id) { setError('Employee profile not found.'); setLoading(false); return; }
            setMyEmpId(id);

            // All remaining calls in parallel — failures degrade gracefully, don't crash page
            const [cyclesResult, feedbacksResult, empResult, mrResult, repResult] = await Promise.allSettled([
                axios.get(`${API}/employee/appraisal-cycles/`,                     { headers: auth() }),
                axios.get(`${API}/employee/continuous-feedback/?sender=${id}`,     { headers: auth() }),
                axios.get(`${API}/employee/all-employees-list/`,                   { headers: auth() }),
                axios.get(`${API}/employee/multirater/?reviewer_id=${id}`,         { headers: auth() }),
                axios.get(`${API}/employee/reporting-managers/?manager_id=${id}`,  { headers: auth() }),
            ]);

            const cycles: AppraisalCycle[] = cyclesResult.status === 'fulfilled' ? arr(cyclesResult.value.data) : [];
            const active = cycles.find(c => c.status === 'active') ?? null;
            setActiveCycle(active);

            if (feedbacksResult.status === 'fulfilled') {
                setFeedbacks(arr(feedbacksResult.value.data).map((f: any) => ({
                    id: f.id,
                    feedback_type: f.category_display || f.category || '',
                    feedback_text: f.feedback_text,
                    rating: f.rating,
                    receiver_name: f.receiver_name || '',
                    created_at: f.created_at || null,
                    visibility: f.visibility || 'private',
                })));
            }

            const allEmps = empResult.status === 'fulfilled' ? arr(empResult.value.data) : [];
            const me = allEmps.find((e: any) => e.id === id);
            if (me) setMyName(me.full_name || '');

            const list: FeedbackTarget[] = [];

            // 1. Peer targets — MultiRaterMapping where reviewer = me, scoped to active cycle if present
            const mrData = mrResult.status === 'fulfilled' ? arr(mrResult.value.data) : [];
            const mrFiltered = active ? mrData.filter((m: any) => !m.cycle || m.cycle === active.id) : mrData;
            const toInitials = (name: string) =>
                (name || '').split(' ').map(n => n.charAt(0)).filter(Boolean).slice(0,2).join('').toUpperCase() || '?';

            mrFiltered.forEach((m: any) => {
                list.push({
                    id: m.employee,
                    name: m.employee_name || '—',
                    initials: m.employee_initials || toInitials(m.employee_name || ''),
                    designation: m.employee_designation || '',
                    department:  m.employee_department  || '',
                    relation: 'peer', mappingId: m.id,
                });
            });

            // 2. Reportees — Manager Coaching
            const repData = repResult.status === 'fulfilled' ? arr(repResult.value.data) : [];
            repData.forEach((e: any) => {
                const name = e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || '—';
                list.push({
                    id: e.id, name,
                    initials: toInitials(name),
                    designation: e.designation_name || '', department: e.department_name || '',
                    relation: 'reportee',
                });
            });

            // 3. Self — always included
            const selfName = me?.full_name || 'Me';
            list.push({
                id, name: selfName,
                initials: toInitials(selfName),
                designation: me?.designation_name || '', department: me?.department_name || '',
                relation: 'self',
            });

            setTargets(list);
        } catch (e: any) {
            console.error('[FeedbackProvided] load error:', e);
            setError(e.response?.data?.detail || e.message || 'Failed to load. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { dispatch(setPageTitle('Feedback Provided')); load(); }, [dispatch]);

    const openModal = (t: FeedbackTarget) => {
        setActiveTarget(t);
        setCategory(RELATION_CONFIG[t.relation].defaultCategory);
        setRating(4);
        setVisibility('private');
        setFeedbackText('');
        setFormError(null);
        setFormSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTarget || !feedbackText.trim()) { setFormError('Feedback text is required.'); return; }
        setSaving(true); setFormError(null);
        try {
            await axios.post(`${API}/employee/continuous-feedback/`, {
                receiver: activeTarget.id, category, feedback_text: feedbackText, rating, visibility,
            }, { headers: auth() });
            setFormSuccess(true);
            const profileRes = await axios.get(`${API}/employee/performance-dashboard/my/`, { headers: auth() });
            setFeedbacks(profileRes.data.feedbacks_provided || []);
            setTimeout(() => { setActiveTarget(null); setFormSuccess(false); }, 1200);
        } catch (err: any) {
            setFormError(err.response?.data?.detail || 'Failed to submit.');
        } finally { setSaving(false); }
    };

    const deadline      = activeCycle ? new Date(activeCycle.self_appraisal_deadline) : null;
    const now           = new Date();
    const deadlinePassed = deadline ? now > deadline : false;
    const canGive       = !!activeCycle && !deadlinePassed;
    const daysLeft      = deadline && !deadlinePassed ? Math.ceil((deadline.getTime() - now.getTime()) / 86400000) : 0;
    const fmtDeadline   = deadline ? deadline.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

    // For each target: how many feedbacks given this cycle
    const givenTo = useMemo(() => {
        const map: Record<number, FeedbackEntry[]> = {};
        feedbacks.forEach(f => {
            // match by receiver_name (best available without receiver_id in response)
            const t = targets.find(t => t.name.trim() === f.receiver_name.trim());
            if (t) { if (!map[t.id]) map[t.id] = []; map[t.id].push(f); }
        });
        return map;
    }, [feedbacks, targets]);

    const doneCount    = targets.filter(t => (givenTo[t.id]?.length ?? 0) > 0).length;
    const pendingCount = targets.length - doneCount;

    const historyFeedbacks = useMemo(() => {
        if (!searchQuery.trim()) return feedbacks;
        const q = searchQuery.toLowerCase();
        return feedbacks.filter(f => f.receiver_name.toLowerCase().includes(q) || f.feedback_text.toLowerCase().includes(q) || f.feedback_type.toLowerCase().includes(q));
    }, [feedbacks, searchQuery]);

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="h-44 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <p className="text-sm text-rose-500 mb-4">{error}</p>
            <Link to="/employee/performance" className="px-4 py-2 bg-teal-500 text-white rounded-xl text-xs font-bold">← Back</Link>
        </div>
    );

    const cfg = activeTarget ? RELATION_CONFIG[activeTarget.relation] : null;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                        <div className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 mb-1">Employee Feed</div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Feedback Provided</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Give feedback to your assigned peers, reportees, and yourself during the appraisal window.</p>
                    </div>
                    <div className="flex gap-3 text-center shrink-0">
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl px-4 py-2">
                            <span className="block text-xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</span>
                            <span className="block text-[9px] font-bold uppercase text-amber-400">Pending</span>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl px-4 py-2">
                            <span className="block text-xl font-black text-emerald-600 dark:text-emerald-400">{doneCount}</span>
                            <span className="block text-[9px] font-bold uppercase text-emerald-400">Given</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2">
                            <span className="block text-xl font-black text-gray-700 dark:text-gray-300">{targets.length}</span>
                            <span className="block text-[9px] font-bold uppercase text-gray-400">Total</span>
                        </div>
                        <Link to="/employee/performance" className="self-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition">← Back</Link>
                    </div>
                </div>

                {/* Cycle banner */}
                {!activeCycle ? (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-850/40 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
                        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <div>
                            <p className="text-xs font-black text-gray-500">No Active Appraisal Cycle</p>
                            <p className="text-[10px] text-gray-400">Feedback targets are set up when HR activates an appraisal cycle.</p>
                        </div>
                    </div>
                ) : deadlinePassed ? (
                    <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl px-4 py-3">
                        <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                            <p className="text-xs font-black text-rose-600 dark:text-rose-400">Feedback Window Closed — {activeCycle.name}</p>
                            <p className="text-[10px] text-rose-400">Deadline was {fmtDeadline}. Submissions are no longer accepted.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 rounded-xl px-4 py-3">
                        <svg className="w-5 h-5 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div className="flex-1">
                            <p className="text-xs font-black text-teal-700 dark:text-teal-300">{activeCycle.name} — Feedback Window Open</p>
                            <p className="text-[10px] text-teal-500">Deadline: {fmtDeadline}</p>
                        </div>
                        {/* Progress */}
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="w-32">
                                <div className="flex justify-between text-[9px] font-bold text-teal-500 mb-1">
                                    <span>{doneCount}/{targets.length} submitted</span>
                                    <span>{targets.length ? Math.round((doneCount/targets.length)*100) : 0}%</span>
                                </div>
                                <div className="h-1.5 bg-teal-100 dark:bg-teal-900/40 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${targets.length ? (doneCount/targets.length)*100 : 0}%` }} />
                                </div>
                            </div>
                            <div className={`text-center px-3 py-1.5 rounded-xl shrink-0 ${daysLeft <= 2 ? 'bg-rose-100 dark:bg-rose-950/40' : daysLeft <= 5 ? 'bg-amber-100 dark:bg-amber-950/40' : 'bg-teal-100 dark:bg-teal-950/40'}`}>
                                <span className={`block text-lg font-black ${daysLeft <= 2 ? 'text-rose-600 dark:text-rose-400' : daysLeft <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}`}>{daysLeft}</span>
                                <span className={`block text-[9px] font-bold uppercase ${daysLeft <= 2 ? 'text-rose-400' : daysLeft <= 5 ? 'text-amber-400' : 'text-teal-400'}`}>days left</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                {(['targets', 'history'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${activeTab === tab ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        {tab === 'targets' ? `Feedback To Give (${targets.length})` : `History (${feedbacks.length})`}
                    </button>
                ))}
            </div>

            {/* Targets tab */}
            {activeTab === 'targets' && (
                <>
                    {!activeCycle ? (
                        <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-16 text-center">
                            <div className="text-4xl mb-3">📅</div>
                            <h3 className="text-sm font-bold text-gray-500">No active cycle</h3>
                            <p className="text-[10px] text-gray-400 mt-1">Targets are configured per appraisal cycle by HR.</p>
                        </div>
                    ) : targets.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-16 text-center">
                            <div className="text-4xl mb-3">🎯</div>
                            <h3 className="text-sm font-bold text-gray-500">No feedback assignments yet</h3>
                            <p className="text-[10px] text-gray-400 mt-1">HR hasn't assigned any peer reviews for this cycle, and you have no reportees.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {targets.map((t, idx) => {
                                const given   = givenTo[t.id] ?? [];
                                const done    = given.length > 0;
                                const rc      = RELATION_CONFIG[t.relation];
                                const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                                return (
                                    <div key={`${t.relation}-${t.id}`}
                                        className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${done ? 'border-emerald-200 dark:border-emerald-900/40' : 'border-gray-100 dark:border-gray-800'}`}>
                                        {/* Relation stripe */}
                                        <div className={`h-1 w-full ${t.relation === 'peer' ? 'bg-indigo-500' : t.relation === 'reportee' ? 'bg-amber-500' : 'bg-violet-500'}`} />

                                        <div className="p-4">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className={`w-11 h-11 rounded-xl ${t.relation === 'self' ? 'bg-violet-500' : avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0`}>
                                                    {t.relation === 'self' ? '🪞' : t.initials}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-gray-800 dark:text-white truncate">{t.relation === 'self' ? 'Myself (Self Assessment)' : t.name}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{t.designation || '—'}{t.department ? ` · ${t.department}` : ''}</p>
                                                </div>
                                                {done ? (
                                                    <span className="shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">Done</span>
                                                ) : (
                                                    <span className="shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase">Pending</span>
                                                )}
                                            </div>

                                            {/* Relation badge */}
                                            <div className="flex items-center gap-1.5 mb-3">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    t.relation === 'peer'     ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' :
                                                    t.relation === 'reportee' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' :
                                                    'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400'
                                                }`}>{rc.icon} {rc.label}</span>
                                                <span className="text-[9px] text-gray-400">{given.length} submitted</span>
                                            </div>

                                            {/* Given feedback previews */}
                                            {given.slice(0,2).map(f => {
                                                const st = CATEGORY_STYLES[f.feedback_type] || { badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' };
                                                return (
                                                    <div key={f.id} className="mb-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-2.5">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${st.badge}`}>{f.feedback_type}</span>
                                                            {f.rating && <span className="text-amber-400 text-[10px]">{'★'.repeat(f.rating)}{'☆'.repeat(5-f.rating)}</span>}
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 italic">"{f.feedback_text}"</p>
                                                    </div>
                                                );
                                            })}

                                            {!done && (
                                                <button
                                                    disabled={!canGive}
                                                    onClick={() => canGive && openModal(t)}
                                                    className={`w-full mt-2 py-2 rounded-xl text-xs font-black transition ${
                                                        !canGive ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                                        : t.relation === 'peer'     ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm'
                                                        : t.relation === 'reportee' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                                        : 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm'
                                                    }`}
                                                >
                                                    {!canGive ? (deadlinePassed ? 'Window Closed' : 'No Active Cycle') : `Give ${rc.label}`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* History tab */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    <div className="relative">
                        <input type="text" placeholder="Search history..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 pl-9 pr-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none" />
                        <svg className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    {historyFeedbacks.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-14 text-center">
                            <div className="text-3xl mb-2">📭</div>
                            <p className="text-sm font-bold text-gray-400">No feedback history yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {historyFeedbacks.map(f => {
                                const st = CATEGORY_STYLES[f.feedback_type] || { badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
                                const isSelf = myName && f.receiver_name.trim() === myName.trim();
                                const initials = f.receiver_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                                const avatarBg = AVATAR_COLORS[f.id % AVATAR_COLORS.length];
                                return (
                                    <div key={f.id} className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${isSelf ? 'border-violet-200 dark:border-violet-900/40' : 'border-gray-100 dark:border-gray-800'}`}>
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className={`w-9 h-9 rounded-xl ${isSelf ? 'bg-violet-500' : avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                                {isSelf ? '🪞' : initials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-800 dark:text-white">{isSelf ? 'Self Assessment' : `To: ${f.receiver_name}`}</p>
                                                <p className="text-[10px] text-gray-400">{f.created_at || '—'}</p>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${st.badge}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{f.feedback_type}
                                            </span>
                                        </div>
                                        {f.rating && (
                                            <div className="flex gap-0.5 text-amber-400 mb-2">
                                                {Array.from({length:5}).map((_,i) => (
                                                    <svg key={i} className={`w-3 h-3 ${i<f.rating! ? 'fill-current' : 'text-gray-200 dark:text-gray-700'}`} viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                    </svg>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800/40 rounded-xl px-3 py-2">"{f.feedback_text}"</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Feedback modal */}
            {activeTarget && cfg && (
                <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full border border-gray-100 dark:border-gray-800 shadow-2xl p-6 relative">
                        <button onClick={() => setActiveTarget(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>

                        {/* Target info */}
                        <div className={`flex items-center gap-3 mb-5 p-3 rounded-2xl ${
                            activeTarget.relation === 'peer'     ? 'bg-indigo-50 dark:bg-indigo-950/20' :
                            activeTarget.relation === 'reportee' ? 'bg-amber-50 dark:bg-amber-950/20'  :
                            'bg-violet-50 dark:bg-violet-950/20'}`}>
                            <div className={`w-10 h-10 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 ${
                                activeTarget.relation === 'peer' ? 'bg-indigo-500' : activeTarget.relation === 'reportee' ? 'bg-amber-500' : 'bg-violet-500'}`}>
                                {activeTarget.relation === 'self' ? '🪞' : activeTarget.initials}
                            </div>
                            <div>
                                <p className={`text-xs font-black ${activeTarget.relation === 'peer' ? 'text-indigo-700 dark:text-indigo-300' : activeTarget.relation === 'reportee' ? 'text-amber-700 dark:text-amber-300' : 'text-violet-700 dark:text-violet-300'}`}>
                                    {activeTarget.relation === 'self' ? 'Self Assessment — Myself' : activeTarget.name}
                                </p>
                                <p className="text-[10px] text-gray-400">{cfg.icon} {cfg.label}{activeTarget.designation ? ` · ${activeTarget.designation}` : ''}</p>
                            </div>
                        </div>

                        {formError   && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-xs font-bold mb-4">⚠️ {formError}</div>}
                        {formSuccess && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-xs font-bold mb-4">✓ Submitted!</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Category</label>
                                    <select value={category} onChange={e => setCategory(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none">
                                        {cfg.categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                                    </select>
                                </div>
                                {activeTarget.relation !== 'self' && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Visibility</label>
                                        <select value={visibility} onChange={e => setVisibility(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none">
                                            <option value="private">Private</option>
                                            <option value="team">Team</option>
                                            <option value="public">Public</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Rating</label>
                                <div className="flex gap-1.5 text-2xl">
                                    {[1,2,3,4,5].map(n => (
                                        <button key={n} type="button" onClick={() => setRating(n)}
                                            className={`transition hover:scale-110 ${n <= rating ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}>★</button>
                                    ))}
                                    <span className="text-xs font-black text-gray-400 self-center ml-1">{rating}/5</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                    {activeTarget.relation === 'self' ? 'Reflection Notes *' : 'Feedback *'}
                                </label>
                                <textarea required rows={4} value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                                    placeholder={activeTarget.relation === 'self' ? 'Key achievements, learnings, or areas to improve...' : `Share your thoughts on ${activeTarget.name}'s performance...`}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none resize-none" />
                            </div>

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setActiveTarget(null)}
                                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
                                <button type="submit" disabled={saving || !feedbackText.trim()}
                                    className={`px-5 py-2 text-white rounded-xl text-xs font-black transition shadow-sm disabled:opacity-60 flex items-center gap-1.5 ${
                                        activeTarget.relation === 'peer' ? 'bg-indigo-500 hover:bg-indigo-600' :
                                        activeTarget.relation === 'reportee' ? 'bg-amber-500 hover:bg-amber-600' :
                                        'bg-violet-500 hover:bg-violet-600'}`}>
                                    {saving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                                    {saving ? 'Saving...' : activeTarget.relation === 'self' ? 'Save Reflection' : 'Submit Feedback'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackProvided;
