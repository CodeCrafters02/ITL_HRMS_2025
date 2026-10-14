import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconSearch from '../../components/Icon/IconSearch';
import DataTable, { Column } from '../../components/Common/DataTable';

import PageHeader from '../../components/Common/PageHeader';
import IconAward from '../../components/Icon/IconAward';
import Modal from '../../components/Common/Modal';
import Button, { IconButton } from '../../components/Common/Button';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const DESIGNATION_API_URL = `${API_BASE_URL}/app/designations/`;
const DEPARTMENT_API_URL = `${API_BASE_URL}/app/departments/?page_size=1000`;
const LEVEL_API_URL = `${API_BASE_URL}/app/levels/?page_size=1000`;

type DepartmentOption = {
    id: number;
    department_name: string;
};

type LevelOption = {
    id: number;
    level_name: string;
};

type DesignationRecord = {
    id: number;
    designation_name: string;
    department: number;
    department_name?: string;
    level: number;
    level_name?: string;
};

const AdminDesignation = () => {
    const dispatch = useDispatch();
    const [designations, setDesignations] = useState<DesignationRecord[]>([]);
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [levels, setLevels] = useState<LevelOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ designation_name: '', department: '', level: '' });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        dispatch(setPageTitle('Designation Management'));
        fetchDependencies();
    }, [dispatch]);

    useEffect(() => {
        setLoading(true);
        const handler = setTimeout(() => {
            fetchDesignations();
        }, 300);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, page, pageSize, selectedDepartment, selectedLevel]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const fetchDependencies = async () => {
        try {
            const [departmentResponse, levelResponse] = await Promise.all([
                fetch(DEPARTMENT_API_URL, { headers: getHeaders() }),
                fetch(LEVEL_API_URL, { headers: getHeaders() }),
            ]);

            if (departmentResponse.ok) {
                const departmentData = await departmentResponse.json();
                setDepartments(departmentData.results || departmentData);
            }

            if (levelResponse.ok) {
                const levelData = await levelResponse.json();
                setLevels(levelData.results || levelData);
            }
        } catch (error) {
            console.error('Error fetching designation dependencies:', error);
        }
    };

    const fetchDesignations = async (overrideParams?: { page?: number; dept?: string; level?: string; query?: string }) => {
        setLoading(true);
        try {
            const url = new URL(DESIGNATION_API_URL);
            const currentPage = overrideParams?.page !== undefined ? overrideParams.page : page;
            const currentDept = overrideParams?.dept !== undefined ? overrideParams.dept : selectedDepartment;
            const currentLevel = overrideParams?.level !== undefined ? overrideParams.level : selectedLevel;
            const currentSearch = overrideParams?.query !== undefined ? overrideParams.query : search;

            url.searchParams.append('page', currentPage.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (currentSearch.trim()) url.searchParams.append('search', currentSearch.trim());
            if (currentDept) url.searchParams.append('department', currentDept);
            if (currentLevel) url.searchParams.append('level', currentLevel);

            const response = await fetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setDesignations(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.max(1, Math.ceil(data.count / pageSize)));
                } else {
                    setDesignations(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching designations:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ designation_name: '', department: '', level: '' });
        setEditMode(false);
        setEditId(null);
    };

    const openAddModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (designation: DesignationRecord) => {
        setFormData({
            designation_name: designation.designation_name,
            department: String(designation.department),
            level: String(designation.level),
        });
        setEditMode(true);
        setEditId(designation.id);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.designation_name.trim() || !formData.department || !formData.level) {
            Swal.fire({ title: 'Error!', text: 'Designation name, department, and level are required.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            return;
        }

        try {
            const url = editMode ? `${DESIGNATION_API_URL}${editId}/` : DESIGNATION_API_URL;
            const method = editMode ? 'PATCH' : 'POST';
            const payload = {
                designation_name: formData.designation_name.trim(),
                department: Number(formData.department),
                level: Number(formData.level),
            };

            const response = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: editMode ? 'Updated!' : 'Added!',
                    text: `Designation ${editMode ? 'updated' : 'added'} successfully.`,
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setIsModalOpen(false);
                resetForm();
                fetchDesignations();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to save designation.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (error) {
            Swal.fire({ title: 'Error!', text: 'Failed to save designation.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const handleDelete = async (designation: DesignationRecord) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete designation "${designation.designation_name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
            padding: '2em',
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${DESIGNATION_API_URL}${designation.id}/`, {
                    method: 'DELETE',
                    headers: getHeaders(),
                });

                if (response.ok || response.status === 204) {
                    Swal.fire({ title: 'Deleted!', text: 'Designation has been deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                    fetchDesignations();
                } else {
                    const err = await response.json().catch(() => null);
                    Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to delete designation.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
                }
            } catch (error) {
                Swal.fire({ title: 'Error!', text: 'Failed to delete designation.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        }
    };

    const columns: Column<DesignationRecord>[] = [
        {
            key: 'id',
            title: '#',
            width: '70px',
            align: 'center',
            render: (_val, _item, index) => (
                <span className="font-semibold text-gray-500">{index + 1}</span>
            ),
        },
        {
            key: 'designation_name',
            title: 'Designation Name',
            sortable: true,
            render: (name) => (
                <span className="font-semibold text-gray-800 dark:text-white-light">{name}</span>
            ),
        },
        {
            key: 'department_name',
            title: 'Department',
            sortable: true,
            render: (dept) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {dept || '-'}
                </span>
            ),
        },
        {
            key: 'level_name',
            title: 'Level',
            sortable: true,
            render: (lvl) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {lvl || '-'}
                </span>
            ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, designation) => (
                <div className="flex items-center justify-center gap-2">
                    <IconButton tone="primary"
                        type="button"
                        
                        onClick={() => openEditModal(designation)}
                        title="Edit Designation"
                    >
                        <IconPencil className="w-4 h-4" />
                    </IconButton>
                    <IconButton tone="danger"
                        type="button"
                        
                        onClick={() => handleDelete(designation)}
                        title="Delete Designation"
                    >
                        <IconTrashLines className="w-4 h-4" />
                    </IconButton>
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                icon={<IconAward />}
                title="Designation Management"
                subtitle="Create, edit, and manage designations with their department and level mappings."
            />

            {/* Reusable Data Table */}
            <DataTable
                columns={columns}
                data={designations}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                loading={loading}
                search={search}
                searchPlaceholder="Search designations..."
                onSearchChange={(val) => {
                    setSearch(val);
                    setLoading(true);
                    setPage(1);
                }}
                onPageChange={(p) => {
                    setPage(p);
                    setLoading(true);
                }}
                onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setLoading(true);
                    setPage(1);
                }}
                onRefresh={fetchDesignations}
                filters={
                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                        <select
                            className="form-select text-xs sm:text-sm h-10 px-3.5 rounded-xl border-[#cbd5e1] dark:border-[#1e293b] bg-white dark:bg-[#121e32] font-medium shadow-sm min-w-[170px] focus:border-brand focus:ring-2 focus:ring-brand/20"
                            value={selectedDepartment}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedDepartment(val);
                                setLoading(true);
                                setPage(1);
                            }}
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.department_name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="form-select text-xs sm:text-sm h-10 px-3.5 rounded-xl border-[#cbd5e1] dark:border-[#1e293b] bg-white dark:bg-[#121e32] font-medium shadow-sm min-w-[150px] focus:border-brand focus:ring-2 focus:ring-brand/20"
                            value={selectedLevel}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedLevel(val);
                                setLoading(true);
                                setPage(1);
                            }}
                        >
                            <option value="">All Levels</option>
                            {levels.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.level_name}
                                </option>
                            ))}
                        </select>
                        {(selectedDepartment || selectedLevel || search) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDepartment('');
                                    setSelectedLevel('');
                                    setSearch('');
                                    setLoading(true);
                                    setPage(1);
                                }}
                                className="h-10 px-3 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors whitespace-nowrap shadow-sm"
                                title="Reset all filters"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                }
                actions={
                    <Button type="button"  onClick={openAddModal}>
                        <IconPlus className="w-4 h-4" /> Add Designation
                    </Button>
                }
            />

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editMode ? 'Edit Designation' : 'Add New Designation'} size="md">
                <form onSubmit={handleSave}>
                    <div className="mb-5">
                        <label htmlFor="designation_name" className="font-semibold mb-1 block">Designation Name *</label>
                        <input
                            id="designation_name"
                            type="text"
                            className="form-input"
                            placeholder="e.g. Software Engineer"
                            required
                            value={formData.designation_name}
                            onChange={(e) => setFormData({ ...formData, designation_name: e.target.value })}
                        />
                    </div>
                    <div className="mb-5">
                        <label htmlFor="department" className="font-semibold mb-1 block">Department *</label>
                        <select
                            id="department"
                            className="form-select"
                            required
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        >
                            <option value="">Select department</option>
                            {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                    {department.department_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-5">
                        <label htmlFor="level" className="font-semibold mb-1 block">Level *</label>
                        <select
                            id="level"
                            className="form-select"
                            required
                            value={formData.level}
                            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                        >
                            <option value="">Select level</option>
                            {levels.map((level) => (
                                <option key={level.id} value={level.id}>
                                    {level.level_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end items-center gap-3 mt-8">
                        <Button variant="outline-danger" type="button"  onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editMode ? 'Update' : 'Create'}</Button>
                    </div>
                </form>

            </Modal>
        </div>
    );
};

export default AdminDesignation;
