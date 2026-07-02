import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconX from '../../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const CERTIFICATES_API = `${API_BASE_URL}/employee/certificates/`;
const EMPLOYEES_API = `${API_BASE_URL}/employee/employee-options/`;
const COURSES_API = `${API_BASE_URL}/employee/courses/`;

type CertificateType = {
    id: number;
    employee: number;
    employee_name: string;
    employee_id: string;
    employee_email: string;
    course?: number | null;
    course_title?: string | null;
    certificate_name: string;
    issuing_authority: string;
    source: 'internal' | 'external';
    certificate_number: string;
    certificate_file?: string | null;
    certificate_file_url?: string | null;
    issue_date: string;
    expiry_date?: string | null;
    status: 'valid' | 'expired' | 'revoked';
    created_at: string;
};

type EmployeeOption = {
    id: number;
    full_name: string;
    designation_name?: string;
    department_name?: string;
};

type CourseOption = {
    id: number;
    title: string;
};

const Certifications = () => {
    const dispatch = useDispatch();
    const [certificates, setCertificates] = useState<CertificateType[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [courses, setCourses] = useState<CourseOption[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState('all');

    // Upload modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [certForm, setCertForm] = useState({
        employee: '',
        course: '',
        certificate_name: '',
        issuing_authority: 'Internal Training Hub',
        source: 'external' as 'internal' | 'external',
        certificate_number: '',
        issue_date: '',
        expiry_date: '',
        status: 'valid' as 'valid' | 'expired' | 'revoked',
    });
    const [certFile, setCertFile] = useState<File | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Employee Certifications'));
        fetchCertificates();
        fetchEmployees();
        fetchCourses();
    }, [dispatch]);

    const getHeaders = (multipart = false) => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (!multipart) {
            headers['Content-Type'] = 'application/json';
        }
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const response = await authFetch(CERTIFICATES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCertificates(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching certificates:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await authFetch(EMPLOYEES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data || []);
            }
        } catch (error) {
            console.error('Error fetching employee options:', error);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await authFetch(COURSES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCourses(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching course options:', error);
        }
    };

    const filteredCertificates = useMemo(() => {
        return certificates.filter((c) => {
            const matchesSearch =
                c.employee_name.toLowerCase().includes(search.toLowerCase()) ||
                c.certificate_name.toLowerCase().includes(search.toLowerCase()) ||
                c.certificate_number.toLowerCase().includes(search.toLowerCase());

            const matchesSource = filterSource === 'all' || c.source === filterSource;

            return matchesSearch && matchesSource;
        });
    }, [certificates, search, filterSource]);

    const openUploadModal = () => {
        setCertForm({
            employee: '',
            course: '',
            certificate_name: '',
            issuing_authority: 'External Body',
            source: 'external',
            certificate_number: `CERT-${Date.now().toString().slice(-6)}`,
            issue_date: new Date().toISOString().split('T')[0],
            expiry_date: '',
            status: 'valid',
        });
        setCertFile(null);
        setModalOpen(true);
    };

    const handleUploadCertificate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();
        formData.append('employee', certForm.employee);
        formData.append('certificate_name', certForm.certificate_name);
        formData.append('issuing_authority', certForm.issuing_authority);
        formData.append('source', certForm.source);
        formData.append('certificate_number', certForm.certificate_number);
        formData.append('issue_date', certForm.issue_date);
        formData.append('status', certForm.status);

        if (certForm.course) formData.append('course', certForm.course);
        if (certForm.expiry_date) formData.append('expiry_date', certForm.expiry_date);
        if (certFile) formData.append('certificate_file', certFile);

        try {
            const response = await authFetch(CERTIFICATES_API, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Uploaded!',
                    text: 'Certificate registered successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                setModalOpen(false);
                fetchCertificates();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire('Error!', err ? Object.values(err).flat().join(' ') : 'Failed to register certificate.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection error.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (cert: CertificateType) => {
        const result = await Swal.fire({
            title: 'Delete Certificate?',
            text: `Remove certificate "${cert.certificate_name}" for ${cert.employee_name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${CERTIFICATES_API}${cert.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire('Deleted!', 'Certificate deleted.', 'success');
                fetchCertificates();
            } else {
                Swal.fire('Error!', 'Could not delete certificate.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server issue.', 'error');
        }
    };

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Employee Certifications</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        Log and verify academic, compliance, and custom certifications achieved by team members.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-72"
                            placeholder="Search employee, cert or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <select
                        className="form-select w-44"
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value)}
                    >
                        <option value="all">All Sources</option>
                        <option value="internal">Internal Course</option>
                        <option value="external">External Upload</option>
                    </select>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openUploadModal}>
                    <IconPlus /> Upload Certificate
                </button>
            </div>

            {/* List Table */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading certifications...</span>
                </div>
            ) : filteredCertificates.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">No certifications registered.</div>
            ) : (
                <div className="panel p-0 border-0 overflow-hidden shadow-md">
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Certificate Name</th>
                                    <th>Issuing Authority</th>
                                    <th>Credential No.</th>
                                    <th>Issue / Expiry Date</th>
                                    <th>Source</th>
                                    <th>Status</th>
                                    <th>File Attachment</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCertificates.map((c) => (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="font-semibold text-gray-800 dark:text-gray-200">{c.employee_name}</div>
                                            <span className="text-xs text-gray-450 block truncate max-w-[150px]">{c.employee_email}</span>
                                        </td>
                                        <td>
                                            <div className="font-extrabold text-primary">{c.certificate_name}</div>
                                            {c.course_title && (
                                                <span className="text-[10px] text-gray-400 block mt-0.5">Course: {c.course_title}</span>
                                            )}
                                        </td>
                                        <td className="font-semibold text-xs text-gray-650">{c.issuing_authority}</td>
                                        <td className="font-mono text-xs">{c.certificate_number}</td>
                                        <td className="text-xs font-semibold">
                                            {c.issue_date}
                                            {c.expiry_date ? (
                                                <span className="text-danger block text-[10px]">Exp: {c.expiry_date}</span>
                                            ) : (
                                                <span className="text-emerald-500 block text-[10px]">Lifetime Validity</span>
                                            )}
                                        </td>
                                        <td className="capitalize text-xs font-semibold">{c.source}</td>
                                        <td>
                                            <span className={`badge text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                c.status === 'valid' ? 'bg-success text-white' : 'bg-danger text-white'
                                            }`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td>
                                            {c.certificate_file_url ? (
                                                <a href={c.certificate_file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs">
                                                    Download Certificate
                                                </a>
                                            ) : (
                                                <span className="text-gray-450 text-xs italic">No document</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <button type="button" className="text-danger hover:text-danger-dark p-2" onClick={() => handleDelete(c)}>
                                                <IconTrashLines className="w-4.5 h-4.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Upload Certificate Modal */}
            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-2xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Upload External Certificate
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleUploadCertificate} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Employee <span className="text-danger">*</span></label>
                                                    <select className="form-select rounded-lg" required value={certForm.employee} onChange={(e) => setCertForm({ ...certForm, employee: e.target.value })}>
                                                        <option value="">-- Choose Employee --</option>
                                                        {employees.map(emp => (
                                                            <option key={emp.id} value={emp.id}>
                                                                {emp.full_name} ({emp.designation_name || 'No Dept'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Related Course (Optional)</label>
                                                    <select className="form-select rounded-lg" value={certForm.course} onChange={(e) => setCertForm({ ...certForm, course: e.target.value })}>
                                                        <option value="">-- Choose Course --</option>
                                                        {courses.map(course => (
                                                            <option key={course.id} value={course.id}>{course.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Certificate Name <span className="text-danger">*</span></label>
                                                    <input className="form-input rounded-lg" required placeholder="e.g. AWS Solutions Architect" value={certForm.certificate_name} onChange={(e) => setCertForm({ ...certForm, certificate_name: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Issuing Authority <span className="text-danger">*</span></label>
                                                    <input className="form-input rounded-lg" required value={certForm.issuing_authority} onChange={(e) => setCertForm({ ...certForm, issuing_authority: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Credential Number <span className="text-danger">*</span></label>
                                                    <input className="form-input rounded-lg" required value={certForm.certificate_number} onChange={(e) => setCertForm({ ...certForm, certificate_number: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Issue Date <span className="text-danger">*</span></label>
                                                    <input type="date" className="form-input rounded-lg" required value={certForm.issue_date} onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Expiry Date</label>
                                                    <input type="date" className="form-input rounded-lg" value={certForm.expiry_date} onChange={(e) => setCertForm({ ...certForm, expiry_date: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Status</label>
                                                    <select className="form-select rounded-lg" value={certForm.status} onChange={(e) => setCertForm({ ...certForm, status: e.target.value as any })}>
                                                        <option value="valid">Valid</option>
                                                        <option value="expired">Expired</option>
                                                        <option value="revoked">Revoked</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Certificate File Document <span className="text-danger">*</span></label>
                                                    <input type="file" className="form-input text-xs rounded-lg" required onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)} />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5 shadow-md" disabled={saving}>
                                                    {saving ? 'Uploading...' : 'Upload Credentials'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default Certifications;
