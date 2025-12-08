import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InputField from '../../components/form/input/InputField';
import TextArea from '../../components/form/input/TextArea';
import FileInput from '../../components/form/input/FileInput';
import DatePicker from '../../components/form/date-picker';
import Button from '../../components/ui/button/Button';
import { axiosInstance } from '../Employee/api';

interface EmployeeProfile {
  first_name: string;
  middle_name?: string;
  last_name: string;
  mobile: string;
  temporary_address?: string;
  permanent_address?: string;
  photo?: string;
  aadhar_no?: string;
  aadhar_card?: string;
  pan_card?: string;
  pan_no?: string;
  date_of_birth?: string;
}

// FormField component defined outside to prevent re-creation on every render
const FormField = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="group">
    <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
      <span className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-600 dark:text-indigo-400">
        {icon}
      </span>
      {label}
    </label>
    {children}
  </div>
);


const UpdateEmployeeProfile: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<EmployeeProfile>({
    first_name: '',
    middle_name: '',
    last_name: '',
    mobile: '',
    temporary_address: '',
    permanent_address: '',
    photo: '',
    aadhar_no: '',
    aadhar_card: '',
    pan_no: '',
    pan_card: '',
    date_of_birth: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get('/employee-profile/');
        setForm({
          ...form,
          ...res.data,
        });
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, files } = e.target as HTMLInputElement;
    if (type === 'file' && files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (["photo", "aadhar_card", "pan_card"].includes(key)) {
          if (value instanceof File || value instanceof Blob) {
            formData.append(key, value);
          }
        } else {
          if (value !== undefined && value !== null && value !== '') {
            formData.append(key, value);
          }
        }
      });
      await axiosInstance.patch('/employee-profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Profile updated successfully');
      setTimeout(() => {
        navigate('/employee/profile');
      }, 1000);
    } catch {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading...</div></div>;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-2xl">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
                Update Profile
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Update your personal and professional details</p>
            </div>
            <button
              onClick={() => navigate('/employee/profile')}
              className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
              title="Back to Profile"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-lg">
          <div className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
            <div className="bg-white dark:bg-gray-900 px-6 py-4">
              <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Personal Information
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                label="First Name *"
              >
                <InputField placeholder="Enter first name" name="first_name" value={form.first_name} onChange={handleChange} required />
              </FormField>
              <FormField
                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                label="Middle Name"
              >
                <InputField placeholder="Enter middle name" name="middle_name" value={form.middle_name || ''} onChange={handleChange} />
              </FormField>
              <FormField
                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                label="Last Name *"
              >
                <InputField placeholder="Enter last name" name="last_name" value={form.last_name} onChange={handleChange} required />
              </FormField>
              <FormField
                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>}
                label="Mobile *"
              >
                <InputField placeholder="Enter mobile number" name="mobile" value={form.mobile} onChange={handleChange} required />
              </FormField>
              <FormField
                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}
                label="Date of Birth"
              >
                <DatePicker
                  id="date_of_birth"
                  label=""
                  defaultDate={form.date_of_birth ? form.date_of_birth + 'T00:00:00' : undefined}
                  onChange={(dates: Date[]) => {
                    if (dates && dates[0]) {
                      const year = dates[0].getFullYear();
                      const month = String(dates[0].getMonth() + 1).padStart(2, '0');
                      const day = String(dates[0].getDate()).padStart(2, '0');
                      setForm(f => ({ ...f, date_of_birth: `${year}-${month}-${day}` }));
                    } else {
                      setForm(f => ({ ...f, date_of_birth: '' }));
                    }
                  }}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-lg">
          <div className="relative bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 p-[2px]">
            <div className="bg-white dark:bg-gray-900 px-6 py-4">
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Address Information
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
                label="Temporary Address"
              >
                <TextArea placeholder="Enter temporary address" value={form.temporary_address || ''} onChange={val => setForm(f => ({ ...f, temporary_address: val }))} />
              </FormField>
              <FormField
                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
                label="Permanent Address"
              >
                <TextArea placeholder="Enter permanent address" value={form.permanent_address || ''} onChange={val => setForm(f => ({ ...f, permanent_address: val }))} />
              </FormField>
            </div>
          </div>
        </div>

        {/* ID Proofs */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-lg">
          <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-[2px]">
            <div className="bg-white dark:bg-gray-900 px-6 py-4">
              <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                ID Proofs & Documents
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>}
                label="Aadhar Number"
              >
                <InputField placeholder="Enter Aadhar number" name="aadhar_no" value={form.aadhar_no || ''} onChange={handleChange} />
              </FormField>
              <FormField
                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>}
                label="PAN Number"
              >
                <InputField placeholder="Enter PAN number" name="pan_no" value={form.pan_no || ''} onChange={handleChange} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <FormField
                  icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                  label="Profile Photo"
                >
                  {typeof form.photo === 'string' && form.photo && (
                    <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                      <img src={form.photo} alt="Current Photo" className="h-20 w-20 object-cover rounded-lg shadow-md mx-auto" />
                      <p className="text-xs text-center mt-2 text-gray-500">Current Photo</p>
                    </div>
                  )}
                  <FileInput name="photo" onChange={handleChange} />
                </FormField>
              </div>
              <div>
                <FormField
                  icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>}
                  label="Aadhar Card"
                >
                  {typeof form.aadhar_card === 'string' && form.aadhar_card && (
                    <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
                      <a href={form.aadhar_card} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:shadow-lg transition-all duration-300">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                        View Current
                      </a>
                    </div>
                  )}
                  <FileInput name="aadhar_card" onChange={handleChange} />
                </FormField>
              </div>
              <div>
                <FormField
                  icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>}
                  label="PAN Card"
                >
                  {typeof form.pan_card === 'string' && form.pan_card && (
                    <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
                      <a href={form.pan_card} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:shadow-lg transition-all duration-300">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                        View Current
                      </a>
                    </div>
                  )}
                  <FileInput name="pan_card" onChange={handleChange} />
                </FormField>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700">
          {error && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              {success}
            </div>
          )}
          <div className="flex gap-3 ml-auto">
            <Button type="button" variant="outline" disabled={saving} onClick={() => navigate('/employee/profile')}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UpdateEmployeeProfile;
