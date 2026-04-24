import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconSearch from '../../components/Icon/IconSearch';
import IconSave from '../../components/Icon/IconSave';
import IconLayoutGrid from '../../components/Icon/IconLayoutGrid';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const DESIGNATION_SALARY_API_URL = `${API_BASE_URL}/app/designationsalaries/`; // Fixed naming from DesignationSalaryViewSet router registration? 
// Wait, I registered it as 'designation-salaries' in urls.py
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

    useEffect(() => {
        dispatch(setPageTitle('Designation Salaries'));
        fetchDepartments();
    }, [dispatch]);

    useEffect(() => {
        if (selectedDepartment) {
            fetchData();
        } else {
            setDesignations([]);
            setSalaries({});
        }
    }, [selectedDepartment]);

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
            // Fetch Designations for this department
            const desUrl = `${DESIGNATION_API_URL}?department=${selectedDepartment}&page_size=1000`;
            const salUrl = `${SALARY_API_URL}?department=${selectedDepartment}&page_size=1000`;

            const [desRes, salRes] = await Promise.all([
                fetch(desUrl, { headers: getHeaders() }),
                fetch(salUrl, { headers: getHeaders() })
            ]);

            if (desRes.ok && salRes.ok) {
                const desData = await desRes.json();
                const salData = await salRes.json();

                const desList = desData.results || desData;
                const salList = salData.results || salData;

                setDesignations(desList);
                
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

    return (
        <div>
            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#14b8a6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Designation Salary Configuration</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Manage and set basic pay standards for designations across different departments.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="panel mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 max-w-md">
                        <label className="block text-sm font-semibold mb-2">Select Department</label>
                        <select 
                            className="form-select border-[#e0e6ed] dark:border-[#1b2e4b] dark:bg-[#1b2e4b] text-black dark:text-white-dark font-semibold"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                        >
                            <option value="">Choose a department...</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedDepartment ? (
                <div className="panel p-0 border-0 overflow-hidden shadow-md">
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr className="bg-[#f6f8fa] dark:bg-[#1b2e4b]">
                                    <th className="py-4">Designation</th>
                                    <th className="py-4">Level</th>
                                    <th className="py-4">Basic Pay (Monthly)</th>
                                    <th className="py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-8 h-8"></span>
                                                <span className="text-gray-400 font-medium">Loading designations...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : designations.length > 0 ? (
                                    designations.map((des) => (
                                        <tr key={des.id} className="group hover:bg-[#fbfcfd] dark:hover:bg-[#121c2c]">
                                            <td className="font-bold text-[#1e3a5f] dark:text-white-light">
                                                {des.designation_name}
                                            </td>
                                            <td className="text-gray-500 font-medium">
                                                {des.level_name || '-'}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 max-w-[200px]">
                                                    <span className="text-gray-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        className="form-input font-bold text-primary dark:bg-[#1b2e4b] border-[#e0e6ed] dark:border-[#253b5c]"
                                                        value={salaries[des.id]?.basic_pay || '0.00'}
                                                        onChange={(e) => handlePayChange(des.id, e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className={`btn btn-primary btn-sm gap-2 min-w-[100px] shadow-sm hover:shadow-md transition-all ${saving === des.id ? 'opacity-70 pointer-events-none' : ''}`}
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
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10 text-gray-400 font-medium italic">
                                            No designations found for this department.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="panel flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-[#e0e6ed] dark:border-[#1b2e4b]">
                    <div className="bg-[#f6f8fa] dark:bg-[#1b2e4b] p-4 rounded-full mb-4">
                        <IconLayoutGrid className="w-12 h-12 text-primary opacity-20" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1e3a5f] dark:text-white-light mb-2">No Department Selected</h3>
                    <p className="text-gray-500 max-w-sm">Please select a department from the dropdown above to view and manage designation salaries.</p>
                </div>
            )}
        </div>
    );
};

export default DesignationSalary;
