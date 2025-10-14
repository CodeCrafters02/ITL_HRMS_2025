import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { axiosInstance } from "../Dashboard/api";
import EditRecruitment from "./EditRecruitment";

interface Recruitment {
  id: number;
  reference_id: string;
  name: string;
  email: string;
  job_title: string;
  salary?: string;
  status: "waiting" | "selected" | "rejected";
  application_date?:string;
  interview_date?:string;
  appointment_date?:string;
  guardian_name?:string;
}

const RecruitmentPage: React.FC = () => {
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [templateOptions, setTemplateOptions] = useState<any[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSelectFor, setTemplateSelectFor] = useState<{ id: number; type: string } | null>(null);
  const navigate = useNavigate();

  const fetchRecruitments = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("app/recruitment/");
      setRecruitments(res.data);
    } catch (e) {
      setError("Error fetching recruitments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`app/recruitment/${deleteId}/`);
      toast.success("Deleted successfully");
      fetchRecruitments();
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ✅ For Offer Letter
  const handleOfferLetterClick = async (rec: Recruitment) => {
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      // Fetch all templates
      const tplRes = await axiosInstance.get('app/letter-templates/');
      setTemplateOptions(tplRes.data);
      // Fetch all generated letters for this candidate and type=offer
      const generatedRes = await axiosInstance.get(`app/generated-letters/?candidate_id=${rec.id}&type=offer`);
      const generatedLetters: { template: number }[] = Array.isArray(generatedRes.data) ? generatedRes.data : [];
      // If only one template, check if letter exists for that template
      if (tplRes.data.length === 1) {
        const templateId = tplRes.data[0].id;
        const found = generatedLetters.find((l) => l.template === templateId);
        if (found) {
          window.location.href = `/admin/letter-pdf?id=${rec.id}&type=offer&template_id=${templateId}`;
          setTemplateLoading(false);
          return;
        }
      } else {
        // If multiple templates, check if any generated letter exists for this candidate and type=offer
        for (const tpl of tplRes.data) {
          const found = generatedLetters.find((l) => l.template === tpl.id);
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

  // ✅ For Appointment Letter
  const handleAppointmentLetterClick = async (rec: Recruitment) => {
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      // Fetch all templates
      const tplRes = await axiosInstance.get('app/letter-templates/');
      setTemplateOptions(tplRes.data);
      // Fetch all generated letters for this candidate and type=appointment
      const generatedRes = await axiosInstance.get(`app/generated-letters/?candidate_id=${rec.id}&type=appointment`);
      const generatedLetters: { template: number }[] = Array.isArray(generatedRes.data) ? generatedRes.data : [];
      // If only one template, check if letter exists for that template
      if (tplRes.data.length === 1) {
        const templateId = tplRes.data[0].id;
        const found = generatedLetters.find((l) => l.template === templateId);
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
  const handleTemplateSelect = async (template_id: number) => {
    if (templateSelectFor) {
      // Check if letter already exists for this candidate and template, always include type
      try {
        const res = await axiosInstance.get(`app/generated-letters/?candidate_id=${templateSelectFor.id}&template_id=${template_id}&type=${templateSelectFor.type}`);
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
        <h1 className="text-2xl font-bold dark:text-gray-400">Recruitment List</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2 shadow"
          onClick={() => navigate("/admin/form-recruitment")}
        >
          <FaPlus /> Add
        </button>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? (
        <div className="text-center py-8 text-lg text-gray-500">Loading...</div>
      ) : (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] z-[1000] m-5">
        <div className="max-w-full overflow-x-auto">          
          <Table className="w-full border border-gray-200 rounded-lg shadow-lg bg-white">
              <TableRow className="bg-gray-100 text-sm font-semibold text-gray-700">
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">S.no</TableCell>
                <TableCell isHeader  className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Ref ID</TableCell>
                <TableCell  isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Name</TableCell>
                <TableCell  isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Email</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Job Title</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Salary</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Application Date</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Interview Date</TableCell>
                <TableCell  isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Appointment Date</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Guardian</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Status</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Action</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Offer Letter</TableCell>
              </TableRow>
            <TableBody>
              {recruitments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No recruitment records found.
                  </TableCell>
                </TableRow>
              ) : (
                recruitments.map((r, idx) => (
                  <TableRow
                    key={r.id}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                  >
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{idx + 1}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{r.reference_id}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{r.name}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{r.email}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{r.job_title}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{r.salary || "-"}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{r.application_date}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{r.interview_date}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{r.appointment_date}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{r.guardian_name}</TableCell>

                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                      <span
                        className={`px-2 py-1 rounded capitalize text-xs font-medium ${
                          r.status === "waiting"
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                            : r.status === "selected"
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                        }`}
                      >
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => setEditId(r.id)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </TableCell>

                      <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                        {r.status === 'selected' && (
                          <div className="flex gap-2">
                            <button
                              className="px-2 py-1 rounded capitalize text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 transition-colors"
                              style={{ minWidth: 90 }}
                              onClick={() => handleOfferLetterClick(r)}
                            >
                              Offer Letter
                            </button>
                            <button
                              className="px-2 py-1 rounded capitalize text-xs font-medium bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors"
                              style={{ minWidth: 120 }}
                              onClick={() => handleAppointmentLetterClick(r)}
                            >
                              Appointment Letter
                            </button>
                          </div>
                        )}
                      </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      )}

      {/* ✅ Edit Modal */}
      {editId && (
        <EditRecruitment
          id={editId}
          onClose={() => setEditId(null)}
          onUpdated={() => {
            fetchRecruitments();
            setEditId(null);
          }}
        />
      )}

      {/* ✅ Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this record?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-gray-200 rounded">
                Cancel
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ Template Modal (Optional future UI) */}
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
