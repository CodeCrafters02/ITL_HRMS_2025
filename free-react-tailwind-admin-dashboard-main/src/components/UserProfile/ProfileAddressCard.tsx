import { useEffect, useState } from "react";
import { axiosInstance } from "../../pages/Employee/api";

export default function ProfileAddressCard() {
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

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">Address & ID Proofs</h4>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Temporary Address</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.temporary_address || '-'}</p>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Permanent Address</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.permanent_address || '-'}</p>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Aadhar Number</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.aadhar_no || '-'}</p>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Aadhar Card</p>
              {profile.aadhar_card ? (
                <a href={profile.aadhar_card} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
              ) : (
                <span className="text-xs text-gray-400">No file</span>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">PAN Number</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.pan_no || '-'}</p>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">PAN Card</p>
              {profile.pan_card ? (
                <a href={profile.pan_card} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
              ) : (
                <span className="text-xs text-gray-400">No file</span>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Guardian Name</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.guardian_name || '-'}</p>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Guardian Mobile</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.guardian_mobile || '-'}</p>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Category</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.category || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
