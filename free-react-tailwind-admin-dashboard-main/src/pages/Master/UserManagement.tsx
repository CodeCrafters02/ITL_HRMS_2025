import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';
import IconTrashLines from '../../components/Icon/IconTrashLines';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/usermanagement/`;
const COMPANY_URL = `${API_BASE_URL}/app/company-with-admin/?page_size=1000`;

const MasterUserManagement = () => {
    const dispatch = useDispatch();
    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Pagination & Search States
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'employee',
        company: '',
        password: '',
        confirmPassword: '',
        is_active: true
    });

    useEffect(() => {
        dispatch(setPageTitle('User Management'));
        fetchCompanies();
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchUsers();
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [search, page, pageSize]);

    const fetchCompanies = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(COMPANY_URL, { headers });
            if (response.ok) {
                const data = await response.json();
                setCompanies(data.results || data);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    };

    const fetchUsers = async () => {
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
                    setUsers(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.ceil(data.count / pageSize));
                } else {
                    setUsers(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const resetForm = () => {
        setFormData({
            username: '',
            email: '',
            first_name: '',
            last_name: '',
            role: 'employee',
            company: '',
            password: '',
            confirmPassword: '',
            is_active: true
        });
    };

    const handleAddUser = async (e: any) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            Swal.fire({ title: 'Error!', text: 'Passwords do not match.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            return;
        }

        if (formData.role !== 'master' && !formData.company) {
            Swal.fire({ title: 'Error!', text: 'Company is required for Admins and Employees.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const headers: any = {
                'Content-Type': 'application/json'
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const payload: any = {
                username: formData.username,
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                role: formData.role,
                password: formData.password,
                is_active: formData.is_active,
            };

            if (formData.role !== 'master' && formData.company) {
                payload.company = formData.company;
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({ title: 'Added!', text: 'User added successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setIsAddModalOpen(false);
                fetchUsers();
                resetForm();
            } else {
                const err = await response.json();
                Swal.fire({ title: 'Error!', text: JSON.stringify(err), icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (error) {
            Swal.fire({ title: 'Error!', text: 'Failed to add User.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const handleDeleteUser = async (user: any) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete user "${user.username}"? This action cannot be undone!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
            padding: '2em',
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('access_token');
                const headers: any = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const response = await fetch(`${API_URL}${user.id}/`, {
                    method: 'DELETE',
                    headers,
                });

                if (response.ok || response.status === 204) {
                    Swal.fire({ title: 'Deleted!', text: 'User has been deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                    fetchUsers();
                } else {
                    const err = await response.json().catch(() => null);
                    Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to delete user.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
                }
            } catch (error) {
                Swal.fire({ title: 'Error!', text: 'Failed to delete user.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        }
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#064e3b] to-[#10b981] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">User Management</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">View the complete member directory including associated designations and roles.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-4 mb-5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        className="form-input w-full sm:w-64"
                        placeholder="Search by username, email, designation..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                    <button
                        type="button"
                        className="btn btn-primary gap-2"
                        onClick={() => {
                            resetForm();
                            setIsAddModalOpen(true);
                        }}
                    >
                        <IconPlus /> Add User
                    </button>
                </div>
            </div>

            <div className="panel p-0 border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Company</th>
                                <th>Designation / Role</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-5">Loading...</td>
                                </tr>
                            ) : users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td className="font-semibold">{user.username}</td>
                                        <td>{user.email}</td>
                                        <td>{user.company_name || '-'}</td>
                                        <td>
                                            <span className="badge badge-outline-primary">{user.designation || user.role}</span>
                                        </td>
                                        <td className="text-center">
                                            <button type="button" className="text-danger hover:text-red-700" onClick={() => handleDeleteUser(user)}>
                                                <IconTrashLines className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-5">No users found.</td>
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
                            {(() => {
                                const pages: (number | string)[] = [];
                                if (totalPages <= 3) {
                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                    if (page <= 2) {
                                        pages.push(1, 2, 3, 'right-ellipsis', totalPages);
                                    } else if (page >= totalPages - 1) {
                                        pages.push(1, 'left-ellipsis', totalPages - 2, totalPages - 1, totalPages);
                                    } else {
                                        pages.push(1, 'left-ellipsis', page, 'right-ellipsis', totalPages);
                                    }
                                }
                                return pages.map((p, idx) => {
                                    if (p === 'left-ellipsis' || p === 'right-ellipsis') {
                                        const jumpPage = p === 'left-ellipsis' ? Math.max(1, page - 3) : Math.min(totalPages, page + 3);
                                        return (
                                            <li key={`${p}-${idx}`}>
                                                <button
                                                    type="button"
                                                    title={p === 'left-ellipsis' ? "Previous 3 pages" : "Next 3 pages"}
                                                    className="flex justify-center font-semibold px-3 py-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary cursor-pointer"
                                                    onClick={() => setPage(jumpPage)}
                                                >
                                                    ...
                                                </button>
                                            </li>
                                        );
                                    }
                                    return (
                                        <li key={p}>
                                            <button
                                                type="button"
                                                className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${page === p ? 'bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]' : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'}`}
                                                onClick={() => setPage(p as number)}
                                            >
                                                {p}
                                            </button>
                                        </li>
                                    );
                                });
                            })()}
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

            {/* Add User Modal */}
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
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-4xl text-black dark:text-white-dark shadow-xl">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none"
                                    >
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        User Information
                                    </div>
                                    <div className="p-5">
                                        <form onSubmit={handleAddUser}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                {/* Left Column */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <label htmlFor="username">Username *</label>
                                                        <input id="username" type="text" name="username" className="form-input bg-blue-50 dark:bg-gray-800" required value={formData.username} onChange={handleInputChange} />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="email">Email *</label>
                                                        <input id="email" type="email" name="email" className="form-input" placeholder="Enter email address" required value={formData.email} onChange={handleInputChange} />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="first_name">First Name</label>
                                                        <input id="first_name" type="text" name="first_name" className="form-input" placeholder="Enter first name" value={formData.first_name} onChange={handleInputChange} />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="last_name">Last Name</label>
                                                        <input id="last_name" type="text" name="last_name" className="form-input" placeholder="Enter last name" value={formData.last_name} onChange={handleInputChange} />
                                                    </div>
                                                </div>

                                                {/* Right Column */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <label htmlFor="role">Role *</label>
                                                        <select id="role" name="role" className="form-select" required value={formData.role} onChange={handleInputChange}>
                                                            <option value="employee">Employee</option>
                                                            <option value="admin">Admin</option>
                                                            <option value="master">Master</option>
                                                        </select>
                                                    </div>

                                                    {formData.role !== 'master' && (
                                                        <div>
                                                            <label htmlFor="company">Company *</label>
                                                            <select id="company" name="company" className="form-select" required value={formData.company} onChange={handleInputChange}>
                                                                <option value="">Select a company</option>
                                                                {companies.map((comp) => (
                                                                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label htmlFor="password">Password *</label>
                                                        <input id="password" type="password" name="password" className="form-input bg-blue-50 dark:bg-gray-800" placeholder="••••••••" required value={formData.password} onChange={handleInputChange} />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="confirmPassword">Confirm Password *</label>
                                                        <input id="confirmPassword" type="password" name="confirmPassword" className="form-input" placeholder="Confirm password" required value={formData.confirmPassword} onChange={handleInputChange} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 flex items-center">
                                                <label className="flex items-center cursor-pointer mb-0">
                                                    <input type="checkbox" name="is_active" className="form-checkbox bg-white dark:bg-black" checked={formData.is_active} onChange={handleInputChange} />
                                                    <span className="text-white-dark ml-2">User is active</span>
                                                </label>
                                            </div>

                                            <div className="flex justify-end items-center mt-8 space-x-3">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary">Save Info</button>
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

export default MasterUserManagement;
