import React, { useEffect, useState } from 'react';
import ComponentCard from '../../components/common/ComponentCard';
import InputField from '../../components/form/input/InputField';
import TextArea from '../../components/form/input/TextArea';
import FileInput from '../../components/form/input/FileInput';
import DatePicker from '../../components/form/date-picker';
import Button from '../../components/ui/button/Button';
import { axiosInstance } from '../Dashboard/api';

interface EmployeeProfile {
  first_name: string;
  middle_name?: string;
  last_name: string;
  mobile: string;
  temporary_address?: string;
  permanent_address?: string;
  photo?: string;
  aadhar_card?: string;
  pan_card?: string;
  date_of_birth?: string;
  previous_employer?: string;
  date_of_releaving?: string;
  previous_designation_name?: string;
  previous_salary?: number | string;
}

const UpdateEmployeeProfile: React.FC = () => {
  const [form, setForm] = useState<EmployeeProfile>({
    first_name: '',
    middle_name: '',
    last_name: '',
    mobile: '',
    temporary_address: '',
    permanent_address: '',
    photo: '',
    aadhar_card: '',
    pan_card: '',
    date_of_birth: '',
    previous_employer: '',
    date_of_releaving: '',
    previous_designation_name: '',
    previous_salary: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get('/employee/profile/');
        setForm({
          ...form,
          ...res.data,
          previous_salary: res.data.previous_salary || '',
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
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'string' || value instanceof Blob) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });
      await axiosInstance.patch('/employee/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Profile updated successfully');
    } catch {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <ComponentCard title="Update Profile" desc="Update your personal and professional details.">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField placeholder="First Name" name="first_name" value={form.first_name} onChange={handleChange} required />
          <InputField placeholder="Middle Name" name="middle_name" value={form.middle_name || ''} onChange={handleChange} />
          <InputField placeholder="Last Name" name="last_name" value={form.last_name} onChange={handleChange} required />
          <InputField placeholder="Mobile" name="mobile" value={form.mobile} onChange={handleChange} required />
          <InputField placeholder="Previous Employer" name="previous_employer" value={form.previous_employer || ''} onChange={handleChange} />
          <InputField placeholder="Previous Designation" name="previous_designation_name" value={form.previous_designation_name || ''} onChange={handleChange} />
          <InputField placeholder="Previous Salary" name="previous_salary" value={form.previous_salary?.toString() || ''} onChange={handleChange} type="number" />
          <DatePicker id="date_of_birth" label="Date of Birth" defaultDate={form.date_of_birth} onChange={(dates: Date[]) => setForm(f => ({ ...f, date_of_birth: dates && dates[0] ? dates[0].toISOString().slice(0, 10) : '' }))} />
          <DatePicker id="date_of_releaving" label="Date of Releaving" defaultDate={form.date_of_releaving} onChange={(dates: Date[]) => setForm(f => ({ ...f, date_of_releaving: dates && dates[0] ? dates[0].toISOString().slice(0, 10) : '' }))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextArea placeholder="Temporary Address" value={form.temporary_address || ''} onChange={val => setForm(f => ({ ...f, temporary_address: val }))} />
          <TextArea placeholder="Permanent Address" value={form.permanent_address || ''} onChange={val => setForm(f => ({ ...f, permanent_address: val }))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FileInput name="photo" onChange={handleChange} />
          <FileInput name="aadhar_card" onChange={handleChange} />
          <FileInput name="pan_card" onChange={handleChange} />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Updating...' : 'Update Profile'}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
};

export default UpdateEmployeeProfile;
