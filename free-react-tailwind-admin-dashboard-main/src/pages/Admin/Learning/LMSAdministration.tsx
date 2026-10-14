import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSettings from '../../../components/Icon/IconSettings';
import PageHeader from '../../../components/Common/PageHeader';
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
            <PageHeader
                title="LMS Administration"
                subtitle="Configure learning taxonomy, organize course categories, curate question banks, and administer evaluations."
                icon={<IconSettings />}
                badge="LMS Governance"
                variant="purple"
            />

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
