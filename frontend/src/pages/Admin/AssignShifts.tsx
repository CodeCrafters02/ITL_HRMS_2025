import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API_URL = `${API_BASE_URL}/app/employee/`;
const SHIFT_API_URL = `${API_BASE_URL}/app/shift-policies/?page_size=1000`;
const ASSIGN_SHIFT_URL = `${API_BASE_URL}/app/assignshift/`;

type ShiftPolicy = {
    id: number;
    shift_type: string;
    checkin: string;
    checkout: string;
};

type EmployeeRow = {
    id: number;
    employee_id?: string;
    first_name?: string;
    last_name?: string;
    shift_assigned?: ShiftPolicy | null;
};

const AdminAssignShifts = () => {
    const dispatch = useDispatch();
    const [employees, setEmployees] = useState<EmployeeRow[]>([]);
    const [shifts, setShifts] = useState<ShiftPolicy[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [selectedShift, setSelectedShift] = useState<Record<number, number>>({});

    useEffect(() => {
        dispatch(setPageTitle('Assign Shifts'));
        fetchShifts();
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchEmployees();
        }, 400);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, page, pageSize]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const fetchShifts = async () => {
        try {
            const res = await fetch(SHIFT_API_URL, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setShifts(data.results || data);
            }
        } catch (e) {
            console.error('Error fetching shifts', e);
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const url = new URL(EMPLOYEE_API_URL);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (search.trim()) url.searchParams.append('search', search.trim());
            const res = await fetch(url.toString(), { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setEmployees(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.max(1, Math.ceil(data.count / pageSize)));
                } else {
                    setEmployees(data);
                    setTotalCount(Array.isArray(data) ? data.length : 0);
                    setTotalPages(1);
                }
            }
        } catch (e) {
            console.error('Error fetching employees', e);
        } finally {
            setLoading(false);
        }
    };

    const displayEmployees = useMemo(() => employees, [employees]);

    const handleAssign = async (employee: EmployeeRow) => {
        const shiftId = selectedShift[employee.id];
        if (!shiftId) {
            Swal.fire({ title: 'Select a shift', text: 'Please choose a shift before assigning.', icon: 'info', customClass: { popup: 'sweet-alerts' } });
            return;
        }
        try {
            const res = await fetch(ASSIGN_SHIFT_URL, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ employee_id: employee.id, shift_id: shiftId }),
            });
            if (res.ok) {
                Swal.fire({ title: 'Assigned!', text: 'Shift assigned successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                fetchEmployees();
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to assign shift.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (e) {
            Swal.fire({ title: 'Error!', text: 'Failed to assign shift.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#0e1726] to-[#22c55e] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Assign Shifts</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Search employees and assign shift policies.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        className="form-input pr-10 w-72"
                        placeholder="Search employees..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <IconSearch className="w-4 h-4" />
                    </span>
                </div>
            </div>

            <div className="panel p-0 border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Employee ID</th>
                                <th>Name</th>
                                <th>Current Shift</th>
                                <th>Assign Shift</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-5">
                                        <span className="animate-pulse text-gray-400">Loading employees...</span>
                                    </td>
                                </tr>
                            ) : displayEmployees.length > 0 ? (
                                displayEmployees.map((emp, index) => (
                                    <tr key={emp.id}>
                                        <td>{(page - 1) * pageSize + index + 1}</td>
                                        <td className="font-mono">{emp.employee_id || '-'}</td>
                                        <td className="font-semibold">{`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '-'}</td>
                                        <td className="text-gray-500">
                                            {emp.shift_assigned ? `${emp.shift_assigned.shift_type} (${emp.shift_assigned.checkin} - ${emp.shift_assigned.checkout})` : 'No Shift'}
                                        </td>
                                        <td>
                                            <select
                                                className="form-select min-w-[220px]"
                                                value={selectedShift[emp.id] ?? emp.shift_assigned?.id ?? ''}
                                                onChange={(e) => setSelectedShift((prev) => ({ ...prev, [emp.id]: Number(e.target.value) }))}
                                            >
                                                <option value="">Select shift</option>
                                                {shifts.map((s) => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.shift_type} ({s.checkin} - {s.checkout})
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="text-center">
                                            <button type="button" className="btn btn-sm btn-success" onClick={() => handleAssign(emp)}>
                                                Assign
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-5 text-gray-400">No employees found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalCount > 0 && (
                    <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                                Showing <span className="text-primary">{(page - 1) * pageSize + 1}</span> to <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-primary">{totalCount}</span> entries
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
                        </div>
                        <ul className="inline-flex items-center space-x-1 font-semibold">
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    Prev
                                </button>
                            </li>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <li key={p}>
                                    <button
                                        type="button"
                                        className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${page === p ? 'bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]' : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'}`}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </button>
                                </li>
                            ))}
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAssignShifts;

