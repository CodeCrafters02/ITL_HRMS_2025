import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconX from '../../../components/Icon/IconX';
import { LearningPathType } from './LearningPath';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const ASSIGNMENTS_API = `${API_BASE_URL}/employee/learning-path-assignments/`;
const PATHS_API = `${API_BASE_URL}/employee/learning-paths/`;
const EMPLOYEES_API = `${API_BASE_URL}/employee/trainer-profiles/employee-options/`;

type AssignmentType = {
    id: number;
    learning_path: number;
    learning_path_title: string;
    employee: number;
    employee_name: string;
    employee_id: string;
    employee_email: string;
    employee_designation?: string | null;
    employee_department?: string | null;
    assigned_by_name?: string | null;
    assigned_at: string;
};

type EmployeeOption = {
    id: number;
    full_name: string;
    designation_name?: string;
    department_name?: string;
};

const LearningPathAssignment = () => {
    const dispatch = useDispatch();
    const [assignments, setAssignments] = useState<AssignmentType[]>([]);
    const [paths, setPaths] = useState<LearningPathType[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [search, setSearch] = useState('');
    const [filterPath, setFilterPath] = useState('all');

    // Assign Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPath, setSelectedPath] = useState('');
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Learning Path Assignments'));
        fetchAssignments();
        fetchPaths();
        fetchEmployees();
    }, [dispatch]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const response = await fetch(ASSIGNMENTS_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setAssignments(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching path assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaths = async () => {
        try {
            const response = await fetch(PATHS_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setPaths(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching paths:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch(EMPLOYEES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data || []);
            }
        } catch (error) {
            console.error('Error fetching active employees:', error);
        }
    };

    const filteredAssignments = useMemo(() => {
        return assignments.filter((a) => {
            const matchesSearch =
                a.employee_name.toLowerCase().includes(search.toLowerCase()) ||
                a.employee_id.toLowerCase().includes(search.toLowerCase()) ||
                a.learning_path_title.toLowerCase().includes(search.toLowerCase());

            const matchesPath = filterPath === 'all' || String(a.learning_path) === filterPath;

            return matchesSearch && matchesPath;
        });
    }, [assignments, search, filterPath]);

    const filteredEmployeesForModal = useMemo(() => {
        return employees.filter((emp) => {
            return (
                emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                (emp.department_name || '').toLowerCase().includes(employeeSearch.toLowerCase()) ||
                (emp.designation_name || '').toLowerCase().includes(employeeSearch.toLowerCase())
            );
        });
    }, [employees, employeeSearch]);

    const openAssignModal = () => {
        setSelectedPath('');
        setSelectedEmployees([]);
        setEmployeeSearch('');
        setModalOpen(true);
    };

    const handleEmployeeToggle = (empId: number) => {
        if (selectedEmployees.includes(empId)) {
            setSelectedEmployees(selectedEmployees.filter((id) => id !== empId));
        } else {
            setSelectedEmployees([...selectedEmployees, empId]);
        }
    };

    const handleSelectAllEmployees = () => {
        const visibleIds = filteredEmployeesForModal.map((emp) => emp.id);
        const allSelected = visibleIds.every((id) => selectedEmployees.includes(id));

        if (allSelected) {
            setSelectedEmployees(selectedEmployees.filter((id) => !visibleIds.includes(id)));
        } else {
            const union = Array.from(new Set([...selectedEmployees, ...visibleIds]));
            setSelectedEmployees(union);
        }
    };

    const handleAssign = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedPath) {
            Swal.fire('Error', 'Please select a learning path.', 'error');
            return;
        }
        if (selectedEmployees.length === 0) {
            Swal.fire('Error', 'Please select at least one employee.', 'error');
            return;
        }

        setSaving(true);
        let successCount = 0;
        let errorMessages: string[] = [];

        try {
            // DRF creates one-by-one; loop through selected employees
            for (const empId of selectedEmployees) {
                const payload = {
                    learning_path: Number(selectedPath),
                    employee: empId,
                };

                const response = await fetch(ASSIGNMENTS_API, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    successCount++;
                } else {
                    const err = await response.json().catch(() => null);
                    const name = employees.find(e => e.id === empId)?.full_name || `ID ${empId}`;
                    const reason = err ? Object.values(err).flat().join(' ') : 'Unknown issue';
                    errorMessages.push(`${name}: ${reason}`);
                }
            }

            if (successCount > 0) {
                Swal.fire({
                    title: 'Completed!',
                    text: `Successfully assigned path to ${successCount} employee(s).` + 
                        (errorMessages.length ? ` (${errorMessages.length} errors)` : ''),
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setModalOpen(false);
                fetchAssignments();
            } else {
                Swal.fire({
                    title: 'Failure!',
                    html: `Failed to assign path:<br/><div class="text-left text-xs text-red-500 mt-2 max-h-40 overflow-y-auto">${errorMessages.join('<br/>')}</div>`,
                    icon: 'error',
                });
            }
        } catch {
            Swal.fire('Error!', 'Failed to contact API server.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRevoke = async (assignment: AssignmentType) => {
        const result = await Swal.fire({
            title: 'Revoke Assignment?',
            text: `Revoke "${assignment.learning_path_title}" assignment from ${assignment.employee_name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Revoke',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`${ASSIGNMENTS_API}${assignment.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire('Revoked!', 'Assignment has been revoked.', 'success');
                fetchAssignments();
            } else {
                Swal.fire('Error!', 'Could not revoke assignment.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        }
    };

    return (
        <div>
            {/* Control Filters panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-72"
                            placeholder="Search employee or path..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <select
                        className="form-select w-56"
                        value={filterPath}
                        onChange={(e) => setFilterPath(e.target.value)}
                    >
                        <option value="all">All Learning Paths</option>
                        {paths.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openAssignModal}>
                    <IconPlus /> Assign Path
                </button>
            </div>

            {/* Table layout */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading assignments...</span>
                </div>
            ) : filteredAssignments.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">No learning path assignments found.</div>
            ) : (
                <div className="panel p-0 border-0 overflow-hidden shadow-md">
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>ID</th>
                                    <th>Department & Designation</th>
                                    <th>Learning Path</th>
                                    <th>Assigned By</th>
                                    <th>Assigned Date</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAssignments.map((a) => (
                                    <tr key={a.id}>
                                        <td>
                                            <div className="font-semibold text-gray-800 dark:text-gray-200">
                                                {a.employee_name}
                                            </div>
                                            <span className="text-xs text-gray-400 truncate max-w-[150px] block">{a.employee_email}</span>
                                        </td>
                                        <td className="font-bold text-gray-500 text-xs">{a.employee_id}</td>
                                        <td>
                                            <span className="font-semibold text-sm">
                                                {a.employee_department || 'No Dept'}
                                            </span>
                                            {a.employee_designation && (
                                                <span className="text-xs text-gray-400 block mt-0.5">{a.employee_designation}</span>
                                            )}
                                        </td>
                                        <td className="font-extrabold text-primary">{a.learning_path_title}</td>
                                        <td className="text-xs">{a.assigned_by_name || 'System'}</td>
                                        <td className="text-xs">
                                            {new Date(a.assigned_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </td>
                                        <td className="text-center">
                                            <button
                                                type="button"
                                                className="text-danger hover:text-danger-dark p-2"
                                                onClick={() => handleRevoke(a)}
                                                title="Revoke Assignment"
                                            >
                                                <IconTrashLines className="w-4.5 h-4.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Assign Path Modal */}
            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Assign Learning Path
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleAssign} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block">Choose Learning Path <span className="text-danger">*</span></label>
                                                <select className="form-select rounded-lg" required value={selectedPath} onChange={(e) => setSelectedPath(e.target.value)}>
                                                    <option value="">-- Choose Path --</option>
                                                    {paths.map(p => (
                                                        <option key={p.id} value={p.id}>{p.title} ({p.courses_count || 0} courses)</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="font-semibold mb-1 block">Select Employees <span className="text-danger">*</span></label>
                                                <div className="relative mb-2">
                                                    <input
                                                        type="text"
                                                        className="form-input pr-10 py-1.5 text-xs rounded-lg"
                                                        placeholder="Filter employees..."
                                                        value={employeeSearch}
                                                        onChange={(e) => setEmployeeSearch(e.target.value)}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                        <IconSearch className="w-3.5 h-3.5" />
                                                    </span>
                                                </div>

                                                <div className="border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg p-3 max-h-56 overflow-y-auto bg-gray-50 dark:bg-[#0e1726]/30 space-y-2">
                                                    {filteredEmployeesForModal.length > 0 && (
                                                        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                                                            <button
                                                                type="button"
                                                                className="text-xs font-bold text-primary hover:underline"
                                                                onClick={handleSelectAllEmployees}
                                                            >
                                                                {filteredEmployeesForModal.map(e => e.id).every(id => selectedEmployees.includes(id)) 
                                                                    ? 'Deselect All Visible' 
                                                                    : 'Select All Visible'}
                                                            </button>
                                                            <span className="text-[10px] text-gray-400 font-semibold">{selectedEmployees.length} selected</span>
                                                        </div>
                                                    )}

                                                    {filteredEmployeesForModal.length === 0 ? (
                                                        <div className="text-center py-4 text-xs text-gray-400 italic">No employees found.</div>
                                                    ) : (
                                                        filteredEmployeesForModal.map((emp) => (
                                                            <label key={emp.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer py-1 hover:bg-gray-100 dark:hover:bg-gray-800/40 px-1 rounded transition select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-checkbox"
                                                                    checked={selectedEmployees.includes(emp.id)}
                                                                    onChange={() => handleEmployeeToggle(emp.id)}
                                                                />
                                                                <div className="flex-1">
                                                                    <span className="font-semibold text-gray-850 dark:text-gray-250">{emp.full_name}</span>
                                                                    <span className="text-gray-400 ml-1">
                                                                        ({emp.designation_name || 'No Designation'} • {emp.department_name || 'No Dept'})
                                                                    </span>
                                                                </div>
                                                            </label>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5 shadow-md" disabled={saving}>
                                                    {saving ? 'Assigning...' : `Assign to ${selectedEmployees.length} Employee(s)`}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default LearningPathAssignment;
