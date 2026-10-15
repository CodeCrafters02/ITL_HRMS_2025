import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';
import { EmployeeReferenceItem, ReferenceStatus, buildResumeUrl, createReference, fetchMyReferences } from './api';

import Button from '../../../components/Common/Button';
import PageHeader from '../../../components/Common/PageHeader';
import DataTable, { Column } from '../../../components/Common/DataTable';
import StatCard, { StatGrid } from '../../../components/Common/StatCard';
import Modal from '../../../components/Common/Modal';
import IconUsersGroup from '../../../components/Icon/IconUsersGroup';
import IconClock from '../../../components/Icon/IconClock';
import IconChecks from '../../../components/Icon/IconChecks';
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


    const columns: Column<EmployeeReferenceItem>[] = [
        { key: 'index', title: '#', width: '56px', render: (_v, _r, i) => i + 1 },
        { key: 'name', title: 'Name', render: (v) => <span className="font-semibold">{v}</span> },
        { key: 'designation', title: 'Designation', hideBelow: 'md' },
        { key: 'email', title: 'Email', hideBelow: 'lg' },
        { key: 'contact_number', title: 'Contact', hideBelow: 'lg' },
        {
            key: 'resume', title: 'Resume', hideBelow: 'md',
            render: (_v, row) =>
                buildResumeUrl(row.resume) ? (
                    <a className="text-primary hover:underline" href={buildResumeUrl(row.resume) || '#'} target="_blank" rel="noreferrer">View Resume</a>
                ) : (
                    <span className="text-white-dark">-</span>
                ),
        },
        { key: 'status', title: 'Status', render: (v) => <span className={`badge ${statusBadgeClass(v)}`}>{v}</span> },
        { key: 'admin_comment', title: 'Comment', hideBelow: 'xl', render: (v) => <span className="block max-w-[260px] truncate" title={v || ''}>{v || '-'}</span> },
        { key: 'submitted_at', title: 'Submitted', render: (v) => formatDate(v) },
    ];

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <PageHeader
                title="References"
                subtitle="Add candidate referrals and track review status from HR/Admin."
                actions={
                    <Button onClick={() => setIsModalOpen(true)}>Add Reference</Button>
                }
            />

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <StatGrid cols={3} className="!mb-0">
                <StatCard label="Total References" value={totalCount} loading={loading} tone="primary" icon={<IconUsersGroup />} />
                <StatCard label="Pending (this page)" value={pendingCount} loading={loading} tone="warning" icon={<IconClock />} />
                <StatCard label="Approved (this page)" value={approvedCount} loading={loading} tone="success" icon={<IconChecks />} />
            </StatGrid>

            <DataTable
                columns={columns}
                data={rows}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                onRefresh={loadReferences}
                searchPlaceholder="Search by name, designation, email or contact..."
                emptyMessage="No references found"
                filters={
                    <select className="form-select h-10 w-44 rounded-xl" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}>
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                }
            />

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Employee Reference" size="2xl">
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
        <Button className="w-full" type="submit"  disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Reference'}
        </Button>
        </form>
            </Modal>
        </div>
    );
};

export default References;
