import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconPlus from '../../../components/Icon/IconPlus';
import DataTable, { Column } from '../../../components/Common/DataTable';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconX from '../../../components/Icon/IconX';
import IconOpenBook from '../../../components/Icon/IconOpenBook';
import PageHeader from '../../../components/Common/PageHeader';
import SearchableSelect from '../../Elements/SearchableSelect';

import Modal from '../../../components/Common/Modal';
import Button, { IconButton } from '../../../components/Common/Button';
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

    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

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
        fetchEmployees();
        fetchCourses();
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchCertificates();
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [search, filterSource, page, limit]);

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
            const url = new URL(CERTIFICATES_API);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('limit', limit.toString());
            if (search) url.searchParams.append('search', search);
            if (filterSource !== 'all') url.searchParams.append('source', filterSource);

            const response = await authFetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setCertificates(data.results);
                    setTotalCount(data.count);
                    setTotalPages(data.total_pages || Math.ceil(data.count / limit));
                } else if (Array.isArray(data)) {
                    setCertificates(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                } else {
                    setCertificates([]);
                    setTotalCount(0);
                    setTotalPages(1);
                }
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

    const columns: Column<CertificateType>[] = [
        {
            key: 'employee_name', title: 'Employee',
            render: (_v, c) => (
                <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">{c.employee_name}</div>
                    <span className="text-xs text-gray-400 block truncate max-w-[150px]">{c.employee_email}</span>
                </div>
            ),
        },
        {
            key: 'certificate_name', title: 'Certificate Name',
            render: (_v, c) => (
                <div>
                    <div className="font-extrabold text-primary">{c.certificate_name}</div>
                    {c.course_title && <span className="text-[10px] text-gray-400 block mt-0.5">Course: {c.course_title}</span>}
                </div>
            ),
        },
        { key: 'issuing_authority', title: 'Issuing Authority', hideBelow: 'lg', className: 'font-semibold text-xs' },
        { key: 'certificate_number', title: 'Credential No.', hideBelow: 'lg', className: 'font-mono text-xs' },
        {
            key: 'issue_date', title: 'Issue / Expiry Date', hideBelow: 'md',
            render: (_v, c) => (
                <div className="text-xs font-semibold">
                    {c.issue_date}
                    {c.expiry_date ? <span className="text-danger block text-[10px]">Exp: {c.expiry_date}</span> : <span className="text-emerald-500 block text-[10px]">Lifetime Validity</span>}
                </div>
            ),
        },
        { key: 'source', title: 'Source', hideBelow: 'xl', render: (v) => <span className="capitalize text-xs font-semibold">{v}</span> },
        { key: 'status', title: 'Status', render: (v) => <span className={`badge text-[10px] font-bold px-2 py-0.5 rounded-full ${v === 'valid' ? 'bg-success text-white' : 'bg-danger text-white'}`}>{v}</span> },
        {
            key: 'certificate_file_url', title: 'File Attachment', hideBelow: 'md',
            render: (v) => (v ? <a href={v} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs">Download Certificate</a> : <span className="text-gray-400 text-xs italic">No document</span>),
        },
        {
            key: 'actions', title: 'Action', align: 'center', width: '90px',
            render: (_v, c) => (
                <IconButton tone="danger" type="button"  title="Delete" onClick={() => handleDelete(c)}><IconTrashLines className="w-4 h-4" /></IconButton>
            ),
        },
    ];

    return (
        <div>
            {/* Header Banner */}
            <PageHeader
                title="Employee Certifications"
                subtitle="Log, authenticate, and audit accredited certifications, compliance licenses, and specialized skills achieved by staff."
                icon={<IconOpenBook />}
                badge="Credentials & Certifications"
                variant="purple"
            />

            <DataTable
                columns={columns}
                data={certificates}
                loading={loading}
                page={page}
                pageSize={limit}
                pageSizeOptions={[5, 10, 20, 50]}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(sz) => { setLimit(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                onRefresh={fetchCertificates}
                searchPlaceholder="Search employee, cert or ID..."
                emptyMessage="No certifications registered"
                actionButton={
                    <Button type="button"  onClick={openUploadModal}>
                        <IconPlus className="w-4 h-4" /> Add Certificate
                    </Button>
                }
                filters={
                    <SearchableSelect
                        className="w-44"
                        options={[
                            { value: 'all', label: 'All Sources' },
                            { value: 'internal', label: 'Internal Course' },
                            { value: 'external', label: 'External Upload' },
                        ]}
                        value={filterSource}
                        onChange={(val) => { setFilterSource(String(val)); setPage(1); }}
                        placeholder="Filter by Source"
                    />
                }
            />

            {/* Upload Certificate Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload External Certificate" size="2xl">
                <form onSubmit={handleUploadCertificate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-semibold mb-1 block">Employee <span className="text-danger">*</span></label>
                            <SearchableSelect
                                options={employees.map(emp => ({
                                    value: String(emp.id),
                                    label: `${emp.full_name} (${emp.designation_name || 'No Dept'})`,
                                }))}
                                value={certForm.employee}
                                onChange={(val) => setCertForm({ ...certForm, employee: String(val) })}
                                placeholder="Search & select employee..."
                                required
                            />
                        </div>
                        <div>
                            <label className="font-semibold mb-1 block">Related Course (Optional)</label>
                            <SearchableSelect
                                options={[
                                    { value: '', label: '-- No Course --' },
                                    ...courses.map(course => ({
                                        value: String(course.id),
                                        label: course.title,
                                    }))
                                ]}
                                value={certForm.course}
                                onChange={(val) => setCertForm({ ...certForm, course: String(val) })}
                                placeholder="Search & select course..."
                            />
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
                            <SearchableSelect
                                options={[
                                    { value: 'valid', label: 'Valid' },
                                    { value: 'expired', label: 'Expired' },
                                    { value: 'revoked', label: 'Revoked' },
                                ]}
                                value={certForm.status}
                                onChange={(val) => setCertForm({ ...certForm, status: val as any })}
                                placeholder="Select status"
                            />
                        </div>
                        <div>
                            <label className="font-semibold mb-1 block">Certificate File Document <span className="text-danger">*</span></label>
                            <input type="file" className="form-input text-xs rounded-lg" required onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                        <Button variant="outline-danger" type="button"  onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button className="!px-5" type="submit"  disabled={saving}>
                            {saving ? 'Uploading...' : 'Upload Credentials'}
                        </Button>
                    </div>
                </form>

            </Modal>
        </div>
    );
};

export default Certifications;
