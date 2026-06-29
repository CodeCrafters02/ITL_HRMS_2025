import PerformanceComingSoon from './PerformanceComingSoon';

const FeedbackReceived = () => {
    return (
        <PerformanceComingSoon
            title="Feedback Received"
            desc="Look over structured feedback, constructive reviews, and praises received from managers, teammates, and cross-functional teams."
            plannedFeatures={[
                'Manager evaluation feedback logs',
                'Peer-to-peer praise cards',
                'Constructive coaching suggestions',
                'Anonymized survey reports'
            ]}
        />
    );
};

export default FeedbackReceived;
