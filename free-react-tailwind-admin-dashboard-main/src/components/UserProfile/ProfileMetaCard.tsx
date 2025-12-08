
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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-2xl animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            {/* Avatar with Glow Effect */}
            <div className="relative group animate-slideInLeft">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse"></div>
              <div
                className="relative w-24 h-24 overflow-hidden rounded-full flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 shadow-xl"
                style={{
                  background: profile.photo ? "transparent" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                }}
              >
                {profile.photo ? (
                  <img src={profile.photo} alt="user" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white drop-shadow-lg">{getInitials(profile.first_name, profile.last_name)}</span>
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
                className="absolute -bottom-1 -right-1 bg-gradient-to-r from-indigo-500 to-purple-600 border-2 border-white dark:border-gray-900 rounded-full p-2.5 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-10"
                title={uploading ? "Uploading..." : "Edit Photo"}
                disabled={uploading}
              >
                <svg
                  className="fill-white"
                  width="16"
                  height="16"
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

            {/* Name and Designation */}
            <div className="order-3 xl:order-2 animate-slideInRight">
              <h4 className="mb-2 text-2xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent xl:text-left">
                {fullName || "-"}
              </h4>
              <div className="flex flex-col items-center gap-2 text-center xl:flex-row xl:gap-3 xl:text-left">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-800">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{designation}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
