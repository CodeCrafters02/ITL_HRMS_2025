import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import IconSearch from '../../../components/Icon/IconSearch';

interface Cycle { id: number; name: string; status: string; }
interface Employee { id: number; full_name: string; initials: string; designation_name: string | null; department_name: string | null; }

interface Extension {
    id: number;
    cycle: number;
    cycle_name: string;
    employee: number;
    employee_name: string;
    employee_initials: string;
    employee_designation: string;
    employee_department: string;
    requester: number | null;
    requester_name: string | null;
    original_deadline: string;
    extended_deadline: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

type TabFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_STYLE = {
    pending:  { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',   dot: 'bg-amber-400',   label: 'Pending'  },
    approved: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-400', label: 'Approved' },
    rejected: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',       dot: 'bg-rose-400',    label: 'Rejected' },
};

const AVATAR_COLORS = ['bg-teal-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-indigo-500','bg-pink-500','bg-cyan-500'];
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysExtended = (orig: string, ext: string) => Math.ceil((new Date(ext).getTime() - new Date(orig).getTime()) / 86400000);

const ReviewExtensions = () => {
    const [extensions, setExtensions] = useState<Extension[]>([]);
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    const [tab, setTab] = useState<TabFilter>('pending');
    const [search, setSearch] = useState('');
    const [cycleFilter, setCycleFilter] = useState('');

    // Grant extension form
    const [showForm, setShowForm] = useState(false);
    const [formCycle, setFormCycle] = useState('');
    const [formEmployee, setFormEmployee] = useState('');
    const [formEmpSearch, setFormEmpSearch] = useState('');
    const [showEmpList, setShowEmpList] = useState(false);
    const [formOrigDeadline, setFormOrigDeadline] = useState('');
    const [formExtDeadline, setFormExtDeadline] = useState('');
    const [formReason, setFormReason] = useState('');
    const [saving, setSaving] = useState(false);

    const [actioningId, setActioningId] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [extRes, cycleRes, empRes] = await Promise.all([
                    axios.get(`${API_BASE}/employee/appraisal-extensions/`, { headers: headers() }),
                    axios.get(`${API_BASE}/employee/appraisal-cycles/`, { headers: headers() }),
                    axios.get(`${API_BASE}/employee/all-employees-list/`, { headers: headers() }),
                ]);
                setExtensions(asArray(extRes.data));
                setCycles(asArray(cycleRes.data));
                setEmployees(asArray(empRes.data));
            } catch {
                setErrorMsg('Failed to load data.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const counts = useMemo(() => ({
        all: extensions.length,
        pending: extensions.filter(e => e.status === 'pending').length,
        approved: extensions.filter(e => e.status === 'approved').length,
        rejected: extensions.filter(e => e.status === 'rejected').length,
    }), [extensions]);

    const filtered = useMemo(() => {
        let list = tab === 'all' ? extensions : extensions.filter(e => e.status === tab);
        if (cycleFilter) list = list.filter(e => e.cycle === parseInt(cycleFilter));
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                e.employee_name.toLowerCase().includes(q) ||
                e.cycle_name.toLowerCase().includes(q) ||
                e.reason.toLowerCase().includes(q)
            );
        }
        return list;
    }, [extensions, tab, cycleFilter, search]);

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        setActioningId(id); setErrorMsg(''); setSuccessMsg('');
        try {
            const res = await axios.patch(`${API_BASE}/employee/appraisal-extensions/${id}/${action}/`, {}, { headers: headers() });
            setExtensions(prev => prev.map(e => e.id === id ? res.data : e));
            setSuccessMsg(`Extension ${action === 'approve' ? 'approved' : 'rejected'}.`);
        } catch {
            setErrorMsg(`Failed to ${action} extension.`);
        } finally {
            setActioningId(null);
        }
    };

    const handleGrantExtension = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formCycle || !formEmployee || !formOrigDeadline || !formExtDeadline) return;
        setSaving(true); setErrorMsg(''); setSuccessMsg('');
        try {
            const res = await axios.post(`${API_BASE}/employee/appraisal-extensions/`, {
                cycle: parseInt(formCycle),
                employee: parseInt(formEmployee),
                requester: parseInt(formEmployee),
                original_deadline: `${formOrigDeadline}T23:59:00`,
                extended_deadline: `${formExtDeadline}T23:59:00`,
                reason: formReason,
                status: 'approved',
            }, { headers: headers() });
            setExtensions(prev => [res.data, ...prev]);
            setShowForm(false);
            setFormCycle(''); setFormEmployee(''); setFormEmpSearch('');
            setFormOrigDeadline(''); setFormExtDeadline(''); setFormReason('');
            setSuccessMsg('Extension granted successfully.');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || 'Failed to grant extension.');
        } finally {
            setSaving(false);
        }
    };

    const TABS: { key: TabFilter; label: string; color: string }[] = [
        { key: 'pending',  label: 'Pending',  color: 'text-amber-600 dark:text-amber-400' },
        { key: 'approved', label: 'Approved', color: 'text-emerald-600 dark:text-emerald-400' },
        { key: 'rejected', label: 'Rejected', color: 'text-rose-600 dark:text-rose-400' },
        { key: 'all',      label: 'All',      color: 'text-gray-600 dark:text-gray-300' },
    ];

    return (
        <div className="space-y-5 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Appraisal Review Extensions</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Approve or reject deadline extensions requested by employees or managers.</p>
                </div>
                <button onClick={() => setShowForm(s => !s)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${showForm ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-teal-500 hover:bg-teal-600 text-white shadow-md shadow-teal-500/10'}`}>
                    {showForm ? '✕ Cancel' : '+ Grant Extension'}
                </button>
            </div>

            {errorMsg && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-xs font-bold">⚠️ {errorMsg}</div>}
            {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-xs font-bold">✓ {successMsg}</div>}

            {/* Grant extension form */}
            {showForm && (
                <div className="bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-900/40 rounded-3xl p-5 animate__animated animate__fadeIn">
                    <div className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-4">Grant Extension (Admin)</div>
                    <form onSubmit={handleGrantExtension} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Appraisal Cycle *</label>
                            <select required value={formCycle} onChange={e => setFormCycle(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none">
                                <option value="">Select cycle...</option>
                                {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="relative">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Employee *</label>
                            <input type="text" placeholder="Search employee..." value={formEmpSearch}
                                onChange={e => { setFormEmpSearch(e.target.value); setFormEmployee(''); setShowEmpList(true); }}
                                onFocus={() => setShowEmpList(true)}
                                onBlur={() => setTimeout(() => setShowEmpList(false), 150)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                            {showEmpList && (
                                <div className="absolute z-30 mt-1 w-full max-h-44 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                                    {employees.filter(e => e.full_name.toLowerCase().includes(formEmpSearch.toLowerCase())).slice(0, 30).map(e => (
                                        <div key={e.id} onMouseDown={() => { setFormEmployee(String(e.id)); setFormEmpSearch(e.full_name); setShowEmpList(false); }}
                                            className="px-3 py-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-500/10 cursor-pointer">
                                            {e.full_name} <span className="text-gray-400">({e.designation_name || 'No Desig'})</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Original Deadline *</label>
                            <input type="date" required value={formOrigDeadline} onChange={e => setFormOrigDeadline(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Extended Deadline *</label>
                            <input type="date" required value={formExtDeadline} onChange={e => setFormExtDeadline(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Reason</label>
                            <input type="text" placeholder="Reason for granting extension..." value={formReason} onChange={e => setFormReason(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                        </div>

                        <div className="sm:col-span-full flex justify-end">
                            <button type="submit" disabled={saving || !formCycle || !formEmployee}
                                className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold">
                                {saving ? 'Granting...' : 'Grant & Approve Extension'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { key: 'pending',  label: 'Pending',  icon: '⏳', val: counts.pending,  bg: 'bg-amber-50 dark:bg-amber-950/20',   num: 'text-amber-600 dark:text-amber-400' },
                    { key: 'approved', label: 'Approved', icon: '✅', val: counts.approved, bg: 'bg-emerald-50 dark:bg-emerald-950/20', num: 'text-emerald-600 dark:text-emerald-400' },
                    { key: 'rejected', label: 'Rejected', icon: '❌', val: counts.rejected, bg: 'bg-rose-50 dark:bg-rose-950/20',     num: 'text-rose-600 dark:text-rose-400' },
                    { key: 'all',      label: 'Total',    icon: '📋', val: counts.all,      bg: 'bg-white dark:bg-gray-900',          num: 'text-gray-700 dark:text-white' },
                ].map(s => (
                    <button key={s.key} onClick={() => setTab(s.key as TabFilter)}
                        className={`${s.bg} border rounded-2xl p-4 text-center transition ${tab === s.key ? 'border-teal-400 dark:border-teal-600' : 'border-gray-100 dark:border-gray-800'}`}>
                        <div className="text-xl mb-1">{s.icon}</div>
                        <div className={`text-2xl font-black ${s.num}`}>{s.val}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</div>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2 flex-1 flex-wrap">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${tab === t.key ? 'bg-teal-500 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            {t.label}
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                {counts[t.key]}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <input type="text" placeholder="Search employee / reason..." value={search} onChange={e => setSearch(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-8 pr-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none w-52" />
                        <IconSearch className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                    </div>
                    <select value={cycleFilter} onChange={e => setCycleFilter(e.target.value)}
                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none">
                        <option value="">All cycles</option>
                        {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Extension cards */}
            {loading ? (
                <div className="text-center py-12 text-xs text-gray-400">Loading extensions...</div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl py-14 text-center">
                    <div className="text-3xl mb-2">📭</div>
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">No {tab !== 'all' ? tab : ''} extension requests</div>
                    <p className="text-[10px] text-gray-400 mt-1">Requests submitted by employees or managers will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filtered.map(ext => {
                        const days = daysExtended(ext.original_deadline, ext.extended_deadline);
                        const st = STATUS_STYLE[ext.status];
                        const isActioning = actioningId === ext.id;
                        return (
                            <div key={ext.id} className={`bg-white dark:bg-gray-900 border rounded-3xl p-5 transition ${ext.status === 'pending' ? 'border-amber-200 dark:border-amber-900/40' : 'border-gray-100 dark:border-gray-800'}`}>
                                {/* Top row */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-2xl ${avatarColor(ext.employee)} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                                            {ext.employee_initials}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{ext.employee_name}</div>
                                            <div className="text-[9px] text-gray-400 mt-0.5">
                                                {ext.employee_designation || 'No Designation'} • {ext.employee_department || 'No Dept'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${st.badge}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot} inline-block`} />
                                        {st.label}
                                    </span>
                                </div>

                                {/* Cycle */}
                                <div className="text-[10px] font-black text-teal-600 dark:text-teal-400 mb-3">📋 {ext.cycle_name}</div>

                                {/* Timeline */}
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5 text-center">
                                        <div className="text-[8px] font-bold text-gray-400 uppercase mb-1">Original</div>
                                        <div className="text-[10px] font-bold text-gray-700 dark:text-gray-200">{fmt(ext.original_deadline)}</div>
                                    </div>
                                    <div className="bg-teal-500/10 rounded-xl p-2.5 text-center">
                                        <div className="text-[8px] font-bold text-teal-500 uppercase mb-1">Extended To</div>
                                        <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400">{fmt(ext.extended_deadline)}</div>
                                    </div>
                                    <div className={`rounded-xl p-2.5 text-center ${days > 7 ? 'bg-amber-500/10' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                        <div className="text-[8px] font-bold text-gray-400 uppercase mb-1">Extra Days</div>
                                        <div className={`text-[10px] font-bold ${days > 7 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-200'}`}>+{days}d</div>
                                    </div>
                                </div>

                                {/* Reason */}
                                {ext.reason && (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2 mb-3">
                                        <span className="text-[9px] font-black text-gray-400 uppercase">Reason: </span>
                                        <span className="text-[11px] text-gray-600 dark:text-gray-300">{ext.reason}</span>
                                    </div>
                                )}

                                {/* Requester */}
                                {ext.requester_name && ext.requester_name !== ext.employee_name && (
                                    <div className="text-[9px] text-gray-400 mb-3">Requested by: <span className="font-bold text-gray-600 dark:text-gray-300">{ext.requester_name}</span></div>
                                )}

                                {/* Actions */}
                                {ext.status === 'pending' ? (
                                    <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <button onClick={() => handleAction(ext.id, 'approve')} disabled={isActioning}
                                            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white rounded-xl text-[10px] font-bold transition">
                                            {isActioning ? '...' : '✓ Approve'}
                                        </button>
                                        <button onClick={() => handleAction(ext.id, 'reject')} disabled={isActioning}
                                            className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 text-white rounded-xl text-[10px] font-bold transition">
                                            {isActioning ? '...' : '✕ Reject'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-center text-[9px] text-gray-400 italic">
                                        Action completed — {st.label.toLowerCase()} on {fmt(ext.extended_deadline)}
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

export default ReviewExtensions;
