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
  generated_letters?: Array<{
    template_id: number;
    // type is not used for backend logic, only for UI
  }>;
}


const RecruitmentPage: React.FC = () => {
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Recruitment>>({});
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<Array<{id: number, title: string}>>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSelectFor, setTemplateSelectFor] = useState<{id: number, type: 'offer' | 'appointment'} | null>(null);
  const navigate = useNavigate();

  // Fetch recruitments and their generated letters
  const fetchRecruitments = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch recruitments
      const response = await axiosInstance.get('/recruitment/');
      const recruitmentsData = response.data;
      // Fetch generated letters for all candidates
      const letterRes = await axiosInstance.get('/generated-letters/');
      const letters = letterRes.data; // [{candidate, template, ...}]
      // Map generated letters to each recruitment (ignore type, only candidate and template)
      const recruitmentsWithLetters = recruitmentsData.map((rec: Recruitment) => {
        const recLetters = letters.filter((l: any) => l.candidate === rec.id);
        return { ...rec, generated_letters: recLetters.map((l: any) => ({ template_id: l.template })) };
      });
      
      setRecruitments(recruitmentsWithLetters);
    } catch (e) {
      setError('Error fetching recruitments');
      console.error('Error fetching recruitments:', e);
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



  // Helper to get generated letter for a candidate and template_id and type
  const getGeneratedLetter = (rec: Recruitment, template_id: number, type: 'offer' | 'appointment') => {
    // In future, generated_letters should include type for robust filtering
    return rec.generated_letters?.find(l => l.template_id === template_id);
  };

  // For Offer Letter: if generated letter exists, go to letter page, else open template selection modal
  const handleOfferLetterClick = async (rec: Recruitment) => {
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      // Fetch all templates
      const tplRes = await axiosInstance.get('/letter-templates/');
      setTemplateOptions(tplRes.data);
      // Fetch all generated letters for this candidate and type=offer
      const generatedRes = await axiosInstance.get(`/generated-letters/?candidate_id=${rec.id}&type=offer`);
      const generatedLetters = Array.isArray(generatedRes.data) ? generatedRes.data : [];
      // If only one template, check if letter exists for that template
      if (tplRes.data.length === 1) {
        const templateId = tplRes.data[0].id;
        const found = generatedLetters.find((l: any) => l.template === templateId);
        if (found) {
          window.location.href = `/admin/letter-pdf?id=${rec.id}&type=offer&template_id=${templateId}`;
          setTemplateLoading(false);
          return;
        }
      } else {
        // If multiple templates, check if any generated letter exists for this candidate and type=offer
        for (const tpl of tplRes.data) {
          const found = generatedLetters.find((l: any) => l.template === tpl.id);
          if (found) {
            window.location.href = `/admin/letter-pdf?id=${rec.id}&type=offer&template_id=${tpl.id}`;
            setTemplateLoading(false);
            return;
          }
        }
      }
      setShowTemplateModal(true);
      setTemplateSelectFor({id: rec.id, type: 'offer'});
    } catch {
      setTemplateError('Failed to load templates or check existing letters');
    } finally {
      setTemplateLoading(false);
    }
  };

  // For Appointment Letter: if generated letter exists, go to letter page, else open template selection modal
  const handleAppointmentLetterClick = async (rec: Recruitment) => {
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      // Fetch all templates
      const tplRes = await axiosInstance.get('/letter-templates/');
      setTemplateOptions(tplRes.data);
      // Fetch all generated letters for this candidate and type=appointment
      const generatedRes = await axiosInstance.get(`/generated-letters/?candidate_id=${rec.id}&type=appointment`);
      const generatedLetters = Array.isArray(generatedRes.data) ? generatedRes.data : [];
      // If only one template, check if letter exists for that template
      if (tplRes.data.length === 1) {
        const templateId = tplRes.data[0].id;
        const found = generatedLetters.find((l: any) => l.template === templateId);
        if (found) {
          window.location.href = `/admin/letter-pdf?id=${rec.id}&type=appointment&template_id=${templateId}`;
          setTemplateLoading(false);
          return;
        }
      }
      setShowTemplateModal(true);
      setTemplateSelectFor({id: rec.id, type: 'appointment'});
    } catch {
      setTemplateError('Failed to load templates or check existing letters');
    } finally {
      setTemplateLoading(false);
    }
  };

  // When user selects a template in the modal
  const handleTemplateSelect = async (template_id: number) => {
    if (templateSelectFor) {
      // Check if letter already exists for this candidate and template, always include type
      try {
        const res = await axiosInstance.get(`/generated-letters/?candidate_id=${templateSelectFor.id}&template_id=${template_id}&type=${templateSelectFor.type}`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          // Letter already exists, redirect directly
          window.location.href = `/admin/letter-pdf?id=${templateSelectFor.id}&type=${templateSelectFor.type}&template_id=${template_id}`;
        } else {
          // No letter found, generate new letter and redirect
          window.location.href = `/admin/letter-pdf?id=${templateSelectFor.id}&type=${templateSelectFor.type}&template_id=${template_id}`;
        }
      } catch {
        // On error, still redirect to generate
        window.location.href = `/admin/letter-pdf?id=${templateSelectFor.id}&type=${templateSelectFor.type}&template_id=${template_id}`;
      }
      setShowTemplateModal(false);
      setTemplateSelectFor(null);
    }
  };

  const handleCloseTemplateModal = () => {
    setShowTemplateModal(false);
    setTemplateSelectFor(null);
  };

  useEffect(() => {
    fetchRecruitments();
  }, []);

  return (
  <div className="p-4 max-w-7xl mx-auto relative">
      <div className="flex items-center gap-10 mb-4">
        <h1 className="text-2xl font-bold">Recruitment List</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2 shadow"
          onClick={() => navigate('/admin/form-recruitment')}
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
                <th className="px-4 py-3 border-b">Action</th>
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
                      <td className="px-4 py-3 border-b">
                        {r.status === 'selected' && (
                          <div className="flex gap-2">
                            <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => handleOfferLetterClick(r)}>Offer Letter</button>
                            <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => handleAppointmentLetterClick(r)}>Appointment Letter</button>
                          </div>
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
      {/* Template Selection Modal rendered as a child of the main content area */}
      {showTemplateModal && (
        <>
          <div className="absolute inset-0 bg-blur bg-opacity-40 backdrop-blur-sm z-40" />
          <div className="absolute left-1/2 top-1/2 z-50" style={{transform: 'translate(-50%, -50%)'}}>
            <div className="bg-white rounded-lg shadow-2xl p-8 min-w-[340px] max-w-2xl w-full mx-4 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Select Letter Template</h2>
                <button className="text-gray-500 hover:text-gray-700 text-2xl font-bold" onClick={handleCloseTemplateModal}>&times;</button>
              </div>
              {templateLoading ? (
                <div className="text-blue-600">Loading templates...</div>
              ) : templateError ? (
                <div className="text-red-500">{templateError}</div>
              ) : templateOptions.length === 0 ? (
                <div className="text-gray-500">No templates found.</div>
              ) : (
                <div className="flex flex-wrap gap-4 justify-center max-h-[60vh] overflow-y-auto">
                  {templateOptions.map((tpl: {id: number; title: string; content?: string}) => (
                    <div
                      key={tpl.id}
                      className="group w-48 h-48 flex flex-col items-center justify-center border rounded-lg mb-2 cursor-pointer bg-white hover:bg-blue-50 transition relative shadow hover:shadow-lg"
                      onClick={() => handleTemplateSelect(tpl.id)}
                    >
                      <div className="font-bold text-lg mb-2 text-center line-clamp-2">{tpl.title}</div>
                      {/* Show content preview like LetterTemplate page */}
                      <div className="text-xs text-gray-500 line-clamp-4 text-center px-2">
                        {tpl.content ? tpl.content.slice(0, 100) + (tpl.content.length > 100 ? '...' : '') : ''}
                      </div>
                      <div className="text-xs text-blue-500 mt-2">Click to select</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RecruitmentPage;