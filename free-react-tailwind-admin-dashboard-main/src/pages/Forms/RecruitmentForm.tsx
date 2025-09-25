
import React, { useState } from 'react';
import { axiosInstance } from '../Dashboard/api';
import DatePicker from '../../components/form/date-picker';
import InputField from '../../components/form/input/InputField';
import Select from '../../components/form/Select';
import Label from '../../components/form/Label';

interface RecruitmentFormProps {
  initialData?: Partial<{
    reference_id: string;
    name: string;
    email: string;
    address?: string;
    job_title: string;
    salary?: string;
    application_date?: string;
    interview_date?: string;
    appointment_date?: string;
    guardian_name?: string;
    status?: 'waiting' | 'selected' | 'rejected';
  }>;
  onSuccess?: () => void;
}

const RecruitmentForm: React.FC<RecruitmentFormProps> = ({ initialData = {}, onSuccess }) => {
  const [form, setForm] = useState({
    // reference_id is auto-generated, do not include in form
    name: initialData.name || '',
    email: initialData.email || '',
    address: initialData.address || '',
    job_title: initialData.job_title || '',
    salary: initialData.salary || '',
    application_date: initialData.application_date || '',
    interview_date: initialData.interview_date || '',
    appointment_date: initialData.appointment_date || '',
    guardian_name: initialData.guardian_name || '',
    status: initialData.status || 'waiting',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: string) => (selectedDates: Date[]) => {
    setForm((prev) => ({ ...prev, [name]: selectedDates && selectedDates[0] ? selectedDates[0].toISOString().slice(0, 10) : '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (initialData && initialData.reference_id) {
        // Edit mode (assume reference_id is unique key)
        await axiosInstance.put(`app/recruitment/${initialData.reference_id}/`, form);
      } else {
        // Add mode
        await axiosInstance.post('app/recruitment/', form);
      }
      if (onSuccess) onSuccess();
    } catch {
      setError('Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white shadow rounded-lg p-8 space-y-6">
      <h2 className="text-2xl font-bold mb-4">{initialData && initialData.reference_id ? 'Edit Recruitment' : 'Add Recruitment'}</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name">Name</Label>
          <InputField
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter name"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <InputField
            id="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            type="email"
            placeholder="Enter email"
          />
        </div>
        <div>
          <Label htmlFor="job_title">Job Title</Label>
          <InputField
            id="job_title"
            name="job_title"
            value={form.job_title}
            onChange={handleChange}
            placeholder="Enter job title"
          />
        </div>
        <div>
          <Label htmlFor="salary">Salary</Label>
          <InputField
            id="salary"
            name="salary"
            value={form.salary}
            onChange={handleChange}
            placeholder="Enter salary"
          />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <InputField
            id="address"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Enter address"
          />
        </div>
        <DatePicker
          id="application_date"
          label="Application Date"
          defaultDate={form.application_date}
          onChange={handleDateChange('application_date')}
          placeholder="Select application date"
        />
        <DatePicker
          id="interview_date"
          label="Interview Date"
          defaultDate={form.interview_date}
          onChange={handleDateChange('interview_date')}
          placeholder="Select interview date"
        />
        <DatePicker
          id="appointment_date"
          label="Appointment Date"
          defaultDate={form.appointment_date}
          onChange={handleDateChange('appointment_date')}
          placeholder="Select appointment date"
        />
        <div>
          <Label htmlFor="guardian_name">Guardian Name</Label>
          <InputField
            id="guardian_name"
            name="guardian_name"
            value={form.guardian_name}
            onChange={handleChange}
            placeholder="Enter guardian name"
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            defaultValue={form.status}
            onChange={(value: string) => setForm(prev => ({ ...prev, status: value as 'waiting' | 'selected' | 'rejected' }))}
            options={[
              { value: 'waiting', label: 'Waiting' },
              { value: 'selected', label: 'Selected' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-6">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow" disabled={loading}>
          {loading ? 'Saving...' : (initialData && initialData.reference_id ? 'Update' : 'Add')}
        </button>
      </div>
    </form>
  );
};

export default RecruitmentForm;
