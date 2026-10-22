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
    departments?: number[];
    department_names?: string[];
    accrual?: 'yearly' | 'monthly';
    carry_forward_month?: boolean;
    carry_forward_year?: boolean;
    carry_forward_max?: number | null;
    effective_from?: string | null;
};
type Dept = { id: number; department_name: string };
const BLANK: Partial<Leave> = { leave_name: '', count: 0, is_paid: false, departments: [], accrual: 'yearly', carry_forward_month: false, carry_forward_year: false, carry_forward_max: null };

const AdminLeaveCount = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<Partial<Leave> & { new_effective_from?: string }>(BLANK);
    const [departments, setDepartments] = useState<Dept[]>([]);
    const [coverage, setCoverage] = useState<{ all: boolean; ids: Set<number> } | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Leave Count'));
    }, [dispatch]);

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    useEffect(() => {
        fetch(`${API_BASE_URL}/app/departments/?page_size=1000`, { headers: headers() })
            .then((x) => x.json())
            .then((d) => setDepartments(Array.isArray(d) ? d : d?.results || []))
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            fetch(`${API_URL}?page_size=1000`, { headers: headers() })
                .then((x) => x.json())
                .then((d) => {
                    const list: Leave[] = Array.isArray(d) ? d : d?.results || [];
                    setCoverage({ all: list.some((l) => !(l.departments || []).length), ids: new Set(list.flatMap((l) => l.departments || [])) });
                })
                .catch(() => {});
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
        setForm(BLANK);
        setModalOpen(true);
    };
    const openEdit = (l: Leave) => {
        setForm({ ...l, new_effective_from: new Date().toLocaleDateString('en-CA') });
        setModalOpen(true);
    };

    const save = async () => {
        try {
            const payload = {
                leave_name: (form.leave_name || '').trim(),
                count: Number(form.count || 0),
                is_paid: !!form.is_paid,
                departments: form.departments || [],
                accrual: form.accrual || 'yearly',
                carry_forward_month: form.accrual === 'monthly' && !!form.carry_forward_month,
                carry_forward_year: !!form.carry_forward_year,
                carry_forward_max: form.carry_forward_max === null || form.carry_forward_max === undefined || (form.carry_forward_max as any) === '' ? null : Number(form.carry_forward_max),
                effective_from: form.id && form.new_effective_from ? form.new_effective_from : undefined,
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
            if (!resp.ok) throw new Error(data?.detail || Object.values(data || {}).flat().join(' ') || 'Failed to save');
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
            key: 'departments',
            label: 'Departments',
            render: (_val, row) => <span className="text-sm">{row.department_names?.length ? row.department_names.join(', ') : 'All Departments'}</span>,
        },
        {
            key: 'accrual',
            label: 'Carry Forward',
            render: (_val, row) => {
                const tags = [row.accrual === 'monthly' ? 'Per month' : 'Per year'];
                if (row.accrual === 'monthly' && row.carry_forward_month) tags.push('→ next month');
                if (row.carry_forward_year) tags.push('→ next year');
                if ((row.carry_forward_month || row.carry_forward_year) && row.carry_forward_max != null) tags.push(`max ${row.carry_forward_max}`);
                return <span className="text-sm">{tags.join(' · ')}</span>;
            },
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

            {coverage && !coverage.all && departments.some((d) => !coverage.ids.has(d.id)) && (
                <div className="rounded border border-warning bg-warning-light text-warning p-3 text-sm">
                    <strong>Leaves not defined</strong> for: {departments.filter((d) => !coverage.ids.has(d.id)).map((d) => d.department_name).join(', ')}. Employees in these departments have no leave types to apply for.
                </div>
            )}

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
                                                            <label className="font-semibold">Applicable Departments</label>
                                                            <div className="flex flex-wrap gap-3 mt-2">
                                                                <label className="flex items-center gap-2">
                                                                    <input type="checkbox" className="form-checkbox" checked={!(form.departments || []).length} onChange={() => setForm({ ...form, departments: [] })} />
                                                                    All Departments
                                                                </label>
                                                                {departments.map((d) => (
                                                                    <label key={d.id} className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="form-checkbox"
                                                                            checked={(form.departments || []).includes(d.id)}
                                                                            onChange={(e) => setForm({ ...form, departments: e.target.checked ? [...(form.departments || []), d.id] : (form.departments || []).filter((x) => x !== d.id) })}
                                                                        />
                                                                        {d.department_name}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="font-semibold">Count</label>
                                                                <input className="form-input" type="number" min={0} value={Number(form.count || 0)} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} />
                                                            </div>
                                                            <div>
                                                                <label className="font-semibold">Count Is</label>
                                                                <select className="form-select" value={form.accrual || 'yearly'} onChange={(e) => setForm({ ...form, accrual: e.target.value as 'yearly' | 'monthly' })}>
                                                                    <option value="yearly">Per year</option>
                                                                    <option value="monthly">Per month</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="flex items-center gap-2">
                                                                <input type="checkbox" className="form-checkbox" disabled={form.accrual !== 'monthly'} checked={form.accrual === 'monthly' && !!form.carry_forward_month} onChange={(e) => setForm({ ...form, carry_forward_month: e.target.checked })} />
                                                                Carry forward remaining leaves to next month {form.accrual !== 'monthly' && <span className="text-xs text-white-dark">(needs "Per month")</span>}
                                                            </label>
                                                            <label className="flex items-center gap-2">
                                                                <input type="checkbox" className="form-checkbox" checked={!!form.carry_forward_year} onChange={(e) => setForm({ ...form, carry_forward_year: e.target.checked })} />
                                                                Carry forward remaining leaves to next year
                                                            </label>
                                                            {(form.carry_forward_month || form.carry_forward_year) && (
                                                                <div>
                                                                    <label className="font-semibold">Max days carried (optional)</label>
                                                                    <input className="form-input" type="number" min={0} placeholder="No limit" value={form.carry_forward_max ?? ''} onChange={(e) => setForm({ ...form, carry_forward_max: e.target.value === '' ? null : Number(e.target.value) })} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        {form.id && (
                                                            <div>
                                                                <label className="font-semibold">Effective From</label>
                                                                <input className="form-input" type="date" value={form.new_effective_from || ''} onChange={(e) => setForm({ ...form, new_effective_from: e.target.value })} />
                                                                <div className="text-xs text-white-dark mt-1">
                                                                    Count/carry-forward changes apply from this date (defaults to today); earlier balances stay as they were.
                                                                    {form.effective_from ? ` Current version started ${form.effective_from}.` : ''}
                                                                </div>
                                                            </div>
                                                        )}
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

