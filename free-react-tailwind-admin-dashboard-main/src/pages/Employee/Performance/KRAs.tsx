import PerformanceComingSoon from './PerformanceComingSoon';

const KRAs = () => {
    return (
        <PerformanceComingSoon
            title="My Key Result Areas (KRAs)"
            desc="View your assigned Key Result Areas mapping out the primary roles and operational duties mapped to your designation."
            plannedFeatures={[
                'Role-specific KRA matrices',
                'Weightage assignments per category',
                'Alignment with company objectives',
                'Periodic update logs'
            ]}
        />
    );
};

export default KRAs;
