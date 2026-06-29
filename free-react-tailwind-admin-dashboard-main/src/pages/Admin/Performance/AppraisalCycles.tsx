import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const AppraisalCycles = () => {
    return (
        <AdminPerformanceComingSoon
            title="Create Appraisal Cycles"
            desc="Configure and launch review cycles, set submission timelines, and monitor workflow status across the organization."
            plannedFeatures={[
                'Appraisal cycle scheduler & triggers',
                'Custom deadline and notifications setups',
                'Real-time employee appraisal track map',
                'Periodic reminder triggers setup'
            ]}
        />
    );
};

export default AppraisalCycles;
