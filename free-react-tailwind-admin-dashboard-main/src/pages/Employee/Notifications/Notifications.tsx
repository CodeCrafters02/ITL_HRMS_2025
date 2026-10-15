import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconBell from '../../../components/Icon/IconBell';
import { EmployeeNotification, NotificationType, fetchEmployeeNotifications } from './api';

import DataTable, { Column } from '../../../components/Common/DataTable';
import StatCard, { StatGrid } from '../../../components/Common/StatCard';
import PageHeader from '../../../components/Common/PageHeader';
type NotificationFilter = 'all' | 'unread' | NotificationType;

const typeBadgeClass = (type: NotificationType) => {
    switch (type) {
        case 'admin':
            return 'bg-primary-light text-primary';
        case 'calendar':
            return 'bg-info-light text-info';
        case 'learning_corner':
            return 'bg-success-light text-success';
        case 'birthday':
            return 'bg-warning-light text-warning';
        case 'notification':
            return 'bg-secondary-light text-secondary';
        default:
            return 'bg-dark-light text-white-dark';
    }
};

const typeLabel = (type: NotificationType) => {
    switch (type) {
        case 'learning_corner':
            return 'Learning';
        default:
            return type.charAt(0).toUpperCase() + type.slice(1);
    }
};

const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || '-';
    return date.toLocaleString();
};

const getDateHeading = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown Date';

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const oneDayMs = 24 * 60 * 60 * 1000;
    const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / oneDayMs);

    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const Notifications = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<EmployeeNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<NotificationFilter>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [summary, setSummary] = useState({
        total: 0,
        unread: 0,
        today: 0,
    });

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchEmployeeNotifications({
                page,
                page_size: pageSize,
                search: search.trim(),
                type: filter === 'unread' ? 'all' : filter,
                unread: filter === 'unread',
            });
            setItems(data.results);
            setTotalCount(data.count);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load notifications';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, filter]);

    const loadSummary = useCallback(async () => {
        try {
            const [allMeta, unreadMeta] = await Promise.all([
                fetchEmployeeNotifications({ page: 1, page_size: 1, type: 'all' }),
                fetchEmployeeNotifications({ page: 1, page_size: 1, unread: true, type: 'all' }),
            ]);

            let todayTotal = 0;
            const scanPageSize = 100;
            const totalPages = Math.max(1, Math.ceil((allMeta.count || 0) / scanPageSize));
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            const todayEnd = todayStart + 24 * 60 * 60 * 1000;

            for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
                const pageData = await fetchEmployeeNotifications({
                    page: currentPage,
                    page_size: scanPageSize,
                    type: 'all',
                });

                if (!pageData.results.length) break;

                for (const n of pageData.results) {
                    const timestamp = new Date(n.date).getTime();
                    if (!Number.isNaN(timestamp) && timestamp >= todayStart && timestamp < todayEnd) {
                        todayTotal += 1;
                    }
                }
            }

            setSummary({
                total: allMeta.count || 0,
                unread: unreadMeta.count || 0,
                today: todayTotal,
            });
        } catch {
            setSummary((prev) => prev);
        }
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Notifications'));
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadNotifications();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadNotifications]);

    useEffect(() => {
        loadSummary();
        const intervalId = window.setInterval(loadSummary, 30000);
        return () => window.clearInterval(intervalId);
    }, [loadSummary]);

    const columns: Column<EmployeeNotification>[] = [
        {
            key: 'title',
            title: 'Notification',
            render: (_v, item) => (
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <IconBell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{item.title || 'Notification'}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{item.description || '-'}</p>
                    </div>
                </div>
            ),
        },
        { key: 'type', title: 'Type', hideBelow: 'sm', render: (_v, item) => <span className={`badge ${typeBadgeClass(item.type)}`}>{typeLabel(item.type)}</span> },
        {
            key: 'date',
            title: 'When',
            align: 'right',
            render: (_v, item) => (
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">{getDateHeading(item.date)}</p>
                    <p className="text-[11px] text-slate-400">{formatDateTime(item.date)}</p>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Notifications" subtitle="Stay updated with company announcements, events, and personal alerts." icon={<IconBell />} />

            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
            )}

            <StatGrid cols={3} className="!mb-0">
                <StatCard label="Total notifications" value={summary.total} icon={<IconBell />} tone="primary" active={filter === 'all'} onClick={() => { setFilter('all'); setPage(1); }} />
                <StatCard label="Unread" value={summary.unread} icon={<IconBell />} tone="warning" active={filter === 'unread'} onClick={() => { setFilter('unread'); setPage(1); }} />
                <StatCard label="Today" value={summary.today} icon={<IconBell />} tone="success" />
            </StatGrid>

            <DataTable
                columns={columns}
                data={items}
                rowKey={(n) => n.id}
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
                searchPlaceholder="Search notifications..."
                onRefresh={loadNotifications}
                entityLabel="notifications"
                emptyMessage="No notifications found"
                emptyIcon={<IconBell className="h-10 w-10" />}
                filters={
                    <select
                        className="form-select h-10 w-44 rounded-xl text-xs"
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value as NotificationFilter);
                            setPage(1);
                        }}
                    >
                        <option value="all">All types</option>
                        <option value="unread">Unread</option>
                        <option value="notification">General</option>
                        <option value="admin">Admin</option>
                        <option value="calendar">Calendar</option>
                        <option value="learning_corner">Learning</option>
                        <option value="birthday">Birthday</option>
                    </select>
                }
            />
        </div>
    );
};

export default Notifications;
