import PerformanceComingSoon from './PerformanceComingSoon';

const SelfAppraisal = () => {
    return (
        <PerformanceComingSoon
            title="Add Self-Appraisal"
            desc="Participate in active review cycles by inputting your personal performance scorecards, accomplishments logs, and goals review notes."
            plannedFeatures={[
                'Appraisal rating input matrices',
                'Accomplishments details input editors',
                'Core competencies self-evaluation',
                'Submit directly to manager for sign-off'
            ]}
        />
    );
};

export default SelfAppraisal;
