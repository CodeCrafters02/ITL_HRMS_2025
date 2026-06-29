import PerformanceComingSoon from './PerformanceComingSoon';

const AppraisalHistory = () => {
    return (
        <PerformanceComingSoon
            title="Historical Appraisal Records"
            desc="Review your past finalized evaluations, manager feedback reviews, historical ratings, and overall scorecards."
            plannedFeatures={[
                'PDF scorecard download tools',
                'Historical performance ratings comparison charts',
                'Manager overall feedback summaries',
                'Promotion and bonus evaluation records logs'
            ]}
        />
    );
};

export default AppraisalHistory;
