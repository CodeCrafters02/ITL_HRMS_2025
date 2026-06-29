import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const TrackFeedback = () => {
    return (
        <AdminPerformanceComingSoon
            title="Track Feedback Records"
            desc="Audit continuous feedback, praises, coaching logs, and peer comments exchanged across the company."
            plannedFeatures={[
                'Peer-to-peer appreciation logs dashboard',
                'Manager continuous coaching review audits',
                'Feedback analytics and sentiment summaries',
                'Moderation tools for constructive exchange'
            ]}
        />
    );
};

export default TrackFeedback;
