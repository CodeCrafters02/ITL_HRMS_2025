import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";

interface CompanyPolicyFormProps {}

const CompanyPolicyForm: React.FC<CompanyPolicyFormProps> = () => {
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
        .get(`/policies/${id}/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        })
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
        await axiosInstance.put(`/policies/${id}/`, formData, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        await axiosInstance.post("/policies/", formData, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }
      navigate("/admin/configuration/company-policies");
    } catch {
      setError(
        id
          ? "Failed to update policy."
          : "Failed to add policy. Please check your input."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">
        {id ? "Update" : "Add"} Company Policy
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Policy Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Document (PDF, DOC, etc.)
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.xlsx,.ppt,.pptx"
            onChange={handleFileChange}
            className="w-full"
          />
          {id && existingDocUrl && (
            <div className="mt-2">
              <a
                href={existingDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                View Existing Document
              </a>
            </div>
          )}
        </div>
        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            id="isActive"
            className="mr-2"
          />
          <label htmlFor="isActive" className="text-sm">
            Active
          </label>
        </div>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {loading
              ? id
                ? "Updating..."
                : "Saving..."
              : id
              ? "Update Policy"
              : "Add Policy"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => navigate("/admin/configuration/company-policies")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyPolicyForm;
