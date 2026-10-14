import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import DataTable, { Column } from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import IconClock from '../../components/Icon/IconClock';

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

    const columns: Column<EmployeeRow>[] = [
        {
            key: 'id',
            title: '#',
            width: '60px',
            align: 'center',
            render: (_val, _emp, idx) => <span className="font-semibold text-gray-500">{(idx ?? 0) + 1}</span>,
        },
        {
            key: 'employee_id',
            title: 'Employee ID',
            sortable: true,
            render: (_val, emp) => <span className="font-semibold text-[#0062E0]">{emp.employee_id || '-'}</span>,
        },
        {
            key: 'name',
            title: 'Name',
            sortable: true,
            render: (_val, emp) => <span className="font-semibold text-gray-800 dark:text-white-light">{`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '-'}</span>,
        },
        {
            key: 'current_shift',
            title: 'Current Shift',
            render: (_val, emp) => (
                <span className={emp.shift_assigned ? "badge bg-info/10 text-info font-medium" : "text-gray-400"}>
                    {emp.shift_assigned ? `${emp.shift_assigned.shift_type} (${emp.shift_assigned.checkin} - ${emp.shift_assigned.checkout})` : 'No Shift'}
                </span>
            ),
        },
        {
            key: 'assign_shift',
            title: 'Assign Shift',
            render: (_val, emp) => (
                <select
                    className="form-select min-w-[200px] text-xs py-1.5 px-3 rounded-lg border-[#cbd5e1] dark:border-[#1e293b] dark:bg-[#121e32] focus:border-[#0062E0]"
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
            ),
        },
        {
            key: 'actions',
            title: 'Action',
            align: 'center',
            width: '100px',
            render: (_val, emp) => (
                <button type="button" className="btn btn-sm btn-success px-4" onClick={() => handleAssign(emp)}>
                    Assign
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Assign Shifts"
                subtitle="Search employees and assign personalized shift policies across your organization."
                icon={<IconClock />}
                badge="Workforce Scheduling"
                variant="indigo"
            />

            <DataTable
                columns={columns}
                data={employees}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(val) => { setSearch(val); setPage(1); }}
                searchPlaceholder="Search employees by name, ID..."
                onRefresh={fetchEmployees}
            />
        </div>
    );
};

export default AdminAssignShifts;

