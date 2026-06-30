import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import ReactApexChart from 'react-apexcharts';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

interface Feedback {
    id: number;
    sender: number;
    sender_name: string;
    feedback_text: string;
    category: string;
    category_display: string;
    rating: number | null;
    visibility: string;
    acknowledged: boolean;
    created_at: string;
}

const CATEGORIES = [
    { key: '', label: 'All' },
    { key: 'peer_recognition', label: 'Peer Recognition' },
    { key: 'appreciation', label: 'Appreciation' },
    { key: 'manager_coaching', label: 'Manager Coaching' },
    { key: 'constructive', label: 'Constructive' },
    { key: 'goal_progress', label: 'Goal Progress' },
];

const CAT_STYLE: Record<string, { badge: string; bg: string; icon: string }> = {
    peer_recognition: { badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', bg: 'border-l-violet-500', icon: '🤝' },
    appreciation:     { badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bg: 'border-l-emerald-500', icon: '🌟' },
    manager_coaching: { badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', bg: 'border-l-blue-500', icon: '💬' },
    constructive:     { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', bg: 'border-l-amber-500', icon: '🔧' },
    goal_progress:    { badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', bg: 'border-l-teal-500', icon: '🎯' },
};

const AVATAR_COLORS = [
    'bg-teal-500', 'bg-indigo-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-pink-500',
];

const avatarColor = (name: string) =>
    AVATAR_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length];

const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const StarRating = ({ rating }: { rating: number | null }) => {
    if (!rating) return null;
    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className={`w-3 h-3 ${i < rating ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}
                    fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
            <span className="text-[10px] font-bold text-amber-500 ml-1">{rating}/5</span>
        </div>
    );
};

const FeedbackReceived = () => {
    const dispatch = useDispatch();
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [empId, setEmpId] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState('');
    const [search, setSearch] = useState('');
    const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    useEffect(() => { dispatch(setPageTitle('Feedback Received')); }, [dispatch]);

    useEffect(() => {
        (async () => {
            try {
                const idRes = await axios.get(`${API_BASE}/employee/employee-id/`, { headers: getHeaders() });
                const id = idRes.data?.id;
                setEmpId(id);
                if (!id) return;
                const res = await axios.get(`${API_BASE}/employee/continuous-feedback/?receiver=${id}`, { headers: getHeaders() });
                const data = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
                setFeedbacks(data.sort((a: Feedback, b: Feedback) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleAcknowledge = async (id: number) => {
        setAcknowledgingId(id);
        try {
            await axios.patch(`${API_BASE}/employee/continuous-feedback/${id}/`, { acknowledged: true }, { headers: getHeaders() });
            setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, acknowledged: true } : f));
        } catch (e) {
            console.error(e);
        } finally {
            setAcknowledgingId(null);
        }
    };

    const filtered = useMemo(() => {
        let list = feedbacks;
        if (activeCategory) list = list.filter(f => f.category === activeCategory);
        if (showUnreadOnly) list = list.filter(f => !f.acknowledged);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(f =>
                f.feedback_text.toLowerCase().includes(q) ||
                f.sender_name.toLowerCase().includes(q) ||
                f.category_display.toLowerCase().includes(q)
            );
        }
        return list;
    }, [feedbacks, activeCategory, search, showUnreadOnly]);

    // Stats
    const totalCount = feedbacks.length;
    const unreadCount = feedbacks.filter(f => !f.acknowledged).length;
    const avgRating = (() => {
        const rated = feedbacks.filter(f => f.rating);
        if (!rated.length) return null;
        return (rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length).toFixed(1);
    })();

    const catCounts = useMemo(() => {
        const m: Record<string, number> = {};
        feedbacks.forEach(f => { m[f.category] = (m[f.category] || 0) + 1; });
        return m;
    }, [feedbacks]);

    // Donut chart config
    const donutSeries = CATEGORIES.slice(1).map(c => catCounts[c.key] || 0);
    const donutOptions: ApexCharts.ApexOptions = {
        chart: { type: 'donut', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        labels: CATEGORIES.slice(1).map(c => c.label),
        colors: ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#14b8a6'],
        legend: { position: 'bottom', fontSize: '10px' },
        dataLabels: { enabled: false },
        stroke: { width: 2 },
        plotOptions: {
            pie: {
                donut: {
                    size: '68%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            fontSize: '11px',
                            color: '#6b7280',
                            formatter: () => String(totalCount),
                        },
                    },
                },
            },
        },
        tooltip: { y: { formatter: (v: number) => `${v} feedback${v !== 1 ? 's' : ''}` } },
    };

    // Monthly trend — count feedbacks per month (last 6 months)
    const trendData = useMemo(() => {
        const months: Record<string, number> = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months[key] = 0;
        }
        feedbacks.forEach(f => {
            const key = f.created_at.slice(0, 7);
            if (key in months) months[key]++;
        });
        return months;
    }, [feedbacks]);

    const trendLabels = Object.keys(trendData).map(k => {
        const [y, m] = k.split('-');
        return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
    });

    const trendOptions: ApexCharts.ApexOptions = {
        chart: { type: 'area', fontFamily: 'Inter, sans-serif', toolbar: { show: false }, sparkline: { enabled: false } },
        colors: ['#14b8a6'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { categories: trendLabels, labels: { style: { fontSize: '10px' } } },
        yaxis: { labels: { formatter: (v: number) => String(Math.round(v)), style: { fontSize: '10px' } }, min: 0 },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        dataLabels: { enabled: false },
        markers: { size: 4, colors: ['#14b8a6'], strokeColors: '#fff', strokeWidth: 2 },
        tooltip: { y: { formatter: (v: number) => `${v} feedback${v !== 1 ? 's' : ''}` } },
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400 font-semibold">Loading feedback...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">

            {/* Header */}
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white p-6 rounded-3xl shadow-xl shadow-violet-500/10 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
                <div className="relative z-10">
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Performance · Feedback</p>
                    <h1 className="text-2xl font-extrabold">Feedback Received</h1>
                    <p className="text-white/70 text-xs mt-1 max-w-lg">
                        Peer recognitions, manager coaching, and constructive feedback received from your teammates and leads.
                    </p>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Received', value: totalCount, sub: 'all time', color: 'violet' },
                    { label: 'Unread', value: unreadCount, sub: 'awaiting acknowledgement', color: 'amber' },
                    { label: 'Avg Rating', value: avgRating ?? '—', sub: 'across rated feedback', color: 'teal' },
                    { label: 'Categories', value: Object.keys(catCounts).length, sub: 'types of feedback', color: 'indigo' },
                ].map((c, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <div className={`text-3xl font-extrabold text-${c.color}-600 dark:text-${c.color}-400 mb-1`}>{c.value}</div>
                        <div className="text-xs font-bold text-gray-800 dark:text-white">{c.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            {totalCount > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">By Category</h3>
                        <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={240} />
                    </div>
                    <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Feedback Trend (Last 6 Months)</h3>
                        <ReactApexChart
                            options={trendOptions}
                            series={[{ name: 'Feedback', data: Object.values(trendData) }]}
                            type="area"
                            height={240}
                        />
                    </div>
                </div>
            )}

            {/* Filters + Search */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
                {/* Category tabs */}
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(c => (
                        <button
                            key={c.key}
                            onClick={() => setActiveCategory(c.key)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                                activeCategory === c.key
                                    ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {c.label}
                            {c.key && catCounts[c.key] ? (
                                <span className={`ml-1.5 ${activeCategory === c.key ? 'text-white/80' : 'text-gray-400'}`}>
                                    {catCounts[c.key]}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Unread toggle */}
                    <button
                        onClick={() => setShowUnreadOnly(p => !p)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                            showUnreadOnly ? 'bg-amber-500 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-500'
                        }`}
                    >
                        Unread only {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
                    </button>
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search feedback..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none w-44"
                        />
                        <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Result count */}
            <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-gray-400">
                    Showing {filtered.length} of {totalCount} feedback{totalCount !== 1 ? 's' : ''}
                </span>
                {(activeCategory || search || showUnreadOnly) && (
                    <button
                        onClick={() => { setActiveCategory(''); setSearch(''); setShowUnreadOnly(false); }}
                        className="text-[10px] font-bold text-violet-600 hover:underline"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Feedback cards grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-sm font-bold text-gray-400">No feedback found</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {totalCount === 0 ? 'You haven\'t received any feedback yet.' : 'Try adjusting your filters.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(f => {
                        const style = CAT_STYLE[f.category] ?? { badge: 'bg-gray-100 text-gray-500', bg: 'border-l-gray-300', icon: '📝' };
                        const senderInitials = initials(f.sender_name || '?');
                        const color = avatarColor(f.sender_name || '');
                        return (
                            <div
                                key={f.id}
                                className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 border-l-4 ${style.bg} rounded-2xl shadow-sm p-5 flex flex-col gap-3 transition hover:shadow-md ${!f.acknowledged ? 'ring-1 ring-violet-500/20' : ''}`}
                            >
                                {/* Top row */}
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-9 h-9 rounded-full ${color} text-white flex items-center justify-center text-xs font-extrabold shrink-0`}>
                                            {senderInitials}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-800 dark:text-white leading-tight">{f.sender_name}</div>
                                            <div className="text-[9px] text-gray-400 mt-0.5">{new Date(f.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
                                            {style.icon} {f.category_display}
                                        </span>
                                        {!f.acknowledged && (
                                            <span className="text-[7px] font-black bg-violet-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>
                                        )}
                                    </div>
                                </div>

                                {/* Feedback text */}
                                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed flex-1">{f.feedback_text}</p>

                                {/* Rating */}
                                <StarRating rating={f.rating} />

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                        f.visibility === 'public' ? 'bg-emerald-500/10 text-emerald-600'
                                        : f.visibility === 'team' ? 'bg-blue-500/10 text-blue-600'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                    }`}>
                                        {f.visibility}
                                    </span>
                                    {!f.acknowledged ? (
                                        <button
                                            onClick={() => handleAcknowledge(f.id)}
                                            disabled={acknowledgingId === f.id}
                                            className="text-[9px] font-black text-violet-600 hover:bg-violet-500/10 px-2 py-1 rounded-lg transition disabled:opacity-50"
                                        >
                                            {acknowledgingId === f.id ? 'Saving...' : '✓ Acknowledge'}
                                        </button>
                                    ) : (
                                        <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Acknowledged
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FeedbackReceived;
