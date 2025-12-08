import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import { FaFileAlt, FaSave, FaTimes, FaUpload, FaCheckCircle, FaDownload, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";

const CompanyPolicyForm: React.FC = () => {
  const [name, setName] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingDocUrl, setExistingDocUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { id } = useParams();

  // Fetch existing policy if editing
  useEffect(() => {
    if (id) {
      setLoading(true);
      axiosInstance
        .get(`app/policies/${id}/`)
        .then((res) => {
          setName(res.data.name || "");
          setIsActive(res.data.is_active);
          if (res.data.document) setExistingDocUrl(res.data.document);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to fetch policy data.");
          setLoading(false);
        });
    }
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocument(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("name", name);
    if (document) formData.append("document", document);
    formData.append("is_active", String(isActive));
    try {
      if (id) {
        await axiosInstance.patch(`app/policies/${id}/`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Policy updated successfully!", { position: "bottom-right" });
      } else {
        await axiosInstance.post("app/policies/", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Policy added successfully!", { position: "bottom-right" });
      }
      navigate("/admin/configuration/company-policies");
    } catch {
      setError(
        id
          ? "Failed to update policy."
          : "Failed to add policy. Please check your input."
      );
      toast.error(id ? "Failed to update policy" : "Failed to add policy", { position: "bottom-right" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 2xl:p-10 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="relative p-8 bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <FaFileAlt className="text-3xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{id ? "Edit Policy" : "Add New Policy"}</h1>
                <p className="text-indigo-100 mt-1">
                  {id ? "Update existing company policy" : "Create a new company policy document"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
              <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Policy Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Policy Name *
              </label>
              <div className="relative">
                <FaFileAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter policy name..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Policy Document {!id && "*"}
              </label>

              {/* Upload Area */}
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.xlsx,.ppt,.pptx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="document-upload"
                />
                <label
                  htmlFor="document-upload"
                  className="flex items-center justify-center gap-3 w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-all bg-gray-50 dark:bg-gray-700/50"
                >
                  <FaUpload className="text-2xl text-indigo-600 dark:text-indigo-400" />
                  <div className="text-center">
                    <p className="text-gray-700 dark:text-gray-300 font-medium">
                      {document ? document.name : existingDocUrl ? "Click to change document" : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      PDF, DOC, DOCX, TXT, XLSX, PPT, PPTX
                    </p>
                  </div>
                </label>
              </div>

              {/* Currently Attached Document (for edit mode) */}
              {id && existingDocUrl && !document && (
                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaFileAlt className="text-blue-600 dark:text-blue-400" />
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Currently Attached Document</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">This document will be kept unless you upload a new one</span>
                      </div>
                    </div>
                    <a
                      href={existingDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium text-sm"
                    >
                      <FaDownload />
                      Download
                    </a>
                  </div>
                </div>
              )}

              {/* New Document Selected */}
              {document && (
                <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaCheckCircle className="text-green-600 dark:text-green-400" />
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">New file selected: {document.name}</span>
                        {existingDocUrl && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">This will replace the current document</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDocument(null)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active Status */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  id="isActive"
                  className="w-5 h-5 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                />
                <label htmlFor="isActive" className="flex-1 cursor-pointer">
                  <p className="font-semibold text-gray-900 dark:text-white">Active Policy</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Enable this policy to make it visible and accessible to employees
                  </p>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate("/admin/configuration/company-policies")}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-semibold transition-all"
              >
                <FaTimes />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    {id ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <FaSave />
                    {id ? "Update Policy" : "Add Policy"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanyPolicyForm;
