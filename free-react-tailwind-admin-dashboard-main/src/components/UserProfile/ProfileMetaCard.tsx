
import { useEffect, useRef, useState } from "react";
import { axiosInstance } from "../../pages/Employee/api";
// import { useNavigate } from "react-router-dom";

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName ? firstName[0] : "";
  const last = lastName ? lastName[0] : "";
  return (first + last).toUpperCase();
}
interface Profile {
  first_name?: string;
  last_name?: string;
  designation_name?: string;
  designation?: string;
  photo?: string;
}

export default function ProfileMetaCard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  const designation = profile.designation_name || profile.designation || "-";

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          <div className="relative">
            <div
              className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #a5b4fc 100%)"
              }}
            >
              {profile.photo ? (
                <img src={profile.photo} alt="user" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">{getInitials(profile.first_name, profile.last_name)}</span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                setUploading(true);
                setError(null);
                try {
                  const formData = new FormData();
                  formData.append('photo', file);
                  const res = await axiosInstance.patch('/employee-profile/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                  setProfile((prev) => prev ? { ...prev, photo: res.data.photo } : prev);
                } catch (err: unknown) {
                  let message = 'Failed to update photo';
                  if (err && typeof err === 'object') {
                    // Check for axios error structure
                    if ('response' in err && typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string') {
                      message = (err as { response: { data: { detail: string } } }).response.data.detail;
                    } else if ('message' in err && typeof (err as { message?: string }).message === 'string') {
                      message = (err as { message: string }).message;
                    }
                  }
                  setError(message);
                } finally {
                  setUploading(false);
                }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 rounded-full p-2 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              title={uploading ? "Uploading..." : "Edit Photo"}
              style={{ zIndex: 2 }}
              disabled={uploading}
            >
              <svg
                className="fill-current"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                  fill=""
                />
              </svg>
            </button>
          </div>
          <div className="order-3 xl:order-2">
            <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
              {fullName || "-"}
            </h4>
            <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
              <p className="text-sm text-gray-500 dark:text-gray-400">{designation}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
