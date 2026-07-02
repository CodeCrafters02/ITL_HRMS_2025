import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconX from '../../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/employee/course-categories/`;

export type CourseCategoryType = {
    id: number;
    name: string;
    description: string;
    courses_count?: number;
};

const CourseCategory = () => {
    const dispatch = useDispatch();
    const [categories, setCategories] = useState<CourseCategoryType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CourseCategoryType | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    useEffect(() => {
        dispatch(setPageTitle('Course Categories'));
        fetchCategories();
    }, [dispatch]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await authFetch(API_URL, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                // ModelViewSet returns simple list or paginated list.
                // If it is paginated, check results:
                if (data.results) {
                    setCategories(data.results);
                } else if (Array.isArray(data)) {
                    setCategories(data);
                } else {
                    setCategories([]);
                }
            }
        } catch (error) {
            console.error('Error fetching course categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCategories = useMemo(() => {
        return categories.filter((cat) => {
            const matchesSearch =
                cat.name.toLowerCase().includes(search.toLowerCase()) ||
                cat.description.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });
    }, [categories, search]);

    const resetForm = () => {
        setFormData({ name: '', description: '' });
        setEditingCategory(null);
    };

    const openCreateModal = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEditModal = (cat: CourseCategoryType) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            description: cat.description || '',
        });
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingCategory ? `${API_URL}${editingCategory.id}/` : API_URL;
            const method = editingCategory ? 'PUT' : 'POST';

            const response = await authFetch(url, {
                method: method,
                headers: getHeaders(),
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                Swal.fire({
                    title: editingCategory ? 'Updated!' : 'Created!',
                    text: editingCategory ? 'Category updated successfully.' : 'Category created successfully.',
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setModalOpen(false);
                resetForm();
                fetchCategories();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({
                    title: 'Error!',
                    text: err ? Object.values(err).flat().join(' ') : 'Failed to save category.',
                    icon: 'error',
                    customClass: { popup: 'sweet-alerts' },
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: 'Failed to connect to backend server.',
                icon: 'error',
                customClass: { popup: 'sweet-alerts' },
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (cat: CourseCategoryType) => {
        const result = await Swal.fire({
            title: 'Delete Category?',
            text: `Are you sure you want to delete "${cat.name}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${API_URL}${cat.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Category has been deleted.',
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                fetchCategories();
            } else {
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete category.',
                    icon: 'error',
                    customClass: { popup: 'sweet-alerts' },
                });
            }
        } catch {
            Swal.fire({
                title: 'Error!',
                text: 'Failed to connect to server.',
                icon: 'error',
                customClass: { popup: 'sweet-alerts' },
            });
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-72"
                            placeholder="Search categories..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openCreateModal}>
                    <IconPlus /> Add Category
                </button>
            </div>

            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading course categories...</span>
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500">No categories found.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCategories.map((cat) => (
                        <div
                            key={cat.id}
                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] hover:shadow-lg transition-all duration-300 rounded-xl relative overflow-hidden group flex flex-col justify-between"
                        >
                            {/* Decorative gradient top edge */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                            
                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white-light group-hover:text-primary transition-colors">
                                        {cat.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="text-primary hover:text-primary-dark p-1 rounded-md hover:bg-primary/10 transition"
                                            onClick={() => openEditModal(cat)}
                                            title="Edit Category"
                                        >
                                            <IconPencil className="w-4.5 h-4.5" />
                                        </button>
                                        <button
                                            type="button"
                                            className="text-danger hover:text-danger-dark p-1 rounded-md hover:bg-danger/10 transition"
                                            onClick={() => handleDelete(cat)}
                                            title="Delete Category"
                                        >
                                            <IconTrashLines className="w-4.5 h-4.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 mb-6">
                                    {cat.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 flex items-center justify-between mt-auto">
                                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                    Curriculum
                                </span>
                                <span className="badge badge-outline-primary rounded-full px-3 py-1 font-bold text-xs">
                                    {cat.courses_count || 0} {cat.courses_count === 1 ? 'Course' : 'Courses'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
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
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl relative">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition outline-none"
                                    >
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        {editingCategory ? 'Edit Course Category' : 'Add Course Category'}
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleSave} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block text-gray-700 dark:text-gray-300">
                                                    Category Name <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    className="form-input rounded-lg"
                                                    required
                                                    placeholder="e.g. Technical Skills"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="font-semibold mb-1 block text-gray-700 dark:text-gray-300">
                                                    Description
                                                </label>
                                                <textarea
                                                    className="form-textarea min-h-[100px] rounded-lg"
                                                    placeholder="Provide details about what this category covers..."
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-lg"
                                                    onClick={() => setModalOpen(false)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary rounded-lg shadow-md px-5"
                                                    disabled={saving}
                                                >
                                                    {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
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

export default CourseCategory;
