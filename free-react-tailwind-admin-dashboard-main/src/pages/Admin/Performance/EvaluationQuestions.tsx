import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const EvaluationQuestions = () => {
    return (
        <AdminPerformanceComingSoon
            title="Create Summary Evaluation Questions"
            desc="Configure final manager evaluation questions, core promotion recommendations checklists, and executive summary prompts."
            plannedFeatures={[
                'Executive evaluation templates designer',
                'Hike & promotion eligibility checklists',
                'Performance summary rating grids configuration',
                'Historical evaluation template database'
            ]}
        />
    );
};

export default EvaluationQuestions;
