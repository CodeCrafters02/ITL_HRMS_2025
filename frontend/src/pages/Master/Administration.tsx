import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';
import IconEdit from '../../components/Icon/IconEdit';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/admin-register/`;

const MasterAdministration = () => {
    const dispatch = useDispatch();
    const [admins, setAdmins] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

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
        password: '',
        confirmPassword: '',
    });

    useEffect(() => {
        dispatch(setPageTitle('Administration Management'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchAdmins();
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [search, page, pageSize]);

    const fetchAdmins = async () => {
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
                    setAdmins(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.ceil(data.count / pageSize));
                } else {
                    setAdmins(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching administrators:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSaveAdmin = async (e: any) => {
        e.preventDefault();

        // Only enforce password matching on create. On edit, if empty, it usually means don't update.
        // Wait, password is required in the serializer. If edit mode, we might not always pass a password, but if we do, they must match.
        if (formData.password || !editMode) {
            if (formData.password !== formData.confirmPassword) {
                Swal.fire({ title: 'Error!', text: 'Passwords do not match.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
                return;
            }
        }

        try {
            const token = localStorage.getItem('access_token');
            const headers: any = {
                'Content-Type': 'application/json'
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const payload: any = { ...formData };
            if (editMode && !payload.password) {
                delete payload.password;
                delete payload.confirmPassword;
            }

            const method = editMode ? 'PATCH' : 'POST';
            const endpoint = editMode ? `${API_URL}${editId}/` : API_URL;

            const response = await fetch(endpoint, {
                method,
                headers,
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({ title: editMode ? 'Updated!' : 'Added!', text: `Administrator ${editMode ? 'updated' : 'added'} successfully.`, icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setIsAddModalOpen(false);
                fetchAdmins();
                resetForm();
            } else {
                const err = await response.json();
                Swal.fire({ title: 'Error!', text: JSON.stringify(err), icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch (error) {
            Swal.fire({ title: 'Error!', text: `Failed to ${editMode ? 'update' : 'add'} Administrator.`, icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const handleEdit = (admin: any) => {
        setFormData({
            username: admin.username || '',
            email: admin.email || '',
            first_name: admin.first_name || '',
            last_name: admin.last_name || '',
            password: '',
            confirmPassword: '',
        });
        setEditId(admin.id);
        setEditMode(true);
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            email: '',
            first_name: '',
            last_name: '',
            password: '',
            confirmPassword: '',
        });
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#4c1d95] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Administration Management</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Control platform access and configure top-level administrator privileges.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-4 mb-5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        className="form-input w-full sm:w-64"
                        placeholder="Search by username, email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                    <button
                        type="button"
                        className="btn btn-primary gap-2"
                        onClick={() => {
                            resetForm();
                            setEditMode(false);
                            setEditId(null);
                            setIsAddModalOpen(true);
                        }}
                    >
                        <IconPlus /> Add Administrator
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
                                <th>First Name</th>
                                <th>Last Name</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-5">Loading...</td>
                                </tr>
                            ) : admins.length > 0 ? (
                                admins.map((admin) => (
                                    <tr key={admin.id}>
                                        <td>{admin.id}</td>
                                        <td className="font-semibold">{admin.username}</td>
                                        <td>{admin.email}</td>
                                        <td>{admin.first_name || '-'}</td>
                                        <td>{admin.last_name || '-'}</td>
                                        <td className="text-center">
                                            <button type="button" className="text-primary hover:text-blue-700 mx-auto" onClick={() => handleEdit(admin)}>
                                                <IconEdit className="w-5 h-5 mx-auto" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="text-center py-5">No administrators found.</td>
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

            {/* Add Administrator Modal */}
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
                                        {editMode ? 'Edit Administrator' : 'Add New Administrator'}
                                    </div>
                                    <div className="p-5">
                                        <form onSubmit={handleSaveAdmin}>
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
                                                </div>

                                                {/* Right Column */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <label htmlFor="last_name">Last Name</label>
                                                        <input id="last_name" type="text" name="last_name" className="form-input" value={formData.last_name} onChange={handleInputChange} />
                                                    </div>
                                                    {!editMode && (
                                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                                                            <div>
                                                                <label htmlFor="password">Password *</label>
                                                                <input id="password" type="password" name="password" className="form-input bg-blue-50 dark:bg-gray-800" placeholder="********" autoComplete="new-password" required value={formData.password} onChange={handleInputChange} />
                                                            </div>
                                                            <div>
                                                                <label htmlFor="confirmPassword">Confirm Password *</label>
                                                                <input id="confirmPassword" type="password" name="confirmPassword" className="form-input bg-blue-50 dark:bg-gray-800" placeholder="********" autoComplete="new-password" required value={formData.confirmPassword} onChange={handleInputChange} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-end items-center mt-8 space-x-3 border-t border-[#e0e6ed] dark:border-[#1b2e4b] pt-5">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary">{editMode ? 'Update Administrator' : 'Add Administrator'}</button>
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

export default MasterAdministration;
