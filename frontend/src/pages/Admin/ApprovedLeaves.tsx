import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type LeaveLog = {
    id: number;
    employee_name?: string;
    manager_name?: string;
    leave_type?: string;
    status?: string;
    reason?: string;
    from_date?: string;
    to_date?: string;
};

const AdminApprovedLeaves = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<LeaveLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        dispatch(setPageTitle('Approved Leaves'));
    }, [dispatch]);

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = {};
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/approved-leaves/`);
            url.searchParams.set('page', String(page));
            url.searchParams.set('page_size', String(pageSize));
            if (search.trim()) url.searchParams.set('search', search.trim());

            const resp = await fetch(url.toString(), { headers: headers() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load approved leaves');

            const list = data?.results ?? data;
            const arr = Array.isArray(list) ? list : [];
            setItems(arr);
            const count = Number(data?.count ?? arr.length);
            setTotalCount(count);
            setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => fetchAll(), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, page, pageSize]);

    const rows = useMemo(() => items, [items]);

    return (
        <div className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <div className="text-xl font-bold">Approved Leaves</div>
                    <div className="text-sm text-white-dark">Approved leave logs with search and pagination.</div>
                </div>
                <div className="relative w-full max-w-[320px]">
                    <input
                        className="form-input pl-10"
                        placeholder="Search employee/leave/reason..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                        <IconSearch className="w-4 h-4" />
                    </span>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table-hover">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Employee</th>
                            <th>Manager</th>
                            <th>Leave Type</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-6 text-white-dark">
                                    Loading...
                                </td>
                            </tr>
                        ) : rows.length ? (
                            rows.map((r, idx) => (
                                <tr key={r.id}>
                                    <td>{(page - 1) * pageSize + idx + 1}</td>
                                    <td className="font-semibold">{r.employee_name || '-'}</td>
                                    <td>{r.manager_name || '-'}</td>
                                    <td>{r.leave_type || '-'}</td>
                                    <td>{r.from_date ? new Date(r.from_date).toLocaleDateString() : '-'}</td>
                                    <td>{r.to_date ? new Date(r.to_date).toLocaleDateString() : '-'}</td>
                                    <td className="max-w-[340px] truncate" title={r.reason || ''}>
                                        {r.reason || '-'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center py-6 text-white-dark">
                                    No approved leaves found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalCount > 0 && (
                <div className="flex flex-wrap justify-between items-center gap-3 p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b] mt-4">
                    <div className="text-sm text-white-dark">
                        Showing <span className="text-primary">{(page - 1) * pageSize + 1}</span> to{' '}
                        <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-primary">{totalCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Per page:</span>
                        <select
                            className="form-select w-20 text-sm font-semibold py-1"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-outline-primary" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            Prev
                        </button>
                        <div className="text-sm font-semibold">
                            Page {page} / {totalPages}
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminApprovedLeaves;

