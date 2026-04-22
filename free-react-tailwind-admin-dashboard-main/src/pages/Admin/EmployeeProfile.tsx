import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/employee/`;

type EmployeeDetails = {
    id: number;
    employee_id?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    gender?: string | null;
    email?: string | null;
    mobile?: string | null;
    date_of_birth?: string | null;
    temporary_address?: string | null;
    permanent_address?: string | null;

    photo?: string | null;
    aadhar_no?: string | null;
    aadhar_card?: string | null;
    pan_no?: string | null;
    pan_card?: string | null;

    guardian_name?: string | null;
    guardian_mobile?: string | null;
    category?: string | null;

    department_name?: string | null;
    designation_name?: string | null;
    company_name?: string | null;
    level?: number | null;
    reporting_level_name?: string | null;
    reporting_manager_name?: string | null;

    payment_method?: string | null;
    account_no?: string | null;
    ifsc_code?: string | null;
    bank_name?: string | null;

    date_of_joining?: string | null;
    previous_employer?: string | null;
    previous_designation_name?: string | null;
    previous_salary?: string | number | null;
    ctc?: string | number | null;
    gross_salary?: string | number | null;

    epf_status?: string | null;
    uan?: string | null;
    esic_status?: string | null;
    esic_no?: string | null;

    source_of_employment?: string | null;
    who_referred?: string | null;
    is_active?: boolean;
};

function joinName(e: EmployeeDetails) {
    const fallback = [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(' ').trim();
    return e.full_name || fallback || e.employee_id || 'Employee';
}

function isAbsoluteUrl(url: string) {
    return /^https?:\/\//i.test(url);
}

function fileUrl(pathOrUrl?: string | null) {
    if (!pathOrUrl) return null;
    return isAbsoluteUrl(pathOrUrl) ? pathOrUrl : `${API_BASE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

const AdminEmployeeProfile = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const employeeId = Number(id);

    const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Employee Profile'));
    }, [dispatch]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const fetchEmployee = async () => {
        if (!employeeId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}${employeeId}/`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setEmployee(data);
            }
        } catch (e) {
            console.error('Error fetching employee profile', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployee();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId]);

    const sections = useMemo(() => {
        if (!employee) return [];
        const items = (pairs: Array<[string, any]>) =>
            pairs
                .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
                .map(([k, v]) => ({ k, v: String(v) }));

        return [
            {
                title: 'Basic',
                items: items([
                    ['Employee ID', employee.employee_id],
                    ['Name', joinName(employee)],
                    ['Gender', employee.gender],
                    ['DOB', employee.date_of_birth],
                    ['Email', employee.email],
                    ['Mobile', employee.mobile],
                    ['Status', employee.is_active ? 'Active' : 'Inactive'],
                ]),
            },
            {
                title: 'Organization',
                items: items([
                    ['Company', employee.company_name],
                    ['Department', employee.department_name],
                    ['Designation', employee.designation_name],
                    ['Reporting Level', employee.reporting_level_name],
                    ['Reporting Manager', employee.reporting_manager_name],
                ]),
            },
            {
                title: 'Addresses',
                items: items([
                    ['Temporary Address', employee.temporary_address],
                    ['Permanent Address', employee.permanent_address],
                ]),
            },
            {
                title: 'Documents',
                items: items([
                    ['Aadhar No', employee.aadhar_no],
                    ['PAN No', employee.pan_no],
                ]),
            },
            {
                title: 'Bank & Payment',
                items: items([
                    ['Payment Method', employee.payment_method],
                    ['Account No', employee.account_no],
                    ['IFSC', employee.ifsc_code],
                    ['Bank Name', employee.bank_name],
                ]),
            },
            {
                title: 'Employment',
                items: items([
                    ['Joining Date', employee.date_of_joining],
                    ['Previous Employer', employee.previous_employer],
                    ['Previous Designation', employee.previous_designation_name],
                    ['Previous Salary', employee.previous_salary],
                    ['CTC', employee.ctc],
                    ['Gross Salary', employee.gross_salary],
                    ['EPF Status', employee.epf_status],
                    ['UAN', employee.uan],
                    ['ESIC Status', employee.esic_status],
                    ['ESIC No', employee.esic_no],
                    ['Source', employee.source_of_employment],
                    ['Referred By', employee.who_referred],
                ]),
            },
        ];
    }, [employee]);

    const photoSrc = employee ? fileUrl(employee.photo) : null;
    const aadharLink = employee ? fileUrl(employee.aadhar_card) : null;
    const panLink = employee ? fileUrl(employee.pan_card) : null;

    return (
        <div>
            <div className="panel mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#191e3a] overflow-hidden flex items-center justify-center">
                            {photoSrc ? (
                                <img src={photoSrc} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-400 font-bold">N/A</span>
                            )}
                        </div>
                        <div>
                            <div className="text-xl font-extrabold">{employee ? joinName(employee) : 'Employee Profile'}</div>
                            <div className="text-sm text-gray-500">{employee?.employee_id || ''}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-outline-primary" onClick={() => navigate(-1)}>
                            Back
                        </button>
                        {employee && (
                            <button type="button" className="btn btn-primary" onClick={() => navigate(`/admin/employee-register/${employee.id}/edit`)}>
                                Edit
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="panel mb-6">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Aadhar Card</div>
                        {aadharLink ? (
                            <a className="text-primary underline" href={aadharLink} target="_blank" rel="noreferrer">
                                View / Download
                            </a>
                        ) : (
                            <div className="text-gray-400">Not uploaded</div>
                        )}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">PAN Card</div>
                        {panLink ? (
                            <a className="text-primary underline" href={panLink} target="_blank" rel="noreferrer">
                                View / Download
                            </a>
                        ) : (
                            <div className="text-gray-400">Not uploaded</div>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="panel py-10 text-center text-gray-400">Loading profile...</div>
            ) : employee ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sections.map((s) => (
                        <div key={s.title} className="panel">
                            <div className="text-lg font-bold mb-4">{s.title}</div>
                            {s.items.length === 0 ? (
                                <div className="text-gray-400">No data</div>
                            ) : (
                                <div className="space-y-2">
                                    {s.items.map((it) => (
                                        <div key={it.k} className="flex items-start justify-between gap-6">
                                            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">{it.k}</div>
                                            <div className="text-sm text-gray-800 dark:text-gray-200 text-right break-words max-w-[60%]">{it.v}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="panel py-10 text-center text-gray-400">Employee not found.</div>
            )}
        </div>
    );
};

export default AdminEmployeeProfile;

