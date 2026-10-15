import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchCategories, createCategory, updateCategory, deleteCategory, ReimbursementCategory } from './api';
import Swal from 'sweetalert2';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconPlus from '../../components/Icon/IconPlus';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import PageHeader from '../../components/Common/PageHeader';
import DataTable, { Column } from '../../components/Common/DataTable';
import Button, { IconButton } from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';

const EMPTY: Partial<ReimbursementCategory> = { name: '', description: '', min_tenure_months: 0 };

const Categories = () => {
    const dispatch = useDispatch();
    const [categories, setCategories] = useState<ReimbursementCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [current, setCurrent] = useState<Partial<ReimbursementCategory>>(EMPTY);

    // search / paging go to the backend
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        dispatch(setPageTitle('Reimbursement Categories'));
    }, [dispatch]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchCategories({ search: search.trim(), page, page_size: pageSize });
            setCategories(data.results);
            setTotalCount(data.count);
        } catch (error) {
            console.error('Failed to load categories', error);
        } finally {
            setLoading(false);
        }
    }, [search, page, pageSize]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    const openAdd = () => {
        setCurrent(EMPTY);
        setEditMode(false);
        setShowModal(true);
    };

    const openEdit = (cat: ReimbursementCategory) => {
        setCurrent(cat);
        setEditMode(true);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!current.name?.trim()) {
            Swal.fire('Error', 'Name is required', 'error');
            return;
        }
        setSaving(true);
        try {
            if (editMode && current.id) {
                await updateCategory(current.id, current);
                Swal.fire('Success', 'Category updated successfully', 'success');
            } else {
                await createCategory(current);
                Swal.fire('Success', 'Category created successfully', 'success');
            }
            setShowModal(false);
            load();
        } catch (error: any) {
            Swal.fire('Error', error?.response?.data?.error || error?.response?.data?.[0] || 'Failed to save category', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            customClass: { popup: 'sweet-alerts' },
        });
        if (!result.isConfirmed) return;
        try {
            await deleteCategory(id);
            Swal.fire('Deleted!', 'Category has been deleted.', 'success');
            load();
        } catch {
            Swal.fire('Error', 'Failed to delete category', 'error');
        }
    };

    const columns: Column<ReimbursementCategory>[] = [
        { key: 'name', title: 'Name', render: (_v, c) => <span className="font-bold text-brand">{c.name}</span> },
        { key: 'description', title: 'Description', hideBelow: 'md', render: (_v, c) => <span className="text-slate-600">{c.description || '-'}</span> },
        {
            key: 'min_tenure_months',
            title: 'Min tenure',
            align: 'center',
            render: (_v, c) =>
                c.min_tenure_months > 0 ? (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">{c.min_tenure_months} months</span>
                ) : (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600">Immediate</span>
                ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'right',
            render: (_v, c) => (
                <div className="flex items-center justify-end gap-1">
                    <IconButton label="Edit category" onClick={() => openEdit(c)}>
                        <IconPencil />
                    </IconButton>
                    <IconButton tone="danger" label="Delete category" onClick={() => handleDelete(c.id)}>
                        <IconTrashLines />
                    </IconButton>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reimbursement Categories"
                subtitle="Manage categories for employee reimbursement requests."
                icon={<IconListCheck />}
                actions={
                    <Button leftIcon={<IconPlus />} onClick={openAdd}>
                        Add Category
                    </Button>
                }
            />

            <DataTable
                columns={columns}
                data={categories}
                rowKey={(c) => c.id}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                    setPageSize(n);
                    setPage(1);
                }}
                searchValue={search}
                onSearchChange={(v) => {
                    setSearch(v);
                    setPage(1);
                }}
                searchPlaceholder="Search categories..."
                onRefresh={load}
                entityLabel="categories"
                emptyMessage="No categories found"
                emptyIcon={<IconListCheck className="h-10 w-10" />}
            />

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editMode ? 'Edit Category' : 'Add Category'}
                size="lg"
                dismissible={false}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} loading={saving}>
                            {editMode ? 'Update Category' : 'Save Category'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="form-label">Category Name</label>
                        <input type="text" className="form-input" placeholder="e.g., Travel, Food, Stationery" value={current.name || ''} onChange={(e) => setCurrent({ ...current, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="form-label">Min Tenure (Months)</label>
                        <input
                            type="number"
                            min={0}
                            className="form-input"
                            placeholder="Months after joining (0 for immediate)"
                            value={current.min_tenure_months || 0}
                            onChange={(e) => setCurrent({ ...current, min_tenure_months: Number(e.target.value) })}
                        />
                        <p className="mt-1 text-xs italic text-slate-500">Employees must complete this many months after joining to apply.</p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Categories;
