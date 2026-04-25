import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import IconEye from '../../components/Icon/IconEye';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/employee/`;

type EmployeeRecord = {
    id: number;
    employee_id?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    email?: string;
    mobile?: string;
    is_active?: boolean;
    department_name?: string;
    designation_name?: string;
    level_name?: string;
    gender?: string;
    date_of_birth?: string;
    temporary_address?: string;
    permanent_address?: string;
    photo?: string | null;
    aadhar_no?: string | null;
    aadhar_card?: string | null;
    pan_no?: string | null;
    pan_card?: string | null;
    guardian_name?: string | null;
    guardian_mobile?: string | null;
    category?: string | null;
    company?: number | null;
    department?: number | null;
    designation?: number | null;
    level?: number | null;
    reporting_manager?: number | null;
    reporting_level_name?: string | null;
    reporting_manager_name?: string | null;
    payment_method?: string | null;
    account_no?: string | null;
    ifsc_code?: string | null;
    bank_name?: string | null;
    source_of_employment?: string | null;
    who_referred?: string | null;
    date_of_joining?: string | null;
    previous_employer?: string | null;
    date_of_releaving?: string | null;
    previous_designation_name?: string | null;
    previous_salary?: string | number | null;
    basic_salary?: string | number | null;
    ctc?: string | number | null;
    gross_salary?: string | number | null;
    epf_status?: string | null;
    uan?: string | null;
    esic_status?: string | null;
    esic_no?: string | null;
    company_name?: string | null;
};

type DepartmentOption = {
    id: number;
    department_name: string;
};

type DesignationOption = {
    id: number;
    designation_name: string;
    department?: number | null;
    level?: number | null;
    basic_pay?: string | number;
};

type LevelOption = {
    id: number;
    level_name: string;
};

const AdminEmployeeRegister = () => {
    const dispatch = useDispatch();
    const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [savingCreate, setSavingCreate] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        password: '',
        gender: '',
        email: '',
        mobile: '',
        date_of_birth: '',
        temporary_address: '',
        permanent_address: '',
        department: '',
        designation: '',
        level: '',
        reporting_manager: '',
        date_of_joining: '',
        aadhar_no: '',
        pan_no: '',
        guardian_name: '',
        guardian_mobile: '',
        category: '',
        payment_method: '',
        account_no: '',
        ifsc_code: '',
        bank_name: '',
        previous_employer: '',
        previous_designation_name: '',
        previous_salary: '',
        basic_salary: '',
        ctc: '',
        gross_salary: '',
        epf_status: '',
        uan: '',
        esic_status: '',
        esic_no: '',
        source_of_employment: '',
        who_referred: '',
    });
    const [files, setFiles] = useState<{
        photo: File | null;
        aadhar_card: File | null;
        pan_card: File | null;
    }>({
        photo: null,
        aadhar_card: null,
        pan_card: null,
    });
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [designations, setDesignations] = useState<DesignationOption[]>([]);
    const [levels, setLevels] = useState<LevelOption[]>([]);
    const [allEmployees, setAllEmployees] = useState<{ id: number; full_name: string; level?: number }[]>([]);
    const [adminCompanyName, setAdminCompanyName] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Employee Register'));
        fetchDependencies();
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchEmployees();
        }, 400);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, page, pageSize]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (search.trim()) url.searchParams.append('search', search.trim());

            const res = await fetch(url.toString(), { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setEmployees(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.max(1, Math.ceil(data.count / pageSize)));
                } else {
                    setEmployees(data);
                    setTotalCount(Array.isArray(data) ? data.length : 0);
                    setTotalPages(1);
                }
            }
        } catch (e) {
            console.error('Error fetching employees', e);
        } finally {
            setLoading(false);
        }
    };

    const displayEmployees = useMemo(() => employees, [employees]);
    const photoUrl = selectedEmployee?.photo ? (String(selectedEmployee.photo).startsWith('http') ? selectedEmployee.photo : `${API_BASE_URL}${selectedEmployee.photo}`) : null;
    const aadharUrl = selectedEmployee?.aadhar_card ? (String(selectedEmployee.aadhar_card).startsWith('http') ? selectedEmployee.aadhar_card : `${API_BASE_URL}${selectedEmployee.aadhar_card}`) : null;
    const panUrl = selectedEmployee?.pan_card ? (String(selectedEmployee.pan_card).startsWith('http') ? selectedEmployee.pan_card : `${API_BASE_URL}${selectedEmployee.pan_card}`) : null;

    const filteredDesignations = useMemo(() => {
        if (!formData.department) return designations;
        return designations.filter((designation) => String(designation.department ?? '') === formData.department);
    }, [designations, formData.department]);

    const selectedDesignation = designations.find((d) => String(d.id) === formData.designation);

    const fetchDependencies = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const [profileRes, depRes, desRes, levelRes] = await Promise.all([
                fetch(`${API_BASE_URL}/app/profile/`, { headers }),
                fetch(`${API_BASE_URL}/app/departments/?page_size=1000`, { headers }),
                fetch(`${API_BASE_URL}/app/designations/?page_size=1000`, { headers }),
                fetch(`${API_BASE_URL}/app/levels/?page_size=1000`, { headers }),
            ]);

            if (profileRes.ok) {
                const profileData = await profileRes.json();
                setAdminCompanyName(profileData.company_name || '');
            }
            if (depRes.ok) {
                const depData = await depRes.json();
                setDepartments(depData.results || depData);
            }
            if (desRes.ok) {
                const desData = await desRes.json();
                setDesignations(desData.results || desData);
            }
            if (levelRes.ok) {
                const levelData = await levelRes.json();
                setLevels(levelData.results || levelData);
            }

            // Fetch all employees (including admins) for manager dropdown
            const empRes = await fetch(`${API_URL}?page_size=1000&include_admins=true`, { headers });
            if (empRes.ok) {
                const empData = await empRes.json();
                const list = (empData.results || empData).map((e: any) => ({
                    id: e.id,
                    full_name: [e.first_name, e.last_name].filter(Boolean).join(' '),
                    level: e.level,
                }));
                setAllEmployees(list);
            }
        } catch (e) {
            console.error('Error fetching dependencies', e);
        }
    };

    useEffect(() => {
        if (!createModalOpen) return;

        setFormData((prev) => {
            const nextDepartment = prev.department || (departments[0] ? String(departments[0].id) : '');
            const employeeDesignation =
                designations.find((d) => String(d.department ?? '') === nextDepartment && d.designation_name?.toLowerCase() === 'employee') ||
                designations.find((d) => String(d.department ?? '') === nextDepartment) ||
                designations.find((d) => d.designation_name?.toLowerCase() === 'employee') ||
                designations[0];
            const nextDesignation = prev.designation || (employeeDesignation ? String(employeeDesignation.id) : '');
            const nextLevel = prev.level || (employeeDesignation?.level ? String(employeeDesignation.level) : levels[0] ? String(levels[0].id) : '');

            return {
                ...prev,
                department: nextDepartment,
                designation: nextDesignation,
                level: nextLevel,
            };
        });
    }, [createModalOpen, departments, designations, levels]);

    useEffect(() => {
        if (!formData.department) return;
        if (!formData.designation) return;

        const designationStillValid = filteredDesignations.some((designation) => String(designation.id) === formData.designation);
        if (designationStillValid) return;

        const fallbackDesignation =
            filteredDesignations.find((designation) => designation.designation_name?.toLowerCase() === 'employee') || filteredDesignations[0];

        setFormData((prev) => ({
            ...prev,
            designation: fallbackDesignation ? String(fallbackDesignation.id) : '',
            level: fallbackDesignation?.level ? String(fallbackDesignation.level) : '',
        }));
    }, [filteredDesignations, formData.department, formData.designation]);

    const fetchEmployeeDetails = async (id: number) => {
        try {
            const token = localStorage.getItem('access_token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_URL}${id}/`, { headers });
            if (res.ok) {
                const data = await res.json();
                setSelectedEmployee(data);
                return data as EmployeeRecord;
            }
        } catch (e) {
            console.error('Error fetching employee details', e);
        }
        return null;
    };

    const resetEmployeeForm = () => {
        setFormData({
            first_name: '',
            middle_name: '',
            last_name: '',
            password: '',
            gender: '',
            email: '',
            mobile: '',
            date_of_birth: '',
            temporary_address: '',
            permanent_address: '',
            department: '',
            designation: '',
            level: '',
            reporting_manager: '',
            date_of_joining: '',
            aadhar_no: '',
            pan_no: '',
            guardian_name: '',
            guardian_mobile: '',
            category: '',
            payment_method: '',
            account_no: '',
            ifsc_code: '',
            bank_name: '',
            previous_employer: '',
            previous_designation_name: '',
            previous_salary: '',
            basic_salary: '',
            ctc: '',
            gross_salary: '',
            epf_status: '',
            uan: '',
            esic_status: '',
            esic_no: '',
            source_of_employment: '',
            who_referred: '',
        });
        setFiles({ photo: null, aadhar_card: null, pan_card: null });
    };

    const openProfileModal = async (id: number) => {
        const emp = await fetchEmployeeDetails(id);
        if (emp) setProfileModalOpen(true);
    };

    const openEditModal = async (id: number) => {
        const emp = await fetchEmployeeDetails(id);
        if (!emp) return;
        setFormData({
            first_name: emp.first_name || '',
            middle_name: emp.middle_name || '',
            last_name: emp.last_name || '',
            password: '',
            gender: emp.gender || '',
            email: emp.email || '',
            mobile: emp.mobile || '',
            date_of_birth: emp.date_of_birth || '',
            temporary_address: emp.temporary_address || '',
            permanent_address: emp.permanent_address || '',
            department: emp.department ? String(emp.department) : '',
            designation: emp.designation ? String(emp.designation) : '',
            level: emp.level ? String(emp.level) : '',
            reporting_manager: emp.reporting_manager ? String(emp.reporting_manager) : '',
            date_of_joining: emp.date_of_joining || '',
            aadhar_no: emp.aadhar_no || '',
            pan_no: emp.pan_no || '',
            guardian_name: emp.guardian_name || '',
            guardian_mobile: emp.guardian_mobile || '',
            category: emp.category || '',
            payment_method: emp.payment_method || '',
            account_no: emp.account_no || '',
            ifsc_code: emp.ifsc_code || '',
            bank_name: emp.bank_name || '',
            previous_employer: emp.previous_employer || '',
            previous_designation_name: emp.previous_designation_name || '',
            previous_salary: emp.previous_salary ? String(emp.previous_salary) : '',
            basic_salary: emp.basic_salary ? String(emp.basic_salary) : '',
            ctc: emp.ctc ? String(emp.ctc) : '',
            gross_salary: emp.gross_salary ? String(emp.gross_salary) : '',
            epf_status: emp.epf_status || '',
            uan: emp.uan || '',
            esic_status: emp.esic_status || '',
            esic_no: emp.esic_no || '',
            source_of_employment: emp.source_of_employment || '',
            who_referred: emp.who_referred || '',
        });
        setFiles({ photo: null, aadhar_card: null, pan_card: null });
        setEditModalOpen(true);
    };

    const openCreateModal = () => {
        setSelectedEmployee(null);
        resetEmployeeForm();
        setCreateModalOpen(true);
    };

    const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedEmployee) return;
        setSavingEdit(true);
        try {
            const token = localStorage.getItem('access_token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const payload = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== '') payload.append(key, value);
            });

            if (formData.reporting_manager) {
                const mgr = allEmployees.find(e => String(e.id) === formData.reporting_manager);
                if (mgr?.level) {
                    payload.append('reporting_level', String(mgr.level));
                }
            }
            if (files.photo) payload.append('photo', files.photo);
            if (files.aadhar_card) payload.append('aadhar_card', files.aadhar_card);
            if (files.pan_card) payload.append('pan_card', files.pan_card);

            const res = await fetch(`${API_URL}${selectedEmployee.id}/`, {
                method: 'PATCH',
                headers,
                body: payload,
            });
            if (res.ok) {
                Swal.fire({ title: 'Updated!', text: 'Employee updated successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setEditModalOpen(false);
                await fetchEmployees();
                await fetchEmployeeDetails(selectedEmployee.id);
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to update employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to update employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        } finally {
            setSavingEdit(false);
        }
    };

    const handleCreateEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.email.trim()) {
            Swal.fire({ title: 'Email required', text: 'Email is required for employee registration.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            return;
        }
        if (!formData.password.trim()) {
            Swal.fire({ title: 'Password required', text: 'Password is required for employee registration.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            return;
        }
        setSavingCreate(true);
        try {
            const token = localStorage.getItem('access_token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const payload = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== '') payload.append(key, value);
            });

            if (formData.reporting_manager) {
                const mgr = allEmployees.find(e => String(e.id) === formData.reporting_manager);
                if (mgr?.level) {
                    payload.append('reporting_level', String(mgr.level));
                }
            }
            if (files.photo) payload.append('photo', files.photo);
            if (files.aadhar_card) payload.append('aadhar_card', files.aadhar_card);
            if (files.pan_card) payload.append('pan_card', files.pan_card);

            const res = await fetch(API_URL, {
                method: 'POST',
                headers,
                body: payload,
            });
            if (res.ok) {
                Swal.fire({ title: 'Registered!', text: 'Employee registered successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setCreateModalOpen(false);
                resetEmployeeForm();
                await fetchEmployees();
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to register employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to register employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        } finally {
            setSavingCreate(false);
        }
    };

    const handleDelete = async (emp: EmployeeRecord) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete employee "${emp.employee_id || emp.id}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
            padding: '2em',
        });
        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API_URL}${emp.id}/`, { method: 'DELETE', headers: getHeaders() });
            if (res.ok || res.status === 204) {
                // Optimistic UI update so it feels instant
                setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
                setTotalCount((prev) => Math.max(0, prev - 1));
                Swal.fire({ title: 'Deleted!', text: 'Employee has been deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                // Re-fetch to ensure pagination counts are consistent
                await fetchEmployees();
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to delete employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to delete employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const fullName = (e: EmployeeRecord) => [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(' ') || '-';

    return (
        <div>
            <div className="bg-gradient-to-r from-[#0e1726] to-[#3b82f6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Employee Register</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Browse and manage employee records.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        className="form-input pr-10 w-72"
                        placeholder="Search employees..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <IconSearch className="w-4 h-4" />
                    </span>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openCreateModal}>
                    <IconPlus /> Register Employee
                </button>
            </div>

            <div className="panel p-0 border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Emp ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Status</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-5">
                                        <span className="animate-pulse text-gray-400">Loading employees...</span>
                                    </td>
                                </tr>
                            ) : displayEmployees.length > 0 ? (
                                displayEmployees.map((emp, index) => (
                                    <tr key={emp.id}>
                                        <td>{(page - 1) * pageSize + index + 1}</td>
                                        <td className="font-mono text-xs font-bold text-primary">{emp.employee_id || '-'}</td>
                                        <td className="font-semibold">{fullName(emp)}</td>
                                        <td className="text-gray-500">{emp.email || '-'}</td>
                                        <td className="text-gray-500">{emp.mobile || '-'}</td>
                                        <td className="text-gray-500">{emp.department_name || '-'}</td>
                                        <td className="text-gray-500">{emp.designation_name || '-'}</td>
                                        <td>
                                            <span className={`badge ${emp.is_active ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                                {emp.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    type="button"
                                                    className="text-info hover:text-cyan-700"
                                                    onClick={() => openProfileModal(emp.id)}
                                                    title="View Profile"
                                                >
                                                    <IconEye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="text-primary hover:text-blue-700"
                                                    onClick={() => openEditModal(emp.id)}
                                                    title="Edit"
                                                >
                                                    <IconPencil className="w-5 h-5" />
                                                </button>
                                                <button type="button" className="text-danger hover:text-red-700" onClick={() => handleDelete(emp)} title="Delete">
                                                    <IconTrashLines className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-5 text-gray-400">No employees found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalCount > 0 && (
                    <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                                Showing <span className="text-primary">{(page - 1) * pageSize + 1}</span> to <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-primary">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Per page:</span>
                                <select
                                    className="form-select w-20 text-sm font-semibold py-1"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>
                        <ul className="inline-flex items-center space-x-1 font-semibold">
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    Prev
                                </button>
                            </li>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <li key={p}>
                                    <button
                                        type="button"
                                        className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${page === p ? 'bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]' : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'}`}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </button>
                                </li>
                            ))}
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            <Transition appear show={profileModalOpen} as={Fragment}>
                <Dialog as="div" open={profileModalOpen} onClose={() => setProfileModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-5xl text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setProfileModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        Employee Profile
                                    </div>
                                    <div className="p-5 max-h-[80vh] overflow-y-auto">
                                        {selectedEmployee && (
                                            <div className="space-y-6">
                                                <div className="flex flex-wrap items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-[#191e3a] flex items-center justify-center">
                                                            {photoUrl ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-gray-400">No Image</span>}
                                                        </div>
                                                        <div>
                                                            <div className="text-xl font-bold">{fullName(selectedEmployee)}</div>
                                                        </div>
                                                    </div>
                                                    <button type="button" className="btn btn-primary" onClick={() => { setProfileModalOpen(false); openEditModal(selectedEmployee.id); }}>
                                                        Edit Employee
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="panel">
                                                        <div className="text-lg font-bold mb-4">Basic Details</div>
                                                        <div className="space-y-2 text-sm">
                                                            <div><span className="font-semibold">Email:</span> {selectedEmployee.email || '-'}</div>
                                                            <div><span className="font-semibold">Mobile:</span> {selectedEmployee.mobile || '-'}</div>
                                                            <div><span className="font-semibold">Gender:</span> {selectedEmployee.gender || '-'}</div>
                                                            <div><span className="font-semibold">DOB:</span> {selectedEmployee.date_of_birth || '-'}</div>
                                                            <div><span className="font-semibold">Category:</span> {selectedEmployee.category || '-'}</div>
                                                            <div><span className="font-semibold">Status:</span> {selectedEmployee.is_active ? 'Active' : 'Inactive'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="panel">
                                                        <div className="text-lg font-bold mb-4">Organization</div>
                                                        <div className="space-y-2 text-sm">
                                                            <div><span className="font-semibold">Department:</span> {selectedEmployee.department_name || '-'}</div>
                                                            <div><span className="font-semibold">Designation:</span> {selectedEmployee.designation_name || '-'}</div>
                                                            <div><span className="font-semibold">Level:</span> {selectedEmployee.level_name || '-'}</div>
                                                            <div><span className="font-semibold">Reporting Level:</span> {selectedEmployee.reporting_level_name || '-'}</div>
                                                            <div><span className="font-semibold">Reporting Manager:</span> {selectedEmployee.reporting_manager_name || '-'}</div>
                                                            <div><span className="font-semibold">Joining Date:</span> {selectedEmployee.date_of_joining || '-'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="panel">
                                                        <div className="text-lg font-bold mb-4">Address & Family</div>
                                                        <div className="space-y-2 text-sm">
                                                            <div><span className="font-semibold">Temporary Address:</span> {selectedEmployee.temporary_address || '-'}</div>
                                                            <div><span className="font-semibold">Permanent Address:</span> {selectedEmployee.permanent_address || '-'}</div>
                                                            <div><span className="font-semibold">Guardian Name:</span> {selectedEmployee.guardian_name || '-'}</div>
                                                            <div><span className="font-semibold">Guardian Mobile:</span> {selectedEmployee.guardian_mobile || '-'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="panel">
                                                        <div className="text-lg font-bold mb-4">Documents</div>
                                                        <div className="space-y-2 text-sm">
                                                            <div><span className="font-semibold">Aadhar No:</span> {selectedEmployee.aadhar_no || '-'}</div>
                                                            <div>
                                                                <span className="font-semibold">Aadhar Card:</span>{' '}
                                                                {aadharUrl ? <a className="text-primary underline" href={aadharUrl} target="_blank" rel="noreferrer">View / Download</a> : '-'}
                                                            </div>
                                                            <div><span className="font-semibold">PAN No:</span> {selectedEmployee.pan_no || '-'}</div>
                                                            <div>
                                                                <span className="font-semibold">PAN Card:</span>{' '}
                                                                {panUrl ? <a className="text-primary underline" href={panUrl} target="_blank" rel="noreferrer">View / Download</a> : '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="panel">
                                                        <div className="text-lg font-bold mb-4">Bank & Payment</div>
                                                        <div className="space-y-2 text-sm">
                                                            <div><span className="font-semibold">Payment Method:</span> {selectedEmployee.payment_method || '-'}</div>
                                                            <div><span className="font-semibold">Bank Name:</span> {selectedEmployee.bank_name || '-'}</div>
                                                            <div><span className="font-semibold">Account No:</span> {selectedEmployee.account_no || '-'}</div>
                                                            <div><span className="font-semibold">IFSC:</span> {selectedEmployee.ifsc_code || '-'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="panel">
                                                        <div className="text-lg font-bold mb-4">Employment Details</div>
                                                        <div className="space-y-2 text-sm">
                                                            <div><span className="font-semibold">Previous Employer:</span> {selectedEmployee.previous_employer || '-'}</div>
                                                            <div><span className="font-semibold">Previous Designation:</span> {selectedEmployee.previous_designation_name || '-'}</div>
                                                            <div><span className="font-semibold">Previous Salary:</span> {selectedEmployee.previous_salary || '-'}</div>
                                                            <div><span className="font-semibold">Basic Salary:</span> {selectedEmployee.basic_salary || '-'}</div>
                                                            <div><span className="font-semibold">CTC:</span> {selectedEmployee.ctc || '-'}</div>
                                                            <div><span className="font-semibold">Gross Salary:</span> {selectedEmployee.gross_salary || '-'}</div>
                                                            <div><span className="font-semibold">EPF / UAN:</span> {selectedEmployee.epf_status || '-'} / {selectedEmployee.uan || '-'}</div>
                                                            <div><span className="font-semibold">ESIC / No:</span> {selectedEmployee.esic_status || '-'} / {selectedEmployee.esic_no || '-'}</div>
                                                            <div><span className="font-semibold">Source / Referred:</span> {selectedEmployee.source_of_employment || '-'} / {selectedEmployee.who_referred || '-'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={editModalOpen} as={Fragment}>
                <Dialog as="div" open={editModalOpen} onClose={() => setEditModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-5xl text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setEditModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        Edit Employee
                                    </div>
                                    <div className="p-5 max-h-[80vh] overflow-y-auto">
                                        <form onSubmit={handleSaveEdit} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div><label className="font-semibold mb-1 block">First Name</label><input className="form-input" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Middle Name</label><input className="form-input" value={formData.middle_name} onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Last Name</label><input className="form-input" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Gender</label>
                                                    <select className="form-select" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                                        <option value="">Select</option>
                                                        <option value="male">male</option>
                                                        <option value="female">female</option>
                                                        <option value="other">other</option>
                                                    </select>
                                                </div>
                                                <div><label className="font-semibold mb-1 block">DOB</label><input type="date" className="form-input" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Email</label><input className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Mobile</label><input className="form-input" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Company</label>
                                                    <input className="form-input bg-[#f5f5f5] dark:bg-[#1b2e4b]" value={selectedEmployee?.company_name || adminCompanyName || 'Current admin company'} readOnly />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Role</label>
                                                    <input className="form-input bg-[#f5f5f5] dark:bg-[#1b2e4b]" value="Employee" readOnly />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Department</label>
                                                    <select
                                                        className="form-select"
                                                        value={formData.department}
                                                        onChange={(e) => {
                                                            const nextDepartment = e.target.value;
                                                            const nextDesignation =
                                                                designations.find((d) => String(d.department ?? '') === nextDepartment && String(d.id) === formData.designation) ||
                                                                designations.find((d) => String(d.department ?? '') === nextDepartment && d.designation_name?.toLowerCase() === 'employee') ||
                                                                designations.find((d) => String(d.department ?? '') === nextDepartment);

                                                            setFormData({
                                                                ...formData,
                                                                department: nextDepartment,
                                                                designation: nextDesignation ? String(nextDesignation.id) : '',
                                                                level: nextDesignation?.level ? String(nextDesignation.level) : '',
                                                                basic_salary: nextDesignation?.basic_pay ? String(nextDesignation.basic_pay) : formData.basic_salary,
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Select</option>
                                                        {departments.map((d) => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Designation</label>
                                                    <select
                                                        className="form-select"
                                                        value={formData.designation}
                                                        onChange={(e) => {
                                                            const nextDesignationId = e.target.value;
                                                            const des = filteredDesignations.find((d) => String(d.id) === nextDesignationId);
                                                            setFormData({
                                                                ...formData,
                                                                designation: nextDesignationId,
                                                                department: des?.department ? String(des.department) : formData.department,
                                                                level: des?.level ? String(des.level) : formData.level,
                                                                basic_salary: des?.basic_pay ? String(des.basic_pay) : formData.basic_salary,
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Select</option>
                                                        {filteredDesignations.map((d) => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Level</label>
                                                    <select className="form-select" value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })}>
                                                        <option value="">Select</option>
                                                        {levels.map((l) => <option key={l.id} value={l.id}>{l.level_name}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Reporting Manager</label>
                                                    <select className="form-select" value={formData.reporting_manager} onChange={(e) => setFormData({ ...formData, reporting_manager: e.target.value })}>
                                                        <option value="">Select Manager (Optional)</option>
                                                        {allEmployees.filter(emp => emp.id !== selectedEmployee?.id).map((emp) => (
                                                            <option key={emp.id} value={emp.id}>
                                                                {emp.full_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label className="font-semibold mb-1 block">Temporary Address</label><input className="form-input" value={formData.temporary_address} onChange={(e) => setFormData({ ...formData, temporary_address: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Permanent Address</label><input className="form-input" value={formData.permanent_address} onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div><label className="font-semibold mb-1 block">Joining Date</label><input type="date" className="form-input" value={formData.date_of_joining} onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Aadhar No</label><input className="form-input" value={formData.aadhar_no} onChange={(e) => setFormData({ ...formData, aadhar_no: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">PAN No</label><input className="form-input" value={formData.pan_no} onChange={(e) => setFormData({ ...formData, pan_no: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Category</label><input className="form-input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label className="font-semibold mb-1 block">Guardian Name</label><input className="form-input" value={formData.guardian_name} onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Guardian Mobile</label><input className="form-input" value={formData.guardian_mobile} onChange={(e) => setFormData({ ...formData, guardian_mobile: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div><label className="font-semibold mb-1 block">Payment Method</label><input className="form-input" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Account No</label><input className="form-input" value={formData.account_no} onChange={(e) => setFormData({ ...formData, account_no: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">IFSC</label><input className="form-input" value={formData.ifsc_code} onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Bank Name</label><input className="form-input" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div><label className="font-semibold mb-1 block">Previous Employer</label><input className="form-input" value={formData.previous_employer} onChange={(e) => setFormData({ ...formData, previous_employer: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Previous Designation</label><input className="form-input" value={formData.previous_designation_name} onChange={(e) => setFormData({ ...formData, previous_designation_name: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Previous Salary</label><input className="form-input" value={formData.previous_salary} onChange={(e) => setFormData({ ...formData, previous_salary: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Basic Salary</label><input className="form-input" value={formData.basic_salary} onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">CTC</label><input className="form-input" value={formData.ctc} onChange={(e) => setFormData({ ...formData, ctc: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div><label className="font-semibold mb-1 block">Gross Salary</label><input className="form-input" value={formData.gross_salary} onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">EPF Status</label><input className="form-input" value={formData.epf_status} onChange={(e) => setFormData({ ...formData, epf_status: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">UAN</label><input className="form-input" value={formData.uan} onChange={(e) => setFormData({ ...formData, uan: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">ESIC Status</label><input className="form-input" value={formData.esic_status} onChange={(e) => setFormData({ ...formData, esic_status: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div><label className="font-semibold mb-1 block">ESIC No</label><input className="form-input" value={formData.esic_no} onChange={(e) => setFormData({ ...formData, esic_no: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Source of Employment</label><input className="form-input" value={formData.source_of_employment} onChange={(e) => setFormData({ ...formData, source_of_employment: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Who Referred</label><input className="form-input" value={formData.who_referred} onChange={(e) => setFormData({ ...formData, who_referred: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Profile Image</label>
                                                    {photoUrl ? (
                                                        <div className="mb-2 flex items-center gap-3">
                                                            <img src={photoUrl} alt="Current profile" className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-[#1b2e4b]" />
                                                            <span className="text-xs text-gray-500">Current image</span>
                                                        </div>
                                                    ) : (
                                                        <div className="mb-2 text-xs text-gray-400">No image uploaded</div>
                                                    )}
                                                    <input type="file" accept="image/*" className="form-input" onChange={(e) => setFiles({ ...files, photo: e.target.files?.[0] || null })} />
                                                    {files.photo && <div className="text-xs text-gray-500 mt-1">Selected: {files.photo.name}</div>}
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Aadhar Card</label>
                                                    {aadharUrl ? (
                                                        <div className="mb-2 text-xs">
                                                            <a className="text-primary underline" href={aadharUrl} target="_blank" rel="noreferrer">
                                                                View current Aadhar
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div className="mb-2 text-xs text-gray-400">No Aadhar uploaded</div>
                                                    )}
                                                    <input type="file" className="form-input" onChange={(e) => setFiles({ ...files, aadhar_card: e.target.files?.[0] || null })} />
                                                    {files.aadhar_card && <div className="text-xs text-gray-500 mt-1">Selected: {files.aadhar_card.name}</div>}
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">PAN Card</label>
                                                    {panUrl ? (
                                                        <div className="mb-2 text-xs">
                                                            <a className="text-primary underline" href={panUrl} target="_blank" rel="noreferrer">
                                                                View current PAN
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div className="mb-2 text-xs text-gray-400">No PAN uploaded</div>
                                                    )}
                                                    <input type="file" className="form-input" onChange={(e) => setFiles({ ...files, pan_card: e.target.files?.[0] || null })} />
                                                    {files.pan_card && <div className="text-xs text-gray-500 mt-1">Selected: {files.pan_card.name}</div>}
                                                </div>
                                            </div>

                                            <div className="flex justify-end items-center gap-3 mt-8">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setEditModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                                                    {savingEdit ? 'Saving...' : 'Save Changes'}
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

            <Transition appear show={createModalOpen} as={Fragment}>
                <Dialog as="div" open={createModalOpen} onClose={() => setCreateModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-5xl text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setCreateModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        Register Employee
                                    </div>
                                    <div className="p-5 max-h-[80vh] overflow-y-auto">
                                        <form onSubmit={handleCreateEmployee} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div><label className="font-semibold mb-1 block">First Name</label><input className="form-input" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Middle Name</label><input className="form-input" value={formData.middle_name} onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Last Name</label><input className="form-input" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Gender</label>
                                                    <select className="form-select" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                                        <option value="">Select</option>
                                                        <option value="male">male</option>
                                                        <option value="female">female</option>
                                                        <option value="other">other</option>
                                                    </select>
                                                </div>
                                                <div><label className="font-semibold mb-1 block">DOB</label><input type="date" className="form-input" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Email *</label><input className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
                                                <div><label className="font-semibold mb-1 block">Password *</label><input type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></div>
                                                <div><label className="font-semibold mb-1 block">Mobile</label><input className="form-input" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Company</label>
                                                    <input className="form-input bg-[#f5f5f5] dark:bg-[#1b2e4b]" value={adminCompanyName || 'Current admin company'} readOnly />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Role</label>
                                                    <input className="form-input bg-[#f5f5f5] dark:bg-[#1b2e4b]" value="Employee" readOnly />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Department</label>
                                                    <select
                                                        className="form-select"
                                                        value={formData.department}
                                                        onChange={(e) => {
                                                            const nextDepartment = e.target.value;
                                                            const nextDesignation =
                                                                designations.find((d) => String(d.department ?? '') === nextDepartment && d.designation_name?.toLowerCase() === 'employee') ||
                                                                designations.find((d) => String(d.department ?? '') === nextDepartment);

                                                            setFormData({
                                                                ...formData,
                                                                department: nextDepartment,
                                                                designation: nextDesignation ? String(nextDesignation.id) : '',
                                                                level: nextDesignation?.level ? String(nextDesignation.level) : '',
                                                                basic_salary: nextDesignation?.basic_pay ? String(nextDesignation.basic_pay) : formData.basic_salary,
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Select</option>
                                                        {departments.map((d) => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Designation</label>
                                                    <select
                                                        className="form-select"
                                                        value={formData.designation}
                                                        onChange={(e) => {
                                                            const nextDesignationId = e.target.value;
                                                            const nextDesignation = filteredDesignations.find((d) => String(d.id) === nextDesignationId);
                                                            setFormData({
                                                                ...formData,
                                                                designation: nextDesignationId,
                                                                department: nextDesignation?.department ? String(nextDesignation.department) : formData.department,
                                                                level: nextDesignation?.level ? String(nextDesignation.level) : formData.level,
                                                                basic_salary: nextDesignation?.basic_pay ? String(nextDesignation.basic_pay) : formData.basic_salary,
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Select</option>
                                                        {filteredDesignations.map((d) => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Level</label>
                                                    <select className="form-select" value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })}>
                                                        <option value="">Select</option>
                                                        {levels.map((l) => <option key={l.id} value={l.id}>{l.level_name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            {selectedDesignation && (
                                                <div className="text-xs text-gray-500">
                                                    This designation is fetched from the current admin company.
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Reporting Manager</label>
                                                    <select className="form-select" value={formData.reporting_manager} onChange={(e) => setFormData({ ...formData, reporting_manager: e.target.value })}>
                                                        <option value="">Select Manager (Optional)</option>
                                                        {allEmployees
                                                            .filter(emp => !selectedEmployee || emp.id !== selectedEmployee.id)
                                                            .map((emp) => (
                                                                <option key={emp.id} value={emp.id}>
                                                                    {emp.full_name}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label className="font-semibold mb-1 block">Temporary Address</label><input className="form-input" value={formData.temporary_address} onChange={(e) => setFormData({ ...formData, temporary_address: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Permanent Address</label><input className="form-input" value={formData.permanent_address} onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div><label className="font-semibold mb-1 block">Joining Date</label><input type="date" className="form-input" value={formData.date_of_joining} onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Aadhar No</label><input className="form-input" value={formData.aadhar_no} onChange={(e) => setFormData({ ...formData, aadhar_no: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">PAN No</label><input className="form-input" value={formData.pan_no} onChange={(e) => setFormData({ ...formData, pan_no: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Category</label><input className="form-input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label className="font-semibold mb-1 block">Guardian Name</label><input className="form-input" value={formData.guardian_name} onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Guardian Mobile</label><input className="form-input" value={formData.guardian_mobile} onChange={(e) => setFormData({ ...formData, guardian_mobile: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div><label className="font-semibold mb-1 block">Payment Method</label><input className="form-input" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Account No</label><input className="form-input" value={formData.account_no} onChange={(e) => setFormData({ ...formData, account_no: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">IFSC</label><input className="form-input" value={formData.ifsc_code} onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Bank Name</label><input className="form-input" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div><label className="font-semibold mb-1 block">Previous Employer</label><input className="form-input" value={formData.previous_employer} onChange={(e) => setFormData({ ...formData, previous_employer: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Previous Designation</label><input className="form-input" value={formData.previous_designation_name} onChange={(e) => setFormData({ ...formData, previous_designation_name: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Previous Salary</label><input className="form-input" value={formData.previous_salary} onChange={(e) => setFormData({ ...formData, previous_salary: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Basic Salary</label><input className="form-input" value={formData.basic_salary} onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">CTC</label><input className="form-input" value={formData.ctc} onChange={(e) => setFormData({ ...formData, ctc: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div><label className="font-semibold mb-1 block">Gross Salary</label><input className="form-input" value={formData.gross_salary} onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">EPF Status</label><input className="form-input" value={formData.epf_status} onChange={(e) => setFormData({ ...formData, epf_status: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">UAN</label><input className="form-input" value={formData.uan} onChange={(e) => setFormData({ ...formData, uan: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">ESIC Status</label><input className="form-input" value={formData.esic_status} onChange={(e) => setFormData({ ...formData, esic_status: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div><label className="font-semibold mb-1 block">ESIC No</label><input className="form-input" value={formData.esic_no} onChange={(e) => setFormData({ ...formData, esic_no: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Source of Employment</label><input className="form-input" value={formData.source_of_employment} onChange={(e) => setFormData({ ...formData, source_of_employment: e.target.value })} /></div>
                                                <div><label className="font-semibold mb-1 block">Who Referred</label><input className="form-input" value={formData.who_referred} onChange={(e) => setFormData({ ...formData, who_referred: e.target.value })} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Profile Image</label>
                                                    <input type="file" accept="image/*" className="form-input" onChange={(e) => setFiles({ ...files, photo: e.target.files?.[0] || null })} />
                                                    {files.photo && <div className="text-xs text-gray-500 mt-1">Selected: {files.photo.name}</div>}
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Aadhar Card</label>
                                                    <input type="file" className="form-input" onChange={(e) => setFiles({ ...files, aadhar_card: e.target.files?.[0] || null })} />
                                                    {files.aadhar_card && <div className="text-xs text-gray-500 mt-1">Selected: {files.aadhar_card.name}</div>}
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">PAN Card</label>
                                                    <input type="file" className="form-input" onChange={(e) => setFiles({ ...files, pan_card: e.target.files?.[0] || null })} />
                                                    {files.pan_card && <div className="text-xs text-gray-500 mt-1">Selected: {files.pan_card.name}</div>}
                                                </div>
                                            </div>

                                            <div className="flex justify-end items-center gap-3 mt-8">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary" disabled={savingCreate}>
                                                    {savingCreate ? 'Registering...' : 'Register Employee'}
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

export default AdminEmployeeRegister;

