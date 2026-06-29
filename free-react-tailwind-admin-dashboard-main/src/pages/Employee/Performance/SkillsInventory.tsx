import PerformanceComingSoon from './PerformanceComingSoon';

const SkillsInventory = () => {
    return (
        <PerformanceComingSoon
            title="Skill Sets Inventory"
            desc="Keep an active log of your professional capabilities, coding languages, tool expertise, and core domain skills."
            plannedFeatures={[
                'Custom skill tags add/remove',
                'Proficiency levels selector (Novice to Expert)',
                'Manager endorsement request log',
                'Skill gap analysis indicators'
            ]}
        />
    );
};

export default SkillsInventory;
