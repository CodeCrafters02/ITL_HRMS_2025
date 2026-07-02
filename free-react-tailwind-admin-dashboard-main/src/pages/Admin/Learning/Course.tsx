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
import CourseCategory, { CourseCategoryType } from './CourseCategory';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const COURSES_API = `${API_BASE_URL}/employee/courses/`;
const CONTENTS_API = `${API_BASE_URL}/employee/course-contents/`;
const CATEGORIES_API = `${API_BASE_URL}/employee/course-categories/`;
const REVIEWS_API = `${API_BASE_URL}/employee/course-reviews/`;

type CourseContentType = {
    id: number;
    course: number;
    title: string;
    content_type: 'video' | 'pdf' | 'ppt' | 'audio' | 'scorm' | 'link';
    file?: string | null;
    file_url?: string | null;
    filename?: string | null;
    external_url?: string | null;
    duration_minutes: number;
    sequence: number;
};

type CourseType = {
    id: number;
    title: string;
    description: string;
    category?: number | null;
    category_name?: string | null;
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';
    duration_hours: number;
    language: string;
    thumbnail?: string | null;
    thumbnail_url?: string | null;
    is_compliance: boolean;
    compliance_due_days?: number | null;
    status: 'draft' | 'published' | 'archived';
    contents?: CourseContentType[];
    enrollments_count?: number;
};

const Course = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState<'courses' | 'categories'>('courses');
    const [courses, setCourses] = useState<CourseType[]>([]);
    const [categories, setCategories] = useState<CourseCategoryType[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters & Search
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Course Modals
    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<CourseType | null>(null);
    const [courseForm, setCourseForm] = useState({
        title: '',
        description: '',
        category: '',
        difficulty_level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
        duration_hours: 0,
        language: 'English',
        is_compliance: false,
        compliance_due_days: '' as string | number,
        status: 'draft' as 'draft' | 'published' | 'archived',
    });
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

    // Content Manager Modals / State
    const [contentModalOpen, setContentModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<CourseType | null>(null);
    const [courseContents, setCourseContents] = useState<CourseContentType[]>([]);
    const [contentsLoading, setContentsLoading] = useState(false);
    
    const [addContentOpen, setAddContentOpen] = useState(false);
    const [contentForm, setContentForm] = useState({
        title: '',
        content_type: 'video' as 'video' | 'pdf' | 'ppt' | 'audio' | 'scorm' | 'link',
        external_url: '',
        duration_minutes: 0,
        sequence: 1,
    });
    const [contentFile, setContentFile] = useState<File | null>(null);

    // Reviews State
    const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
    const [selectedCourseForReviews, setSelectedCourseForReviews] = useState<CourseType | null>(null);
    const [reviewsList, setReviewsList] = useState<any[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    const openReviewsPanel = async (course: CourseType) => {
        setSelectedCourseForReviews(course);
        setReviewsModalOpen(true);
        setReviewsLoading(true);
        try {
            const response = await authFetch(`${REVIEWS_API}?course_id=${course.id}`, {
                headers: getHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setReviewsList(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching course reviews:', error);
        } finally {
            setReviewsLoading(false);
        }
    };

    useEffect(() => {
        dispatch(setPageTitle('Courses Catalog'));
        fetchCourses();
        fetchCategories();
    }, [dispatch]);

    const getHeaders = (multipart = false) => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (!multipart) {
            headers['Content-Type'] = 'application/json';
        }
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const response = await authFetch(COURSES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCourses(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await authFetch(CATEGORIES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCategories(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchCourseContents = async (courseId: number) => {
        setContentsLoading(true);
        try {
            const response = await authFetch(`${CONTENTS_API}?course_id=${courseId}`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCourseContents(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching course contents:', error);
        } finally {
            setContentsLoading(false);
        }
    };

    const filteredCourses = useMemo(() => {
        return courses.filter((c) => {
            const matchesSearch =
                c.title.toLowerCase().includes(search.toLowerCase()) ||
                c.description.toLowerCase().includes(search.toLowerCase());

            const matchesCategory = filterCategory === 'all' || String(c.category) === filterCategory;
            const matchesDifficulty = filterDifficulty === 'all' || c.difficulty_level === filterDifficulty;
            const matchesStatus = filterStatus === 'all' || c.status === filterStatus;

            return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus;
        });
    }, [courses, search, filterCategory, filterDifficulty, filterStatus]);

    // Statistics Rollup
    const stats = useMemo(() => {
        return {
            total: courses.length,
            published: courses.filter((c) => c.status === 'published').length,
            draft: courses.filter((c) => c.status === 'draft').length,
            compliance: courses.filter((c) => c.is_compliance).length,
        };
    }, [courses]);

    const resetCourseForm = () => {
        setCourseForm({
            title: '',
            description: '',
            category: '',
            difficulty_level: 'beginner',
            duration_hours: 0,
            language: 'English',
            is_compliance: false,
            compliance_due_days: '',
            status: 'draft',
        });
        setThumbnailFile(null);
        setEditingCourse(null);
    };

    const openCreateCourseModal = () => {
        resetCourseForm();
        setCourseModalOpen(true);
    };

    const openEditCourseModal = (course: CourseType) => {
        setEditingCourse(course);
        setCourseForm({
            title: course.title,
            description: course.description || '',
            category: course.category ? String(course.category) : '',
            difficulty_level: course.difficulty_level,
            duration_hours: Number(course.duration_hours),
            language: course.language || 'English',
            is_compliance: course.is_compliance,
            compliance_due_days: course.compliance_due_days || '',
            status: course.status,
        });
        setThumbnailFile(null);
        setCourseModalOpen(true);
    };

    const handleSaveCourse = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();
        formData.append('title', courseForm.title);
        formData.append('description', courseForm.description);
        formData.append('difficulty_level', courseForm.difficulty_level);
        formData.append('duration_hours', String(courseForm.duration_hours));
        formData.append('language', courseForm.language);
        formData.append('is_compliance', String(courseForm.is_compliance));
        formData.append('status', courseForm.status);

        if (courseForm.category) formData.append('category', courseForm.category);
        if (courseForm.is_compliance && courseForm.compliance_due_days) {
            formData.append('compliance_due_days', String(courseForm.compliance_due_days));
        }
        if (thumbnailFile) {
            formData.append('thumbnail', thumbnailFile);
        }

        try {
            const url = editingCourse ? `${COURSES_API}${editingCourse.id}/` : COURSES_API;
            const method = editingCourse ? 'PATCH' : 'POST';

            const response = await authFetch(url, {
                method: method,
                headers: getHeaders(true),
                body: formData,
            });

            if (response.ok) {
                Swal.fire({
                    title: editingCourse ? 'Updated!' : 'Created!',
                    text: editingCourse ? 'Course updated successfully.' : 'Course created successfully.',
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setCourseModalOpen(false);
                resetCourseForm();
                fetchCourses();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({
                    title: 'Error!',
                    text: err ? Object.values(err).flat().join(' ') : 'Failed to save course.',
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
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCourse = async (course: CourseType) => {
        const result = await Swal.fire({
            title: 'Delete Course?',
            text: `Delete "${course.title}"? All course materials will be removed too.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${COURSES_API}${course.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire('Deleted!', 'Course has been deleted.', 'success');
                fetchCourses();
            } else {
                Swal.fire('Error!', 'Failed to delete course.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        }
    };

    // Course Content operations
    const openManageContent = (course: CourseType) => {
        setSelectedCourse(course);
        fetchCourseContents(course.id);
        setContentModalOpen(true);
    };

    const resetContentForm = () => {
        setContentForm({
            title: '',
            content_type: 'video',
            external_url: '',
            duration_minutes: 0,
            sequence: (courseContents.length ? Math.max(...courseContents.map(c => c.sequence)) + 1 : 1),
        });
        setContentFile(null);
    };

    const handleAddContent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCourse) return;
        setSaving(true);

        const formData = new FormData();
        formData.append('course', String(selectedCourse.id));
        formData.append('title', contentForm.title);
        formData.append('content_type', contentForm.content_type);
        formData.append('duration_minutes', String(contentForm.duration_minutes));
        formData.append('sequence', String(contentForm.sequence));

        if (contentForm.content_type === 'link' && contentForm.external_url) {
            formData.append('external_url', contentForm.external_url);
        } else if (contentFile) {
            formData.append('file', contentFile);
        }

        try {
            const response = await authFetch(CONTENTS_API, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Added!',
                    text: 'Material uploaded successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    customClass: { popup: 'sweet-alerts' },
                });
                setAddContentOpen(false);
                resetContentForm();
                fetchCourseContents(selectedCourse.id);
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire('Error!', err ? Object.values(err).flat().join(' ') : 'Failed to upload content.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection error.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteContent = async (content: CourseContentType) => {
        const result = await Swal.fire({
            title: 'Remove content?',
            text: `Are you sure you want to delete "${content.title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${CONTENTS_API}${content.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                if (selectedCourse) fetchCourseContents(selectedCourse.id);
            } else {
                Swal.fire('Error!', 'Failed to delete content.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server issue.', 'error');
        }
    };

    return (
        <div>
            {/* Header / Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Courses Catalog</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        Manage training programs, compile lesson directories, and configure compliance parameters.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Tabbed Navigation */}
            <div className="flex border-b border-[#ebedf2] dark:border-[#1b2e4b] mb-6 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('courses')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${
                        activeTab === 'courses'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-primary'
                    }`}
                >
                    Courses
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('categories')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${
                        activeTab === 'categories'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-primary'
                    }`}
                >
                    Course Categories
                </button>
            </div>

            {activeTab === 'categories' ? (
                <CourseCategory />
            ) : (
            <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="panel bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20 p-4 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total Courses</span>
                    <span className="text-3xl font-black text-blue-800 dark:text-white-light mt-1">{stats.total}</span>
                </div>
                <div className="panel bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 p-4 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Published</span>
                    <span className="text-3xl font-black text-emerald-800 dark:text-white-light mt-1">{stats.published}</span>
                </div>
                <div className="panel bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 p-4 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Drafts</span>
                    <span className="text-3xl font-black text-amber-800 dark:text-white-light mt-1">{stats.draft}</span>
                </div>
                <div className="panel bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-4 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Compliance</span>
                    <span className="text-3xl font-black text-purple-800 dark:text-white-light mt-1">{stats.compliance}</span>
                </div>
            </div>

            {/* Filters panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-72"
                            placeholder="Search courses..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <select
                        className="form-select w-44"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <select
                        className="form-select w-40"
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                    >
                        <option value="all">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                    <select
                        className="form-select w-40"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openCreateCourseModal}>
                    <IconPlus /> Add Course
                </button>
            </div>

            {/* Course Cards Grid */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading courses catalog...</span>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500">No courses registered yet.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                        <div
                            key={course.id}
                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden flex flex-col justify-between"
                        >
                            {/* Course Thumbnail */}
                            <div className="relative h-44 bg-gray-150 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
                                {course.thumbnail_url ? (
                                    <img
                                        src={course.thumbnail_url}
                                        alt={course.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-tr from-primary/10 to-purple-500/10 flex flex-col items-center justify-center p-4 text-center">
                                        <span className="font-extrabold text-primary text-xl uppercase tracking-wide">
                                            {course.title.slice(0, 15)}...
                                        </span>
                                        <span className="text-xs text-gray-400 font-semibold mt-1">No Image Attachment</span>
                                    </div>
                                )}
                                
                                {/* Difficulty and Status tags overlay */}
                                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                                    <span className={`badge capitalize text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        course.difficulty_level === 'advanced'
                                            ? 'badge-outline-danger'
                                            : course.difficulty_level === 'intermediate'
                                            ? 'badge-outline-warning'
                                            : 'badge-outline-success'
                                    }`}>
                                        {course.difficulty_level}
                                    </span>
                                    {course.is_compliance && (
                                        <span className="badge badge-outline-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            Compliance
                                        </span>
                                    )}
                                </div>

                                <div className="absolute top-3 right-3 z-10">
                                    <span className={`badge text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                        course.status === 'published'
                                            ? 'bg-success text-white'
                                            : course.status === 'archived'
                                            ? 'bg-gray-500 text-white'
                                            : 'bg-amber-500 text-white'
                                    }`}>
                                        {course.status}
                                    </span>
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">
                                        {course.category_name || 'General Category'}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white-light mb-2 line-clamp-1">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                                        {course.description || 'No course syllabus overview.'}
                                    </p>
                                </div>

                                <div className="space-y-2 border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 mt-auto">
                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-semibold">Duration & Language:</span>
                                        <span>
                                            {course.duration_hours} hrs • {course.language}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pb-2">
                                        <span className="font-semibold">Total Students:</span>
                                        <span className="badge badge-outline-primary py-0.5 px-2 rounded-full font-bold">
                                            {course.enrollments_count || 0} enrolled
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 mt-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm flex-1 flex items-center justify-center gap-1 rounded-lg"
                                        onClick={() => openManageContent(course)}
                                    >
                                        <IconEye className="w-4 h-4" /> Curriculum
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-warning btn-sm flex-1 flex items-center justify-center gap-1 rounded-lg"
                                        onClick={() => openReviewsPanel(course)}
                                    >
                                        ★ Reviews
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm p-2 rounded-lg"
                                        onClick={() => openEditCourseModal(course)}
                                    >
                                        <IconPencil className="w-4.5 h-4.5" />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm p-2 rounded-lg"
                                        onClick={() => handleDeleteCourse(course)}
                                    >
                                        <IconTrashLines className="w-4.5 h-4.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </>
            )}

            {/* Course Modal (Create & Edit) */}
            <Transition appear show={courseModalOpen} as={Fragment}>
                <Dialog as="div" open={courseModalOpen} onClose={() => setCourseModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-2xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setCourseModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        {editingCourse ? 'Edit Course Details' : 'Register New Course'}
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleSaveCourse} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Course Title <span className="text-danger">*</span></label>
                                                    <input className="form-input rounded-lg" required placeholder="e.g. React Native Fundamentals" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Course Thumbnail</label>
                                                    <input type="file" accept="image/*" className="form-input rounded-lg text-xs" onChange={(e) => setThumbnailFile(e.target.files ? e.target.files[0] : null)} />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="font-semibold mb-1 block">Overview / Syllabus Description</label>
                                                <textarea className="form-textarea min-h-[100px] rounded-lg" placeholder="Enter course description and syllabus summary..." value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Category</label>
                                                    <select className="form-select rounded-lg" value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}>
                                                        <option value="">-- Choose Category --</option>
                                                        {categories.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Difficulty Level</label>
                                                    <select className="form-select rounded-lg" value={courseForm.difficulty_level} onChange={(e) => setCourseForm({ ...courseForm, difficulty_level: e.target.value as any })}>
                                                        <option value="beginner">Beginner</option>
                                                        <option value="intermediate">Intermediate</option>
                                                        <option value="advanced">Advanced</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Duration (Hours)</label>
                                                    <input type="number" step="0.1" className="form-input rounded-lg" min="0" value={courseForm.duration_hours} onChange={(e) => setCourseForm({ ...courseForm, duration_hours: Number(e.target.value) })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Language</label>
                                                    <input className="form-input rounded-lg" value={courseForm.language} onChange={(e) => setCourseForm({ ...courseForm, language: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Status</label>
                                                    <select className="form-select rounded-lg" value={courseForm.status} onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value as any })}>
                                                        <option value="draft">Draft</option>
                                                        <option value="published">Published</option>
                                                        <option value="archived">Archived</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="panel bg-[#fbfbfb] dark:bg-[#0e1726]/40 p-4 border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" id="is_compliance" className="form-checkbox" checked={courseForm.is_compliance} onChange={(e) => setCourseForm({ ...courseForm, is_compliance: e.target.checked })} />
                                                    <label htmlFor="is_compliance" className="font-semibold cursor-pointer select-none">
                                                        Mark as Compliance / Mandatory Training
                                                    </label>
                                                </div>
                                                {courseForm.is_compliance && (
                                                    <div className="mt-3 animate-fade-in">
                                                        <label className="font-semibold mb-1 block text-xs">Compliance Due Days (after assignment)</label>
                                                        <input type="number" className="form-input rounded-lg py-1.5" min="1" placeholder="e.g. 30 days" value={courseForm.compliance_due_days} onChange={(e) => setCourseForm({ ...courseForm, compliance_due_days: e.target.value })} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setCourseModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5 shadow-md" disabled={saving}>
                                                    {saving ? 'Saving...' : editingCourse ? 'Save Changes' : 'Register Course'}
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

            {/* Course Content Manager Modal */}
            <Transition appear show={contentModalOpen} as={Fragment}>
                <Dialog as="div" open={contentModalOpen} onClose={() => setContentModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-3xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setContentModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Curriculum: {selectedCourse?.title}
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-extrabold text-sm uppercase text-gray-400 tracking-wider">Lesson Materials</h4>
                                            <button type="button" className="btn btn-primary btn-sm gap-1" onClick={() => { resetContentForm(); setAddContentOpen(true); }}>
                                                <IconPlus className="w-3.5 h-3.5" /> Upload Material
                                            </button>
                                        </div>

                                        {contentsLoading ? (
                                            <div className="py-10 text-center text-gray-400 animate-pulse">Loading materials...</div>
                                        ) : courseContents.length === 0 ? (
                                            <div className="py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                                                No course syllabus items uploaded yet.
                                            </div>
                                        ) : (
                                            <div className="table-responsive border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg">
                                                <table className="table-hover">
                                                    <thead>
                                                        <tr>
                                                            <th>Seq</th>
                                                            <th>Material Title</th>
                                                            <th>Type</th>
                                                            <th>Duration</th>
                                                            <th>Resource</th>
                                                            <th className="text-center">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {courseContents.map((content) => (
                                                            <tr key={content.id}>
                                                                <td className="font-bold text-primary">{content.sequence}</td>
                                                                <td className="font-semibold text-gray-800 dark:text-gray-200">{content.title}</td>
                                                                <td>
                                                                    <span className="badge badge-outline-primary text-[10px] font-bold uppercase rounded px-1.5 py-0.5">
                                                                        {content.content_type}
                                                                    </span>
                                                                </td>
                                                                <td>{content.duration_minutes} mins</td>
                                                                <td>
                                                                    {content.content_type === 'link' ? (
                                                                        <a href={content.external_url || ''} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs truncate max-w-[150px] block">
                                                                            {content.external_url}
                                                                        </a>
                                                                    ) : (
                                                                        <a href={content.file_url || ''} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs truncate max-w-[150px] block">
                                                                            {content.filename || 'Download'}
                                                                        </a>
                                                                    )}
                                                                </td>
                                                                <td className="text-center">
                                                                    <button type="button" className="text-danger hover:text-danger-dark" onClick={() => handleDeleteContent(content)}>
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
                                            <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setContentModalOpen(false)}>Close Manager</button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Upload Material Modal */}
            <Transition appear show={addContentOpen} as={Fragment}>
                <Dialog as="div" open={addContentOpen} onClose={() => setAddContentOpen(false)} className="relative z-[60]">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setAddContentOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Upload Lesson Material
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleAddContent} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block">Material Title <span className="text-danger">*</span></label>
                                                <input className="form-input rounded-lg" required placeholder="e.g. Introduction & Basic Syntax" value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Content Type</label>
                                                    <select className="form-select rounded-lg" value={contentForm.content_type} onChange={(e) => setContentForm({ ...contentForm, content_type: e.target.value as any })}>
                                                        <option value="video">Video Lecture</option>
                                                        <option value="pdf">PDF Document</option>
                                                        <option value="ppt">PowerPoint (PPT)</option>
                                                        <option value="audio">Audio Resource</option>
                                                        <option value="scorm">SCORM Package</option>
                                                        <option value="link">External URL Link</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Sequence Order</label>
                                                    <input type="number" className="form-input rounded-lg" min="1" value={contentForm.sequence} onChange={(e) => setContentForm({ ...contentForm, sequence: Number(e.target.value) })} />
                                                </div>
                                            </div>

                                            {contentForm.content_type === 'link' ? (
                                                <div>
                                                    <label className="font-semibold mb-1 block">External URL Link <span className="text-danger">*</span></label>
                                                    <input type="url" className="form-input rounded-lg" required placeholder="e.g. https://www.youtube.com/watch?..." value={contentForm.external_url} onChange={(e) => setContentForm({ ...contentForm, external_url: e.target.value })} />
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="font-semibold mb-1 block">Upload File <span className="text-danger">*</span></label>
                                                    <input type="file" className="form-input text-xs rounded-lg" required onChange={(e) => setContentFile(e.target.files ? e.target.files[0] : null)} />
                                                </div>
                                            )}

                                            <div>
                                                <label className="font-semibold mb-1 block">Est. Duration (Minutes)</label>
                                                <input type="number" className="form-input rounded-lg" min="0" value={contentForm.duration_minutes} onChange={(e) => setContentForm({ ...contentForm, duration_minutes: Number(e.target.value) })} />
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setAddContentOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5 shadow-md" disabled={saving}>
                                                    {saving ? 'Uploading...' : 'Upload Material'}
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
            {/* Reviews Dialog Modal */}
            <Transition appear show={reviewsModalOpen} as={Fragment}>
                <Dialog as="div" open={reviewsModalOpen} onClose={() => setReviewsModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-2xl text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setReviewsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        Feedback Reviews: {selectedCourseForReviews?.title}
                                    </div>
                                    <div className="p-6">
                                        {reviewsLoading ? (
                                            <div className="py-10 text-center text-gray-400 animate-pulse">Loading feedback reviews...</div>
                                        ) : reviewsList.length === 0 ? (
                                            <div className="py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                                                No feedback reviews submitted yet by employees.
                                            </div>
                                        ) : (
                                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                                <div className="bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-xl p-4 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-500">Average Rating:</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-extrabold text-amber-500">
                                                            {(reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)} ★
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">({reviewsList.length} reviews)</span>
                                                    </div>
                                                </div>

                                                {reviewsList.map((review) => (
                                                    <div key={review.id} className="p-4 border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl bg-white dark:bg-[#0e1726]/20 shadow-sm">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <h5 className="font-extrabold text-xs text-gray-800 dark:text-white-light">{review.employee_name}</h5>
                                                                <span className="text-[10px] text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="flex gap-0.5">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <span
                                                                        key={star}
                                                                        className={`text-sm ${
                                                                            review.rating >= star ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'
                                                                        }`}
                                                                    >
                                                                        ★
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-655 dark:text-gray-355 leading-relaxed italic mt-2">
                                                            "{review.review_text}"
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                            <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setReviewsModalOpen(false)}>Close Reviews</button>
                                        </div>
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

export default Course;
