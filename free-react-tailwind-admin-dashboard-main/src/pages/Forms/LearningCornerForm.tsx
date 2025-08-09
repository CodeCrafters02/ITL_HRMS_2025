import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../Dashboard/api';
import ComponentCard from '../../components/common/ComponentCard';
import InputField from '../../components/form/input/InputField';
import TextArea from '../../components/form/input/TextArea';
import FileInput from '../../components/form/input/FileInput';
import Label from '../../components/form/Label';

const initialState = {
  title: '',
  description: '',
  image: null,
  document: null,
  video: null,
};

const LearningCornerForm: React.FC = () => {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleTextAreaChange = (value: string) => {
    setForm(prev => ({ ...prev, description: value }));
  };

  const handleFileChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.files?.[0] ?? null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data = new FormData();
    data.append('title', form.title);
    data.append('description', form.description);
    if (form.image) data.append('image', form.image);
    if (form.document) data.append('document', form.document);
    if (form.video) data.append('video', form.video);
    try {
      await axiosInstance.post('/learning-corner/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/admin/learning-corner');
    } catch {
      setError('Failed to add learning corner item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <ComponentCard title="Add Learning Corner" desc="Create a new learning resource for your company.">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <InputField
              name="title"
              value={form.title}
              onChange={handleInputChange}
              placeholder="Enter title"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <TextArea
              value={form.description}
              onChange={handleTextAreaChange}
              placeholder="Enter description"
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="image">Image</Label>
            <FileInput
              onChange={handleFileChange('image')}
            />
          </div>
          <div>
            <Label htmlFor="document">Document</Label>
            <FileInput
              onChange={handleFileChange('document')}
            />
          </div>
          <div>
            <Label htmlFor="video">Video</Label>
            <FileInput
              onChange={handleFileChange('video')}
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-200"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-200"
              onClick={() => navigate('/admin/learning-corner')}
            >
              Cancel
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
};

export default LearningCornerForm;
