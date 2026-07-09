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
        const handler = setTimeout(() => {
            fetchDepartments();
        }, 400);
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

    // Filter locally for instant search if backend doesn't support search param
    const filteredDepartments = search
        ? departments.filter((d) => d.department_name?.toLowerCase().includes(search.toLowerCase()))
        : departments;

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

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        className="form-input pr-10 w-64"
                        placeholder="Search departments..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <IconSearch className="w-4 h-4" />
                    </span>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openAddModal}>
                    <IconPlus /> Add Department
                </button>
            </div>

            {/* Table */}
            <div className="panel p-0 border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Department Name</th>
                                <th>Created On</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-5">
                                        <span className="animate-pulse text-gray-400">Loading departments...</span>
                                    </td>
                                </tr>
                            ) : filteredDepartments.length > 0 ? (
                                filteredDepartments.map((dept, index) => (
                                    <tr key={dept.id}>
                                        <td>{(page - 1) * pageSize + index + 1}</td>
                                        <td className="font-semibold">{dept.department_name}</td>
                                        <td className="text-gray-500">
                                            {dept.creation_date
                                                ? new Date(dept.creation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                : '-'}
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" className="text-primary hover:text-blue-700" onClick={() => openEditModal(dept)} title="Edit">
                                                    <IconPencil className="w-5 h-5" />
                                                </button>
                                                <button type="button" className="text-danger hover:text-red-700" onClick={() => handleDelete(dept)} title="Delete">
                                                    <IconTrashLines className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-5 text-gray-400">No departments found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalCount > 0 && (
                    <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                                Showing <span className="text-primary">{((page - 1) * pageSize) + 1}</span> to <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-primary">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Per page:</span>
                                <select
                                    className="form-select w-20 text-sm font-semibold py-1"
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
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
                            {(() => {
                                const pages: (number | string)[] = [];
                                if (totalPages <= 3) {
                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                    if (page <= 2) {
                                        pages.push(1, 2, 3, 'right-ellipsis', totalPages);
                                    } else if (page >= totalPages - 1) {
                                        pages.push(1, 'left-ellipsis', totalPages - 2, totalPages - 1, totalPages);
                                    } else {
                                        pages.push(1, 'left-ellipsis', page, 'right-ellipsis', totalPages);
                                    }
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
