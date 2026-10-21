import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';
import IconLayoutGrid from '../../components/Icon/IconLayoutGrid';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconUser from '../../components/Icon/IconUser';
import DataTable, { Column } from '../../components/Common/DataTable';
import { Reportee, fetchMyReportees } from '../Employee/Reportees/api';

import PageHeader from '../../components/Common/PageHeader';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import StatCard, { StatGrid } from '../../components/Common/StatCard';
import IconChecks from '../../components/Icon/IconChecks';
import Button from '../../components/Common/Button';
import CardGrid from '../../components/Common/CardGrid';
type ViewMode = 'card' | 'table';

const statusBadgeClass = (status?: string) => {
    const normalized = (status || '').toLowerCase();
    if (['online', 'available', 'availableidle'].includes(normalized)) return 'bg-success-light text-success';
    if (['away', 'berightback'].includes(normalized)) return 'bg-warning-light text-warning';
    if (['dnd', 'busy', 'busyidle', 'donotdisturb'].includes(normalized)) return 'bg-danger-light text-danger';
    return 'bg-dark-light text-white-dark';
};

const AdminReportees = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<Reportee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('card');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const loadReportees = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMyReportees({
                page,
                page_size: pageSize,
                search: search.trim(),
            });
            setItems(data.results);
            setTotalCount(data.count);
            setTotalPages(data.total_pages);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load reportees';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search]);

    useEffect(() => {
        dispatch(setPageTitle('Reportees'));
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadReportees();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadReportees]);

    const onlineCount = useMemo(() => items.filter((r) => ['online', 'available', 'availableidle'].includes((r.teams_status || r.status || '').toLowerCase())).length, [items]);
    const checkedInCount = useMemo(() => items.filter((r) => r.is_checked_in).length, [items]);

    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const columns: Column<Reportee>[] = [
        {
            key: 'full_name',
            title: 'Employee',
            sortable: true,
            render: (_val, item: Reportee) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-primary-light text-primary flex items-center justify-center shrink-0">
                        {item.photo ? <img src={item.photo} alt={item.full_name} className="w-full h-full object-cover" /> : <IconUser className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-white-light">{item.full_name || '-'}</p>
                        <p className="text-xs text-gray-500">{item.employee_id || '-'}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'employee_id',
            title: 'Employee ID',
            sortable: true,
            render: (_val, item: Reportee) => <span className="font-mono text-xs">{item.employee_id || '-'}</span>,
        },
        {
            key: 'department_name',
            title: 'Department',
            sortable: true,
            render: (_val, item: Reportee) => <span>{item.department_name || '-'}</span>,
        },
        {
            key: 'designation_name',
            title: 'Designation',
            sortable: true,
            render: (_val, item: Reportee) => <span>{item.designation_name || '-'}</span>,
        },
        {
            key: 'status',
            title: 'Status',
            align: 'center',
            sortable: true,
            render: (_val, item: Reportee) => (
                <span className={`badge ${statusBadgeClass(item.teams_status || item.status)}`}>{item.teams_status || item.status || 'Offline'}</span>
            ),
        },
        {
            key: 'is_checked_in',
            title: 'Attendance',
            align: 'center',
            sortable: true,
            render: (_val, item: Reportee) => (
                <span className={`badge ${item.is_checked_in ? 'bg-success-light text-success' : 'bg-dark-light text-white-dark'}`}>
                    {item.is_checked_in ? 'Checked In' : 'Not Checked In'}
                </span>
            ),
        },
    ];

    const viewModeSwitcher = (
        <div className="flex items-center gap-1.5">
            <button
                type="button"
                className={`btn btn-sm p-2 ${viewMode === 'card' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('card')}
                title="Card View"
            >
                <IconLayoutGrid className="w-4 h-4" />
            </button>
            <button
                type="button"
                className={`btn btn-sm p-2 ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('table')}
                title="Table View"
            >
                <IconListCheck className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <PageHeader
                icon={<IconUsersGroup />}
                title="Reportees"
                subtitle="Quickly view your direct reportees with status and attendance presence."
            />

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <StatGrid cols={3}>
                <StatCard label="Total Reportees" value={totalCount} loading={loading} tone="primary" icon={<IconUsersGroup />} />
                <StatCard label="Online" value={onlineCount} loading={loading} tone="success" icon={<IconUser />} />
                <StatCard label="Checked In" value={checkedInCount} loading={loading} tone="info" icon={<IconChecks />} />
            </StatGrid>

            {viewMode === 'table' ? (
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
                    searchPlaceholder="Search by name, employee id, department or designation..."
                    onRefresh={loadReportees}
                    actionButton={viewModeSwitcher}
                />
            ) : (
                <>
                    <CardGrid
                        items={items}
                        loading={loading}
                        page={page}
                        pageSize={pageSize}
                        totalCount={totalCount}
                        pageSizeOptions={[6, 9, 12, 24]}
                        onPageChange={setPage}
                        onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                        searchValue={search}
                        onSearchChange={(v) => { setSearch(v); setPage(1); }}
                        searchPlaceholder="Search by name, employee id, department or designation..."
                        emptyMessage="No reportees found"
                        entityLabel="reportees"
                        cols={3}
                        onRefresh={loadReportees}
                        actions={viewModeSwitcher}
                        renderCard={(item) => (
                                <div className="panel border border-white-light dark:border-[#1b2e4b]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-light text-primary flex items-center justify-center shrink-0">
                                                {item.photo ? <img src={item.photo} alt={item.full_name} className="w-full h-full object-cover" /> : <IconUser className="w-6 h-6" />}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold truncate">{item.full_name || '-'}</h3>
                                                <p className="text-xs text-white-dark truncate">{item.employee_id || '-'}</p>
                                            </div>
                                        </div>
                                        <span className={`badge ${statusBadgeClass(item.teams_status || item.status)}`}>{item.teams_status || item.status || 'Offline'}</span>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-md bg-[#f8f9fa] dark:bg-[#060818] p-2">
                                            <p className="text-xs text-white-dark">Department</p>
                                            <p className="font-semibold truncate">{item.department_name || '-'}</p>
                                        </div>
                                        <div className="rounded-md bg-[#f8f9fa] dark:bg-[#060818] p-2">
                                            <p className="text-xs text-white-dark">Designation</p>
                                            <p className="font-semibold truncate">{item.designation_name || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs">
                                        <span className={`badge ${item.is_checked_in ? 'bg-success-light text-success' : 'bg-dark-light text-white-dark'}`}>
                                            {item.is_checked_in ? 'Checked In' : 'Not Checked In'}
                                        </span>
                                    </div>
                                </div>

                            )}
                    />

                </>
            )}

        </div>
    );
};

export default AdminReportees;
