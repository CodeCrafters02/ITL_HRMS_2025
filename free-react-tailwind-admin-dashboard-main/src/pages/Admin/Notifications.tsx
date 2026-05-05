import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconSearch from '../../components/Icon/IconSearch';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconX from '../../components/Icon/IconX';
import IconBell from '../../components/Icon/IconBell';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/notifications/`;

type NotificationItem = {
    id: number;
    title: string;
    description?: string | null;
    date: string;
    company?: number | null;
};

const AdminNotifications = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NotificationItem | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Notifications Mgt'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchNotifications();
        }, 400);
        return () => clearTimeout(handler);
    }, [search, currentPage, itemsPerPage]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', currentPage.toString());
            url.searchParams.append('page_size', itemsPerPage.toString());
            if (search.trim()) url.searchParams.append('search', search.trim());

            const response = await fetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setItems(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.max(1, Math.ceil(data.count / itemsPerPage)));
                } else {
                    const nextItems = Array.isArray(data) ? data : [];
                    setItems(nextItems);
                    setTotalCount(nextItems.length);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
        });
        setEditingItem(null);
        setImageFile(null);
        setImagePreview(null);
    };

    const openCreateModal = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEditModal = (item: NotificationItem) => {
        setEditingItem(item);
        setFormData({
            title: item.title || '',
            description: item.description || '',
            date: item.date || new Date().toISOString().split('T')[0],
        });
        setImageFile(null);
        setImagePreview((item as any).image_url || null);
        setModalOpen(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('access_token');
            const headers: Record<string, string> = {};
            if (token) headers.Authorization = `Bearer ${token}`;

            let body: FormData | string;
            let finalHeaders = headers;

            if (imageFile) {
                const fd = new FormData();
                fd.append('title', formData.title);
                fd.append('description', formData.description);
                fd.append('date', formData.date);
                fd.append('image', imageFile);
                body = fd;
            } else {
                finalHeaders = { ...headers, 'Content-Type': 'application/json' };
                body = JSON.stringify(formData);
            }

            const response = await fetch(editingItem ? `${API_URL}${editingItem.id}/` : API_URL, {
                method: editingItem ? 'PATCH' : 'POST',
                headers: finalHeaders,
                body,
            });

            if (response.ok) {
                Swal.fire({
                    title: editingItem ? 'Updated!' : 'Created!',
                    text: editingItem ? 'Notification updated successfully.' : 'Notification published successfully.',
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setModalOpen(false);
                resetForm();
                await fetchNotifications();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({
                    title: 'Error!',
                    text: err ? JSON.stringify(err) : 'Failed to save notification.',
                    icon: 'error',
                    customClass: { popup: 'sweet-alerts' },
                });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to save notification.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: NotificationItem) => {
        const result = await Swal.fire({
            title: 'Delete notification?',
            text: `Delete "${item.title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`${API_URL}${item.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire({ title: 'Deleted!', text: 'Notification deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                await fetchNotifications();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to delete notification.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to delete notification.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#0e1726] to-[#3b82f6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Company Notifications</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Create and manage announcements for your company employees.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        className="form-input pr-10 w-72"
                        placeholder="Search notifications..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <IconSearch className="w-4 h-4" />
                    </span>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openCreateModal}>
                    <IconPlus /> Add Notification
                </button>
            </div>

            <div className="panel p-0 border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th className="w-12">#</th>
                                <th>Title</th>
                                <th>Message</th>
                                <th>Date</th>
                                <th className="text-center w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10">
                                        <span className="animate-pulse text-gray-400 font-medium">Loading notifications...</span>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-500 font-medium">No notifications found.</td>
                                </tr>
                            ) : (
                                items.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td className="font-semibold">{item.title}</td>
                                        <td className="text-gray-500 max-w-[400px] truncate">{item.description || '-'}</td>
                                        <td className="text-gray-500">{item.date || '-'}</td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-3 font-semibold">
                                                <button type="button" className="text-primary hover:text-blue-700" onClick={() => openEditModal(item)}>
                                                    <IconPencil className="w-5 h-5" />
                                                </button>
                                                <button type="button" className="text-danger hover:text-red-700" onClick={() => handleDelete(item)}>
                                                    <IconTrashLines className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalCount > 0 && (
                    <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                                Showing <span className="text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                                <span className="text-primary">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                                <span className="text-primary">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Per page:</span>
                                <select
                                    className="form-select w-20 text-sm font-semibold py-1"
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                        <ul className="inline-flex items-center space-x-1 font-semibold">
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                >
                                    Prev
                                </button>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold px-3.5 py-2 rounded-full transition bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]"
                                >
                                    {currentPage}
                                </button>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-xl font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-5 flex items-center gap-3">
                                        <div className="p-2 bg-primary-light rounded-lg">
                                            <IconBell className="text-primary w-6 h-6" />
                                        </div>
                                        {editingItem ? 'Edit Notification' : 'Create Notification'}
                                    </div>
                                    <div className="p-5">
                                        <form onSubmit={handleSave} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block">Title</label>
                                                <input
                                                    className="form-input"
                                                    required
                                                    placeholder="Enter notification title"
                                                    value={formData.title}
                                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="font-semibold mb-1 block">Date</label>
                                                <Flatpickr
                                                    value={formData.date}
                                                    options={{ dateFormat: 'Y-m-d' }}
                                                    className="form-input"
                                                    onChange={(date) => {
                                                        if (date.length > 0) {
                                                            const d = date[0];
                                                            const formatted = d.toISOString().split('T')[0];
                                                            setFormData({ ...formData, date: formatted });
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="font-semibold mb-1 block">Message</label>
                                                <textarea
                                                    className="form-textarea min-h-[150px]"
                                                    required
                                                    placeholder="Describe the announcement..."
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="font-semibold mb-1 block">Image (Optional)</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="form-input"
                                                    onChange={handleImageChange}
                                                />
                                                {imagePreview && (
                                                    <div className="mt-2 relative inline-block">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="max-h-32 rounded-lg border border-gray-200"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                                            onClick={() => {
                                                                setImageFile(null);
                                                                setImagePreview(null);
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b] -mx-5 px-5 mt-5">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setModalOpen(false)}>
                                                    Cancel
                                                </button>
                                                <button type="submit" className="btn btn-primary min-w-[120px]" disabled={saving}>
                                                    {saving ? (
                                                        <span className="flex items-center gap-2">
                                                            <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-4 h-4"></span>
                                                            Saving...
                                                        </span>
                                                    ) : editingItem ? 'Update' : 'Publish'}
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

export default AdminNotifications;
