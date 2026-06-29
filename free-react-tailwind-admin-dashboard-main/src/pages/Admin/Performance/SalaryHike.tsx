import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const SalaryHike = () => {
    return (
        <AdminPerformanceComingSoon
            title="Configure Salary Hike Cycles"
            desc="Manage the budget parameters and rules mapping performance scorecards directly to proposed salary adjustment cycles."
            plannedFeatures={[
                'Performance rating to hike percentage mapping matrices',
                'Hike cycles budget allocation controls',
                'Salary structures compatibility validations',
                'Hike approval flow dashboard'
            ]}
        />
    );
};

export default SalaryHike;
