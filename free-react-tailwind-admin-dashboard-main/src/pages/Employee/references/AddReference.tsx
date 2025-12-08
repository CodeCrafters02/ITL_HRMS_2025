import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createEmployeeReference } from "./api";
import { axiosInstance } from "../api.ts";
import { toast } from "react-toastify";
import { FaUserTie, FaUser, FaBriefcase, FaPhone, FaEnvelope, FaFileUpload, FaSave, FaTimes, FaCheckCircle } from "react-icons/fa";

interface EmployeeReferenceFormData {
  employee: number;
  name: string;
  designation: string;
  contact_number: string;
  email: string;
  resume?: File | null;
}

const AddEmployeeReference: React.FC = () => {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Omit<EmployeeReferenceFormData, "employee">>({
    name: "",
    designation: "",
    contact_number: "",
    email: "",
    resume: null,
  });

  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  // Fetch logged-in employee ID on mount
  useEffect(() => {
    const fetchEmployeeId = async () => {
      try {
        const response = await axiosInstance.get<{ id: number; full_name: string }>(
          "/employee-id/"
        );
        setEmployeeId(response.data.id);
      } catch (error) {
        console.error(error);
        toast.error("Failed to fetch employee info");
      }
    };
    fetchEmployeeId();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
      setFileName(files[0].name);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createEmployeeReference(formData);
      toast.success("Reference submitted successfully!");
      navigate("/employee/references");
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit reference");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => navigate("/employee/references");

  return (
    <div className="p-4 md:p-6 2xl:p-10 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl">
            <FaUserTie className="text-3xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add Employee Reference</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Submit a professional reference for verification</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Form Header */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FaUser className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reference Information</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Please provide accurate details of your professional reference</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  placeholder="Enter reference's full name"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
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
                  placeholder="e.g., Senior Manager, Team Lead"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
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
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
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
                  placeholder="reference@example.com"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>

              {/* Resume Upload - Full Width */}
              <div className="lg:col-span-2 space-y-2">
                <label htmlFor="resume" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <FaFileUpload className="text-orange-600" />
                  Upload Resume/CV (Optional)
                </label>
                <div className="relative">
                  <input
                    id="resume"
                    name="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="resume"
                    className="flex items-center justify-center gap-3 w-full px-4 py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer bg-gray-50 dark:bg-gray-700/50"
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
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOC, DOCX (Max 10MB)</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 rounded-lg">
              <div className="flex items-start gap-3">
                <FaCheckCircle className="text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Important Information</p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Ensure all contact details are accurate and up-to-date</li>
                    <li>• The reference will be contacted for verification by HR</li>
                    <li>• You can track the status of your reference in the References list</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Form Footer */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaTimes />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <FaSave />
                  Submit Reference
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeReference;
