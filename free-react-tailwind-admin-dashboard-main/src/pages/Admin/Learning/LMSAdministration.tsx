import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import CourseCategory from './CourseCategory';
import AssessmentManager from './AssessmentManager';

const LMSAdministration = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState<'categories' | 'quizzes'>('categories');

    useEffect(() => {
        dispatch(setPageTitle('LMS Administration'));
    }, [dispatch]);

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">LMS Administration</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        Configure learning options, organise course categories, and evaluate quizzes.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Tabbed Navigation */}
            <div className="flex border-b border-[#ebedf2] dark:border-[#1b2e4b] mb-6 overflow-x-auto">
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
                <button
                    type="button"
                    onClick={() => setActiveTab('quizzes')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-all duration-300 ${
                        activeTab === 'quizzes'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-primary'
                    }`}
                >
                    Course Quizzes
                </button>
            </div>

            {/* Render Tab Contents */}
            <div className="animate-fade-in">
                {activeTab === 'categories' && <CourseCategory />}
                {activeTab === 'quizzes' && <AssessmentManager />}
            </div>
        </div>
    );
};

export default LMSAdministration;
