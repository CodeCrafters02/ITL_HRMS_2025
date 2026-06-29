import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const SearchProfile = () => {
    return (
        <AdminPerformanceComingSoon
            title="Search Employee Profile"
            desc="Look up individual employee performance folders, check KRA progress indices, and audit past review results."
            plannedFeatures={[
                'Unified employee directory lookup',
                'Performance rating history timelines',
                'Feedback and appraisal audit tracks',
                'Talent matrix positioning records'
            ]}
        />
    );
};

export default SearchProfile;
