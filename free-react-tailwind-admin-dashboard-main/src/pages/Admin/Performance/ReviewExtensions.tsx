import AdminPerformanceComingSoon from './AdminPerformanceComingSoon';

const ReviewExtensions = () => {
    return (
        <AdminPerformanceComingSoon
            title="Review Extensions"
            desc="Review, approve, or reject employee and manager grace period requests for missed appraisal timelines."
            plannedFeatures={[
                'Extension requests audit dashboard',
                'One-click approval/rejection panel',
                'Custom deadline override calendar settings',
                'Automated notification triggers logs'
            ]}
        />
    );
};

export default ReviewExtensions;
