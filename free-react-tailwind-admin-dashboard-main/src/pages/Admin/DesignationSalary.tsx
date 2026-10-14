import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconSave from '../../components/Icon/IconSave';
import DataTable, { Column } from '../../components/Common/DataTable';

import PageHeader from '../../components/Common/PageHeader';
import IconCashBanknotes from '../../components/Icon/IconCashBanknotes';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const SALARY_API_URL = `${API_BASE_URL}/app/designation-salaries/`;
const DESIGNATION_API_URL = `${API_BASE_URL}/app/designations/`;
const DEPARTMENT_API_URL = `${API_BASE_URL}/app/departments/?page_size=1000`;

type DepartmentOption = {
    id: number;
    department_name: string;
};

type DesignationRecord = {
    id: number;
    designation_name: string;
    department: number;
    level_name?: string;
};

type SalaryRecord = {
    id?: number;
    designation: number;
    basic_pay: number | string;
    designation_name?: string;
};

const DesignationSalary = () => {
    const dispatch = useDispatch();
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [designations, setDesignations] = useState<DesignationRecord[]>([]);
    const [salaries, setSalaries] = useState<Record<number, SalaryRecord>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<number | null>(null);

    // Backend pagination & search
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Designation Salaries'));
        fetchDepartments();
    }, [dispatch]);

    useEffect(() => {
        if (selectedDepartment) {
            const timer = setTimeout(() => {
                fetchData();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setDesignations([]);
            setSalaries({});
            setTotalCount(0);
        }
    }, [selectedDepartment, page, pageSize, search]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const fetchDepartments = async () => {
        try {
            const response = await fetch(DEPARTMENT_API_URL, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setDepartments(data.results || data);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Designations for this department with backend pagination and search
            const desUrl = new URL(DESIGNATION_API_URL);
            desUrl.searchParams.append('page', page.toString());
            desUrl.searchParams.append('page_size', pageSize.toString());
            if (selectedDepartment) desUrl.searchParams.append('department', selectedDepartment);
            if (search.trim()) desUrl.searchParams.append('search', search.trim());

            const salUrl = new URL(SALARY_API_URL);
            salUrl.searchParams.append('page_size', '1000');
            if (selectedDepartment) salUrl.searchParams.append('department', selectedDepartment);

            const [desRes, salRes] = await Promise.all([
                fetch(desUrl.toString(), { headers: getHeaders() }),
                fetch(salUrl.toString(), { headers: getHeaders() })
            ]);

            if (desRes.ok) {
                const desData = await desRes.json();
                const desList = desData.results || desData;
                setDesignations(desList);
                setTotalCount(desData.count !== undefined ? desData.count : desList.length);

                let salList = [];
                if (salRes.ok) {
                    const salData = await salRes.json();
                    salList = salData.results || salData;
                }

                // Map salaries by designation ID
                const salMap: Record<number, SalaryRecord> = {};
                salList.forEach((s: any) => {
                    salMap[s.designation] = {
                        id: s.id,
                        designation: s.designation,
                        basic_pay: s.basic_pay
                    };
                });

                // Ensure every designation has an entry in salMap
                desList.forEach((d: DesignationRecord) => {
                    if (!salMap[d.id]) {
                        salMap[d.id] = {
                            designation: d.id,
                            basic_pay: '0.00'
                        };
                    }
                });

                setSalaries(salMap);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePayChange = (designationId: number, value: string) => {
        setSalaries(prev => ({
            ...prev,
            [designationId]: {
                ...prev[designationId],
                basic_pay: value
            }
        }));
    };

    const saveSalary = async (designationId: number) => {
        const salary = salaries[designationId];
        if (!salary) return;

        setSaving(designationId);
        try {
            const isUpdate = !!salary.id;
            const url = isUpdate ? `${SALARY_API_URL}${salary.id}/` : SALARY_API_URL;
            const method = isUpdate ? 'PATCH' : 'POST';
            
            const payload = {
                designation: salary.designation,
                basic_pay: salary.basic_pay
            };

            const response = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const savedData = await response.json();
                setSalaries(prev => ({
                    ...prev,
                    [designationId]: savedData
                }));
                Swal.fire({
                    title: 'Saved!',
                    text: 'Basic pay updated successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    customClass: { popup: 'sweet-alerts' }
                });
            } else {
                Swal.fire({ title: 'Error!', text: 'Failed to save salary.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (error) {
            console.error('Save error:', error);
            Swal.fire({ title: 'Error!', text: 'An unexpected error occurred.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        } finally {
            setSaving(null);
        }
    };

    const columns: Column<DesignationRecord>[] = [
        {
            key: 'index',
            title: '#',
            width: '60px',
            align: 'center',
            render: (_val, _row, index) => (
                <span className="font-semibold text-gray-500">{(page - 1) * pageSize + (index ?? 0) + 1}</span>
            ),
        },
        {
            key: 'designation_name',
            title: 'Designation',
            sortable: true,
            render: (val) => (
                <span className="font-bold text-[#1e3a5f] dark:text-white-light">{val}</span>
            ),
        },
        {
            key: 'level_name',
            title: 'Level',
            sortable: true,
            render: (val) => (
                <span className="text-gray-500 font-medium">{val || '-'}</span>
            ),
        },
        {
            key: 'basic_pay',
            title: 'Basic Pay (Monthly)',
            width: '260px',
            render: (_val, des) => (
                <div className="flex items-center gap-2 max-w-[220px]">
                    <span className="text-gray-400 font-bold">₹</span>
                    <input
                        type="number"
                        className="form-input font-bold text-primary dark:bg-[#1b2e4b] border-[#e0e6ed] dark:border-[#253b5c] h-9 text-sm"
                        value={salaries[des.id]?.basic_pay || '0.00'}
                        onChange={(e) => handlePayChange(des.id, e.target.value)}
                        placeholder="0.00"
                    />
                </div>
            ),
        },
        {
            key: 'action',
            title: 'Action',
            align: 'center',
            width: '140px',
            render: (_val, des) => (
                <button
                    type="button"
                    className={`btn btn-primary btn-sm gap-2 min-w-[100px] shadow-sm hover:shadow-md transition-all ${
                        saving === des.id ? 'opacity-70 pointer-events-none' : ''
                    }`}
                    onClick={() => saveSalary(des.id)}
                    disabled={saving === des.id}
                >
                    {saving === des.id ? (
                        <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-4 h-4"></span>
                    ) : (
                        <>
                            <IconSave className="w-4 h-4" />
                            Save
                        </>
                    )}
                </button>
            ),
        },
    ];

    return (
        <div>
            {/* Header Banner */}
            <PageHeader
                icon={<IconCashBanknotes />}
                title="Designation Salary Configuration"
                subtitle="Manage and set basic pay standards for designations across different departments."
                variant="amber"
            />

            {/* Reusable Data Table */}
            <DataTable
                columns={columns}
                data={designations}
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
                onRefresh={selectedDepartment ? fetchData : undefined}
                searchPlaceholder="Search designations..."
                filters={
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department:</label>
                        <select
                            className="form-select h-10 py-1.5 px-3 text-sm rounded-xl font-medium min-w-[220px]"
                            value={selectedDepartment}
                            onChange={(e) => {
                                setSelectedDepartment(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">Choose a department...</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.department_name}
                                </option>
                            ))}
                        </select>
                    </div>
                }
                emptyMessage={selectedDepartment ? 'No designations found for this department.' : 'Please select a department above'}
                emptySubtitle={selectedDepartment ? undefined : 'Choose a department from the filter dropdown to view and edit basic pay.'}
            />
        </div>
    );
};

export default DesignationSalary;
