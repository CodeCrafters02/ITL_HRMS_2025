import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ComponentCard from '../../components/common/ComponentCard';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/ui/table';
import { axiosInstance } from '../Dashboard/api';
import { FaTrash, FaEdit } from "react-icons/fa";
import Label from '../../components/form/Label';
import InputField from '../../components/form/input/InputField';
import TextArea from '../../components/form/input/TextArea';
import FileInput from '../../components/form/input/FileInput';

interface LearningCorner {
  id: number;
  title: string;
  description?: string;
  image?: string;
  document?: string;
  video?: string;
  company?: number;
}

const LearningCornerPage: React.FC = () => {
  const [items, setItems] = useState<LearningCorner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', image: null, document: null, video: null });
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance.get('/learning-corner/')
      .then(res => {
        setItems(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load learning corner items');
        setLoading(false);
      });
  }, []);

  const handleEditClick = (item: LearningCorner) => {
    setEditId(item.id);
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      image: null,
      document: null,
      video: null
    });
    setShowModal(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, files } = e.target as HTMLInputElement;
    if (type === 'file' && files) {
      setEditForm(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEditSave = async () => {
    if (!editId) return;
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', editForm.title);
      data.append('description', editForm.description);
      if (editForm.image && typeof editForm.image === 'object') data.append('image', editForm.image);
      if (editForm.document && typeof editForm.document === 'object') data.append('document', editForm.document);
      if (editForm.video && typeof editForm.video === 'object') data.append('video', editForm.video);
  await axiosInstance.patch(`/learning-corner/${editId}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowModal(false);
      setEditId(null);
      // Refetch items after update
      axiosInstance.get('/learning-corner/').then(res => {
        setItems(Array.isArray(res.data) ? res.data : []);
      });
    } catch {
      setError('Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setLoading(true);
      try {
        await axiosInstance.delete(`/learning-corner/${id}/`);
        setItems(items.filter(item => item.id !== id));
      } catch {
        setError('Failed to delete item');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning Corner</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2"
          onClick={() => navigate('/admin/form-learning-corner')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Learning Corner
        </button>
      </div>
      <ComponentCard title="Learning Corner" desc={`Total items: ${items.length}`}>  
        <Table className="border-collapse border border-gray-200 dark:border-gray-700">
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              <TableCell isHeader className="p-4 font-semibold text-center">S.No</TableCell>
              <TableCell isHeader className="p-4 font-semibold text-left">Title</TableCell>
              <TableCell isHeader className="p-4 font-semibold text-left">Description</TableCell>
              <TableCell isHeader className="p-4 font-semibold text-center">Image</TableCell>
              <TableCell isHeader className="p-4 font-semibold text-center">Document</TableCell>
              <TableCell isHeader className="p-4 font-semibold text-center">Video</TableCell>
              <TableCell isHeader className="p-4 font-semibold text-center">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={item.id}>
                <TableCell className="p-4 font-medium text-gray-900 dark:text-white text-center">{idx + 1}</TableCell>
                <TableCell className="p-4 font-medium text-gray-900 dark:text-white text-left">{item.title}</TableCell>
                <TableCell className="p-4 text-gray-700 dark:text-gray-300 text-left">{item.description || '-'}</TableCell>
                <TableCell className="p-4 text-center">
                  {item.image ? (
                    <img src={item.image} alt="Learning" className="w-16 h-16 object-cover rounded border mx-auto" />
                  ) : '-'}
                </TableCell>
                <TableCell className="p-4 text-center">
                  {item.document ? (
                    <a href={item.document} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Download</a>
                  ) : '-'}
                </TableCell>
                <TableCell className="p-4 text-center">
                  {item.video ? (
                    <video src={item.video} controls className="w-32 h-20 rounded mx-auto" />
                  ) : '-'}
                </TableCell>
                <TableCell className="p-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                      title="Edit Learning Corner"
                    >
                      <FaEdit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                      title="Delete Learning Corner"
                    >
                      <FaTrash className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Modal for editing */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Edit Learning Corner</h2>
              <div className="space-y-4">
                <Label htmlFor="title">Title</Label>
                <InputField
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  placeholder="Title"
                  required
                />
                <Label htmlFor="description">Description</Label>
                <TextArea
                  value={editForm.description}
                  onChange={(value: string) => setEditForm(prev => ({ ...prev, description: value }))}
                  placeholder="Description"
                  rows={4}
                />
                <Label htmlFor="image">Image</Label>
                <FileInput
                  name="image"
                  onChange={handleEditChange}
                  className="w-full"
                />
                <Label htmlFor="document">Document</Label>
                <FileInput
                  name="document"
                  onChange={handleEditChange}
                  className="w-full"
                />
                <Label htmlFor="video">Video</Label>
                <FileInput
                  name="video"
                  onChange={handleEditChange}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-sm"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </ComponentCard>
    </div>
  );
};

export default LearningCornerPage;
