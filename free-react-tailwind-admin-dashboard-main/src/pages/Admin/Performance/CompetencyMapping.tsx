import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const CompetencyMapping = () => {
    return (
        <AdminPerformanceComingSoon
            title="Competency Master Inventory"
            desc="Configure behavioral expectations, core capability descriptions, and skill rubrics inside the master repository."
            plannedFeatures={[
                'Competency library framework editor',
                'Skill level descriptor matrices (1 to 5)',
                'Job description alignments controls',
                'Designation competency templates manager'
            ]}
        />
    );
};

export default CompetencyMapping;
