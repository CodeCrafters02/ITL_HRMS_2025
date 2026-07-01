import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface Cycle {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    self_appraisal_deadline: string;
    status: string;
}

interface Question {
    id: number;
    question_text: string;
    question_type: string;
    max_score: number;
}

interface Evaluation {
    id: number;
    cycle: number;
    self_overall_rating: string | null;
    status: string;
    answers: {
        id: number;
        question: number;
        rating_score: number | null;
        comment: string;
    }[];
}

const SelfAppraisal = () => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    
    const [answersMap, setAnswersMap] = useState<Record<number, { rating: number | null; comment: string }>>({});
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    useEffect(() => {
        dispatch(setPageTitle('Self Appraisal'));
        loadAppraisalData();
    }, [dispatch]);

    const loadAppraisalData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 1. Fetch cycles
            const cyclesRes = await axios.get(`${API_BASE}/employee/appraisal-cycles/`, { headers: headers() });
            const cycles = asArray(cyclesRes.data);
            const active = cycles.find((c: Cycle) => c.status === 'active');
            
            if (!active) {
                setActiveCycle(null);
                setLoading(false);
                return;
            }
            setActiveCycle(active);

            // 2. Fetch questions for active cycle (role_type=self)
            const qRes = await axios.get(`${API_BASE}/employee/appraisal-questions/?cycle=${active.id}&role_type=self`, { headers: headers() });
            const qList = asArray(qRes.data);
            setQuestions(qList);

            // 3. Fetch or Create evaluation
            const evalRes = await axios.get(`${API_BASE}/employee/appraisal-evaluations/?mine=true&cycle=${active.id}`, { headers: headers() });
            const evalList = asArray(evalRes.data);
            
            let evalObj = evalList[0] || null;
            
            if (!evalObj) {
                // Auto-create evaluation as draft
                const createRes = await axios.post(`${API_BASE}/employee/appraisal-evaluations/`, { cycle: active.id }, { headers: headers() });
                evalObj = createRes.data;
            }
            
            setEvaluation(evalObj);

            // 4. Populate answers state (only for self role_type questions)
            const initialAnswers: Record<number, { rating: number | null; comment: string }> = {};
            qList.forEach((q: Question) => {
                initialAnswers[q.id] = { rating: q.question_type === 'yes_no' ? null : (q.max_score ?? 5), comment: '' };
            });

            if (evalObj?.answers) {
                const selfQuestionIds = new Set(qList.map((q: Question) => q.id));
                evalObj.answers.forEach((ans: any) => {
                    if (selfQuestionIds.has(ans.question)) {
                        initialAnswers[ans.question] = { rating: ans.rating_score ?? null, comment: ans.comment || '' };
                    }
                });
            }
            setAnswersMap(initialAnswers);

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to load appraisal details.');
        } finally {
            setLoading(false);
        }
    };

    const handleRatingChange = (qId: number, val: number | null) => {
        if (evaluation && evaluation.status !== 'draft') return;
        setAnswersMap(prev => {
            const entry = prev[qId] || { rating: null, comment: '' };
            return {
                ...prev,
                [qId]: { ...entry, rating: val }
            };
        });
    };

    const handleCommentChange = (qId: number, val: string) => {
        if (evaluation && evaluation.status !== 'draft') return;
        setAnswersMap(prev => {
            const entry = prev[qId] || { rating: null, comment: '' };
            return {
                ...prev,
                [qId]: { ...entry, comment: val }
            };
        });
    };

    const handleSaveAppraisal = async (submit: boolean) => {
        if (!evaluation) return;
        
        if (submit && !window.confirm('Are you sure you want to final submit your appraisal? You cannot edit your ratings afterwards.')) {
            return;
        }

        setSaving(true);
        setSuccessMsg(null);
        setError(null);

        const answersPayload = Object.entries(answersMap).map(([qId, val]) => ({
            question_id: parseInt(qId),
            rating_score: val.rating,
            comment: val.comment
        }));

        try {
            const res = await axios.post(
                `${API_BASE}/employee/appraisal-evaluations/${evaluation.id}/save_answers/`,
                {
                    answers: answersPayload,
                    submit: submit
                },
                { headers: headers() }
            );

            setEvaluation(res.data);
            setSuccessMsg(submit ? 'Appraisal submitted successfully!' : 'Draft saved successfully!');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to save appraisal answers.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 py-2 animate-pulse">
                <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-44 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
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
                    onClick={loadAppraisalData}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!activeCycle) {
        return (
            <div className="space-y-5 py-2 animate__animated animate__fadeIn">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 text-center max-w-lg mx-auto">
                    <div className="text-5xl mb-3">📅</div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">No Active Appraisal Cycle</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mb-6">
                        There are currently no active self-appraisal cycles assigned to you. Admin or HR will activate reviews during review periods.
                    </p>
                    <Link
                        to="/employee/performance"
                        className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10"
                    >
                        Back to Hub
                    </Link>
                </div>
            </div>
        );
    }

    const isSubmitted = evaluation?.status !== 'draft';

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header banner */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <span className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1">
                        Active Review Period
                    </span>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{activeCycle.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Deadline: {new Date(activeCycle.self_appraisal_deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="flex gap-2">
                    {evaluation && !isSubmitted && (
                        <>
                            <button
                                onClick={() => handleSaveAppraisal(false)}
                                disabled={saving}
                                className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-500 dark:text-gray-300 rounded-xl text-xs font-bold transition"
                            >
                                {saving ? 'Saving...' : 'Save Draft'}
                            </button>
                            <button
                                onClick={() => handleSaveAppraisal(true)}
                                disabled={saving}
                                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10"
                            >
                                {saving ? 'Submitting...' : 'Submit Appraisal'}
                            </button>
                        </>
                    )}
                    <Link
                        to="/employee/performance"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition"
                    >
                        ← Performance Hub
                    </Link>
                </div>
            </div>

            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl text-xs font-bold animate__animated animate__fadeIn">
                    ✓ {successMsg}
                </div>
            )}

            {isSubmitted && (
                <div className="bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <span className="text-base">🔒</span>
                    <span>This appraisal has been submitted. Ratings are locked for manager review.</span>
                </div>
            )}

            {/* Questions Form */}
            {questions.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-12 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <h4 className="text-sm font-bold text-gray-500">No questions mapped for this cycle</h4>
                    <p className="text-[10px] text-gray-400 mt-1">Please ask HR to configure the self-appraisal questionnaire.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.map((q, idx) => {
                        const entry = answersMap[q.id];
                        const val = {
                            rating: entry ? entry.rating : null,
                            comment: entry ? entry.comment : ''
                        };
                        const maxScore = q.max_score || 5;

                        return (
                            <div
                                key={q.id}
                                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-black shrink-0">
                                        {idx + 1}
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-white leading-normal pt-0.5">
                                        {q.question_text}
                                    </h4>
                                </div>

                                {/* Star rating for scale type */}
                                {q.question_type === 'scale' && (
                                    <div className="space-y-2 pl-9">
                                        <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400">
                                            Rating — select 1 to {maxScore}
                                        </label>
                                        <div className="flex gap-1.5 text-2xl">
                                            {Array.from({ length: maxScore }).map((_, i) => {
                                                const star = i + 1;
                                                return (
                                                    <button key={i} type="button" disabled={isSubmitted}
                                                        onClick={() => handleRatingChange(q.id, star)}
                                                        className={`transition focus:outline-none ${!isSubmitted && 'hover:scale-110'} ${
                                                            val.rating !== null && star <= val.rating ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'
                                                        }`}>★</button>
                                                );
                                            })}
                                        </div>
                                        {val.rating !== null && (
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{val.rating} / {maxScore}</span>
                                        )}
                                    </div>
                                )}

                                {/* Yes / No for yes_no type */}
                                {q.question_type === 'yes_no' && (
                                    <div className="space-y-2 pl-9">
                                        <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400">
                                            Your Response
                                        </label>
                                        <div className="flex gap-2">
                                            <button type="button" disabled={isSubmitted}
                                                onClick={() => handleRatingChange(q.id, 1)}
                                                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition ${
                                                    val.rating === 1
                                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600'
                                                }`}>
                                                <span>✓</span> Yes
                                            </button>
                                            <button type="button" disabled={isSubmitted}
                                                onClick={() => handleRatingChange(q.id, 0)}
                                                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition ${
                                                    val.rating === 0
                                                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600'
                                                }`}>
                                                <span>✕</span> No
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Comment text input */}
                                <div className="pl-9 space-y-1.5">
                                    <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400">
                                        Comments / Remarks
                                    </label>
                                    <textarea
                                        rows={2}
                                        disabled={isSubmitted}
                                        placeholder="Add comments or notes justifying this score..."
                                        value={val.comment || ''}
                                        onChange={e => handleCommentChange(q.id, e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none resize-none text-gray-850 dark:text-white"
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {/* Bottom Save bar */}
                    {!isSubmitted && (
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => handleSaveAppraisal(false)}
                                disabled={saving}
                                className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-850 text-gray-500 dark:text-gray-300 rounded-xl text-xs font-bold transition shadow-sm"
                            >
                                {saving ? 'Saving...' : 'Save Draft'}
                            </button>
                            <button
                                onClick={() => handleSaveAppraisal(true)}
                                disabled={saving}
                                className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10"
                            >
                                {saving ? 'Submitting...' : 'Submit Appraisal'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SelfAppraisal;
