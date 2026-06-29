import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const ImportModule = () => {
    return (
        <AdminPerformanceComingSoon
            title="Performance Data Import"
            desc="Import historical performance rating scorecards, active skills checklists, and past appraisal records."
            plannedFeatures={[
                'Spreadsheet CSV / XLSX data parser',
                'Historical data schemas mapper',
                'Integrity check and database validations',
                'Import records audits logs'
            ]}
        />
    );
};

export default ImportModule;
