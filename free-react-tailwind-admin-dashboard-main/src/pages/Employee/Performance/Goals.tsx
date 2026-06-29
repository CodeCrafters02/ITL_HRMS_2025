import PerformanceComingSoon from './PerformanceComingSoon';

const Goals = () => {
    return (
        <PerformanceComingSoon
            title="My Goals & Targets"
            desc="Track your personal objectives, check key results progress, and view live speedometer-style gauges representing target achievements."
            plannedFeatures={[
                'OKR & KPI goal setting dashboard',
                'Visual progress gauges and status bars',
                'Milestones and key result target inputs',
                'Historical performance logs'
            ]}
        />
    );
};

export default Goals;
