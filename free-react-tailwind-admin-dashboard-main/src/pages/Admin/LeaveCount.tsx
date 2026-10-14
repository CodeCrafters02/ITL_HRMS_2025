import { Fragment, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import DataTable, { Column } from '../../components/Common/DataTable';

import PageHeader from '../../components/Common/PageHeader';
import IconCalendar from '../../components/Icon/IconCalendar';
import Modal from '../../components/Common/Modal';
import Button, { IconButton } from '../../components/Common/Button';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/leaves/`;

type Leave = {
    id: number;
    leave_name: string;
    count: number;
    is_paid: boolean;
};

const AdminLeaveCount = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<Partial<Leave>>({ leave_name: '', count: 0, is_paid: false });

    useEffect(() => {
        dispatch(setPageTitle('Leave Count'));
    }, [dispatch]);

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', String(page));
            url.searchParams.append('page_size', String(pageSize));
            if (search.trim()) url.searchParams.append('search', search.trim());

            const resp = await fetch(url.toString(), { headers: headers() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load');
            if (data.results) {
                setItems(data.results);
                setTotalCount(data.count ?? 0);
            } else {
                const arr = Array.isArray(data) ? data : [];
                setItems(arr);
                setTotalCount(arr.length);
            }
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchAll();
        }, 300);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, search]);

    const openAdd = () => {
        setForm({ leave_name: '', count: 0, is_paid: false });
        setModalOpen(true);
    };
    const openEdit = (l: Leave) => {
        setForm({ ...l });
        setModalOpen(true);
    };

    const save = async () => {
        try {
            const payload = {
                leave_name: (form.leave_name || '').trim(),
                count: Number(form.count || 0),
                is_paid: !!form.is_paid,
            };
            if (!payload.leave_name) {
                Swal.fire('Required', 'Leave name is required.', 'warning');
                return;
            }
            const isEdit = !!form.id;
            const resp = await fetch(isEdit ? `${API_URL}${form.id}/` : API_URL, {
                method: isEdit ? 'PUT' : 'POST',
                headers: headers(),
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to save');
            setModalOpen(false);
            await fetchAll();
            Swal.fire('Success', isEdit ? 'Leave updated.' : 'Leave added.', 'success');
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to save', 'error');
        }
    };

    const del = async (l: Leave) => {
        const ok = await Swal.fire({ title: `Delete "${l.leave_name}"?`, showCancelButton: true, confirmButtonText: 'Delete' });
        if (!ok.isConfirmed) return;
        try {
            const resp = await fetch(`${API_URL}${l.id}/`, { method: 'DELETE', headers: headers() });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data?.detail || 'Failed to delete');
            }
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to delete', 'error');
        }
    };

    const columns: Column<Leave>[] = [
        {
            key: 'id',
            label: '#',
            width: '60px',
            align: 'center',
            render: (_val, _row, idx) => <span className="font-semibold text-gray-500">{(idx ?? 0) + 1}</span>,
        },
        {
            key: 'leave_name',
            label: 'Leave Name',
            sortable: true,
            render: (_val, row) => <span className="font-semibold text-gray-800 dark:text-white-light">{row.leave_name}</span>,
        },
        {
            key: 'count',
            label: 'Total Days Allowed',
            sortable: true,
            render: (_val, row) => <span className="badge bg-primary/10 text-primary font-bold px-3 py-1 rounded-full">{row.count} days</span>,
        },
        {
            key: 'is_paid',
            label: 'Type',
            sortable: true,
            render: (_val, row) => (
                <span className={`badge ${row.is_paid ? 'badge-outline-success text-success bg-success/10' : 'badge-outline-danger text-danger bg-danger/10'}`}>
                    {row.is_paid ? 'Paid Leave' : 'Unpaid Leave'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, row) => (
                <div className="flex items-center justify-center gap-2">
                    <IconButton tone="primary"
                        type="button"
                        
                        onClick={() => openEdit(row)}
                        title="Edit Leave"
                    >
                        <IconPencil className="w-4 h-4" />
                    </IconButton>
                    <IconButton tone="danger"
                        type="button"
                        
                        onClick={() => del(row)}
                        title="Delete Leave"
                    >
                        <IconTrashLines className="w-4 h-4" />
                    </IconButton>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Gradient Banner Header */}
            <PageHeader
                icon={<IconCalendar />}
                title="Leave Count"
                subtitle="Configure leave types and counts."
            />

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setPage(1);
                }}
                searchValue={search}
                onSearchChange={(val) => {
                    setSearch(val);
                    setPage(1);
                }}
                onRefresh={fetchAll}
                searchPlaceholder="Search leave policies..."
                actionButton={
                    <Button type="button"  onClick={openAdd}>
                        <IconPlus className="w-4 h-4" /> Add Leave
                    </Button>
                }
            />

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Edit Leave' : 'Add Leave'} size="lg">
                <div className="space-y-4">
                                                        <div>
                                                            <label className="font-semibold">Leave Name</label>
                                                            <input className="form-input" value={form.leave_name || ''} onChange={(e) => setForm({ ...form, leave_name: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <label className="font-semibold">Count</label>
                                                            <input className="form-input" type="number" min={0} value={Number(form.count || 0)} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} />
                                                        </div>
                                                        <div>
                                                            <label className="font-semibold">Paid?</label>
                                                            <select className="form-select" value={form.is_paid ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_paid: e.target.value === 'true' })}>
                                                                <option value="true">Yes</option>
                                                                <option value="false">No</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex justify-end gap-3 pt-2">
                                                            <Button variant="outline-danger" type="button"  onClick={() => setModalOpen(false)}>
                                                                Cancel
                                                            </Button>
                                                            <Button type="button"  onClick={save}>
                                                                Save
                                                            </Button>
                                                        </div>

                </div>
            </Modal>
        </div>
    );
};

export default AdminLeaveCount;

