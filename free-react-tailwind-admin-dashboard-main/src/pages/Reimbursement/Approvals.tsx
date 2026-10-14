import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchReimbursements, approveReimbursement, rejectReimbursement, ReimbursementRequest } from './api';
import Swal from 'sweetalert2';
import IconChecks from '../../components/Icon/IconChecks';
import IconEye from '../../components/Icon/IconEye';
import PageHeader from '../../components/Common/PageHeader';
import DataTable, { Column } from '../../components/Common/DataTable';
import Button from '../../components/Common/Button';
import StatCard, { StatGrid } from '../../components/Common/StatCard';

const Approvals = () => {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // search / paging go to the backend
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        dispatch(setPageTitle('Reimbursement Approvals'));
    }, [dispatch]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchReimbursements({ search: search.trim(), page, page_size: pageSize, status: 'pending' });
            setRequests(data.results);
            setTotalCount(data.count);
        } catch (error) {
            console.error('Failed to load requests', error);
        } finally {
            setLoading(false);
        }
    }, [search, page, pageSize]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    const handleApprove = async (id: number) => {
        const result = await Swal.fire({
            title: 'Approve Claim?',
            text: 'Are you sure you want to approve this reimbursement?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Approve',
            customClass: { popup: 'sweet-alerts' },
        });
        if (!result.isConfirmed) return;
        try {
            await approveReimbursement(id);
            Swal.fire('Approved', 'Reimbursement request approved', 'success');
            load();
        } catch {
            Swal.fire('Error', 'Failed to approve request', 'error');
        }
    };

    const handleReject = async (id: number) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Request',
            input: 'textarea',
            inputLabel: 'Reason for rejection',
            inputPlaceholder: 'Type your reason here...',
            showCancelButton: true,
            customClass: { popup: 'sweet-alerts' },
            inputValidator: (value) => (!value ? 'You need to write a reason for rejection!' : undefined),
        });
        if (!reason) return;
        try {
            await rejectReimbursement(id, reason);
            Swal.fire('Rejected', 'Reimbursement request rejected', 'info');
            load();
        } catch {
            Swal.fire('Error', 'Failed to reject request', 'error');
        }
    };

    const columns: Column<ReimbursementRequest>[] = [
        {
            key: 'employee_name',
            title: 'Employee',
            render: (_v, r) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-mid text-sm font-bold text-white">{(r.employee_name || '?').charAt(0).toUpperCase()}</div>
                    <span className="font-bold text-slate-900">{r.employee_name}</span>
                </div>
            ),
        },
        { key: 'category_name', title: 'Category', render: (_v, r) => <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{r.category_name}</span> },
        { key: 'amount', title: 'Amount', render: (_v, r) => <span className="text-base font-black text-slate-900">₹{Number(r.amount).toLocaleString()}</span> },
        { key: 'description', title: 'Description', hideBelow: 'lg', render: (_v, r) => <p className="line-clamp-2 max-w-xs text-xs text-slate-600" title={r.description}>{r.description}</p> },
        {
            key: 'bill_attachment',
            title: 'Proof',
            hideBelow: 'md',
            render: (_v, r) =>
                r.bill_attachment ? (
                    <a href={r.bill_attachment} target="_blank" rel="noreferrer" className="block w-fit">
                        <Button variant="secondary" size="sm" leftIcon={<IconEye />} tabIndex={-1}>
                            View bill
                        </Button>
                    </a>
                ) : (
                    <span className="text-[11px] font-bold uppercase italic text-slate-400">No attachment</span>
                ),
        },
        {
            key: 'actions',
            title: 'Action',
            align: 'right',
            render: (_v, r) => (
                <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="success" onClick={() => handleApprove(r.id)}>
                        Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleReject(r.id)}>
                        Reject
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Pending Approvals" subtitle="Review and manage pending reimbursement claims from your team." icon={<IconChecks />} />

            <StatGrid cols={3} className="!mb-0">
                <StatCard label="Pending claims" value={totalCount} icon={<IconChecks />} tone="warning" hint="Waiting for your decision" />
            </StatGrid>

            <DataTable
                columns={columns}
                data={requests}
                rowKey={(r) => r.id}
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
                searchPlaceholder="Search by employee, category..."
                onRefresh={load}
                entityLabel="claims"
                emptyMessage="No pending claims"
                emptySubtitle="Everything has been reviewed."
                emptyIcon={<IconChecks className="h-10 w-10" />}
            />
        </div>
    );
};

export default Approvals;
