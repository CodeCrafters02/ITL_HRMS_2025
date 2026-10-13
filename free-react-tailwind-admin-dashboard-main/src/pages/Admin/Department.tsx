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
import DataTable, { Column } from '../../components/Common/DataTable';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/departments/`;

const AdminDepartment = () => {
    const dispatch = useDispatch();
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ department_name: '' });

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        dispatch(setPageTitle('Department Management'));
    }, [dispatch]);

    useEffect(() => {
        setLoading(true);
        const handler = setTimeout(() => {
            fetchDepartments();
        }, 300);
        return () => clearTimeout(handler);
    }, [search, page, pageSize]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (search) url.searchParams.append('search', search);

            const response = await fetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setDepartments(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.ceil(data.count / pageSize));
                } else {
                    setDepartments(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ department_name: '' });
        setEditMode(false);
        setEditId(null);
    };

    const openAddModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (dept: any) => {
        setFormData({ department_name: dept.department_name });
        setEditMode(true);
        setEditId(dept.id);
        setIsModalOpen(true);
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        if (!formData.department_name.trim()) {
            Swal.fire({ title: 'Error!', text: 'Department name is required.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            return;
        }

        try {
            const url = editMode ? `${API_URL}${editId}/` : API_URL;
            const method = editMode ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                Swal.fire({
                    title: editMode ? 'Updated!' : 'Added!',
                    text: `Department ${editMode ? 'updated' : 'added'} successfully.`,
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setIsModalOpen(false);
                resetForm();
                fetchDepartments();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to save department.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (error) {
            Swal.fire({ title: 'Error!', text: 'Failed to save department.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const handleDelete = async (dept: any) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete department "${dept.department_name}"? This will also affect employees and designations linked to it.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
            padding: '2em',
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API_URL}${dept.id}/`, {
                    method: 'DELETE',
                    headers: getHeaders(),
                });

                if (response.ok || response.status === 204) {
                    Swal.fire({ title: 'Deleted!', text: 'Department has been deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                    fetchDepartments();
                } else {
                    const err = await response.json().catch(() => null);
                    Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to delete department.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
                }
            } catch (error) {
                Swal.fire({ title: 'Error!', text: 'Failed to delete department.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        }
    };

    const columns: Column<any>[] = [
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
            key: 'department_name',
            title: 'Department Name',
            sortable: true,
            render: (name) => (
                <span className="font-semibold text-gray-800 dark:text-white-light">{name}</span>
            ),
        },
        {
            key: 'creation_date',
            title: 'Created On',
            sortable: true,
            render: (date) => (
                <span className="text-gray-500 dark:text-gray-400">
                    {date
                        ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '-'}
                </span>
            ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, dept) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        className="p-1.5 rounded-lg text-primary hover:text-white hover:bg-primary transition-colors"
                        onClick={() => openEditModal(dept)}
                        title="Edit Department"
                    >
                        <IconPencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="p-1.5 rounded-lg text-danger hover:text-white hover:bg-danger transition-colors"
                        onClick={() => handleDelete(dept)}
                        title="Delete Department"
                    >
                        <IconTrashLines className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#3b82f6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Department Management</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Create, edit, and manage all departments in your organization.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Reusable Data Table */}
            <DataTable
                columns={columns}
                data={departments}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                loading={loading}
                searchValue={search}
                searchPlaceholder="Search departments by name..."
                onSearchChange={(val) => { setSearch(val); setLoading(true); setPage(1); }}
                onPageChange={(p) => { setPage(p); setLoading(true); }}
                onPageSizeChange={(sz) => { setPageSize(sz); setLoading(true); setPage(1); }}
                onRefresh={fetchDepartments}
                actionButton={
                    <button type="button" className="btn btn-primary gap-2 shadow-md shadow-primary/20" onClick={openAddModal}>
                        <IconPlus className="w-4 h-4" /> Add Department
                    </button>
                }
            />

            {/* Add/Edit Department Modal */}
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
                                        {editMode ? 'Edit Department' : 'Add New Department'}
                                    </div>
                                    <div className="p-5">
                                        <form onSubmit={handleSave}>
                                            <div className="mb-5">
                                                <label htmlFor="department_name" className="font-semibold mb-1 block">Department Name *</label>
                                                <input
                                                    id="department_name"
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="e.g. Human Resources"
                                                    required
                                                    value={formData.department_name}
                                                    onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                                                />
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

export default AdminDepartment;
