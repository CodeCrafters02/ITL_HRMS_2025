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

interface Question {
    id: number;
    question_text: string;
    question_type: string;
    max_score: number;
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

const AppraisalHistory = () => {
    const dispatch = useDispatch();
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [questions, setQuestions] = useState<Record<number, string>>({}); // questionId -> text
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedEvalId, setExpandedEvalId] = useState<number | null>(null);

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

            // 2. Fetch all questions in background to map titles
            const qRes = await axios.get(`${API_BASE}/employee/appraisal-questions/`, { headers: headers() });
            const qList = asArray(qRes.data);
            const qMap: Record<number, string> = {};
            qList.forEach((q: any) => {
                qMap[q.id] = q.question_text;
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
        setExpandedEvalId(prev => (prev === id ? null : id));
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
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition"
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
                                    <div className="grid grid-cols-3 gap-3 md:gap-6 bg-gray-50 dark:bg-gray-850 p-3 rounded-2xl border border-gray-50 dark:border-gray-800/30">
                                        <div className="text-center min-w-[70px]">
                                            <div className="text-xs font-black text-gray-700 dark:text-gray-200">{fmtRating(ev.self_overall_rating)}</div>
                                            <div className="text-[8px] font-bold text-gray-450 uppercase tracking-wide">Self Rating</div>
                                        </div>
                                        <div className="text-center min-w-[70px] border-l border-r border-gray-200 dark:border-gray-800">
                                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">{fmtRating(ev.manager_overall_rating)}</div>
                                            <div className="text-[8px] font-bold text-gray-450 uppercase tracking-wide">Manager</div>
                                        </div>
                                        <div className="text-center min-w-[70px]">
                                            <div className="text-xs font-black text-teal-600 dark:text-teal-400">{fmtRating(ev.hr_overall_rating)}</div>
                                            <div className="text-[8px] font-bold text-gray-450 uppercase tracking-wide">Final HR</div>
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
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3">
                                            Submission Answer Log ({ev.answers?.length ?? 0} Questions)
                                        </h4>
                                        {ev.answers && ev.answers.length > 0 ? (
                                            <div className="space-y-3.5">
                                                {ev.answers.map((ans, idx) => (
                                                    <div
                                                        key={ans.id || idx}
                                                        className="bg-gray-55 dark:bg-gray-850/50 p-4 rounded-2xl border border-gray-50 dark:border-gray-800/10 space-y-2.5"
                                                    >
                                                        <div className="flex justify-between items-start gap-3">
                                                            <div className="flex gap-2">
                                                                <span className="text-xs font-bold text-gray-400 mt-0.5">{idx + 1}.</span>
                                                                <p className="text-xs font-bold text-gray-850 dark:text-gray-200">
                                                                    {questions[ans.question] || `Question #${ans.question}`}
                                                                </p>
                                                            </div>
                                                            {ans.rating_score && (
                                                                <span className="text-[11px] font-black text-amber-500 shrink-0 whitespace-nowrap bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
                                                                    ★ {ans.rating_score} / 5
                                                                </span>
                                                            )}
                                                        </div>
                                                        {ans.comment && (
                                                            <div className="pl-4 border-l-2 border-teal-500/20 text-[11px] text-gray-500 dark:text-gray-400 italic">
                                                                "{ans.comment}"
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-400 italic py-2">
                                                No answer responses recorded for this evaluation.
                                            </div>
                                        )}
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
