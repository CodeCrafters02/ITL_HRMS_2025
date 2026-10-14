import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconPlus from '../../components/Icon/IconPlus';
import IconEdit from '../../components/Icon/IconEdit';
import IconTrash from '../../components/Icon/IconTrash';
import IconEye from '../../components/Icon/IconEye';
import IconUsers from '../../components/Icon/IconUsers';
import PageHeader from '../../components/Common/PageHeader';
import DataTable, { Column } from '../../components/Common/DataTable';
import Button, { IconButton } from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';

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
    const [companyFilter, setCompanyFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'employee_id', dir: 'asc' });
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
    }, [search, page, pageSize, companyFilter, statusFilter, sort]);

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
            if (companyFilter) url.searchParams.append('company', companyFilter);
            if (statusFilter) url.searchParams.append('is_active', statusFilter);
            url.searchParams.append('ordering', `${sort.dir === 'desc' ? '-' : ''}${sort.field}`);

            const response = await fetch(url.toString(), { headers });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setEmployees(data.results);
                    setTotalCount(data.count);
                } else {
                    setEmployees(data);
                    setTotalCount(data.length);
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

    const columns: Column<any>[] = [
        { key: 'employee_id', title: 'EMP ID', sortable: true, render: (_v, e) => <span className="font-mono text-xs font-bold text-brand">{e.employee_id || '-'}</span> },
        { key: 'first_name', title: 'Name', sortable: true, render: (_v, e) => <span className="font-semibold text-slate-900">{`${e.first_name || ''} ${e.last_name || ''}`.trim() || '-'}</span> },
        { key: 'email', title: 'Email', sortable: true, hideBelow: 'md', render: (_v, e) => <span className="break-all text-slate-600">{e.email}</span> },
        { key: 'company__name', title: 'Company', sortable: true, hideBelow: 'lg', render: (_v, e) => e.company_name || '-' },
        { key: 'department__department_name', title: 'Department', sortable: true, hideBelow: 'lg', render: (_v, e) => e.department_name || '-' },
        {
            key: 'designation__designation_name',
            title: 'Designation',
            sortable: true,
            render: (_v, e) => <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand">{e.designation_name || '-'}</span>,
        },
        {
            key: 'is_active',
            title: 'Status',
            sortable: true,
            align: 'center',
            render: (_v, e) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${e.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${e.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {e.is_active ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'right',
            render: (_v, e) => (
                <div className="flex items-center justify-end gap-1">
                    <IconButton tone="neutral" label="View profile" onClick={() => handleView(e)}>
                        <IconEye />
                    </IconButton>
                    <IconButton label="Edit employee" onClick={() => handleEdit(e)}>
                        <IconEdit />
                    </IconButton>
                    <IconButton tone="danger" label="Delete employee" onClick={() => handleDelete(e)}>
                        <IconTrash />
                    </IconButton>
                </div>
            ),
        },
    ];

    const addEmployee = () => {
        resetForm();
        setIsAddModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Employee Management"
                subtitle="Manage and view the complete organizational employee registry, department roles, and designations."
                icon={<IconUsers />}
                badge="Workforce Master"
                actions={
                    <Button leftIcon={<IconPlus />} onClick={addEmployee}>
                        Add Employee
                    </Button>
                }
            />

            <DataTable
                columns={columns}
                data={employees}
                rowKey={(e) => e.id}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                    setPageSize(n);
                    setPage(1);
                }}
                searchValue={search}
                onSearchChange={(v) => {
                    setSearch(v);
                    setPage(1);
                }}
                searchPlaceholder="Search by ID, name, email, mobile, department or designation..."
                sortField={sort.field}
                sortDirection={sort.dir}
                onSortChange={(field, dir) => {
                    setSort({ field, dir });
                    setPage(1);
                }}
                onRefresh={fetchEmployees}
                entityLabel="employees"
                emptyMessage="No employees found"
                filters={
                    <>
                        <select
                            className="form-select h-10 w-48 rounded-xl text-xs"
                            value={companyFilter}
                            onChange={(e) => {
                                setCompanyFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All companies</option>
                            {companies.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="form-select h-10 w-36 rounded-xl text-xs"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">Any status</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </>
                }
            />

            {/* Comprehensive View Add/Edit Employee Modal */}
            <Modal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={editMode ? 'Edit Employee Details' : 'Add New Employee'} icon={<IconUsers />} size="5xl" dismissible={false}>
                                        <form onSubmit={handleSaveEmployee} className="space-y-6">
                                            
                                            {/* Section: Basic Details */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-primary mb-3">Basic Details</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <div><label>First Name *</label><input type="text" name="first_name" className="form-input bg-brand-50 dark:bg-gray-800" required value={formData.first_name} onChange={handleInputChange} /></div>
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
                                                    <div><label>Email *</label><input type="email" name="email" className="form-input bg-brand-50 dark:bg-gray-800" required value={formData.email} onChange={handleInputChange} /></div>
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
                                                        <select name="company" className="form-select bg-brand-50 dark:bg-gray-800" required value={formData.company} onChange={handleInputChange}>
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
                                                <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                                                <Button type="submit">{editMode ? 'Update Employee' : 'Add Employee'}</Button>
                                            </div>
                                        </form>
            </Modal>
            {/* View Employee Profile Modal */}
            <Modal open={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Employee Profile" icon={<IconEye />} size="4xl" footer={<Button onClick={() => setIsViewModalOpen(false)}>Close</Button>}>
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
                                        </Modal>
        </div>
    );
};

export default MasterEmployee;
