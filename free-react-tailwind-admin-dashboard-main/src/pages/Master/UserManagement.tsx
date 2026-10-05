import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconUser from '../../components/Icon/IconUser';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconCircleCheck from '../../components/Icon/IconCircleCheck';
import {
    apiRequest,
    Column,
    confirmDanger,
    DataTable,
    FilterSelect,
    FormField,
    FormGrid,
    IconButton,
    Identity,
    MasterModal,
    MasterPage,
    ModalBody,
    ModalFooter,
    notifyError,
    notifySuccess,
    RoleBadge,
    SearchInput,
    SectionCard,
    StatCard,
    StatGrid,
    StatusBadge,
    TableToolbar,
    useServerTable,
} from '../../components/Master';

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    first_name: string;
    last_name: string;
    company: number | null;
    company_name: string | null;
    designation: string | null;
}

interface Summary {
    total: number;
    active: number;
    inactive: number;
    masters: number;
    admins: number;
    employees: number;
}

const ENDPOINT = '/app/usermanagement/';

const ROLE_OPTIONS = [
    { value: 'employee', label: 'Employee' },
    { value: 'admin', label: 'Admin' },
    { value: 'master', label: 'Master' },
];

const STATUS_OPTIONS = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
];

const EMPTY_FORM = { username: '', email: '', first_name: '', last_name: '', role: 'employee', company: '', password: '', confirmPassword: '', is_active: true };

const MasterUserManagement = () => {
    const dispatch = useDispatch();
    const table = useServerTable<User>({ endpoint: ENDPOINT, filters: { role: '', company: '', is_active: '' } });
    const { reload } = table;

    const [summary, setSummary] = useState<Summary | null>(null);
    const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const currentUserId = Number(localStorage.getItem('user_id'));

    const loadSummary = useCallback(() => {
        apiRequest<Summary>(`${ENDPOINT}summary/`)
            .then(setSummary)
            .catch(() => setSummary(null));
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('User Management'));
        loadSummary();
        apiRequest<any>('/app/company-with-admin/', { params: { page_size: 100, ordering: 'name' } })
            .then((data) => setCompanies(data?.results || data || []))
            .catch(() => setCompanies([]));
    }, [dispatch, loadSummary]);

    const companyOptions = useMemo(() => [{ value: 'none', label: 'No company' }, ...companies.map((company) => ({ value: String(company.id), label: company.name }))], [companies]);

    const setField = (name: keyof typeof EMPTY_FORM, value: string | boolean) => setForm((current) => ({ ...current, [name]: value }));

    const openAdd = () => {
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) return notifyError('Password and confirm password do not match.', 'Check the passwords');
        if (form.role !== 'master' && !form.company) return notifyError('A company is required for admins and employees.', 'Company missing');

        setSaving(true);
        try {
            await apiRequest(ENDPOINT, {
                method: 'POST',
                body: {
                    username: form.username.trim(),
                    email: form.email.trim(),
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                    role: form.role,
                    password: form.password,
                    is_active: form.is_active,
                    ...(form.role !== 'master' && form.company ? { company: form.company } : {}),
                },
            });
            notifySuccess('User added.');
            setModalOpen(false);
            reload();
            loadSummary();
        } catch (err: any) {
            notifyError(err?.message, 'Could not add the user');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user: User) => {
        if (!(await confirmDanger('Delete this user?', `"${user.username}" will be removed permanently. This cannot be undone.`))) return;
        try {
            await apiRequest(`${ENDPOINT}${user.id}/`, { method: 'DELETE' });
            notifySuccess('User deleted.');
            reload();
            loadSummary();
        } catch (err: any) {
            notifyError(err?.message, 'Could not delete the user');
        }
    };

    const columns: Column<User>[] = [
        {
            key: 'user',
            header: 'User',
            sortKey: 'username',
            render: (user) => <Identity name={[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username} secondary={`@${user.username}`} />,
        },
        { key: 'email', header: 'Email', sortKey: 'email', render: (user) => <span className="break-all">{user.email}</span> },
        { key: 'company', header: 'Company', sortKey: 'company__name', render: (user) => user.company_name || <span className="text-slate-400">–</span> },
        { key: 'role', header: 'Role', sortKey: 'role', render: (user) => <RoleBadge role={user.role} /> },
        {
            key: 'designation',
            header: 'Designation',
            render: (user) => (user.designation && user.designation.toLowerCase() !== user.role ? user.designation : <span className="text-slate-400">–</span>),
        },
        { key: 'status', header: 'Status', sortKey: 'is_active', render: (user) => <StatusBadge active={user.is_active} /> },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (user) => (
                <IconButton label={user.id === currentUserId ? 'You cannot delete your own account' : `Delete ${user.username}`} tone="danger" disabled={user.id === currentUserId} onClick={() => handleDelete(user)}>
                    <IconTrashLines className="h-4 w-4" />
                </IconButton>
            ),
        },
    ];

    return (
        <MasterPage
            title="User Management"
            description="Every account on the platform, across all companies and roles."
            actions={
                <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
                    <IconPlus className="h-4 w-4" />
                    Add user
                </button>
            }
        >
            <StatGrid>
                <StatCard label="Total users" value={summary?.total} loading={!summary} tone="primary" icon={<IconUsersGroup className="h-5 w-5" />} />
                <StatCard label="Active" value={summary?.active} loading={!summary} tone="success" icon={<IconCircleCheck className="h-5 w-5" />} hint={summary ? `${summary.inactive} inactive` : undefined} />
                <StatCard label="Admins" value={summary?.admins} loading={!summary} tone="violet" icon={<IconListCheck className="h-5 w-5" />} hint={summary ? `${summary.masters} masters` : undefined} />
                <StatCard label="Employees" value={summary?.employees} loading={!summary} tone="warning" icon={<IconUser className="h-5 w-5" />} />
            </StatGrid>

            <SectionCard flush>
                <TableToolbar onReset={table.reset} canReset={table.hasActiveFilters} summary={!table.loading && `${table.total} ${table.total === 1 ? 'user' : 'users'}`}>
                    <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search name, username, email or company" />
                    <FilterSelect label="Role" value={table.filters.role} onChange={(value) => table.setFilter('role', value)} options={ROLE_OPTIONS} allLabel="All roles" />
                    <FilterSelect label="Company" value={table.filters.company} onChange={(value) => table.setFilter('company', value)} options={companyOptions} allLabel="All companies" />
                    <FilterSelect label="Status" value={table.filters.is_active} onChange={(value) => table.setFilter('is_active', value)} options={STATUS_OPTIONS} allLabel="Any status" />
                </TableToolbar>
                <DataTable
                    columns={columns}
                    rows={table.rows}
                    rowKey={(user) => user.id}
                    loading={table.loading}
                    error={table.error}
                    onRetry={reload}
                    ordering={table.ordering}
                    onOrderingChange={table.setOrdering}
                    emptyIcon={<IconUsersGroup className="h-6 w-6" />}
                    emptyTitle={table.hasActiveFilters ? 'No users match these filters' : 'No users yet'}
                    emptyDescription={table.hasActiveFilters ? 'Try a different search term or clear the filters.' : 'Add the first user to get started.'}
                    emptyAction={
                        table.hasActiveFilters && (
                            <button type="button" className="btn btn-outline-primary btn-sm" onClick={table.reset}>
                                Clear filters
                            </button>
                        )
                    }
                    pagination={{ page: table.page, pageSize: table.pageSize, total: table.total, onPageChange: table.setPage, onPageSizeChange: table.setPageSize, noun: 'users' }}
                />
            </SectionCard>

            <MasterModal open={modalOpen} onClose={() => setModalOpen(false)} title="Add user" description="Create an account and assign its role and company.">
                <form onSubmit={handleSubmit}>
                    <ModalBody>
                        <FormGrid>
                            <FormField label="First name" htmlFor="user_first_name">
                                <input id="user_first_name" type="text" className="form-input" value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} />
                            </FormField>
                            <FormField label="Last name" htmlFor="user_last_name">
                                <input id="user_last_name" type="text" className="form-input" value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} />
                            </FormField>
                            <FormField label="Username" htmlFor="user_username" required>
                                <input id="user_username" type="text" className="form-input" required autoComplete="off" value={form.username} onChange={(e) => setField('username', e.target.value)} />
                            </FormField>
                            <FormField label="Email" htmlFor="user_email" required>
                                <input id="user_email" type="email" className="form-input" required placeholder="name@company.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                            </FormField>
                            <FormField label="Role" htmlFor="user_role" required>
                                <select id="user_role" className="form-select" value={form.role} onChange={(e) => setField('role', e.target.value)}>
                                    {ROLE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                            {form.role !== 'master' ? (
                                <FormField label="Company" htmlFor="user_company" required>
                                    <select id="user_company" className="form-select" required value={form.company} onChange={(e) => setField('company', e.target.value)}>
                                        <option value="">Select a company</option>
                                        {companies.map((company) => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            ) : (
                                <FormField label="Company" htmlFor="user_company_none" hint="Masters are not tied to a company.">
                                    <input id="user_company_none" type="text" className="form-input" value="All companies" disabled />
                                </FormField>
                            )}
                            <FormField label="Password" htmlFor="user_password" required>
                                <input id="user_password" type="password" className="form-input" required autoComplete="new-password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
                            </FormField>
                            <FormField label="Confirm password" htmlFor="user_confirm_password" required>
                                <input id="user_confirm_password" type="password" className="form-input" required autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} />
                            </FormField>
                        </FormGrid>
                        <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <input type="checkbox" className="form-checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
                            Account is active and can sign in
                        </label>
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-outline-dark" onClick={() => setModalOpen(false)} disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Add user'}
                        </button>
                    </ModalFooter>
                </form>
            </MasterModal>
        </MasterPage>
    );
};

export default MasterUserManagement;
