import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const RELIEVED_API_URL = `${API_BASE_URL}/app/relieved-employees/`;
const SEARCH_EMPLOYEE_URL = `${API_BASE_URL}/app/relieved-employees/search-employee/`;

type EmployeeSuggestion = {
    id: number;
    employee_id: string;
    full_name: string;
    department: string;
    designation: string;
};

type RelievedRecord = {
    id: number;
    employee_id?: string | null;
    employee_name?: string | null;
    relieving_date?: string | null;
    remarks?: string | null;
    employee_details?: {
        photo?: string | null;
        email?: string | null;
        mobile?: string | null;
        department_name?: string | null;
        designation_name?: string | null;
    };
};

const AdminRelievedEmployees = () => {
    const dispatch = useDispatch();

    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<EmployeeSuggestion[]>([]);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSuggestion | null>(null);
    const [relievingDate, setRelievingDate] = useState('');
    const [remarks, setRemarks] = useState('');

    const [listSearch, setListSearch] = useState('');
    const [rows, setRows] = useState<RelievedRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        dispatch(setPageTitle('Relieved Employees'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchRelieved();
        }, 400);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listSearch, page, pageSize]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const fetchRelieved = async () => {
        setLoading(true);
        try {
            const url = new URL(RELIEVED_API_URL);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (listSearch.trim()) url.searchParams.append('search', listSearch.trim());

            const res = await fetch(url.toString(), { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setRows(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.max(1, Math.ceil(data.count / pageSize)));
                } else {
                    setRows(data);
                    setTotalCount(Array.isArray(data) ? data.length : 0);
                    setTotalPages(1);
                }
            }
        } catch (e) {
            console.error('Error fetching relieved list', e);
        } finally {
            setLoading(false);
        }
    };

    const searchEmployees = async (q: string) => {
        setSearchTerm(q);
        setSelectedEmployee(null);
        if (q.trim().length < 2) {
            setSuggestions([]);
            setSuggestionsOpen(false);
            return;
        }
        try {
            const url = new URL(SEARCH_EMPLOYEE_URL);
            url.searchParams.append('q', q.trim());
            const res = await fetch(url.toString(), { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data);
                setSuggestionsOpen(true);
            }
        } catch (e) {
            console.error('Error searching employee', e);
        }
    };

    const relieveEmployee = async () => {
        if (!selectedEmployee) {
            Swal.fire({ title: 'Select employee', text: 'Pick an employee from suggestions.', icon: 'info', customClass: { popup: 'sweet-alerts' } });
            return;
        }
        if (!relievingDate) {
            Swal.fire({ title: 'Relieving date required', text: 'Please select relieving date.', icon: 'info', customClass: { popup: 'sweet-alerts' } });
            return;
        }

        try {
            const res = await fetch(RELIEVED_API_URL, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    employee: selectedEmployee.id,
                    relieving_date: relievingDate,
                    remarks: remarks.trim(),
                }),
            });

            if (res.ok) {
                Swal.fire({ title: 'Relieved!', text: 'Employee relieved successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setSearchTerm('');
                setSuggestions([]);
                setSuggestionsOpen(false);
                setSelectedEmployee(null);
                setRelievingDate('');
                setRemarks('');
                fetchRelieved();
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to relieve employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (e) {
            Swal.fire({ title: 'Error!', text: 'Failed to relieve employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#0e1726] to-[#ef4444] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Relieved Employees</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Search an active employee and relieve them. View relieved list below.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="panel mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="relative">
                        <label className="font-semibold mb-1 block">Search employee</label>
                        <input
                            className="form-input"
                            placeholder="Type name or employee id..."
                            value={searchTerm}
                            onChange={(e) => searchEmployees(e.target.value)}
                            onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                        />
                        {suggestionsOpen && suggestions.length > 0 && (
                            <div className="absolute z-20 mt-1 w-full rounded border bg-white dark:bg-[#0e1726] border-[#e0e6ed] dark:border-[#1b2e4b] shadow-lg max-h-60 overflow-auto">
                                {suggestions.map((s) => (
                                    <button
                                        type="button"
                                        key={s.id}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#191e3a]"
                                        onClick={() => {
                                            setSelectedEmployee(s);
                                            setSearchTerm(`${s.full_name} (${s.employee_id})`);
                                            setSuggestionsOpen(false);
                                        }}
                                    >
                                        <div className="font-semibold">{s.full_name} ({s.employee_id})</div>
                                        <div className="text-xs text-gray-500">{s.department} • {s.designation}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="font-semibold mb-1 block">Relieving date</label>
                        <input className="form-input" type="date" value={relievingDate} onChange={(e) => setRelievingDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="font-semibold mb-1 block">Remarks</label>
                        <input className="form-input" placeholder="Optional remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button type="button" className="btn btn-danger" onClick={relieveEmployee}>
                        Relieve Employee
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        className="form-input pr-10 w-72"
                        placeholder="Search relieved list..."
                        value={listSearch}
                        onChange={(e) => {
                            setListSearch(e.target.value);
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
                                <th>Relieving Date</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5">
                                        <span className="animate-pulse text-gray-400">Loading relieved employees...</span>
                                    </td>
                                </tr>
                            ) : rows.length > 0 ? (
                                rows.map((r, idx) => (
                                    <tr key={r.id}>
                                        <td>{(page - 1) * pageSize + idx + 1}</td>
                                        <td className="font-mono">{r.employee_id || '-'}</td>
                                        <td className="font-semibold">{r.employee_name || '-'}</td>
                                        <td className="text-gray-500">{r.relieving_date || '-'}</td>
                                        <td className="text-gray-500">{r.remarks || '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-5 text-gray-400">No relieved employees found.</td>
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

export default AdminRelievedEmployees;

