import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const ExportModule = () => {
    return (
        <AdminPerformanceComingSoon
            title="Performance Data Export"
            desc="Export active performance matrices, employee OKR trackers, and finalized appraisal ratings reports."
            plannedFeatures={[
                'Filters and columns layout configurator',
                'Export file formats (Excel, CSV, JSON)',
                'Reports scheduling automation setup',
                'Secure data transmission settings'
            ]}
        />
    );
};

export default ExportModule;
