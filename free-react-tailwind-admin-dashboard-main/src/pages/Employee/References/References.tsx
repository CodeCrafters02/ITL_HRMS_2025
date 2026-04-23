import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';
import { EmployeeReferenceItem, ReferenceStatus, buildResumeUrl, createReference, fetchMyReferences } from './api';

type StatusFilter = 'All' | ReferenceStatus;

const statusBadgeClass = (status: ReferenceStatus) => {
    if (status === 'Approved') return 'bg-success-light text-success';
    if (status === 'Rejected') return 'bg-danger-light text-danger';
    return 'bg-warning-light text-warning';
};

const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
};

const References = () => {
    const dispatch = useDispatch();
    const [rows, setRows] = useState<EmployeeReferenceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [name, setName] = useState('');
    const [designation, setDesignation] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [email, setEmail] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);

    const loadReferences = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMyReferences();
            setRows(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load references';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('References'));
    }, [dispatch]);

    useEffect(() => {
        loadReferences();
    }, [loadReferences]);

    const approvedCount = useMemo(() => rows.filter((ref) => ref.status === 'Approved').length, [rows]);
    const pendingCount = useMemo(() => rows.filter((ref) => ref.status === 'Pending').length, [rows]);

    const filteredRows = useMemo(() => {
        const lowered = search.trim().toLowerCase();
        return rows.filter((row) => {
            const statusMatch = statusFilter === 'All' || row.status === statusFilter;
            const searchMatch =
                !lowered ||
                row.name.toLowerCase().includes(lowered) ||
                row.designation.toLowerCase().includes(lowered) ||
                row.email.toLowerCase().includes(lowered) ||
                row.contact_number.toLowerCase().includes(lowered) ||
                (row.admin_comment || '').toLowerCase().includes(lowered);
            return statusMatch && searchMatch;
        });
    }, [rows, search, statusFilter]);

    const resetForm = () => {
        setName('');
        setDesignation('');
        setContactNumber('');
        setEmail('');
        setResumeFile(null);
    };

    const onSubmitReference = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        if (!name || !designation || !contactNumber || !email) {
            setError('Please fill all required fields.');
            return;
        }

        try {
            setSubmitting(true);
            await createReference({
                name,
                designation,
                contact_number: contactNumber,
                email,
                resume: resumeFile,
            });
            resetForm();
            setIsModalOpen(false);
            await loadReferences();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit reference';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#0e1726] to-[#1b2e4b] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold">References</h1>
                        <p className="mt-1 text-white/80">Add candidate referrals and track review status from HR/Admin.</p>
                    </div>
                    <button type="button" className="btn btn-primary w-full md:w-auto" onClick={() => setIsModalOpen(true)}>
                        Add Reference
                    </button>
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Total References</p>
                    <p className="text-2xl font-bold mt-2">{rows.length}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Pending</p>
                    <p className="text-2xl font-bold mt-2 text-warning">{pendingCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Approved</p>
                    <p className="text-2xl font-bold mt-2 text-success">{approvedCount}</p>
                </div>
            </div>

            <div className="panel">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 relative">
                        <input
                            type="text"
                            className="form-input pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, designation, email or contact..."
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
            </div>

            <div className="panel p-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Designation</th>
                                <th>Email</th>
                                <th>Contact</th>
                                <th>Resume</th>
                                <th>Status</th>
                                <th>Comment</th>
                                <th>Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-8 text-white-dark">
                                        Loading references...
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-8 text-white-dark">
                                        No references found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row, index) => (
                                    <tr key={row.id}>
                                        <td>{index + 1}</td>
                                        <td className="font-semibold">{row.name}</td>
                                        <td>{row.designation}</td>
                                        <td>{row.email}</td>
                                        <td>{row.contact_number}</td>
                                        <td>
                                            {buildResumeUrl(row.resume || '') ? (
                                                <a className="text-primary hover:underline" href={buildResumeUrl(row.resume || '') || '#'} target="_blank" rel="noreferrer">
                                                    View Resume
                                                </a>
                                            ) : (
                                                <span className="text-white-dark">-</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${statusBadgeClass(row.status)}`}>{row.status}</span>
                                        </td>
                                        <td className="max-w-[260px] truncate" title={row.admin_comment || ''}>
                                            {row.admin_comment || '-'}
                                        </td>
                                        <td>{formatDate(row.submitted_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[1000] bg-black/60 p-4 flex items-center justify-center" onClick={() => setIsModalOpen(false)}>
                    <div className="panel w-full max-w-2xl max-h-[92vh] overflow-auto dark:bg-[#0e1726]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h3 className="text-lg font-bold">Add Employee Reference</h3>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setIsModalOpen(false)}>
                                Close
                            </button>
                        </div>
                        <form className="space-y-4" onSubmit={onSubmitReference}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">Name</label>
                                    <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="form-label">Designation</label>
                                    <input className="form-input" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">Contact Number</label>
                                    <input className="form-input" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Resume (optional)</label>
                                <input
                                    type="file"
                                    className="form-input"
                                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Reference'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default References;
