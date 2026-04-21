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

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchEmployeeNotifications();
            setItems(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load notifications';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Notifications'));
    }, [dispatch]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const unreadCount = useMemo(() => items.filter((n) => n.read === false).length, [items]);
    const todayCount = useMemo(() => {
        const today = new Date();
        return items.filter((n) => {
            const d = new Date(n.date);
            return !Number.isNaN(d.getTime()) && d.toDateString() === today.toDateString();
        }).length;
    }, [items]);

    const filteredItems = useMemo(() => {
        const lowered = search.trim().toLowerCase();
        return items.filter((item) => {
            const filterMatch =
                filter === 'all' ||
                (filter === 'unread' && item.read === false) ||
                item.type === filter;

            const searchMatch =
                !lowered ||
                item.title.toLowerCase().includes(lowered) ||
                item.description.toLowerCase().includes(lowered) ||
                item.type.toLowerCase().includes(lowered);

            return filterMatch && searchMatch;
        });
    }, [items, filter, search]);

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#0e1726] to-[#1b2e4b] text-white border-0">
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
                    <p className="text-2xl font-bold mt-2">{items.length}</p>
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
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                            <IconSearch className="h-4 w-4" />
                        </span>
                    </div>

                    <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value as NotificationFilter)}>
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

            <div className="panel">
                {loading ? (
                    <div className="py-12 text-center text-white-dark">Loading notifications...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="py-12 text-center text-white-dark">No notifications found.</div>
                ) : (
                    <div className="space-y-3">
                        {filteredItems.map((item) => (
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
