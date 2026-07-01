import { useEffect, useState } from 'react';
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
    manager_eval_deadline: string;
    peer_deadline: string | null;
    status: string;
}

interface AQuestion {
    id: number;
    question_text: string;
    question_type: 'scale' | 'yes_no';
    max_score: number;
}

interface SubmittedAnswer {
    question_id:   number;
    question_text: string;
    question_type: 'scale' | 'yes_no';
    max_score:     number;
    rating_score:  number | null;
}

interface FeedbackTarget {
    id: number;
    name: string;
    initials: string;
    designation: string;
    department: string;
    relation: 'self' | 'peer' | 'manager';
    already_submitted: boolean;
    submitted_answers: SubmittedAnswer[];
}

interface AppraisalExtension {
    id: number;
    cycle: number;
    cycle_name: string;
    employee: number;
    employee_name: string;
    requester: number;
    requester_name: string;
    original_deadline: string;
    extended_deadline: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

const AVATAR_COLORS = ['bg-emerald-500','bg-indigo-500','bg-amber-500','bg-teal-500','bg-rose-500','bg-blue-500','bg-purple-500','bg-pink-500'];

const ROLE_CFG = {
    self:    { label: 'Self Appraisal',   icon: '👤', roleType: 'self',    color: 'violet' },
    manager: { label: 'Manager Review',   icon: '👔', roleType: 'manager', color: 'teal'   },
    peer:    { label: 'Peer Review',      icon: '🤝', roleType: 'peer',    color: 'indigo' },
};

const toInitials = (name: string) =>
    (name || '').split(' ').map(n => n.charAt(0)).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

const toDatetimeLocal = (d: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const FeedbackProvided = () => {
    const dispatch = useDispatch();

    const [activeCycle, setActiveCycle] = useState<AppraisalCycle | null>(null);
    const [targets, setTargets]         = useState<FeedbackTarget[]>([]);
    const [selfQs, setSelfQs]           = useState<AQuestion[]>([]);
    const [managerQs, setManagerQs]     = useState<AQuestion[]>([]);
    const [peerQs, setPeerQs]           = useState<AQuestion[]>([]);
    const [submitted, setSubmitted]     = useState<Record<string, boolean>>({});
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);

    const [liveAnswers, setLiveAnswers] = useState<Record<string, SubmittedAnswer[]>>({});

    const [activeTarget, setActiveTarget] = useState<FeedbackTarget | null>(null);
    const [answersMap, setAnswersMap]     = useState<Record<number, number | null>>({});
    const [saving, setSaving]             = useState(false);
    const [formError, setFormError]       = useState<string | null>(null);
    const [formSuccess, setFormSuccess]   = useState(false);

    // Live ticking countdown state
    const [now, setNow] = useState(new Date());

    // Extensions & Logged-in profile ID
    const [myEmployeeId, setMyEmployeeId] = useState<number | null>(null);
    const [extensions, setExtensions]     = useState<AppraisalExtension[]>([]);

    // Extension request modal state
    const [activeExtTarget, setActiveExtTarget] = useState<FeedbackTarget | null>(null);
    const [requestedDate, setRequestedDate]     = useState<string>('');
    const [requestReason, setRequestReason]     = useState<string>('');
    const [extSaving, setExtSaving]             = useState(false);
    const [extError, setExtError]               = useState<string | null>(null);
    const [extSuccess, setExtSuccess]           = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const API  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const arr  = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    const load = async () => {
        try {
            setLoading(true);

            // Get active cycle first
            const cyclesRes = await axios.get(`${API}/employee/appraisal-cycles/`, { headers: auth() });
            const cycles: AppraisalCycle[] = arr(cyclesRes.data);
            const active = cycles.find(c => c.status === 'active') ?? null;
            setActiveCycle(active);

            if (!active) { setLoading(false); return; }

            const [targetsR, sR, mR, pR, extsR] = await Promise.allSettled([
                axios.get(`${API}/employee/appraisal-evaluations/my_feedback_targets/?cycle=${active.id}`, { headers: auth() }),
                axios.get(`${API}/employee/appraisal-questions/?cycle=${active.id}&role_type=self`,    { headers: auth() }),
                axios.get(`${API}/employee/appraisal-questions/?cycle=${active.id}&role_type=manager`, { headers: auth() }),
                axios.get(`${API}/employee/appraisal-questions/?cycle=${active.id}&role_type=peer`,    { headers: auth() }),
                axios.get(`${API}/employee/appraisal-extensions/?cycle=${active.id}`,                  { headers: auth() }),
            ]);

            let myEmpId: number | null = null;
            if (targetsR.status === 'fulfilled') {
                const data = targetsR.value.data;
                myEmpId = data.my_employee_id || null;
                setMyEmployeeId(myEmpId);

                const list: FeedbackTarget[] = (data.targets || []).map((t: any) => ({
                    id:                t.id,
                    name:              t.name || '—',
                    initials:          t.initials || toInitials(t.name || ''),
                    designation:       t.designation || '',
                    department:        t.department || '',
                    relation:          t.relation as 'self' | 'peer' | 'manager',
                    already_submitted: !!t.already_submitted,
                    submitted_answers: t.submitted_answers || [],
                }));
                setTargets(list);
                // Seed submitted + liveAnswers from server
                const initSubmitted: Record<string, boolean> = {};
                const initAnswers: Record<string, SubmittedAnswer[]> = {};
                list.forEach(t => {
                    const key = `${t.relation}-${t.id}`;
                    if (t.already_submitted) {
                        initSubmitted[key] = true;
                        initAnswers[key]   = t.submitted_answers;
                    }
                });
                setSubmitted(initSubmitted);
                setLiveAnswers(initAnswers);
            }

            if (extsR.status === 'fulfilled') {
                const allExts = arr(extsR.value.data);
                if (myEmpId) {
                    setExtensions(allExts.filter((e: any) => e.employee === myEmpId));
                } else {
                    setExtensions(allExts);
                }
            }

            if (sR.status === 'fulfilled') setSelfQs(arr(sR.value.data));
            if (mR.status === 'fulfilled') setManagerQs(arr(mR.value.data));
            if (pR.status === 'fulfilled') setPeerQs(arr(pR.value.data));

        } catch (e: any) {
            setError(e.response?.data?.detail || e.message || 'Failed to load.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { dispatch(setPageTitle('Feedback Provided')); load(); }, [dispatch]);

    const qsForRelation = (rel: FeedbackTarget['relation']) =>
        rel === 'self' ? selfQs : rel === 'manager' ? managerQs : peerQs;

    const getDeadlineForRelation = (rel: FeedbackTarget['relation']) => {
        if (!activeCycle) return null;
        let baseDeadline: Date;
        if (rel === 'self') {
            baseDeadline = new Date(activeCycle.self_appraisal_deadline);
        } else if (rel === 'manager') {
            baseDeadline = new Date(activeCycle.manager_eval_deadline);
        } else {
            baseDeadline = activeCycle.peer_deadline ? new Date(activeCycle.peer_deadline) : new Date(activeCycle.self_appraisal_deadline);
        }

        // Find approved extension that matches this specific baseDeadline (by comparing their times)
        const approvedExt = extensions.find(ext => {
            if (ext.status !== 'approved') return false;
            const extOrigDate = new Date(ext.original_deadline);
            return Math.abs(extOrigDate.getTime() - baseDeadline.getTime()) < 60000;
        });

        if (approvedExt) {
            const extDate = new Date(approvedExt.extended_deadline);
            if (extDate > baseDeadline) {
                return extDate;
            }
        }
        return baseDeadline;
    };

    const formatLiveCountdown = (target: Date | null) => {
        if (!target) return { text: '—', cls: 'text-gray-400' };
        const diff = target.getTime() - now.getTime();
        if (diff <= 0) {
            return { text: 'Expired', cls: 'text-rose-500 dark:text-rose-455 font-black' };
        }

        const secs = Math.floor(diff / 1000);
        const mins = Math.floor(secs / 60);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);

        const rHours = hours % 24;
        const rMins = mins % 60;
        const rSecs = secs % 60;

        if (days > 0) {
            const text = `${days}d ${rHours}h left`;
            const cls = days <= 2 ? 'text-amber-500 dark:text-amber-400 font-extrabold' : 'text-teal-600 dark:text-teal-400 font-semibold';
            return { text, cls };
        } else {
            const text = `${rHours}h ${rMins}m ${rSecs}s left`;
            const cls = 'text-rose-500 dark:text-rose-455 font-black animate-pulse';
            return { text, cls };
        }
    };

    const openModal = (t: FeedbackTarget) => {
        setActiveTarget(t);
        const qs = qsForRelation(t.relation);
        const init: Record<number, number | null> = {};
        qs.forEach(q => { init[q.id] = null; });
        setAnswersMap(init);
        setFormError(null);
        setFormSuccess(false);
    };

    const openExtModal = (t: FeedbackTarget) => {
        setActiveExtTarget(t);
        const deadline = getDeadlineForRelation(t.relation);
        if (deadline) {
            const defaultDate = new Date(deadline.getTime() + 86400000);
            setRequestedDate(toDatetimeLocal(defaultDate));
        } else {
            setRequestedDate('');
        }
        setRequestReason('');
        setExtError(null);
        setExtSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTarget || !activeCycle) return;
        const qs = qsForRelation(activeTarget.relation);
        const unanswered = qs.filter(q => answersMap[q.id] === null || answersMap[q.id] === undefined);
        if (unanswered.length > 0) { setFormError(`Please answer all ${unanswered.length} question(s).`); return; }

        setSaving(true); setFormError(null);
        try {
            await axios.post(`${API}/employee/appraisal-evaluations/submit_feedback/`, {
                target_employee_id: activeTarget.id,
                cycle_id: activeCycle.id,
                role_type: ROLE_CFG[activeTarget.relation].roleType,
                answers: qs.map(q => ({ question_id: q.id, rating_score: answersMap[q.id] })),
            }, { headers: auth() });
            const key = `${activeTarget.relation}-${activeTarget.id}`;
            const savedAnswers: SubmittedAnswer[] = qs.map(q => ({
                question_id:   q.id,
                question_text: q.question_text,
                question_type: q.question_type,
                max_score:     q.max_score,
                rating_score:  answersMap[q.id] ?? null,
            }));
            setFormSuccess(true);
            setSubmitted(prev => ({ ...prev, [key]: true }));
            setLiveAnswers(prev => ({ ...prev, [key]: savedAnswers }));
            setTimeout(() => setActiveTarget(null), 1200);
        } catch (err: any) {
            setFormError(err.response?.data?.detail || 'Failed to submit.');
        } finally {
            setSaving(false);
        }
    };

    const handleExtSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeExtTarget || !activeCycle || !myEmployeeId) return;

        const targetDeadline = getDeadlineForRelation(activeExtTarget.relation);
        const newDeadlineDate = new Date(requestedDate);

        if (!requestedDate) {
            setExtError('Please select a requested deadline.');
            return;
        }

        if (targetDeadline && newDeadlineDate <= targetDeadline) {
            setExtError(`Requested deadline must be strictly after the current deadline (${targetDeadline.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}).`);
            return;
        }

        const cycleEnd = new Date(activeCycle.end_date + 'T23:59:59');
        if (newDeadlineDate > cycleEnd) {
            setExtError(`Requested deadline cannot exceed the overall cycle end date (${cycleEnd.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}).`);
            return;
        }

        setExtSaving(true);
        setExtError(null);

        try {
            const res = await axios.post(`${API}/employee/appraisal-extensions/`, {
                cycle: activeCycle.id,
                employee: myEmployeeId,
                requester: myEmployeeId,
                original_deadline: targetDeadline ? targetDeadline.toISOString() : new Date().toISOString(),
                extended_deadline: newDeadlineDate.toISOString(),
                reason: requestReason,
                status: 'pending'
            }, { headers: auth() });

            setExtSuccess(true);
            setExtensions(prev => [res.data, ...prev]);
            setTimeout(() => setActiveExtTarget(null), 1200);
        } catch (err: any) {
            setExtError(err.response?.data?.detail || 'Failed to submit extension request.');
        } finally {
            setExtSaving(false);
        }
    };

    const doneCount    = targets.filter(t => submitted[`${t.relation}-${t.id}`]).length;
    const pendingCount = targets.length - doneCount;
    const activeQs     = activeTarget ? qsForRelation(activeTarget.relation) : [];

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="h-44 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
            <p className="text-sm text-rose-500">{error}</p>
            <Link to="/employee/performance" className="px-4 py-2 bg-teal-500 text-white rounded-xl text-xs font-bold">← Back</Link>
        </div>
    );

    // Global counts (for header display)
    const approvedExt = extensions.find(ext => ext.status === 'approved');
    const pendingExt  = extensions.find(ext => ext.status === 'pending');

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                        <div className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 mb-1">Employee Feed</div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Feedback Provided</h2>
                        <p className="text-xs text-gray-455 mt-0.5">Answer appraisal questions for your assigned peers and reportees.</p>
                    </div>
                    <div className="flex gap-3 text-center shrink-0">
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl px-4 py-2">
                            <span className="block text-xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</span>
                            <span className="block text-[9px] font-bold uppercase text-amber-400">Pending</span>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl px-4 py-2">
                            <span className="block text-xl font-black text-emerald-600 dark:text-emerald-400">{doneCount}</span>
                            <span className="block text-[9px] font-bold uppercase text-emerald-400">Done</span>
                        </div>
                        <Link to="/employee/performance" className="self-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-855 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition">← Back</Link>
                    </div>
                </div>

                {!activeCycle ? (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                        <span className="text-lg">📅</span>
                        <div>
                            <p className="text-xs font-black text-gray-500">No Active Appraisal Cycle</p>
                            <p className="text-[10px] text-gray-400">Feedback targets appear when HR activates a cycle.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row gap-4 justify-between bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 rounded-xl px-5 py-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-black text-teal-700 dark:text-teal-300">{activeCycle.name} — Cycle Timelines</p>
                                {approvedExt && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">✓ Extension Approved</span>}
                                {pendingExt && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">⏳ Extension Pending</span>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-[10px] font-bold text-gray-550 dark:text-gray-400">
                                <div>
                                    👤 Self Appraisal: <span className="text-teal-600 dark:text-teal-400 font-extrabold">{new Date(activeCycle.self_appraisal_deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className={`ml-1 text-[9px] font-extrabold ${formatLiveCountdown(getDeadlineForRelation('self')).cls}`}>
                                        ({formatLiveCountdown(getDeadlineForRelation('self')).text})
                                    </span>
                                </div>
                                <div>
                                    🤝 Peer Review: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                                        {activeCycle.peer_deadline ? new Date(activeCycle.peer_deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(activeCycle.self_appraisal_deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className={`ml-1 text-[9px] font-extrabold ${formatLiveCountdown(getDeadlineForRelation('peer')).cls}`}>
                                        ({formatLiveCountdown(getDeadlineForRelation('peer')).text})
                                    </span>
                                </div>
                                <div>
                                    👔 Manager Evaluation: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{new Date(activeCycle.manager_eval_deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className={`ml-1 text-[9px] font-extrabold ${formatLiveCountdown(getDeadlineForRelation('manager')).cls}`}>
                                        ({formatLiveCountdown(getDeadlineForRelation('manager')).text})
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                            <div className="w-32 hidden sm:block">
                                <div className="flex justify-between text-[9px] font-bold text-teal-500 mb-1">
                                    <span>{doneCount}/{targets.length} done</span>
                                    <span>{targets.length ? Math.round((doneCount/targets.length)*100) : 0}%</span>
                                </div>
                                <div className="h-1.5 bg-teal-100 dark:bg-teal-900/40 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${targets.length ? (doneCount/targets.length)*100 : 0}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Targets grid */}
            {!activeCycle ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-16 text-center">
                    <div className="text-4xl mb-3">📅</div>
                    <h3 className="text-sm font-bold text-gray-500">No active cycle</h3>
                </div>
            ) : targets.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-16 text-center">
                    <div className="text-4xl mb-3">🎯</div>
                    <h3 className="text-sm font-bold text-gray-500">No feedback assignments yet</h3>
                    <p className="text-[10px] text-gray-400 mt-1">HR hasn't assigned any peer reviews and you have no reportees.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {targets.map((t, idx) => {
                        const rc       = ROLE_CFG[t.relation];
                        const done     = !!submitted[`${t.relation}-${t.id}`];
                        const qs       = qsForRelation(t.relation);
                        const noQs     = qs.length === 0;
                        const avatarBg = t.relation === 'self' ? 'bg-violet-500' : AVATAR_COLORS[idx % AVATAR_COLORS.length];
                        const stripe   = t.relation === 'self' ? 'bg-violet-500' : t.relation === 'manager' ? 'bg-teal-500' : 'bg-indigo-500';
                        const badgeCls = t.relation === 'self'
                            ? 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400'
                            : t.relation === 'manager'
                            ? 'bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400'
                            : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400';
                        const btnCls   = t.relation === 'self'
                            ? 'bg-violet-500 hover:bg-violet-600'
                            : t.relation === 'manager'
                            ? 'bg-teal-500 hover:bg-teal-600'
                            : 'bg-indigo-500 hover:bg-indigo-600';

                        // Calculate target specific deadlines
                        const targetDeadline = getDeadlineForRelation(t.relation);
                        const deadlinePassed = targetDeadline ? now > targetDeadline : false;
                        const canGive        = !!activeCycle && !deadlinePassed;
                        const countdownInfo  = formatLiveCountdown(targetDeadline);
                        const fmtTargetDeadline = targetDeadline ? targetDeadline.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

                        // Target card specific base deadline
                        let cardBaseDeadline: Date;
                        if (t.relation === 'self') {
                            cardBaseDeadline = new Date(activeCycle.self_appraisal_deadline);
                        } else if (t.relation === 'manager') {
                            cardBaseDeadline = new Date(activeCycle.manager_eval_deadline);
                        } else {
                            cardBaseDeadline = activeCycle.peer_deadline ? new Date(activeCycle.peer_deadline) : new Date(activeCycle.self_appraisal_deadline);
                        }

                        // Local card specific extension checks
                        const cardApprovedExt = extensions.find(ext => {
                            if (ext.status !== 'approved') return false;
                            const extOrigDate = new Date(ext.original_deadline);
                            return Math.abs(extOrigDate.getTime() - cardBaseDeadline.getTime()) < 60000;
                        });

                        const cardPendingExt = extensions.find(ext => {
                            if (ext.status !== 'pending') return false;
                            const extOrigDate = new Date(ext.original_deadline);
                            return Math.abs(extOrigDate.getTime() - cardBaseDeadline.getTime()) < 60000;
                        });

                        return (
                            <div key={`${t.relation}-${t.id}`}
                                className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between ${done ? 'border-emerald-250 dark:border-emerald-900/40' : 'border-gray-100 dark:border-gray-800'}`}>
                                <div>
                                    <div className={`h-1 w-full ${stripe}`} />
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className={`w-11 h-11 rounded-xl ${avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0`}>
                                                    {t.relation === 'self' ? '👤' : t.initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-gray-800 dark:text-white truncate">
                                                        {t.relation === 'self' ? 'Myself (Self Appraisal)' : t.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 truncate">{t.designation || '—'}{t.department ? ` · ${t.department}` : ''}</p>
                                                </div>
                                            </div>
                                            <span className={`shrink-0 text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${done ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                                {done ? 'Done' : 'Pending'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${badgeCls}`}>
                                                {rc.icon} {rc.label}
                                            </span>
                                            <span className="text-[9px] text-gray-400">{qs.length} question{qs.length !== 1 ? 's' : ''}</span>
                                        </div>

                                        {/* Dynamic deadline with live countdown */}
                                        {fmtTargetDeadline && (
                                            <div className="bg-gray-50 dark:bg-gray-850/40 rounded-xl p-2.5 flex items-center justify-between gap-2 border border-gray-100/50 dark:border-gray-800/30">
                                                <div className="min-w-0">
                                                    <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wide">Deadline</span>
                                                    <span className={`block text-[10px] font-black truncate ${deadlinePassed ? 'text-rose-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {fmtTargetDeadline}
                                                    </span>
                                                </div>
                                                {!done && (
                                                    <div className="shrink-0 text-center px-2 py-1 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                                        <span className={`block text-[10px] font-bold ${countdownInfo.cls}`}>
                                                            {countdownInfo.text}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {noQs && !done && <p className="text-[10px] text-gray-455 italic">No questions configured for this role yet.</p>}
                                    </div>
                                </div>

                                <div className="p-4 pt-0 space-y-2">
                                    {done ? (() => {
                                        const key = `${t.relation}-${t.id}`;
                                        const ans = liveAnswers[key] || [];
                                        return (
                                            <div className="space-y-1.5 mt-1 border-t border-gray-100 dark:border-gray-800 pt-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">✓ Submitted</span>
                                                    <span className="text-[9px] text-gray-400">· {ans.length} answer{ans.length !== 1 ? 's' : ''}</span>
                                                </div>
                                                {ans.map((a, ai) => (
                                                    <div key={a.question_id} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-2 px-2.5">
                                                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-200 leading-snug">
                                                            <span className="text-gray-400 mr-1">{ai + 1}.</span>{a.question_text}
                                                        </p>
                                                        {a.question_type === 'scale' ? (
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                {Array.from({ length: a.max_score }).map((_, i) => (
                                                                    <span key={i} className={`text-xs ${a.rating_score !== null && (i + 1) <= a.rating_score ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}>★</span>
                                                                 ))}
                                                                <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 ml-0.5">{a.rating_score}/{a.max_score}</span>
                                                            </div>
                                                        ) : (
                                                            <span className={`mt-0.5 inline-flex text-[9px] font-black px-2 py-0.5 rounded-full ${a.rating_score === 1 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                                                                {a.rating_score === 1 ? '✓ Yes' : '✕ No'}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })() : (
                                        <>
                                            <button disabled={!canGive || noQs} onClick={() => canGive && !noQs && openModal(t)}
                                                className={`w-full py-2 rounded-xl text-xs font-black transition ${!canGive || noQs ? 'bg-gray-100 dark:bg-gray-850 text-gray-450 cursor-not-allowed border border-gray-100 dark:border-gray-800' : `${btnCls} text-white shadow-sm`}`}>
                                                {!canGive ? (deadlinePassed ? 'Deadline Passed' : 'No Active Cycle') : noQs ? 'No Questions' : `Give ${rc.label}`}
                                            </button>

                                            {/* Request Extension inline link - can request further extension if approved, up to cycle end_date */}
                                            {!deadlinePassed && !cardPendingExt && (
                                                <button type="button" onClick={() => openExtModal(t)}
                                                    className="w-full py-1.5 border border-dashed border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-500 dark:text-gray-400 rounded-xl text-[10px] font-black transition flex items-center justify-center gap-1.5 select-none">
                                                    <span>⏳</span> {cardApprovedExt ? 'Request Further Extension' : 'Request Extension'}
                                                </button>
                                            )}
                                            {cardPendingExt && !done && (
                                                <div className="w-full py-1 bg-amber-50 dark:bg-amber-950/20 border border-dashed border-amber-200 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl text-[9px] font-bold text-center">
                                                    ⏳ Extension Request Pending ({new Date(cardPendingExt.extended_deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Structured question modal */}
            {activeTarget && (
                <div className="fixed inset-0 z-[70000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate__animated animate__fadeIn">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[88vh]">
                        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                            <div className={`w-10 h-10 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 ${activeTarget.relation === 'self' ? 'bg-violet-500' : activeTarget.relation === 'manager' ? 'bg-teal-500' : 'bg-indigo-500'}`}>
                                {activeTarget.relation === 'self' ? '👤' : activeTarget.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${
                                    activeTarget.relation === 'self' ? 'text-violet-500' : activeTarget.relation === 'manager' ? 'text-teal-500' : 'text-indigo-500'
                                }`}>{ROLE_CFG[activeTarget.relation].icon} {ROLE_CFG[activeTarget.relation].label}</p>
                                <p className="text-sm font-black text-gray-800 dark:text-white truncate">
                                    {activeTarget.relation === 'self' ? 'Self Appraisal' : activeTarget.name}
                                </p>
                                {activeTarget.designation && (
                                    <p className="text-[10px] text-gray-455 truncate">{activeTarget.designation}{activeTarget.department ? ` · ${activeTarget.department}` : ''}</p>
                                )}
                            </div>
                            <button onClick={() => setActiveTarget(null)} className="text-gray-400 hover:text-gray-655 text-lg font-bold leading-none">✕</button>
                        </div>

                        {formError   && <div className="mx-6 mt-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs font-bold shrink-0">⚠️ {formError}</div>}
                        {formSuccess && <div className="mx-6 mt-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-bold shrink-0">✓ Submitted!</div>}

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                                {/* Context banner */}
                                <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
                                    activeTarget.relation === 'self'    ? 'bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40' :
                                    activeTarget.relation === 'manager' ? 'bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40' :
                                                                          'bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40'
                                }`}>
                                    <div className={`w-9 h-9 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 ${
                                        activeTarget.relation === 'self' ? 'bg-violet-500' : activeTarget.relation === 'manager' ? 'bg-teal-500' : 'bg-indigo-500'
                                    }`}>
                                        {activeTarget.relation === 'self' ? '👤' : activeTarget.initials}
                                    </div>
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-wider ${
                                            activeTarget.relation === 'self' ? 'text-violet-500' : activeTarget.relation === 'manager' ? 'text-teal-500' : 'text-indigo-500'
                                        }`}>{ROLE_CFG[activeTarget.relation].icon} {ROLE_CFG[activeTarget.relation].label}</p>
                                        <p className="text-sm font-black text-gray-800 dark:text-white leading-tight">
                                            {activeTarget.relation === 'self' ? 'Your self appraisal' : `For: ${activeTarget.name}`}
                                        </p>
                                        {activeTarget.designation && (
                                            <p className="text-[10px] text-gray-400">{activeTarget.designation}{activeTarget.department ? ` · ${activeTarget.department}` : ''}</p>
                                        )}
                                    </div>
                                </div>

                                {activeQs.map((q, idx) => {
                                    const val = answersMap[q.id] ?? null;
                                    return (
                                        <div key={q.id} className="space-y-3">
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-5 h-5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">{idx + 1}</div>
                                                <p className="text-xs font-bold text-gray-800 dark:text-white leading-snug">{q.question_text}</p>
                                            </div>

                                            {q.question_type === 'scale' && (
                                                <div className="pl-7 space-y-1.5">
                                                    <span className="block text-[9px] font-black uppercase tracking-wider text-gray-400">Rating 1–{q.max_score}</span>
                                                    <div className="flex gap-1 text-2xl">
                                                        {Array.from({ length: q.max_score }).map((_, i) => (
                                                            <button key={i} type="button" onClick={() => setAnswersMap(p => ({ ...p, [q.id]: i + 1 }))}
                                                                className={`transition hover:scale-110 focus:outline-none ${val !== null && (i + 1) <= val ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}>★</button>
                                                        ))}
                                                        {val !== null && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 self-center ml-1">{val}/{q.max_score}</span>}
                                                    </div>
                                                </div>
                                            )}

                                            {q.question_type === 'yes_no' && (
                                                <div className="pl-7 space-y-1.5">
                                                    <span className="block text-[9px] font-black uppercase tracking-wider text-gray-400">Your Response</span>
                                                    <div className="flex gap-2">
                                                        <button type="button" onClick={() => setAnswersMap(p => ({ ...p, [q.id]: 1 }))}
                                                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${val === 1 ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-850 text-gray-450'}`}>✓ Yes</button>
                                                        <button type="button" onClick={() => setAnswersMap(p => ({ ...p, [q.id]: 0 }))}
                                                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${val === 0 ? 'bg-rose-500 text-white' : 'bg-gray-100 dark:bg-gray-855 text-gray-450'}`}>✕ No</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
                                <button type="button" onClick={() => setActiveTarget(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-455 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition">Cancel</button>
                                <button type="submit" disabled={saving} className={`px-5 py-2 rounded-xl text-xs font-black text-white transition ${
                                    activeTarget.relation === 'self' ? 'bg-violet-500 hover:bg-violet-600' : activeTarget.relation === 'manager' ? 'bg-teal-500 hover:bg-teal-600' : 'bg-indigo-500 hover:bg-indigo-600'
                                }`}>
                                    {saving ? 'Submitting...' : 'Submit Answers'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Request Extension Modal */}
            {activeExtTarget && (() => {
                if (!activeCycle) return null;
                const targetDeadline = getDeadlineForRelation(activeExtTarget.relation);
                const minDateTimeLocal = targetDeadline ? toDatetimeLocal(targetDeadline) : '';
                const cycleEnd = new Date(activeCycle.end_date + 'T23:59:59');
                const maxDateTimeLocal = toDatetimeLocal(cycleEnd);
                return (
                    <div className="fixed inset-0 z-[70000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate__animated animate__fadeIn">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-955/20">
                                <div>
                                    <h3 className="text-sm font-black text-gray-800 dark:text-white">Request Deadline Extension</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Submit request to HR for extended feedback deadline.</p>
                                </div>
                                <button type="button" onClick={() => setActiveExtTarget(null)} className="text-gray-400 hover:text-gray-650 text-lg font-bold">✕</button>
                            </div>

                            <form onSubmit={handleExtSubmit} className="p-6 space-y-4">
                                {extError && <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs font-bold">⚠️ {extError}</div>}
                                {extSuccess && <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-bold">✓ Request submitted successfully!</div>}

                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Feedback Type</label>
                                    <div className="bg-gray-50 dark:bg-gray-850 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                        <span className="text-base">{ROLE_CFG[activeExtTarget.relation].icon}</span>
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{ROLE_CFG[activeExtTarget.relation].label} ({activeExtTarget.relation === 'self' ? 'Myself' : activeExtTarget.name})</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Current Deadline</label>
                                    <div className="bg-gray-50 dark:bg-gray-850 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-xs font-bold text-rose-500">
                                        📅 {targetDeadline ? targetDeadline.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Requested New Deadline</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={requestedDate}
                                        min={minDateTimeLocal}
                                        max={maxDateTimeLocal}
                                        onChange={e => setRequestedDate(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 text-gray-850 dark:text-white"
                                    />
                                    <span className="block text-[8px] text-gray-400 mt-1">Must be strictly after current deadline and before overall cycle end date ({cycleEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}).</span>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Reason for Extension</label>
                                    <textarea
                                        rows={3}
                                        required
                                        placeholder="Describe why you need more time to complete this evaluation..."
                                        value={requestReason}
                                        onChange={e => setRequestReason(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 text-gray-850 dark:text-white resize-none"
                                    />
                                </div>

                                <div className="pt-2 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
                                    <button type="button" onClick={() => setActiveExtTarget(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-455 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition">Cancel</button>
                                    <button type="submit" disabled={extSaving} className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10">
                                        {extSaving ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default FeedbackProvided;
