import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../Dashboard/api';
import InputField from '../../components/form/input/InputField';
import TextArea from '../../components/form/input/TextArea';
import Label from '../../components/form/Label';
import { FaGraduationCap, FaImage, FaVideo, FaFileAlt, FaSave, FaTimes, FaArrowLeft, FaUpload, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const initialState = {
  title: '',
  description: '',
  image: null as File | null,
  document: null as File | null,
  video: null as File | null,
};

const LearningCornerForm: React.FC = () => {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePrev, setImagePrev] = useState<string | null>(null);
  const [videoPrev, setVideoPrev] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleTextAreaChange = (value: string) => {
    setForm(prev => ({ ...prev, description: value }));
  };

  const handleFileChange = (field: 'image' | 'document' | 'video') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm(prev => ({ ...prev, [field]: file }));

    // Create preview for images and videos
    if (file) {
      if (field === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => setImagePrev(e.target?.result as string);
        reader.readAsDataURL(file);
      } else if (field === 'video') {
        const url = URL.createObjectURL(file);
        setVideoPrev(url);
      }
    } else {
      if (field === 'image') setImagePrev(null);
      if (field === 'video') setVideoPrev(null);
    }
  };

  const removeFile = (field: 'image' | 'document' | 'video') => {
    setForm(prev => ({ ...prev, [field]: null }));
    if (field === 'image') setImagePrev(null);
    if (field === 'video') setVideoPrev(null);
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
      await axiosInstance.post('app/learning-corner/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Learning resource added successfully!', { position: 'bottom-right' });
      navigate('/admin/learning-corner');
    } catch {
      setError('Failed to add learning corner item');
      toast.error('Failed to add resource', { position: 'bottom-right' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <button
          onClick={() => navigate('/admin/learning-corner')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <FaArrowLeft />
          <span>Back to Learning Corner</span>
        </button>

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
              <FaGraduationCap className="text-4xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Add Learning Resource</h1>
              <p className="text-blue-100 mt-1">Create a new educational resource for your team</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FaCheckCircle className="text-blue-600" />
              Basic Information
            </h2>

            <div className="space-y-6">
              <div>
                <Label htmlFor="title">Title *</Label>
                <InputField
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="Enter a descriptive title for your resource"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <TextArea
                  value={form.description}
                  onChange={handleTextAreaChange}
                  placeholder="Provide a detailed description of the learning resource..."
                  rows={5}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Media Upload Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FaUpload className="text-purple-600" />
              Upload Media
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Image Upload */}
              <div>
                <Label htmlFor="image" className="flex items-center gap-2">
                  <FaImage className="text-blue-500" />
                  Image
                </Label>
                <div className="mt-2">
                  {imagePrev ? (
                    <div className="relative">
                      <img src={imagePrev} alt="Preview" className="w-full h-40 object-cover rounded-lg shadow-md" />
                      <button
                        type="button"
                        onClick={() => removeFile('image')}
                        className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-700">
                      <FaImage className="text-4xl text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange('image')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Video Upload */}
              <div>
                <Label htmlFor="video" className="flex items-center gap-2">
                  <FaVideo className="text-purple-500" />
                  Video
                </Label>
                <div className="mt-2">
                  {videoPrev ? (
                    <div className="relative">
                      <video src={videoPrev} controls className="w-full h-40 rounded-lg shadow-md object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile('video')}
                        className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-colors bg-gray-50 dark:bg-gray-700">
                      <FaVideo className="text-4xl text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleFileChange('video')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <Label htmlFor="document" className="flex items-center gap-2">
                  <FaFileAlt className="text-green-500" />
                  Document
                </Label>
                <div className="mt-2">
                  {form.document ? (
                    <div className="flex flex-col items-center justify-center w-full h-40 border-2 border-green-300 dark:border-green-600 rounded-lg bg-green-50 dark:bg-green-900/20 relative">
                      <FaFileAlt className="text-4xl text-green-600 mb-2" />
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-medium truncate max-w-full px-4">
                        {form.document.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile('document')}
                        className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-green-500 dark:hover:border-green-400 transition-colors bg-gray-50 dark:bg-gray-700">
                      <FaFileAlt className="text-4xl text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        className="hidden"
                        onChange={handleFileChange('document')}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
              You can upload one or more types of media. At least one is recommended.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 p-4 rounded-lg">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-8 rounded-lg shadow-md transition-all transform hover:scale-105"
                onClick={() => navigate('/admin/learning-corner')}
              >
                <FaTimes />
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave />
                    Save Resource
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LearningCornerForm;
