import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';
import IconLayoutGrid from '../../../components/Icon/IconLayoutGrid';
import IconListCheck from '../../../components/Icon/IconListCheck';
import IconUser from '../../../components/Icon/IconUser';
import { Reportee, fetchMyReportees } from './api';

type ViewMode = 'card' | 'table';

const statusBadgeClass = (status?: string) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'online') return 'bg-success-light text-success';
    if (normalized === 'away') return 'bg-warning-light text-warning';
    if (normalized === 'dnd') return 'bg-danger-light text-danger';
    return 'bg-dark-light text-white-dark';
};

const Reportees = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<Reportee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('card');

    const loadReportees = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMyReportees();
            setItems(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load reportees';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Reportees'));
    }, [dispatch]);

    useEffect(() => {
        loadReportees();
    }, [loadReportees]);

    const onlineCount = useMemo(() => items.filter((r) => (r.status || '').toLowerCase() === 'online').length, [items]);
    const checkedInCount = useMemo(() => items.filter((r) => r.is_checked_in).length, [items]);

    const filteredItems = useMemo(() => {
        const lowered = search.trim().toLowerCase();
        if (!lowered) return items;
        return items.filter((item) =>
            [item.full_name, item.employee_id, item.department_name, item.designation_name, item.status]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(lowered)),
        );
    }, [items, search]);

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#0e1726] to-[#1b2e4b] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold">Reportees</h1>
                        <p className="mt-1 text-white/80">Quickly view your direct reportees with status and attendance presence.</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Total Reportees</p>
                    <p className="text-2xl font-bold mt-2">{items.length}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Online</p>
                    <p className="text-2xl font-bold mt-2 text-success">{onlineCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Checked In</p>
                    <p className="text-2xl font-bold mt-2 text-primary">{checkedInCount}</p>
                </div>
            </div>

            <div className="panel">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 relative">
                        <input
                            type="text"
                            className="form-input pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, employee id, department or designation..."
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            className={`btn btn-sm p-2 ${viewMode === 'card' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('card')}
                        >
                            <IconLayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm p-2 ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('table')}
                        >
                            <IconListCheck className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="panel text-center py-12 text-white-dark">Loading reportees...</div>
            ) : filteredItems.length === 0 ? (
                <div className="panel text-center py-12 text-white-dark">No reportees found.</div>
            ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="panel border border-white-light dark:border-[#1b2e4b]">
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
                                <span className={`badge ${statusBadgeClass(item.status)}`}>{item.status || 'Offline'}</span>
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
                    ))}
                </div>
            ) : (
                <div className="panel p-0 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Employee ID</th>
                                    <th>Department</th>
                                    <th>Designation</th>
                                    <th>Status</th>
                                    <th>Attendance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={item.id}>
                                        <td className="font-semibold">{item.full_name || '-'}</td>
                                        <td>{item.employee_id || '-'}</td>
                                        <td>{item.department_name || '-'}</td>
                                        <td>{item.designation_name || '-'}</td>
                                        <td>
                                            <span className={`badge ${statusBadgeClass(item.status)}`}>{item.status || 'Offline'}</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${item.is_checked_in ? 'bg-success-light text-success' : 'bg-dark-light text-white-dark'}`}>
                                                {item.is_checked_in ? 'Checked In' : 'Not Checked In'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reportees;
