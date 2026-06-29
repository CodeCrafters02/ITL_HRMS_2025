import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const MultiRaterSelection = () => {
    return (
        <AdminPerformanceComingSoon
            title="Multi-Rater Review Selection"
            desc="Map peer groups, assign cross-functional reviewers, and manage 360-degree feedback configurations for employees."
            plannedFeatures={[
                'Multi-rater assignment mapping grid',
                'Peer reviewer nominations approval triggers',
                'Review relationships validations',
                'Peer survey progress metrics tracker'
            ]}
        />
    );
};

export default MultiRaterSelection;
