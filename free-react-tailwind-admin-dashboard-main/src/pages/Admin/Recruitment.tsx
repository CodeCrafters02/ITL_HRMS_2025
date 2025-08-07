import React, { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../Dashboard/api';

interface Recruitment {
  id: number;
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
  status: 'waiting' | 'selected' | 'rejected';
}


const RecruitmentPage: React.FC = () => {
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Recruitment>>({});
  const navigate = useNavigate();

  const fetchRecruitments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/recruitment/');
      setRecruitments(response.data);
    } catch {
      setError('Error fetching recruitments');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (r: Recruitment) => {
    setEditId(r.id);
    setEditData({ ...r });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setLoading(true);
    setError(null);
    try {
      await axiosInstance.patch(`/recruitment/${editId}/`, editData);
      setEditId(null);
      setEditData({});
      fetchRecruitments();
    } catch {
      setError('Error updating recruitment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditId(null);
    setEditData({});
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this recruitment record?')) return;
    setLoading(true);
    setError(null);
    try {
      await axiosInstance.delete(`/recruitment/${id}/`);
      fetchRecruitments();
    } catch {
      setError('Error deleting recruitment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruitments();
  }, []);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-10 mb-4">
        <h1 className="text-2xl font-bold">Recruitment List</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2 shadow"
          onClick={() => navigate('/form-recruitment')}
        >
          <FaPlus /> Add
        </button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? (
        <div className="text-center py-8 text-lg text-gray-500">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg shadow-lg bg-white">
            <thead>
              <tr className="bg-gray-100 sticky top-0 z-10 text-sm font-semibold text-gray-700">
                <th className="px-4 py-3 border-b">S.no</th>
                <th className="px-4 py-3 border-b">Action</th>
                <th className="px-4 py-3 border-b">Ref ID</th>
                <th className="px-4 py-3 border-b">Name</th>
                <th className="px-4 py-3 border-b">Email</th>
                <th className="px-4 py-3 border-b">Job Title</th>
                <th className="px-4 py-3 border-b">Salary</th>
                <th className="px-4 py-3 border-b">Application Date</th>
                <th className="px-4 py-3 border-b">Interview Date</th>
                <th className="px-4 py-3 border-b">Appointment Date</th>
                <th className="px-4 py-3 border-b">Guardian</th>
                <th className="px-4 py-3 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {recruitments.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-gray-500">No recruitment records found.</td>
                </tr>
              ) : (
                recruitments.map((r, idx) => {
                  return (
                    <tr
                      key={r.id}
                      className={
                        idx % 2 === 0
                          ? 'bg-white hover:bg-blue-50 transition-colors'
                          : 'bg-gray-50 hover:bg-blue-50 transition-colors'
                      }
                    >
                      <td className="px-4 py-3 border-b">{idx + 1}</td>
                      <td className="px-4 py-3 border-b">
                        <div className="flex items-center gap-2">
                          {editId === r.id ? (
                            <>
                              <button className="text-green-600 hover:text-green-800" title="Update" onClick={handleUpdate}>
                                Update
                              </button>
                              <button className="text-gray-600 hover:text-gray-800" title="Cancel" onClick={handleCancel}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="text-blue-600 hover:text-blue-800" title="Edit" onClick={() => handleEdit(r)}>
                                <FaEdit />
                              </button>
                              <button className="text-red-600 hover:text-red-800" title="Delete" onClick={() => handleDelete(r.id)}>
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b">{r.reference_id}</td>
                      <td className="px-4 py-3 border-b">
                        {editId === r.id ? (
                          <input
                            type="text"
                            name="name"
                            value={editData.name || ''}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-full"
                          />
                        ) : (
                          r.name
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        {editId === r.id ? (
                          <input
                            type="email"
                            name="email"
                            value={editData.email || ''}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-full"
                          />
                        ) : (
                          r.email
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        {editId === r.id ? (
                          <input
                            type="text"
                            name="job_title"
                            value={editData.job_title || ''}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-full"
                          />
                        ) : (
                          r.job_title
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        {editId === r.id ? (
                          <input
                            type="text"
                            name="salary"
                            value={editData.salary || ''}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-full"
                          />
                        ) : (
                          r.salary || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        {editId === r.id ? (
                          <input
                            type="date"
                            name="application_date"
                            value={editData.application_date || ''}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-full"
                          />
                        ) : (
                          r.application_date || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        {editId === r.id ? (
                          <input
                            type="date"
                            name="interview_date"
                            value={editData.interview_date || ''}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-full"
                          />
                        ) : (
                          r.interview_date || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        {editId === r.id ? (
                          <input
                            type="date"
                            name="appointment_date"
                            value={editData.appointment_date || ''}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-full"
                          />
                        ) : (
                          r.appointment_date || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        {editId === r.id ? (
                          <input
                            type="text"
                            name="guardian_name"
                            value={editData.guardian_name || ''}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-full"
                          />
                        ) : (
                          r.guardian_name || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        {editId === r.id ? (
                          <select
                            name="status"
                            value={editData.status || 'waiting'}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-full"
                          >
                            <option value="waiting">Waiting</option>
                            <option value="selected">Selected</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded capitalize text-xs font-medium ${
                              r.status === 'waiting'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                : r.status === 'selected'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {r.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecruitmentPage;
