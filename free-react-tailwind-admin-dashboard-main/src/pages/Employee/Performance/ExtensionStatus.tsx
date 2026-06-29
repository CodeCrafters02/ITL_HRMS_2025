import PerformanceComingSoon from './PerformanceComingSoon';

const ExtensionStatus = () => {
    return (
        <PerformanceComingSoon
            title="Extension Status"
            desc="Track requested deadline extensions or grace periods inside the appraisal system if you require more time to fill your reviews."
            plannedFeatures={[
                'Extension request submission forms',
                'Status tracker (Pending / Approved / Denied)',
                'Deadline calendar updates logs',
                'Automatic remainder settings panel'
            ]}
        />
    );
};

export default ExtensionStatus;
