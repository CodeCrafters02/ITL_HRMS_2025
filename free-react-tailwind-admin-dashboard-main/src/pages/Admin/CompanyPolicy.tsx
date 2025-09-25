import React, { useEffect, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import { axiosInstance } from '../Dashboard/api';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface Policy {
  id: number;
  name: string;
  document: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company: number | { name?: string }; // support nested company object
}

const CompanyPolicy: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance
      .get("app/policies/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })
      .then((res) => {
        setPolicies(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch policies");
        setLoading(false);
      });
  }, []);


  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDeletePolicy = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`app/policies/${deleteId}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      setPolicies(prev => prev.filter(policy => policy.id !== deleteId));
      setDeleteId(null);
      setDeleteName("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      setError("Failed to delete policy.");
    }
  };

  if (loading) return <p>Loading policies...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <ComponentCard title={`Company Policies (${policies.length} total)`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Company Policies</h2>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            onClick={() => navigate('/admin/form-company-policy')}
          >
            + Add Policy
          </button>
        </div>
        {policies.length === 0 ? (
          <p>No policies available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="p-4 border rounded shadow bg-white hover:shadow-md transition relative"
              >
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                    onClick={() => navigate(`/admin/form-company-policy/${policy.id}`)}
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                    onClick={() => handleDeleteClick(policy.id, policy.name)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="font-bold text-lg">{policy.name}</h3>
                  {policy.document ? (
                  <a
                    href={policy.document}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View Document
                  </a>
                ) : (
                  <span className="text-gray-400">No document</span>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Last updated:{" "}
                  {policy.updated_at
                    ? new Date(policy.updated_at).toLocaleDateString()
                    : "N/A"}
                </p>
                {typeof policy.company === "object" &&
                  policy.company?.name && (
                    <p className="text-xs text-gray-500 mt-1">
                      Company: {policy.company.name}
                    </p>
                  )}
              </div>
            ))}
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Confirm Delete</h2>
              <p className="mb-6 text-gray-700 dark:text-gray-300">Are you sure you want to delete the policy <span className="font-semibold">{deleteName}</span>?</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setDeleteId(null); setDeleteName(""); }}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletePolicy}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </ComponentCard>
    </div>
  );
};

export default CompanyPolicy;
