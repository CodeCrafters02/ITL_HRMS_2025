import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconSave from '../../components/Icon/IconSave';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPlus from '../../components/Icon/IconPlus';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const GROSS_API = `${API_BASE_URL}/app/gross-components/`;
const DEDUCTION_API = `${API_BASE_URL}/app/deduction-components/`;

type GrossComponent = {
    id?: number;
    name: string;
    calc_type: 'percentage' | 'fixed';
    value: string | number;
    is_active: boolean;
    order: number;
    _isNew?: boolean;
};

type DeductionComponent = {
    id?: number;
    name: string;
    calc_type: 'percentage' | 'fixed';
    value: string | number;
    deduct_from: 'basic' | 'gross';
    has_threshold: boolean;
    threshold_on: 'basic' | 'gross';
    threshold_amount: string | number;
    is_active: boolean;
    order: number;
    _isNew?: boolean;
};

const SalaryStructure = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState(0);
    const [grossComponents, setGrossComponents] = useState<GrossComponent[]>([]);
    const [deductionComponents, setDeductionComponents] = useState<DeductionComponent[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<number | string | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Salary Structure'));
        fetchAll();
    }, [dispatch]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) h['Authorization'] = `Bearer ${token}`;
        return h;
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [gRes, dRes] = await Promise.all([
                fetch(`${GROSS_API}?page_size=1000`, { headers: getHeaders() }),
                fetch(`${DEDUCTION_API}?page_size=1000`, { headers: getHeaders() }),
            ]);
            if (gRes.ok) {
                const gData = await gRes.json();
                setGrossComponents(gData.results || gData);
            }
            if (dRes.ok) {
                const dData = await dRes.json();
                setDeductionComponents(dData.results || dData);
            }
        } catch (e) {
            console.error('Fetch error', e);
        } finally {
            setLoading(false);
        }
    };

    // ── Gross helpers ──
    const addGrossComponent = () => {
        setGrossComponents((prev) => [
            ...prev,
            { name: '', calc_type: 'fixed', value: '', is_active: true, order: prev.length, _isNew: true },
        ]);
    };

    const updateGross = (idx: number, field: string, val: any) => {
        setGrossComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
    };

    const saveGross = async (idx: number) => {
        const comp = grossComponents[idx];
        if (!comp.name.trim()) {
            Swal.fire({ title: 'Error', text: 'Component name is required.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            return;
        }
        setSaving(`g-${idx}`);
        try {
            const isUpdate = !!comp.id;
            const url = isUpdate ? `${GROSS_API}${comp.id}/` : GROSS_API;
            const method = isUpdate ? 'PATCH' : 'POST';
            const body = { name: comp.name, calc_type: comp.calc_type, value: comp.value || 0, is_active: comp.is_active, order: comp.order };
            const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
            if (res.ok) {
                const saved = await res.json();
                setGrossComponents((prev) => prev.map((c, i) => (i === idx ? { ...saved, _isNew: false } : c)));
                Swal.fire({ title: 'Saved!', icon: 'success', timer: 1200, showConfirmButton: false, customClass: { popup: 'sweet-alerts' } });
            } else {
                Swal.fire({ title: 'Error', text: 'Failed to save.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error', text: 'Network error.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        } finally {
            setSaving(null);
        }
    };

    const deleteGross = async (idx: number) => {
        const comp = grossComponents[idx];
        if (comp._isNew) {
            setGrossComponents((prev) => prev.filter((_, i) => i !== idx));
            return;
        }
        const confirm = await Swal.fire({ title: 'Delete?', text: `Remove "${comp.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', customClass: { popup: 'sweet-alerts' } });
        if (!confirm.isConfirmed) return;
        try {
            await fetch(`${GROSS_API}${comp.id}/`, { method: 'DELETE', headers: getHeaders() });
            setGrossComponents((prev) => prev.filter((_, i) => i !== idx));
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1200, showConfirmButton: false, customClass: { popup: 'sweet-alerts' } });
        } catch {
            Swal.fire({ title: 'Error', text: 'Failed to delete.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    // ── Deduction helpers ──
    const addDeduction = () => {
        setDeductionComponents((prev) => [
            ...prev,
            { name: '', calc_type: 'fixed', value: '', deduct_from: 'gross', has_threshold: false, threshold_on: 'gross', threshold_amount: '', is_active: true, order: prev.length, _isNew: true },
        ]);
    };

    const updateDeduction = (idx: number, field: string, val: any) => {
        setDeductionComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
    };

    const saveDeduction = async (idx: number) => {
        const comp = deductionComponents[idx];
        if (!comp.name.trim()) {
            Swal.fire({ title: 'Error', text: 'Deduction name is required.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            return;
        }
        setSaving(`d-${idx}`);
        try {
            const isUpdate = !!comp.id;
            const url = isUpdate ? `${DEDUCTION_API}${comp.id}/` : DEDUCTION_API;
            const method = isUpdate ? 'PATCH' : 'POST';
            const body = {
                name: comp.name, calc_type: comp.calc_type, value: comp.value || 0,
                deduct_from: comp.deduct_from, has_threshold: comp.has_threshold,
                threshold_on: comp.threshold_on, threshold_amount: comp.threshold_amount || 0,
                is_active: comp.is_active, order: comp.order,
            };
            const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
            if (res.ok) {
                const saved = await res.json();
                setDeductionComponents((prev) => prev.map((c, i) => (i === idx ? { ...saved, _isNew: false } : c)));
                Swal.fire({ title: 'Saved!', icon: 'success', timer: 1200, showConfirmButton: false, customClass: { popup: 'sweet-alerts' } });
            } else {
                Swal.fire({ title: 'Error', text: 'Failed to save.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error', text: 'Network error.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        } finally {
            setSaving(null);
        }
    };

    const deleteDeduction = async (idx: number) => {
        const comp = deductionComponents[idx];
        if (comp._isNew) {
            setDeductionComponents((prev) => prev.filter((_, i) => i !== idx));
            return;
        }
        const confirm = await Swal.fire({ title: 'Delete?', text: `Remove "${comp.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', customClass: { popup: 'sweet-alerts' } });
        if (!confirm.isConfirmed) return;
        try {
            await fetch(`${DEDUCTION_API}${comp.id}/`, { method: 'DELETE', headers: getHeaders() });
            setDeductionComponents((prev) => prev.filter((_, i) => i !== idx));
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1200, showConfirmButton: false, customClass: { popup: 'sweet-alerts' } });
        } catch {
            Swal.fire({ title: 'Error', text: 'Failed to delete.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const tabs = ['Gross Salary', 'Salary Deduction', 'Other Deductions & Adjustments'];

    return (
        <div>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1e3a5f] via-[#2563eb] to-[#14b8a6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Salary Structure</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Configure gross salary components and deduction rules for all employees.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Tabs */}
            <div className="panel mb-6 p-0 overflow-hidden">
                <div className="flex border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
                    {tabs.map((tab, i) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(i)}
                            className={`flex-1 py-3.5 px-4 text-center font-semibold text-sm transition-all duration-200 border-b-2 ${
                                activeTab === i
                                    ? 'border-primary text-primary bg-primary/5'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-[#1b2e4b]'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-10 h-10"></span>
                            <span className="text-gray-400 font-medium">Loading...</span>
                        </div>
                    ) : (
                        <>
                            {/* ═══ TAB 0: GROSS SALARY ═══ */}
                            {activeTab === 0 && (
                                <div className="space-y-4">
                                    {/* Fixed rows: Basic Salary, Pay Based on Days, Bonus */}
                                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-[#1a2941] dark:to-[#1b2e4b] border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-4">
                                        <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-3 text-sm uppercase tracking-wide">Fixed Components (Always Applied)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="flex items-center gap-3 bg-white dark:bg-[#0e1726] rounded-lg p-3 shadow-sm border border-emerald-100 dark:border-emerald-900/20">
                                                <div className="w-2 h-10 bg-emerald-500 rounded-full"></div>
                                                <div>
                                                    <p className="font-bold text-gray-800 dark:text-white">Basic Salary</p>
                                                    <p className="text-xs text-gray-500">Auto-fetched from designation config</p>
                                                </div>
                                                <span className="ml-auto bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">AUTO</span>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white dark:bg-[#0e1726] rounded-lg p-3 shadow-sm border border-emerald-100 dark:border-emerald-900/20">
                                                <div className="w-2 h-10 bg-blue-500 rounded-full"></div>
                                                <div>
                                                    <p className="font-bold text-gray-800 dark:text-white">Pay Based on Days</p>
                                                    <p className="text-xs text-gray-500">Calculated from employee attendance</p>
                                                </div>
                                                <span className="ml-auto bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold">AUTO</span>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white dark:bg-[#0e1726] rounded-lg p-3 shadow-sm border border-emerald-100 dark:border-emerald-900/20">
                                                <div className="w-2 h-10 bg-amber-500 rounded-full"></div>
                                                <div>
                                                    <p className="font-bold text-gray-800 dark:text-white">Bonus</p>
                                                    <p className="text-xs text-gray-500">Calculated based on performance</p>
                                                </div>
                                                <span className="ml-auto bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold">AUTO</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dynamic gross components */}
                                    <div>
                                        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 text-sm uppercase tracking-wide">Dynamic Components</h3>
                                        {grossComponents.length === 0 && (
                                            <p className="text-gray-400 italic text-sm mb-3">No dynamic gross components added yet.</p>
                                        )}
                                        <div className="space-y-3">
                                            {grossComponents.map((comp, idx) => (
                                                <div key={comp.id || `new-${idx}`} className="bg-white dark:bg-[#0e1726] border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                                        <div className="md:col-span-4">
                                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Component Name</label>
                                                            <input className="form-input" placeholder="e.g., HRA, Travel Allowance" value={comp.name} onChange={(e) => updateGross(idx, 'name', e.target.value)} />
                                                        </div>
                                                        <div className="md:col-span-3">
                                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
                                                            <select className="form-select" value={comp.calc_type} onChange={(e) => updateGross(idx, 'calc_type', e.target.value)}>
                                                                <option value="percentage">% of Basic</option>
                                                                <option value="fixed">Fixed Amount (₹)</option>
                                                            </select>
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Value {comp.calc_type === 'percentage' ? '(%)' : '(₹)'}</label>
                                                            <input type="number" className="form-input" placeholder="0" value={comp.value} onChange={(e) => updateGross(idx, 'value', e.target.value)} />
                                                        </div>
                                                        <div className="md:col-span-1 flex items-center justify-center">
                                                            <label className="w-12 h-6 relative cursor-pointer">
                                                                <input type="checkbox" className="peer custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer" checked={comp.is_active} onChange={(e) => updateGross(idx, 'is_active', e.target.checked)} />
                                                                <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white dark:before:bg-white-dark before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                                            </label>
                                                        </div>
                                                        <div className="md:col-span-2 flex gap-2 justify-end">
                                                            <button className={`btn btn-primary btn-sm gap-1 ${saving === `g-${idx}` ? 'opacity-60 pointer-events-none' : ''}`} onClick={() => saveGross(idx)}>
                                                                {saving === `g-${idx}` ? <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-3.5 h-3.5"></span> : <IconSave className="w-4 h-4" />}
                                                                Save
                                                            </button>
                                                            <button className="btn btn-danger btn-sm gap-1" onClick={() => deleteGross(idx)}>
                                                                <IconTrashLines className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="btn btn-outline-primary mt-4 gap-2" onClick={addGrossComponent}>
                                            <IconPlus className="w-4 h-4" />
                                            Add Gross Component
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ═══ TAB 1: SALARY DEDUCTION ═══ */}
                            {activeTab === 1 && (
                                <div className="space-y-4">
                                    {deductionComponents.length === 0 && (
                                        <p className="text-gray-400 italic text-sm">No deduction components added yet.</p>
                                    )}
                                    <div className="space-y-3">
                                        {deductionComponents.map((comp, idx) => (
                                            <div key={comp.id || `new-${idx}`} className="bg-white dark:bg-[#0e1726] border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                                    <div className="md:col-span-3">
                                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Deduction Name</label>
                                                        <input className="form-input" placeholder="e.g., PF, ESI, Prof. Tax" value={comp.name} onChange={(e) => updateDeduction(idx, 'name', e.target.value)} />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
                                                        <select className="form-select" value={comp.calc_type} onChange={(e) => updateDeduction(idx, 'calc_type', e.target.value)}>
                                                            <option value="percentage">Percentage (%)</option>
                                                            <option value="fixed">Fixed Amount (₹)</option>
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Value {comp.calc_type === 'percentage' ? '(%)' : '(₹)'}</label>
                                                        <input type="number" className="form-input" placeholder="0" value={comp.value} onChange={(e) => updateDeduction(idx, 'value', e.target.value)} />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Deduct From</label>
                                                        <select className="form-select" value={comp.deduct_from} onChange={(e) => updateDeduction(idx, 'deduct_from', e.target.value)}>
                                                            <option value="basic">Basic Salary</option>
                                                            <option value="gross">Gross Salary</option>
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-1 flex items-center justify-center">
                                                        <label className="w-12 h-6 relative cursor-pointer">
                                                            <input type="checkbox" className="peer custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer" checked={comp.is_active} onChange={(e) => updateDeduction(idx, 'is_active', e.target.checked)} />
                                                            <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white dark:before:bg-white-dark before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                                        </label>
                                                    </div>
                                                    <div className="md:col-span-2 flex gap-2 justify-end">
                                                        <button className={`btn btn-primary btn-sm gap-1 ${saving === `d-${idx}` ? 'opacity-60 pointer-events-none' : ''}`} onClick={() => saveDeduction(idx)}>
                                                            {saving === `d-${idx}` ? <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-3.5 h-3.5"></span> : <IconSave className="w-4 h-4" />}
                                                            Save
                                                        </button>
                                                        <button className="btn btn-danger btn-sm gap-1" onClick={() => deleteDeduction(idx)}>
                                                            <IconTrashLines className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Threshold section */}
                                                <div className="mt-3 pt-3 border-t border-dashed border-[#e0e6ed] dark:border-[#253b5c]">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" className="form-checkbox text-primary rounded" checked={comp.has_threshold} onChange={(e) => updateDeduction(idx, 'has_threshold', e.target.checked)} />
                                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Apply only if employee's</span>
                                                        </label>
                                                        {comp.has_threshold && (
                                                            <>
                                                                <select className="form-select form-select-sm w-auto text-xs" value={comp.threshold_on} onChange={(e) => updateDeduction(idx, 'threshold_on', e.target.value)}>
                                                                    <option value="basic">Basic Salary</option>
                                                                    <option value="gross">Gross Salary</option>
                                                                </select>
                                                                <span className="text-xs font-semibold text-gray-500">is ≥ ₹</span>
                                                                <input type="number" className="form-input form-input-sm w-32 text-xs" placeholder="0" value={comp.threshold_amount} onChange={(e) => updateDeduction(idx, 'threshold_amount', e.target.value)} />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="btn btn-outline-primary mt-4 gap-2" onClick={addDeduction}>
                                        <IconPlus className="w-4 h-4" />
                                        Add Deduction Component
                                    </button>
                                </div>
                            )}

                            {/* ═══ TAB 2: OTHER DEDUCTIONS & ADJUSTMENTS ═══ */}
                            {activeTab === 2 && (
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-[#2a1b1b] dark:to-[#1b1b1b] border border-orange-200 dark:border-orange-800/30 rounded-lg p-4">
                                        <h3 className="font-bold text-orange-700 dark:text-orange-400 mb-3 text-sm uppercase tracking-wide">Automatic Adjustments & Deductions</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {/* Asset Recovery */}
                                            <div className="flex items-center gap-3 bg-white dark:bg-[#0e1726] rounded-lg p-3 shadow-sm border border-orange-100 dark:border-orange-900/20">
                                                <div className="w-2 h-10 bg-orange-500 rounded-full"></div>
                                                <div>
                                                    <p className="font-bold text-gray-800 dark:text-white">Asset Recovery</p>
                                                    <p className="text-xs text-gray-500">Auto-fetched based on assigned assets</p>
                                                </div>
                                                <span className="ml-auto bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold">AUTO</span>
                                            </div>

                                            {/* Loan Amount Deduction */}
                                            <div className="flex items-center gap-3 bg-white dark:bg-[#0e1726] rounded-lg p-3 shadow-sm border border-orange-100 dark:border-orange-900/20">
                                                <div className="w-2 h-10 bg-red-500 rounded-full"></div>
                                                <div>
                                                    <p className="font-bold text-gray-800 dark:text-white">Loan Amount Deduction</p>
                                                    <p className="text-xs text-gray-500">Based on active employee loans (if applicable)</p>
                                                </div>
                                                <span className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold">AUTO</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
                                        <p className="text-gray-400 max-w-sm text-sm italic">Additional manual adjustments can be added here in future updates.</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalaryStructure;
