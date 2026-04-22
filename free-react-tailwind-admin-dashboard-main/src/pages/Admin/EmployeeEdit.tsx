import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMP_API_URL = `${API_BASE_URL}/app/employee/`;
const DEPT_URL = `${API_BASE_URL}/app/departments/?page_size=1000`;
const DESIG_URL = `${API_BASE_URL}/app/designations/?page_size=1000`;
const LEVEL_URL = `${API_BASE_URL}/app/levels/?page_size=1000`;

type Option = { id: number; label: string };

type EmployeeDetails = {
    id: number;
    employee_id?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    gender?: string | null;
    email?: string | null;
    mobile?: string | null;
    date_of_birth?: string | null;
    temporary_address?: string | null;
    permanent_address?: string | null;
    department?: number | null;
    designation?: number | null;
    level?: number | null;
    date_of_joining?: string | null;
    aadhar_no?: string | null;
    pan_no?: string | null;
};

const AdminEmployeeEdit = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const employeeId = Number(id);

    const [loading, setLoading] = useState(false);
    const [employee, setEmployee] = useState<EmployeeDetails | null>(null);

    const [departments, setDepartments] = useState<Option[]>([]);
    const [designations, setDesignations] = useState<Option[]>([]);
    const [levels, setLevels] = useState<Option[]>([]);

    const [form, setForm] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: '',
        email: '',
        mobile: '',
        date_of_birth: '',
        temporary_address: '',
        permanent_address: '',
        department: '',
        designation: '',
        level: '',
        date_of_joining: '',
        aadhar_no: '',
        pan_no: '',
    });

    const [files, setFiles] = useState<{
        photo?: File | null;
        aadhar_card?: File | null;
        pan_card?: File | null;
    }>({});

    useEffect(() => {
        dispatch(setPageTitle('Edit Employee'));
    }, [dispatch]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const fetchOptions = async () => {
        try {
            const [depRes, desRes, lvlRes] = await Promise.all([
                fetch(DEPT_URL, { headers: { ...getAuthHeaders() } }),
                fetch(DESIG_URL, { headers: { ...getAuthHeaders() } }),
                fetch(LEVEL_URL, { headers: { ...getAuthHeaders() } }),
            ]);

            if (depRes.ok) {
                const d = await depRes.json();
                const arr = d.results || d;
                setDepartments((arr || []).map((x: any) => ({ id: x.id, label: x.department_name })));
            }
            if (desRes.ok) {
                const d = await desRes.json();
                const arr = d.results || d;
                setDesignations((arr || []).map((x: any) => ({ id: x.id, label: x.designation_name })));
            }
            if (lvlRes.ok) {
                const d = await lvlRes.json();
                const arr = d.results || d;
                setLevels((arr || []).map((x: any) => ({ id: x.id, label: x.level_name })));
            }
        } catch (e) {
            console.error('Error fetching options', e);
        }
    };

    const fetchEmployee = async () => {
        if (!employeeId) return;
        setLoading(true);
        try {
            const res = await fetch(`${EMP_API_URL}${employeeId}/`, { headers: { ...getAuthHeaders() } });
            if (res.ok) {
                const data = await res.json();
                setEmployee(data);
                setForm({
                    first_name: data.first_name || '',
                    middle_name: data.middle_name || '',
                    last_name: data.last_name || '',
                    gender: data.gender || '',
                    email: data.email || '',
                    mobile: data.mobile || '',
                    date_of_birth: data.date_of_birth || '',
                    temporary_address: data.temporary_address || '',
                    permanent_address: data.permanent_address || '',
                    department: data.department ? String(data.department) : '',
                    designation: data.designation ? String(data.designation) : '',
                    level: data.level ? String(data.level) : '',
                    date_of_joining: data.date_of_joining || '',
                    aadhar_no: data.aadhar_no || '',
                    pan_no: data.pan_no || '',
                });
            }
        } catch (e) {
            console.error('Error fetching employee', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchEmployee();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId]);

    const title = useMemo(() => {
        if (!employee) return 'Edit Employee';
        const name = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ');
        return `${name || employee.employee_id || 'Employee'}`;
    }, [employee]);

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!employeeId) return;

        const fd = new FormData();
        const appendIf = (key: string, value: string) => {
            if (value !== undefined && value !== null && String(value).trim() !== '') fd.append(key, value);
        };

        appendIf('first_name', form.first_name);
        appendIf('middle_name', form.middle_name);
        appendIf('last_name', form.last_name);
        appendIf('gender', form.gender);
        appendIf('email', form.email);
        appendIf('mobile', form.mobile);
        appendIf('date_of_birth', form.date_of_birth);
        appendIf('temporary_address', form.temporary_address);
        appendIf('permanent_address', form.permanent_address);
        appendIf('department', form.department);
        appendIf('designation', form.designation);
        appendIf('level', form.level);
        appendIf('date_of_joining', form.date_of_joining);
        appendIf('aadhar_no', form.aadhar_no);
        appendIf('pan_no', form.pan_no);

        if (files.photo) fd.append('photo', files.photo);
        if (files.aadhar_card) fd.append('aadhar_card', files.aadhar_card);
        if (files.pan_card) fd.append('pan_card', files.pan_card);

        try {
            const res = await fetch(`${EMP_API_URL}${employeeId}/`, {
                method: 'PATCH',
                headers: { ...getAuthHeaders() },
                body: fd,
            });
            if (res.ok) {
                Swal.fire({ title: 'Updated!', text: 'Employee updated successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                navigate(`/admin/employee-register/${employeeId}`);
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to update employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (e) {
            Swal.fire({ title: 'Error!', text: 'Failed to update employee.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    return (
        <div>
            <div className="panel mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-2xl font-extrabold">Edit Employee</div>
                        <div className="text-sm text-gray-500">{title}</div>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" className="btn btn-outline-primary" onClick={() => navigate(-1)}>
                            Back
                        </button>
                        {employeeId && (
                            <button type="button" className="btn btn-outline-info" onClick={() => navigate(`/admin/employee-register/${employeeId}`)}>
                                View Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="panel">
                {loading ? (
                    <div className="py-10 text-center text-gray-400">Loading...</div>
                ) : (
                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="font-semibold mb-1 block">First Name</label>
                                <input className="form-input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">Middle Name</label>
                                <input className="form-input" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">Last Name</label>
                                <input className="form-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="font-semibold mb-1 block">Gender</label>
                                <select className="form-select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                                    <option value="">Select</option>
                                    <option value="male">male</option>
                                    <option value="female">female</option>
                                    <option value="other">other</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">DOB</label>
                                <input className="form-input" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">Email</label>
                                <input className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">Mobile</label>
                                <input className="form-input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="font-semibold mb-1 block">Department</label>
                                <select className="form-select" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                                    <option value="">Select</option>
                                    {departments.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">Designation</label>
                                <select className="form-select" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}>
                                    <option value="">Select</option>
                                    {designations.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">Level</label>
                                <select className="form-select" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                                    <option value="">Select</option>
                                    {levels.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-semibold mb-1 block">Temporary Address</label>
                                <input className="form-input" value={form.temporary_address} onChange={(e) => setForm({ ...form, temporary_address: e.target.value })} />
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">Permanent Address</label>
                                <input className="form-input" value={form.permanent_address} onChange={(e) => setForm({ ...form, permanent_address: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="font-semibold mb-1 block">Joining Date</label>
                                <input className="form-input" type="date" value={form.date_of_joining} onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })} />
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">Aadhar No</label>
                                <input className="form-input" value={form.aadhar_no} onChange={(e) => setForm({ ...form, aadhar_no: e.target.value })} />
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">PAN No</label>
                                <input className="form-input" value={form.pan_no} onChange={(e) => setForm({ ...form, pan_no: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="font-semibold mb-1 block">Profile Photo</label>
                                <input className="form-input" type="file" accept="image/*" onChange={(e) => setFiles({ ...files, photo: e.target.files?.[0] || null })} />
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">Aadhar Card (file)</label>
                                <input className="form-input" type="file" onChange={(e) => setFiles({ ...files, aadhar_card: e.target.files?.[0] || null })} />
                            </div>
                            <div>
                                <label className="font-semibold mb-1 block">PAN Card (file)</label>
                                <input className="form-input" type="file" onChange={(e) => setFiles({ ...files, pan_card: e.target.files?.[0] || null })} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" className="btn btn-outline-danger" onClick={() => navigate(-1)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AdminEmployeeEdit;

