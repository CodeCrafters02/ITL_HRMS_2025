import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconX from '../../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/employee/trainer-profiles/`;

export type TrainerType = {
    id: number;
    employee?: number | null;
    trainer_type: 'internal' | 'external';
    full_name: string;
    email: string;
    phone: string;
    specialization: string;
    bio: string;
    is_active: boolean;
    employee_name?: string | null;
    employee_email?: string | null;
    employee_phone?: string | null;
    employee_photo?: string | null;
};

type EmployeeOption = {
    id: number;
    full_name: string;
    designation_name?: string;
    department_name?: string;
};

const TrainerProfile = () => {
    const dispatch = useDispatch();
    const [trainers, setTrainers] = useState<TrainerType[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'internal' | 'external'>('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTrainer, setEditingTrainer] = useState<TrainerType | null>(null);

    const [formData, setFormData] = useState({
        employee: '' as string | number,
        trainer_type: 'internal' as 'internal' | 'external',
        full_name: '',
        email: '',
        phone: '',
        specialization: '',
        bio: '',
        is_active: true,
    });

    useEffect(() => {
        dispatch(setPageTitle('Trainer Profiles'));
        fetchTrainers();
        fetchEmployeeOptions();
    }, [dispatch]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchTrainers = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setTrainers(data.results);
                } else if (Array.isArray(data)) {
                    setTrainers(data);
                } else {
                    setTrainers([]);
                }
            }
        } catch (error) {
            console.error('Error fetching trainers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployeeOptions = async () => {
        try {
            const response = await fetch(`${API_URL}employee-options/`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setEmployeeOptions(data);
            }
        } catch (error) {
            console.error('Error fetching employee options:', error);
        }
    };

    const filteredTrainers = useMemo(() => {
        return trainers.filter((t) => {
            const name = t.trainer_type === 'internal' ? t.employee_name || t.full_name : t.full_name;
            const email = t.trainer_type === 'internal' ? t.employee_email || t.email : t.email;
            const matchesSearch =
                (name || '').toLowerCase().includes(search.toLowerCase()) ||
                (email || '').toLowerCase().includes(search.toLowerCase()) ||
                (t.specialization || '').toLowerCase().includes(search.toLowerCase());
            
            const matchesType = filterType === 'all' || t.trainer_type === filterType;

            return matchesSearch && matchesType;
        });
    }, [trainers, search, filterType]);

    const resetForm = () => {
        setFormData({
            employee: '',
            trainer_type: 'internal',
            full_name: '',
            email: '',
            phone: '',
            specialization: '',
            bio: '',
            is_active: true,
        });
        setEditingTrainer(null);
    };

    const openCreateModal = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEditModal = (t: TrainerType) => {
        setEditingTrainer(t);
        setFormData({
            employee: t.employee || '',
            trainer_type: t.trainer_type,
            full_name: t.full_name || '',
            email: t.email || '',
            phone: t.phone || '',
            specialization: t.specialization || '',
            bio: t.bio || '',
            is_active: t.is_active,
        });
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        const payload: Record<string, any> = {
            trainer_type: formData.trainer_type,
            specialization: formData.specialization,
            bio: formData.bio,
            is_active: formData.is_active,
        };

        if (formData.trainer_type === 'internal') {
            if (!formData.employee) {
                Swal.fire('Error', 'Please select an employee for internal trainer.', 'error');
                setSaving(false);
                return;
            }
            payload.employee = Number(formData.employee);
            payload.full_name = '';
            payload.email = '';
            payload.phone = '';
        } else {
            payload.employee = null;
            payload.full_name = formData.full_name;
            payload.email = formData.email;
            payload.phone = formData.phone;
        }

        try {
            const url = editingTrainer ? `${API_URL}${editingTrainer.id}/` : API_URL;
            const method = editingTrainer ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: editingTrainer ? 'Updated!' : 'Created!',
                    text: editingTrainer ? 'Trainer updated successfully.' : 'Trainer registered successfully.',
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setModalOpen(false);
                resetForm();
                fetchTrainers();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({
                    title: 'Error!',
                    text: err ? Object.values(err).flat().join(' ') : 'Failed to save trainer.',
                    icon: 'error',
                    customClass: { popup: 'sweet-alerts' },
                });
            }
        } catch {
            Swal.fire({
                title: 'Error!',
                text: 'Failed to connect to server.',
                icon: 'error',
                customClass: { popup: 'sweet-alerts' },
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (t: TrainerType) => {
        const name = t.trainer_type === 'internal' ? t.employee_name : t.full_name;
        const result = await Swal.fire({
            title: 'Delete Trainer?',
            text: `Are you sure you want to delete "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`${API_URL}${t.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Trainer profile deleted.',
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                fetchTrainers();
            } else {
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete trainer.',
                    icon: 'error',
                    customClass: { popup: 'sweet-alerts' },
                });
            }
        } catch {
            Swal.fire({
                title: 'Error!',
                text: 'Server connection failed.',
                icon: 'error',
                customClass: { popup: 'sweet-alerts' },
            });
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-72"
                            placeholder="Search trainers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <select
                        className="form-select w-44"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                    >
                        <option value="all">All Trainers</option>
                        <option value="internal">Internal Only</option>
                        <option value="external">External Only</option>
                    </select>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openCreateModal}>
                    <IconPlus /> Add Trainer
                </button>
            </div>

            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading trainer profiles...</span>
                </div>
            ) : filteredTrainers.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500">No trainers found.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTrainers.map((t) => {
                        const name = t.trainer_type === 'internal' ? t.employee_name || t.full_name : t.full_name;
                        const email = t.trainer_type === 'internal' ? t.employee_email || t.email : t.email;
                        const phone = t.trainer_type === 'internal' ? t.employee_phone || t.phone : t.phone;
                        const photo = t.trainer_type === 'internal' ? t.employee_photo : null;

                        return (
                            <div
                                key={t.id}
                                className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            {photo ? (
                                                <img
                                                    src={photo}
                                                    alt={name}
                                                    className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase ring-2 ring-primary/10">
                                                    {(name || 'T')
                                                        .split(' ')
                                                        .map((n) => n[0])
                                                        .slice(0, 2)
                                                        .join('')}
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-800 dark:text-white-light">
                                                    {name}
                                                </h4>
                                                <span
                                                    className={`badge mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                        t.trainer_type === 'internal'
                                                            ? 'badge-outline-info'
                                                            : 'badge-outline-warning'
                                                    }`}
                                                >
                                                    {t.trainer_type === 'internal' ? 'Internal' : 'External'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                className="text-primary hover:text-primary-dark p-1 rounded hover:bg-primary/10 transition"
                                                onClick={() => openEditModal(t)}
                                            >
                                                <IconPencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className="text-danger hover:text-danger-dark p-1 rounded hover:bg-danger/10 transition"
                                                onClick={() => handleDelete(t)}
                                            >
                                                <IconTrashLines className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-2">
                                        {t.specialization && (
                                            <div>
                                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
                                                    Specialization
                                                </span>
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    {t.specialization}
                                                </p>
                                            </div>
                                        )}
                                        {t.bio && (
                                            <div>
                                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
                                                    Biography
                                                </span>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                                                    {t.bio}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    {email && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-400">Email:</span>
                                            <a href={`mailto:${email}`} className="text-primary hover:underline truncate">
                                                {email}
                                            </a>
                                        </div>
                                    )}
                                    {phone && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-400">Phone:</span>
                                            <span>{phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="font-semibold text-gray-400">Status:</span>
                                        <span
                                            className={`font-extrabold ${
                                                t.is_active ? 'text-success' : 'text-danger'
                                            }`}
                                        >
                                            {t.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Form Modal */}
            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
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
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl relative">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none"
                                    >
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        {editingTrainer ? 'Edit Trainer Profile' : 'Add Trainer Profile'}
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleSave} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block">Trainer Type</label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="trainer_type"
                                                            className="form-radio"
                                                            checked={formData.trainer_type === 'internal'}
                                                            onChange={() =>
                                                                setFormData({ ...formData, trainer_type: 'internal' })
                                                            }
                                                        />
                                                        Internal Employee
                                                    </label>
                                                    <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="trainer_type"
                                                            className="form-radio"
                                                            checked={formData.trainer_type === 'external'}
                                                            onChange={() =>
                                                                setFormData({ ...formData, trainer_type: 'external' })
                                                            }
                                                        />
                                                        External Contractor
                                                    </label>
                                                </div>
                                            </div>

                                            {formData.trainer_type === 'internal' ? (
                                                <div>
                                                    <label className="font-semibold mb-1 block">
                                                        Select Employee <span className="text-danger">*</span>
                                                    </label>
                                                    <select
                                                        className="form-select rounded-lg"
                                                        required
                                                        value={formData.employee}
                                                        onChange={(e) =>
                                                            setFormData({ ...formData, employee: e.target.value })
                                                        }
                                                    >
                                                        <option value="">-- Choose Employee --</option>
                                                        {employeeOptions.map((emp) => (
                                                            <option key={emp.id} value={emp.id}>
                                                                {emp.full_name} ({emp.designation_name || 'No Designation'} - {emp.department_name || 'No Department'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <label className="font-semibold mb-1 block">
                                                            Full Name <span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            className="form-input rounded-lg"
                                                            required
                                                            placeholder="e.g. John Doe"
                                                            value={formData.full_name}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, full_name: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="font-semibold mb-1 block">
                                                                Email Address <span className="text-danger">*</span>
                                                            </label>
                                                            <input
                                                                type="email"
                                                                className="form-input rounded-lg"
                                                                required
                                                                placeholder="john.doe@example.com"
                                                                value={formData.email}
                                                                onChange={(e) =>
                                                                    setFormData({ ...formData, email: e.target.value })
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="font-semibold mb-1 block">
                                                                Phone Number
                                                            </label>
                                                            <input
                                                                className="form-input rounded-lg"
                                                                placeholder="+1 555-0199"
                                                                value={formData.phone}
                                                                onChange={(e) =>
                                                                    setFormData({ ...formData, phone: e.target.value })
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            <div>
                                                <label className="font-semibold mb-1 block">
                                                    Specialization <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    className="form-input rounded-lg"
                                                    required
                                                    placeholder="e.g. React, Cyber Security, Leadership"
                                                    value={formData.specialization}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, specialization: e.target.value })
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <label className="font-semibold mb-1 block">Biography / Notes</label>
                                                <textarea
                                                    className="form-textarea min-h-[80px] rounded-lg"
                                                    placeholder="Short background summary of the trainer..."
                                                    value={formData.bio}
                                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="is_active"
                                                    className="form-checkbox"
                                                    checked={formData.is_active}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, is_active: e.target.checked })
                                                    }
                                                />
                                                <label htmlFor="is_active" className="font-semibold cursor-pointer select-none">
                                                    Mark as Active Profile
                                                </label>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-lg"
                                                    onClick={() => setModalOpen(false)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary rounded-lg px-5 shadow-md"
                                                    disabled={saving}
                                                >
                                                    {saving ? 'Saving...' : editingTrainer ? 'Save Profile' : 'Add Trainer'}
                                                </button>
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

export default TrainerProfile;
