import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ComponentCard from '../../components/common/ComponentCard';
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
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'string' || value instanceof Blob) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
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

  if (loading) return <div>Loading...</div>;

  return (
    <ComponentCard title="Update Profile" desc="Update your personal and professional details.">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label htmlFor="first_name" className="block mb-1 font-medium">First Name</label><InputField placeholder="First Name" name="first_name" value={form.first_name} onChange={handleChange} required /></div>
          <div><label htmlFor="middle_name" className="block mb-1 font-medium">Middle Name</label><InputField placeholder="Middle Name" name="middle_name" value={form.middle_name || ''} onChange={handleChange} /></div>
          <div><label htmlFor="last_name" className="block mb-1 font-medium">Last Name</label><InputField placeholder="Last Name" name="last_name" value={form.last_name} onChange={handleChange} required /></div>
          <div><label htmlFor="mobile" className="block mb-1 font-medium">Mobile</label><InputField placeholder="Mobile" name="mobile" value={form.mobile} onChange={handleChange} required /></div>
          <div><label htmlFor="aadhar_no" className="block mb-1 font-medium">Aadhar No</label><InputField placeholder="Aadhar No" name="aadhar_no" value={form.aadhar_no || ''} onChange={handleChange} /></div>
          <div><label htmlFor="pan_no" className="block mb-1 font-medium">PAN No</label><InputField placeholder="PAN No" name="pan_no" value={form.pan_no || ''} onChange={handleChange} /></div>
          <DatePicker id="date_of_birth" label="Date of Birth" defaultDate={form.date_of_birth} onChange={(dates: Date[]) => setForm(f => ({ ...f, date_of_birth: dates && dates[0] ? dates[0].toISOString().slice(0, 10) : '' }))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label htmlFor="temporary_address" className="block mb-1 font-medium">Temporary Address</label><TextArea placeholder="Temporary Address" value={form.temporary_address || ''} onChange={val => setForm(f => ({ ...f, temporary_address: val }))} /></div>
          <div><label htmlFor="permanent_address" className="block mb-1 font-medium">Permanent Address</label><TextArea placeholder="Permanent Address" value={form.permanent_address || ''} onChange={val => setForm(f => ({ ...f, permanent_address: val }))} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="photo" className="block mb-1 font-medium">Photo</label>
            {typeof form.photo === 'string' && form.photo && (
              <div className="mb-2">
                <img src={form.photo} alt="Current Photo" className="h-16 w-16 object-cover rounded" />
              </div>
            )}
            <FileInput name="photo" onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="aadhar_card" className="block mb-1 font-medium">Aadhar Card</label>
            {typeof form.aadhar_card === 'string' && form.aadhar_card && (
              <div className="mb-2">
                <a href={form.aadhar_card} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View current Aadhar Card</a>
              </div>
            )}
            <FileInput name="aadhar_card" onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="pan_card" className="block mb-1 font-medium">PAN Card</label>
            {typeof form.pan_card === 'string' && form.pan_card && (
              <div className="mb-2">
                <a href={form.pan_card} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View current PAN Card</a>
              </div>
            )}
            <FileInput name="pan_card" onChange={handleChange} />
          </div>
        </div>
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => navigate('/employee/profile')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Updating...' : 'Update Profile'}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
};

export default UpdateEmployeeProfile;
