import { useState, useEffect } from 'react';
import axios from 'axios';
import IconSearch from '../../../components/Icon/IconSearch';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    department: number | null;
    department_name: string | null;
    designation_name: string | null;
    initials: string;
}

interface Feedback {
    id: number;
    sender: number;
    receiver: number;
    sender_name: string;
    receiver_name: string;
    feedback_text: string;
    category: string;
    category_display: string;
    rating: number | null;
    visibility: string;
    acknowledged: boolean;
    created_at: string;
}

const CATEGORIES = [
    { value: 'appreciation', label: 'Appreciation' },
    { value: 'peer_recognition', label: 'Peer Recognition' },
    { value: 'manager_coaching', label: 'Manager Coaching' },
    { value: 'constructive', label: 'Constructive' },
    { value: 'goal_progress', label: 'Goal Progress' },
];

const CAT_STYLE: Record<string, string> = {
    appreciation: 'bg-emerald-500/10 text-emerald-600',
    peer_recognition: 'bg-teal-500/10 text-teal-600',
    manager_coaching: 'bg-indigo-500/10 text-indigo-600',
    constructive: 'bg-amber-500/10 text-amber-600',
    goal_progress: 'bg-sky-500/10 text-sky-600',
};

const TrackFeedback = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [loadingFb, setLoadingFb] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Give-feedback form
    const [text, setText] = useState('');
    const [category, setCategory] = useState('appreciation');
    const [rating, setRating] = useState<number>(0);
    const [visibility, setVisibility] = useState('private');

    // Editing
    const [editId, setEditId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

    useEffect(() => {
        (async () => {
            try {
                setLoadingEmployees(true);
                const res = await axios.get(`${API_BASE}/employee/all-employees-list/`, { headers: getHeaders() });
                setEmployees(res.data);
                if (res.data.length > 0) setSelectedEmployee(res.data[0]);
            } catch {
                setErrorMsg('Failed to load employee directory.');
            } finally {
                setLoadingEmployees(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!selectedEmployee) return;
        (async () => {
            try {
                setLoadingFb(true); setErrorMsg(''); setSuccessMsg('');
                const res = await axios.get(`${API_BASE}/employee/continuous-feedback/?receiver=${selectedEmployee.id}`, { headers: getHeaders() });
                setFeedbacks(Array.isArray(res.data) ? res.data : (res.data?.results ?? []));
            } catch {
                setErrorMsg('Failed to load feedback for this employee.');
            } finally {
                setLoadingFb(false);
            }
        })();
    }, [selectedEmployee]);

    const filteredEmployees = employees.filter(e =>
        e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.designation_name && e.designation_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const visibleFeedbacks = catFilter ? feedbacks.filter(f => f.category === catFilter) : feedbacks;
    const ratings = feedbacks.filter(f => f.rating).map(f => f.rating as number);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';
    const ackCount = feedbacks.filter(f => f.acknowledged).length;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(''); setSuccessMsg('');
        if (!selectedEmployee || !text.trim()) return;
        try {
            const payload = {
                receiver: selectedEmployee.id,
                feedback_text: text.trim(),
                category,
                rating: rating || null,
                visibility,
            };
            const res = await axios.post(`${API_BASE}/employee/continuous-feedback/`, payload, { headers: getHeaders() });
            setFeedbacks(prev => [res.data, ...prev]);
            setText(''); setRating(0); setCategory('appreciation'); setVisibility('private');
            setSuccessMsg('Feedback shared successfully.');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.feedback_text?.[0] || 'Failed to submit feedback.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this feedback?')) return;
        try {
            await axios.delete(`${API_BASE}/employee/continuous-feedback/${id}/`, { headers: getHeaders() });
            setFeedbacks(prev => prev.filter(f => f.id !== id));
            setSuccessMsg('Feedback deleted.');
        } catch {
            setErrorMsg('Failed to delete feedback.');
        }
    };

    const saveEdit = async (id: number) => {
        if (!editText.trim()) return;
        try {
            const res = await axios.patch(`${API_BASE}/employee/continuous-feedback/${id}/`, { feedback_text: editText.trim() }, { headers: getHeaders() });
            setFeedbacks(prev => prev.map(f => f.id === id ? res.data : f));
            setEditId(null); setEditText('');
        } catch {
            setErrorMsg('Failed to update feedback.');
        }
    };

    const toggleAck = async (f: Feedback) => {
        try {
            const res = await axios.patch(`${API_BASE}/employee/continuous-feedback/${f.id}/`, { acknowledged: !f.acknowledged }, { headers: getHeaders() });
            setFeedbacks(prev => prev.map(x => x.id === f.id ? res.data : x));
        } catch {
            setErrorMsg('Failed to update acknowledgment.');
        }
    };

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Track Feedback</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Review all feedback received by an employee and share continuous feedback, recognition, or coaching.
                </p>
            </div>

            {errorMsg && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-4 rounded-xl text-xs font-bold animate__animated animate__shakeX">⚠️ {errorMsg}</div>}
            {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl text-xs font-bold animate__animated animate__fadeIn">✓ {successMsg}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Left: directory */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex flex-col h-[640px]">
                    <div className="relative mb-4">
                        <input type="text" placeholder="Search employee..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-4 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                        <IconSearch className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-2 select-none block">Workforce Directory ({filteredEmployees.length})</span>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {loadingEmployees ? (
                            <div className="text-center py-10 text-xs text-gray-400">Loading directory...</div>
                        ) : filteredEmployees.map(emp => {
                            const isSelected = selectedEmployee?.id === emp.id;
                            return (
                                <div key={emp.id} onClick={() => setSelectedEmployee(emp)}
                                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${isSelected ? 'bg-teal-500/10 border-teal-500 text-teal-900 dark:text-white' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{emp.initials}</div>
                                        <div>
                                            <span className="block text-xs font-bold leading-tight">{emp.full_name}</span>
                                            <span className="block text-[9px] text-gray-400 mt-0.5">{emp.designation_name || 'Designation Not Set'}</span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full shrink-0">{emp.department_name || 'No Dept'}</span>
                                </div>
                            );
                        })}
                        {!loadingEmployees && filteredEmployees.length === 0 && <div className="text-center py-10 text-xs text-gray-400 italic">No employees found.</div>}
                    </div>
                </div>

                {/* Right: feedback workspace */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-6 flex flex-col h-[640px]">
                    {selectedEmployee ? (
                        <>
                            {/* Profile + stats */}
                            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold shrink-0">{selectedEmployee.initials}</div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{selectedEmployee.full_name}</h3>
                                        <span className="text-[10px] text-gray-400 mt-0.5 block">{selectedEmployee.designation_name || 'Designation Not Set'} • {selectedEmployee.department_name || 'No Dept'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-center">
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-1.5">
                                        <span className="block text-sm font-black text-teal-600 dark:text-teal-400">{feedbacks.length}</span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase">Total</span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-1.5">
                                        <span className="block text-sm font-black text-amber-500">{avgRating}</span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase">Avg ★</span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-1.5">
                                        <span className="block text-sm font-black text-emerald-500">{ackCount}</span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase">Ack'd</span>
                                    </div>
                                </div>
                            </div>

                            {/* Give feedback form */}
                            <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 p-4 rounded-2xl mb-4 space-y-3">
                                <textarea placeholder={`Write feedback for ${selectedEmployee.first_name}...`} value={text} onChange={(e) => setText(e.target.value)} rows={2}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none resize-none" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none">
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                    <select value={visibility} onChange={(e) => setVisibility(e.target.value)}
                                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none">
                                        <option value="private">Private</option>
                                        <option value="team">Team</option>
                                        <option value="public">Public</option>
                                    </select>
                                    <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Rating</span>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <button type="button" key={n} onClick={() => setRating(rating === n ? 0 : n)}
                                                    className={`text-base leading-none ${n <= rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" disabled={!text.trim()}
                                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/10">Share Feedback</button>
                                </div>
                            </form>

                            {/* Filter + timeline */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Feedback Timeline ({visibleFeedbacks.length})</span>
                                <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
                                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-[10px] font-semibold text-gray-700 dark:text-gray-300 focus:outline-none">
                                    <option value="">All categories</option>
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {loadingFb ? (
                                    <div className="text-center py-10 text-xs text-gray-400">Loading feedback...</div>
                                ) : visibleFeedbacks.map(f => (
                                    <div key={f.id} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-3 bg-white dark:bg-gray-900">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${CAT_STYLE[f.category] || 'bg-gray-100 text-gray-600'}`}>{f.category_display}</span>
                                                {f.rating ? <span className="text-[10px] text-amber-400 font-bold">{'★'.repeat(f.rating)}</span> : null}
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">{f.visibility}</span>
                                                {f.acknowledged && <span className="text-[8px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ ACK'D</span>}
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => toggleAck(f)} className="text-[9px] font-bold text-emerald-600 hover:underline">{f.acknowledged ? 'Un-ack' : 'Ack'}</button>
                                                <button onClick={() => { setEditId(f.id); setEditText(f.feedback_text); }} className="text-[9px] font-bold text-teal-600 hover:underline">Edit</button>
                                                <button onClick={() => handleDelete(f.id)} className="text-[9px] font-bold text-rose-500 hover:underline">Delete</button>
                                            </div>
                                        </div>
                                        {editId === f.id ? (
                                            <div className="mt-2 flex gap-2">
                                                <input value={editText} onChange={(e) => setEditText(e.target.value)}
                                                    className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                <button onClick={() => saveEdit(f.id)} className="px-2 text-teal-600 text-[11px] font-black">Save</button>
                                                <button onClick={() => setEditId(null)} className="px-2 text-gray-400 text-sm font-bold">×</button>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">{f.feedback_text}</p>
                                        )}
                                        <div className="flex justify-between mt-2">
                                            <span className="text-[9px] text-gray-400">by {f.sender_name}</span>
                                            <span className="text-[9px] text-gray-400">{new Date(f.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                                {!loadingFb && visibleFeedbacks.length === 0 && <div className="text-center py-10 text-xs text-gray-400 italic">No feedback yet for this employee.</div>}
                            </div>
                        </>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-3xl text-center flex flex-col items-center justify-center h-full">
                            <IconTrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400">Track Feedback</h4>
                            <p className="text-[10px] text-gray-400 max-w-xs mt-1.5 leading-relaxed">Select an employee from the directory to review and give feedback.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrackFeedback;
