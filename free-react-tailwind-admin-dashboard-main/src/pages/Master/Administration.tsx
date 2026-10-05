import { FormEvent, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconPencil from '../../components/Icon/IconPencil';
import IconListCheck from '../../components/Icon/IconListCheck';
import {
    apiRequest,
    Badge,
    Column,
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
    SearchInput,
    SectionCard,
    TableToolbar,
    useServerTable,
} from '../../components/Master';

interface Admin {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    company_name?: string | null;
}

const ENDPOINT = '/app/admin-register/';

const ASSIGNMENT_OPTIONS = [
    { value: 'true', label: 'Assigned' },
    { value: 'false', label: 'Unassigned' },
];

const EMPTY_FORM = { username: '', email: '', first_name: '', last_name: '', password: '', confirmPassword: '' };

const MasterAdministration = () => {
    const dispatch = useDispatch();
    const table = useServerTable<Admin>({ endpoint: ENDPOINT, filters: { assigned: '' } });
    const { reload } = table;

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Admin | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    useEffect(() => {
        dispatch(setPageTitle('Administrators'));
    }, [dispatch]);

    const setField = (name: keyof typeof EMPTY_FORM, value: string) => setForm((current) => ({ ...current, [name]: value }));

    const openAdd = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (admin: Admin) => {
        setEditing(admin);
        setForm({ ...EMPTY_FORM, username: admin.username || '', email: admin.email || '', first_name: admin.first_name || '', last_name: admin.last_name || '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!editing && form.password !== form.confirmPassword) return notifyError('Password and confirm password do not match.', 'Check the passwords');

        const body: Record<string, unknown> = { username: form.username.trim(), email: form.email.trim(), first_name: form.first_name.trim(), last_name: form.last_name.trim() };
        if (!editing) body.password = form.password;

        setSaving(true);
        try {
            await apiRequest(editing ? `${ENDPOINT}${editing.id}/` : ENDPOINT, { method: editing ? 'PATCH' : 'POST', body });
            notifySuccess(editing ? 'Administrator updated.' : 'Administrator added.');
            setModalOpen(false);
            reload();
        } catch (err: any) {
            notifyError(err?.message, editing ? 'Could not update the administrator' : 'Could not add the administrator');
        } finally {
            setSaving(false);
        }
    };

    const columns: Column<Admin>[] = [
        {
            key: 'admin',
            header: 'Administrator',
            sortKey: 'username',
            render: (admin) => <Identity name={[admin.first_name, admin.last_name].filter(Boolean).join(' ') || admin.username} secondary={`@${admin.username}`} />,
        },
        { key: 'email', header: 'Email', sortKey: 'email', render: (admin) => <span className="break-all">{admin.email}</span> },
        {
            key: 'company',
            header: 'Company',
            sortKey: 'company__name',
            render: (admin) =>
                admin.company_name ? (
                    admin.company_name
                ) : (
                    <Badge tone="warning" dot>
                        Unassigned
                    </Badge>
                ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (admin) => (
                <IconButton label={`Edit ${admin.username}`} onClick={() => openEdit(admin)}>
                    <IconPencil className="h-4 w-4" />
                </IconButton>
            ),
        },
    ];

    return (
        <MasterPage
            title="Administrators"
            description="Company administrator accounts. Assign an administrator to a company from the Companies page."
            actions={
                <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
                    <IconPlus className="h-4 w-4" />
                    Add administrator
                </button>
            }
        >
            <SectionCard flush>
                <TableToolbar onReset={table.reset} canReset={table.hasActiveFilters} summary={!table.loading && `${table.total} ${table.total === 1 ? 'administrator' : 'administrators'}`}>
                    <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search name, username, email or company" />
                    <FilterSelect label="Company" value={table.filters.assigned} onChange={(value) => table.setFilter('assigned', value)} options={ASSIGNMENT_OPTIONS} allLabel="Any" />
                </TableToolbar>
                <DataTable
                    columns={columns}
                    rows={table.rows}
                    rowKey={(admin) => admin.id}
                    loading={table.loading}
                    error={table.error}
                    onRetry={reload}
                    ordering={table.ordering}
                    onOrderingChange={table.setOrdering}
                    emptyIcon={<IconListCheck className="h-6 w-6" />}
                    emptyTitle={table.hasActiveFilters ? 'No administrators match these filters' : 'No administrators yet'}
                    emptyDescription={table.hasActiveFilters ? 'Try a different search term or clear the filters.' : 'Add an administrator, then assign them to a company.'}
                    emptyAction={
                        table.hasActiveFilters && (
                            <button type="button" className="btn btn-outline-primary btn-sm" onClick={table.reset}>
                                Clear filters
                            </button>
                        )
                    }
                    pagination={{ page: table.page, pageSize: table.pageSize, total: table.total, onPageChange: table.setPage, onPageSizeChange: table.setPageSize, noun: 'administrators' }}
                />
            </SectionCard>

            <MasterModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit administrator' : 'Add administrator'}
                description={editing ? 'Update the account details. The password is not changed here.' : 'Create a company administrator account.'}
            >
                <form onSubmit={handleSubmit}>
                    <ModalBody>
                        <FormGrid>
                            <FormField label="First name" htmlFor="admin_first_name">
                                <input id="admin_first_name" type="text" className="form-input" value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} />
                            </FormField>
                            <FormField label="Last name" htmlFor="admin_last_name">
                                <input id="admin_last_name" type="text" className="form-input" value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} />
                            </FormField>
                            <FormField label="Username" htmlFor="admin_username" required>
                                <input id="admin_username" type="text" className="form-input" required autoComplete="off" value={form.username} onChange={(e) => setField('username', e.target.value)} />
                            </FormField>
                            <FormField label="Email" htmlFor="admin_email" required>
                                <input id="admin_email" type="email" className="form-input" required placeholder="name@company.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                            </FormField>
                            {!editing && (
                                <>
                                    <FormField label="Password" htmlFor="admin_password" required>
                                        <input id="admin_password" type="password" className="form-input" required autoComplete="new-password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
                                    </FormField>
                                    <FormField label="Confirm password" htmlFor="admin_confirm_password" required>
                                        <input id="admin_confirm_password" type="password" className="form-input" required autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} />
                                    </FormField>
                                </>
                            )}
                        </FormGrid>
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-outline-dark" onClick={() => setModalOpen(false)} disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add administrator'}
                        </button>
                    </ModalFooter>
                </form>
            </MasterModal>
        </MasterPage>
    );
};

export default MasterAdministration;
