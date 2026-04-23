import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchCategories, createCategory, updateCategory, deleteCategory, ReimbursementCategory } from './api';
import Swal from 'sweetalert2';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconPlus from '../../components/Icon/IconPlus';

const Categories = () => {
    const dispatch = useDispatch();
    const [categories, setCategories] = useState<ReimbursementCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Partial<ReimbursementCategory>>({ name: '', description: '' });
    
    // Pagination and Search
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        dispatch(setPageTitle('Reimbursement Categories'));
        loadCategories();
    }, [dispatch, page, pageSize, search]);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await fetchCategories({
                search: search,
                page: page,
                page_size: pageSize,
            });
            setCategories(data.results);
            setTotalCount(data.count);
        } catch (error) {
            console.error('Failed to load categories', error);
        } finally {
            setLoading(false);
        }
    };
    
    const totalPages = Math.ceil(totalCount / pageSize);

    const handleSave = async () => {
        if (!currentCategory.name) {
            Swal.fire('Error', 'Name is required', 'error');
            return;
        }

        try {
            if (editMode && currentCategory.id) {
                await updateCategory(currentCategory.id, currentCategory);
                Swal.fire('Success', 'Category updated successfully', 'success');
            } else {
                await createCategory(currentCategory);
                Swal.fire('Success', 'Category created successfully', 'success');
            }
            setShowModal(false);
            loadCategories();
        } catch (error) {
            Swal.fire('Error', 'Failed to save category', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await deleteCategory(id);
                Swal.fire('Deleted!', 'Category has been deleted.', 'success');
                loadCategories();
            } catch (error) {
                Swal.fire('Error', 'Failed to delete category', 'error');
            }
        }
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            {/* Header Banner */}
            <div className="panel bg-gradient-to-r from-[#5c1ac3] via-[#7c3aed] to-[#a855f7] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <IconListCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold">Reimbursement Categories</h1>
                            <p className="mt-1 text-white/80">Manage categories for employee reimbursement requests.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn bg-white text-primary border-0 hover:bg-white/90 shadow-md flex items-center gap-2"
                        onClick={() => {
                            setCurrentCategory({ name: '', description: '' });
                            setEditMode(false);
                            setShowModal(true);
                        }}
                    >
                        <IconPlus className="w-4 h-4" />
                        Add Category
                    </button>
                </div>
            </div>

            {/* Filter and Content Panel */}
            <div className="panel p-0 border-0 overflow-hidden shadow-lg">
                <div className="flex items-center justify-between p-5 border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
                    <h5 className="font-bold text-lg dark:text-white-light">All Categories</h5>
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-64 h-10 text-sm"
                            placeholder="Search categories..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                    </div>
                </div>

                <div className="table-responsive min-h-[300px]">
                    <table className="table-hover">
                        <thead>
                            <tr className="bg-[#f6f8fa] dark:bg-[#1a2234]">
                                <th>Name</th>
                                <th>Description</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-8 h-8 border-4 border-primary border-l-transparent rounded-full animate-spin"></div>
                                            <span className="text-white-dark font-medium">Loading categories...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <IconListCheck className="w-12 h-12 text-gray-300" />
                                            <span className="text-white-dark font-medium text-lg">No categories found</span>
                                            {search && <p className="text-sm text-gray-400">Try adjusting your search query</p>}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                categories.map((cat) => (
                                    <tr key={cat.id}>
                                        <td className="font-semibold text-primary">{cat.name}</td>
                                        <td className="text-gray-600 dark:text-gray-400">{cat.description || '-'}</td>
                                        <td className="text-center">
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    className="btn btn-sm btn-outline-info hover:bg-info hover:text-white"
                                                    onClick={() => {
                                                        setCurrentCategory(cat);
                                                        setEditMode(true);
                                                        setShowModal(true);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger hover:bg-danger hover:text-white" onClick={() => handleDelete(cat.id)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalCount > 0 && (
                    <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                                Showing <span className="text-primary">{(page - 1) * pageSize + 1}</span> to <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-primary">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Per page:</span>
                                <select
                                    className="form-select w-20 text-sm font-semibold py-1 h-9"
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
                                    className="flex justify-center font-semibold px-4 py-2 rounded-lg transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    Previous
                                </button>
                            </li>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <li key={p}>
                                    <button
                                        type="button"
                                        className={`flex justify-center font-semibold px-4 py-2 rounded-lg transition text-sm ${page === p ? 'bg-primary text-white shadow-lg' : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'}`}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </button>
                                </li>
                            ))}
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold px-4 py-2 rounded-lg transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
                    <div className="panel w-full max-w-lg animate__animated animate__zoomIn animate__faster">
                        <div className="flex items-center justify-between mb-4">
                            <h5 className="font-bold text-xl">{editMode ? 'Edit Category' : 'Add Category'}</h5>
                            <button type="button" className="text-white-dark hover:text-danger" onClick={() => setShowModal(false)}>
                                &times;
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Category Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., Travel, Food, Stationery"
                                    value={currentCategory.name}
                                    onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-textarea min-h-[100px]"
                                    placeholder="Enter category description..."
                                    value={currentCategory.description}
                                    onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn btn-outline-danger" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                {editMode ? 'Update Category' : 'Save Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Categories;
