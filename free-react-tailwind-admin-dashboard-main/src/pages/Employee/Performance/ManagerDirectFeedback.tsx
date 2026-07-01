import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

/* ─── Types ─────────────────────────────────────────────── */
interface Reportee {
    id: number;
    name: string;
    initials: string;
    designation: string;
    department: string;
}

interface FeedbackEntry {
    id: number;
    sender_name: string;
    receiver: number;
    receiver_name: string;
    feedback_text: string;
    category: string;
    category_display: string;
    rating: number | null;
    visibility: string;
    created_at: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const AVATAR_COLORS = ['bg-emerald-500','bg-indigo-500','bg-amber-500','bg-teal-500','bg-rose-500','bg-blue-500','bg-purple-500','bg-pink-500'];
const avatarBg = (name: string) => AVATAR_COLORS[(name.charCodeAt(0)+(name.charCodeAt(1)||0)) % AVATAR_COLORS.length];

const CAT_OPTS = [
    { value: 'appreciation',     label: '🌟  Appreciation',     cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    { value: 'manager_coaching',  label: '💬  Manager Coaching', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
    { value: 'constructive',      label: '🔧  Constructive',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    { value: 'goal_progress',     label: '🎯  Goal Progress',    cls: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
    { value: 'peer_recognition',  label: '🤝  Peer Recognition', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
];

const CAT_MAP: Record<string, { icon: string; cls: string }> = {
    appreciation:      { icon: '🌟', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    manager_coaching:  { icon: '💬', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
    constructive:      { icon: '🔧', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    goal_progress:     { icon: '🎯', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
    peer_recognition:  { icon: '🤝', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
};

const STARS = [1, 2, 3, 4, 5];

/* ─── Component ─────────────────────────────────────────── */
const ManagerDirectFeedback = () => {
    const dispatch = useDispatch();

    const [reportees, setReportees] = useState<Reportee[]>([]);
    const [selectedEmp, setSelectedEmp] = useState<Reportee | null>(null);
    const [history, setHistory] = useState<FeedbackEntry[]>([]);

    const [loading, setLoading] = useState(true);
    const [histLoading, setHistLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [category, setCategory] = useState('manager_coaching');
    const [feedbackText, setFeedbackText] = useState('');
    const [visibility, setVisibility] = useState('private');

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [search, setSearch] = useState('');

    const API  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    /* ─── Load reportees ─── */
    useEffect(() => {
        dispatch(setPageTitle('Manager Direct Feedback'));
        (async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API}/employee/continuous-feedback/my_reportees/`, { headers: auth() });
                const list: Reportee[] = Array.isArray(res.data) ? res.data : [];
                setReportees(list);
                if (list.length > 0) setSelectedEmp(list[0]);
            } catch (err) {
                console.error('Error loading reportees:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [dispatch]);

    /* ─── Load feedback history when employee changes ─── */
    useEffect(() => {
        if (!selectedEmp) { setHistory([]); return; }
        (async () => {
            try {
                setHistLoading(true);
                const res = await axios.get(`${API}/employee/continuous-feedback/?receiver=${selectedEmp.id}`, { headers: auth() });
                const data = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
                setHistory(data);
            } catch (err) {
                console.error('Error loading feedback history:', err);
            } finally {
                setHistLoading(false);
            }
        })();
    }, [selectedEmp]);

    /* ─── Submit feedback ─── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmp) return;
        if (!feedbackText.trim()) return showToast('Please write some feedback.', 'error');
        if (rating === 0) return showToast('Please select a rating (1–5 stars).', 'error');

        setSubmitting(true);
        try {
            await axios.post(`${API}/employee/continuous-feedback/`, {
                receiver: selectedEmp.id,
                feedback_text: feedbackText.trim(),
                category,
                rating,
                visibility,
            }, { headers: auth() });

            showToast(`Feedback submitted for ${selectedEmp.name}!`, 'success');

            // Reset form
            setFeedbackText('');
            setRating(0);
            setHoverRating(0);
            setCategory('manager_coaching');
            setVisibility('private');

            // Reload history
            const res = await axios.get(`${API}/employee/continuous-feedback/?receiver=${selectedEmp.id}`, { headers: auth() });
            setHistory(Array.isArray(res.data) ? res.data : res.data?.results ?? []);
        } catch (err: any) {
            console.error('Error submitting feedback:', err);
            showToast(err?.response?.data?.detail || 'Failed to submit feedback.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    /* ─── Filtered reportees ─── */
    const filteredReportees = reportees.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.designation.toLowerCase().includes(search.toLowerCase()) ||
        r.department.toLowerCase().includes(search.toLowerCase())
    );

    /* ─── Render stars helper ─── */
    const renderStars = (val: number, interactive = false) => (
        <div className="flex gap-0.5">
            {STARS.map(s => (
                <button
                    key={s}
                    type={interactive ? 'button' : undefined}
                    onClick={interactive ? () => setRating(s) : undefined}
                    onMouseEnter={interactive ? () => setHoverRating(s) : undefined}
                    onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
                    className={`text-lg transition-transform duration-150 ${interactive ? 'cursor-pointer hover:scale-125' : 'cursor-default'}`}
                >
                    {s <= (interactive ? (hoverRating || rating) : val)
                        ? <span className="text-amber-400 drop-shadow-sm">★</span>
                        : <span className="text-gray-300 dark:text-gray-700">☆</span>
                    }
                </button>
            ))}
        </div>
    );

    /* ─── Loading skeleton ─── */
    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-gray-400">Loading your reportees…</span>
            </div>
        </div>
    );

    /* ─── No reportees ─── */
    if (reportees.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <div className="text-5xl">👔</div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">No Reportees Found</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">You currently have no employees reporting to you. Only managers with direct reports can provide direct feedback ratings.</p>
            <Link to="/employee/performance" className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md">
                ← Back to Dashboard
            </Link>
        </div>
    );

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[999] px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold transition-all animate__animated animate__fadeInRight ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {toast.type === 'success' ? '✓ ' : '⚠ '}{toast.msg}
                </div>
            )}

            {/* Header Banner */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 mb-1">Direct Feedback Channel</div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Manager Direct Feedback</h2>
                    <p className="text-xs text-gray-450 mt-0.5 leading-relaxed max-w-lg">
                        Provide continuous, real-time feedback with ratings to your direct reports anytime — recognize achievements, coach for improvement, or track goal progress.
                    </p>
                </div>
                <Link
                    to="/employee/performance"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition whitespace-nowrap self-start"
                >
                    ← Back to Dashboard
                </Link>
            </div>

            {/* Main 3-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ─── Left: Reportee Directory ─── */}
                <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5 flex flex-col h-[620px]">
                    <div className="relative mb-3">
                        <input
                            type="text"
                            placeholder="Search reportee..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition"
                        />
                        <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
                    </div>

                    <span className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-2 select-none block">
                        Your Team ({filteredReportees.length})
                    </span>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {filteredReportees.map(emp => {
                            const active = selectedEmp?.id === emp.id;
                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => setSelectedEmp(emp)}
                                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition select-none ${
                                        active
                                        ? 'bg-teal-500/10 border-teal-500/40 ring-1 ring-teal-500/20'
                                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-full ${avatarBg(emp.name)} text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm`}>
                                        {emp.initials}
                                    </div>
                                    <div className="min-w-0">
                                        <span className={`block text-xs font-bold leading-tight truncate ${active ? 'text-teal-700 dark:text-teal-300' : 'text-gray-800 dark:text-white'}`}>
                                            {emp.name}
                                        </span>
                                        <span className="block text-[9px] text-gray-400 mt-0.5 truncate">
                                            {emp.designation || 'No Designation'} • {emp.department || 'No Dept'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Center: Feedback Form ─── */}
                <div className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-6 flex flex-col h-[620px]">
                    {selectedEmp ? (
                        <>
                            {/* Target Header */}
                            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                                <div className={`w-11 h-11 rounded-full ${avatarBg(selectedEmp.name)} text-white flex items-center justify-center text-sm font-black shadow-md`}>
                                    {selectedEmp.initials}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-white">{selectedEmp.name}</h3>
                                    <span className="text-[10px] text-gray-400">{selectedEmp.designation} • {selectedEmp.department}</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 overflow-y-auto">
                                {/* Star Rating */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Overall Rating</label>
                                    <div className="flex items-center gap-4">
                                        {renderStars(rating, true)}
                                        {rating > 0 && (
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                                                {['', 'Needs Work', 'Below Average', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding'][rating]}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Feedback Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CAT_OPTS.map(c => (
                                            <button
                                                key={c.value}
                                                type="button"
                                                onClick={() => setCategory(c.value)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition ${
                                                    category === c.value
                                                    ? c.cls + ' ring-2 ring-offset-1 ring-current'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-750'
                                                }`}
                                            >
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Feedback Text */}
                                <div className="flex-1 flex flex-col">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Feedback Message</label>
                                    <textarea
                                        value={feedbackText}
                                        onChange={e => setFeedbackText(e.target.value)}
                                        placeholder={`Write your feedback for ${selectedEmp.name}...\n\nBe specific about what was done well or what can be improved.`}
                                        className="flex-1 min-h-[100px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none transition leading-relaxed"
                                    />
                                </div>

                                {/* Visibility */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Visibility</label>
                                    <div className="flex gap-2">
                                        {[
                                            { value: 'private', label: '🔒 Private', desc: 'Only you & employee' },
                                            { value: 'team',    label: '👥 Team',    desc: 'Visible to team' },
                                            { value: 'public',  label: '🌐 Public',  desc: 'Organization-wide' },
                                        ].map(v => (
                                            <button
                                                key={v.value}
                                                type="button"
                                                onClick={() => setVisibility(v.value)}
                                                className={`flex-1 px-3 py-2.5 rounded-xl text-center transition border ${
                                                    visibility === v.value
                                                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300'
                                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                                                }`}
                                            >
                                                <span className="block text-xs font-bold">{v.label}</span>
                                                <span className="block text-[8px] text-gray-400 mt-0.5">{v.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={submitting || !feedbackText.trim() || rating === 0}
                                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-teal-500/20 transition flex items-center justify-center gap-2"
                                >
                                    {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    {submitting ? 'Submitting…' : 'Submit Feedback & Rating'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="text-4xl mb-3">💬</div>
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400">Select a reportee</h4>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-xs">Choose an employee from your team directory on the left to provide direct feedback with a rating.</p>
                        </div>
                    )}
                </div>

                {/* ─── Right: Feedback History ─── */}
                <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5 flex flex-col h-[620px]">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Feedback History
                        </h4>
                        {selectedEmp && (
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                                {history.length} entries
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {histLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : !selectedEmp ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="text-3xl mb-2">📋</div>
                                <p className="text-[10px] text-gray-400">Select an employee to view feedback history.</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="text-3xl mb-2">📭</div>
                                <p className="text-[10px] text-gray-400 italic">No feedback given to {selectedEmp.name} yet.</p>
                            </div>
                        ) : (
                            history.map(fb => {
                                const cat = CAT_MAP[fb.category] || { icon: '📝', cls: 'bg-gray-100 text-gray-600' };
                                return (
                                    <div
                                        key={fb.id}
                                        className="p-4 bg-gray-50/70 dark:bg-gray-850/40 border border-gray-100 dark:border-gray-800/50 rounded-2xl space-y-2 transition hover:shadow-sm"
                                    >
                                        {/* Top row: category + date */}
                                        <div className="flex items-center justify-between">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${cat.cls}`}>
                                                {cat.icon} {fb.category_display}
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-medium">
                                                {new Date(fb.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                            </span>
                                        </div>

                                        {/* Rating stars */}
                                        {fb.rating != null && fb.rating > 0 && (
                                            <div className="flex items-center gap-2">
                                                {renderStars(fb.rating)}
                                                <span className="text-[9px] font-bold text-gray-500">{fb.rating}/5</span>
                                            </div>
                                        )}

                                        {/* Text */}
                                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {fb.feedback_text}
                                        </p>

                                        {/* By */}
                                        <div className="text-[9px] text-gray-400 font-bold">
                                            By: {fb.sender_name}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDirectFeedback;
