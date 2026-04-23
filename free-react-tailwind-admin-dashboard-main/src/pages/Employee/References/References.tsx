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
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [name, setName] = useState('');
    const [designation, setDesignation] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [email, setEmail] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);

    const loadReferences = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMyReferences({
                page,
                page_size: pageSize,
                search: search.trim(),
                status: statusFilter,
            });
            setRows(data.results);
            setTotalCount(data.count);
            setTotalPages(data.total_pages);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load references';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, statusFilter]);

    useEffect(() => {
        dispatch(setPageTitle('References'));
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadReferences();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadReferences]);

    const approvedCount = useMemo(() => rows.filter((ref) => ref.status === 'Approved').length, [rows]);
    const pendingCount = useMemo(() => rows.filter((ref) => ref.status === 'Pending').length, [rows]);

    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

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
            setPage(1);
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
            <div className="panel bg-gradient-to-r from-[#220fb6] via-[#4f6be5] to-[#0f52af] text-white border-0">
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
                    <p className="text-2xl font-bold mt-2">{totalCount}</p>
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
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search by name, designation, email or contact..."
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value as StatusFilter);
                            setPage(1);
                        }}
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {totalCount > 0 && (
                <div className="panel">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-xs text-white-dark">
                            Showing <span className="text-primary font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
                            <span className="text-primary font-semibold">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                            <span className="text-primary font-semibold">{totalCount}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-white-dark">Per page</label>
                            <select
                                className="form-select w-20 text-xs"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        <ul className="inline-flex items-center gap-1">
                            <li>
                                <button type="button" className="btn btn-sm btn-outline-primary px-2.5" onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page === 1}>
                                    Prev
                                </button>
                            </li>
                            {getPageNumbers().map((p, idx) =>
                                p === '...' ? <li key={`dots-${idx}`} className="px-2 text-white-dark">...</li> : (
                                    <li key={p}>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-outline-primary'} min-w-[34px]`}
                                            onClick={() => setPage(p as number)}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                ),
                            )}
                            <li>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary px-2.5"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

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
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-8 text-white-dark">
                                        No references found.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, index) => (
                                    <tr key={row.id}>
                                        <td>{(page - 1) * pageSize + index + 1}</td>
                                        <td className="font-semibold">{row.name}</td>
                                        <td>{row.designation}</td>
                                        <td>{row.email}</td>
                                        <td>{row.contact_number}</td>
                                        <td>
                                            {buildResumeUrl(row.resume) ? (
                                                <a className="text-primary hover:underline" href={buildResumeUrl(row.resume) || '#'} target="_blank" rel="noreferrer">
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
