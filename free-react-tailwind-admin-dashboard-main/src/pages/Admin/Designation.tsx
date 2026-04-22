import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconSearch from '../../components/Icon/IconSearch';

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
        const handler = setTimeout(() => {
            fetchDesignations();
        }, 400);
        return () => clearTimeout(handler);
    }, [search, page, pageSize]);

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

    const fetchDesignations = async () => {
        setLoading(true);
        try {
            const url = new URL(DESIGNATION_API_URL);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (search.trim()) url.searchParams.append('search', search.trim());

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

    return (
        <div>
            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#14b8a6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Designation Management</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Create, edit, and manage designations with their department and level mappings.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        className="form-input pr-10 w-64"
                        placeholder="Search designations..."
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
                <button type="button" className="btn btn-primary gap-2" onClick={openAddModal}>
                    <IconPlus /> Add Designation
                </button>
            </div>

            <div className="panel p-0 border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Designation Name</th>
                                <th>Department</th>
                                <th>Level</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5">
                                        <span className="animate-pulse text-gray-400">Loading designations...</span>
                                    </td>
                                </tr>
                            ) : designations.length > 0 ? (
                                designations.map((designation, index) => (
                                    <tr key={designation.id}>
                                        <td>{(page - 1) * pageSize + index + 1}</td>
                                        <td className="font-semibold">{designation.designation_name}</td>
                                        <td className="text-gray-500">{designation.department_name || '-'}</td>
                                        <td className="text-gray-500">{designation.level_name || '-'}</td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" className="text-primary hover:text-blue-700" onClick={() => openEditModal(designation)} title="Edit">
                                                    <IconPencil className="w-5 h-5" />
                                                </button>
                                                <button type="button" className="text-danger hover:text-red-700" onClick={() => handleDelete(designation)} title="Delete">
                                                    <IconTrashLines className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-5 text-gray-400">No designations found.</td>
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

            <Transition appear show={isModalOpen} as={Fragment}>
                <Dialog as="div" open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
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
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-md text-black dark:text-white-dark shadow-xl">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none"
                                    >
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        {editMode ? 'Edit Designation' : 'Add New Designation'}
                                    </div>
                                    <div className="p-5">
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
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Create'}</button>
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

export default AdminDesignation;
