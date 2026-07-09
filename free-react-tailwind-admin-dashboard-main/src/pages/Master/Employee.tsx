import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';
import IconEdit from '../../components/Icon/IconEdit';
import IconTrash from '../../components/Icon/IconTrash';
import IconEye from '../../components/Icon/IconEye';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/employee/`;
const DEPT_URL = `${API_BASE_URL}/app/departments/?page_size=1000`;
const DESIG_URL = `${API_BASE_URL}/app/designations/?page_size=1000`;
const COMPANY_URL = `${API_BASE_URL}/app/company-with-admin/?page_size=1000`;
const LEVEL_URL = `${API_BASE_URL}/app/levels/?page_size=1000`;
const SHIFT_URL = `${API_BASE_URL}/app/shift-policies/?page_size=1000`;

const MasterEmployee = () => {
    const dispatch = useDispatch();
    const [employees, setEmployees] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [levels, setLevels] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [allEmployees, setAllEmployees] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewEmployee, setViewEmployee] = useState<any>(null);

    // Pagination & Search States
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const initialFormData = {
        first_name: '', middle_name: '', last_name: '', email: '', mobile: '', gender: 'male', date_of_birth: '',
        temporary_address: '', permanent_address: '',
        aadhar_no: '', aadhar_card: null, pan_no: '', pan_card: null, photo: null,
        guardian_name: '', guardian_mobile: '', category: '',
        company: '', department: '', designation: '', level: '',
        reporting_manager: '', reporting_level: '',
        payment_method: '', account_no: '', ifsc_code: '', bank_name: '',
        source_of_employment: '', who_referred: '',
        date_of_joining: '', previous_employer: '', date_of_releaving: '',
        previous_designation_name: '', previous_salary: 0, ctc: 0, gross_salary: 0,
        epf_status: '', uan: '', esic_status: '', esic_no: '',
        shift_assigned: '', is_active: true
    };

    const [formData, setFormData] = useState<any>(initialFormData);

    useEffect(() => {
        dispatch(setPageTitle('Employee Management'));
        fetchDropdownData();
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchEmployees();
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [search, page, pageSize]);

    const fetchDropdownData = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const urls = [COMPANY_URL, DEPT_URL, DESIG_URL, LEVEL_URL, SHIFT_URL, `${API_URL}?page_size=1000`];
            const responses = await Promise.all(urls.map(url => fetch(url, { headers })));
            
            const dataP = await Promise.all(responses.map(res => res.ok ? res.json() : null));
            if (dataP[0]) setCompanies(dataP[0].results || dataP[0]);
            if (dataP[1]) setDepartments(dataP[1].results || dataP[1]);
            if (dataP[2]) setDesignations(dataP[2].results || dataP[2]);
            if (dataP[3]) setLevels(dataP[3].results || dataP[3]);
            if (dataP[4]) setShifts(dataP[4].results || dataP[4]);
            if (dataP[5]) setAllEmployees(dataP[5].results || dataP[5]);

        } catch (error) {
            console.error('Error fetching dropdowns:', error);
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const url = new URL(API_URL);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (search) url.searchParams.append('search', search);

            const response = await fetch(url.toString(), { headers });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setEmployees(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.ceil(data.count / pageSize));
                } else {
                    setEmployees(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: any) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'file') {
            setFormData({ ...formData, [name]: files[0] });
        } else {
            setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
        }
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setEditMode(false);
        setEditId(null);
    };

    const handleEdit = (employee: any) => {
        const mappedData: any = {};
        Object.keys(initialFormData).forEach(key => {
            mappedData[key] = employee[key] !== null && employee[key] !== undefined ? employee[key] : initialFormData[key as keyof typeof initialFormData];
        });
        setFormData(mappedData);
        setEditId(employee.id);
        setEditMode(true);
        setIsAddModalOpen(true);
    };

    const handleView = (employee: any) => {
        setViewEmployee(employee);
        setIsViewModalOpen(true);
    };

    const handleDelete = async (employee: any) => {
        Swal.fire({
            icon: 'warning',
            title: 'Are you sure?',
            text: `You won't be able to revert this!`,
            showCancelButton: true,
            confirmButtonText: 'Delete',
            padding: '2em',
            customClass: { popup: 'sweet-alerts' },
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('access_token');
                    const headers: any = {};
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const response = await fetch(`${API_URL}${employee.id}/`, {
                        method: 'DELETE',
                        headers,
                    });

                    if (response.ok) {
                        Swal.fire({ title: 'Deleted!', text: 'Employee has been deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                        fetchEmployees();
                    } else {
                        const err = await response.json();
                        Swal.fire({ title: 'Error!', text: JSON.stringify(err), icon: 'error', customClass: { popup: 'sweet-alerts' } });
                    }
                } catch (error) {
                    Swal.fire({ title: 'Error!', text: 'Failed to delete employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
                }
            }
        });
    };

    const handleSaveEmployee = async (e: any) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('access_token');
            const headers: any = {}; // Note: Content-Type omitted so browser sets it with boundary for FormData
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const payloadData = new FormData();
            
            Object.keys(formData).forEach(key => {
                const value = formData[key];
                
                // Skip empty relation fields to prevent backend errors
                const fks = ['company', 'department', 'designation', 'level', 'reporting_manager', 'reporting_level', 'shift_assigned'];
                if (fks.includes(key) && !value) return;

                if (['photo', 'aadhar_card', 'pan_card'].includes(key)) {
                    if (value instanceof File) {
                        payloadData.append(key, value);
                    }
                } else if (value !== null && value !== undefined && value !== '') {
                    payloadData.append(key, value);
                } else if (typeof value === 'boolean') {
                    payloadData.append(key, value.toString());
                }
            });

            const method = editMode ? 'PATCH' : 'POST';
            const endpoint = editMode ? `${API_URL}${editId}/` : API_URL;

            const response = await fetch(endpoint, {
                method,
                headers,
                body: payloadData,
            });

            if (response.ok) {
                Swal.fire({ title: editMode ? 'Updated!' : 'Added!', text: `Employee ${editMode ? 'updated' : 'added'} successfully.`, icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setIsAddModalOpen(false);
                fetchEmployees();
                resetForm();
            } else {
                const err = await response.json();
                Swal.fire({ title: 'Error!', text: JSON.stringify(err), icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (error) {
            Swal.fire({ title: 'Error!', text: 'Failed to save Employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#0d9488] to-[#14b8a6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Employee Management</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Manage and view the list of all employees in the organization.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-4 mb-5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        className="form-input w-full sm:w-64"
                        placeholder="Search by name, email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                    <button
                        type="button"
                        className="btn btn-primary gap-2"
                        onClick={() => {
                            resetForm();
                            setIsAddModalOpen(true);
                        }}
                    >
                        <IconPlus /> Add Employee
                    </button>
                </div>
            </div>

            <div className="panel p-0 border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>EMP ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Company</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-5">Loading...</td>
                                </tr>
                            ) : employees.length > 0 ? (
                                employees.map((employee) => (
                                    <tr key={employee.id}>
                                        <td>{employee.employee_id}</td>
                                        <td className="font-semibold">{employee.first_name} {employee.last_name}</td>
                                        <td>{employee.email}</td>
                                        <td>{employee.company_name || '-'}</td>
                                        <td>{employee.department_name || '-'}</td>
                                        <td>
                                            <span className="badge badge-outline-primary">{employee.designation_name || '-'}</span>
                                        </td>
                                        <td className="text-center flex justify-center items-center gap-2 mt-[5px]">
                                            <button type="button" className="text-info hover:text-blue-500" onClick={() => handleView(employee)}>
                                                <IconEye className="w-5 h-5" />
                                            </button>
                                            <button type="button" className="text-primary hover:text-blue-700" onClick={() => handleEdit(employee)}>
                                                <IconEdit className="w-5 h-5" />
                                            </button>
                                            <button type="button" className="text-danger hover:text-red-700" onClick={() => handleDelete(employee)}>
                                                <IconTrash className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-5">No employees found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalCount > 0 && (
                    <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                                Showing <span className="text-primary">{((page - 1) * pageSize) + 1}</span> to <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-primary">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Per side:</span>
                                <select
                                    className="form-select w-20 text-sm font-semibold py-1"
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
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
                            {(() => {
                                const pages: (number | string)[] = [];
                                if (totalPages <= 3) {
                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                    pages.push(1);
                                    let start = Math.max(2, page - 1);
                                    let end = Math.min(totalPages - 1, page + 1);
                                    if (page <= 2) {
                                        end = Math.min(totalPages - 1, 3);
                                    } else if (page >= totalPages - 1) {
                                        start = Math.max(2, totalPages - 2);
                                    }
                                    if (start > 2) pages.push('left-ellipsis');
                                    for (let i = start; i <= end; i++) pages.push(i);
                                    if (end < totalPages - 1) pages.push('right-ellipsis');
                                    pages.push(totalPages);
                                }
                                return pages.map((p, idx) => {
                                    if (p === 'left-ellipsis' || p === 'right-ellipsis') {
                                        const jumpPage = p === 'left-ellipsis' ? Math.max(1, page - 3) : Math.min(totalPages, page + 3);
                                        return (
                                            <li key={`${p}-${idx}`}>
                                                <button
                                                    type="button"
                                                    title={p === 'left-ellipsis' ? "Previous 3 pages" : "Next 3 pages"}
                                                    className="flex justify-center font-semibold px-3 py-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary cursor-pointer"
                                                    onClick={() => setPage(jumpPage)}
                                                >
                                                    ...
                                                </button>
                                            </li>
                                        );
                                    }
                                    return (
                                        <li key={p}>
                                            <button
                                                type="button"
                                                className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${page === p ? 'bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]' : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'}`}
                                                onClick={() => setPage(p as number)}
                                            >
                                                {p}
                                            </button>
                                        </li>
                                    );
                                });
                            })()}
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

            {/* Comprehensive View Add/Edit Employee Modal */}
            <Transition appear show={isAddModalOpen} as={Fragment}>
                <Dialog as="div" open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} className="relative z-50">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-6xl text-black dark:text-white-dark shadow-xl">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none"
                                    >
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        {editMode ? 'Edit Employee Details' : 'Add New Employee'}
                                    </div>
                                    <div className="p-5 max-h-[75vh] overflow-y-auto">
                                        <form onSubmit={handleSaveEmployee} className="space-y-6">
                                            
                                            {/* Section: Basic Details */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-primary mb-3">Basic Details</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <div><label>First Name *</label><input type="text" name="first_name" className="form-input bg-blue-50 dark:bg-gray-800" required value={formData.first_name} onChange={handleInputChange} /></div>
                                                    <div><label>Middle Name</label><input type="text" name="middle_name" className="form-input" value={formData.middle_name} onChange={handleInputChange} /></div>
                                                    <div><label>Last Name</label><input type="text" name="last_name" className="form-input" value={formData.last_name} onChange={handleInputChange} /></div>
                                                    
                                                    <div>
                                                        <label>Profile Photo</label>
                                                        {editId && employees.find(e => e.id === editId)?.photo && (
                                                            <div className="mb-2 flex items-center gap-3 bg-gray-50 dark:bg-[#1b2e4b] p-2 rounded border border-[#e0e6ed] dark:border-[#1b2e4b]">
                                                                <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                                                    <img src={employees.find(e => e.id === editId)?.photo} alt="Current Photo" className="w-full h-full object-cover" />
                                                                </div>
                                                                <span className="text-xs text-gray-500 font-semibold">Active Photo</span>
                                                            </div>
                                                        )}
                                                        <input type="file" name="photo" className="form-input" onChange={handleInputChange} accept="image/*" />
                                                    </div>
                                                    <div><label>Email *</label><input type="email" name="email" className="form-input bg-blue-50 dark:bg-gray-800" required value={formData.email} onChange={handleInputChange} /></div>
                                                    <div><label>Mobile Number</label><input type="text" name="mobile" className="form-input" value={formData.mobile} onChange={handleInputChange} /></div>
                                                    <div>
                                                        <label>Gender</label>
                                                        <select name="gender" className="form-select" value={formData.gender} onChange={handleInputChange}>
                                                            <option value="male">Male</option>
                                                            <option value="female">Female</option>
                                                            <option value="other">Other</option>
                                                        </select>
                                                    </div>
                                                    
                                                    <div><label>Date of Birth</label><input type="date" name="date_of_birth" className="form-input" value={formData.date_of_birth} onChange={handleInputChange} /></div>
                                                    <div><label>Company *</label>
                                                        <select name="company" className="form-select bg-blue-50 dark:bg-gray-800" required value={formData.company} onChange={handleInputChange}>
                                                            <option value="">Select Company</option>
                                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div><label>Status</label>
                                                        <label className="flex items-center cursor-pointer mt-2">
                                                            <input type="checkbox" name="is_active" className="form-checkbox" checked={formData.is_active} onChange={handleInputChange} />
                                                            <span className="ml-2">Account is active</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section: Family & Emergency */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-primary mb-3">Family & Address</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <div><label>Guardian Name</label><input type="text" name="guardian_name" className="form-input" value={formData.guardian_name} onChange={handleInputChange} /></div>
                                                    <div><label>Guardian Mobile</label><input type="text" name="guardian_mobile" className="form-input" value={formData.guardian_mobile} onChange={handleInputChange} /></div>
                                                    <div><label>Category</label><input type="text" name="category" className="form-input" value={formData.category} onChange={handleInputChange} /></div>
                                                    
                                                    <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-5">
                                                        <div><label>Temporary Address</label><textarea name="temporary_address" className="form-textarea" rows={2} value={formData.temporary_address} onChange={handleInputChange}></textarea></div>
                                                        <div><label>Permanent Address</label><textarea name="permanent_address" className="form-textarea" rows={2} value={formData.permanent_address} onChange={handleInputChange}></textarea></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section: Legal & Identity */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-primary mb-3">Legal & Compliance</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <div><label>Aadhar No</label><input type="text" name="aadhar_no" className="form-input" value={formData.aadhar_no} onChange={handleInputChange} /></div>
                                                    <div>
                                                        <label>Aadhar Card File</label>
                                                        {editId && employees.find(e => e.id === editId)?.aadhar_card && (
                                                            <div className="mb-2 flex items-center justify-between bg-gray-50 dark:bg-[#1b2e4b] p-2 rounded border border-[#e0e6ed] dark:border-[#1b2e4b]">
                                                                <a href={employees.find(e => e.id === editId)?.aadhar_card} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1 font-semibold">
                                                                    <IconEye className="w-4 h-4" /> View Current File
                                                                </a>
                                                                <span className="text-xs text-gray-500 font-semibold">Active</span>
                                                            </div>
                                                        )}
                                                        <input type="file" name="aadhar_card" className="form-input" onChange={handleInputChange} accept=".pdf,image/*" />
                                                    </div>
                                                    <div><label>PAN No</label><input type="text" name="pan_no" className="form-input" value={formData.pan_no} onChange={handleInputChange} /></div>
                                                    <div>
                                                        <label>PAN Card File</label>
                                                        {editId && employees.find(e => e.id === editId)?.pan_card && (
                                                            <div className="mb-2 flex items-center justify-between bg-gray-50 dark:bg-[#1b2e4b] p-2 rounded border border-[#e0e6ed] dark:border-[#1b2e4b]">
                                                                <a href={employees.find(e => e.id === editId)?.pan_card} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1 font-semibold">
                                                                    <IconEye className="w-4 h-4" /> View Current File
                                                                </a>
                                                                <span className="text-xs text-gray-500 font-semibold">Active</span>
                                                            </div>
                                                        )}
                                                        <input type="file" name="pan_card" className="form-input" onChange={handleInputChange} accept=".pdf,image/*" />
                                                    </div>
                                                    
                                                    <div><label>EPF Status</label>
                                                        <select name="epf_status" className="form-select" value={formData.epf_status} onChange={handleInputChange}>
                                                            <option value="">Select</option>
                                                            <option value="yes">Yes</option>
                                                            <option value="no">No</option>
                                                        </select>
                                                    </div>
                                                    <div><label>UAN</label><input type="text" name="uan" className="form-input" value={formData.uan} onChange={handleInputChange} /></div>
                                                    <div><label>ESIC Status</label>
                                                        <select name="esic_status" className="form-select" value={formData.esic_status} onChange={handleInputChange}>
                                                            <option value="">Select</option>
                                                            <option value="yes">Yes</option>
                                                            <option value="no">No</option>
                                                        </select>
                                                    </div>
                                                    <div><label>ESIC No</label><input type="text" name="esic_no" className="form-input" value={formData.esic_no} onChange={handleInputChange} /></div>
                                                </div>
                                            </div>

                                            {/* Section: Job & Organization */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-primary mb-3">Job Details & Hierarchy</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <div><label>Department</label>
                                                        <select name="department" className="form-select" value={formData.department} onChange={handleInputChange}>
                                                            <option value="">Select Department</option>
                                                            {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div><label>Designation</label>
                                                        <select name="designation" className="form-select" value={formData.designation} onChange={handleInputChange}>
                                                            <option value="">Select Designation</option>
                                                            {designations.map(d => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div><label>Level</label>
                                                        <select name="level" className="form-select" value={formData.level} onChange={handleInputChange}>
                                                            <option value="">Select Level</option>
                                                            {levels.map(l => <option key={l.id} value={l.id}>{l.level_name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div><label>Reporting Level</label>
                                                        <select name="reporting_level" className="form-select" value={formData.reporting_level} onChange={handleInputChange}>
                                                            <option value="">Select Reporting Level</option>
                                                            {levels.map(l => <option key={l.id} value={l.id}>{l.level_name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div><label>Reporting Manager</label>
                                                        <select name="reporting_manager" className="form-select" value={formData.reporting_manager} onChange={handleInputChange}>
                                                            <option value="">Select Reporting Manager</option>
                                                            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
                                                        </select>
                                                    </div>
                                                    <div><label>Assigned Shift</label>
                                                        <select name="shift_assigned" className="form-select" value={formData.shift_assigned} onChange={handleInputChange}>
                                                            <option value="">Select Shift</option>
                                                            {shifts.map(s => <option key={s.id} value={s.id}>{s.policy_name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div><label>Date of Joining</label><input type="date" name="date_of_joining" className="form-input" value={formData.date_of_joining} onChange={handleInputChange} /></div>
                                                    <div><label>Source of Employment</label>
                                                        <select name="source_of_employment" className="form-select" value={formData.source_of_employment} onChange={handleInputChange}>
                                                            <option value="">Select Source</option>
                                                            <option value="internalreference">Internal Reference</option>
                                                            <option value="linkedin">LinkedIn</option>
                                                            <option value="walkin">Walk In</option>
                                                            <option value="socialmedia">Social Media</option>
                                                        </select>
                                                    </div>
                                                    <div><label>Who Referred</label><input type="text" name="who_referred" className="form-input" value={formData.who_referred} onChange={handleInputChange} /></div>
                                                </div>
                                            </div>

                                            {/* Section: Pay & Finance */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-primary mb-3">Finance & Past Employment</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <div><label>Payment Method</label>
                                                        <select name="payment_method" className="form-select" value={formData.payment_method} onChange={handleInputChange}>
                                                            <option value="">Select</option>
                                                            <option value="cash">Cash</option>
                                                            <option value="bank">Bank</option>
                                                        </select>
                                                    </div>
                                                    <div><label>Account No</label><input type="text" name="account_no" className="form-input" value={formData.account_no} onChange={handleInputChange} /></div>
                                                    <div><label>IFSC Code</label><input type="text" name="ifsc_code" className="form-input" value={formData.ifsc_code} onChange={handleInputChange} /></div>
                                                    <div><label>Bank Name</label><input type="text" name="bank_name" className="form-input" value={formData.bank_name} onChange={handleInputChange} /></div>
                                                    
                                                    <div><label>Previous Employer</label><input type="text" name="previous_employer" className="form-input" value={formData.previous_employer} onChange={handleInputChange} /></div>
                                                    <div><label>Previous Designation</label><input type="text" name="previous_designation_name" className="form-input" value={formData.previous_designation_name} onChange={handleInputChange} /></div>
                                                    <div><label>Date of Releaving</label><input type="date" name="date_of_releaving" className="form-input" value={formData.date_of_releaving} onChange={handleInputChange} /></div>
                                                    
                                                    <div><label>Previous Salary</label><input type="number" name="previous_salary" className="form-input" value={formData.previous_salary} onChange={handleInputChange} /></div>
                                                    <div><label>CTC</label><input type="number" name="ctc" className="form-input" value={formData.ctc} onChange={handleInputChange} /></div>
                                                    <div><label>Gross Salary</label><input type="number" name="gross_salary" className="form-input" value={formData.gross_salary} onChange={handleInputChange} /></div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end items-center border-t border-[#e0e6ed] dark:border-[#1b2e4b] pt-5 mt-5 space-x-3">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary">{editMode ? 'Update Employee' : 'Add Employee'}</button>
                                            </div>
                                        </form>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            {/* View Employee Profile Modal */}
            <Transition appear show={isViewModalOpen} as={Fragment}>
                <Dialog as="div" open={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} className="relative z-50">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg w-full max-w-4xl text-black dark:text-white-dark shadow-xl">
                                    <button
                                        type="button"
                                        onClick={() => setIsViewModalOpen(false)}
                                        className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none"
                                    >
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        Employee Profile
                                    </div>
                                    <div className="p-5 max-h-[75vh] overflow-y-auto">
                                        {viewEmployee && (
                                            <div className="space-y-6">
                                                <div className="flex flex-col sm:flex-row items-center border-b border-[#e0e6ed] dark:border-[#1b2e4b] pb-6 gap-6">
                                                    <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-4xl sm:text-5xl font-bold shadow-[0_0_15px_1px_rgba(113,106,202,0.20)] dark:shadow-[0_0_15px_1px_rgba(255,255,255,0.05)] overflow-hidden">
                                                        {viewEmployee.photo ? (
                                                            <img
                                                                src={viewEmployee.photo}
                                                                alt="Profile"
                                                                className="w-full h-full object-cover"
                                                                onError={(e: any) => { e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <span>{viewEmployee.first_name?.[0]?.toUpperCase() || ''}{viewEmployee.last_name?.[0]?.toUpperCase() || ''}</span>
                                                        )}
                                                    </div>
                                                    <div className="text-center sm:text-left flex-1">
                                                        <h2 className="text-2xl font-bold mb-1">{viewEmployee.first_name} {viewEmployee.last_name}</h2>
                                                        <p className="text-white-dark mb-2 text-sm">EMP ID: <span className="font-semibold text-primary">{viewEmployee.employee_id || 'N/A'}</span></p>
                                                        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                                            <span className="badge badge-outline-primary">{viewEmployee.designation_name || 'Designation N/A'}</span>
                                                            <span className="badge bg-info">{viewEmployee.department_name || 'Department N/A'}</span>
                                                            {viewEmployee.is_active ? (
                                                                <span className="badge bg-success">Active</span>
                                                            ) : (
                                                                <span className="badge bg-danger">Inactive</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] shadow-none">
                                                        <div className="text-lg font-bold text-primary mb-3">Basic Information</div>
                                                        <ul className="space-y-2 text-sm">
                                                            <li className="flex justify-between"><strong>Email:</strong> <span>{viewEmployee.email || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Mobile:</strong> <span>{viewEmployee.mobile || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Gender:</strong> <span className="capitalize">{viewEmployee.gender || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Date of Birth:</strong> <span>{viewEmployee.date_of_birth || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Company:</strong> <span>{viewEmployee.company_name || 'N/A'}</span></li>
                                                        </ul>
                                                    </div>

                                                    <div className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] shadow-none">
                                                        <div className="text-lg font-bold text-primary mb-3">Hierarchy & Reporting</div>
                                                        <ul className="space-y-2 text-sm">
                                                            <li className="flex justify-between"><strong>Level:</strong> <span>{viewEmployee.level ? levels.find(l => l.id === viewEmployee.level)?.level_name || 'N/A' : 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Reporting Level:</strong> <span>{viewEmployee.reporting_level_name || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Reporting Manager:</strong> <span>{viewEmployee.reporting_manager_name || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Shift Policy:</strong> <span>{viewEmployee.shift_assigned?.policy_name || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Joined Date:</strong> <span>{viewEmployee.date_of_joining || 'N/A'}</span></li>
                                                        </ul>
                                                    </div>

                                                    <div className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] shadow-none md:col-span-2">
                                                        <div className="text-lg font-bold text-primary mb-3">Address & Legal</div>
                                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                                                            <li className="flex justify-between"><strong>Aadhar Number:</strong> <span>{viewEmployee.aadhar_no || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>PAN Number:</strong> <span>{viewEmployee.pan_no || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>UAN:</strong> <span>{viewEmployee.uan || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Temporary Address:</strong> <span>{viewEmployee.temporary_address || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Permanent Address:</strong> <span>{viewEmployee.permanent_address || 'N/A'}</span></li>
                                                            <li className="flex justify-between"><strong>Emergency Guardian:</strong> <span>{viewEmployee.guardian_name || 'N/A'} ({viewEmployee.guardian_mobile || 'No Number'})</span></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex justify-end pt-5 mt-5 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
                                            <button type="button" className="btn btn-primary" onClick={() => setIsViewModalOpen(false)}>Close</button>
                                        </div>
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

export default MasterEmployee;
