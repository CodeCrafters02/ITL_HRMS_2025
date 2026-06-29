import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const MultiRaterLog = () => {
    return (
        <AdminPerformanceComingSoon
            title="Multi-Rater Review Master Log"
            desc="Track the complete registry of peer evaluation groupings, review relationships, and submission logs."
            plannedFeatures={[
                'Multi-rater relationship master grid',
                'Peer grouping validation indicators dashboard',
                'In-progress evaluations tracking list',
                'Automatic remainder trigger triggers settings'
            ]}
        />
    );
};

export default MultiRaterLog;
