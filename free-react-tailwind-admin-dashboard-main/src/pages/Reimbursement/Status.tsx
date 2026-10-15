import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchReimbursements, fetchReimbursementStats, ReimbursementRequest } from './api';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconFile from '../../components/Icon/IconFile';
import IconCashBanknotes from '../../components/Icon/IconCashBanknotes';
import IconCircleCheck from '../../components/Icon/IconCircleCheck';
import IconClock from '../../components/Icon/IconClock';
import PageHeader from '../../components/Common/PageHeader';
import DataTable, { Column } from '../../components/Common/DataTable';
import StatCard, { StatGrid } from '../../components/Common/StatCard';

const money = (n?: number) => `₹${(n || 0).toLocaleString()}`;

const Status = () => {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // search / filter / paging go to the backend
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        dispatch(setPageTitle('Reimbursement Status'));
    }, [dispatch]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [data, statsData] = await Promise.all([
                fetchReimbursements({ search: search.trim(), status: statusFilter, page, page_size: pageSize }),
                fetchReimbursementStats({ search: search.trim(), status: statusFilter }),
            ]);
            setRequests(data.results);
            setTotalCount(data.count);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load requests', error);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, page, pageSize]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    const columns: Column<ReimbursementRequest>[] = [
        {
            key: 'created_at',
            title: 'Date',
            render: (_v, r) => (
                <span className="flex items-center gap-2 text-slate-700">
                    <IconCalendar className="h-4 w-4 text-slate-400" />
                    {new Date(r.created_at).toLocaleDateString()}
                </span>
            ),
        },
        { key: 'category_name', title: 'Category', render: (_v, r) => <span className="font-semibold text-brand">{r.category_name}</span> },
        { key: 'amount', title: 'Amount', render: (_v, r) => <span className="text-base font-black text-slate-900">{money(Number(r.amount))}</span> },
        {
            key: 'status',
            title: 'Status',
            align: 'center',
            render: (_v, r) => (
                <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                        r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : r.status === 'rejected' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                    }`}
                >
                    {r.status}
                </span>
            ),
        },
        {
            key: 'reporting_manager_name',
            title: 'Manager',
            hideBelow: 'md',
            render: (_v, r) => (
                <div>
                    <p className="text-slate-600">{r.reporting_manager_name || 'System Admin'}</p>
                    {r.bill_attachment && (
                        <a href={r.bill_attachment} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
                            <IconFile className="h-3 w-3" /> View my bill
                        </a>
                    )}
                </div>
            ),
        },
        {
            key: 'description',
            title: 'Description / reason',
            hideBelow: 'lg',
            render: (_v, r) => (
                <div className="max-w-xs">
                    <p className="truncate text-slate-600" title={r.description}>
                        {r.description}
                    </p>
                    {r.status === 'rejected' && r.rejection_reason && (
                        <p className="mt-1 whitespace-normal rounded-lg border border-rose-100 bg-rose-50 p-2 text-xs text-rose-700">
                            <span className="font-bold">Rejected:</span> {r.rejection_reason}
                        </p>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="My Reimbursement Status" subtitle="Track your submitted expense claims and their approval status." icon={<IconListCheck />} />

            <StatGrid cols={3} className="!mb-0">
                <StatCard label="Total claimed" value={money(stats?.overall?.total_amount)} icon={<IconCashBanknotes />} tone="primary" active={statusFilter === ''} onClick={() => { setStatusFilter(''); setPage(1); }} />
                <StatCard label="Approved" value={money(stats?.overall?.approved_amount)} icon={<IconCircleCheck />} tone="success" active={statusFilter === 'approved'} onClick={() => { setStatusFilter('approved'); setPage(1); }} />
                <StatCard label="Pending" value={money(stats?.overall?.pending_amount)} icon={<IconClock />} tone="warning" active={statusFilter === 'pending'} onClick={() => { setStatusFilter('pending'); setPage(1); }} />
            </StatGrid>

            <DataTable
                title="Request history"
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
                searchPlaceholder="Search by category, description..."
                onRefresh={load}
                entityLabel="requests"
                emptyMessage="No reimbursement requests found"
                emptyIcon={<IconListCheck className="h-10 w-10" />}
                filters={
                    <select
                        className="form-select h-10 w-40 rounded-xl text-xs"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                }
            />
        </div>
    );
};

export default Status;
