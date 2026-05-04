import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconSearch from '../../components/Icon/IconSearch';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconEye from '../../components/Icon/IconEye';
import IconX from '../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/learning-corner/`;

type LearningCornerMediaItem = {
    id: number | null;
    url: string;
    media_type: 'image' | 'video' | 'document';
    filename: string;
};

type LearningCornerItem = {
    id: number;
    title: string;
    description?: string | null;
    image?: string | null;
    video?: string | null;
    document?: string | null;
    image_url?: string | null;
    video_url?: string | null;
    document_url?: string | null;
    links?: { title: string; url: string }[] | null;
    media?: LearningCornerMediaItem[];
};

type FilterType = 'all' | 'image' | 'video' | 'document';

const itemHasMediaType = (item: LearningCornerItem, ft: FilterType): boolean => {
    if (ft === 'all') return true;
    const media = item.media ?? [];
    if (media.some((m) => m.media_type === ft)) return true;
    if (ft === 'image') return !!(item.image_url || item.image);
    if (ft === 'video') return !!(item.video_url || item.video);
    if (ft === 'document') return !!(item.document_url || item.document);
    return false;
};
type SortType = 'newest' | 'oldest' | 'az';
type ViewType = 'card' | 'table';

const AdminLearningCorner = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<LearningCornerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [sortType, setSortType] = useState<SortType>('newest');
    const [viewType, setViewType] = useState<ViewType>('card');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LearningCornerItem | null>(null);
    const [previewItem, setPreviewItem] = useState<LearningCornerItem | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        links: [] as { title: string; url: string }[],
    });
    const [pendingMediaFiles, setPendingMediaFiles] = useState<File[]>([]);

    useEffect(() => {
        dispatch(setPageTitle('Learning Corner'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchItems();
        }, 400);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, currentPage, itemsPerPage]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchItems = async () => {
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
            console.error('Error fetching learning corner items:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        const result = items.filter((item) => itemHasMediaType(item, filterType));

        result.sort((a, b) => {
            if (sortType === 'az') return a.title.localeCompare(b.title);
            if (sortType === 'oldest') return a.id - b.id;
            return b.id - a.id;
        });

        return result;
    }, [items, filterType, sortType]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage]);

    const resetForm = () => {
        setFormData({ title: '', description: '', links: [] });
        setPendingMediaFiles([]);
        setEditingItem(null);
    };

    const openCreateModal = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEditModal = (item: LearningCornerItem) => {
        setEditingItem(item);
        setFormData({
            title: item.title || '',
            description: item.description || '',
            links: Array.isArray(item.links) ? [...item.links] : [],
        });
        setPendingMediaFiles([]);
        setModalOpen(true);
    };

    const buildAssetUrl = (value?: string | null) => {
        if (!value) return null;
        return value.startsWith('http') ? value : `${API_BASE_URL}${value}`;
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = new FormData();
            payload.append('title', formData.title);
            payload.append('description', formData.description);
            payload.append('links', JSON.stringify(formData.links));
            pendingMediaFiles.forEach((file) => {
                payload.append('media_files', file);
            });

            const response = await fetch(editingItem ? `${API_URL}${editingItem.id}/` : API_URL, {
                method: editingItem ? 'PATCH' : 'POST',
                headers: getHeaders(),
                body: payload,
            });

            if (response.ok) {
                Swal.fire({
                    title: editingItem ? 'Updated!' : 'Created!',
                    text: editingItem ? 'Learning resource updated successfully.' : 'Learning resource created successfully.',
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setModalOpen(false);
                resetForm();
                await fetchItems();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({
                    title: 'Error!',
                    text: err ? JSON.stringify(err) : 'Failed to save learning resource.',
                    icon: 'error',
                    customClass: { popup: 'sweet-alerts' },
                });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to save learning resource.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: LearningCornerItem) => {
        const result = await Swal.fire({
            title: 'Delete resource?',
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
                Swal.fire({ title: 'Deleted!', text: 'Learning resource deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                await fetchItems();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to delete learning resource.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to delete learning resource.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const handleDeleteMedia = async (resourceId: number, mediaId: number) => {
        const result = await Swal.fire({
            title: 'Remove file?',
            text: 'This file will be permanently removed from this resource.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Remove',
            customClass: { popup: 'sweet-alerts' },
        });
        if (!result.isConfirmed) return;
        try {
            const response = await fetch(`${API_URL}${resourceId}/media/${mediaId}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (response.ok || response.status === 204) {
                await fetchItems();
                setEditingItem((prev) => {
                    if (!prev || prev.id !== resourceId) return prev;
                    return { ...prev, media: (prev.media || []).filter((m) => m.id !== mediaId) };
                });
                Swal.fire({ title: 'Removed', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'sweet-alerts' } });
            } else {
                Swal.fire({ title: 'Error', text: 'Could not remove file.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error', text: 'Could not remove file.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const getBadges = (item: LearningCornerItem) => {
        const badges: string[] = [];
        const media = item.media ?? [];
        const ni = media.filter((m) => m.media_type === 'image').length;
        const nv = media.filter((m) => m.media_type === 'video').length;
        const nd = media.filter((m) => m.media_type === 'document').length;
        if (ni) badges.push(ni === 1 ? 'Image' : `${ni} Images`);
        if (nv) badges.push(nv === 1 ? 'Video' : `${nv} Videos`);
        if (nd) badges.push(nd === 1 ? 'Document' : `${nd} Documents`);
        if (item.links && item.links.length > 0) badges.push(`${item.links.length} Link(s)`);
        return badges;
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Learning Corner</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Manage educational resources and training materials for your company.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-72"
                            placeholder="Search learning resources..."
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
                    <select className="form-select w-40" value={filterType} onChange={(e) => setFilterType(e.target.value as FilterType)}>
                        <option value="all">All Types</option>
                        <option value="image">Images Only</option>
                        <option value="video">Videos Only</option>
                        <option value="document">Documents Only</option>
                    </select>
                    <select className="form-select w-36" value={sortType} onChange={(e) => setSortType(e.target.value as SortType)}>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="az">A-Z</option>
                    </select>
                    <select className="form-select w-32" value={viewType} onChange={(e) => setViewType(e.target.value as ViewType)}>
                        <option value="card">Card View</option>
                        <option value="table">Table View</option>
                    </select>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openCreateModal}>
                    <IconPlus /> Add Resource
                </button>
            </div>

            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading learning resources...</span>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500">No learning resources found.</div>
            ) : viewType === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredItems.map((item) => {
                        const mediaList = item.media ?? [];
                        return (
                            <div key={item.id} className="panel overflow-hidden border-0 shadow-md">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-bold">{item.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-3">{item.description || 'No description available.'}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" className="text-info hover:text-info-dark" onClick={() => { setPreviewItem(item); setPreviewOpen(true); }}>
                                            <IconEye className="w-5 h-5" />
                                        </button>
                                        <button type="button" className="text-primary hover:text-primary-dark" onClick={() => openEditModal(item)}>
                                            <IconPencil className="w-5 h-5" />
                                        </button>
                                        <button type="button" className="text-danger hover:text-danger-dark" onClick={() => handleDelete(item)}>
                                            <IconTrashLines className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {getBadges(item).map((badge) => (
                                        <span key={badge} className="badge badge-outline-primary">
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                                {mediaList.filter((m) => m.media_type === 'image').length > 0 && (
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        {mediaList
                                            .filter((m) => m.media_type === 'image')
                                            .map((m) => (
                                                <a key={`${m.id}-${m.url}`} href={m.url} target="_blank" rel="noreferrer" className="block aspect-video rounded border border-[#e0e6ed] overflow-hidden bg-gray-50">
                                                    <img src={m.url} alt={m.filename || ''} className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                    </div>
                                )}
                                <div className="mt-4 space-y-2 text-sm">
                                    {mediaList
                                        .filter((m) => m.media_type !== 'image')
                                        .map((m) => (
                                            <a key={`${m.id}-${m.url}`} href={m.url} target="_blank" rel="noreferrer" className="text-primary underline block truncate" title={m.filename}>
                                                {m.media_type === 'video' ? 'Video: ' : 'Document: '}
                                                {m.filename || m.url}
                                            </a>
                                        ))}
                                    {item.links && item.links.map((link, idx) => (
                                        <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="text-primary underline block">
                                            {link.title || link.url}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="panel p-0 border-0 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Description</th>
                                    <th>Assets</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={item.id}>
                                        <td className="font-semibold">{item.title}</td>
                                        <td className="text-gray-500 max-w-[320px] truncate">{item.description || '-'}</td>
                                        <td>
                                            <div className="flex flex-wrap gap-2">
                                                {getBadges(item).length ? getBadges(item).map((badge) => <span key={badge} className="badge badge-outline-primary">{badge}</span>) : <span className="text-gray-400">No assets</span>}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button type="button" className="text-info" onClick={() => { setPreviewItem(item); setPreviewOpen(true); }}>
                                                    <IconEye className="w-5 h-5" />
                                                </button>
                                                <button type="button" className="text-primary" onClick={() => openEditModal(item)}>
                                                    <IconPencil className="w-5 h-5" />
                                                </button>
                                                <button type="button" className="text-danger" onClick={() => handleDelete(item)}>
                                                    <IconTrashLines className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {totalCount > 0 && (
                <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b] panel">
                    <div className="flex flex-wrap items-center gap-4">
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
                                <option value={6}>6</option>
                                <option value={12}>12</option>
                                <option value={24}>24</option>
                            </select>
                        </div>
                    </div>
                    <ul className="inline-flex items-center space-x-1 font-semibold">
                        <li>
                            <button
                                type="button"
                                className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            >
                                Next
                            </button>
                        </li>
                    </ul>
                </div>
            )}

            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-3xl text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] py-3 px-5">
                                        {editingItem ? 'Edit Learning Resource' : 'Add Learning Resource'}
                                    </div>
                                    <div className="p-5">
                                        <form onSubmit={handleSave} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block">Title</label>
                                                <input className="form-input" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="font-semibold mb-1 block">Description</label>
                                                <textarea className="form-textarea min-h-[120px]" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="font-semibold mb-1 block">Files (images, videos, documents)</label>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Select multiple files. Type is detected from the file extension.</p>
                                                {editingItem && (editingItem.media?.length ?? 0) > 0 && (
                                                    <ul className="mb-3 space-y-2 text-sm border border-[#ebedf2] dark:border-[#1b2e4b] rounded-md p-3 bg-gray-50 dark:bg-[#0e1726]">
                                                        {(editingItem.media || []).map((m) => (
                                                            <li key={m.id ?? m.url} className="flex items-center justify-between gap-2">
                                                                <span className="truncate">
                                                                    <span className="font-semibold capitalize">{m.media_type}:</span>{' '}
                                                                    <a href={m.url} target="_blank" rel="noreferrer" className="text-primary underline">
                                                                        {m.filename || 'Open'}
                                                                    </a>
                                                                </span>
                                                                {m.id != null && (
                                                                    <button
                                                                        type="button"
                                                                        className="text-danger shrink-0"
                                                                        onClick={() => handleDeleteMedia(editingItem.id, m.id as number)}
                                                                    >
                                                                        <IconTrashLines className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                                                    className="form-input"
                                                    onChange={(e) => {
                                                        const list = e.target.files ? Array.from(e.target.files) : [];
                                                        setPendingMediaFiles((prev) => [...prev, ...list]);
                                                        e.target.value = '';
                                                    }}
                                                />
                                                {pendingMediaFiles.length > 0 && (
                                                    <ul className="mt-2 space-y-1 text-xs">
                                                        {pendingMediaFiles.map((f, i) => (
                                                            <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
                                                                <span className="truncate">{f.name}</span>
                                                                <button
                                                                    type="button"
                                                                    className="text-danger"
                                                                    onClick={() => setPendingMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            <div className="border-t border-[#ebedf2] dark:border-[#1b2e4b] pt-4 mt-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <label className="font-bold text-primary uppercase text-xs tracking-wider">External Links</label>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-xs btn-outline-primary flex items-center gap-1"
                                                        onClick={() => setFormData({ ...formData, links: [...formData.links, { title: '', url: '' }] })}
                                                    >
                                                        <IconPlus className="w-3 h-3" /> Add Link
                                                    </button>
                                                </div>
                                                
                                                {formData.links.length === 0 ? (
                                                    <div className="text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                                        <p className="text-xs text-white-dark italic">No external links added yet.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {formData.links.map((link, idx) => (
                                                            <div key={idx} className="flex gap-2 items-start animate-fade-in">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                                                                    <input 
                                                                        className="form-input text-xs" 
                                                                        placeholder="Link Title (e.g. Documentation)" 
                                                                        value={link.title} 
                                                                        onChange={(e) => {
                                                                            const newLinks = [...formData.links];
                                                                            newLinks[idx].title = e.target.value;
                                                                            setFormData({ ...formData, links: newLinks });
                                                                        }}
                                                                    />
                                                                    <input 
                                                                        className="form-input text-xs" 
                                                                        placeholder="URL (e.g. https://example.com)" 
                                                                        value={link.url} 
                                                                        onChange={(e) => {
                                                                            const newLinks = [...formData.links];
                                                                            newLinks[idx].url = e.target.value;
                                                                            setFormData({ ...formData, links: newLinks });
                                                                        }}
                                                                    />
                                                                </div>
                                                                <button 
                                                                    type="button" 
                                                                    className="text-danger hover:text-red-700 p-2"
                                                                    onClick={() => {
                                                                        const newLinks = formData.links.filter((_, i) => i !== idx);
                                                                        setFormData({ ...formData, links: newLinks });
                                                                    }}
                                                                >
                                                                    <IconTrashLines className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-3 pt-3">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setModalOpen(false)}>
                                                    Cancel
                                                </button>
                                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                                    {saving ? 'Saving...' : editingItem ? 'Update Resource' : 'Create Resource'}
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

            <Transition appear show={previewOpen} as={Fragment}>
                <Dialog as="div" open={previewOpen} onClose={() => setPreviewOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-4xl text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setPreviewOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] py-3 px-5">Preview Resource</div>
                                    <div className="p-5">
                                        {previewItem && (
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-xl font-bold">{previewItem.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{previewItem.description || 'No description available.'}</p>
                                                </div>
                                                {(previewItem.media && previewItem.media.length > 0) ? (
                                                    <div className="space-y-6">
                                                        {previewItem.media.filter((m) => m.media_type === 'image').length > 0 && (
                                                            <div>
                                                                <div className="font-semibold mb-2">Images</div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    {previewItem.media
                                                                        .filter((m) => m.media_type === 'image')
                                                                        .map((m) => (
                                                                            <img key={m.id ?? m.url} src={m.url} alt={m.filename} className="max-h-64 w-full object-contain rounded-lg border border-[#e0e6ed]" />
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {previewItem.media.filter((m) => m.media_type === 'video').length > 0 && (
                                                            <div>
                                                                <div className="font-semibold mb-2">Videos</div>
                                                                <div className="space-y-3">
                                                                    {previewItem.media
                                                                        .filter((m) => m.media_type === 'video')
                                                                        .map((m) => (
                                                                            <div key={m.id ?? m.url}>
                                                                                <video src={m.url} controls className="w-full max-h-72 rounded-lg border border-[#e0e6ed] bg-black" />
                                                                                <a className="text-primary underline text-sm mt-1 inline-block" href={m.url} target="_blank" rel="noreferrer">
                                                                                    Open in new tab
                                                                                </a>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {previewItem.media.filter((m) => m.media_type === 'document').length > 0 && (
                                                            <div>
                                                                <div className="font-semibold mb-2">Documents</div>
                                                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                                                    {previewItem.media
                                                                        .filter((m) => m.media_type === 'document')
                                                                        .map((m) => (
                                                                            <li key={m.id ?? m.url}>
                                                                                <a className="text-primary underline" href={m.url} target="_blank" rel="noreferrer">
                                                                                    {m.filename || 'Download'}
                                                                                </a>
                                                                            </li>
                                                                        ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400">No uploaded files for this resource.</p>
                                                )}
                                                
                                                {previewItem.links && previewItem.links.length > 0 && (
                                                    <div>
                                                        <div className="font-semibold mb-2">External Links</div>
                                                        <div className="flex flex-wrap gap-3">
                                                            {previewItem.links.map((link, idx) => (
                                                                <a 
                                                                    key={idx} 
                                                                    href={link.url} 
                                                                    target="_blank" 
                                                                    rel="noreferrer" 
                                                                    className="btn btn-sm btn-outline-primary"
                                                                >
                                                                    {link.title || 'Link'}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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

export default AdminLearningCorner;
