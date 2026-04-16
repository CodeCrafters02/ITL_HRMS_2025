import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import IconX from '../../components/Icon/IconX';
import IconPencil from '../../components/Icon/IconPencil';
import IconPlus from '../../components/Icon/IconPlus';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/company-with-admin/`;

const MasterCompany = () => {
    const dispatch = useDispatch();
    const [companies, setCompanies] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [availableAdmins, setAvailableAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Pagination & Search States
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone_number: '',
        address: '',
        location: '',
        admin: '',
        logo: null as File | null,
    });

    useEffect(() => {
        dispatch(setPageTitle('Company Management'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchCompanies();
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [search, page, pageSize]);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const url = new URL(API_URL);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (search) url.searchParams.append('search', search);

            const response = await fetch(url.toString(), { headers });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setCompanies(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.ceil(data.count / pageSize));
                } else {
                    setCompanies(data);
                }
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableAdmins = async (includeId?: number) => {
        try {
            const token = localStorage.getItem('access_token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            let url = `${API_BASE_URL}/app/admin-register/?unassigned=true`;
            if (includeId) {
                url += `&include_id=${includeId}`;
            }

            const response = await fetch(url, { headers });
            if (response.ok) {
                const data = await response.json();
                setAvailableAdmins(data.results || data);
            }
        } catch (error) {
            console.error('Error fetching available admins:', error);
        }
    };

    const handleInputChange = (e: any) => {
        const { name, value, files } = e.target;
        if (name === 'logo') {
            setFormData({ ...formData, logo: files[0] });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleAddCompany = async (e: any) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('access_token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('email', formData.email);
            submitData.append('phone_number', formData.phone_number);
            submitData.append('address', formData.address);
            submitData.append('location', formData.location);
            if (formData.admin) {
                submitData.append('admin', formData.admin);
            }
            if (formData.logo) {
                submitData.append('logo', formData.logo);
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers,
                body: submitData,
            });

            if (response.ok) {
                Swal.fire({ title: 'Added!', text: 'Company added successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setIsAddModalOpen(false);
                fetchCompanies();
                resetForm();
            } else {
                const err = await response.json();
                Swal.fire({ title: 'Error!', text: JSON.stringify(err), icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (error) {
            Swal.fire({ title: 'Error!', text: 'Failed to add company.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const handleEditCompany = async (e: any) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('access_token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('email', formData.email);
            submitData.append('phone_number', formData.phone_number);
            submitData.append('address', formData.address);
            submitData.append('location', formData.location);
            if (formData.admin) {
                submitData.append('admin', formData.admin);
            }
            if (formData.logo) {
                submitData.append('logo', formData.logo);
            }

            const response = await fetch(`${API_URL}${selectedCompany.id}/`, {
                method: 'PATCH',
                headers,
                body: submitData,
            });

            if (response.ok) {
                Swal.fire({ title: 'Updated!', text: 'Company updated successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setIsEditModalOpen(false);
                fetchCompanies();
                resetForm();
            } else {
                const err = await response.json();
                Swal.fire({ title: 'Error!', text: JSON.stringify(err), icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (error) {
            Swal.fire({ title: 'Error!', text: 'Failed to update company.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const openEditModal = (company: any) => {
        setSelectedCompany(company);
        setFormData({
            name: company.name || '',
            email: company.email || '',
            phone_number: company.phone_number || '',
            address: company.address || '',
            location: company.location || '',
            admin: company.admin_id || '',
            logo: null,
        });
        fetchAvailableAdmins(company.admin_id);
        setIsEditModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone_number: '',
            address: '',
            location: '',
            admin: '',
            logo: null,
        });
        setSelectedCompany(null);
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Company Management</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Browse and manage all registered companies and organizational profiles securely.</p>
                </div>
                {/* Decorative background shape */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-4 mb-5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        className="form-input w-full sm:w-64"
                        placeholder="Search by name, email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                    <button
                        type="button"
                        className="btn btn-primary gap-2"
                        onClick={() => {
                            resetForm();
                            fetchAvailableAdmins();
                            setIsAddModalOpen(true);
                        }}
                    >
                        <IconPlus /> Add New Company
                    </button>
                </div>
            </div>

            <div className="panel p-0 border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Admin</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Location</th>
                                <th>Address</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-5">Loading...</td>
                                </tr>
                            ) : companies.length > 0 ? (
                                companies.map((company) => (
                                    <tr key={company.id}>
                                        <td>
                                            <div className="flex items-center w-max">
                                                <div className="w-10 h-10 overflow-hidden rounded shadow-sm mr-3">
                                                    {company.logo_url ? (
                                                        <img src={company.logo_url} alt="logo" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold uppercase">{company.name.charAt(0)}</div>
                                                    )}
                                                </div>
                                                <div className="font-semibold">{company.name}</div>
                                            </div>
                                        </td>
                                        <td>
                                            {company.admin_username ? (
                                                <span className="badge badge-outline-primary">{company.admin_username}</span>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">No Admin Assigned</span>
                                            )}
                                        </td>
                                        <td>{company.email}</td>
                                        <td>{company.phone_number}</td>
                                        <td>{company.location || '-'}</td>
                                        <td>
                                            <div className="max-w-[200px] truncate" title={company.address}>
                                                {company.address || '-'}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <button type="button" className="text-primary hover:text-primary-focus p-2 rounded-full" onClick={() => openEditModal(company)}>
                                                <IconPencil />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-5">No companies found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalCount > 0 && (
                    <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                                Showing <span className="text-primary">{((page - 1) * pageSize) + 1}</span> to <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-primary">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Per side:</span>
                                <select
                                    className="form-select w-20 text-sm font-semibold py-1"
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>
                        <ul className="inline-flex items-center space-x-1 font-semibold">
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    Prev
                                </button>
                            </li>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <li key={p}>
                                    <button
                                        type="button"
                                        className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${page === p ? 'bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]' : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'}`}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </button>
                                </li>
                            ))}
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Add Company Modal */}
            <Transition appear show={isAddModalOpen} as={Fragment}>
                <Dialog as="div" open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} className="relative z-50">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-xl">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none"
                                    >
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        Add New Company
                                    </div>
                                    <div className="p-5">
                                        <form onSubmit={handleAddCompany} className="space-y-4">
                                            <div>
                                                <label htmlFor="name">Company Name</label>
                                                <input id="name" type="text" name="name" className="form-input" required value={formData.name} onChange={handleInputChange} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="email">Email</label>
                                                    <input id="email" type="email" name="email" className="form-input" required value={formData.email} onChange={handleInputChange} />
                                                </div>
                                                <div>
                                                    <label htmlFor="phone_number">Phone Number</label>
                                                    <input id="phone_number" type="text" name="phone_number" className="form-input" required value={formData.phone_number} onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="location">Location</label>
                                                    <input id="location" type="text" name="location" className="form-input" value={formData.location} onChange={handleInputChange} />
                                                </div>
                                                <div>
                                                    <label htmlFor="logo">Company Logo</label>
                                                    <input id="logo" type="file" name="logo" className="form-input file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" accept="image/*" onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="admin">Assign Administrator (Optional)</label>
                                                <select id="admin" name="admin" className="form-select" value={formData.admin} onChange={handleInputChange}>
                                                    <option value="">Select an Admin</option>
                                                    {availableAdmins.map((admin: any) => (
                                                        <option key={admin.id} value={admin.id}>
                                                            {admin.username} ({admin.email})
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-xs text-white-dark mt-1">Only showing admins not yet assigned to a company.</p>
                                            </div>
                                            <div>
                                                <label htmlFor="address">Address</label>
                                                <textarea id="address" name="address" className="form-textarea min-h-[80px]" required value={formData.address} onChange={handleInputChange} />
                                            </div>
                                            <div className="flex justify-end items-center mt-8 space-x-3">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary">Add Company</button>
                                            </div>
                                        </form>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Edit Company Modal */}
            <Transition appear show={isEditModalOpen} as={Fragment}>
                <Dialog as="div" open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="relative z-50">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-xl">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none"
                                    >
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        Edit Company
                                    </div>
                                    <div className="p-5">
                                        <form onSubmit={handleEditCompany} className="space-y-4">
                                            <div>
                                                <label htmlFor="edit_name">Company Name</label>
                                                <input id="edit_name" type="text" name="name" className="form-input" required value={formData.name} onChange={handleInputChange} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="edit_email">Email</label>
                                                    <input id="edit_email" type="email" name="email" className="form-input" required value={formData.email} onChange={handleInputChange} />
                                                </div>
                                                <div>
                                                    <label htmlFor="edit_phone_number">Phone Number</label>
                                                    <input id="edit_phone_number" type="text" name="phone_number" className="form-input" required value={formData.phone_number} onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="edit_location">Location</label>
                                                    <input id="edit_location" type="text" name="location" className="form-input" value={formData.location} onChange={handleInputChange} />
                                                </div>
                                                <div>
                                                    <label htmlFor="edit_logo">Update Logo (Optional)</label>
                                                    {selectedCompany?.logo_url && (
                                                        <div className="mb-2 flex items-center gap-3 bg-gray-50 dark:bg-[#1b2e4b] p-2 rounded border border-[#e0e6ed] dark:border-[#1b2e4b]">
                                                            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                                                <img src={selectedCompany.logo_url} alt="Current Logo" className="w-full h-full object-cover" />
                                                            </div>
                                                            <span className="text-xs text-gray-500 font-semibold">Current Logo Active</span>
                                                        </div>
                                                    )}
                                                    <input id="edit_logo" type="file" name="logo" className="form-input file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" accept="image/*" onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="edit_admin">Change Administrator</label>
                                                <select id="edit_admin" name="admin" className="form-select" value={formData.admin} onChange={handleInputChange}>
                                                    <option value="">No Admin Assigned</option>
                                                    {availableAdmins.map((admin: any) => (
                                                        <option key={admin.id} value={admin.id}>
                                                            {admin.username} ({admin.email})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="edit_address">Address</label>
                                                <textarea id="edit_address" name="address" className="form-textarea min-h-[80px]" required value={formData.address} onChange={handleInputChange} />
                                            </div>
                                            <div className="flex justify-end items-center mt-8 space-x-3">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary">Save Changes</button>
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

export default MasterCompany;

