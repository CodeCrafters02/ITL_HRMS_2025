import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const ManagerSummaries = () => {
    return (
        <AdminPerformanceComingSoon
            title="Manager Recording Summaries"
            desc="Track and check general evaluation notes, check-in transcripts, and recording summaries submitted by managers."
            plannedFeatures={[
                '1-on-1 meeting records log',
                'AI check-in meeting summaries uploads',
                'Key items and goals outcomes checklist',
                'Historical manager review tracks'
            ]}
        />
    );
};

export default ManagerSummaries;
