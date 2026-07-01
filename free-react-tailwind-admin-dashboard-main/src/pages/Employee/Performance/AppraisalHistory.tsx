import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface Answer {
    id: number;
    question: number;
    rating_score: number | null;
    comment: string;
}

interface Evaluation {
    id: number;
    cycle_name: string;
    self_overall_rating: string | null;
    manager_overall_rating: string | null;
    hr_overall_rating: string | null;
    status: string;
    answers: Answer[];
}

const STATUS_BADGES: Record<string, string> = {
    'draft': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    'submitted_self': 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400',
    'submitted_manager': 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400',
    'completed': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400',
};

const STATUS_LABELS: Record<string, string> = {
    'draft': 'Draft Saved',
    'submitted_self': 'Submitted (Self)',
    'submitted_manager': 'Reviewed (Manager)',
    'completed': 'Completed',
};

const ROLE_META = {
    self: { label: 'Self Appraisal', icon: '👤', color: 'text-violet-600 dark:text-violet-400' },
    manager: { label: 'Manager Evaluation', icon: '👔', color: 'text-teal-600 dark:text-teal-400' },
    peer: { label: 'Peer Reviews', icon: '🤝', color: 'text-amber-600 dark:text-amber-400' },
    hr: { label: 'Admin/HR Review', icon: '🛡️', color: 'text-rose-600 dark:text-rose-400' },
};

const AppraisalHistory = () => {
    const dispatch = useDispatch();
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [questions, setQuestions] = useState<Record<number, { text: string; type: string; role: string }>>({}); // questionId -> { text, type, role }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedEvalId, setExpandedEvalId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'self' | 'manager' | 'peer' | 'hr'>('self');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    useEffect(() => {
        dispatch(setPageTitle('Appraisal Records'));
        fetchHistory();
    }, [dispatch]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 1. Fetch evaluations
            const evalRes = await axios.get(`${API_BASE}/employee/appraisal-evaluations/?mine=true`, { headers: headers() });
            const evalList = asArray(evalRes.data);
            setEvaluations(evalList);

            // 2. Fetch all questions in background to map titles, types and roles
            const qRes = await axios.get(`${API_BASE}/employee/appraisal-questions/`, { headers: headers() });
            const qList = asArray(qRes.data);
            const qMap: Record<number, { text: string; type: string; role: string }> = {};
            qList.forEach((q: any) => {
                qMap[q.id] = {
                    text: q.question_text,
                    type: q.question_type,
                    role: q.role_type
                };
            });
            setQuestions(qMap);

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to load historical appraisals.');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedEvalId(prev => {
            if (prev === id) return null;
            setActiveTab('self'); // Reset to self tab on expand
            return id;
        });
    };

    const fmtRating = (r: string | null) => r ? parseFloat(r).toFixed(1) : '—';

    if (loading) {
        return (
            <div className="space-y-6 py-2 animate-pulse">
                <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="text-rose-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Error</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                <button
                    onClick={fetchHistory}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 mb-1">Archived scorecards</div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Appraisal History</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Access performance scorecards and answers submitted during previous appraisal reviews.</p>
                </div>
                <Link
                    to="/employee/performance"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-855 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition"
                >
                    ← Back to Performance Hub
                </Link>
            </div>

            {/* List */}
            {evaluations.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-14 text-center">
                    <div className="text-4xl mb-3">📂</div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">No appraisal history found</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Completing active cycles will list your records here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {evaluations.map((ev) => {
                        const isExpanded = expandedEvalId === ev.id;
                        const badgeStyle = STATUS_BADGES[ev.status] || 'bg-gray-100 text-gray-500';
                        const label = STATUS_LABELS[ev.status] || ev.status;

                        return (
                            <div
                                key={ev.id}
                                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4 transition-all"
                            >
                                {/* Summary Card */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-black text-gray-800 dark:text-white">{ev.cycle_name}</h3>
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${badgeStyle}`}>
                                                {label}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400">Record ID: #{ev.id}</p>
                                    </div>

                                    {/* Ratings grid */}
                                    <div className="grid grid-cols-3 gap-3 md:gap-6 bg-gray-55 dark:bg-gray-850 p-3 rounded-2xl border border-gray-50 dark:border-gray-800/30">
                                        <div className="text-center min-w-[70px]">
                                            <div className="text-xs font-black text-gray-700 dark:text-gray-200">{fmtRating(ev.self_overall_rating)}</div>
                                            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">Self Rating</div>
                                        </div>
                                        <div className="text-center min-w-[70px] border-l border-r border-gray-200 dark:border-gray-800">
                                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">{fmtRating(ev.manager_overall_rating)}</div>
                                            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">Manager</div>
                                        </div>
                                        <div className="text-center min-w-[70px]">
                                            <div className="text-xs font-black text-teal-600 dark:text-teal-400">{fmtRating(ev.hr_overall_rating)}</div>
                                            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">Final HR</div>
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            onClick={() => toggleExpand(ev.id)}
                                            className="w-full md:w-auto px-4 py-2 border border-gray-150 hover:bg-gray-50 dark:border-gray-850 dark:hover:bg-gray-800 text-teal-600 dark:text-teal-450 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                                        >
                                            {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Answers List */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-4 animate__animated animate__fadeIn">
                                        
                                        {/* Sub-tabs by role */}
                                        <div className="flex gap-2 mb-4 shrink-0 flex-wrap">
                                            {(['self', 'manager', 'peer', 'hr'] as const).map(role => {
                                                const count = ev.answers.filter(ans => questions[ans.question]?.role === role).length;
                                                const isTabActive = activeTab === role;
                                                const meta = ROLE_META[role];
                                                return (
                                                    <button key={role} type="button" onClick={() => setActiveTab(role)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                                                            isTabActive 
                                                                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/10' 
                                                                : 'bg-gray-50 dark:bg-gray-800 text-gray-550 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750'
                                                        }`}>
                                                        <span>{meta.icon}</span>
                                                        <span>{meta.label}</span>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                                            isTabActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                                        }`}>{count}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Filtered Answers */}
                                        {(() => {
                                            const roleAnswers = ev.answers.filter(ans => {
                                                const qInfo = questions[ans.question];
                                                return qInfo?.role === activeTab;
                                            });

                                            if (roleAnswers.length === 0) {
                                                return (
                                                    <div className="text-center py-10 text-xs text-gray-400 italic bg-gray-50 dark:bg-gray-850/20 rounded-2xl border border-dashed border-gray-100 dark:border-gray-800">
                                                        No evaluation responses recorded under {ROLE_META[activeTab].label} for this cycle.
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="space-y-3.5">
                                                    {roleAnswers.map((ans, idx) => {
                                                        const qInfo = questions[ans.question] || { text: `Question #${ans.question}`, type: 'scale', role: activeTab };
                                                        const isYes = ans.rating_score === 1 || ans.rating_score === 5;
                                                        return (
                                                            <div
                                                                key={ans.id || idx}
                                                                className="bg-gray-50 dark:bg-gray-850/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/10 space-y-2.5 animate__animated animate__fadeIn"
                                                            >
                                                                <div className="flex justify-between items-start gap-3">
                                                                    <div className="flex gap-2">
                                                                        <span className="text-xs font-bold text-gray-400 mt-0.5">{idx + 1}.</span>
                                                                        <p className="text-xs font-bold text-gray-850 dark:text-gray-200">
                                                                            {qInfo.text}
                                                                        </p>
                                                                    </div>
                                                                    {ans.rating_score !== null && qInfo.type !== 'text' && (
                                                                        <span className={`text-[11px] font-black shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full ${
                                                                            qInfo.type === 'yes_no'
                                                                                ? isYes
                                                                                    ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/10'
                                                                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10'
                                                                                : 'text-amber-500 bg-amber-500/5 border border-amber-500/10'
                                                                        }`}>
                                                                            {qInfo.type === 'yes_no'
                                                                                ? isYes ? 'Yes' : 'No'
                                                                                : `★ ${ans.rating_score} / 5`
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {ans.comment && (
                                                                    <div className="pl-4 border-l-2 border-teal-500/20 text-[11px] text-gray-500 dark:text-gray-400 italic">
                                                                        "{ans.comment}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
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
