import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPencil from '../../components/Icon/IconPencil';
import IconPlus from '../../components/Icon/IconPlus';
import IconServer from '../../components/Icon/IconServer';
import {
    apiRequest,
    Avatar,
    Badge,
    Column,
    DataTable,
    FilterSelect,
    FormField,
    FormGrid,
    FormSectionTitle,
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
    Steps,
    TableToolbar,
    useServerTable,
} from '../../components/Master';

interface Company {
    id: number;
    name: string;
    email: string;
    phone_number: string;
    address: string;
    location: string | null;
    gmail_domains: string | null;
    bank_name: string | null;
    account_no: string | null;
    ifsc_code: string | null;
    branch_name: string | null;
    logo_url: string | null;
    employee_count?: number;
    admin_id: number | null;
    admin_username: string | null;
    admin_email: string | null;
    admin_first_name_value: string;
    admin_last_name_value: string;
}

const ENDPOINT = '/app/company-with-admin/';

const ADMIN_OPTIONS = [
    { value: 'true', label: 'Assigned' },
    { value: 'false', label: 'Not assigned' },
];

const EMPTY_FORM = {
    name: '',
    email: '',
    phone_number: '',
    address: '',
    location: '',
    gmail_domains: '',
    bank_name: '',
    account_no: '',
    ifsc_code: '',
    branch_name: '',
    admin: '',
    admin_username_input: '',
    admin_email_input: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_password: '',
    admin_confirm_password: '',
};

type FormState = typeof EMPTY_FORM;

const COMPANY_FIELDS: (keyof FormState)[] = ['name', 'email', 'phone_number', 'address', 'location', 'gmail_domains', 'bank_name', 'account_no', 'ifsc_code', 'branch_name'];

const MasterCompany = () => {
    const dispatch = useDispatch();
    const table = useServerTable<Company>({ endpoint: ENDPOINT, filters: { has_admin: '' } });
    const { reload } = table;

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Company | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [logo, setLogo] = useState<File | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Company Management'));
    }, [dispatch]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

    const openAdd = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setLogo(null);
        setStep(1);
        setModalOpen(true);
    };

    const openEdit = (company: Company) => {
        setEditing(company);
        setForm({
            ...EMPTY_FORM,
            name: company.name || '',
            email: company.email || '',
            phone_number: company.phone_number || '',
            address: company.address || '',
            location: company.location || '',
            gmail_domains: company.gmail_domains || '',
            bank_name: company.bank_name || '',
            account_no: company.account_no || '',
            ifsc_code: company.ifsc_code || '',
            branch_name: company.branch_name || '',
            admin: company.admin_id ? String(company.admin_id) : '',
            admin_username_input: company.admin_username || '',
            admin_email_input: company.admin_email || '',
            admin_first_name: company.admin_first_name_value || '',
            admin_last_name: company.admin_last_name_value || '',
        });
        setLogo(null);
        setStep(1);
        setModalOpen(true);
    };

    const companyError = () => {
        if (!form.name.trim()) return 'Company name is required.';
        if (!form.email.trim()) return 'Company email is required.';
        if (!form.phone_number.trim()) return 'Company phone number is required.';
        if (!form.address.trim()) return 'Company address is required.';
        return '';
    };

    const adminError = () => {
        if (!form.admin_username_input.trim()) return 'Admin username is required.';
        if (!form.admin_email_input.trim()) return 'Admin email is required.';
        // A new company always needs a password; on edit it is only changed when filled in
        if (!editing && !form.admin_password) return 'Admin password is required.';
        if ((form.admin_password || form.admin_confirm_password) && form.admin_password !== form.admin_confirm_password) return 'Admin password and confirm password do not match.';
        return '';
    };

    const goToAdminStep = () => {
        const message = companyError();
        if (message) return notifyError(message, 'Check the company details');
        setStep(2);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        // Pressing Enter on the first step of a new company moves on instead of saving
        if (!editing && step === 1) return goToAdminStep();
        const includeAdmin = !editing || step === 2;
        const message = companyError() || (includeAdmin ? adminError() : '');
        if (message) return notifyError(message, 'Check the form');

        const data = new FormData();
        COMPANY_FIELDS.forEach((field) => data.append(field, form[field]));
        if (editing && form.admin) data.append('admin', form.admin);
        if (includeAdmin) {
            data.append('admin_username_input', form.admin_username_input.trim());
            data.append('admin_email_input', form.admin_email_input.trim());
            data.append('admin_first_name', form.admin_first_name);
            data.append('admin_last_name', form.admin_last_name);
            if (form.admin_password) data.append('admin_password', form.admin_password);
        }
        if (logo) data.append('logo', logo);

        setSaving(true);
        try {
            await apiRequest(editing ? `${ENDPOINT}${editing.id}/` : ENDPOINT, { method: editing ? 'PATCH' : 'POST', body: data });
            notifySuccess(editing ? 'Company updated.' : 'Company added.');
            setModalOpen(false);
            reload();
        } catch (err: any) {
            notifyError(err?.message, editing ? 'Could not update the company' : 'Could not add the company');
        } finally {
            setSaving(false);
        }
    };

    const columns: Column<Company>[] = [
        { key: 'company', header: 'Company', sortKey: 'name', render: (company) => <Identity name={company.name} src={company.logo_url} square secondary={company.email} /> },
        {
            key: 'admin',
            header: 'Administrator',
            render: (company) =>
                company.admin_username ? (
                    <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 dark:text-white">{[company.admin_first_name_value, company.admin_last_name_value].filter(Boolean).join(' ') || company.admin_username}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{company.admin_email}</p>
                    </div>
                ) : (
                    <Badge tone="warning" dot>
                        Not assigned
                    </Badge>
                ),
        },
        { key: 'phone', header: 'Phone', className: 'whitespace-nowrap', render: (company) => company.phone_number || <span className="text-slate-400">–</span> },
        {
            key: 'location',
            header: 'Location',
            sortKey: 'location',
            render: (company) => (
                <div className="max-w-[220px]">
                    <p className="truncate">{company.location || <span className="text-slate-400">–</span>}</p>
                    {company.address && (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={company.address}>
                            {company.address}
                        </p>
                    )}
                </div>
            ),
        },
        { key: 'employees', header: 'Employees', sortKey: 'employee_count', align: 'right', className: 'tabular-nums', render: (company) => company.employee_count ?? '–' },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (company) => (
                <IconButton label={`Edit ${company.name}`} onClick={() => openEdit(company)}>
                    <IconPencil className="h-4 w-4" />
                </IconButton>
            ),
        },
    ];

    const isAdminStep = step === 2;

    return (
        <MasterPage
            title="Company Management"
            description="Registered companies, their profiles and the administrator responsible for each."
            actions={
                <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
                    <IconPlus className="h-4 w-4" />
                    Add company
                </button>
            }
        >
            <SectionCard flush>
                <TableToolbar onReset={table.reset} canReset={table.hasActiveFilters} summary={!table.loading && `${table.total} ${table.total === 1 ? 'company' : 'companies'}`}>
                    <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search name, email, location or phone" />
                    <FilterSelect label="Administrator" value={table.filters.has_admin} onChange={(value) => table.setFilter('has_admin', value)} options={ADMIN_OPTIONS} allLabel="Any" />
                </TableToolbar>
                <DataTable
                    columns={columns}
                    rows={table.rows}
                    rowKey={(company) => company.id}
                    loading={table.loading}
                    error={table.error}
                    onRetry={reload}
                    ordering={table.ordering}
                    onOrderingChange={table.setOrdering}
                    emptyIcon={<IconServer className="h-6 w-6" />}
                    emptyTitle={table.hasActiveFilters ? 'No companies match these filters' : 'No companies yet'}
                    emptyDescription={table.hasActiveFilters ? 'Try a different search term or clear the filters.' : 'Add the first company to start onboarding its administrator and employees.'}
                    emptyAction={
                        table.hasActiveFilters ? (
                            <button type="button" className="btn btn-outline-primary btn-sm" onClick={table.reset}>
                                Clear filters
                            </button>
                        ) : (
                            <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
                                Add company
                            </button>
                        )
                    }
                    pagination={{ page: table.page, pageSize: table.pageSize, total: table.total, onPageChange: table.setPage, onPageSizeChange: table.setPageSize, noun: 'companies' }}
                />
            </SectionCard>

            <MasterModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? `Edit ${editing.name}` : 'Add company'}
                description={editing ? 'Update the company profile or its administrator account.' : 'Create the company profile, then its administrator account.'}
            >
                <form onSubmit={handleSubmit}>
                    <ModalBody>
                        <Steps steps={['Company details', 'Administrator']} current={step} />

                        {!isAdminStep ? (
                            <>
                                <FormSectionTitle>Profile</FormSectionTitle>
                                <FormGrid>
                                    <FormField label="Company name" htmlFor="company_name" required wide>
                                        <input id="company_name" name="name" type="text" className="form-input" value={form.name} onChange={handleChange} />
                                    </FormField>
                                    <FormField label="Email" htmlFor="company_email" required>
                                        <input id="company_email" name="email" type="email" className="form-input" value={form.email} onChange={handleChange} />
                                    </FormField>
                                    <FormField label="Phone number" htmlFor="company_phone" required>
                                        <input id="company_phone" name="phone_number" type="text" className="form-input" value={form.phone_number} onChange={handleChange} />
                                    </FormField>
                                    <FormField label="Location" htmlFor="company_location">
                                        <input id="company_location" name="location" type="text" className="form-input" placeholder="City" value={form.location} onChange={handleChange} />
                                    </FormField>
                                    <FormField label="Allowed email domains" htmlFor="company_domains" hint="Comma separated, e.g. example.com, sub.example.com">
                                        <input id="company_domains" name="gmail_domains" type="text" className="form-input" value={form.gmail_domains} onChange={handleChange} />
                                    </FormField>
                                    <FormField label="Address" htmlFor="company_address" required wide>
                                        <textarea id="company_address" name="address" className="form-textarea min-h-[72px]" value={form.address} onChange={handleChange} />
                                    </FormField>
                                    <FormField label={editing ? 'Replace logo' : 'Logo'} htmlFor="company_logo" hint="Optional. PNG or JPG." wide>
                                        <div className="flex items-center gap-3">
                                            {editing && <Avatar name={editing.name} src={editing.logo_url} square />}
                                            <input
                                                id="company_logo"
                                                type="file"
                                                accept="image/*"
                                                className="form-input file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
                                                onChange={(e) => setLogo(e.target.files?.[0] || null)}
                                            />
                                        </div>
                                    </FormField>
                                </FormGrid>

                                <div className="mt-5">
                                    <FormSectionTitle>Bank details (optional)</FormSectionTitle>
                                    <FormGrid>
                                        <FormField label="Bank name" htmlFor="company_bank">
                                            <input id="company_bank" name="bank_name" type="text" className="form-input" value={form.bank_name} onChange={handleChange} />
                                        </FormField>
                                        <FormField label="Account number" htmlFor="company_account">
                                            <input id="company_account" name="account_no" type="text" className="form-input" value={form.account_no} onChange={handleChange} />
                                        </FormField>
                                        <FormField label="IFSC code" htmlFor="company_ifsc">
                                            <input id="company_ifsc" name="ifsc_code" type="text" className="form-input" value={form.ifsc_code} onChange={handleChange} />
                                        </FormField>
                                        <FormField label="Branch name" htmlFor="company_branch">
                                            <input id="company_branch" name="branch_name" type="text" className="form-input" value={form.branch_name} onChange={handleChange} />
                                        </FormField>
                                    </FormGrid>
                                </div>
                            </>
                        ) : (
                            <>
                                <FormSectionTitle>{editing ? 'Administrator account' : 'New administrator account'}</FormSectionTitle>
                                <FormGrid>
                                    <FormField label="First name" htmlFor="company_admin_first_name">
                                        <input id="company_admin_first_name" name="admin_first_name" type="text" className="form-input" value={form.admin_first_name} onChange={handleChange} />
                                    </FormField>
                                    <FormField label="Last name" htmlFor="company_admin_last_name">
                                        <input id="company_admin_last_name" name="admin_last_name" type="text" className="form-input" value={form.admin_last_name} onChange={handleChange} />
                                    </FormField>
                                    <FormField label="Username" htmlFor="company_admin_username" required>
                                        <input id="company_admin_username" name="admin_username_input" type="text" className="form-input" autoComplete="off" value={form.admin_username_input} onChange={handleChange} />
                                    </FormField>
                                    <FormField label="Email" htmlFor="company_admin_email" required>
                                        <input id="company_admin_email" name="admin_email_input" type="email" className="form-input" value={form.admin_email_input} onChange={handleChange} />
                                    </FormField>
                                    <FormField label={editing ? 'New password' : 'Password'} htmlFor="company_admin_password" required={!editing} hint={editing ? 'Leave empty to keep the current password.' : undefined}>
                                        <input id="company_admin_password" name="admin_password" type="password" className="form-input" autoComplete="new-password" value={form.admin_password} onChange={handleChange} />
                                    </FormField>
                                    <FormField label={editing ? 'Confirm new password' : 'Confirm password'} htmlFor="company_admin_confirm" required={!editing}>
                                        <input id="company_admin_confirm" name="admin_confirm_password" type="password" className="form-input" autoComplete="new-password" value={form.admin_confirm_password} onChange={handleChange} />
                                    </FormField>
                                </FormGrid>
                            </>
                        )}
                    </ModalBody>

                    <ModalFooter
                        start={
                            isAdminStep && (
                                <button type="button" className="btn btn-outline-primary" onClick={() => setStep(1)} disabled={saving}>
                                    Back
                                </button>
                            )
                        }
                    >
                        <button type="button" className="btn btn-outline-dark" onClick={() => setModalOpen(false)} disabled={saving}>
                            Cancel
                        </button>
                        {!isAdminStep && (!editing || editing.admin_id) && (
                            <button type="button" className={editing ? 'btn btn-outline-primary' : 'btn btn-primary'} onClick={goToAdminStep} disabled={saving}>
                                {editing ? 'Edit administrator' : 'Next: administrator'}
                            </button>
                        )}
                        {(editing || isAdminStep) && (
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add company'}
                            </button>
                        )}
                    </ModalFooter>
                </form>
            </MasterModal>
        </MasterPage>
    );
};

export default MasterCompany;
