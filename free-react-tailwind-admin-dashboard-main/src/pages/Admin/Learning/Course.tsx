import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconPlus from '../../../components/Icon/IconPlus';
import IconSearch from '../../../components/Icon/IconSearch';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconEye from '../../../components/Icon/IconEye';
import IconX from '../../../components/Icon/IconX';
import IconOpenBook from '../../../components/Icon/IconOpenBook';
import PageHeader from '../../../components/Common/PageHeader';
import CourseCategory, { CourseCategoryType } from './CourseCategory';
import CertificateSignature from './CertificateSignature';
import SearchableSelect from '../../Elements/SearchableSelect';

import Modal from '../../../components/Common/Modal';
import StatCard, { StatGrid } from '../../../components/Common/StatCard';
import IconBook from '../../../components/Icon/IconBook';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import IconNotesEdit from '../../../components/Icon/IconNotesEdit';
import IconAward from '../../../components/Icon/IconAward';
import Button from '../../../components/Common/Button';
import CardGrid from '../../../components/Common/CardGrid';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const COURSES_API = `${API_BASE_URL}/employee/courses/`;
const CONTENTS_API = `${API_BASE_URL}/employee/course-contents/`;
const CATEGORIES_API = `${API_BASE_URL}/employee/course-categories/`;
const REVIEWS_API = `${API_BASE_URL}/employee/course-reviews/`;
const ASSESSMENTS_API = `${API_BASE_URL}/employee/assessments/`;
const QUESTIONS_API = `${API_BASE_URL}/employee/assessment-questions/`;
const ENROLLMENTS_API = `${API_BASE_URL}/employee/enrollments/`;

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

type AssessmentType = {
    id: number;
    course: number;
    title: string;
    assessment_type: string;
    pass_marks: number;
    time_limit_minutes?: number | null;
    max_attempts: number;
    questions_count: number;
};

type QuestionType = {
    id: number;
    assessment: number;
    question_text: string;
    question_type: 'mcq' | 'true_false' | 'short_answer' | 'coding';
    options: string[];
    correct_answer: string;
    marks: number;
};

type EnrollmentType = {
    id: number;
    employee: number;
    employee_name: string;
    employee_code: string | null;
    department_name: string | null;
    status: string;
    progress_percentage: number;
    enrolled_at: string;
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
    const [activeTab, setActiveTab] = useState<'courses' | 'categories' | 'signature'>('courses');
    const [courses, setCourses] = useState<CourseType[]>([]);
    const [categories, setCategories] = useState<CourseCategoryType[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters & Search
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

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

    // Certificate Preview State (auto-generated certificate, no manual template)
    const [certModalOpen, setCertModalOpen] = useState(false);
    const [selectedCourseForCert, setSelectedCourseForCert] = useState<CourseType | null>(null);
    const [certPreviewUrl, setCertPreviewUrl] = useState<string | null>(null);
    const [certPreviewLoading, setCertPreviewLoading] = useState(false);

    const openCertModal = async (course: CourseType) => {
        setSelectedCourseForCert(course);
        setCertModalOpen(true);
        setCertPreviewUrl(null);
        setCertPreviewLoading(true);
        try {
            const response = await authFetch(`${COURSES_API}${course.id}/certificate-preview/`, { headers: getHeaders() });
            if (response.ok) {
                const blob = await response.blob();
                setCertPreviewUrl(URL.createObjectURL(blob));
            }
        } catch (error) {
            console.error('Error generating certificate preview:', error);
        } finally {
            setCertPreviewLoading(false);
        }
    };

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

    // Quiz / Assessment State (managed inline during course creation)
    const [courseAssessments, setCourseAssessments] = useState<AssessmentType[]>([]);
    const [assessmentsLoading, setAssessmentsLoading] = useState(false);
    const [addQuizOpen, setAddQuizOpen] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState<AssessmentType | null>(null);
    const [quizForm, setQuizForm] = useState({
        title: '',
        pass_marks: 50,
        time_limit_minutes: '' as string | number,
        max_attempts: 1,
    });

    const [questionsModalOpen, setQuestionsModalOpen] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<AssessmentType | null>(null);
    const [questions, setQuestions] = useState<QuestionType[]>([]);
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [addQuestionOpen, setAddQuestionOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuestionType | null>(null);
    const [questionForm, setQuestionForm] = useState({
        question_text: '',
        question_type: 'mcq' as 'mcq' | 'true_false' | 'short_answer' | 'coding',
        optionsRaw: '',
        correct_answer: '',
        marks: 5,
    });

    // Enrolled Students State
    const [enrolledModalOpen, setEnrolledModalOpen] = useState(false);
    const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<CourseType | null>(null);
    const [enrolledList, setEnrolledList] = useState<EnrollmentType[]>([]);
    const [enrolledLoading, setEnrolledLoading] = useState(false);

    const openEnrolledModal = async (course: CourseType) => {
        setSelectedCourseForEnrollment(course);
        setEnrolledModalOpen(true);
        setEnrolledLoading(true);
        try {
            const response = await authFetch(`${ENROLLMENTS_API}?course=${course.id}`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setEnrolledList(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching enrolled students:', error);
        } finally {
            setEnrolledLoading(false);
        }
    };

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
        fetchCategories();
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchCourses();
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [search, filterCategory, filterDifficulty, filterStatus, page, limit]);

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
            const url = new URL(COURSES_API);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('limit', limit.toString());
            if (search) url.searchParams.append('search', search);
            if (filterCategory !== 'all') url.searchParams.append('category', filterCategory);
            if (filterDifficulty !== 'all') url.searchParams.append('difficulty_level', filterDifficulty);
            if (filterStatus !== 'all') url.searchParams.append('status', filterStatus);

            const response = await authFetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setCourses(data.results);
                    setTotalCount(data.count);
                    setTotalPages(data.total_pages || Math.ceil(data.count / limit));
                } else if (Array.isArray(data)) {
                    setCourses(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                } else {
                    setCourses([]);
                    setTotalCount(0);
                    setTotalPages(1);
                }
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

    const fetchCourseAssessments = async (courseId: number) => {
        setAssessmentsLoading(true);
        try {
            const response = await authFetch(`${ASSESSMENTS_API}?course=${courseId}`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCourseAssessments(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching course quizzes:', error);
        } finally {
            setAssessmentsLoading(false);
        }
    };

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
        fetchCourseAssessments(course.id);
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

    const handleMoveContent = async (content: CourseContentType, direction: 'up' | 'down') => {
        const sorted = [...courseContents].sort((a, b) => a.sequence - b.sequence || a.id - b.id);
        const index = sorted.findIndex((c) => c.id === content.id);
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= sorted.length) return;

        const neighbor = sorted[swapIndex];
        try {
            await Promise.all([
                authFetch(`${CONTENTS_API}${content.id}/`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify({ sequence: neighbor.sequence }),
                }),
                authFetch(`${CONTENTS_API}${neighbor.id}/`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify({ sequence: content.sequence }),
                }),
            ]);
            if (selectedCourse) fetchCourseContents(selectedCourse.id);
        } catch {
            Swal.fire('Error!', 'Could not reorder content.', 'error');
        }
    };

    // Quiz operations
    const resetQuizForm = () => {
        setEditingQuiz(null);
        setQuizForm({ title: '', pass_marks: 50, time_limit_minutes: '', max_attempts: 1 });
    };

    const openEditQuizModal = (a: AssessmentType) => {
        setEditingQuiz(a);
        setQuizForm({
            title: a.title,
            pass_marks: a.pass_marks,
            time_limit_minutes: a.time_limit_minutes ? String(a.time_limit_minutes) : '',
            max_attempts: a.max_attempts,
        });
        setAddQuizOpen(true);
    };

    const handleSaveQuiz = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCourse) return;
        setSaving(true);

        const payload = {
            course: selectedCourse.id,
            title: quizForm.title,
            assessment_type: 'quiz',
            pass_marks: Number(quizForm.pass_marks),
            time_limit_minutes: quizForm.time_limit_minutes ? Number(quizForm.time_limit_minutes) : null,
            max_attempts: Number(quizForm.max_attempts),
        };

        try {
            const url = editingQuiz ? `${ASSESSMENTS_API}${editingQuiz.id}/` : ASSESSMENTS_API;
            const method = editingQuiz ? 'PUT' : 'POST';
            const response = await authFetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({ title: editingQuiz ? 'Updated!' : 'Added!', text: editingQuiz ? 'Quiz updated.' : 'Quiz created.', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'sweet-alerts' } });
                setAddQuizOpen(false);
                resetQuizForm();
                fetchCourseAssessments(selectedCourse.id);
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire('Error!', err ? Object.values(err).flat().join(' ') : 'Failed to save quiz.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection error.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuiz = async (a: AssessmentType) => {
        const result = await Swal.fire({
            title: 'Delete Quiz?',
            text: `Delete "${a.title}"? All its questions will be removed too.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });
        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${ASSESSMENTS_API}${a.id}/`, { method: 'DELETE', headers: getHeaders() });
            if (response.ok || response.status === 204) {
                if (selectedCourse) fetchCourseAssessments(selectedCourse.id);
            } else {
                Swal.fire('Error!', 'Could not delete quiz.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server issue.', 'error');
        }
    };

    // Question operations
    const fetchQuestions = async (assessmentId: number) => {
        setQuestionsLoading(true);
        try {
            const response = await authFetch(`${QUESTIONS_API}?assessment_id=${assessmentId}`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setQuestions(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setQuestionsLoading(false);
        }
    };

    const openQuestionsModal = (a: AssessmentType) => {
        setSelectedAssessment(a);
        fetchQuestions(a.id);
        setQuestionsModalOpen(true);
    };

    const resetQuestionForm = () => {
        setEditingQuestion(null);
        setQuestionForm({ question_text: '', question_type: 'mcq', optionsRaw: 'Option A, Option B, Option C, Option D', correct_answer: '', marks: 5 });
    };

    const handleSaveQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedAssessment) return;
        setSaving(true);

        const optionsArr = questionForm.question_type === 'mcq'
            ? questionForm.optionsRaw.split(',').map((s) => s.trim()).filter(Boolean)
            : questionForm.question_type === 'true_false'
                ? ['True', 'False']
                : [];

        const payload = {
            assessment: selectedAssessment.id,
            question_text: questionForm.question_text,
            question_type: questionForm.question_type,
            options: optionsArr,
            correct_answer: questionForm.correct_answer,
            marks: Number(questionForm.marks),
        };

        try {
            const url = editingQuestion ? `${QUESTIONS_API}${editingQuestion.id}/` : QUESTIONS_API;
            const method = editingQuestion ? 'PUT' : 'POST';
            const response = await authFetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({ title: 'Saved!', text: 'Question saved.', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'sweet-alerts' } });
                setAddQuestionOpen(false);
                resetQuestionForm();
                fetchQuestions(selectedAssessment.id);
                if (selectedCourse) fetchCourseAssessments(selectedCourse.id);
            } else {
                Swal.fire('Error!', 'Failed to save question.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection failed.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuestion = async (q: QuestionType) => {
        const result = await Swal.fire({
            title: 'Delete Question?',
            text: 'Are you sure you want to remove this question?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });
        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${QUESTIONS_API}${q.id}/`, { method: 'DELETE', headers: getHeaders() });
            if (response.ok || response.status === 204) {
                if (selectedAssessment) {
                    fetchQuestions(selectedAssessment.id);
                    if (selectedCourse) fetchCourseAssessments(selectedCourse.id);
                }
            }
        } catch {
            Swal.fire('Error!', 'Could not delete question.', 'error');
        }
    };

    return (
        <div>
            {/* Header / Banner */}
            <PageHeader
                title="Courses Catalog"
                subtitle="Manage corporate training programs, compile lesson directories, build quizzes, and configure compliance parameters."
                icon={<IconOpenBook />}
                badge="Learning Management System"
                variant="purple"
            />

            {/* Tabbed Navigation */}
            <div className="flex border-b border-[#ebedf2] dark:border-[#1b2e4b] mb-6 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('courses')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${activeTab === 'courses'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-primary'
                        }`}
                >
                    Courses
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('categories')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${activeTab === 'categories'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-primary'
                        }`}
                >
                    Course Categories
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('signature')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${activeTab === 'signature'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-primary'
                        }`}
                >
                    Certificate Signature
                </button>
            </div>

            {activeTab === 'categories' ? (
                <CourseCategory />
            ) : activeTab === 'signature' ? (
                <CertificateSignature />
            ) : (
                <>
                    {/* Quick Stats Grid */}
                    <StatGrid cols={4}>
                        <StatCard label="Total Courses" value={stats.total} tone="primary" icon={<IconBook />} />
                        <StatCard label="Published" value={stats.published} tone="success" icon={<IconCircleCheck />} />
                        <StatCard label="Drafts" value={stats.draft} tone="warning" icon={<IconNotesEdit />} />
                        <StatCard label="Compliance" value={stats.compliance} tone="purple" icon={<IconAward />} />
                    </StatGrid>

                    <CardGrid
                        items={courses}
                        loading={loading}
                        page={page}
                        pageSize={limit}
                        totalCount={totalCount}
                        pageSizeOptions={[6, 9, 12, 24]}
                        onPageChange={setPage}
                        onPageSizeChange={(sz) => { setLimit(sz); setPage(1); }}
                        searchValue={search}
                        onSearchChange={(v) => { setSearch(v); setPage(1); }}
                        searchPlaceholder="Search courses..."
                        emptyMessage="No courses registered yet"
                        entityLabel="courses"
                        cols={3}
                        onRefresh={fetchCourses}
                        actions={
                            <Button type="button" onClick={openCreateCourseModal}><IconPlus /> Add Course</Button>
                        }
                        filters={
                            <>
                            <SearchableSelect
                                className="w-44"
                                options={[{ value: 'all', label: 'All Categories' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
                                value={filterCategory}
                                onChange={(val) => { setFilterCategory(String(val)); setPage(1); }}
                                placeholder="Filter by Category"
                            />
                            <select className="form-select h-10 w-40 rounded-xl" value={filterDifficulty} onChange={(e) => { setFilterDifficulty(e.target.value); setPage(1); }}>
                                <option value="all">All Levels</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                            <select className="form-select h-10 w-40 rounded-xl" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                                <option value="all">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                            </>
                        }
                        renderCard={(course) => (
                                <div
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
                                            <span className={`badge capitalize text-[10px] font-bold px-2 py-0.5 rounded-full ${course.difficulty_level === 'advanced'
                                                ? 'badge-outline-danger'
                                                : course.difficulty_level === 'intermediate'
                                                    ? 'badge-outline-warning'
                                                    : 'badge-outline-success'
                                                }`}>
                                                {course.difficulty_level}
                                            </span>
                                            <span className={`badge capitalize text-[10px] font-bold px-2 py-0.5 rounded-full ${course.status === 'published'
                                                ? 'bg-success text-white'
                                                : course.status === 'archived'
                                                    ? 'bg-danger text-white'
                                                    : 'bg-amber-500 text-white'
                                                }`}>
                                                {course.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            {course.category_name && (
                                                <span className="text-[10px] text-primary uppercase font-bold tracking-wider block mb-1">
                                                    {course.category_name}
                                                </span>
                                            )}
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
                                                <button
                                                    type="button"
                                                    className="badge badge-outline-primary py-0.5 px-2 rounded-full font-bold hover:bg-primary hover:text-white transition-colors"
                                                    onClick={() => openEnrolledModal(course)}
                                                >
                                                    {course.enrollments_count || 0} enrolled
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pb-2">
                                                <span className="font-semibold">Completion Certificate:</span>
                                                <button
                                                    type="button"
                                                    className="badge badge-outline-success py-0.5 px-2 rounded-full font-bold hover:bg-success hover:text-white transition-colors"
                                                    onClick={() => openCertModal(course)}
                                                >
                                                    Preview
                                                </button>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 mt-2">
                                            <Button variant="outline" size="sm" className="flex-1"
                                                type="button"

                                                onClick={() => openManageContent(course)}
                                            >
                                                <IconEye className="w-4 h-4" /> Curriculum
                                            </Button>
                                            <button
                                                type="button"
                                                className="btn btn-outline-warning btn-sm flex-1 flex items-center justify-center gap-1 rounded-lg"
                                                onClick={() => openReviewsPanel(course)}
                                            >
                                                ★ Reviews
                                            </button>
                                            <Button variant="secondary" size="sm" className="!p-2"
                                                type="button"

                                                onClick={() => openEditCourseModal(course)}
                                            >
                                                <IconPencil className="w-4.5 h-4.5" />
                                            </Button>
                                            <Button variant="outline-danger" size="sm" className="!p-2"
                                                type="button"

                                                onClick={() => handleDeleteCourse(course)}
                                            >
                                                <IconTrashLines className="w-4.5 h-4.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                            )}
                    />
                </>
            )}

            {/* Course Modal (Create & Edit) */}
            <Modal open={courseModalOpen} onClose={() => setCourseModalOpen(false)} title={editingCourse ? 'Edit Course Details' : 'Register New Course'} size="2xl">
                <form onSubmit={handleSaveCourse} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-semibold mb-1 block">Course Title <span className="text-danger">*</span></label>
                            <input className="form-input rounded-lg" required placeholder="e.g. React Native Fundamentals" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="font-semibold mb-1 block">Course Thumbnail</label>
                            {!thumbnailFile && editingCourse?.thumbnail_url && (
                                <div className="flex items-center gap-2 mb-2">
                                    <img src={editingCourse.thumbnail_url} alt="Current thumbnail" className="w-12 h-12 object-cover rounded-lg border border-white-light dark:border-[#1b2e4b]" />
                                    <span className="text-xs text-gray-400">Current image (choose a file to replace)</span>
                                </div>
                            )}
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
                            <SearchableSelect
                                options={[
                                    { value: '', label: '-- No Category --' },
                                    ...categories.map(c => ({ value: String(c.id), label: c.name }))
                                ]}
                                value={courseForm.category}
                                onChange={(val) => setCourseForm({ ...courseForm, category: String(val) })}
                                placeholder="Search & select category..."
                            />
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
                        <Button variant="outline-danger" type="button"  onClick={() => setCourseModalOpen(false)}>Cancel</Button>
                        <Button className="!px-5" type="submit"  disabled={saving}>
                            {saving ? 'Saving...' : editingCourse ? 'Save Changes' : 'Register Course'}
                        </Button>
                    </div>
                </form>

            </Modal>

            {/* Course Content Manager Modal */}
            <Modal open={contentModalOpen} onClose={() => setContentModalOpen(false)} title={<>Curriculum: {selectedCourse?.title}</>} size="3xl">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-sm uppercase text-gray-400 tracking-wider">Lesson Materials</h4>
                    <Button size="sm" type="button"  onClick={() => { resetContentForm(); setAddContentOpen(true); }}>
                        <IconPlus className="w-3.5 h-3.5" /> Upload Material
                    </Button>
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
                                {[...courseContents].sort((a, b) => a.sequence - b.sequence || a.id - b.id).map((content, idx) => (
                                    <tr key={content.id}>
                                        <td>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-primary">{content.sequence}</span>
                                                <div className="flex flex-col">
                                                    <button type="button" disabled={idx === 0} className="disabled:opacity-25 disabled:cursor-not-allowed text-gray-400 hover:text-primary leading-none" title="Move up" onClick={() => handleMoveContent(content, 'up')}>▲</button>
                                                    <button type="button" disabled={idx === courseContents.length - 1} className="disabled:opacity-25 disabled:cursor-not-allowed text-gray-400 hover:text-primary leading-none" title="Move down" onClick={() => handleMoveContent(content, 'down')}>▼</button>
                                                </div>
                                            </div>
                                        </td>
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

                <div className="flex justify-between items-center mb-4 mt-8 pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b]">
                    <div>
                        <h4 className="font-extrabold text-sm uppercase text-gray-400 tracking-wider">Quiz / Assessment</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">Unlocks for learners only after all lesson materials above are marked complete.</p>
                    </div>
                    <Button size="sm" type="button"  onClick={() => { resetQuizForm(); setAddQuizOpen(true); }}>
                        <IconPlus className="w-3.5 h-3.5" /> Add Quiz
                    </Button>
                </div>

                {assessmentsLoading ? (
                    <div className="py-6 text-center text-gray-400 animate-pulse">Loading quizzes...</div>
                ) : courseAssessments.length === 0 ? (
                    <div className="py-6 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                        No quiz added for this course yet.
                    </div>
                ) : (
                    <div className="table-responsive border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Quiz Title</th>
                                    <th>Pass %</th>
                                    <th>Time Limit</th>
                                    <th>Max Attempts</th>
                                    <th>Questions</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courseAssessments.map((a) => (
                                    <tr key={a.id}>
                                        <td className="font-semibold text-gray-800 dark:text-gray-200">{a.title}</td>
                                        <td>{a.pass_marks}%</td>
                                        <td>{a.time_limit_minutes ? `${a.time_limit_minutes} mins` : '—'}</td>
                                        <td>{a.max_attempts}</td>
                                        <td>{a.questions_count}</td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" className="text-primary hover:underline text-xs font-bold" onClick={() => openQuestionsModal(a)}>
                                                    Questions
                                                </button>
                                                <button type="button" className="text-primary hover:text-primary-dark" onClick={() => openEditQuizModal(a)}>
                                                    <IconPencil className="w-4 h-4" />
                                                </button>
                                                <button type="button" className="text-danger hover:text-danger-dark" onClick={() => handleDeleteQuiz(a)}>
                                                    <IconTrashLines className="w-4.5 h-4.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                    <Button variant="outline-danger" type="button"  onClick={() => setContentModalOpen(false)}>Close Manager</Button>
                </div>

            </Modal>

            {/* Upload Material Modal */}
            <Modal open={addContentOpen} onClose={() => setAddContentOpen(false)} title="Upload Lesson Material" size="lg">
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
                        <Button variant="outline-danger" type="button"  onClick={() => setAddContentOpen(false)}>Cancel</Button>
                        <Button className="!px-5" type="submit"  disabled={saving}>
                            {saving ? 'Uploading...' : 'Upload Material'}
                        </Button>
                    </div>
                </form>

            </Modal>

            {/* Add Quiz Modal */}
            <Modal open={addQuizOpen} onClose={() => setAddQuizOpen(false)} title={editingQuiz ? 'Edit Quiz' : 'Add Quiz'} size="lg">
                <form onSubmit={handleSaveQuiz} className="space-y-4">
                    <div>
                        <label className="font-semibold mb-1 block">Quiz Title <span className="text-danger">*</span></label>
                        <input className="form-input rounded-lg" required placeholder="e.g. Module 1 Assessment" value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="font-semibold mb-1 block">Pass Marks (%)</label>
                            <input type="number" className="form-input rounded-lg" min="0" max="100" value={quizForm.pass_marks} onChange={(e) => setQuizForm({ ...quizForm, pass_marks: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="font-semibold mb-1 block">Time Limit (Minutes)</label>
                            <input type="number" className="form-input rounded-lg" min="0" placeholder="No limit" value={quizForm.time_limit_minutes} onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="font-semibold mb-1 block">Max Attempts</label>
                        <input type="number" className="form-input rounded-lg" min="1" value={quizForm.max_attempts} onChange={(e) => setQuizForm({ ...quizForm, max_attempts: Number(e.target.value) })} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                        <Button variant="outline-danger" type="button"  onClick={() => setAddQuizOpen(false)}>Cancel</Button>
                        <Button className="!px-5" type="submit"  disabled={saving}>
                            {saving ? 'Saving...' : editingQuiz ? 'Update Quiz' : 'Add Quiz'}
                        </Button>
                    </div>
                </form>

            </Modal>

            {/* Manage Questions Modal */}
            <Modal open={questionsModalOpen} onClose={() => setQuestionsModalOpen(false)} title={<>Questions: {selectedAssessment?.title}</>} size="2xl">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-sm uppercase text-gray-400 tracking-wider">Question Bank</h4>
                    <Button size="sm" type="button"  onClick={() => { resetQuestionForm(); setAddQuestionOpen(true); }}>
                        <IconPlus className="w-3.5 h-3.5" /> Add Question
                    </Button>
                </div>

                {questionsLoading ? (
                    <div className="py-10 text-center text-gray-400 animate-pulse">Loading questions...</div>
                ) : questions.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                        No questions added yet.
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {questions.map((q, idx) => (
                            <div key={q.id} className="p-3 border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                        {idx + 1}. {q.question_text}
                                        <span className="ml-2 badge badge-outline-primary text-[10px] font-bold uppercase rounded px-1.5 py-0.5">{q.question_type}</span>
                                        <span className="ml-1 text-[10px] text-gray-400">({q.marks} marks)</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button type="button" className="text-primary hover:text-primary-dark" onClick={() => { setEditingQuestion(q); setQuestionForm({ question_text: q.question_text, question_type: q.question_type, optionsRaw: q.options ? q.options.join(', ') : '', correct_answer: q.correct_answer, marks: q.marks }); setAddQuestionOpen(true); }}>
                                            <IconPencil className="w-4 h-4" />
                                        </button>
                                        <button type="button" className="text-danger hover:text-danger-dark" onClick={() => handleDeleteQuestion(q)}>
                                            <IconTrashLines className="w-4.5 h-4.5" />
                                        </button>
                                    </div>
                                </div>
                                {q.options && q.options.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1.5">Options: {q.options.join(' | ')}</div>
                                )}
                                <div className="text-xs font-bold text-success mt-1.5">Correct: {q.correct_answer}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                    <Button variant="outline-danger" type="button"  onClick={() => setQuestionsModalOpen(false)}>Close</Button>
                </div>

            </Modal>

            {/* Add/Edit Question Modal */}
            <Modal open={addQuestionOpen} onClose={() => setAddQuestionOpen(false)} title={editingQuestion ? 'Edit Question' : 'Add Question'} size="lg">
                <form onSubmit={handleSaveQuestion} className="space-y-4">
                    <div>
                        <label className="font-semibold mb-1 block">Question Text <span className="text-danger">*</span></label>
                        <textarea className="form-textarea rounded-lg" required value={questionForm.question_text} onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="font-semibold mb-1 block">Question Type</label>
                            <select className="form-select rounded-lg" value={questionForm.question_type} onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value as any })}>
                                <option value="mcq">Multiple Choice</option>
                                <option value="true_false">True / False</option>
                                <option value="short_answer">Short Answer</option>
                                <option value="coding">Coding</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-semibold mb-1 block">Marks</label>
                            <input type="number" className="form-input rounded-lg" min="1" value={questionForm.marks} onChange={(e) => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })} />
                        </div>
                    </div>

                    {questionForm.question_type === 'mcq' && (
                        <div>
                            <label className="font-semibold mb-1 block">Options (comma-separated)</label>
                            <input className="form-input rounded-lg" placeholder="Option A, Option B, Option C, Option D" value={questionForm.optionsRaw} onChange={(e) => setQuestionForm({ ...questionForm, optionsRaw: e.target.value })} />
                        </div>
                    )}

                    <div>
                        <label className="font-semibold mb-1 block">Correct Answer <span className="text-danger">*</span></label>
                        <input className="form-input rounded-lg" required placeholder={questionForm.question_type === 'true_false' ? 'True or False' : 'e.g. Option A'} value={questionForm.correct_answer} onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                        <Button variant="outline-danger" type="button"  onClick={() => setAddQuestionOpen(false)}>Cancel</Button>
                        <Button className="!px-5" type="submit"  disabled={saving}>
                            {saving ? 'Saving...' : 'Save Question'}
                        </Button>
                    </div>
                </form>

            </Modal>
            {/* Reviews Dialog Modal */}
            <Modal open={reviewsModalOpen} onClose={() => setReviewsModalOpen(false)} title={<>Feedback Reviews: {selectedCourseForReviews?.title}</>} size="2xl">
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
                                                className={`text-sm ${review.rating >= star ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'
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
                    <Button variant="outline-danger" type="button"  onClick={() => setReviewsModalOpen(false)}>Close Reviews</Button>
                </div>

            </Modal>

            {/* Enrolled Students Modal */}
            <Modal open={enrolledModalOpen} onClose={() => setEnrolledModalOpen(false)} title={<>Enrolled Students: {selectedCourseForEnrollment?.title}</>} size="3xl">
                {enrolledLoading ? (
                    <div className="py-10 text-center text-gray-400 animate-pulse">Loading enrolled students...</div>
                ) : enrolledList.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                        No students enrolled in this course yet.
                    </div>
                ) : (
                    <div className="table-responsive border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg max-h-[420px] overflow-y-auto">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                    <th>Progress</th>
                                    <th>Enrolled On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrolledList.map((en) => (
                                    <tr key={en.id}>
                                        <td className="font-bold text-primary">{en.employee_code || '—'}</td>
                                        <td className="font-semibold text-gray-800 dark:text-gray-200">{en.employee_name}</td>
                                        <td>{en.department_name || '—'}</td>
                                        <td>
                                            <span className="badge badge-outline-primary text-[10px] font-bold uppercase rounded px-1.5 py-0.5">
                                                {en.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>{en.progress_percentage}%</td>
                                        <td className="text-xs text-gray-500">{new Date(en.enrolled_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                    <Button variant="outline-danger" type="button"  onClick={() => setEnrolledModalOpen(false)}>Close</Button>
                </div>

            </Modal>

            {/* Certificate Preview Modal (auto-generated on course completion) */}
            <Modal open={certModalOpen} onClose={() => setCertModalOpen(false)} title={<>Certificate Preview: {selectedCourseForCert?.title}</>} size="3xl">
                <p className="text-[11px] text-gray-400 mb-4">
                    Auto-generated when a learner completes every lesson and passes the course quiz — this is a sample using placeholder data.
                </p>
                {certPreviewLoading ? (
                    <div className="py-16 text-center text-gray-400 animate-pulse">Generating certificate preview...</div>
                ) : certPreviewUrl ? (
                    <div className="border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg overflow-hidden bg-gray-50 dark:bg-[#0e1726]/20">
                        <iframe src={certPreviewUrl} title="Certificate Preview" className="w-full h-[450px] border-0"></iframe>
                    </div>
                ) : (
                    <div className="py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                        Could not generate certificate preview.
                    </div>
                )}

                <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                    <Button variant="outline-danger" type="button"  onClick={() => setCertModalOpen(false)}>Close</Button>
                </div>

            </Modal>
        </div>
    );
};

export default Course;
