import React, { useEffect, useState } from "react";
import { getEmployeeReferenceById, updateEmployeeReference } from "./api";
import { toast } from "react-toastify";
import { FaEdit, FaUser, FaBriefcase, FaPhone, FaEnvelope, FaFileUpload, FaSave, FaTimes, FaDownload, FaCheckCircle } from "react-icons/fa";

interface EditEmployeeReferenceProps {
  referenceId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

interface EmployeeReferenceEditData {
  name: string;
  designation: string;
  contact_number: string;
  email: string;
  resume?: File | null;
  existing_resume?: string;
}

const EditEmployeeReference: React.FC<EditEmployeeReferenceProps> = ({
  referenceId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [formData, setFormData] = useState<EmployeeReferenceEditData>({
    name: "",
    designation: "",
    contact_number: "",
    email: "",
    resume: null,
    existing_resume: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  // Fetch reference data when modal opens
  useEffect(() => {
    if (referenceId && isOpen) {
      setLoading(true);
      getEmployeeReferenceById(referenceId)
        .then((data) => {
          setFormData({
            name: data.name,
            designation: data.designation,
            contact_number: data.contact_number,
            email: data.email,
            existing_resume: data.resume || "",
          });
        })
        .catch(() => toast.error("Failed to load reference details"))
        .finally(() => setLoading(false));
    }
  }, [referenceId, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, files } = e.target as HTMLInputElement;
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, resume: files[0] }));
      setFileName(files[0].name);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateEmployeeReference(referenceId!, {
        name: formData.name,
        designation: formData.designation,
        contact_number: formData.contact_number,
        email: formData.email,
        resume: formData.resume,
      });
      toast.success("Reference updated successfully!");
      onUpdated();
      onClose();
    } catch {
      toast.error("Failed to update reference");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative p-8 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <FaEdit className="text-2xl" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Edit Reference</h2>
                <p className="text-blue-100 mt-1">Update reference information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-3 hover:bg-white/20 backdrop-blur-sm text-white hover:rotate-90 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaTimes className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(92vh-280px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reference details...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <FaUser className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <FaUser className="text-blue-600" />
                      Full Name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={saving}
                      placeholder="Enter reference's full name"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all disabled:opacity-50"
                    />
                  </div>

                  {/* Designation */}
                  <div className="space-y-2">
                    <label htmlFor="designation" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <FaBriefcase className="text-purple-600" />
                      Designation *
                    </label>
                    <input
                      id="designation"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      required
                      disabled={saving}
                      placeholder="e.g., Senior Manager, Team Lead"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all disabled:opacity-50"
                    />
                  </div>

                  {/* Contact Number */}
                  <div className="space-y-2">
                    <label htmlFor="contact_number" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <FaPhone className="text-green-600" />
                      Contact Number *
                    </label>
                    <input
                      id="contact_number"
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleChange}
                      required
                      disabled={saving}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all disabled:opacity-50"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <FaEnvelope className="text-red-600" />
                      Email Address *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={saving}
                      placeholder="reference@example.com"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <FaFileUpload className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Resume/CV</h3>
                </div>

                {/* Current Resume */}
                {formData.existing_resume && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaCheckCircle className="text-green-600 text-xl" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Current Resume</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Click to view existing file</p>
                        </div>
                      </div>
                      <a
                        href={formData.existing_resume}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all"
                      >
                        <FaDownload />
                        View
                      </a>
                    </div>
                  </div>
                )}

                {/* New Upload */}
                <div className="space-y-2">
                  <label htmlFor="resume" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {formData.existing_resume ? 'Replace Resume (Optional)' : 'Upload Resume (Optional)'}
                  </label>
                  <div className="relative">
                    <input
                      id="resume"
                      name="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleChange}
                      disabled={saving}
                      className="hidden"
                    />
                    <label
                      htmlFor="resume"
                      className={`flex items-center justify-center gap-3 w-full px-4 py-4 border-2 border-dashed rounded-lg transition-all cursor-pointer ${saving
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-700/50'
                        }`}
                    >
                      <FaFileUpload className="text-2xl text-gray-400" />
                      <div className="text-center">
                        {fileName ? (
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{fileName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Click to change file</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload new file</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOC, DOCX (Max 10MB)</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!loading && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 px-8 py-3.5 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaTimes />
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FaSave />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditEmployeeReference;
