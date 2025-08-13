import { useEffect, useState } from "react";
import { axiosInstance } from "../../pages/Employee/api";

export default function ProfessionalCard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axiosInstance
      .get("/employee-profile/")
      .then((res) => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || err.message || "Failed to fetch profile");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!profile) return null;

  // If previous employer exists, show only previous employment details
  if (profile.previous_employer) {
    return (
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">Previous Employment Details</h4>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
          <div>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Previous Employer</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.previous_employer}</p>
          </div>
          <div>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Previous Designation</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.previous_designation_name || '-'}</p>
          </div>
          <div>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Previous Salary</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.previous_salary || '-'}</p>
          </div>
          <div>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Date of Joining</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.date_of_joining || '-'}</p>
          </div>
          <div>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Date of Releaving</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.date_of_releaving || '-'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show current professional details
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">Professional Details</h4>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Date of Joining</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.date_of_joining || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">CTC</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.ctc || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Gross Salary</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.gross_salary || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">EPF Status</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.epf_status || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">UAN</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.uan || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Source of Employment</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.source_of_employment || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Payment Method</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.payment_method || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Account No</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.account_no || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">IFSC Code</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.ifsc_code || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Bank Name</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.bank_name || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">ESIC Status</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.esic_status || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">ESIC No</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.esic_no || '-'}</p>
        </div>
      </div>
    </div>
  );
}
