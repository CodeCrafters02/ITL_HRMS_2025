import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const ReviewQuestions = () => {
    return (
        <AdminPerformanceComingSoon
            title="Create Review Questions"
            desc="Construct standard appraisal questionnaires, rating rubrics, and feedback prompts for periodic performance cycles."
            plannedFeatures={[
                'Custom questionnaire builder canvas',
                'Rating scale templates manager (1-5, HML, etc.)',
                'Peer vs. Manager review questionnaire templates',
                'Active questions inventory'
            ]}
        />
    );
};

export default ReviewQuestions;
