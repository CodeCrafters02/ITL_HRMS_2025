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

    const onlineCount = useMemo(() => items.filter((r) => (r.status || '').toLowerCase() === 'online').length, [items]);
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

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#220fb6] via-[#4f6be5] to-[#0f52af] text-white border-0">
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
                    <p className="text-2xl font-bold mt-2">{totalCount}</p>
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

            <div className="panel space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 relative">
                        <input
                            type="text"
                            className="form-input pl-10"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
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

                <div className="rounded-md border border-white-light dark:border-[#1b2e4b] overflow-hidden">
                    <div className="p-4">
                        {loading ? (
                            <div className="text-center py-12 text-white-dark">Loading reportees...</div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-12 text-white-dark">No reportees found.</div>
                        ) : viewMode === 'card' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {items.map((item) => (
                                    <div key={item.id} className="rounded-md border border-white-light dark:border-[#1b2e4b] p-4 bg-white dark:bg-[#111c2d]">
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
                            <div className="table-responsive -m-4">
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
                                        {items.map((item) => (
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
                        )}
                    </div>

                    {totalCount > 0 && (
                        <div className="border-t border-white-light dark:border-[#1b2e4b] px-4 py-3">
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
                </div>
            </div>

        </div>
    );
};

export default Reportees;
