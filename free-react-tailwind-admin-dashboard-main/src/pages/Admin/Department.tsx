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
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import Modal from '../../components/Common/Modal';
import Button, { IconButton } from '../../components/Common/Button';
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
                    <IconButton tone="primary"
                        type="button"
                        
                        onClick={() => openEditModal(dept)}
                        title="Edit Department"
                    >
                        <IconPencil className="w-4 h-4" />
                    </IconButton>
                    <IconButton tone="danger"
                        type="button"
                        
                        onClick={() => handleDelete(dept)}
                        title="Delete Department"
                    >
                        <IconTrashLines className="w-4 h-4" />
                    </IconButton>
                </div>
            ),
        },
    ];

    return (
        <div>
            {/* Header Banner */}
            <PageHeader
                icon={<IconUsersGroup />}
                title="Department Management"
                subtitle="Create, edit, and manage all departments in your organization."
            />

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
                    <Button type="button"  onClick={openAddModal}>
                        <IconPlus className="w-4 h-4" /> Add Department
                    </Button>
                }
            />

            {/* Add/Edit Department Modal */}
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editMode ? 'Edit Department' : 'Add New Department'} size="md">
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
                        <Button variant="outline-danger" type="button"  onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editMode ? 'Update' : 'Create'}</Button>
                    </div>
                </form>

            </Modal>
        </div>
    );
};

export default AdminDepartment;
