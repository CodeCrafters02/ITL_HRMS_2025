import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconX from '../../components/Icon/IconX';
import IconBell from '../../components/Icon/IconBell';
import DataTable, { Column } from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';

import Modal from '../../components/Common/Modal';
import Button, { IconButton } from '../../components/Common/Button';
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

    const columns: Column<NotificationItem>[] = [
        {
            key: 'id',
            title: '#',
            width: '60px',
            align: 'center',
            render: (_val, _item, idx) => <span className="font-semibold text-gray-500">{(idx ?? 0) + 1}</span>,
        },
        {
            key: 'title',
            title: 'Title',
            sortable: true,
            render: (_val, item) => <span className="font-semibold text-gray-800 dark:text-white-light">{item.title}</span>,
        },
        {
            key: 'description',
            title: 'Message',
            render: (_val, item) => (
                <span className="text-gray-500 dark:text-gray-400 max-w-[400px] truncate block" title={item.description || ''}>
                    {item.description || '-'}
                </span>
            ),
        },
        {
            key: 'date',
            title: 'Date',
            sortable: true,
            render: (_val, item) => <span className="text-gray-500 dark:text-gray-400">{item.date || '-'}</span>,
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, item) => (
                <div className="flex items-center justify-center gap-2">
                    <IconButton tone="primary"
                        type="button"
                        
                        onClick={() => openEditModal(item)}
                        title="Edit Notification"
                    >
                        <IconPencil className="w-4 h-4" />
                    </IconButton>
                    <IconButton tone="danger"
                        type="button"
                        
                        onClick={() => handleDelete(item)}
                        title="Delete Notification"
                    >
                        <IconTrashLines className="w-4 h-4" />
                    </IconButton>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Company Notifications"
                subtitle="Broadcast company announcements, event notices, and general policy updates to all active personnel."
                icon={<IconBell />}
                badge="Communications"
                variant="primary"
                actions={
                    <Button type="button"  onClick={openCreateModal}>
                        <IconPlus className="w-4 h-4" /> Add Notification
                    </Button>
                }
            />

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                page={currentPage}
                pageSize={itemsPerPage}
                totalCount={totalCount}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(sz) => { setItemsPerPage(sz); setCurrentPage(1); }}
                searchValue={search}
                onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
                searchPlaceholder="Search notifications by title or message..."
                onRefresh={fetchNotifications}
                actionButton={
                    <Button type="button"  onClick={openCreateModal}>
                        <IconPlus className="w-4 h-4" /> Add Notification
                    </Button>
                }
            />

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Notification' : 'Create Notification'} icon={<IconBell />} size="lg">
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
                        <Button variant="outline-danger" type="button"  onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="min-w-[120px]" type="submit"  disabled={saving}>
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-4 h-4"></span>
                                    Saving...
                                </span>
                            ) : editingItem ? 'Update' : 'Publish'}
                        </Button>
                    </div>
                </form>

            </Modal>
        </div>
    );
};

export default AdminNotifications;
