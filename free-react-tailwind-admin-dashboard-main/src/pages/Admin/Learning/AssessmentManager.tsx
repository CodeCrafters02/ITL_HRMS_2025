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
import SearchableSelect from '../../Elements/SearchableSelect';

import Modal from '../../../components/Common/Modal';
import Button from '../../../components/Common/Button';
import CardGrid from '../../../components/Common/CardGrid';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const ASSESSMENTS_API = `${API_BASE_URL}/employee/assessments/`;
const QUESTIONS_API = `${API_BASE_URL}/employee/assessment-questions/`;
const ATTEMPTS_API = `${API_BASE_URL}/employee/assessment-attempts/`;
const COURSES_API = `${API_BASE_URL}/employee/courses/`;

type AssessmentType = {
    id: number;
    course: number;
    course_title: string;
    title: string;
    assessment_type: 'quiz' | 'mcq' | 'coding' | 'practical' | 'viva' | 'survey';
    pass_marks: number;
    time_limit_minutes?: number | null;
    max_attempts: number;
    created_at: string;
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

type AttemptType = {
    id: number;
    assessment: number;
    assessment_title: string;
    employee: number;
    employee_name: string;
    employee_id: string;
    enrollment: number;
    attempt_number: number;
    score: number;
    is_passed: boolean;
    started_at: string;
    submitted_at: string;
    answers?: any[];
};

type CourseOption = { id: number; title: string };

const AssessmentManager = () => {
    const dispatch = useDispatch();
    const [assessments, setAssessments] = useState<AssessmentType[]>([]);
    const [courses, setCourses] = useState<CourseOption[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    // Pagination & Search States
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Assessment Modal
    const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
    const [editingAssessment, setEditingAssessment] = useState<AssessmentType | null>(null);
    const [assessmentForm, setAssessmentForm] = useState({
        course: '',
        title: '',
        assessment_type: 'quiz' as any,
        pass_marks: 50,
        time_limit_minutes: '',
        max_attempts: 1,
    });

    // Questions Modal
    const [questionsModalOpen, setQuestionsModalOpen] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<AssessmentType | null>(null);
    const [questions, setQuestions] = useState<QuestionType[]>([]);
    const [questionsLoading, setQuestionsLoading] = useState(false);

    // Question form state
    const [addQuestionOpen, setAddQuestionOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuestionType | null>(null);
    const [questionForm, setQuestionForm] = useState({
        question_text: '',
        question_type: 'mcq' as any,
        optionsRaw: '', // comma-separated for MCQ choices
        correct_answer: '',
        marks: 5,
    });

    // Attempts Modal
    const [attemptsModalOpen, setAttemptsModalOpen] = useState(false);
    const [attempts, setAttempts] = useState<AttemptType[]>([]);
    const [attemptsLoading, setAttemptsLoading] = useState(false);

    // Selected attempt answers view
    const [viewAttemptAnswers, setViewAttemptAnswers] = useState<AttemptType | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Assessments Manager'));
        fetchCourses();
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchAssessments();
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [search, page, limit]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchAssessments = async () => {
        setLoading(true);
        try {
            const url = new URL(ASSESSMENTS_API);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('limit', limit.toString());
            if (search) url.searchParams.append('search', search);

            const response = await authFetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setAssessments(data.results);
                    setTotalCount(data.count);
                    setTotalPages(data.total_pages || Math.ceil(data.count / limit));
                } else if (Array.isArray(data)) {
                    setAssessments(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                } else {
                    setAssessments([]);
                    setTotalCount(0);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching assessments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await authFetch(COURSES_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setCourses(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

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

    const fetchAttempts = async (assessmentId: number) => {
        setAttemptsLoading(true);
        try {
            const response = await authFetch(`${ATTEMPTS_API}?assessment_id=${assessmentId}`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setAttempts(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching attempts:', error);
        } finally {
            setAttemptsLoading(false);
        }
    };

    const resetAssessmentForm = () => {
        setAssessmentForm({
            course: '',
            title: '',
            assessment_type: 'quiz',
            pass_marks: 50,
            time_limit_minutes: '',
            max_attempts: 1,
        });
        setEditingAssessment(null);
    };

    const openCreateAssessmentModal = () => {
        resetAssessmentForm();
        setAssessmentModalOpen(true);
    };

    const openEditAssessmentModal = (a: AssessmentType) => {
        setEditingAssessment(a);
        setAssessmentForm({
            course: String(a.course),
            title: a.title,
            assessment_type: a.assessment_type,
            pass_marks: a.pass_marks,
            time_limit_minutes: a.time_limit_minutes ? String(a.time_limit_minutes) : '',
            max_attempts: a.max_attempts,
        });
        setAssessmentModalOpen(true);
    };

    const handleSaveAssessment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        const payload = {
            course: Number(assessmentForm.course),
            title: assessmentForm.title,
            assessment_type: assessmentForm.assessment_type,
            pass_marks: Number(assessmentForm.pass_marks),
            time_limit_minutes: assessmentForm.time_limit_minutes ? Number(assessmentForm.time_limit_minutes) : null,
            max_attempts: Number(assessmentForm.max_attempts),
        };

        try {
            const url = editingAssessment ? `${ASSESSMENTS_API}${editingAssessment.id}/` : ASSESSMENTS_API;
            const method = editingAssessment ? 'PUT' : 'POST';

            const response = await authFetch(url, {
                method: method,
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: editingAssessment ? 'Updated!' : 'Created!',
                    text: 'Quiz options saved.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                setAssessmentModalOpen(false);
                fetchAssessments();
            } else {
                Swal.fire('Error!', 'Failed to save quiz metadata.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection error.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAssessment = async (a: AssessmentType) => {
        const result = await Swal.fire({
            title: 'Delete Quiz?',
            text: `Delete "${a.title}"? All grades sheets and questions will be cleared.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${ASSESSMENTS_API}${a.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire('Deleted!', 'Quiz has been deleted.', 'success');
                fetchAssessments();
            } else {
                Swal.fire('Error!', 'Could not delete quiz.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection error.', 'error');
        }
    };

    // Question operations
    const openQuestionsModal = (a: AssessmentType) => {
        setSelectedAssessment(a);
        fetchQuestions(a.id);
        setQuestionsModalOpen(true);
    };

    const openAddQuestion = () => {
        setEditingQuestion(null);
        setQuestionForm({
            question_text: '',
            question_type: 'mcq',
            optionsRaw: 'Option A, Option B, Option C, Option D',
            correct_answer: '',
            marks: 5,
        });
        setAddQuestionOpen(true);
    };

    const openEditQuestion = (q: QuestionType) => {
        setEditingQuestion(q);
        setQuestionForm({
            question_text: q.question_text,
            question_type: q.question_type,
            optionsRaw: q.options ? q.options.join(', ') : '',
            correct_answer: q.correct_answer,
            marks: q.marks,
        });
        setAddQuestionOpen(true);
    };

    const handleSaveQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedAssessment) return;
        setSaving(true);

        const optionsArr = questionForm.question_type === 'mcq' 
            ? questionForm.optionsRaw.split(',').map(s => s.trim()).filter(Boolean)
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
                method: method,
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Saved!',
                    text: 'Question options updated.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                setAddQuestionOpen(false);
                fetchQuestions(selectedAssessment.id);
                fetchAssessments(); // Update question counts
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
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${QUESTIONS_API}${q.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                if (selectedAssessment) {
                    fetchQuestions(selectedAssessment.id);
                    fetchAssessments();
                }
            }
        } catch {
            Swal.fire('Error!', 'Could not delete question.', 'error');
        }
    };

    // Attempts operations
    const openAttemptsModal = (a: AssessmentType) => {
        setSelectedAssessment(a);
        fetchAttempts(a.id);
        setAttemptsModalOpen(true);
    };

    return (
        <div>
            <CardGrid
                items={assessments}
                loading={loading}
                page={page}
                pageSize={limit}
                totalCount={totalCount}
                pageSizeOptions={[6, 9, 12, 24]}
                onPageChange={setPage}
                onPageSizeChange={(sz) => { setLimit(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                searchPlaceholder="Search quiz title..."
                emptyMessage="No quiz sheets mapped"
                entityLabel="quizzes"
                cols={3}
                onRefresh={fetchAssessments}
                actions={
                    <Button type="button" onClick={openCreateAssessmentModal}><IconPlus /> Add Quiz</Button>
                }
                renderCard={(a) => (
                        <div
                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <span className="badge badge-outline-secondary text-[9px] uppercase font-bold rounded">
                                            {a.assessment_type}
                                        </span>
                                        <h3 className="text-base font-bold text-gray-800 dark:text-white-light mt-1.5 line-clamp-1">
                                            {a.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button type="button" className="text-primary hover:text-primary-dark p-1" onClick={() => openEditAssessmentModal(a)}>
                                            <IconPencil className="w-4 h-4" />
                                        </button>
                                        <button type="button" className="text-danger hover:text-danger-dark p-1" onClick={() => handleDeleteAssessment(a)}>
                                            <IconTrashLines className="w-4.5 h-4.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1 text-xs text-gray-500 mb-4 pt-1">
                                    <div>
                                        <span className="font-semibold text-gray-400 mr-1">Linked Course:</span>
                                        <span className="font-bold text-gray-700 dark:text-gray-300">{a.course_title || 'General'}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-400 mr-1">Time Limit:</span>
                                        <span>{a.time_limit_minutes ? `${a.time_limit_minutes} mins` : 'No Limit'}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-400 mr-1">Passing Mark:</span>
                                        <span>{a.pass_marks} %</span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4 mt-auto space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-gray-400">Total Questions:</span>
                                    <span className="badge badge-outline-primary rounded-full px-2 font-bold">{a.questions_count} Qs</span>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1 text-xs !py-1.5"
                                        type="button"

                                        onClick={() => openQuestionsModal(a)}
                                    >
                                        <IconEye className="w-3.5 h-3.5" /> Question Sheet
                                    </Button>
                                    <Button variant="secondary" size="sm" className="flex-1 text-xs !py-1.5"
                                        type="button"

                                        onClick={() => openAttemptsModal(a)}
                                    >
                                        Attempts Log
                                    </Button>
                                </div>
                            </div>
                        </div>

                    )}
            />

            {/* Assessment Edit/Create Modal */}
            <Modal open={assessmentModalOpen} onClose={() => setAssessmentModalOpen(false)} title={editingAssessment ? 'Edit Quiz Parameters' : 'Create Quiz'} size="lg">
                <form onSubmit={handleSaveAssessment} className="space-y-4">
                    <div>
                        <label className="font-semibold mb-1 block text-xs">Choose Catalog Course <span className="text-danger">*</span></label>
                        <SearchableSelect
                            options={courses.map(c => ({ value: String(c.id), label: c.title }))}
                            value={assessmentForm.course}
                            onChange={(val) => setAssessmentForm({ ...assessmentForm, course: String(val) })}
                            placeholder="Search & select course..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-semibold mb-1 block text-xs">Quiz Title <span className="text-danger">*</span></label>
                            <input className="form-input rounded-lg" required placeholder="e.g. Unit 1 assessment" value={assessmentForm.title} onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="font-semibold mb-1 block text-xs">Assessment Type</label>
                            <SearchableSelect
                                options={[
                                    { value: 'quiz', label: 'Quiz' },
                                    { value: 'mcq', label: 'MCQ Test' },
                                    { value: 'coding', label: 'Coding Assessment' },
                                    { value: 'practical', label: 'Practical Assignment' },
                                    { value: 'viva', label: 'Viva' },
                                    { value: 'survey', label: 'Survey' },
                                ]}
                                value={assessmentForm.assessment_type}
                                onChange={(val) => setAssessmentForm({ ...assessmentForm, assessment_type: val as any })}
                                placeholder="Select assessment type"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="font-semibold mb-1 block text-xs">Passing Grade (%) <span className="text-danger">*</span></label>
                            <input type="number" min="0" max="100" className="form-input rounded-lg" required value={assessmentForm.pass_marks} onChange={(e) => setAssessmentForm({ ...assessmentForm, pass_marks: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="font-semibold mb-1 block text-xs">Time Limit (Mins)</label>
                            <input type="number" min="1" className="form-input rounded-lg" placeholder="No limit" value={assessmentForm.time_limit_minutes} onChange={(e) => setAssessmentForm({ ...assessmentForm, time_limit_minutes: e.target.value })} />
                        </div>
                        <div>
                            <label className="font-semibold mb-1 block text-xs">Max Attempts Allowed</label>
                            <input type="number" min="1" className="form-input rounded-lg" required value={assessmentForm.max_attempts} onChange={(e) => setAssessmentForm({ ...assessmentForm, max_attempts: Number(e.target.value) })} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                        <Button variant="outline-danger" type="button"  onClick={() => setAssessmentModalOpen(false)}>Cancel</Button>
                        <Button className="!px-5" type="submit"  disabled={saving}>
                            {saving ? 'Saving...' : editingAssessment ? 'Save Options' : 'Create Quiz'}
                        </Button>
                    </div>
                </form>

            </Modal>

            {/* Questions Modal */}
            <Modal open={questionsModalOpen} onClose={() => setQuestionsModalOpen(false)} title={<>Questions: {selectedAssessment?.title}</>} size="3xl">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-sm uppercase text-gray-400 tracking-wider">Question Sheet</h4>
                    <Button size="sm" type="button"  onClick={openAddQuestion}>
                        <IconPlus className="w-3.5 h-3.5" /> Add Question
                    </Button>
                </div>

                {questionsLoading ? (
                    <div className="py-10 text-center text-gray-400 animate-pulse">Loading questions...</div>
                ) : questions.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                        No questions added to this quiz sheet yet.
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                        {questions.map((q, idx) => (
                            <div key={q.id} className="p-4 border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg bg-gray-50 dark:bg-[#0e1726]/20">
                                <div className="flex justify-between items-start">
                                    <div className="text-xs font-extrabold text-primary uppercase">Question {idx + 1} ({q.question_type.toUpperCase()} • {q.marks} Marks)</div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" className="text-primary hover:text-primary-dark p-1 text-xs" onClick={() => openEditQuestion(q)}>Edit</button>
                                        <button type="button" className="text-danger hover:text-danger-dark p-1 text-xs" onClick={() => handleDeleteQuestion(q)}>Delete</button>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-gray-850 dark:text-gray-200 mt-1">{q.question_text}</div>
                                {q.options && q.options.length > 0 && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="text-xs bg-white dark:bg-gray-850 p-2 border border-gray-150 rounded font-medium text-gray-600 dark:text-gray-400">
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="text-xs font-bold text-success mt-2">Correct Key: {q.correct_answer}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                    <Button variant="outline-danger" type="button"  onClick={() => setQuestionsModalOpen(false)}>Close Sheet</Button>
                </div>

            </Modal>

            {/* Add/Edit Question Submodal */}
            <Modal open={addQuestionOpen} onClose={() => setAddQuestionOpen(false)} title={editingQuestion ? 'Edit Question' : 'Add Question'} size="lg">
                <form onSubmit={handleSaveQuestion} className="space-y-4">
                    <div>
                        <label className="font-semibold mb-1 block text-xs">Question text <span className="text-danger">*</span></label>
                        <textarea className="form-textarea min-h-[80px] rounded-lg text-xs" required placeholder="e.g. What does API stand for?" value={questionForm.question_text} onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="font-semibold mb-1 block text-xs">Question Type</label>
                            <SearchableSelect
                                options={[
                                    { value: 'mcq', label: 'Multiple Choice' },
                                    { value: 'true_false', label: 'True / False' },
                                    { value: 'short_answer', label: 'Short Answer' },
                                    { value: 'coding', label: 'Coding' },
                                ]}
                                value={questionForm.question_type}
                                onChange={(val) => setQuestionForm({ ...questionForm, question_type: val as any })}
                                placeholder="Select question type"
                            />
                        </div>
                        <div>
                            <label className="font-semibold mb-1 block text-xs">Marks weight <span className="text-danger">*</span></label>
                            <input type="number" min="1" className="form-input rounded-lg text-xs" required value={questionForm.marks} onChange={(e) => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })} />
                        </div>
                    </div>

                    {questionForm.question_type === 'mcq' && (
                        <div className="animate-fade-in">
                            <label className="font-semibold mb-1 block text-xs">MCQ options (Comma-separated)</label>
                            <input className="form-input rounded-lg text-xs" placeholder="Option A, Option B, Option C, Option D" value={questionForm.optionsRaw} onChange={(e) => setQuestionForm({ ...questionForm, optionsRaw: e.target.value })} />
                        </div>
                    )}

                    <div>
                        <label className="font-semibold mb-1 block text-xs">Correct Answer key <span className="text-danger">*</span></label>
                        <input className="form-input rounded-lg text-xs" required placeholder={questionForm.question_type === 'true_false' ? 'True or False' : 'e.g. Option A'} value={questionForm.correct_answer} onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                        <Button variant="outline-danger" className="text-xs" type="button"  onClick={() => setAddQuestionOpen(false)}>Cancel</Button>
                        <Button className="!px-5 text-xs" type="submit"  disabled={saving}>
                            {saving ? 'Saving...' : 'Save Question'}
                        </Button>
                    </div>
                </form>

            </Modal>

            {/* Attempts Logs Modal */}
            <Modal open={attemptsModalOpen} onClose={() => setAttemptsModalOpen(false)} title={<>Attempt sheets: {selectedAssessment?.title}</>} size="3xl">
                {attemptsLoading ? (
                    <div className="py-10 text-center text-gray-400 animate-pulse">Loading attempt sheets...</div>
                ) : attempts.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-[#0e1726]/20 border border-dashed rounded-lg border-gray-200 dark:border-gray-800">
                        No employees have attempted this quiz yet.
                    </div>
                ) : (
                    <div className="table-responsive border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg">
                        <table className="table-hover text-xs">
                            <thead>
                                <tr>
                                    <th>Employee Details</th>
                                    <th>ID</th>
                                    <th>Attempt #</th>
                                    <th>Grade score</th>
                                    <th>Result status</th>
                                    <th>Submitted Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attempts.map((att) => (
                                    <tr key={att.id}>
                                        <td className="font-semibold text-gray-800 dark:text-gray-200">{att.employee_name}</td>
                                        <td className="font-mono text-gray-500">{att.employee_id}</td>
                                        <td>#{att.attempt_number}</td>
                                        <td className="font-bold text-primary">{att.score} %</td>
                                        <td>
                                            <span className={`badge text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                att.is_passed ? 'bg-success text-white' : 'bg-danger text-white'
                                            }`}>
                                                {att.is_passed ? 'Pass' : 'Fail'}
                                            </span>
                                        </td>
                                        <td>{new Date(att.submitted_at || att.started_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end pt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                    <Button variant="outline-danger" type="button"  onClick={() => setAttemptsModalOpen(false)}>Close Logs</Button>
                </div>

            </Modal>
        </div>
    );
};

export default AssessmentManager;
