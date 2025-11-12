import React, { useEffect, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell
} from "../../components/ui/table";

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
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
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
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      setPolicies(prev => prev.filter(policy => policy.id !== deleteId));
      setDeleteId(null);
      setDeleteName("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      setError("Failed to delete policy.");
    }
  };

  if (loading) return <p className="dark:text-gray-400">Loading policies...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <ComponentCard title={`Company Policies (${policies.length})`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold dark:text-gray-300">Company Policies</h2>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            onClick={() => navigate('/admin/form-company-policy')}
          >
            + Add Policy
          </button>
        </div>

        <Table className="w-full rounded-lg overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="text-center dark:text-gray-400">S.No</TableCell>
              <TableCell isHeader className="text-center dark:text-gray-400">Policy Name</TableCell>
              <TableCell isHeader className="text-center dark:text-gray-400">Document</TableCell>
              <TableCell isHeader className="text-center dark:text-gray-400">Active</TableCell>
              <TableCell isHeader className="text-center dark:text-gray-400">Company</TableCell>
              <TableCell isHeader className="text-center dark:text-gray-400">Last Updated</TableCell>
              <TableCell isHeader className="text-center dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 dark:text-gray-400">
                  No policies available.
                </TableCell>
              </TableRow>
            ) : (
              policies.map((policy, idx) => (
                <TableRow key={policy.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <TableCell className="text-center dark:text-gray-200">{idx + 1}</TableCell>
                  <TableCell className="text-center dark:text-gray-200">{policy.name}</TableCell>
                  <TableCell className="text-center">
                    {policy.document ? (
                      <a
                        href={policy.document}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center dark:text-gray-200">
                    {policy.is_active ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="text-center dark:text-gray-200">
                    {typeof policy.company === "object" && policy.company?.name ? policy.company.name : "N/A"}
                  </TableCell>
                  <TableCell className="text-center dark:text-gray-200">
                    {policy.updated_at ? new Date(policy.updated_at).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="flex justify-center gap-2 py-2">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => navigate(`/admin/form-company-policy/${policy.id}`)}
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDeleteClick(policy.id, policy.name)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Delete Modal */}
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Confirm Delete
              </h2>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Are you sure you want to delete <span className="font-semibold">{deleteName}</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                  onClick={() => { setDeleteId(null); setDeleteName(""); }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 font-medium"
                  onClick={confirmDeletePolicy}
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
