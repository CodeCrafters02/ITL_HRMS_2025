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

interface AppraisalExtension {
    id: number;
    cycle: number;
    employee: number;
    original_deadline: string;
    extended_deadline: string;
    status: 'pending' | 'approved' | 'rejected';
}

const SelfAppraisal = () => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [extensions, setExtensions] = useState<AppraisalExtension[]>([]);

    const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    
    const [answersMap, setAnswersMap] = useState<Record<number, { rating: number | null; comment: string }>>({});

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    useEffect(() => {
        dispatch(setPageTitle('Self Appraisal Log'));
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

            // 3. Fetch or Create evaluation & Fetch extensions concurrently
            const [evalRes, extsRes] = await Promise.all([
                axios.get(`${API_BASE}/employee/appraisal-evaluations/?mine=true&cycle=${active.id}`, { headers: headers() }),
                axios.get(`${API_BASE}/employee/appraisal-extensions/?cycle=${active.id}`, { headers: headers() })
            ]);
            const evalList = asArray(evalRes.data);
            const allExts = asArray(extsRes.data);
            
            let evalObj = evalList[0] || null;
            
            if (!evalObj) {
                // Auto-create evaluation as draft if not exists
                const createRes = await axios.post(`${API_BASE}/employee/appraisal-evaluations/`, { cycle: active.id }, { headers: headers() });
                evalObj = createRes.data;
            }
            
            setEvaluation(evalObj);

            // Fetch current employee's extensions
            const myEmpId = evalObj?.employee;
            if (myEmpId) {
                setExtensions(allExts.filter((e: any) => e.employee === myEmpId));
            } else {
                setExtensions(allExts);
            }

            // 4. Populate answers state (only for self role_type questions)
            const initialAnswers: Record<number, { rating: number | null; comment: string }> = {};
            qList.forEach((q: Question) => {
                initialAnswers[q.id] = { rating: null, comment: '' };
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

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse py-2">
                <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
                <p className="text-sm font-bold text-rose-500">{error}</p>
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

    // Force isSubmitted to true so that the page is strictly read-only
    const isSubmitted = true;

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header banner */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <span className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1">
                        Self Appraisal Log
                    </span>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{activeCycle.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Deadline: {(() => {
                            const baseDeadline = new Date(activeCycle.self_appraisal_deadline);
                            const approvedExt = extensions.find(ext => {
                                if (ext.status !== 'approved') return false;
                                const extOrigDate = new Date(ext.original_deadline);
                                return Math.abs(extOrigDate.getTime() - baseDeadline.getTime()) < 60000;
                            });
                            const extended = approvedExt ? new Date(approvedExt.extended_deadline) : baseDeadline;
                            return (
                                <>
                                    <span className={approvedExt ? "text-emerald-500 font-extrabold" : ""}>
                                        {extended.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {approvedExt && <span className="ml-2 text-emerald-500 font-extrabold text-[10px] uppercase">(Extension Approved)</span>}
                                </>
                            );
                        })()}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/employee/performance"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-855 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition"
                    >
                        ← Performance Hub
                    </Link>
                </div>
            </div>

            {/* Read-only notice */}
            <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-205 dark:border-teal-900/40 text-teal-700 dark:text-teal-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <span className="text-base">ℹ️</span>
                <span>
                    This page is view-only. You can submit or edit your live self-appraisal responses directly from the{' '}
                    <Link to="/employee/performance/feedback-provided" className="underline font-bold text-teal-600 dark:text-teal-350 hover:text-teal-800 dark:hover:text-teal-300">
                        Feedback Provided
                    </Link>{' '}
                    page.
                </span>
            </div>

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
                                            Rating
                                        </label>
                                        <div className="flex gap-1.5 text-2xl">
                                            {Array.from({ length: maxScore }).map((_, i) => {
                                                const star = i + 1;
                                                return (
                                                    <span key={i}
                                                        className={`focus:outline-none ${
                                                            val.rating !== null && star <= val.rating ? 'text-amber-400' : 'text-gray-200 dark:text-gray-800'
                                                        }`}>★</span>
                                                );
                                            })}
                                        </div>
                                        {val.rating !== null ? (
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{val.rating} / {maxScore}</span>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">No rating submitted</span>
                                        )}
                                    </div>
                                )}

                                {/* Yes / No for yes_no type */}
                                {q.question_type === 'yes_no' && (
                                    <div className="space-y-2 pl-9">
                                        <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400">
                                            Response
                                        </label>
                                        <div className="flex gap-2">
                                            <span className={`px-4 py-1.5 rounded-xl text-xs font-bold ${
                                                val.rating === 1
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-450 opacity-40'
                                            }`}>✓ Yes</span>
                                            <span className={`px-4 py-1.5 rounded-xl text-xs font-bold ${
                                                val.rating === 0
                                                    ? 'bg-rose-500 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-455 opacity-40'
                                            }`}>✕ No</span>
                                        </div>
                                    </div>
                                )}

                                {/* Comment text input */}
                                <div className="pl-9 space-y-1.5">
                                    <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400">
                                        Comments / Remarks
                                    </label>
                                    <div className="w-full bg-gray-50 dark:bg-gray-850/50 border border-gray-100 dark:border-gray-800 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {val.comment ? val.comment : <span className="text-gray-400 italic">No comments provided.</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SelfAppraisal;
