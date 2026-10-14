import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchReimbursements, fetchReimbursementStats, ReimbursementRequest } from './api';
import IconFile from '../../components/Icon/IconFile';
import IconUsers from '../../components/Icon/IconUsers';
import IconCashBanknotes from '../../components/Icon/IconCashBanknotes';
import IconCircleCheck from '../../components/Icon/IconCircleCheck';
import IconClock from '../../components/Icon/IconClock';
import IconListCheck from '../../components/Icon/IconListCheck';
import PageHeader from '../../components/Common/PageHeader';
import DataTable, { Column } from '../../components/Common/DataTable';
import StatCard, { StatGrid } from '../../components/Common/StatCard';
import Button from '../../components/Common/Button';

const statusBadge = (status: string) => (
    <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
            status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : status === 'rejected' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
        }`}
    >
        {status}
    </span>
);

const money = (n?: number) => `₹${(n || 0).toLocaleString()}`;

const History = () => {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // every filter is sent to the backend
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        dispatch(setPageTitle('Reimbursement History & Stats'));
        axios
            .get(`${import.meta.env.VITE_API_BASE_URL}/app/employee/?page_size=1000`, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } })
            .then((r) => setEmployees(r.data.results || r.data))
            .catch((e) => console.error('Failed to fetch employees', e));
    }, [dispatch]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { search: search.trim(), status: statusFilter, employee: employeeFilter, start_date: startDate, end_date: endDate, page, page_size: pageSize };
            const [requestsData, statsData] = await Promise.all([fetchReimbursements(params), fetchReimbursementStats(params)]);
            setRequests(requestsData.results);
            setTotalCount(requestsData.count);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, statusFilter, employeeFilter, startDate, endDate]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPage(1);
    };
    const hasFilters = !!(search || statusFilter || employeeFilter || startDate || endDate);

    const columns: Column<ReimbursementRequest>[] = [
        {
            key: 'employee_name',
            title: 'Employee',
            render: (_v, r) => (
                <div>
                    <p className="font-bold text-slate-900">{r.employee_name}</p>
                    <p className="text-[10px] uppercase tracking-tight text-slate-400">Approver: {r.reporting_manager_name || 'Admin'}</p>
                </div>
            ),
        },
        {
            key: 'category_name',
            title: 'Details',
            hideBelow: 'md',
            render: (_v, r) => (
                <div>
                    <p className="text-xs font-semibold text-brand">{r.category_name}</p>
                    <p className="max-w-[220px] truncate text-xs text-slate-500" title={r.description}>
                        {r.description}
                    </p>
                </div>
            ),
        },
        { key: 'amount', title: 'Amount', render: (_v, r) => <span className="font-black text-slate-900">{money(Number(r.amount))}</span> },
        { key: 'status', title: 'Status', align: 'center', render: (_v, r) => statusBadge(r.status) },
        {
            key: 'bill_attachment',
            title: 'Bill',
            align: 'center',
            render: (_v, r) =>
                r.bill_attachment ? (
                    <a href={r.bill_attachment} target="_blank" rel="noreferrer" className="inline-flex text-brand hover:text-brand-dark" title="Open bill">
                        <IconFile className="h-5 w-5" />
                    </a>
                ) : (
                    <span className="text-slate-300">-</span>
                ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Reimbursement Master History" subtitle="Audit all claims and view expenditure statistics." icon={<IconUsers />} />

            <StatGrid cols={4} className="!mb-0">
                <StatCard label="Filtered total" value={money(stats?.overall?.total_amount)} icon={<IconCashBanknotes />} tone="primary" />
                <StatCard label="Total approved" value={money(stats?.overall?.approved_amount)} icon={<IconCircleCheck />} tone="success" />
                <StatCard label="Total pending" value={money(stats?.overall?.pending_amount)} icon={<IconClock />} tone="warning" />
                <StatCard label="Claims count" value={totalCount} icon={<IconListCheck />} tone="info" />
            </StatGrid>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <DataTable
                        title="Detailed claim records"
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
                        onSearchChange={resetPage(setSearch)}
                        searchPlaceholder="Search description..."
                        onRefresh={load}
                        entityLabel="claims"
                        emptyMessage="No records found"
                        emptyIcon={<IconFile className="h-10 w-10" />}
                        filters={
                            <>
                                <select className="form-select h-10 w-48 rounded-xl text-xs" value={employeeFilter} onChange={(e) => resetPage(setEmployeeFilter)(e.target.value)}>
                                    <option value="">All employees</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                                        </option>
                                    ))}
                                </select>
                                <select className="form-select h-10 w-36 rounded-xl text-xs" value={statusFilter} onChange={(e) => resetPage(setStatusFilter)(e.target.value)}>
                                    <option value="">All statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <input type="date" aria-label="From date" className="form-input h-10 w-40 rounded-xl text-xs" value={startDate} onChange={(e) => resetPage(setStartDate)(e.target.value)} />
                                <input type="date" aria-label="To date" className="form-input h-10 w-40 rounded-xl text-xs" value={endDate} onChange={(e) => resetPage(setEndDate)(e.target.value)} />
                                {hasFilters && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setSearch('');
                                            setStatusFilter('');
                                            setEmployeeFilter('');
                                            setStartDate('');
                                            setEndDate('');
                                            setPage(1);
                                        }}
                                    >
                                        Clear filters
                                    </Button>
                                )}
                            </>
                        }
                    />
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                        <IconUsers className="h-5 w-5 text-brand" />
                        <h3 className="text-sm font-bold text-slate-900">Employee expenditure</h3>
                    </div>
                    <div className="max-h-[640px] overflow-y-auto">
                        {stats?.employee_wise?.length > 0 ? (
                            stats.employee_wise.map((item: any) => (
                                <div key={item.employee_id} className="border-b border-slate-50 p-4 transition-colors hover:bg-brand-50/40">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                {item.employee__first_name} {item.employee__last_name}
                                            </p>
                                            <p className="text-[11px] font-semibold uppercase text-slate-400">{item.count} claims</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-black text-brand">{money(item.total)}</p>
                                            <p className="text-[10px] font-bold uppercase text-emerald-600">{money(item.approved)} approved</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                                        <div className="h-1.5 rounded-full bg-brand transition-all duration-500" style={{ width: `${Math.min((item.approved / (item.total || 1)) * 100, 100)}%` }} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="p-10 text-center text-sm font-medium text-slate-400">No stats available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default History;
