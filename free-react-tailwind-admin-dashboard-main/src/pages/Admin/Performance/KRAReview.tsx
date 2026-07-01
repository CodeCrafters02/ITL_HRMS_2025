import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

interface Employee { id: number; full_name: string; employee_id: string; designation_name: string | null; department_name: string | null; }

interface EvalData { id: number; score: number; remarks: string; evaluated_at: string; }

interface KRAItem {
    id: number;
    employee: number;
    employee_name: string;
    employee_designation: string;
    employee_department: string;
    kra_title: string;
    kra_description: string;
    reviewer: number | null;
    reviewer_name: string | null;
    weightage: number;
    target_description: string;
    created_at: string;
    evaluation: EvalData | null;
}

const ScoreBar = ({ score }: { score: number }) => (
    <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${(score / 5) * 100}%` }} />
        </div>
        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 w-8 text-right">{score.toFixed(1)}</span>
    </div>
);

const KRAReview = () => {
    const dispatch = useDispatch();
    const [myEmpId, setMyEmpId] = useState<number | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
    const [kras, setKras] = useState<KRAItem[]>([]);
    const [loadingKras, setLoadingKras] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
    const [forms, setForms] = useState<Record<number, { score: string; remarks: string }>>({});
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => { dispatch(setPageTitle('KRA Review')); }, [dispatch]);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        (async () => {
            try {
                const [idRes, empRes] = await Promise.all([
                    axios.get(`${API_BASE}/employee/employee-id/`, { headers: auth() }),
                    axios.get(`${API_BASE}/employee/all-employees-list/`, { headers: auth() }),
                ]);
                setMyEmpId(idRes.data?.id ?? null);
                setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.results ?? []);
            } catch (e) { console.error(e); }
        })();
    }, []);

    const loadKRAs = async (empId: number) => {
        setLoadingKras(true);
        setKras([]);
        try {
            const res = await axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${empId}`, { headers: auth() });
            setKras(Array.isArray(res.data) ? res.data : res.data?.results ?? []);
        } catch (e) { console.error(e); }
        finally { setLoadingKras(false); }
    };

    const handleSelectEmp = (emp: Employee) => {
        setSelectedEmp(emp);
        setForms({});
        loadKRAs(emp.id);
    };

    const initForm = (kra: KRAItem) => {
        setForms(p => ({
            ...p,
            [kra.id]: { score: kra.evaluation ? String(kra.evaluation.score) : '', remarks: kra.evaluation?.remarks ?? '' }
        }));
    };

    const cancelForm = (id: number) => setForms(p => { const n = { ...p }; delete n[id]; return n; });

    const handleSubmit = async (kra: KRAItem) => {
        const f = forms[kra.id];
        if (!f?.score || isNaN(parseFloat(f.score))) return showToast('Enter a valid score (0–5).', 'error');
        const score = parseFloat(f.score);
        if (score < 0 || score > 5) return showToast('Score must be between 0 and 5.', 'error');
        setSubmitting(kra.id);
        try {
            await axios.post(`${API_BASE}/employee/kra-evaluations/`, {
                employee_kra: kra.id,
                score,
                remarks: f.remarks || '',
            }, { headers: auth() });
            if (selectedEmp) await loadKRAs(selectedEmp.id);
            cancelForm(kra.id);
            showToast('Evaluation saved successfully.', 'success');
        } catch (e: any) {
            showToast(e?.response?.data?.detail || 'Failed to save.', 'error');
        } finally {
            setSubmitting(null);
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.full_name.toLowerCase().includes(search.toLowerCase()) ||
        e.employee_id?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredKRAs = kras.filter(k => {
        if (filter === 'pending') return !k.evaluation;
        if (filter === 'reviewed') return !!k.evaluation;
        return true;
    });

    const reviewedCount = kras.filter(k => k.evaluation).length;
    const pendingCount = kras.length - reviewedCount;

    const scoreColor = (s: number) => s >= 4 ? 'text-emerald-600' : s >= 2.5 ? 'text-amber-600' : 'text-rose-500';

    return (
        <div className="space-y-5">
            {toast && (
                <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-xs font-bold animate-pulse ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <h1 className="text-xl font-black text-gray-800 dark:text-white">KRA Review Panel</h1>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Select an employee to review their Key Result Areas and submit performance evaluations.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

                {/* Employee List */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Select Employee</h2>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search employee..."
                                className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-gray-50 dark:bg-gray-850/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-indigo-400 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 transition"
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-[600px] divide-y divide-gray-50 dark:divide-gray-800/60">
                        {filteredEmployees.map(emp => {
                            const isSelected = selectedEmp?.id === emp.id;
                            return (
                                <button
                                    key={emp.id}
                                    onClick={() => handleSelectEmp(emp)}
                                    className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-850/30'}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                        {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className={`block text-xs font-bold truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-white'}`}>{emp.full_name}</span>
                                        <span className="block text-[10px] text-gray-400 truncate">{emp.designation_name || emp.employee_id}</span>
                                    </div>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                                </button>
                            );
                        })}
                        {filteredEmployees.length === 0 && (
                            <p className="text-xs text-gray-400 italic text-center py-8">No employees found.</p>
                        )}
                    </div>
                </div>

                {/* KRA Review Panel */}
                <div className="lg:col-span-3 space-y-4">
                    {!selectedEmp ? (
                        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-20 text-center shadow-sm">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <p className="text-sm font-bold text-gray-400">Select an employee to begin KRA review</p>
                        </div>
                    ) : loadingKras ? (
                        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-20 text-center shadow-sm">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : (
                        <>
                            {/* Employee header + stats */}
                            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white font-black text-sm flex items-center justify-center">
                                            {selectedEmp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-gray-800 dark:text-white">{selectedEmp.full_name}</h3>
                                            <span className="text-xs text-gray-400">{selectedEmp.designation_name || '—'} · {selectedEmp.department_name || '—'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        {[
                                            { label: 'Total KRAs', val: kras.length, cls: 'text-gray-800 dark:text-white' },
                                            { label: 'Reviewed', val: reviewedCount, cls: 'text-emerald-600 dark:text-emerald-400' },
                                            { label: 'Pending', val: pendingCount, cls: 'text-amber-600 dark:text-amber-400' },
                                        ].map(s => (
                                            <div key={s.label} className="text-center px-4 py-2 bg-gray-50 dark:bg-gray-850/40 rounded-xl">
                                                <span className={`block text-lg font-black ${s.cls}`}>{s.val}</span>
                                                <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{s.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Filter tabs */}
                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    {(['all', 'pending', 'reviewed'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition ${filter === f ? 'bg-indigo-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                        >
                                            {f === 'all' ? `All (${kras.length})` : f === 'pending' ? `Pending (${pendingCount})` : `Reviewed (${reviewedCount})`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* KRA Cards */}
                            {filteredKRAs.length === 0 ? (
                                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
                                    <p className="text-xs font-bold text-gray-400">No KRAs in this filter.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredKRAs.map((kra, idx) => {
                                        const ev = kra.evaluation;
                                        const f = forms[kra.id];
                                        const isEditing = f !== undefined;
                                        const colors = ['#14b8a6','#6366f1','#8b5cf6','#f59e0b','#f43f5e','#06b6d4'];
                                        const color = colors[idx % colors.length];
                                        const circumference = 2 * Math.PI * 16;
                                        const dash = (kra.weightage / 100) * circumference;

                                        return (
                                            <div key={kra.id} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                                <div className="h-1" style={{ background: color }} />
                                                <div className="p-5">
                                                    <div className="flex items-start gap-4">
                                                        {/* Weight ring */}
                                                        <div className="shrink-0 relative w-12 h-12">
                                                            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                                                                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-gray-100 dark:text-gray-800" />
                                                                <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3.5"
                                                                    stroke={color}
                                                                    strokeDasharray={`${dash} ${circumference - dash}`}
                                                                    strokeLinecap="round"
                                                                />
                                                            </svg>
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <span className="text-[10px] font-black" style={{ color }}>{kra.weightage}%</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <h4 className="text-sm font-black text-gray-800 dark:text-white">{kra.kra_title}</h4>
                                                                    {kra.kra_description && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{kra.kra_description}</p>}
                                                                </div>
                                                                <div className="shrink-0 flex items-center gap-2">
                                                                    {ev ? (
                                                                        <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Reviewed</span>
                                                                    ) : (
                                                                        <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {kra.target_description && (
                                                                <div className="mt-2 bg-gray-50 dark:bg-gray-850/40 rounded-xl px-3 py-2">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Target</span>
                                                                    <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 mt-0.5">{kra.target_description}</p>
                                                                </div>
                                                            )}

                                                            {kra.reviewer_name && (
                                                                <div className="mt-2 flex items-center gap-1.5">
                                                                    <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                                                    <span className="text-[10px] text-blue-500 font-bold">Assigned Reviewer: {kra.reviewer_name}</span>
                                                                    {kra.reviewer === myEmpId && (
                                                                        <span className="text-[9px] bg-blue-500/10 text-blue-600 font-black px-1.5 py-0.5 rounded-full">You</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Evaluation section */}
                                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                                        {ev && !isEditing ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3 flex-1">
                                                                        <span className={`text-2xl font-black ${scoreColor(ev.score)}`}>{ev.score.toFixed(1)}</span>
                                                                        <div className="flex-1">
                                                                            <ScoreBar score={ev.score} />
                                                                            <span className="text-[9px] text-gray-400 font-semibold mt-0.5 block">Evaluated on {ev.evaluated_at}</span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => initForm(kra)}
                                                                        className="ml-4 px-3.5 py-1.5 rounded-xl text-[10px] font-black border border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition"
                                                                    >Edit</button>
                                                                </div>
                                                                {ev.remarks && (
                                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-850/30 rounded-xl px-3 py-2 leading-relaxed">"{ev.remarks}"</p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                <div className="grid grid-cols-4 gap-3">
                                                                    <div>
                                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Score <span className="text-indigo-400">(0–5)</span></label>
                                                                        <input
                                                                            type="number" min={0} max={5} step={0.1}
                                                                            value={f?.score ?? ''}
                                                                            onChange={e => setForms(p => ({ ...p, [kra.id]: { ...p[kra.id], score: e.target.value } }))}
                                                                            onFocus={() => !f && initForm({ ...kra, evaluation: null })}
                                                                            placeholder="e.g. 4.0"
                                                                            className="w-full text-sm font-black bg-gray-50 dark:bg-gray-850/50 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 transition text-gray-800 dark:text-white"
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-3">
                                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Remarks <span className="font-normal normal-case text-gray-300">(optional)</span></label>
                                                                        <input
                                                                            type="text"
                                                                            value={f?.remarks ?? ''}
                                                                            onChange={e => setForms(p => ({ ...p, [kra.id]: { ...p[kra.id], remarks: e.target.value } }))}
                                                                            onFocus={() => !f && initForm({ ...kra, evaluation: null })}
                                                                            placeholder="Add performance remarks..."
                                                                            className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-850/50 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 transition text-gray-700 dark:text-gray-300"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {/* Quick score buttons */}
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 shrink-0">Quick:</span>
                                                                    {[1,2,3,4,5].map(s => (
                                                                        <button
                                                                            key={s}
                                                                            onClick={() => setForms(p => ({ ...p, [kra.id]: { ...(p[kra.id] ?? { remarks: '' }), score: String(s) } }))}
                                                                            className={`w-8 h-8 rounded-lg text-xs font-black transition ${f?.score === String(s) ? 'bg-indigo-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-950/30 hover:text-indigo-600'}`}
                                                                        >{s}</button>
                                                                    ))}
                                                                    <div className="ml-auto flex gap-2">
                                                                        {isEditing && (
                                                                            <button onClick={() => cancelForm(kra.id)} className="px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600 transition">Cancel</button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleSubmit(kra)}
                                                                            disabled={submitting === kra.id}
                                                                            className="px-5 py-1.5 rounded-xl text-[11px] font-black bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm disabled:opacity-60 transition flex items-center gap-2"
                                                                        >
                                                                            {submitting === kra.id && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                                                            {ev ? 'Update' : 'Submit'} Evaluation
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KRAReview;
