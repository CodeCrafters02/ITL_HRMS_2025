import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const ImportGoals = () => {
    return (
        <AdminPerformanceComingSoon
            title="Bulk Import Corporate Goals"
            desc="Import high-level corporate objectives, department KPIs, and core targets from external spreadsheets."
            plannedFeatures={[
                'Spreadsheet CSV / XLSX upload parser',
                'Schema headers data mapping selector',
                'Duplicate checking and validations',
                'Bulk insertion success summary reports'
            ]}
        />
    );
};

export default ImportGoals;
