import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const KRARegistry = () => {
    return (
        <AdminPerformanceComingSoon
            title="KRA Master Registry & Links"
            desc="Add, modify, and manage the master registry of Key Result Areas (KRAs) and link them to various designation templates."
            plannedFeatures={[
                'Corporate KRA registry repository database',
                'Designation templates mapping dashboards',
                'Bulk linkage updates controls',
                'KRA usage tracking audits'
            ]}
        />
    );
};

export default KRARegistry;
