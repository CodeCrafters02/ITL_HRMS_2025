import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface Employee {
    id: number;
    full_name: string;
    initials: string;
    designation_name: string | null;
    department_name: string | null;
}

interface FeedbackProvidedType {
    id: number;
    feedback_type: string;
    feedback_text: string;
    rating: number | null;
    receiver_name: string;
    created_at: string | null;
    visibility: string;
}

const CATEGORY_STYLES: Record<string, { badge: string; dot: string }> = {
    'Peer Recognition': { badge: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400', dot: 'bg-indigo-500' },
    'Appreciation': { badge: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
    'Manager Coaching': { badge: 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', dot: 'bg-amber-500' },
    'Constructive': { badge: 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400', dot: 'bg-rose-500' },
    'Goal Progress': { badge: 'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400', dot: 'bg-cyan-500' },
};

const VISIBILITY_STYLES: Record<string, string> = {
    'private': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    'team': 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-450',
    'public': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450',
};

const AVATAR_COLORS = [
    'bg-emerald-500',
    'bg-indigo-500',
    'bg-amber-500',
    'bg-teal-500',
    'bg-rose-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-violet-500',
];

const FeedbackProvided = () => {
    const dispatch = useDispatch();
    const [feedbacks, setFeedbacks] = useState<FeedbackProvidedType[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Give Feedback Form state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState(false);

    // Form inputs
    const [searchEmp, setSearchEmp] = useState('');
    const [showEmpList, setShowEmpList] = useState(false);
    const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
    const [selectedEmpName, setSelectedEmpName] = useState('');
    const [category, setCategory] = useState('peer_recognition');
    const [rating, setRating] = useState(5);
    const [visibility, setVisibility] = useState('private');
    const [feedbackText, setFeedbackText] = useState('');

    // Client-side list filters
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [profileRes, empRes] = await Promise.all([
                axios.get(`${API_BASE}/employee/performance-dashboard/my/`, { headers: headers() }),
                axios.get(`${API_BASE}/employee/all-employees-list/`, { headers: headers() }),
            ]);
            setFeedbacks(profileRes.data.feedbacks_provided || []);
            setEmployees(asArray(empRes.data));
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to load feedbacks.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        dispatch(setPageTitle('Feedback Provided'));
        fetchInitialData();
    }, [dispatch]);

    // Handle feedback submission
    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmpId || !feedbackText.trim()) {
            setFormError('Please select a recipient coworker and write feedback.');
            return;
        }

        setSaving(true);
        setFormError(null);
        setFormSuccess(false);

        try {
            await axios.post(
                `${API_BASE}/employee/continuous-feedback/`,
                {
                    receiver: selectedEmpId,
                    category: category,
                    feedback_text: feedbackText,
                    rating: rating,
                    visibility: visibility,
                },
                { headers: headers() }
            );

            setFormSuccess(true);
            setFeedbackText('');
            setSelectedEmpId(null);
            setSelectedEmpName('');
            setSearchEmp('');
            setRating(5);
            
            // Refresh list
            const profileRes = await axios.get(`${API_BASE}/employee/performance-dashboard/my/`, { headers: headers() });
            setFeedbacks(profileRes.data.feedbacks_provided || []);
            
            // Close modal after delay
            setTimeout(() => {
                setShowModal(false);
                setFormSuccess(false);
            }, 1500);
        } catch (err: any) {
            console.error(err);
            setFormError(err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(' ') || 'Failed to submit feedback.');
        } finally {
            setSaving(false);
        }
    };

    // Client-side filtering of provided feedback
    const filteredFeedbacks = useMemo(() => {
        return feedbacks.filter(f => {
            const matchesSearch = 
                f.receiver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.feedback_text.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesCategory = categoryFilter === 'all' || f.feedback_type === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [feedbacks, searchQuery, categoryFilter]);

    if (loading) {
        return (
            <div className="space-y-6 py-2 animate-pulse">
                <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="text-rose-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Error Loading Feedback</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                <Link
                    to="/employee/performance"
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition"
                >
                    Back to Performance Hub
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 mb-1">Employee Feed</div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Feedback Provided</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Track and submit reviews, recognition, and coaching shares you provided to others.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10 whitespace-nowrap"
                    >
                        + Give Feedback
                    </button>
                    <Link
                        to="/employee/performance"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition whitespace-nowrap"
                    >
                        ← Back to Hub
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search provided feedback..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-10 pr-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                >
                    <option value="all">All Categories</option>
                    <option value="Peer Recognition">Peer Recognition</option>
                    <option value="Appreciation">Appreciation</option>
                    <option value="Manager Coaching">Manager Coaching</option>
                    <option value="Constructive">Constructive</option>
                    <option value="Goal Progress">Goal Progress</option>
                </select>
            </div>

            {/* Feedback List */}
            {filteredFeedbacks.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-14 text-center">
                    <div className="text-4xl mb-3">✉️</div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">No feedback items provided</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Start by clicking "+ Give Feedback" to write a note to a colleague.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredFeedbacks.map((f, index) => {
                        const style = CATEGORY_STYLES[f.feedback_type] || {
                            badge: 'bg-gray-500/10 text-gray-700 dark:bg-gray-950/40 dark:text-gray-400',
                            dot: 'bg-gray-500',
                        };
                        const initials = f.receiver_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        const avatarBg = AVATAR_COLORS[f.id % AVATAR_COLORS.length];

                        return (
                            <div
                                key={f.id || index}
                                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl ${avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                                {initials}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-800 dark:text-white leading-tight">To: {f.receiver_name}</h4>
                                                <span className="text-[10px] text-gray-400">{f.created_at || '—'}</span>
                                            </div>
                                        </div>

                                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5 ${style.badge}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                            {f.feedback_type}
                                        </span>
                                    </div>

                                    {f.rating && (
                                        <div className="flex gap-0.5 text-amber-400 mb-3">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <svg
                                                    key={i}
                                                    className={`w-3.5 h-3.5 ${i < (f.rating as number) ? 'fill-current' : 'text-gray-200 dark:text-gray-700'}`}
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                    )}

                                    <div className="relative text-xs text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-50 dark:border-gray-800/20 mb-3">
                                        <svg className="w-6 h-6 text-gray-200 dark:text-gray-700 absolute -top-2.5 -left-1" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.988zm-12 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                        </svg>
                                        <p className="relative z-10 leading-relaxed pl-3">{f.feedback_text}</p>
                                    </div>
                                    
                                    <div className="flex justify-end">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${VISIBILITY_STYLES[(f.visibility || 'private').toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                                            👁 {f.visibility || 'private'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Give Feedback Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full border border-gray-100 dark:border-gray-800 shadow-2xl p-6 relative overflow-visible animate__animated animate__zoomIn animate__faster">
                        {/* Close button */}
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold"
                        >
                            ✕
                        </button>

                        <div className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-1">New Review</div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Give Teammate Feedback</h3>

                        {formError && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-xs font-bold mb-4">
                                ⚠️ {formError}
                            </div>
                        )}

                        {formSuccess && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-xs font-bold mb-4">
                                ✓ Feedback submitted successfully!
                            </div>
                        )}

                        <form onSubmit={handleSubmitFeedback} className="space-y-4">
                            {/* Search Teammate */}
                            <div className="relative">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Coworker Teammate *</label>
                                <input
                                    type="text"
                                    placeholder="Search coworker by name..."
                                    value={searchEmp}
                                    onChange={e => {
                                        setSearchEmp(e.target.value);
                                        setSelectedEmpId(null);
                                        setSelectedEmpName('');
                                        setShowEmpList(true);
                                    }}
                                    onFocus={() => setShowEmpList(true)}
                                    onBlur={() => setTimeout(() => setShowEmpList(false), 200)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                />
                                {showEmpList && (
                                    <div className="absolute z-30 mt-1 w-full max-h-40 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                                        {employees
                                            .filter(e => e.full_name.toLowerCase().includes(searchEmp.toLowerCase()))
                                            .slice(0, 15)
                                            .map(e => (
                                                <div
                                                    key={e.id}
                                                    onMouseDown={() => {
                                                        setSelectedEmpId(e.id);
                                                        setSelectedEmpName(e.full_name);
                                                        setSearchEmp(e.full_name);
                                                        setShowEmpList(false);
                                                    }}
                                                    className="px-4 py-2.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-500/10 cursor-pointer"
                                                >
                                                    {e.full_name} <span className="text-gray-400">({e.designation_name || 'No Designation'})</span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                                {selectedEmpId && (
                                    <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1">
                                        Selected recipient: {selectedEmpName}
                                    </div>
                                )}
                            </div>

                            {/* Category & Visibility */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Feedback Category *</label>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                    >
                                        <option value="peer_recognition">Peer Recognition</option>
                                        <option value="appreciation">Appreciation</option>
                                        <option value="manager_coaching">Manager Coaching</option>
                                        <option value="constructive">Constructive</option>
                                        <option value="goal_progress">Goal Progress</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Feedback Visibility *</label>
                                    <select
                                        value={visibility}
                                        onChange={e => setVisibility(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                    >
                                        <option value="private">Private (Receiver & Manager Only)</option>
                                        <option value="team">Team (Visible to Team)</option>
                                        <option value="public">Public (Visible to All)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Star Rating Select */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Rating Score</label>
                                <div className="flex gap-2 text-2xl text-gray-300 dark:text-gray-700">
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <button
                                            type="button"
                                            key={num}
                                            onClick={() => setRating(num)}
                                            className={`transition hover:scale-110 ${num <= rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-700'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Comment Text */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Feedback Details *</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Write your positive praises or coaching suggestions here..."
                                    value={feedbackText}
                                    onChange={e => setFeedbackText(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-450 rounded-xl text-xs font-bold transition hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !selectedEmpId || !feedbackText.trim()}
                                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10"
                                >
                                    {saving ? 'Saving...' : 'Send Feedback'}
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
