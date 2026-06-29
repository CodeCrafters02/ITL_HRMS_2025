import { useState, useEffect } from 'react';
import axios from 'axios';
import IconSearch from '../../../components/Icon/IconSearch';
import IconUsers from '../../../components/Icon/IconUsers';
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
}

interface KRATask {
    id: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    deadline: string;
    kra_id: number;
    kra_title: string;
}

const KRAsAssign = () => {
    // Directories
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [masterKras, setMasterKras] = useState<KRAMaster[]>([]);
    const [employeeKras, setEmployeeKras] = useState<EmployeeKRA[]>([]);
    const [kraTasks, setKraTasks] = useState<KRATask[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [kpis, setKpis] = useState<KPIMaster[]>([]);

    // Inline KRA creation (with nested KPIs)
    const [showCreateKra, setShowCreateKra] = useState(false);
    const [newKraTitle, setNewKraTitle] = useState('');
    const [newKraDesc, setNewKraDesc] = useState('');
    const [newKraDepts, setNewKraDepts] = useState<number[]>([]);
    const [newKraKpis, setNewKraKpis] = useState<{ name: string; target: string; unit: string }[]>([
        { name: '', target: '', unit: '' },
    ]);

    // Reviewer ("master") + which department KRAs are selected when assigning to a person
    const [assignReviewerId, setAssignReviewerId] = useState('');
    const [assignChecked, setAssignChecked] = useState<number[]>([]);
    const [assignWeights, setAssignWeights] = useState<Record<number, string>>({});

    // Inline KPI creation + picker
    const [showCreateKpi, setShowCreateKpi] = useState(false);
    const [newKpiName, setNewKpiName] = useState('');
    const [newKpiDesc, setNewKpiDesc] = useState('');
    const [newKpiUnit, setNewKpiUnit] = useState('');
    const [newKpiTarget, setNewKpiTarget] = useState('');
    const [newKpiKra, setNewKpiKra] = useState('');
    const [newKpiDepts, setNewKpiDepts] = useState<number[]>([]);
    const [selectedKpiId, setSelectedKpiId] = useState('');

    // Acting Manager (Master Selection)
    const [actingManager, setActingManager] = useState<Employee | null>(null);
    const [searchManagerQuery, setSearchManagerQuery] = useState('');
    const [showManagerDropdown, setShowManagerDropdown] = useState(false);

    // UI Loading & Search
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [loadingKras, setLoadingKras] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [activeTab, setActiveTab] = useState<'kras' | 'tasks'>('kras');

    // Form inputs for new KRA assignment
    const [targetDescription, setTargetDescription] = useState('');

    // Form inputs for new Task
    const [selectedKraId, setSelectedKraId] = useState('');
    const [taskTitle, setTaskTitle] = useState('');
    const [taskKPIs, setTaskKPIs] = useState('');
    const [taskPriority, setTaskPriority] = useState('medium');
    const [taskDeadline, setTaskDeadline] = useState('');

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
                
                // Set default selected employee and default acting manager (master)
                if (empRes.data.length > 0) {
                    setSelectedEmployee(empRes.data[0]);
                    setActingManager(empRes.data[0]); // By default acting as first employee
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
                setLoadingTasks(true);
                setErrorMsg('');
                setSuccessMsg('');
                
                // Fetch KRAs
                const kraRes = await axios.get(`${API_BASE}/employee/employee-kra/?employee_id=${selectedEmployee.id}`, {
                    headers: getHeaders(),
                });
                setEmployeeKras(kraRes.data);

                // Fetch KRA Tasks
                const taskRes = await axios.get(`${API_BASE}/employee/kra-tasks/?employee_id=${selectedEmployee.id}`, {
                    headers: getHeaders(),
                });
                setKraTasks(taskRes.data);
            } catch (err) {
                console.error('Error fetching employee data:', err);
                setErrorMsg('Failed to load KRAs or tasks for this employee.');
            } finally {
                setLoadingKras(false);
                setLoadingTasks(false);
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

    // Filter managers for acting manager selector
    const filteredManagers = employees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchManagerQuery.toLowerCase())
    );

    // Assign the selected department KRAs to the employee (with reviewer)
    const handleAssignKra = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        if (!selectedEmployee || assignChecked.length === 0) return;
        if (!assignReviewerId) { setErrorMsg('Select a reviewer (master) for these KRAs.'); return; }

        try {
            // Sequential so backend cumulative weightage validation (<=100%) holds
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
            setAssignReviewerId('');
            setSuccessMsg('KRA(s) assigned successfully.');
        } catch (err: any) {
            console.error('Error assigning KRA:', err);
            const serverMsg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.[0] || 'Failed to assign KRA.';
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
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        if (!selectedEmployee || !selectedKraId || !taskTitle || !taskDeadline) return;

        try {
            const payload = {
                employee_id: selectedEmployee.id,
                kra_id: parseInt(selectedKraId),
                title: taskTitle,
                description: taskKPIs, // Store KPIs in description field
                priority: taskPriority,
                deadline: taskDeadline
            };

            await axios.post(`${API_BASE}/employee/kra-tasks/`, payload, {
                headers: getHeaders(),
            });

            // Re-fetch tasks
            const taskRes = await axios.get(`${API_BASE}/employee/kra-tasks/?employee_id=${selectedEmployee.id}`, {
                headers: getHeaders(),
            });
            setKraTasks(taskRes.data);

            // Reset form
            setSelectedKraId('');
            setTaskTitle('');
            setTaskKPIs('');
            setTaskPriority('medium');
            setTaskDeadline('');
            setSuccessMsg('KRA Task & KPIs created successfully.');
        } catch (err: any) {
            console.error('Error creating KRA task:', err);
            setErrorMsg('Failed to create KRA Task.');
        }
    };

    // Multi-select helper for department <select multiple>
    const readDeptSelection = (e: React.ChangeEvent<HTMLSelectElement>) =>
        Array.from(e.target.selectedOptions).map(o => parseInt(o.value));

    // Create new KRA + its KPIs inline (no person involved)
    const handleCreateKra = async () => {
        setErrorMsg(''); setSuccessMsg('');
        if (!newKraTitle.trim()) return;
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
            setShowCreateKra(false);
            setSuccessMsg(`KRA created with ${created.length} KPI(s).`);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.title?.[0] || 'Failed to create KRA.');
        }
    };

    const updateKpiRow = (i: number, field: 'name' | 'target' | 'unit', val: string) =>
        setNewKraKpis(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    const addKpiRow = () => setNewKraKpis(rows => [...rows, { name: '', target: '', unit: '' }]);
    const removeKpiRow = (i: number) => setNewKraKpis(rows => rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows);

    // Create new KPI in library inline
    const handleCreateKpi = async () => {
        setErrorMsg(''); setSuccessMsg('');
        if (!newKpiName.trim()) return;
        try {
            const payload = {
                name: newKpiName.trim(), description: newKpiDesc, measurement_unit: newKpiUnit,
                target_value: newKpiTarget, kra_master: newKpiKra ? parseInt(newKpiKra) : null,
                departments: newKpiDepts, status: 'active'
            };
            const res = await axios.post(`${API_BASE}/employee/kpi-master/`, payload, { headers: getHeaders() });
            setKpis(prev => [...prev, res.data]);
            setNewKpiName(''); setNewKpiDesc(''); setNewKpiUnit(''); setNewKpiTarget(''); setNewKpiKra(''); setNewKpiDepts([]); setShowCreateKpi(false);
            setSuccessMsg('New KPI created and added to the library.');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.name?.[0] || 'Failed to create KPI.');
        }
    };

    // Append a library KPI into the free-text "Define KPIs & Details" field
    const appendKpiToDetails = (id: string) => {
        const kpi = kpis.find(k => k.id === parseInt(id));
        if (!kpi) return;
        const target = kpi.target_value ? ` — Target: ${kpi.target_value}${kpi.measurement_unit ? ' ' + kpi.measurement_unit : ''}` : '';
        const line = `KPI: ${kpi.name}${target}`;
        setTaskKPIs(prev => (prev ? `${prev}\n${line}` : line));
        setSelectedKpiId('');
    };

    // Department KRAs available to assign (scoped to person's dept, excluding already-assigned)
    const assignedKraIds = new Set(employeeKras.map(k => k.kra_master));
    const deptKras = masterKras.filter(k =>
        !assignedKraIds.has(k.id) &&
        (!(k.departments && k.departments.length) || (selectedEmployee?.department != null && k.departments.includes(selectedEmployee.department)))
    );

    // KPIs relevant to the selected employee's department (or global KPIs with no dept scope)
    const deptKpis = kpis.filter(k =>
        k.departments.length === 0 || (selectedEmployee?.department != null && k.departments.includes(selectedEmployee.department))
    );

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header with Impersonate Dropdown */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Assign KRAs & Goals</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        Map Key Result Areas directly to employees, configure weights, and assign KRA tasks with KPIs.
                    </p>
                </div>

                {/* Acting Manager Dropdown Selector */}
                <div className="relative w-full md:w-72">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1 select-none">
                        Acting As (Master/Manager)
                    </label>
                    <div 
                        onClick={() => setShowManagerDropdown(!showManagerDropdown)}
                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-800 dark:text-white cursor-pointer select-none flex justify-between items-center"
                    >
                        <span>{actingManager ? actingManager.full_name : 'Select Manager'}</span>
                        <span className="text-[10px] text-gray-400">▼</span>
                    </div>

                    {showManagerDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-3 z-50 space-y-2">
                            <input 
                                type="text"
                                placeholder="Type to filter manager..."
                                value={searchManagerQuery}
                                onChange={(e) => setSearchManagerQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                            />
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {filteredManagers.map(mgr => (
                                    <div
                                        key={mgr.id}
                                        onClick={() => {
                                            setActingManager(mgr);
                                            setShowManagerDropdown(false);
                                            setSearchManagerQuery('');
                                        }}
                                        className="p-2 hover:bg-teal-500/10 hover:text-teal-600 dark:hover:bg-gray-800 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                                    >
                                        {mgr.full_name} ({mgr.designation_name || 'No Desig'})
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
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

            {/* Split Screen Workspace */}
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
                                    
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setActiveTab('kras')}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${activeTab === 'kras' ? 'bg-teal-500 text-white shadow-sm' : 'bg-gray-50 dark:bg-gray-800 text-gray-500'}`}
                                        >
                                            Assigned KRAs
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('tasks')}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${activeTab === 'tasks' ? 'bg-teal-500 text-white shadow-sm' : 'bg-gray-50 dark:bg-gray-800 text-gray-500'}`}
                                        >
                                            KRA Tasks & KPIs
                                        </button>
                                    </div>
                                </div>

                                {/* TAB 1: Assigned KRAs */}
                                {activeTab === 'kras' && (
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
                                                    <button type="button" onClick={() => setShowCreateKra(s => !s)} className="text-[10px] font-black text-teal-600 dark:text-teal-400 hover:underline">
                                                        {showCreateKra ? '× Cancel' : '＋ New KRA'}
                                                    </button>
                                                </div>
                                                <select
                                                    value={assignReviewerId}
                                                    onChange={(e) => setAssignReviewerId(e.target.value)}
                                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                                >
                                                    <option value="">-- Select reviewer (admin or employee) --</option>
                                                    {employees.map(emp => (
                                                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.designation_name || 'No Desig'})</option>
                                                    ))}
                                                </select>
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
                                                        <button type="button" onClick={handleCreateKra} disabled={!newKraTitle.trim()}
                                                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-[10px] font-bold">
                                                            Save KRA & KPIs
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
                                                        <div className="text-center py-4 text-[11px] text-gray-400 italic">No unassigned KRAs for this department. Use ＋ New KRA.</div>
                                                    )}
                                                    {deptKras.map(k => {
                                                        const checked = assignChecked.includes(k.id);
                                                        return (
                                                            <div key={k.id} className="flex items-center gap-2 p-2">
                                                                <input type="checkbox" checked={checked} onChange={() => toggleAssignKra(k.id)} className="accent-teal-600" />
                                                                <span className="flex-1 text-[11px] font-semibold text-gray-800 dark:text-white">{k.title}</span>
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
                                                        <th className="p-3">Target Metrics</th>
                                                        <th className="p-3 text-center pr-4">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    {loadingKras ? (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-5 text-gray-400">Loading assignments...</td>
                                                        </tr>
                                                    ) : employeeKras.map((k) => (
                                                        <tr key={k.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                                                            <td className="p-3 pl-4 font-bold text-gray-800 dark:text-white">{k.kra_title}</td>
                                                            <td className="p-3 font-extrabold text-teal-600 dark:text-teal-400">{k.weightage}%</td>
                                                            <td className="p-3">{k.reviewer_name || '—'}</td>
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
                                                    {!loadingKras && employeeKras.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-5 text-gray-400 italic">No KRAs mapped yet.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}

                                {/* TAB 2: KRA Tasks & KPIs */}
                                {activeTab === 'tasks' && (
                                    <>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-gray-400 uppercase">KRA Tasks & Linked KPIs ({kraTasks.length})</span>
                                        </div>

                                        {/* Form: Create Task & KPIs */}
                                        <form onSubmit={handleCreateTask} className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 p-4 rounded-2xl mb-4 space-y-3 animate__animated animate__fadeIn">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Link to Assigned KRA</label>
                                                    <select
                                                        value={selectedKraId}
                                                        onChange={(e) => setSelectedKraId(e.target.value)}
                                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                                        required
                                                    >
                                                        <option value="">-- Choose Assigned KRA --</option>
                                                        {employeeKras.map(k => (
                                                            <option key={k.id} value={k.id}>{k.kra_title}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Task Title</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Optimize API response times"
                                                        required
                                                        value={taskTitle}
                                                        onChange={(e) => setTaskTitle(e.target.value)}
                                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Priority</label>
                                                    <select
                                                        value={taskPriority}
                                                        onChange={(e) => setTaskPriority(e.target.value)}
                                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                                    >
                                                        <option value="low">Low</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="high">High</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Task Deadline</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={taskDeadline}
                                                        onChange={(e) => setTaskDeadline(e.target.value)}
                                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Define KPIs & Details</label>
                                                    <button type="button" onClick={() => setShowCreateKpi(s => !s)} className="text-[10px] font-black text-teal-600 dark:text-teal-400 hover:underline">
                                                        {showCreateKpi ? '× Cancel' : '＋ New KPI'}
                                                    </button>
                                                </div>

                                                {/* Pick from KPI library (filtered to employee department) */}
                                                <select
                                                    value={selectedKpiId}
                                                    onChange={(e) => appendKpiToDetails(e.target.value)}
                                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none mb-2"
                                                >
                                                    <option value="">＋ Add KPI from library...</option>
                                                    {deptKpis.map(k => (
                                                        <option key={k.id} value={k.id}>
                                                            {k.name}{k.target_value ? ` (Target: ${k.target_value}${k.measurement_unit ? ' ' + k.measurement_unit : ''})` : ''}
                                                        </option>
                                                    ))}
                                                </select>

                                                {showCreateKpi && (
                                                    <div className="bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-900/40 p-3 rounded-2xl space-y-2 mb-2 animate__animated animate__fadeIn">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">Create New KPI</span>
                                                        <input type="text" placeholder="KPI name e.g. First Response Time"
                                                            value={newKpiName} onChange={(e) => setNewKpiName(e.target.value)}
                                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input type="text" placeholder="Target e.g. < 2"
                                                                value={newKpiTarget} onChange={(e) => setNewKpiTarget(e.target.value)}
                                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                            <input type="text" placeholder="Unit e.g. hours, %, count"
                                                                value={newKpiUnit} onChange={(e) => setNewKpiUnit(e.target.value)}
                                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none" />
                                                        </div>
                                                        <select value={newKpiKra} onChange={(e) => setNewKpiKra(e.target.value)}
                                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none">
                                                            <option value="">Link to KRA (optional)</option>
                                                            {masterKras.map(k => (<option key={k.id} value={k.id}>{k.title}</option>))}
                                                        </select>
                                                        <div>
                                                            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Department(s) — Ctrl/Cmd-click for multiple (leave empty = all)</label>
                                                            <select multiple value={newKpiDepts.map(String)} onChange={(e) => setNewKpiDepts(readDeptSelection(e))}
                                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none h-24">
                                                                {departments.map(d => (<option key={d.id} value={d.id}>{d.department_name}</option>))}
                                                            </select>
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <button type="button" onClick={handleCreateKpi} disabled={!newKpiName.trim()}
                                                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-[10px] font-bold">
                                                                Save KPI
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <textarea
                                                    placeholder="Specify measurable KPIs e.g. KPI 1: Response time < 200ms; KPI 2: Zero database locks... (or pick from library above)"
                                                    value={taskKPIs}
                                                    onChange={(e) => setTaskKPIs(e.target.value)}
                                                    rows={3}
                                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none resize-none"
                                                />
                                            </div>

                                            <div className="flex justify-end pt-1">
                                                <button
                                                    type="submit"
                                                    disabled={!selectedKraId || !taskTitle || !taskDeadline}
                                                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/10 transition duration-300"
                                                >
                                                    Create Task & KPIs
                                                </button>
                                            </div>
                                        </form>

                                        {/* Task list grouping */}
                                        <div className="overflow-y-auto max-h-[220px] border border-gray-100 dark:border-gray-800 rounded-2xl">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 dark:bg-gray-800/40 text-[9px] font-black uppercase text-gray-400 tracking-wider">
                                                        <th className="p-3 pl-4">Task & Linked KRA</th>
                                                        <th className="p-3">Priority</th>
                                                        <th className="p-3">KPIs / Description</th>
                                                        <th className="p-3">Status</th>
                                                        <th className="p-3">Deadline</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    {loadingTasks ? (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-5 text-gray-400">Loading tasks...</td>
                                                        </tr>
                                                    ) : kraTasks.map((t) => (
                                                        <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                                                            <td className="p-3 pl-4">
                                                                <span className="block font-bold text-gray-800 dark:text-white leading-tight">{t.title}</span>
                                                                <span className="block text-[8px] text-teal-600 dark:text-teal-400 mt-0.5 font-bold uppercase">{t.kra_title}</span>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                                    t.priority === 'high' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-slate-100 text-slate-800'
                                                                }`}>
                                                                    {t.priority}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 max-w-xs truncate">{t.description || 'No KPIs defined'}</td>
                                                            <td className="p-3">
                                                                <span className="font-extrabold uppercase text-[8px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                                                                    {t.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 font-semibold text-gray-400">{t.deadline}</td>
                                                        </tr>
                                                    ))}
                                                    {!loadingTasks && kraTasks.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-5 text-gray-400 italic">No tasks linked to KRAs.</td>
                                                        </tr>
                                                    )}
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
        </div>
    );
};

export default KRAsAssign;
