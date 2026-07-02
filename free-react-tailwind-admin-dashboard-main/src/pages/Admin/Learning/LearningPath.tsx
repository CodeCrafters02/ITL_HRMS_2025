import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconEye from '../../../components/Icon/IconEye';
import IconX from '../../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const PATHS_API = `${API_BASE_URL}/employee/learning-paths/`;
const PATH_COURSES_API = `${API_BASE_URL}/employee/learning-path-courses/`;
const COURSES_API = `${API_BASE_URL}/employee/courses/`;

export type LearningPathCourseType = {
    id: number;
    learning_path: number;
    course: number;
    course_title?: string;
    course_difficulty?: string;
    course_duration?: number;
    sequence: number;
    is_mandatory: boolean;
};

export type LearningPathType = {
    id: number;
    title: string;
    description: string;
    created_by?: number | null;
    created_by_name?: string | null;
    created_at?: string;
    courses_count?: number;
    assignments_count?: number;
    path_courses?: LearningPathCourseType[];
};

type AvailableCourseOption = {
    id: number;
    title: string;
    difficulty_level: string;
    duration_hours: number;
};

const LearningPath = () => {
    const dispatch = useDispatch();
    const [paths, setPaths] = useState<LearningPathType[]>([]);
    const [coursesList, setCoursesList] = useState<AvailableCourseOption[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    // Path Modal
    const [pathModalOpen, setPathModalOpen] = useState(false);
    const [editingPath, setEditingPath] = useState<LearningPathType | null>(null);
    const [pathForm, setPathForm] = useState({
        title: '',
        description: '',
    });

    // Course Mapper State
    const [mapperModalOpen, setMapperModalOpen] = useState(false);
    const [selectedPath, setSelectedPath] = useState<LearningPathType | null>(null);
    const [mappedCourses, setMappedCourses] = useState<LearningPathCourseType[]>([]);
    const [mappingLoading, setMappingLoading] = useState(false);

    const [addMappingOpen, setAddMappingOpen] = useState(false);
    const [mappingForm, setMappingForm] = useState({
        course: '',
        sequence: 1,
        is_mandatory: true,
    });

    useEffect(() => {
        dispatch(setPageTitle('Learning Paths'));
        fetchPaths();
        fetchCoursesList();
    }, [dispatch]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchPaths = async () => {
        setLoading(true);
        try {
            const response = await authFetch(PATHS_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setPaths(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching learning paths:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCoursesList = async () => {
        try {
            const response = await authFetch(COURSES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCoursesList(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching courses list:', error);
        }
    };

    const fetchMappedCourses = async (pathId: number) => {
        setMappingLoading(true);
        try {
            const response = await authFetch(`${PATH_COURSES_API}?learning_path_id=${pathId}`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setMappedCourses(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching mapped courses:', error);
        } finally {
            setMappingLoading(false);
        }
    };

    const filteredPaths = useMemo(() => {
        return paths.filter((p) => {
            return (
                p.title.toLowerCase().includes(search.toLowerCase()) ||
                p.description.toLowerCase().includes(search.toLowerCase())
            );
        });
    }, [paths, search]);

    const resetPathForm = () => {
        setPathForm({ title: '', description: '' });
        setEditingPath(null);
    };

    const openCreateModal = () => {
        resetPathForm();
        setPathModalOpen(true);
    };

    const openEditModal = (path: LearningPathType) => {
        setEditingPath(path);
        setPathForm({
            title: path.title,
            description: path.description || '',
        });
        setPathModalOpen(true);
    };

    const handleSavePath = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingPath ? `${PATHS_API}${editingPath.id}/` : PATHS_API;
            const method = editingPath ? 'PUT' : 'POST';

            const response = await authFetch(url, {
                method: method,
                headers: getHeaders(),
                body: JSON.stringify(pathForm),
            });

            if (response.ok) {
                Swal.fire({
                    title: editingPath ? 'Updated!' : 'Created!',
                    text: editingPath ? 'Learning path updated.' : 'Learning path created.',
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setPathModalOpen(false);
                resetPathForm();
                fetchPaths();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({
                    title: 'Error!',
                    text: err ? Object.values(err).flat().join(' ') : 'Failed to save path.',
                    icon: 'error',
                    customClass: { popup: 'sweet-alerts' },
                });
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePath = async (path: LearningPathType) => {
        const result = await Swal.fire({
            title: 'Delete Path?',
            text: `Are you sure you want to delete "${path.title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${PATHS_API}${path.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire('Deleted!', 'Learning path deleted.', 'success');
                fetchPaths();
            } else {
                Swal.fire('Error!', 'Could not delete path.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection error.', 'error');
        }
    };

    // Course mapping logic
    const openMapper = (path: LearningPathType) => {
        setSelectedPath(path);
        fetchMappedCourses(path.id);
        setMapperModalOpen(true);
    };

    const resetMappingForm = () => {
        setMappingForm({
            course: '',
            sequence: mappedCourses.length ? Math.max(...mappedCourses.map(c => c.sequence)) + 1 : 1,
            is_mandatory: true,
        });
    };

    const handleAddCourseMapping = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedPath) return;
        setSaving(true);

        const payload = {
            learning_path: selectedPath.id,
            course: Number(mappingForm.course),
            sequence: Number(mappingForm.sequence),
            is_mandatory: mappingForm.is_mandatory,
        };

        try {
            const response = await authFetch(PATH_COURSES_API, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Mapped!',
                    text: 'Course added to learning path.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                setAddMappingOpen(false);
                resetMappingForm();
                fetchMappedCourses(selectedPath.id);
                fetchPaths(); // Refresh path metrics
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire('Error!', err ? Object.values(err).flat().join(' ') : 'Failed to map course.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Failed to connect to backend.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCourseMapping = async (mapping: LearningPathCourseType) => {
        const result = await Swal.fire({
            title: 'Remove mapping?',
            text: `Remove "${mapping.course_title}" from this path?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Remove',
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${PATH_COURSES_API}${mapping.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                if (selectedPath) {
                    fetchMappedCourses(selectedPath.id);
                    fetchPaths();
                }
            } else {
                Swal.fire('Error!', 'Failed to remove mapping.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server issue.', 'error');
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
                            placeholder="Search learning paths..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openCreateModal}>
                    <IconPlus /> Create Path
                </button>
            </div>

            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading learning paths...</span>
                </div>
            ) : filteredPaths.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500">No learning paths found.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPaths.map((path) => (
                        <div
                            key={path.id}
                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600"></div>

                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white-light group-hover:text-primary transition-colors">
                                        {path.title}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="text-primary hover:text-primary-dark p-1 rounded hover:bg-primary/10 transition"
                                            onClick={() => openEditModal(path)}
                                        >
                                            <IconPencil className="w-4.5 h-4.5" />
                                        </button>
                                        <button
                                            type="button"
                                            className="text-danger hover:text-danger-dark p-1 rounded hover:bg-danger/10 transition"
                                            onClick={() => handleDeletePath(path)}
                                        >
                                            <IconTrashLines className="w-4.5 h-4.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 mb-6">
                                    {path.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 flex flex-col gap-2 mt-auto">
                                <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
                                    <span>Created By:</span>
                                    <span className="text-gray-700 dark:text-gray-300">{path.created_by_name || 'System'}</span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="badge badge-outline-primary rounded-full px-2.5 py-0.5 text-xs font-bold">
                                        {path.courses_count || 0} {path.courses_count === 1 ? 'Course' : 'Courses'}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm rounded-lg flex items-center gap-1.5 px-3 py-1 text-xs"
                                        onClick={() => openMapper(path)}
                                    >
                                        <IconEye className="w-3.5 h-3.5" /> Manage Syllabus
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Path Modal */}
            <Transition appear show={pathModalOpen} as={Fragment}>
                <Dialog as="div" open={pathModalOpen} onClose={() => setPathModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setPathModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        {editingPath ? 'Edit Learning Path' : 'Create Learning Path'}
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleSavePath} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block">Path Title <span className="text-danger">*</span></label>
                                                <input className="form-input rounded-lg" required placeholder="e.g. Developer Onboarding" value={pathForm.title} onChange={(e) => setPathForm({ ...pathForm, title: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="font-semibold mb-1 block">Description</label>
                                                <textarea className="form-textarea min-h-[100px] rounded-lg" placeholder="Detail the objectives of this learning path..." value={pathForm.description} onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })} />
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setPathModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5" disabled={saving}>
                                                    {saving ? 'Saving...' : editingPath ? 'Save Changes' : 'Create Path'}
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

            {/* Course Mapper Modal */}
            <Transition appear show={mapperModalOpen} as={Fragment}>
                <Dialog as="div" open={mapperModalOpen} onClose={() => setMapperModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-3xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setMapperModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Path Syllabus: {selectedPath?.title}
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-extrabold text-sm uppercase text-gray-400 tracking-wider">Mapped Courses</h4>
                                            <button type="button" className="btn btn-primary btn-sm gap-1" onClick={() => { resetMappingForm(); setAddMappingOpen(true); }}>
                                                <IconPlus className="w-3.5 h-3.5" /> Map Course
                                            </button>
                                        </div>

                                        {mappingLoading ? (
                                            <div className="py-10 text-center text-gray-400 animate-pulse">Loading syllabus...</div>
                                        ) : mappedCourses.length === 0 ? (
                                            <div className="py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                                                No courses mapped to this learning path yet.
                                            </div>
                                        ) : (
                                            <div className="table-responsive border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg">
                                                <table className="table-hover">
                                                    <thead>
                                                        <tr>
                                                            <th>Seq</th>
                                                            <th>Course Title</th>
                                                            <th>Difficulty</th>
                                                            <th>Duration</th>
                                                            <th>Mandatory</th>
                                                            <th className="text-center">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {mappedCourses.map((mc) => (
                                                            <tr key={mc.id}>
                                                                <td className="font-bold text-primary">{mc.sequence}</td>
                                                                <td className="font-semibold text-gray-800 dark:text-gray-205">{mc.course_title}</td>
                                                                <td>
                                                                    <span className="badge badge-outline-primary text-[10px] uppercase font-bold rounded">
                                                                        {mc.course_difficulty}
                                                                    </span>
                                                                </td>
                                                                <td>{mc.course_duration} hrs</td>
                                                                <td>
                                                                    <span className={`badge text-[10px] font-bold rounded ${mc.is_mandatory ? 'bg-danger text-white' : 'bg-gray-400 text-white'}`}>
                                                                        {mc.is_mandatory ? 'Yes' : 'No'}
                                                                    </span>
                                                                </td>
                                                                <td className="text-center">
                                                                    <button type="button" className="text-danger hover:text-danger-dark" onClick={() => handleDeleteCourseMapping(mc)}>
                                                                        <IconTrashLines className="w-4.5 h-4.5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                            <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setMapperModalOpen(false)}>Close Syllabus</button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Map Course Modal */}
            <Transition appear show={addMappingOpen} as={Fragment}>
                <Dialog as="div" open={addMappingOpen} onClose={() => setAddMappingOpen(false)} className="relative z-[60]">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setAddMappingOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Map Course to Path
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleAddCourseMapping} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block">Choose Course <span className="text-danger">*</span></label>
                                                <select className="form-select rounded-lg" required value={mappingForm.course} onChange={(e) => setMappingForm({ ...mappingForm, course: e.target.value })}>
                                                    <option value="">-- Select Course --</option>
                                                    {coursesList.map(c => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.title} ({c.difficulty_level} • {c.duration_hours}h)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Sequence Order</label>
                                                    <input type="number" className="form-input rounded-lg" min="1" value={mappingForm.sequence} onChange={(e) => setMappingForm({ ...mappingForm, sequence: Number(e.target.value) })} />
                                                </div>
                                                <div className="flex flex-col justify-end pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <input type="checkbox" id="is_mandatory" className="form-checkbox" checked={mappingForm.is_mandatory} onChange={(e) => setMappingForm({ ...mappingForm, is_mandatory: e.target.checked })} />
                                                        <label htmlFor="is_mandatory" className="font-semibold cursor-pointer select-none">
                                                            Is Mandatory
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setAddMappingOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5" disabled={saving}>
                                                    {saving ? 'Mapping...' : 'Map Course'}
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

export default LearningPath;
