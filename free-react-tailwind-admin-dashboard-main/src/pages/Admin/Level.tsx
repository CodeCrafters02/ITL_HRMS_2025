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
const API_URL = `${API_BASE_URL}/app/levels/`;

type LevelRecord = {
    id: number;
    level_name: string;
    description?: string;
};

const AdminLevel = () => {
    const dispatch = useDispatch();
    const [levels, setLevels] = useState<LevelRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ level_name: '', description: '' });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        dispatch(setPageTitle('Level Management'));
    }, [dispatch]);

    useEffect(() => {
        setLoading(true);
        const handler = setTimeout(() => {
            fetchLevels();
        }, 300);
        return () => clearTimeout(handler);
    }, [search, page, pageSize]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const fetchLevels = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (search.trim()) url.searchParams.append('search', search.trim());

            const response = await fetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setLevels(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.max(1, Math.ceil(data.count / pageSize)));
                } else {
                    setLevels(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching levels:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ level_name: '', description: '' });
        setEditMode(false);
        setEditId(null);
    };

    const openAddModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (level: LevelRecord) => {
        setFormData({
            level_name: level.level_name,
            description: level.description || '',
        });
        setEditMode(true);
        setEditId(level.id);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.level_name.trim()) {
            Swal.fire({ title: 'Error!', text: 'Level name is required.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            return;
        }

        try {
            const url = editMode ? `${API_URL}${editId}/` : API_URL;
            const method = editMode ? 'PATCH' : 'POST';
            const payload = {
                level_name: formData.level_name.trim(),
                description: formData.description.trim(),
            };

            const response = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: editMode ? 'Updated!' : 'Added!',
                    text: `Level ${editMode ? 'updated' : 'added'} successfully.`,
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setIsModalOpen(false);
                resetForm();
                fetchLevels();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to save level.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (error) {
            Swal.fire({ title: 'Error!', text: 'Failed to save level.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const handleDelete = async (level: LevelRecord) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete level "${level.level_name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
            padding: '2em',
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API_URL}${level.id}/`, {
                    method: 'DELETE',
                    headers: getHeaders(),
                });

                if (response.ok || response.status === 204) {
                    Swal.fire({ title: 'Deleted!', text: 'Level has been deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                    fetchLevels();
                } else {
                    const err = await response.json().catch(() => null);
                    Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to delete level.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
                }
            } catch (error) {
                Swal.fire({ title: 'Error!', text: 'Failed to delete level.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        }
    };

    const columns: Column<LevelRecord>[] = [
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
            key: 'level_name',
            title: 'Level Name',
            sortable: true,
            render: (name) => (
                <span className="font-semibold text-gray-800 dark:text-white-light">{name}</span>
            ),
        },
        {
            key: 'description',
            title: 'Description',
            render: (desc) => (
                <span className="text-gray-500 dark:text-gray-400">{desc?.trim() || '-'}</span>
            ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, level) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        className="p-1.5 rounded-lg text-primary hover:text-white hover:bg-primary transition-colors"
                        onClick={() => openEditModal(level)}
                        title="Edit Level"
                    >
                        <IconPencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="p-1.5 rounded-lg text-danger hover:text-white hover:bg-danger transition-colors"
                        onClick={() => handleDelete(level)}
                        title="Delete Level"
                    >
                        <IconTrashLines className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Level Management</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Create, edit, and manage employee levels in your organization.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Reusable Data Table */}
            <DataTable
                columns={columns}
                data={levels}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                loading={loading}
                search={search}
                searchPlaceholder="Search levels by name..."
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
                onRefresh={fetchLevels}
                actions={
                    <button type="button" className="btn btn-primary gap-2 shadow-md shadow-primary/20" onClick={openAddModal}>
                        <IconPlus className="w-4 h-4" /> Add Level
                    </button>
                }
            />

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
                                        {editMode ? 'Edit Level' : 'Add New Level'}
                                    </div>
                                    <div className="p-5">
                                        <form onSubmit={handleSave}>
                                            <div className="mb-5">
                                                <label htmlFor="level_name" className="font-semibold mb-1 block">Level Name *</label>
                                                <input
                                                    id="level_name"
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="e.g. Senior"
                                                    required
                                                    value={formData.level_name}
                                                    onChange={(e) => setFormData({ ...formData, level_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="mb-5">
                                                <label htmlFor="description" className="font-semibold mb-1 block">Description</label>
                                                <textarea
                                                    id="description"
                                                    className="form-textarea min-h-[100px]"
                                                    placeholder="Optional description"
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

export default AdminLevel;
