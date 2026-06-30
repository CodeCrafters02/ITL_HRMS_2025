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

interface KRAMaster {
    id: number;
    title: string;
    description: string;
    departments?: number[];
    department_names?: string[];
}

interface Department {
    id: number;
    department_name: string;
}

interface KPIMaster {
    id: number;
    name: string;
    description: string;
    kra_master: number | null;
    kra_title?: string;
    departments: number[];
    department_names: string[];
    measurement_unit: string;
    target_value: string;
}

interface EmployeeKRA {
    id: number;
    employee: number;
    kra_master: number;
    kra_title: string;
    kra_description: string;
    reviewer: number | null;
    reviewer_name: string | null;
    weightage: number;
    target_description: string;
    created_at: string;
}

const KRAsAssign = () => {
    // Directories
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [masterKras, setMasterKras] = useState<KRAMaster[]>([]);
    const [employeeKras, setEmployeeKras] = useState<EmployeeKRA[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [kpis, setKpis] = useState<KPIMaster[]>([]);

    const [savingKra, setSavingKra] = useState(false);

    // Inline KRA creation (with nested KPIs)
    const [showCreateKra, setShowCreateKra] = useState(false);
    const [newKraTitle, setNewKraTitle] = useState('');
    const [newKraDesc, setNewKraDesc] = useState('');
    const [newKraDepts, setNewKraDepts] = useState<number[]>([]);
    const [newKraKpis, setNewKraKpis] = useState<{ name: string; target: string; unit: string }[]>([
        { name: '', target: '', unit: '' },
    ]);

    // Add KPI(s) to an EXISTING KRA
    const [showAddKpi, setShowAddKpi] = useState(false);
    const [addKpiKraId, setAddKpiKraId] = useState('');
    const [addKpiRows, setAddKpiRows] = useState<{ name: string; target: string; unit: string }[]>([
        { name: '', target: '', unit: '' },
    ]);

    // Reviewer ("master") + which department KRAs are selected when assigning to a person
    const [assignReviewerId, setAssignReviewerId] = useState('');
    const [reviewerSearch, setReviewerSearch] = useState('');
    const [showReviewerList, setShowReviewerList] = useState(false);
    const [assignChecked, setAssignChecked] = useState<number[]>([]);
    const [assignWeights, setAssignWeights] = useState<Record<number, string>>({});

    // UI Loading & Search
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [loadingKras, setLoadingKras] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Page tab: assign employees vs manage KRA/KPI library
    const [tab, setTab] = useState<'assign' | 'manage'>('assign');
    const [manageSearch, setManageSearch] = useState('');
    const [manageDeptFilter, setManageDeptFilter] = useState('');

    // Manage tab: create KRA panel
    const [showKraForm, setShowKraForm] = useState(false);

    // Manage tab: editing a KRA
    const [editKraId, setEditKraId] = useState<number | null>(null);
    const [editKraTitle, setEditKraTitle] = useState('');
    const [editKraDesc, setEditKraDesc] = useState('');
    const [editKraDepts, setEditKraDepts] = useState<number[]>([]);

    // Manage tab: editing a KPI
    const [editKpiId, setEditKpiId] = useState<number | null>(null);
    const [editKpiName, setEditKpiName] = useState('');
    const [editKpiTarget, setEditKpiTarget] = useState('');
    const [editKpiUnit, setEditKpiUnit] = useState('');

    // Manage tab: inline add-KPI under a specific KRA card
    const [addKpiForKra, setAddKpiForKra] = useState<number | null>(null);
    const [inlineKpi, setInlineKpi] = useState<{ name: string; target: string; unit: string }>({ name: '', target: '', unit: '' });

    // Form input shared by assignment
    const [targetDescription, setTargetDescription] = useState('');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        return { Authorization: `Bearer ${token}` };
    };

    // 1. Fetch directory lists on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoadingEmployees(true);
                // Fetch active employees
                const empRes = await axios.get(`${API_BASE}/employee/all-employees-list/`, {
                    headers: getHeaders(),
                });
                setEmployees(empRes.data);
                
                // Set default selected employee
                if (empRes.data.length > 0) {
                    setSelectedEmployee(empRes.data[0]);
                }

                // Fetch KRA registry, KPI library and departments in parallel
                const [kraRes, kpiRes, deptRes] = await Promise.all([
                    axios.get(`${API_BASE}/employee/kra-master/`, { headers: getHeaders() }),
                    axios.get(`${API_BASE}/employee/kpi-master/`, { headers: getHeaders() }),
                    axios.get(`${API_BASE}/app/departments/`, { headers: getHeaders() }),
                ]);
                const asArray = (d: any) => Array.isArray(d) ? d : (d?.results ?? []);
                setMasterKras(asArray(kraRes.data));
                setKpis(asArray(kpiRes.data));
                setDepartments(asArray(deptRes.data));
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setErrorMsg('Failed to load employees or KRA master registry.');
            } finally {
                setLoadingEmployees(false);
            }
        };

        fetchInitialData();
    }, []);

    // 2. Fetch assigned KRAs and tasks when selected employee changes
    useEffect(() => {
        if (!selectedEmployee) return;

        const fetchEmployeeData = async () => {
            try {
                setLoadingKras(true);
                setErrorMsg('');
                setSuccessMsg('');

                const kraRes = await axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${selectedEmployee.id}`, {
                    headers: getHeaders(),
                });
                setEmployeeKras(kraRes.data);
            } catch (err) {
                console.error('Error fetching employee data:', err);
                setErrorMsg('Failed to load KRAs for this employee.');
            } finally {
                setLoadingKras(false);
            }
        };

        fetchEmployeeData();
    }, [selectedEmployee]);

    // Calculate total weightage
    const totalWeightage = employeeKras.reduce((sum, item) => sum + item.weightage, 0);

    // Filter employees on search
    const filteredEmployees = employees.filter(emp => 
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.designation_name && emp.designation_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Assign the selected department KRAs to the employee (with reviewer)
    const handleAssignKra = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        if (!selectedEmployee || assignChecked.length === 0) return;
        if (!assignReviewerId) { setErrorMsg('Select a reviewer (master) for these KRAs.'); return; }

        try {
            // Sequential so backend cumulative weightage validation (≤100%) holds
            for (const kraId of assignChecked) {
                const weight = parseInt(assignWeights[kraId] || '0');
                await axios.post(`${API_BASE}/employee/employee-kra/`, {
                    employee: selectedEmployee.id,
                    kra_master: kraId,
                    reviewer: parseInt(assignReviewerId),
                    weightage: isNaN(weight) ? 0 : weight,
                    target_description: targetDescription
                }, { headers: getHeaders() });
            }

            const res = await axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${selectedEmployee.id}`, {
                headers: getHeaders(),
            });
            setEmployeeKras(res.data);

            setAssignChecked([]);
            setAssignWeights({});
            setTargetDescription('');
            setAssignReviewerId(''); setReviewerSearch('');
            setSuccessMsg(`${assignChecked.length} KRA(s) assigned successfully.`);
        } catch (err: any) {
            const d = err.response?.data;
            const serverMsg = d?.non_field_errors?.[0] || d?.detail || d?.[0] || 'Failed to assign KRA.';
            setErrorMsg(serverMsg);
        }
    };

    const toggleAssignKra = (id: number) =>
        setAssignChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    // Remove KRA assignment
    const handleRemoveKra = async (id: number) => {
        setErrorMsg('');
        setSuccessMsg('');
        try {
            await axios.delete(`${API_BASE}/employee/employee-kra/${id}/`, {
                headers: getHeaders(),
            });

            setEmployeeKras(employeeKras.filter(k => k.id !== id));
            setSuccessMsg('KRA assignment removed.');
        } catch (err) {
            console.error('Error removing KRA assignment:', err);
            setErrorMsg('Failed to remove KRA assignment.');
        }
    };

    // Create KRA Task
    // Multi-select helper for department <select multiple>
    const readDeptSelection = (e: React.ChangeEvent<HTMLSelectElement>) =>
        Array.from(e.target.selectedOptions).map(o => parseInt(o.value));

    // Create new KRA + its KPIs inline (no person involved)
    const handleCreateKra = async () => {
        setErrorMsg(''); setSuccessMsg('');
        if (!newKraTitle.trim() || savingKra) return;
        if (masterKras.some(k => k.title.trim().toLowerCase() === newKraTitle.trim().toLowerCase())) {
            setErrorMsg('A KRA with this title already exists.'); return;
        }
        setSavingKra(true);
        try {
            const payload = { title: newKraTitle.trim(), description: newKraDesc, departments: newKraDepts, status: 'active' };
            const res = await axios.post(`${API_BASE}/employee/kra-master/`, payload, { headers: getHeaders() });
            const kraId = res.data.id;

            // Create each non-empty KPI under this KRA, scoped to the same departments
            const validKpis = newKraKpis.filter(k => k.name.trim());
            const created = await Promise.all(validKpis.map(k =>
                axios.post(`${API_BASE}/employee/kpi-master/`, {
                    name: k.name.trim(), target_value: k.target, measurement_unit: k.unit,
                    kra_master: kraId, departments: newKraDepts, status: 'active'
                }, { headers: getHeaders() })
            ));

            setMasterKras(prev => [...prev, res.data]);
            setKpis(prev => [...prev, ...created.map(c => c.data)]);
            setNewKraTitle(''); setNewKraDesc(''); setNewKraDepts([]);
            setNewKraKpis([{ name: '', target: '', unit: '' }]);
            setShowCreateKra(false); setShowKraForm(false);
            setSuccessMsg(`KRA created with ${created.length} KPI(s).`);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.title?.[0] || 'Failed to create KRA.');
        } finally {
            setSavingKra(false);
        }
    };

    const updateKpiRow = (i: number, field: 'name' | 'target' | 'unit', val: string) =>
        setNewKraKpis(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    const addKpiRow = () => setNewKraKpis(rows => [...rows, { name: '', target: '', unit: '' }]);
    const removeKpiRow = (i: number) => setNewKraKpis(rows => rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows);

    // Row helpers + save for adding KPIs to an existing KRA
    const updateAddKpiRow = (i: number, field: 'name' | 'target' | 'unit', val: string) =>
        setAddKpiRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    const addAddKpiRow = () => setAddKpiRows(rows => [...rows, { name: '', target: '', unit: '' }]);
    const removeAddKpiRow = (i: number) => setAddKpiRows(rows => rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows);

    const handleAddKpisToKra = async () => {
        setErrorMsg(''); setSuccessMsg('');
        if (!addKpiKraId) { setErrorMsg('Select a KRA to add KPIs to.'); return; }
        const kra = masterKras.find(k => k.id === parseInt(addKpiKraId));
        const valid = addKpiRows.filter(r => r.name.trim());
        if (!valid.length) { setErrorMsg('Add at least one KPI name.'); return; }
        try {
            const created = await Promise.all(valid.map(r =>
                axios.post(`${API_BASE}/employee/kpi-master/`, {
                    name: r.name.trim(), target_value: r.target, measurement_unit: r.unit,
                    kra_master: parseInt(addKpiKraId), departments: kra?.departments || [], status: 'active'
                }, { headers: getHeaders() })
            ));
            setKpis(prev => [...prev, ...created.map(c => c.data)]);
            setAddKpiRows([{ name: '', target: '', unit: '' }]); setAddKpiKraId(''); setShowAddKpi(false);
            setSuccessMsg(`Added ${created.length} KPI(s) to ${kra?.title}.`);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.name?.[0] || 'Failed to add KPIs.');
        }
    };

    // KRAs scoped to the selected person's department (global KRAs with no dept included)
    const inDept = (k: KRAMaster) =>
        !(k.departments && k.departments.length) || (selectedEmployee?.department != null && k.departments.includes(selectedEmployee.department));
    const deptKrasAll = masterKras.filter(inDept);

    // Same list, minus KRAs already assigned to this person (for the assignment checklist)
    const assignedKraIds = new Set(employeeKras.map(k => k.kra_master));
    const deptKras = deptKrasAll; // show all; already-assigned ones rendered as disabled

    // ---------- Manage tab: CRUD ----------
    const startEditKra = (k: KRAMaster) => {
        setEditKraId(k.id); setEditKraTitle(k.title); setEditKraDesc(k.description || '');
        setEditKraDepts(k.departments || []);
    };
    const cancelEditKra = () => { setEditKraId(null); setEditKraTitle(''); setEditKraDesc(''); setEditKraDepts([]); };

    const handleUpdateKra = async () => {
        if (editKraId == null || !editKraTitle.trim()) return;
        setErrorMsg(''); setSuccessMsg('');
        try {
            const res = await axios.patch(`${API_BASE}/employee/kra-master/${editKraId}/`, {
                title: editKraTitle.trim(), description: editKraDesc, departments: editKraDepts
            }, { headers: getHeaders() });
            setMasterKras(prev => prev.map(k => k.id === editKraId ? res.data : k));
            cancelEditKra();
            setSuccessMsg('KRA updated.');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.title?.[0] || 'Failed to update KRA.');
        }
    };

    const handleDeleteKra = async (id: number) => {
        if (!window.confirm('Delete this KRA? Its KPIs will be unlinked.')) return;
        setErrorMsg(''); setSuccessMsg('');
        try {
            await axios.delete(`${API_BASE}/employee/kra-master/${id}/`, { headers: getHeaders() });
            setMasterKras(prev => prev.filter(k => k.id !== id));
            setKpis(prev => prev.map(k => k.kra_master === id ? { ...k, kra_master: null } : k));
            setSuccessMsg('KRA deleted.');
        } catch (err: any) {
            if (err.response?.status === 404) {
                setMasterKras(prev => prev.filter(k => k.id !== id));
                setSuccessMsg('KRA already removed.');
            } else setErrorMsg('Failed to delete KRA.');
        }
    };

    const startEditKpi = (k: KPIMaster) => {
        setEditKpiId(k.id); setEditKpiName(k.name); setEditKpiTarget(k.target_value || ''); setEditKpiUnit(k.measurement_unit || '');
    };
    const cancelEditKpi = () => { setEditKpiId(null); setEditKpiName(''); setEditKpiTarget(''); setEditKpiUnit(''); };

    const handleUpdateKpi = async () => {
        if (editKpiId == null || !editKpiName.trim()) return;
        setErrorMsg(''); setSuccessMsg('');
        try {
            const res = await axios.patch(`${API_BASE}/employee/kpi-master/${editKpiId}/`, {
                name: editKpiName.trim(), target_value: editKpiTarget, measurement_unit: editKpiUnit
            }, { headers: getHeaders() });
            setKpis(prev => prev.map(k => k.id === editKpiId ? res.data : k));
            cancelEditKpi();
            setSuccessMsg('KPI updated.');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.name?.[0] || 'Failed to update KPI.');
        }
    };

    const handleDeleteKpi = async (id: number) => {
        if (!window.confirm('Delete this KPI?')) return;
        setErrorMsg(''); setSuccessMsg('');
        try {
            await axios.delete(`${API_BASE}/employee/kpi-master/${id}/`, { headers: getHeaders() });
            setKpis(prev => prev.filter(k => k.id !== id));
            setSuccessMsg('KPI deleted.');
        } catch (err: any) {
            if (err.response?.status === 404) {
                setKpis(prev => prev.filter(k => k.id !== id));
                setSuccessMsg('KPI already removed.');
            } else setErrorMsg('Failed to delete KPI.');
        }
    };

    const handleAddInlineKpi = async (kra: KRAMaster) => {
        if (!inlineKpi.name.trim()) return;
        setErrorMsg(''); setSuccessMsg('');
        try {
            const res = await axios.post(`${API_BASE}/employee/kpi-master/`, {
                name: inlineKpi.name.trim(), target_value: inlineKpi.target, measurement_unit: inlineKpi.unit,
                kra_master: kra.id, departments: kra.departments || [], status: 'active'
            }, { headers: getHeaders() });
            setKpis(prev => [...prev, res.data]);
            setInlineKpi({ name: '', target: '', unit: '' }); setAddKpiForKra(null);
            setSuccessMsg(`KPI added to ${kra.title}.`);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.name?.[0] || 'Failed to add KPI.');
        }
    };

    const deptName = (id: number) => departments.find(d => d.id === id)?.department_name || `Dept ${id}`;

    // Manage tab list, filtered by search + department
    const manageKras = masterKras.filter(k => {
        const matchSearch = !manageSearch || k.title.toLowerCase().includes(manageSearch.toLowerCase());
        const matchDept = !manageDeptFilter || (k.departments || []).includes(parseInt(manageDeptFilter));
        return matchSearch && matchDept;
    });

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Assign KRAs & Goals</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Create KRAs (with KPIs) per department, then assign them to employees with a reviewer.
                </p>
            </div>

            {/* Notification Toast */}
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

            {/* Page Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setTab('assign')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${tab === 'assign' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' : 'bg-white dark:bg-gray-900 text-gray-500 border border-gray-200 dark:border-gray-800'}`}
                >
                    Assign to Employees
                </button>
                <button
                    onClick={() => setTab('manage')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${tab === 'manage' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' : 'bg-white dark:bg-gray-900 text-gray-500 border border-gray-200 dark:border-gray-800'}`}
                >
                    Manage KRA &amp; KPIs
                </button>
            </div>

            {/* Split Screen Workspace */}
            {tab === 'assign' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                {/* Left Panel: Employee selection directory */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex flex-col h-[620px]">
                    <div className="relative mb-4">
                        <input 
                            type="text" 
                            placeholder="Search employee..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-4 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                        />
                        <IconSearch className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>

                    <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-2 select-none block">
                        Workforce Directory ({filteredEmployees.length})
                    </span>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {loadingEmployees ? (
                            <div className="text-center py-10 text-xs text-gray-400">Loading directory...</div>
                        ) : filteredEmployees.map((emp) => {
                            const isSelected = selectedEmployee?.id === emp.id;
                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition duration-200 select-none ${
                                        isSelected 
                                        ? 'bg-teal-500/10 border-teal-500 text-teal-900 dark:text-white' 
                                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-805 hover:bg-gray-50 dark:hover:bg-gray-850'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                            {emp.initials}
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold leading-tight">{emp.full_name}</span>
                                            <span className="block text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{emp.designation_name || 'Designation Not Set'}</span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full shrink-0">
                                        {emp.department_name || 'No Dept'}
                                    </span>
                                </div>
                            );
                        })}
                        {!loadingEmployees && filteredEmployees.length === 0 && (
                            <div className="text-center py-10 text-xs text-gray-400 italic">No employees found.</div>
                        )}
                    </div>
                </div>

                {/* Right Panel: KRA Config workspace */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-6 flex flex-col justify-between h-[620px]">
                    
                    {selectedEmployee ? (
                        <>
                            <div>
                                {/* Selected Employee profile */}
                                <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                                            {selectedEmployee.initials}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{selectedEmployee.full_name}</h3>
                                            <span className="text-[10px] text-gray-400 mt-0.5 block">{selectedEmployee.designation_name || 'Designation Not Set'} • {selectedEmployee.department_name || 'No Dept'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned KRAs */}
                                {(
                                    <>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Assigned KRA Metrics ({employeeKras.length})</span>
                                            <span className={`text-xs font-black ${totalWeightage > 100 ? 'text-rose-500' : 'text-teal-600 dark:text-teal-400'}`}>
                                                Total Weight: {totalWeightage}% / 100%
                                            </span>
                                        </div>

                                        {/* Form: Assign department KRAs + reviewer (no KRA-master picker) */}
                                        <form onSubmit={handleAssignKra} className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 p-4 rounded-2xl mb-4 space-y-3 animate__animated animate__fadeIn">

                                            {/* Reviewer (Master) */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Reviewer / Master (reviews these KRAs)</label>
                                                    <div className="flex gap-3">
                                                        <button type="button" onClick={() => { setShowCreateKra(s => !s); setShowAddKpi(false); }} className="text-[10px] font-black text-teal-600 dark:text-teal-400 hover:underline">
                                                            {showCreateKra ? '× Cancel' : '＋ New KRA'}
                                                        </button>
                                                        <button type="button" onClick={() => { setShowAddKpi(s => !s); setShowCreateKra(false); }} className="text-[10px] font-black text-teal-600 dark:text-teal-400 hover:underline">
                                                            {showAddKpi ? '× Cancel' : '＋ KPI to KRA'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={reviewerSearch}
                                                        placeholder="Type to search reviewer (admin or employee)..."
                                                        onChange={(e) => { setReviewerSearch(e.target.value); setAssignReviewerId(''); setShowReviewerList(true); }}
                                                        onFocus={() => setShowReviewerList(true)}
                                                        onBlur={() => setTimeout(() => setShowReviewerList(false), 150)}
                                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                                    />
                                                    {showReviewerList && (
                                                        <div className="absolute z-30 mt-1 w-full max-h-44 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                                                            {employees
                                                                .filter(emp => emp.full_name.toLowerCase().includes(reviewerSearch.toLowerCase()) || (emp.designation_name || '').toLowerCase().includes(reviewerSearch.toLowerCase()))
                                                                .slice(0, 50)
                                                                .map(emp => (
                                                                    <div key={emp.id}
                                                                        onMouseDown={() => { setAssignReviewerId(String(emp.id)); setReviewerSearch(`${emp.full_name} (${emp.designation_name || 'No Desig'})`); setShowReviewerList(false); }}
                                                                        className="px-3 py-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-500/10 cursor-pointer">
                                                                        {emp.full_name} <span className="text-gray-400">({emp.designation_name || 'No Desig'})</span>
                                                                    </div>
                                                                ))}
                                                            {employees.filter(emp => emp.full_name.toLowerCase().includes(reviewerSearch.toLowerCase())).length === 0 && (
                                                                <div className="px-3 py-2 text-[11px] text-gray-400 italic">No match</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Create New KRA + nested KPIs */}
                                            {showCreateKra && (
                                                <div className="bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-900/40 p-3 rounded-2xl space-y-2 animate__animated animate__fadeIn">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">Create New KRA (with KPIs)</span>
                                                    <input
                                                        type="text" placeholder="KRA title e.g. Customer Satisfaction"
                                                        value={newKraTitle} onChange={(e) => setNewKraTitle(e.target.value)}
                                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                                    />
                                                    <textarea
                                                        placeholder="Description (optional)" rows={2}
                                                        value={newKraDesc} onChange={(e) => setNewKraDesc(e.target.value)}
                                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none resize-none"
                                                    />
                                                    <div>
                                                        <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Department(s) — Ctrl/Cmd-click for multiple</label>
                                                        <select multiple value={newKraDepts.map(String)} onChange={(e) => setNewKraDepts(readDeptSelection(e))}
                                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none h-20">
                                                            {departments.map(d => (<option key={d.id} value={d.id}>{d.department_name}</option>))}
                                                        </select>
                                                    </div>

                                                    {/* Nested KPIs */}
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-center">
                                                            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">KPIs under this KRA</label>
                                                            <button type="button" onClick={addKpiRow} className="text-[10px] font-black text-teal-600 dark:text-teal-400 hover:underline">＋ Add KPI</button>
                                                        </div>
                                                        {newKraKpis.map((kpi, i) => (
                                                            <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                                                                <input type="text" placeholder="KPI name" value={kpi.name} onChange={(e) => updateKpiRow(i, 'name', e.target.value)}
                                                                    className="col-span-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                                <input type="text" placeholder="Target" value={kpi.target} onChange={(e) => updateKpiRow(i, 'target', e.target.value)}
                                                                    className="col-span-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                                <input type="text" placeholder="Unit" value={kpi.unit} onChange={(e) => updateKpiRow(i, 'unit', e.target.value)}
                                                                    className="col-span-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                                <button type="button" onClick={() => removeKpiRow(i)} className="col-span-1 text-rose-500 text-sm font-bold">×</button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-end">
                                                        <button type="button" onClick={handleCreateKra} disabled={!newKraTitle.trim() || savingKra}
                                                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-[10px] font-bold">
                                                            Save KRA & KPIs
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Add KPI(s) to an existing KRA */}
                                            {showAddKpi && (
                                                <div className="bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-900/40 p-3 rounded-2xl space-y-2 animate__animated animate__fadeIn">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">Add KPI to Existing KRA</span>
                                                    <select value={addKpiKraId} onChange={(e) => setAddKpiKraId(e.target.value)}
                                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none">
                                                        <option value="">-- Select existing KRA ({selectedEmployee.department_name || 'dept'}) --</option>
                                                        {deptKrasAll.map(k => (<option key={k.id} value={k.id}>{k.title}</option>))}
                                                        {deptKrasAll.length === 0 && <option value="" disabled>No KRAs for this department yet</option>}
                                                    </select>
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-center">
                                                            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">New KPIs</label>
                                                            <button type="button" onClick={addAddKpiRow} className="text-[10px] font-black text-teal-600 dark:text-teal-400 hover:underline">＋ Add KPI</button>
                                                        </div>
                                                        {addKpiRows.map((kpi, i) => (
                                                            <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                                                                <input type="text" placeholder="KPI name" value={kpi.name} onChange={(e) => updateAddKpiRow(i, 'name', e.target.value)}
                                                                    className="col-span-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                                <input type="text" placeholder="Target" value={kpi.target} onChange={(e) => updateAddKpiRow(i, 'target', e.target.value)}
                                                                    className="col-span-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                                <input type="text" placeholder="Unit" value={kpi.unit} onChange={(e) => updateAddKpiRow(i, 'unit', e.target.value)}
                                                                    className="col-span-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                                <button type="button" onClick={() => removeAddKpiRow(i)} className="col-span-1 text-rose-500 text-sm font-bold">×</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {addKpiKraId && (
                                                        <p className="text-[9px] text-gray-400">
                                                            Existing KPIs: {kpis.filter(k => k.kra_master === parseInt(addKpiKraId)).map(k => k.name).join(', ') || 'none yet'}
                                                        </p>
                                                    )}
                                                    <div className="flex justify-end">
                                                        <button type="button" onClick={handleAddKpisToKra} disabled={!addKpiKraId}
                                                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-[10px] font-bold">
                                                            Save KPIs
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Department KRA checklist (auto-filtered to this person's department) */}
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                                                    KRAs for {selectedEmployee.department_name || 'this department'} — tick to assign & set weight
                                                </label>
                                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 max-h-44 overflow-y-auto bg-white dark:bg-gray-900">
                                                    {deptKras.length === 0 && (
                                                        <div className="text-center py-4 text-[11px] text-gray-400 italic">No KRAs for this department. Use ＋ New KRA.</div>
                                                    )}
                                                    {deptKras.map(k => {
                                                        const timesAssigned = employeeKras.filter(ek => ek.kra_master === k.id).length;
                                                        const checked = assignChecked.includes(k.id);
                                                        return (
                                                            <div key={k.id} className="flex items-center gap-2 p-2">
                                                                <input type="checkbox" checked={checked}
                                                                    onChange={() => toggleAssignKra(k.id)} className="accent-teal-600" />
                                                                <span className="flex-1 text-[11px] font-semibold text-gray-800 dark:text-white">
                                                                    {k.title}
                                                                </span>
                                                                {timesAssigned > 0 && (
                                                                    <span className="text-[8px] font-black text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full shrink-0">×{timesAssigned}</span>
                                                                )}
                                                                <input type="number" min="1" max="100" placeholder="wt%" disabled={!checked}
                                                                    value={assignWeights[k.id] || ''}
                                                                    onChange={(e) => setAssignWeights(w => ({ ...w, [k.id]: e.target.value }))}
                                                                    className="w-16 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none disabled:opacity-40" />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Target description / metrics (optional)</label>
                                                <textarea
                                                    placeholder="Specify targets e.g. Close 15 customer tickets per week with >95% CSAT..."
                                                    value={targetDescription}
                                                    onChange={(e) => setTargetDescription(e.target.value)}
                                                    rows={2}
                                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none resize-none"
                                                />
                                            </div>

                                            <div className="flex justify-end pt-1">
                                                <button
                                                    type="submit"
                                                    disabled={assignChecked.length === 0 || !assignReviewerId}
                                                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/10 transition duration-300"
                                                >
                                                    Assign {assignChecked.length || ''} KRA(s) to {selectedEmployee.first_name}
                                                </button>
                                            </div>
                                        </form>

                                        {/* Assigned KRAs list */}
                                        <div className="overflow-y-auto max-h-[220px] border border-gray-100 dark:border-gray-800 rounded-2xl">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 dark:bg-gray-800/40 text-[9px] font-black uppercase text-gray-400 tracking-wider">
                                                        <th className="p-3 pl-4">KRA Title</th>
                                                        <th className="p-3">Weight</th>
                                                        <th className="p-3">Reviewer</th>
                                                        <th className="p-3">Assigned On</th>
                                                        <th className="p-3">Target Metrics</th>
                                                        <th className="p-3 text-center pr-4">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    {loadingKras ? (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-5 text-gray-400">Loading assignments...</td>
                                                        </tr>
                                                    ) : employeeKras.length === 0 ? (
                                                        <tr><td colSpan={6} className="text-center py-5 text-gray-400 italic">No KRAs mapped yet.</td></tr>
                                                    ) : employeeKras.map((k) => (
                                                        <tr key={k.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                                                            <td className="p-3 pl-4 font-bold text-gray-800 dark:text-white">{k.kra_title}</td>
                                                            <td className="p-3 font-extrabold text-teal-600 dark:text-teal-400">{k.weightage}%</td>
                                                            <td className="p-3">{k.reviewer_name || '—'}</td>
                                                            <td className="p-3 whitespace-nowrap">
                                                                {k.created_at ? (
                                                                    <div>
                                                                        <span className="block text-[10px] font-bold text-gray-700 dark:text-gray-300">{new Date(k.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                                        <span className="block text-[9px] text-gray-400">{new Date(k.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                ) : '—'}
                                                            </td>
                                                            <td className="p-3 max-w-xs truncate">{k.target_description || 'None'}</td>
                                                            <td className="p-3 text-center pr-4">
                                                                <button 
                                                                    onClick={() => handleRemoveKra(k.id)}
                                                                    className="text-[9px] font-bold text-rose-500 hover:underline"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}

                            </div>
                        </>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-3xl text-center flex flex-col items-center justify-center h-full">
                            <IconTrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400">KRA Assignment</h4>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-xs mt-1.5 leading-relaxed">
                                Select an employee from the directory on the left to review or add KRA assignments.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* ===================== MANAGE KRA & KPIs TAB ===================== */}
            {tab === 'manage' && (
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
                    <div className="flex flex-1 gap-3">
                        <div className="relative flex-1 max-w-xs">
                            <input
                                type="text" placeholder="Search KRA..."
                                value={manageSearch} onChange={(e) => setManageSearch(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-4 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                            />
                            <IconSearch className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        </div>
                        <select
                            value={manageDeptFilter} onChange={(e) => setManageDeptFilter(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                        >
                            <option value="">All departments</option>
                            {departments.map(d => (<option key={d.id} value={d.id}>{d.department_name}</option>))}
                        </select>
                    </div>
                    <button
                        onClick={() => { setShowKraForm(s => !s); setShowCreateKra(false); }}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/10 whitespace-nowrap"
                    >
                        {showKraForm ? '× Cancel' : '＋ Create KRA'}
                    </button>
                </div>

                {/* Create KRA panel (reuses create state + nested KPIs) */}
                {showKraForm && (
                    <div className="bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-900/40 p-4 rounded-3xl space-y-2 animate__animated animate__fadeIn">
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">Create New KRA (with KPIs)</span>
                        <input type="text" placeholder="KRA title e.g. Customer Satisfaction" value={newKraTitle} onChange={(e) => setNewKraTitle(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                        <textarea placeholder="Description (optional)" rows={2} value={newKraDesc} onChange={(e) => setNewKraDesc(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none resize-none" />
                        <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Department(s) — Ctrl/Cmd-click for multiple</label>
                            <select multiple value={newKraDepts.map(String)} onChange={(e) => setNewKraDepts(readDeptSelection(e))}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none h-20">
                                {departments.map(d => (<option key={d.id} value={d.id}>{d.department_name}</option>))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">KPIs under this KRA</label>
                                <button type="button" onClick={addKpiRow} className="text-[10px] font-black text-teal-600 dark:text-teal-400 hover:underline">＋ Add KPI</button>
                            </div>
                            {newKraKpis.map((kpi, i) => (
                                <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                                    <input type="text" placeholder="KPI name" value={kpi.name} onChange={(e) => updateKpiRow(i, 'name', e.target.value)}
                                        className="col-span-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                    <input type="text" placeholder="Target" value={kpi.target} onChange={(e) => updateKpiRow(i, 'target', e.target.value)}
                                        className="col-span-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                    <input type="text" placeholder="Unit" value={kpi.unit} onChange={(e) => updateKpiRow(i, 'unit', e.target.value)}
                                        className="col-span-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                    <button type="button" onClick={() => removeKpiRow(i)} className="col-span-1 text-rose-500 text-sm font-bold">×</button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={handleCreateKra} disabled={!newKraTitle.trim() || savingKra}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-[10px] font-bold">Save KRA &amp; KPIs</button>
                        </div>
                    </div>
                )}

                {/* KRA cards */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {manageKras.length === 0 && (
                        <div className="col-span-full text-center py-10 text-xs text-gray-400 italic bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                            No KRAs found. Use ＋ Create KRA.
                        </div>
                    )}
                    {manageKras.map(kra => {
                        const kraKpis = kpis.filter(k => k.kra_master === kra.id);
                        const editing = editKraId === kra.id;
                        return (
                            <div key={kra.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-5">
                                {/* KRA header */}
                                {editing ? (
                                    <div className="space-y-2 mb-3">
                                        <input type="text" value={editKraTitle} onChange={(e) => setEditKraTitle(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none" />
                                        <textarea value={editKraDesc} onChange={(e) => setEditKraDesc(e.target.value)} rows={2} placeholder="Description"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none resize-none" />
                                        <select multiple value={editKraDepts.map(String)} onChange={(e) => setEditKraDepts(readDeptSelection(e))}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none h-16">
                                            {departments.map(d => (<option key={d.id} value={d.id}>{d.department_name}</option>))}
                                        </select>
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={cancelEditKra} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold">Cancel</button>
                                            <button onClick={handleUpdateKra} disabled={!editKraTitle.trim()} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-[10px] font-bold">Save</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 pr-2">
                                            <h3 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{kra.title}</h3>
                                            {kra.description && <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{kra.description}</p>}
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {(kra.departments || []).length === 0 && <span className="text-[8px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full">All depts</span>}
                                                {(kra.departments || []).map(id => (
                                                    <span key={id} className="text-[8px] font-bold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full">{deptName(id)}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => startEditKra(kra)} className="text-[9px] font-bold text-teal-600 hover:underline">Edit</button>
                                            <button onClick={() => handleDeleteKra(kra.id)} className="text-[9px] font-bold text-rose-500 hover:underline">Delete</button>
                                        </div>
                                    </div>
                                )}

                                {/* KPI list */}
                                <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">KPIs ({kraKpis.length})</span>
                                        <button onClick={() => { setAddKpiForKra(addKpiForKra === kra.id ? null : kra.id); setInlineKpi({ name: '', target: '', unit: '' }); }}
                                            className="text-[10px] font-black text-teal-600 dark:text-teal-400 hover:underline">
                                            {addKpiForKra === kra.id ? '× Cancel' : '＋ Add KPI'}
                                        </button>
                                    </div>

                                    {addKpiForKra === kra.id && (
                                        <div className="grid grid-cols-12 gap-1.5 items-center mb-2">
                                            <input type="text" placeholder="KPI name" value={inlineKpi.name} onChange={(e) => setInlineKpi(p => ({ ...p, name: e.target.value }))}
                                                className="col-span-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                            <input type="text" placeholder="Target" value={inlineKpi.target} onChange={(e) => setInlineKpi(p => ({ ...p, target: e.target.value }))}
                                                className="col-span-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                            <input type="text" placeholder="Unit" value={inlineKpi.unit} onChange={(e) => setInlineKpi(p => ({ ...p, unit: e.target.value }))}
                                                className="col-span-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                            <button onClick={() => handleAddInlineKpi(kra)} disabled={!inlineKpi.name.trim()} className="col-span-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-[10px] font-bold py-1.5">Add</button>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        {kraKpis.length === 0 && <p className="text-[10px] text-gray-400 italic py-1">No KPIs yet.</p>}
                                        {kraKpis.map(kpi => (
                                            editKpiId === kpi.id ? (
                                                <div key={kpi.id} className="grid grid-cols-12 gap-1.5 items-center">
                                                    <input type="text" value={editKpiName} onChange={(e) => setEditKpiName(e.target.value)}
                                                        className="col-span-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                    <input type="text" value={editKpiTarget} onChange={(e) => setEditKpiTarget(e.target.value)} placeholder="Target"
                                                        className="col-span-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                    <input type="text" value={editKpiUnit} onChange={(e) => setEditKpiUnit(e.target.value)} placeholder="Unit"
                                                        className="col-span-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                    <button onClick={handleUpdateKpi} className="col-span-1 text-teal-600 text-[10px] font-black">✓</button>
                                                    <button onClick={cancelEditKpi} className="col-span-1 text-gray-400 text-sm font-bold">×</button>
                                                </div>
                                            ) : (
                                                <div key={kpi.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/40 rounded-lg px-3 py-1.5">
                                                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                                        {kpi.name}
                                                        {kpi.target_value && <span className="text-teal-600 dark:text-teal-400 font-bold"> · {kpi.target_value}{kpi.measurement_unit ? ` ${kpi.measurement_unit}` : ''}</span>}
                                                    </span>
                                                    <div className="flex gap-2 shrink-0">
                                                        <button onClick={() => startEditKpi(kpi)} className="text-[9px] font-bold text-teal-600 hover:underline">Edit</button>
                                                        <button onClick={() => handleDeleteKpi(kpi.id)} className="text-[9px] font-bold text-rose-500 hover:underline">Delete</button>
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            )}
        </div>
    );
};

export default KRAsAssign;
