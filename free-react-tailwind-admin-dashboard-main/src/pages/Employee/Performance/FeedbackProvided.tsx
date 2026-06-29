import PerformanceComingSoon from './PerformanceComingSoon';

const FeedbackProvided = () => {
    return (
        <PerformanceComingSoon
            title="Feedback Provided"
            desc="Track constructive reviews, performance notes, and praises that you have shared with peers and teammates."
            plannedFeatures={[
                'Peer assessment questionnaires',
                'Completed feedback submissions history',
                'Anonymous survey responses options',
                'Pending review invitations list'
            ]}
        />
    );
};

export default FeedbackProvided;
