import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface Cycle {
    id: number;
    name: string;
    self_appraisal_deadline: string;
    status: string;
}

interface ExtensionRequest {
    id: number;
    cycle: number;
    cycle_name: string;
    original_deadline: string;
    extended_deadline: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

const STATUS_BADGES: Record<string, string> = {
    'pending': 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20',
    'approved': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20',
    'rejected': 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-500/20',
};

const ExtensionStatus = () => {
    const dispatch = useDispatch();
    const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [empId, setEmpId] = useState<number | null>(null);

    // Request Extension Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [origDeadline, setOrigDeadline] = useState('');
    const [requestedDate, setRequestedDate] = useState('');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    useEffect(() => {
        dispatch(setPageTitle('Extension Requests'));
        loadData();
    }, [dispatch]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 1. Fetch employee ID
            const idRes = await axios.get(`${API_BASE}/employee/employee-id/`, { headers: headers() });
            const id = idRes.data?.id;
            setEmpId(id);
            if (!id) {
                setLoading(false);
                return;
            }

            // 2. Fetch extensions for this employee
            const extRes = await axios.get(`${API_BASE}/employee/appraisal-extensions/?employee=${id}`, { headers: headers() });
            setExtensions(asArray(extRes.data));

            // 3. Fetch cycles for drop-down list
            const cycleRes = await axios.get(`${API_BASE}/employee/appraisal-cycles/`, { headers: headers() });
            setCycles(asArray(cycleRes.data));

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to load extension status details.');
        } finally {
            setLoading(false);
        }
    };

    // Cycle selection update handler
    const handleCycleChange = (cycleIdStr: string) => {
        setSelectedCycleId(cycleIdStr);
        if (!cycleIdStr) {
            setOrigDeadline('');
            return;
        }
        const cycleObj = cycles.find(c => c.id.toString() === cycleIdStr);
        if (cycleObj) {
            // format original deadline date string (YYYY-MM-DD)
            const dateOnly = cycleObj.self_appraisal_deadline.split('T')[0] || '';
            setOrigDeadline(dateOnly);
        }
    };

    // Submit new request
    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empId || !selectedCycleId || !requestedDate || !reason.trim()) {
            setModalError('Please fill in all required fields.');
            return;
        }

        setSaving(true);
        setModalError(null);

        // format to DateTime strings
        const origDt = `${origDeadline}T23:59:00`;
        const extDt = `${requestedDate}T23:59:00`;

        try {
            await axios.post(
                `${API_BASE}/employee/appraisal-extensions/`,
                {
                    cycle: parseInt(selectedCycleId),
                    employee: empId,
                    requester: empId,
                    original_deadline: origDt,
                    extended_deadline: extDt,
                    reason: reason,
                    status: 'pending'
                },
                { headers: headers() }
            );

            // Reset and reload list
            setShowModal(false);
            setSelectedCycleId('');
            setOrigDeadline('');
            setRequestedDate('');
            setReason('');
            
            // Reload
            const extRes = await axios.get(`${API_BASE}/employee/appraisal-extensions/?employee=${empId}`, { headers: headers() });
            setExtensions(asArray(extRes.data));

        } catch (err: any) {
            console.error(err);
            setModalError(err.response?.data?.detail || 'Failed to request extension.');
        } finally {
            setSaving(false);
        }
    };

    const fmtDate = (d: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

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
                    onClick={loadData}
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
                    <div className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 mb-1">Review Deadlines</div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Appraisal Extension Status</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Submit and track extension requests if you need more time to fill self-appraisals.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10 whitespace-nowrap"
                    >
                        Request Extension
                    </button>
                    <Link
                        to="/employee/performance"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition"
                    >
                        ← Back to Performance Hub
                    </Link>
                </div>
            </div>

            {/* List */}
            {extensions.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-14 text-center">
                    <div className="text-4xl mb-3">🕒</div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">No extension requests</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Requests submitted for deadline grace periods will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {extensions.map((ext) => {
                        const styleClass = STATUS_BADGES[ext.status] || 'bg-gray-100 text-gray-550 border border-gray-200';
                        return (
                            <div
                                key={ext.id}
                                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black text-gray-800 dark:text-white">
                                            {ext.cycle_name || `Appraisal Cycle #${ext.cycle}`}
                                        </h3>
                                        <div className="bg-gray-50 dark:bg-gray-850 rounded-xl px-3 py-1.5 inline-block text-[11px] text-gray-500 dark:text-gray-400">
                                            <span className="font-bold text-gray-400">Reason: </span>"{ext.reason}"
                                        </div>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${styleClass}`}>
                                        {ext.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-850">
                                    <div className="bg-gray-50 dark:bg-gray-850/50 rounded-xl p-3">
                                        <div className="text-[8px] font-black text-gray-400 uppercase mb-1">Original Deadline</div>
                                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{fmtDate(ext.original_deadline)}</div>
                                    </div>
                                    <div className="bg-teal-500/5 rounded-xl p-3">
                                        <div className="text-[8px] font-black text-teal-600 dark:text-teal-400 uppercase mb-1">Requested Extended Date</div>
                                        <div className="text-xs font-bold text-teal-700 dark:text-teal-400">{fmtDate(ext.extended_deadline)}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Request Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl p-6 max-w-md w-full relative animate__animated animate__zoomIn animate__faster">
                        {/* Close */}
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 text-lg font-bold"
                        >
                            ✕
                        </button>

                        <div className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-1">New request</div>
                        <h3 className="text-lg font-bold text-gray-850 dark:text-white mb-4">Request Deadline Extension</h3>

                        {modalError && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-xs font-bold mb-4">
                                ⚠️ {modalError}
                            </div>
                        )}

                        <form onSubmit={handleRequestSubmit} className="space-y-4">
                            {/* Cycle selection */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Select Appraisal Cycle *</label>
                                <select
                                    required
                                    value={selectedCycleId}
                                    onChange={e => handleCycleChange(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-850 dark:text-white focus:outline-none"
                                >
                                    <option value="">Choose cycle...</option>
                                    {cycles.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Original Deadline Display */}
                            {origDeadline && (
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Original Deadline</label>
                                    <input
                                        type="date"
                                        disabled
                                        value={origDeadline}
                                        className="w-full bg-gray-100 dark:bg-gray-850 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-450 dark:text-gray-400"
                                    />
                                </div>
                            )}

                            {/* Requested date */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Requested Extended Date *</label>
                                <input
                                    required
                                    type="date"
                                    min={origDeadline || new Date().toISOString().split('T')[0]}
                                    value={requestedDate}
                                    onChange={e => setRequestedDate(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-850 dark:text-white focus:outline-none"
                                />
                            </div>

                            {/* Reason details */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Justification Reason *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Explain why you require a deadline extension (e.g. sick leave, client work commitments)..."
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-850 dark:text-white focus:outline-none"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-200 dark:border-gray-800 text-gray-500 rounded-xl text-xs font-bold transition hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !selectedCycleId || !requestedDate || !reason.trim()}
                                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/10"
                                >
                                    {saving ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExtensionStatus;
