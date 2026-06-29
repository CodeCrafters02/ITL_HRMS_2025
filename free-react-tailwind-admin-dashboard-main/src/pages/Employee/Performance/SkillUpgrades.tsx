import PerformanceComingSoon from './PerformanceComingSoon';

const SkillUpgrades = () => {
    return (
        <PerformanceComingSoon
            title="Skill Level Upgrades"
            desc="Request evaluations or submit evidence to upgrade your verified skill proficiency levels inside the company system."
            plannedFeatures={[
                'Upgrade request submission forms',
                'Certificates and project links upload',
                'Technical panel evaluation scheduler',
                'Approval status tracker'
            ]}
        />
    );
};

export default SkillUpgrades;
