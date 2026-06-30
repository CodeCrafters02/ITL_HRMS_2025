import { useState, useEffect, useMemo } from 'react';
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

interface KRAMaster {
    id: number;
    title: string;
    description: string;
    departments?: number[];
    department_names?: string[];
}

interface KPIMaster {
    id: number;
    name: string;
    kra_master: number | null;
    target_value: string;
    measurement_unit: string;
}

interface Department {
    id: number;
    department_name: string;
}

interface EmployeeKRA {
    id: number;
    employee: number;
    kra_master: number;
    weightage: number;
    created_at: string;
}

type RowResult = { empId: number; name: string; status: 'ok' | 'skip' | 'fail'; msg?: string };

const BulkMap = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [masterKras, setMasterKras] = useState<KRAMaster[]>([]);
    const [kpis, setKpis] = useState<KPIMaster[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [assignments, setAssignments] = useState<EmployeeKRA[]>([]);

    const [selectedKraId, setSelectedKraId] = useState<number | null>(null);
    const [kraSearch, setKraSearch] = useState('');

    const [empSearch, setEmpSearch] = useState('');
    const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([]);

    const [weightage, setWeightage] = useState('');
    const [targetDescription, setTargetDescription] = useState('');
    const [reviewerId, setReviewerId] = useState('');
    const [reviewerSearch, setReviewerSearch] = useState('');
    const [showReviewerList, setShowReviewerList] = useState(false);

    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [results, setResults] = useState<RowResult[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => (Array.isArray(d) ? d : d?.results ?? []);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [empRes, kraRes, kpiRes, deptRes, ekraRes] = await Promise.all([
                    axios.get(`${API_BASE}/employee/all-employees-list/`, { headers: getHeaders() }),
                    axios.get(`${API_BASE}/employee/kra-master/`, { headers: getHeaders() }),
                    axios.get(`${API_BASE}/employee/kpi-master/`, { headers: getHeaders() }),
                    axios.get(`${API_BASE}/app/departments/`, { headers: getHeaders() }),
                    axios.get(`${API_BASE}/employee/employee-kra/`, { headers: getHeaders() }),
                ]);
                setEmployees(asArray(empRes.data));
                setMasterKras(asArray(kraRes.data));
                setKpis(asArray(kpiRes.data));
                setDepartments(asArray(deptRes.data));
                setAssignments(asArray(ekraRes.data));
            } catch {
                setErrorMsg('Failed to load directories.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const selectedKra = masterKras.find(k => k.id === selectedKraId) || null;
    const deptName = (id: number) => departments.find(d => d.id === id)?.department_name || `Dept ${id}`;

    // KRA is global if it has no department scope
    const kraDepts = (k: KRAMaster) => k.departments || [];
    const isGlobal = (k: KRAMaster) => kraDepts(k).length === 0;

    // Employees allowed for selected KRA: in one of its departments (or all if global)
    const eligibleEmployees = useMemo(() => {
        if (!selectedKra) return [];
        if (isGlobal(selectedKra)) return employees;
        const set = new Set(kraDepts(selectedKra));
        return employees.filter(e => e.department != null && set.has(e.department));
    }, [selectedKra, employees]);

    const filteredEligible = useMemo(() => {
        const q = empSearch.toLowerCase();
        return eligibleEmployees.filter(
            e =>
                e.full_name.toLowerCase().includes(q) ||
                e.employee_id.toLowerCase().includes(q) ||
                (e.designation_name || '').toLowerCase().includes(q) ||
                (e.department_name || '').toLowerCase().includes(q)
        );
    }, [eligibleEmployees, empSearch]);

    const selectableIds = filteredEligible.map(e => e.id);
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedEmpIds.includes(id));

    const filteredKras = masterKras.filter(k => k.title.toLowerCase().includes(kraSearch.toLowerCase()));
    const selectedKraKpis = kpis.filter(k => k.kra_master === selectedKraId);

    const pickKra = (id: number) => {
        setSelectedKraId(id);
        setSelectedEmpIds([]);
        setResults([]);
        setErrorMsg('');
        setSuccessMsg('');
    };

    const toggleEmp = (id: number) =>
        setSelectedEmpIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

    const toggleAll = () =>
        setSelectedEmpIds(allSelected ? [] : Array.from(new Set([...selectedEmpIds, ...selectableIds])));

    const handleBulkAssign = async () => {
        setErrorMsg('');
        setSuccessMsg('');
        setResults([]);
        if (!selectedKraId) return setErrorMsg('Select a KRA first.');
        if (selectedEmpIds.length === 0) return setErrorMsg('Select at least one employee.');
        if (!reviewerId) return setErrorMsg('Select a reviewer (master) for these assignments.');
        const wt = parseInt(weightage || '0');

        setAssigning(true);
        const out: RowResult[] = [];
        const created: EmployeeKRA[] = [];
        for (const empId of selectedEmpIds) {
            const emp = employees.find(e => e.id === empId);
            const name = emp?.full_name || `#${empId}`;
            try {
                const res = await axios.post(
                    `${API_BASE}/employee/employee-kra/`,
                    {
                        employee: empId,
                        kra_master: selectedKraId,
                        reviewer: parseInt(reviewerId),
                        weightage: isNaN(wt) ? 0 : wt,
                        target_description: targetDescription,
                    },
                    { headers: getHeaders() }
                );
                created.push(res.data);
                out.push({ empId, name, status: 'ok' });
            } catch (err: any) {
                const msg =
                    err.response?.data?.non_field_errors?.[0] ||
                    err.response?.data?.[0] ||
                    err.response?.data?.detail ||
                    'Failed';
                out.push({ empId, name, status: 'fail', msg });
            }
        }
        setResults(out);

        // Optimistically mark just-mapped employees so they grey out immediately
        if (created.length) setAssignments(prev => [...prev, ...created]);
        setSelectedEmpIds([]);

        const ok = out.filter(r => r.status === 'ok').length;
        const failed = out.filter(r => r.status === 'fail').length;
        if (ok) setSuccessMsg(`Mapped to ${ok} employee(s).${failed ? ` ${failed} failed.` : ''}`);
        else if (failed) setErrorMsg(`${failed} assignment(s) failed.`);

        // Re-enable immediately; reconcile with server in the background (non-blocking)
        setAssigning(false);
        axios
            .get(`${API_BASE}/employee/employee-kra/`, { headers: getHeaders() })
            .then(res => { const fresh = asArray(res.data); if (fresh.length) setAssignments(fresh); })
            .catch(() => { /* keep optimistic state */ });
    };

    const statusChip = (s: RowResult['status']) =>
        s === 'ok'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : s === 'skip'
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400';

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Bulk Map KRAs</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Pick a KRA, then map it to many eligible department employees at once with a shared reviewer & weightage.
                </p>
            </div>

            {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-4 rounded-xl text-xs font-bold animate__animated animate__shakeX">
                    ⚠️ {errorMsg}
                </div>
            )}
            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl text-xs font-bold animate__animated animate__fadeIn">
                    ✓ {successMsg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Left: KRA picker */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex flex-col h-[640px]">
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Search KRA..."
                            value={kraSearch}
                            onChange={e => setKraSearch(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-4 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                        />
                        <IconSearch className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>

                    <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-2 select-none block">
                        KRA Library ({filteredKras.length})
                    </span>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {loading ? (
                            <div className="text-center py-10 text-xs text-gray-400">Loading...</div>
                        ) : (
                            filteredKras.map(k => {
                                const sel = selectedKraId === k.id;
                                const kpiCount = kpis.filter(x => x.kra_master === k.id).length;
                                return (
                                    <div
                                        key={k.id}
                                        onClick={() => pickKra(k.id)}
                                        className={`p-3 rounded-xl border cursor-pointer transition duration-200 select-none ${
                                            sel
                                                ? 'bg-teal-500/10 border-teal-500'
                                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-xs font-bold text-gray-800 dark:text-white leading-tight">{k.title}</span>
                                            <span className="text-[8px] font-black text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full shrink-0">
                                                {kpiCount} KPI
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {isGlobal(k) ? (
                                                <span className="text-[8px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full">All depts</span>
                                            ) : (
                                                kraDepts(k).map(id => (
                                                    <span key={id} className="text-[8px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                        {deptName(id)}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {!loading && filteredKras.length === 0 && (
                            <div className="text-center py-10 text-xs text-gray-400 italic">No KRAs found.</div>
                        )}
                    </div>
                </div>

                {/* Right: employee multi-select + config */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-6 flex flex-col h-[640px]">
                    {!selectedKra ? (
                        <div className="bg-gray-50 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-3xl text-center flex flex-col items-center justify-center h-full">
                            <IconTrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400">Bulk KRA Mapping</h4>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-xs mt-1.5 leading-relaxed">
                                Select a KRA from the library to load eligible employees and map it in bulk.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Selected KRA banner */}
                            <div className="border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
                                <div className="flex justify-between items-start gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{selectedKra.title}</h3>
                                        {selectedKra.description && (
                                            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{selectedKra.description}</p>
                                        )}
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {isGlobal(selectedKra) ? (
                                                <span className="text-[8px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full">All departments</span>
                                            ) : (
                                                kraDepts(selectedKra).map(id => (
                                                    <span key={id} className="text-[8px] font-bold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full">{deptName(id)}</span>
                                                ))
                                            )}
                                            {selectedKraKpis.map(kpi => (
                                                <span key={kpi.id} className="text-[8px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">{kpi.name}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full shrink-0 whitespace-nowrap">
                                        {selectedEmpIds.length} selected
                                    </span>
                                </div>
                            </div>

                            {/* Shared config */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                {/* Reviewer */}
                                <div className="md:col-span-2 relative">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Reviewer / Master</label>
                                    <input
                                        type="text"
                                        value={reviewerSearch}
                                        placeholder="Search reviewer..."
                                        onChange={e => { setReviewerSearch(e.target.value); setReviewerId(''); setShowReviewerList(true); }}
                                        onFocus={() => setShowReviewerList(true)}
                                        onBlur={() => setTimeout(() => setShowReviewerList(false), 150)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                    />
                                    {showReviewerList && (
                                        <div className="absolute z-30 mt-1 w-full max-h-44 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                                            {employees
                                                .filter(e => e.full_name.toLowerCase().includes(reviewerSearch.toLowerCase()) || (e.designation_name || '').toLowerCase().includes(reviewerSearch.toLowerCase()))
                                                .slice(0, 50)
                                                .map(e => (
                                                    <div
                                                        key={e.id}
                                                        onMouseDown={() => { setReviewerId(String(e.id)); setReviewerSearch(`${e.full_name} (${e.designation_name || 'No Desig'})`); setShowReviewerList(false); }}
                                                        className="px-3 py-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-500/10 cursor-pointer"
                                                    >
                                                        {e.full_name} <span className="text-gray-400">({e.designation_name || 'No Desig'})</span>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                                {/* Weightage */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Weight %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="e.g. 20"
                                        value={weightage}
                                        onChange={e => setWeightage(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Target description (optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Shared target / metrics applied to all selected employees..."
                                    value={targetDescription}
                                    onChange={e => setTargetDescription(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none resize-none"
                                />
                            </div>

                            {/* Employee toolbar */}
                            <div className="flex items-center gap-2 mb-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Search eligible employees..."
                                        value={empSearch}
                                        onChange={e => setEmpSearch(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-4 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                    />
                                    <IconSearch className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                </div>
                                <button
                                    onClick={toggleAll}
                                    disabled={selectableIds.length === 0}
                                    className="px-3 py-2 rounded-xl text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 whitespace-nowrap"
                                >
                                    {allSelected ? 'Clear all' : 'Select all'}
                                </button>
                            </div>

                            {/* Eligible employee list */}
                            <div className="flex-1 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800 min-h-0">
                                {filteredEligible.length === 0 && (
                                    <div className="text-center py-8 text-[11px] text-gray-400 italic">No eligible employees for this KRA's departments.</div>
                                )}
                                {filteredEligible.map(e => {
                                    const timesAssigned = assignments.filter(a => a.kra_master === selectedKraId && a.employee === e.id).length;
                                    const checked = selectedEmpIds.includes(e.id);
                                    return (
                                        <label
                                            key={e.id}
                                            className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30"
                                        >
                                            <input
                                                type="checkbox"
                                                className="accent-teal-600"
                                                checked={checked}
                                                onChange={() => toggleEmp(e.id)}
                                            />
                                            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                {e.initials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="block text-xs font-bold text-gray-800 dark:text-white leading-tight truncate">{e.full_name}</span>
                                                <span className="block text-[9px] text-gray-400 mt-0.5 truncate">
                                                    {e.designation_name || 'Designation Not Set'} • {e.department_name || 'No Dept'}
                                                </span>
                                            </div>
                                            {timesAssigned > 0 && (
                                                <span className="text-[8px] font-black text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full shrink-0">×{timesAssigned}</span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>

                            {/* Action bar */}
                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] font-bold text-gray-400">
                                    {filteredEligible.length} eligible
                                </span>
                                <button
                                    onClick={handleBulkAssign}
                                    disabled={assigning || selectedEmpIds.length === 0 || !reviewerId}
                                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/10 transition duration-300"
                                >
                                    {assigning ? 'Mapping...' : `Map to ${selectedEmpIds.length || ''} Employee(s)`}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Results summary */}
            {results.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5 animate__animated animate__fadeIn">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Mapping Results ({results.length})</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-3">
                        {results.map(r => (
                            <div key={r.empId} className={`flex items-center justify-between rounded-xl px-3 py-2 ${statusChip(r.status)}`}>
                                <span className="text-[11px] font-bold truncate">{r.name}</span>
                                <span className="text-[9px] font-black uppercase shrink-0 ml-2">
                                    {r.status === 'ok' ? '✓ Mapped' : r.status === 'skip' ? 'Skipped' : r.msg || 'Failed'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkMap;
