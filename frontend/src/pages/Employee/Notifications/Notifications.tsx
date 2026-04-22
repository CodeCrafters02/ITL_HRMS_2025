import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';
import IconBell from '../../../components/Icon/IconBell';
import { EmployeeNotification, NotificationType, fetchEmployeeNotifications } from './api';

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
    const [totalPages, setTotalPages] = useState(1);

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
            setTotalPages(data.total_pages);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load notifications';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, filter]);

    useEffect(() => {
        dispatch(setPageTitle('Notifications'));
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadNotifications();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadNotifications]);

    const unreadCount = useMemo(() => items.filter((n) => n.read === false).length, [items]);
    const todayCount = useMemo(() => {
        const today = new Date();
        return items.filter((n) => {
            const d = new Date(n.date);
            return !Number.isNaN(d.getTime()) && d.toDateString() === today.toDateString();
        }).length;
    }, [items]);

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

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#220fb6] via-[#4f6be5] to-[#0f52af] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold">Notifications</h1>
                        <p className="mt-1 text-white/80">Stay updated with company announcements, events, and personal alerts.</p>
                    </div>
                    {/* <button type="button" className="btn btn-outline-light w-full md:w-auto" onClick={loadNotifications}>
                        Refresh
                    </button> */}
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Total Notifications</p>
                    <p className="text-2xl font-bold mt-2">{totalCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Unread</p>
                    <p className="text-2xl font-bold mt-2 text-warning">{unreadCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Today</p>
                    <p className="text-2xl font-bold mt-2 text-primary">{todayCount}</p>
                </div>
            </div>

            <div className="panel">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 relative">
                        <input
                            type="text"
                            className="form-input pl-10"
                            value={search}
                            placeholder="Search notifications..."
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                            <IconSearch className="h-4 w-4" />
                        </span>
                    </div>

                    <select
                        className="form-select"
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value as NotificationFilter);
                            setPage(1);
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="unread">Unread</option>
                        <option value="notification">General</option>
                        <option value="admin">Admin</option>
                        <option value="calendar">Calendar</option>
                        <option value="learning_corner">Learning</option>
                        <option value="birthday">Birthday</option>
                    </select>
                </div>
            </div>

            {totalCount > 0 && (
                <div className="panel">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-xs text-white-dark">
                            Showing <span className="text-primary font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
                            <span className="text-primary font-semibold">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                            <span className="text-primary font-semibold">{totalCount}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-white-dark">Per page</label>
                            <select
                                className="form-select w-20 text-xs"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        <ul className="inline-flex items-center gap-1">
                            <li>
                                <button type="button" className="btn btn-sm btn-outline-primary px-2.5" onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page === 1}>
                                    Prev
                                </button>
                            </li>
                            {getPageNumbers().map((p, idx) =>
                                p === '...' ? <li key={`dots-${idx}`} className="px-2 text-white-dark">...</li> : (
                                    <li key={p}>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-outline-primary'} min-w-[34px]`}
                                            onClick={() => setPage(p as number)}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                ),
                            )}
                            <li>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary px-2.5"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            <div className="panel">
                {loading ? (
                    <div className="py-12 text-center text-white-dark">Loading notifications...</div>
                ) : items.length === 0 ? (
                    <div className="py-12 text-center text-white-dark">No notifications found.</div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div key={item.id} className="border border-white-light dark:border-[#1b2e4b] rounded-md p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center mt-1 shrink-0">
                                        <IconBell className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold">{item.title || 'Notification'}</h3>
                                            <span className={`badge ${typeBadgeClass(item.type)}`}>{typeLabel(item.type)}</span>
                                            {item.read === false && <span className="badge bg-danger-light text-danger">Unread</span>}
                                        </div>
                                        <p className="text-sm text-white-dark mt-1">{item.description || '-'}</p>
                                        <p className="text-xs text-white-dark mt-2">{formatDateTime(item.date)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default Notifications;
