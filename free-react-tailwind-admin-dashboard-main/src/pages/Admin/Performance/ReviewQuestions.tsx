import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import IconSearch from '../../../components/Icon/IconSearch';

interface Cycle {
    id: number;
    name: string;
    status: 'draft' | 'active' | 'completed';
    question_count: number;
    self_count: number;
    manager_count: number;
    peer_count: number;
    hr_count: number;
}

interface Question {
    id: number;
    cycle: number;
    cycle_name: string;
    question_text: string;
    question_type: 'scale' | 'yes_no';
    role_type: 'self' | 'manager' | 'peer' | 'hr';
    max_score: number;
}

type RoleTab = 'self' | 'manager' | 'peer' | 'hr';
type QType = 'scale' | 'yes_no';

const ROLE_META: Record<RoleTab, { label: string; color: string; badge: string; icon: string }> = {
    self:    { label: 'Self',    color: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', icon: '👤' },
    manager: { label: 'Manager', color: 'text-teal-600 dark:text-teal-400',     badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',     icon: '👔' },
    peer:    { label: 'Peer',    color: 'text-amber-600 dark:text-amber-400',   badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',   icon: '🤝' },
    hr:      { label: 'Admin/HR', color: 'text-rose-600 dark:text-rose-400',     badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',     icon: '🛡️' },
};

const QTYPE_META: Record<QType, { label: string; icon: string; badge: string }> = {
    scale:  { label: 'Rating Scale (1–5)', icon: '⭐', badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    yes_no: { label: 'Yes / No',           icon: '✅', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
};

const STATUS_STYLE: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
};

const TEMPLATES: Record<RoleTab, string[]> = {
    self: [
        'What were your top 3 achievements this review period?',
        'Where did you fall short of your targets and why?',
        'What skills did you develop this period?',
        'What support do you need from your manager?',
        'Rate your overall performance this period.',
    ],
    manager: [
        'How effectively did the employee meet their KRA targets?',
        'Rate the employee\'s collaboration and teamwork.',
        'What are this employee\'s key development areas?',
        'How proactively does the employee take ownership of tasks?',
        'Rate the employee\'s communication effectiveness.',
    ],
    peer: [
        'How effectively does this colleague collaborate with the team?',
        'How reliable is this colleague in meeting commitments?',
        'Rate their communication and responsiveness.',
    ],
    hr: [
        'Does the employee demonstrate company values consistently?',
        'Rate their adherence to policies and compliance standards.',
        'Is this employee eligible for a hike or promotion this cycle?',
        'Overall admin assessment of this employee\'s performance.',
    ],
};

const ReviewQuestions = () => {
    const [searchParams] = useSearchParams();
    const cycleParam = searchParams.get('cycle');

    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [selectedCycleId, setSelectedCycleId] = useState<number | null>(cycleParam ? parseInt(cycleParam) : null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [activeTab, setActiveTab] = useState<RoleTab>('self');
    const [loadingCycles, setLoadingCycles] = useState(true);
    const [loadingQ, setLoadingQ] = useState(false);

    // Add form
    const [showAdd, setShowAdd] = useState(false);
    const [newText, setNewText] = useState('');
    const [newType, setNewType] = useState<QType>('scale');
    const [newMaxScore, setNewMaxScore] = useState(5);
    const [savingQ, setSavingQ] = useState(false);

    // Edit
    const [editId, setEditId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [editType, setEditType] = useState<QType>('scale');
    const [editMaxScore, setEditMaxScore] = useState(5);

    // Search
    const [qSearch, setQSearch] = useState('');

    // Messages
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

    useEffect(() => {
        (async () => {
            try {
                setLoadingCycles(true);
                const res = await axios.get(`${API_BASE}/employee/appraisal-cycles/`, { headers: headers() });
                const data: Cycle[] = Array.isArray(res.data) ? res.data : res.data.results ?? [];
                setCycles(data);
                if (!selectedCycleId && data.length) setSelectedCycleId(data[0].id);
            } catch {
                setErrorMsg('Failed to load cycles.');
            } finally {
                setLoadingCycles(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!selectedCycleId) return;
        (async () => {
            try {
                setLoadingQ(true);
                setQuestions([]);
                setQSearch('');
                const res = await axios.get(`${API_BASE}/employee/appraisal-questions/?cycle=${selectedCycleId}`, { headers: headers() });
                setQuestions(Array.isArray(res.data) ? res.data : res.data.results ?? []);
            } catch {
                setErrorMsg('Failed to load questions.');
            } finally {
                setLoadingQ(false);
            }
        })();
    }, [selectedCycleId]);

    const selectedCycle = cycles.find(c => c.id === selectedCycleId) || null;

    const countFor = (role: RoleTab) => questions.filter(q => q.role_type === role).length;

    const tabQuestions = useMemo(() => {
        const base = questions.filter(q => q.role_type === activeTab);
        if (!qSearch) return base;
        return base.filter(q => q.question_text.toLowerCase().includes(qSearch.toLowerCase()));
    }, [questions, activeTab, qSearch]);

    const handleAddQuestion = async () => {
        if (!newText.trim() || !selectedCycleId) return;
        setSavingQ(true); setErrorMsg(''); setSuccessMsg('');
        try {
            const res = await axios.post(`${API_BASE}/employee/appraisal-questions/`, {
                cycle: selectedCycleId, question_text: newText.trim(),
                question_type: newType, role_type: activeTab,
                max_score: newType === 'scale' ? newMaxScore : null,
            }, { headers: headers() });
            setQuestions(prev => [...prev, res.data]);
            setCycles(prev => prev.map(c => c.id === selectedCycleId ? { ...c, question_count: c.question_count + 1, [`${activeTab}_count`]: (c as any)[`${activeTab}_count`] + 1 } : c));
            setNewText(''); setNewType('scale'); setNewMaxScore(5); setShowAdd(false);
            setSuccessMsg('Question added.');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.question_text?.[0] || 'Failed to add question.');
        } finally {
            setSavingQ(false);
        }
    };

    const useTemplate = (text: string) => { setNewText(text); setShowAdd(true); };

    const startEdit = (q: Question) => { setEditId(q.id); setEditText(q.question_text); setEditType(q.question_type); setEditMaxScore(q.max_score ?? 5); };
    const cancelEdit = () => { setEditId(null); setEditText(''); };

    const handleUpdateQuestion = async (id: number) => {
        if (!editText.trim()) return;
        setErrorMsg(''); setSuccessMsg('');
        try {
            const res = await axios.patch(`${API_BASE}/employee/appraisal-questions/${id}/`, {
                question_text: editText.trim(), question_type: editType,
                max_score: editType === 'scale' ? editMaxScore : null,
            }, { headers: headers() });
            setQuestions(prev => prev.map(q => q.id === id ? res.data : q));
            cancelEdit();
            setSuccessMsg('Question updated.');
        } catch {
            setErrorMsg('Failed to update question.');
        }
    };

    const handleDeleteQuestion = async (id: number) => {
        if (!window.confirm('Delete this question?')) return;
        setErrorMsg(''); setSuccessMsg('');
        try {
            await axios.delete(`${API_BASE}/employee/appraisal-questions/${id}/`, { headers: headers() });
            const q = questions.find(x => x.id === id);
            setQuestions(prev => prev.filter(x => x.id !== id));
            if (q) setCycles(prev => prev.map(c => c.id === selectedCycleId ? { ...c, question_count: c.question_count - 1, [`${q.role_type}_count`]: Math.max(0, (c as any)[`${q.role_type}_count`] - 1) } : c));
            setSuccessMsg('Question deleted.');
        } catch {
            setErrorMsg('Failed to delete question.');
        }
    };

    return (
        <div className="space-y-5 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Review Questions Builder</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                    Build question sets for each reviewer role per appraisal cycle. Employees will answer these during their appraisal.
                </p>
            </div>

            {errorMsg && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-xs font-bold">⚠️ {errorMsg}</div>}
            {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-xs font-bold">✓ {successMsg}</div>}

            {/* Cycle picker */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Select Appraisal Cycle</label>
                {loadingCycles ? (
                    <div className="text-xs text-gray-400">Loading cycles...</div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {cycles.map(c => (
                            <button key={c.id} onClick={() => setSelectedCycleId(c.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition ${
                                    selectedCycleId === c.id
                                        ? 'bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-500/20'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-400'
                                }`}>
                                <span>{c.name}</span>
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${selectedCycleId === c.id ? 'bg-white/20 text-white' : STATUS_STYLE[c.status]}`}>{c.status}</span>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${selectedCycleId === c.id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{c.question_count}Q</span>
                            </button>
                        ))}
                        {cycles.length === 0 && <span className="text-xs text-gray-400 italic">No cycles available. Create one in Appraisal Cycles page.</span>}
                    </div>
                )}
            </div>

            {selectedCycle && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                    {/* Left: role tabs + question list */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Role tabs */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                            <div className="flex flex-wrap gap-2">
                                {(Object.entries(ROLE_META) as [RoleTab, typeof ROLE_META[RoleTab]][]).map(([role, meta]) => (
                                    <button key={role} onClick={() => { setActiveTab(role); setShowAdd(false); setEditId(null); }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                                            activeTab === role
                                                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}>
                                        <span>{meta.icon}</span>
                                        <span>{meta.label}</span>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${activeTab === role ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                            {countFor(role)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Question list */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5">
                            <div className="flex items-center justify-between mb-4 gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">{ROLE_META[activeTab].icon}</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">{ROLE_META[activeTab].label} Questions</span>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${ROLE_META[activeTab].badge}`}>{countFor(activeTab)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <input type="text" placeholder="Search..." value={qSearch} onChange={e => setQSearch(e.target.value)}
                                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-8 pr-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none w-40" />
                                        <IconSearch className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                                    </div>
                                    <button onClick={() => { setShowAdd(s => !s); setEditId(null); setNewText(''); setNewType('scale'); }}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${showAdd ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-teal-500 hover:bg-teal-600 text-white'}`}>
                                        {showAdd ? '✕ Cancel' : '+ Add Question'}
                                    </button>
                                </div>
                            </div>

                            {/* Add form */}
                            {showAdd && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 border border-teal-200 dark:border-teal-900/40 rounded-2xl p-4 mb-4 space-y-3 animate__animated animate__fadeIn">
                                    <textarea rows={3} placeholder={`Write a ${ROLE_META[activeTab].label.toLowerCase()} appraisal question...`}
                                        value={newText} onChange={e => setNewText(e.target.value)}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none resize-none" />
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Answer type:</span>
                                        {(Object.entries(QTYPE_META) as [QType, typeof QTYPE_META[QType]][]).map(([type, meta]) => (
                                            <button key={type} type="button" onClick={() => setNewType(type)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${newType === type ? 'bg-teal-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                                <span>{meta.icon}</span><span>{meta.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {newType === 'scale' && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Max Rating:</span>
                                            <div className="flex gap-1.5">
                                                {[3, 5, 7, 10].map(n => (
                                                    <button key={n} type="button" onClick={() => setNewMaxScore(n)}
                                                        className={`w-8 h-8 rounded-lg text-[11px] font-black transition ${newMaxScore === n ? 'bg-teal-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-gray-400">→ rated 1 to {newMaxScore}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <button onClick={handleAddQuestion} disabled={!newText.trim() || savingQ}
                                            className="px-4 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-[10px] font-bold">
                                            {savingQ ? 'Saving...' : 'Save Question'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Questions */}
                            <div className="space-y-2">
                                {loadingQ ? (
                                    <div className="text-center py-8 text-xs text-gray-400">Loading questions...</div>
                                ) : tabQuestions.length === 0 ? (
                                    <div className="text-center py-8 text-xs text-gray-400 italic border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                                        No {ROLE_META[activeTab].label.toLowerCase()} questions yet. Add one above or use a template →
                                    </div>
                                ) : tabQuestions.map((q, i) => (
                                    <div key={q.id} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 hover:border-gray-200 dark:hover:border-gray-700 transition">
                                        {editId === q.id ? (
                                            <div className="space-y-2">
                                                <textarea rows={3} value={editText} onChange={e => setEditText(e.target.value)}
                                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none resize-none" />
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {(Object.entries(QTYPE_META) as [QType, typeof QTYPE_META[QType]][]).map(([type, meta]) => (
                                                        <button key={type} type="button" onClick={() => setEditType(type)}
                                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${editType === type ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                                            <span>{meta.icon}</span><span>{meta.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                {editType === 'scale' && (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Max Rating:</span>
                                                        <div className="flex gap-1.5">
                                                            {[3, 5, 7, 10].map(n => (
                                                                <button key={n} type="button" onClick={() => setEditMaxScore(n)}
                                                                    className={`w-8 h-8 rounded-lg text-[11px] font-black transition ${editMaxScore === n ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                                                    {n}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <span className="text-[10px] text-gray-400">→ 1 to {editMaxScore}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={cancelEdit} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-[10px] font-bold">Cancel</button>
                                                    <button onClick={() => handleUpdateQuestion(q.id)} className="px-3 py-1 bg-teal-500 text-white rounded-lg text-[10px] font-bold">Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[10px] font-black text-gray-400 mt-0.5 shrink-0 w-5">Q{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-800 dark:text-white leading-relaxed">{q.question_text}</p>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${QTYPE_META[q.question_type].badge}`}>
                                                            {QTYPE_META[q.question_type].icon} {QTYPE_META[q.question_type].label}
                                                        </span>
                                                        {q.question_type === 'scale' && (
                                                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                                ★ Max {q.max_score ?? 5}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button onClick={() => startEdit(q)} className="text-[9px] font-bold text-teal-600 dark:text-teal-400 hover:underline">Edit</button>
                                                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-[9px] font-bold text-rose-500 hover:underline">Delete</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: summary + templates */}
                    <div className="space-y-4">
                        {/* Cycle summary card */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-xs font-bold text-gray-800 dark:text-white leading-tight">{selectedCycle.name}</div>
                                    <span className={`inline-block mt-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[selectedCycle.status]}`}>{selectedCycle.status}</span>
                                </div>
                                <span className="text-xl font-black text-teal-500">{selectedCycle.question_count}</span>
                            </div>
                            <div className="space-y-2">
                                {(Object.entries(ROLE_META) as [RoleTab, typeof ROLE_META[RoleTab]][]).map(([role, meta]) => {
                                    const count = countFor(role);
                                    const pct = selectedCycle.question_count > 0 ? Math.round((count / selectedCycle.question_count) * 100) : 0;
                                    return (
                                        <div key={role}>
                                            <div className="flex justify-between text-[10px] font-bold mb-1">
                                                <span className={meta.color}>{meta.icon} {meta.label}</span>
                                                <span className="text-gray-400">{count}Q</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Templates */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-base">{ROLE_META[activeTab].icon}</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{ROLE_META[activeTab].label} Templates</span>
                            </div>
                            <div className="space-y-2">
                                {TEMPLATES[activeTab].map((t, i) => (
                                    <div key={i} className="flex items-start gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-teal-500/5 dark:hover:bg-teal-900/20 transition group">
                                        <p className="flex-1 text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">{t}</p>
                                        <button onClick={() => useTemplate(t)}
                                            className="shrink-0 text-[9px] font-black text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition hover:underline">
                                            Use
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!selectedCycle && !loadingCycles && (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-12 text-center">
                    <div className="text-3xl mb-3">📋</div>
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">No cycle selected</div>
                    <p className="text-[10px] text-gray-400 mt-1">Select or create a cycle above to start building questions.</p>
                </div>
            )}
        </div>
    );
};

export default ReviewQuestions;
