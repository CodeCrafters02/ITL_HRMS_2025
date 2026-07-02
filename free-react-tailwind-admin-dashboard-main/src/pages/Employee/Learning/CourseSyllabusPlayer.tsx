import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconPlus from '../../../components/Icon/IconPlus';
import IconOpenBook from '../../../components/Icon/IconOpenBook';
import IconMenuCalendar from '../../../components/Icon/Menu/IconMenuCalendar';
import IconX from '../../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const ENROLLMENT_DETAIL_API = (id: string) => `${API_BASE_URL}/employee/enrollments/${id}/`;
const CONTENTS_API = `${API_BASE_URL}/employee/course-contents/`;
const PROGRESS_API = `${API_BASE_URL}/employee/lesson-progresses/`;
const ASSESSMENTS_API = `${API_BASE_URL}/employee/assessments/`;
const QUESTIONS_API = `${API_BASE_URL}/employee/assessment-questions/`;
const ATTEMPTS_API = `${API_BASE_URL}/employee/assessment-attempts/`;
const ASSIGNMENTS_API = `${API_BASE_URL}/employee/assignments/`;
const SUBMISSIONS_API = `${API_BASE_URL}/employee/assignment-submissions/`;

const REVIEWS_API = `${API_BASE_URL}/employee/course-reviews/`;

type ContentType = {
    id: number;
    title: string;
    description?: string;
    content_type: 'video' | 'pdf' | 'document' | 'link';
    file_path?: string | null;
    file_path_url?: string | null;
    external_url?: string;
    order: number;
};

type ProgressType = {
    content: number;
};

type AssessmentType = {
    id: number;
    title: string;
    assessment_type: string;
    pass_marks: number;
    time_limit_minutes?: number | null;
    max_attempts: number;
    questions_count: number;
};

type QuestionType = {
    id: number;
    question_text: string;
    question_type: 'mcq' | 'true_false' | 'short_answer';
    options: string[];
    correct_answer: string;
    marks: number;
};

type AssignmentType = {
    id: number;
    title: string;
    description: string;
    due_date: string;
    max_marks: number;
};

type SubmissionType = {
    id: number;
    assignment: number;
    submitted_file?: string | null;
    submitted_file_url?: string | null;
    status: 'submitted' | 'late' | 'graded';
    marks_obtained?: number | null;
    trainer_comments?: string;
};

const CourseSyllabusPlayer = () => {
    const dispatch = useDispatch();
    const { id: enrollmentId } = useParams<{ id: string }>();

    const [enrollment, setEnrollment] = useState<any>(null);
    const [contents, setContents] = useState<ContentType[]>([]);
    const [completedLessons, setCompletedLessons] = useState<number[]>([]);
    const [quizzes, setQuizzes] = useState<AssessmentType[]>([]);
    const [assignments, setAssignments] = useState<AssignmentType[]>([]);
    
    // Submissions map
    const [submissions, setSubmissions] = useState<Record<number, SubmissionType>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Sidebar selectors
    const [activeItem, setActiveItem] = useState<{
        type: 'lecture' | 'quiz' | 'assignment';
        id: number;
    } | null>(null);

    // Quiz evaluation states
    const [quizQuestions, setQuizQuestions] = useState<QuestionType[]>([]);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null);

    // Assignment Upload states
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    // Course Review state
    const [reviewed, setReviewed] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComments, setReviewComments] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Course Syllabus Player'));
        if (enrollmentId) {
            loadSyllabusData();
        }
    }, [enrollmentId, dispatch]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const loadSyllabusData = async () => {
        setLoading(true);
        try {
            // 1. Fetch enrollment metadata
            const enrRes = await authFetch(ENROLLMENT_DETAIL_API(enrollmentId!), { headers: getHeaders() });
            if (!enrRes.ok) throw new Error('Enrollment fetch failed');
            const enrData = await enrRes.json();
            setEnrollment(enrData);

            const courseId = enrData.course;

            // 2. Fetch course contents, progress logs, assessments, assignments, active submissions, and reviews in parallel
            const headers = getHeaders();
            const [contentsRes, progressRes, quizRes, assRes, subRes, reviewsRes] = await Promise.all([
                authFetch(`${CONTENTS_API}?course_id=${courseId}`, { headers }),
                authFetch(`${PROGRESS_API}?enrollment_id=${enrollmentId}`, { headers }),
                authFetch(`${ASSESSMENTS_API}?course_id=${courseId}`, { headers }),
                authFetch(`${ASSIGNMENTS_API}?course_id=${courseId}`, { headers }),
                authFetch(SUBMISSIONS_API, { headers }),
                authFetch(`${REVIEWS_API}?course_id=${courseId}`, { headers }),
            ]);
            if (contentsRes.ok) {
                const contentsData = await contentsRes.json();
                const mappedContents = (contentsData.results || contentsData || []).map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    description: c.description,
                    content_type: c.content_type,
                    file_path: c.file || null,
                    file_path_url: c.file_url || c.file || null,
                    external_url: c.external_url,
                    order: c.sequence || 0,
                }));
                const sorted = mappedContents.sort((a: any, b: any) => a.order - b.order);
                setContents(sorted);
                // Pre-select first syllabus item
                if (sorted.length > 0) {
                    setActiveItem({ type: 'lecture', id: sorted[0].id });
                }
            }

            if (progressRes.ok) {
                const progressData = await progressRes.json();
                setCompletedLessons((progressData.results || progressData || []).map((p: ProgressType) => p.content));
            }

            if (quizRes.ok) {
                const quizData = await quizRes.json();
                setQuizzes(quizData.results || quizData || []);
            }

            if (assRes.ok) {
                const assData = await assRes.json();
                setAssignments(assData.results || assData || []);
            }

            if (subRes.ok) {
                const subData = await subRes.json();
                const subMap: Record<number, SubmissionType> = {};
                (subData.results || subData || []).forEach((s: SubmissionType) => {
                    subMap[s.assignment] = s;
                });
                setSubmissions(subMap);
            }

            if (reviewsRes.ok) {
                const reviewsData = await reviewsRes.json();
                const myReview = (reviewsData.results || reviewsData || []).find((r: any) => r.employee_name === enrData.employee_name);
                if (myReview) {
                    setReviewed(true);
                }
            }

        } catch (error) {
            console.error('Error fetching syllabus data:', error);
            Swal.fire('Error!', 'Could not load syllabus files.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Calculate dynamic progress
    const computedProgress = useMemo(() => {
        if (contents.length === 0) return 0;
        return Math.round((completedLessons.length / contents.length) * 100);
    }, [contents, completedLessons]);

    // Active item objects
    const activeLecture = useMemo(() => {
        if (activeItem?.type !== 'lecture') return null;
        return contents.find((c) => c.id === activeItem.id) || null;
    }, [contents, activeItem]);

    const activeQuiz = useMemo(() => {
        if (activeItem?.type !== 'quiz') return null;
        return quizzes.find((q) => q.id === activeItem.id) || null;
    }, [quizzes, activeItem]);

    const activeAssignment = useMemo(() => {
        if (activeItem?.type !== 'assignment') return null;
        return assignments.find((a) => a.id === activeItem.id) || null;
    }, [assignments, activeItem]);

    // Triggers when a lecture/quiz/assignment is clicked in sidebar
    const handleSelectNavItem = (type: 'lecture' | 'quiz' | 'assignment', id: number) => {
        setActiveItem({ type, id });
        if (type === 'quiz') {
            // Load questions
            setQuizQuestions([]);
            setQuizAnswers({});
            setQuizSubmitted(false);
            setQuizResult(null);
            fetchQuizQuestions(id);
        }
    };

    const fetchQuizQuestions = async (assessmentId: number) => {
        try {
            const response = await authFetch(`${QUESTIONS_API}?assessment_id=${assessmentId}`, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setQuizQuestions(data.results || data || []);
            }
        } catch (error) {
            console.error('Could not load quiz questions:', error);
        }
    };

    // Mark content item completed
    const handleMarkComplete = async (contentId: number) => {
        if (completedLessons.includes(contentId)) return;

        setSaving(true);
        try {
            const response = await authFetch(PROGRESS_API, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    enrollment: Number(enrollmentId),
                    content: contentId,
                }),
            });

            if (response.ok) {
                setCompletedLessons((prev) => [...prev, contentId]);
                // Refresh progress percentage metrics in enrollment view
                const enrRes = await authFetch(ENROLLMENT_DETAIL_API(enrollmentId!), { headers: getHeaders() });
                if (enrRes.ok) {
                    const enrData = await enrRes.json();
                    setEnrollment(enrData);
                }
            }
        } catch {
            Swal.fire('Error!', 'Could not mark lesson complete.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Evaluation sheet submit
    const handleSubmitQuiz = async () => {
        if (!activeQuiz) return;

        // Check if all answered
        const unanswered = quizQuestions.filter((q) => !quizAnswers[q.id]);
        if (unanswered.length > 0) {
            Swal.fire('Error!', 'Please answer all questions before submitting.', 'error');
            return;
        }

        // Calculate marks
        let scoreObtained = 0;
        let totalMarks = 0;

        quizQuestions.forEach((q) => {
            totalMarks += q.marks;
            const chosen = (quizAnswers[q.id] || '').trim().toLowerCase();
            const correct = q.correct_answer.trim().toLowerCase();
            if (chosen === correct) {
                scoreObtained += q.marks;
            }
        });

        const pct = totalMarks > 0 ? Math.round((scoreObtained / totalMarks) * 100) : 100;
        const passed = pct >= activeQuiz.pass_marks;

        setSaving(true);
        try {
            const response = await authFetch(ATTEMPTS_API, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    assessment: activeQuiz.id,
                    enrollment: Number(enrollmentId),
                    score: pct,
                    is_passed: passed,
                }),
            });

            if (response.ok) {
                setQuizResult({ score: pct, passed });
                setQuizSubmitted(true);

                Swal.fire({
                    title: passed ? 'Passed!' : 'Failed!',
                    text: `You scored ${pct}% in the quiz assessment.`,
                    icon: passed ? 'success' : 'warning',
                });
            } else {
                Swal.fire('Error!', 'Could not submit attempt.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Upload Assignment Submission file
    const handleUploadAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!activeAssignment || !uploadFile) return;

        setSaving(true);
        const formData = new FormData();
        formData.append('assignment', String(activeAssignment.id));
        formData.append('submitted_file', uploadFile);

        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        try {
            const url = submissions[activeAssignment.id]
                ? `${SUBMISSIONS_API}${submissions[activeAssignment.id].id}/`
                : SUBMISSIONS_API;
            const method = submissions[activeAssignment.id] ? 'PATCH' : 'POST';

            const response = await authFetch(url, {
                method: method,
                headers: headers,
                body: formData,
            });

            if (response.ok) {
                const sub = await response.json();
                setSubmissions((prev) => ({ ...prev, [activeAssignment.id]: sub }));
                setUploadFile(null);
                Swal.fire('Submitted!', 'Project files uploaded successfully.', 'success');
            } else {
                Swal.fire('Error!', 'File upload failed.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server communication failed.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveReview = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await authFetch(REVIEWS_API, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    course: enrollment.course,
                    rating: reviewRating,
                    review_text: reviewComments,
                }),
            });
            if (response.ok) {
                setReviewed(true);
                Swal.fire('Thank you!', 'Your feedback review has been recorded.', 'success');
            } else {
                Swal.fire('Error!', 'Failed to save review.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-160px)]">
            {/* Left Panel: Course Curriculum Checklists */}
            <div className="w-full lg:w-80 panel border border-[#e0e6ed] dark:border-[#1b2e4b] p-4 flex flex-col justify-between h-auto lg:h-[calc(100vh-160px)] overflow-y-auto bg-white dark:bg-[#0e1726]/40">
                <div>
                    <div className="pb-4 border-b border-[#ebedf2] dark:border-[#1b2e4b] mb-4">
                        <Link to="/employee/learning-management/my-learning" className="text-xs text-primary hover:underline font-bold block mb-2">
                            ← Back to Dashboard
                        </Link>
                        <h2 className="text-base font-extrabold text-gray-800 dark:text-white-light leading-snug line-clamp-2">
                            {enrollment?.course_title || 'Course Player'}
                        </h2>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mt-3 mb-1">
                            <span>Syllabus Completed</span>
                            <span>{computedProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-850 rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${computedProgress}%` }}></div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5 text-gray-400 animate-pulse text-xs">Loading structure...</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Lectures List */}
                            <div>
                                <h4 className="font-extrabold text-[10px] uppercase text-gray-400 tracking-wider mb-2">Lectures & Media</h4>
                                {contents.length === 0 ? (
                                    <div className="text-xs text-gray-400 italic">No lectures uploaded.</div>
                                ) : (
                                    <ul className="space-y-1.5 text-xs">
                                        {contents.map((item) => {
                                            const done = completedLessons.includes(item.id);
                                            const active = activeItem?.type === 'lecture' && activeItem.id === item.id;
                                            return (
                                                <li key={item.id}>
                                                    <button
                                                        type="button"
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                                                            active
                                                                ? 'border-primary bg-primary/5 text-primary font-bold'
                                                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-650 dark:text-gray-355'
                                                        }`}
                                                        onClick={() => handleSelectNavItem('lecture', item.id)}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <span>{item.content_type === 'video' ? '🎥' : item.content_type === 'pdf' ? '📄' : '🔗'}</span>
                                                            <span className="truncate">{item.title}</span>
                                                        </div>
                                                        {done && <span className="text-success font-bold">✓</span>}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            {/* Quizzes List */}
                            {quizzes.length > 0 && (
                                <div>
                                    <h4 className="font-extrabold text-[10px] uppercase text-gray-400 tracking-wider mb-2">Assessments & Quizzes</h4>
                                    <ul className="space-y-1.5 text-xs">
                                        {quizzes.map((q) => {
                                            const active = activeItem?.type === 'quiz' && activeItem.id === q.id;
                                            return (
                                                <li key={q.id}>
                                                    <button
                                                        type="button"
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                                                            active
                                                                ? 'border-primary bg-primary/5 text-primary font-bold'
                                                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-650 dark:text-gray-355'
                                                        }`}
                                                        onClick={() => handleSelectNavItem('quiz', q.id)}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <span>📝</span>
                                                            <span className="truncate">{q.title}</span>
                                                        </div>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}

                            {/* Assignments List */}
                            {assignments.length > 0 && (
                                <div>
                                    <h4 className="font-extrabold text-[10px] uppercase text-gray-400 tracking-wider mb-2">Projects & Homework</h4>
                                    <ul className="space-y-1.5 text-xs">
                                        {assignments.map((a) => {
                                            const active = activeItem?.type === 'assignment' && activeItem.id === a.id;
                                            const hasSub = submissions[a.id];
                                            return (
                                                <li key={a.id}>
                                                    <button
                                                        type="button"
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                                                            active
                                                                ? 'border-primary bg-primary/5 text-primary font-bold'
                                                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-650 dark:text-gray-355'
                                                        }`}
                                                        onClick={() => handleSelectNavItem('assignment', a.id)}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <span>📁</span>
                                                            <span className="truncate">{a.title}</span>
                                                        </div>
                                                        {hasSub && (
                                                            <span className={`text-[9px] uppercase font-bold text-success`}>
                                                                {hasSub.status}
                                                            </span>
                                                        )}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Content Interactive Viewer / Test Box */}
            <div className="flex-1 panel border border-[#e0e6ed] dark:border-[#1b2e4b] p-6 min-h-[450px] bg-white dark:bg-[#0e1726]/40 flex flex-col">
                {loading ? (
                    <div className="m-auto text-center text-gray-400 font-semibold animate-pulse">Loading active media...</div>
                ) : activeItem === null ? (
                    computedProgress === 100 ? (
                        <div className="m-auto text-center max-w-md p-6 bg-[#8b5cf6]/5 border border-dashed border-[#8b5cf6]/35 rounded-xl shadow-sm">
                            <span className="text-5xl block mb-3">🏆</span>
                            <h3 className="text-xl font-extrabold text-gray-800 dark:text-white">Congratulations!</h3>
                            <p className="text-xs text-gray-500 mt-2 mb-6 leading-relaxed">
                                You have successfully completed 100% of the syllabus contents for this course.
                            </p>

                            {reviewed ? (
                                <div className="bg-white/40 dark:bg-black/10 p-3 rounded-lg text-xs text-success font-bold">
                                    ✓ You have submitted your rating review for this course. Thank you!
                                </div>
                            ) : (
                                <form onSubmit={handleSaveReview} className="space-y-4 text-left">
                                    <h4 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider text-center mb-2">Share Your Feedback</h4>
                                    
                                    <div className="text-center">
                                        <label className="font-bold text-xs mb-1 block">Rating score (1 to 5 Stars)</label>
                                        <div className="flex justify-center gap-2 mt-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setReviewRating(star)}
                                                    className={`text-2xl transition-all duration-300 outline-none ${
                                                        reviewRating >= star ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'
                                                    }`}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="font-bold text-xs mb-1 block">Review remarks</label>
                                        <textarea
                                            className="form-textarea min-h-[85px] rounded-lg text-xs"
                                            required
                                            placeholder="How was the trainer and syllabus contents? Share your experience..."
                                            value={reviewComments}
                                            onChange={(e) => setReviewComments(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn btn-primary rounded-lg text-xs py-2 w-full shadow-md"
                                    >
                                        {saving ? 'Submitting...' : 'Submit Feedback Review'}
                                    </button>
                                </form>
                            )}
                        </div>
                    ) : (
                        <div className="m-auto text-center text-gray-500 italic max-w-sm">
                            Choose a syllabus content piece from the left checklists to start studying.
                        </div>
                    )
                ) : (
                    <div className="flex flex-col h-full flex-grow">
                        {/* Lecture Player */}
                        {activeItem.type === 'lecture' && activeLecture && (
                            <div className="flex flex-col h-full flex-grow">
                                <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-4 mb-4 flex flex-wrap justify-between items-center gap-4">
                                    <div>
                                        <h2 className="text-xl font-extrabold text-gray-800 dark:text-white-light">{activeLecture.title}</h2>
                                        <p className="text-xs text-gray-400 mt-1">{activeLecture.description || 'Watch or read the uploaded training documentation.'}</p>
                                    </div>
                                    {activeLecture.file_path_url && (
                                        <a
                                            href={activeLecture.file_path_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            download
                                            className="btn btn-outline-primary btn-sm rounded-lg text-xs py-1.5 px-3 font-bold gap-1.5 flex items-center"
                                        >
                                            📥 Download / Open Resource
                                        </a>
                                    )}
                                </div>

                                <div className="flex-grow bg-gray-900/5 dark:bg-black/30 rounded-xl overflow-hidden flex items-center justify-center p-4 border border-gray-100 dark:border-gray-800 min-h-[300px]">
                                    {activeLecture.content_type === 'video' ? (
                                        activeLecture.file_path_url ? (
                                            <video controls className="w-full max-h-[400px] bg-black" src={activeLecture.file_path_url}></video>
                                        ) : (
                                            <div className="text-center p-10 max-w-md">
                                                <span className="text-5xl block mb-3">🎥</span>
                                                <div className="font-bold text-gray-700 dark:text-gray-250">Virtual Video Tutorial</div>
                                                <p className="text-xs text-gray-400 mt-1">Video stream is ready for review.</p>
                                            </div>
                                        )
                                    ) : activeLecture.content_type === 'pdf' ? (
                                        activeLecture.file_path_url ? (
                                            <iframe src={activeLecture.file_path_url} title={activeLecture.title} className="w-full h-[450px] border-0 rounded-lg"></iframe>
                                        ) : (
                                            <div className="text-center p-10">
                                                <span className="text-5xl block mb-3">📄</span>
                                                <div className="font-bold text-gray-700 dark:text-gray-250">Document File Ready</div>
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-center p-10 max-w-sm">
                                            <span className="text-5xl block mb-3">🔗</span>
                                            <div className="font-bold text-gray-800 dark:text-white mb-2">External Study Link</div>
                                            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                                                This lecture content is hosted on an external learning portal. Click the link below to view.
                                            </p>
                                            <a
                                                href={activeLecture.external_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-primary rounded-lg text-xs"
                                            >
                                                Open External Portal
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        className="btn btn-success rounded-lg font-bold text-xs py-2 px-6"
                                        disabled={completedLessons.includes(activeLecture.id) || saving}
                                        onClick={() => handleMarkComplete(activeLecture.id)}
                                    >
                                        {completedLessons.includes(activeLecture.id) ? '✓ Completed' : 'Mark Lesson Complete'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Quiz Panel */}
                        {activeItem.type === 'quiz' && activeQuiz && (
                            <div className="flex flex-col h-full flex-grow">
                                <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-4 mb-4">
                                    <h2 className="text-xl font-extrabold text-gray-800 dark:text-white-light">{activeQuiz.title}</h2>
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-2 font-medium">
                                        <span>Passing Criteria: <strong className="text-primary">{activeQuiz.pass_marks}%</strong></span>
                                        {activeQuiz.time_limit_minutes && <span>Time Limit: <strong>{activeQuiz.time_limit_minutes} Mins</strong></span>}
                                        <span>Questions count: <strong>{quizQuestions.length} Qs</strong></span>
                                    </div>
                                </div>

                                {quizSubmitted ? (
                                    <div className="m-auto text-center max-w-sm p-6 bg-gray-55 dark:bg-black/25 rounded-xl border border-gray-150">
                                        <span className="text-4xl block mb-2">{quizResult?.passed ? '🎉' : '⚠️'}</span>
                                        <h3 className="text-lg font-extrabold text-gray-800 dark:text-white">
                                            {quizResult?.passed ? 'Passed successfully!' : 'Score below passing criteria'}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-2">You achieved a score of <strong>{quizResult?.score}%</strong>.</p>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm rounded-lg mt-5 mx-auto"
                                            onClick={() => { setQuizSubmitted(false); setQuizAnswers({}); setQuizResult(null); }}
                                        >
                                            Retake Assessment
                                        </button>
                                    </div>
                                ) : quizQuestions.length === 0 ? (
                                    <div className="m-auto text-center text-gray-400 italic">No questions mapped for this quiz.</div>
                                ) : (
                                    <div className="space-y-6 overflow-y-auto max-h-[400px] pr-2">
                                        {quizQuestions.map((q, idx) => (
                                            <div key={q.id} className="p-4 border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl bg-gray-50 dark:bg-black/10">
                                                <div className="text-xs font-bold text-gray-450 uppercase mb-2">Question {idx + 1} ({q.marks} Marks)</div>
                                                <p className="text-sm font-bold text-gray-850 dark:text-gray-250 mb-3">{q.question_text}</p>
                                                {q.question_type === 'mcq' || q.question_type === 'true_false' ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {q.options.map((opt) => (
                                                            <label
                                                                key={opt}
                                                                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all duration-300 flex items-center gap-2.5 font-medium ${
                                                                    quizAnswers[q.id] === opt
                                                                        ? 'border-primary bg-primary/5 text-primary'
                                                                        : 'border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 bg-white/40 dark:bg-[#0e1726]/10'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${q.id}`}
                                                                    value={opt}
                                                                    checked={quizAnswers[q.id] === opt}
                                                                    onChange={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                                                    className="text-primary focus:ring-primary h-3.5 w-3.5"
                                                                />
                                                                <span>{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="form-input rounded-lg text-xs"
                                                        placeholder="Write your short answer key here..."
                                                        value={quizAnswers[q.id] || ''}
                                                        onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                                    />
                                                )}
                                            </div>
                                        ))}

                                        <div className="flex justify-end pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b]">
                                            <button
                                                type="button"
                                                className="btn btn-primary rounded-lg font-bold text-xs py-2 px-6"
                                                onClick={handleSubmitQuiz}
                                                disabled={saving}
                                            >
                                                Submit Evaluation Sheets
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Assignment Panel */}
                        {activeItem.type === 'assignment' && activeAssignment && (() => {
                            const sub = submissions[activeAssignment.id];
                            return (
                                <div className="flex flex-col h-full flex-grow">
                                    <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-4 mb-4">
                                        <h2 className="text-xl font-extrabold text-gray-800 dark:text-white-light">{activeAssignment.title}</h2>
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-2 font-medium">
                                            <span>Max Points: <strong className="text-primary">{activeAssignment.max_marks} Pts</strong></span>
                                            <span>Deadline Due: <strong className="text-danger">{new Date(activeAssignment.due_date).toLocaleString()}</strong></span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 dark:bg-black/10 border border-gray-150 dark:border-gray-800 rounded-xl mb-6">
                                        <h4 className="font-extrabold text-xs text-gray-400 mb-1">Instructions</h4>
                                        <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed font-medium">
                                            {activeAssignment.description || 'Read parameters carefully and upload your final code/solution files.'}
                                        </p>
                                    </div>

                                    {/* Submission status and review */}
                                    {sub && (
                                        <div className="p-4 bg-success-light/10 dark:bg-success-dark/10 border border-success/15 rounded-xl mb-6 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-success">Submission Status:</span>
                                                <span className="badge badge-success capitalize">{sub.status}</span>
                                            </div>
                                            {sub.marks_obtained !== null && (
                                                <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                                    Score: <strong className="text-success">{sub.marks_obtained}</strong> / {activeAssignment.max_marks} Pts
                                                </div>
                                            )}
                                            {sub.trainer_comments && (
                                                <div className="text-xs bg-white dark:bg-black/10 p-3 rounded-lg border border-success/10 text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                                    <strong>Instructor Feedback comments:</strong> {sub.trainer_comments}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Submission uploader */}
                                    {(!sub || sub.status !== 'graded') && (
                                        <form onSubmit={handleUploadAssignment} className="space-y-4 mt-auto">
                                            <div>
                                                <label className="font-semibold mb-2 block text-xs">Upload Submission Files <span className="text-danger">*</span></label>
                                                <input
                                                    type="file"
                                                    required
                                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                    className="form-input text-xs border-dashed border-2 py-6 text-center cursor-pointer rounded-xl bg-gray-50/20 dark:bg-black/5"
                                                />
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={saving || !uploadFile}
                                                    className="btn btn-primary rounded-lg text-xs py-2 px-6 shadow-md"
                                                >
                                                    {saving ? 'Uploading...' : sub ? 'Update Submission' : 'Submit Assignment'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseSyllabusPlayer;
