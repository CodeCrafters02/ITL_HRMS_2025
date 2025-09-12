import { useEffect, useState } from "react";
import { FiTrash2, FiEdit } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { 
  getSubServiceList, 
  deleteSubService 
} from "./api";

import AddSubService from "./AddSubService";
import EditSubService from "./EditSubService";

interface SubService {
  id: number;
  name: string;
  description?: string | null;
  service: number;  // FK id
  service_details?: {
    id: number;
    name: string;
  };
  is_active?: boolean; // Optional - add if you track active status
  created_at?: string;
  updated_at?: string;
}

const SubServicesPage: React.FC = () => {
  const [subservices, setSubservices] = useState<SubService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSubServiceId, setEditSubServiceId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetchSubServices();
  }, []);

  const fetchSubServices = async () => {
    try {
      const list = await getSubServiceList();
  setSubservices(list as SubService[]);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };
  const confirmDelete = async (id: number) => {
    try {
      await deleteSubService(id);
      setSubservices((prev) => prev.filter((s) => s.id !== id));
      toast.success("Subservice deleted successfully.");
    } catch {
      toast.error("Failed to delete subservice.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // On add, append new subservice and close modal
  const onSubServiceAdded = (newSubService: SubService) => {
    setSubservices((prev) => [newSubService, ...prev]);
    setIsAddModalOpen(false);
  };

  // On update, refresh list, close modal and reset edit id
  const onSubServiceUpdated = () => {
    fetchSubServices();
    setIsEditModalOpen(false);
    setEditSubServiceId(null);
  };

  if (loading) return <div>Loading subservices...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <PageMeta title="SubServices" description="SubServices management page" />
      <PageBreadcrumb pageTitle="SubServices" />
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">SubService List</h2>
          <button
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add New SubService
          </button>

          <table
            className="min-w-full bg-white dark:bg-white/[0.03] rounded-xl overflow-hidden"
            aria-label="SubService List"
          >
            <thead className="bg-gray-100 dark:bg-white/[0.05]">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  S.no
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Name
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Description
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Service
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {subservices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-2 text-gray-400">
                    No subservices found.
                  </td>
                </tr>
              ) : (
                subservices.map((subservice, idx) => (
                  <tr
                    key={subservice.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.08]"
                  >
                    <td className="px-5 py-4 text-start">{idx + 1}</td>
                    <td className="px-5 py-4 text-start">{subservice.name}</td>
                    <td className="px-5 py-4 text-start">{subservice.description || "-"}</td>
                    <td className="px-5 py-4 text-start">
                      {subservice.service_details?.name || "N/A"}
                    </td>
                    <td className="px-5 py-4 text-start flex gap-3 items-center">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                        onClick={() => {
                          setEditSubServiceId(subservice.id);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <FiEdit />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                        onClick={() => handleDelete(subservice.id)}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
  </div>
      </div>

      {deleteConfirmId !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50  bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <div className="mb-4 text-lg font-semibold text-gray-800">Confirm Delete</div>
            <div className="mb-6 text-gray-600">Are you sure you want to delete this {subservices.find(s => s.id === deleteConfirmId)?.name}?</div>
            <div className="flex gap-4 justify-end">
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => confirmDelete(deleteConfirmId)}
              >
                Delete
              </button>
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {isAddModalOpen && (
        <AddSubService
          onClose={() => setIsAddModalOpen(false)}
          onAdd={onSubServiceAdded}
        />
      )}
      {isEditModalOpen && editSubServiceId !== null && (
        <EditSubService
          subServiceId={editSubServiceId}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onSubServiceUpdated}
        />
      )}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover aria-label="Notification" />
    </>
  );
};

export default SubServicesPage;
