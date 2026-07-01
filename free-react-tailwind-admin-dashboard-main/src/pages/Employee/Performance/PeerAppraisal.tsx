import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface PeerTarget {
    id: number;
    name: string;
    initials: string;
    designation: string;
    department: string;
    relation: 'peer';
    already_submitted: boolean;
    submitted_answers: {
        question_id: number;
        question_text: string;
        question_type: string;
        max_score: number;
        rating_score: number | null;
        comment: string;
    }[];
}

interface Question {
    id: number;
    question_text: string;
    question_type: string;
    max_score: number;
}

const PeerAppraisal = () => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeCycleId, setActiveCycleId] = useState<number | null>(null);
    const [activeCycleName, setActiveCycleName] = useState<string>('');
    const [peerTargets, setPeerTargets] = useState<PeerTarget[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<PeerTarget | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    
    const [answersMap, setAnswersMap] = useState<Record<number, { rating: number | null; comment: string }>>({});
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    useEffect(() => {
        dispatch(setPageTitle('Peer Appraisal'));
        loadTargets();
    }, [dispatch]);

    const loadTargets = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 1. Fetch feedback targets
            const res = await axios.get(`${API_BASE}/employee/appraisal-evaluations/my_feedback_targets/`, { headers: headers() });
            const data = res.data;
            const cycleId = data.cycle_id;
            setActiveCycleId(cycleId);
            setActiveCycleName(data.cycle_name || 'Active Appraisal Cycle');

            const targetsList: PeerTarget[] = asArray(data.targets).filter((t: any) => t.relation === 'peer');
            setPeerTargets(targetsList);

            if (targetsList.length > 0) {
                // Select first target by default
                handleSelectTarget(targetsList[0], cycleId);
            } else {
                setLoading(false);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to load peer review targets.');
            setLoading(false);
        }
    };

    const handleSelectTarget = async (target: PeerTarget, cycleId: number | null) => {
        setSelectedTarget(target);
        setSuccessMsg(null);
        setError(null);
        if (!cycleId) return;

        try {
            setLoading(true);
            // Fetch peer questions for active cycle
            const qRes = await axios.get(`${API_BASE}/employee/appraisal-questions/?cycle=${cycleId}&role_type=peer`, { headers: headers() });
            const qList = asArray(qRes.data);
            setQuestions(qList);

            // Populate answers map from target's submitted_answers or default empty values
            const initialAnswers: Record<number, { rating: number | null; comment: string }> = {};
            qList.forEach((q: Question) => {
                initialAnswers[q.id] = { 
                    rating: q.question_type === 'yes_no' ? null : (q.max_score ?? 5), 
                    comment: '' 
                };
            });

            if (target.submitted_answers && target.submitted_answers.length > 0) {
                target.submitted_answers.forEach((ans: any) => {
                    initialAnswers[ans.question_id] = { 
                        rating: ans.rating_score ?? null, 
                        comment: ans.comment || '' 
                    };
                });
            }
            setAnswersMap(initialAnswers);
        } catch (err: any) {
            console.error(err);
            setError('Failed to load peer questions.');
        } finally {
            setLoading(false);
        }
    };

    const handleRatingChange = (qId: number, val: number | null) => {
        if (selectedTarget?.already_submitted) return;
        setAnswersMap(prev => ({ 
            ...prev, 
            [qId]: { ...prev[qId], rating: val } 
        }));
    };

    const handleCommentChange = (qId: number, val: string) => {
        if (selectedTarget?.already_submitted) return;
        setAnswersMap(prev => ({ 
            ...prev, 
            [qId]: { ...prev[qId], comment: val } 
        }));
    };

    const handleSubmitFeedback = async () => {
        if (!selectedTarget || !activeCycleId) return;
        
        if (!window.confirm(`Are you sure you want to submit review for ${selectedTarget.name}? You cannot edit ratings afterwards.`)) {
            return;
        }

        setSaving(true);
        setSuccessMsg(null);
        setError(null);

        const answersPayload = Object.entries(answersMap).map(([qId, val]) => ({
            question_id: parseInt(qId),
            rating_score: val.rating,
            comment: val.comment,
        }));

        try {
            await axios.post(
                `${API_BASE}/employee/appraisal-evaluations/submit_feedback/`,
                {
                    target_employee_id: selectedTarget.id,
                    cycle_id: activeCycleId,
                    role_type: 'peer',
                    answers: answersPayload,
                },
                { headers: headers() }
            );

            setSuccessMsg(`Feedback submitted successfully for ${selectedTarget.name}!`);
            
            // Reload targets to refresh status
            const res = await axios.get(`${API_BASE}/employee/appraisal-evaluations/my_feedback_targets/`, { headers: headers() });
            const targetsList: PeerTarget[] = asArray(res.data.targets).filter((t: any) => t.relation === 'peer');
            setPeerTargets(targetsList);
            
            const updatedTarget = targetsList.find(t => t.id === selectedTarget.id);
            if (updatedTarget) {
                setSelectedTarget(updatedTarget);
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to submit peer feedback.');
        } finally {
            setSaving(false);
        }
    };

    if (loading && peerTargets.length === 0) {
        return (
            <div className="space-y-6 py-2 animate-pulse">
                <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                    <div className="lg:col-span-2 space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-44 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error && peerTargets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="text-rose-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Error</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                <button onClick={loadTargets} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition">
                    Retry
                </button>
            </div>
        );
    }

    if (!activeCycleId || peerTargets.length === 0) {
        return (
            <div className="space-y-5 py-2 animate__animated animate__fadeIn">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 text-center max-w-lg mx-auto">
                    <div className="text-5xl mb-3">🤝</div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">No Peer Reviews Assigned</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mb-6">
                        You have no peer review evaluations assigned to you in the current appraisal cycle.
                    </p>
                    <Link to="/employee/performance" className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10">
                        Back to Hub
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header banner */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1">
                        Peer Review Period
                    </span>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{activeCycleName}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Evaluate your colleagues for the current review cycle.</p>
                </div>
                <Link to="/employee/performance" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition">
                    ← Performance Hub
                </Link>
            </div>

            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl text-xs font-bold animate__animated animate__fadeIn">
                    ✓ {successMsg}
                </div>
            )}

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-4 rounded-2xl text-xs font-bold animate__animated animate__fadeIn">
                    ⚠️ {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                {/* Left: targets list */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-4 space-y-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Assigned Peers ({peerTargets.length})</span>
                    <div className="space-y-2">
                        {peerTargets.map(target => {
                            const isSelected = selectedTarget?.id === target.id;
                            const colors = ['bg-indigo-500', 'bg-teal-500', 'bg-violet-500', 'bg-cyan-500', 'bg-emerald-500'];
                            const avatarBg = colors[target.id % colors.length];

                            return (
                                <div key={target.id} onClick={() => handleSelectTarget(target, activeCycleId)}
                                    className={`p-3 rounded-2xl border cursor-pointer transition select-none flex items-center gap-3 ${
                                        isSelected 
                                            ? 'bg-teal-500/10 border-teal-500' 
                                            : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                    }`}>
                                    <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-extrabold text-sm shrink-0 ${avatarBg}`}>
                                        {target.initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-bold text-gray-800 dark:text-white leading-tight truncate">{target.name}</h4>
                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{target.designation} · {target.department}</p>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        target.already_submitted 
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' 
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                    }`}>
                                        {target.already_submitted ? 'Completed' : 'Pending'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: evaluation questions */}
                <div className="lg:col-span-2 space-y-4">
                    {selectedTarget ? (
                        <>
                            {/* Target profile preview */}
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">Evaluating</span>
                                    <h3 className="text-base font-bold text-gray-800 dark:text-white mt-0.5">{selectedTarget.name}</h3>
                                    <p className="text-xs text-gray-450">{selectedTarget.designation} ({selectedTarget.department})</p>
                                </div>
                                {selectedTarget.already_submitted ? (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                                        <span>🔒</span> Submitted & Locked
                                    </div>
                                ) : (
                                    <button onClick={handleSubmitFeedback} disabled={saving}
                                        className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10">
                                        {saving ? 'Submitting...' : 'Submit Evaluation'}
                                    </button>
                                )}
                            </div>

                            {/* Questions rendering */}
                            {questions.length === 0 ? (
                                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-12 text-center">
                                    <div className="text-3xl mb-2">📋</div>
                                    <h4 className="text-sm font-bold text-gray-500">No questions mapped for peers</h4>
                                    <p className="text-[10px] text-gray-400 mt-1">Ask HR to map questionnaire for peer review evaluations.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {questions.map((q, idx) => {
                                        const val = answersMap[q.id] ?? { rating: null, comment: '' };
                                        return (
                                            <div key={q.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-black shrink-0">
                                                        {idx + 1}
                                                    </div>
                                                    <h4 className="text-sm font-bold text-gray-800 dark:text-white leading-normal pt-0.5">
                                                        {q.question_text}
                                                    </h4>
                                                </div>

                                                {/* Rating options */}
                                                {q.question_type === 'scale' && (
                                                    <div className="space-y-2 pl-9">
                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                            Rating — select 1 to {q.max_score}
                                                        </label>
                                                        <div className="flex gap-1.5 text-2xl">
                                                            {Array.from({ length: q.max_score }).map((_, i) => {
                                                                const star = i + 1;
                                                                return (
                                                                    <button key={i} type="button" disabled={selectedTarget.already_submitted}
                                                                        onClick={() => handleRatingChange(q.id, star)}
                                                                        className={`transition focus:outline-none ${!selectedTarget.already_submitted && 'hover:scale-110'} ${
                                                                            val.rating !== null && star <= val.rating ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'
                                                                        }`}>★</button>
                                                                );
                                                            })}
                                                        </div>
                                                        {val.rating !== null && (
                                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">{val.rating} / {q.max_score}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {q.question_type === 'yes_no' && (
                                                    <div className="space-y-2 pl-9">
                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                            Response
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <button type="button" disabled={selectedTarget.already_submitted}
                                                                onClick={() => handleRatingChange(q.id, 1)}
                                                                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition ${
                                                                    val.rating === 1
                                                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600'
                                                                }`}>
                                                                <span>✓</span> Yes
                                                            </button>
                                                            <button type="button" disabled={selectedTarget.already_submitted}
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

                                                {/* Comment box */}
                                                <div className="space-y-2 pl-9 pt-2">
                                                    <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                        Review Comments / Feedback details
                                                    </label>
                                                    <textarea rows={3} placeholder="Provide specific feedback or examples to support this rating..."
                                                        value={val.comment} disabled={selectedTarget.already_submitted}
                                                        onChange={e => handleCommentChange(q.id, e.target.value)}
                                                        className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-850 px-3 py-2 rounded-xl text-xs font-semibold text-gray-850 dark:text-white focus:outline-none resize-none focus:ring-1 focus:ring-teal-500" />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Action Bar */}
                                    {!selectedTarget.already_submitted && (
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button onClick={handleSubmitFeedback} disabled={saving}
                                                className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10">
                                                {saving ? 'Submitting...' : 'Submit Evaluation'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 text-center">
                            <div className="text-4xl mb-3">👥</div>
                            <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400">Select a Colleague</h4>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">Choose a colleague from the list on the left to fill in your peer evaluation review.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PeerAppraisal;
