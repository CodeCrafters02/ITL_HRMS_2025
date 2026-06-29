import PerformanceComingSoon from './PerformanceComingSoon';

const Competencies = () => {
    return (
        <PerformanceComingSoon
            title="Core Competencies"
            desc="Review your designated core behavioral expectations and competencies mapped to your role."
            plannedFeatures={[
                'Behavioral rubric matrices',
                'Proficiency levels definitions',
                'Role expected performance expectations',
                'Self-assessment rating logs'
            ]}
        />
    );
};

export default Competencies;
