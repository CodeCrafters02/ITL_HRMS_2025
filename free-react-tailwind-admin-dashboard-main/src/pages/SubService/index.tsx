import { useEffect, useState } from "react";
import { FiTrash2, FiEdit } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";

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
  is_active: boolean; // Optional - add if you track active status
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

  useEffect(() => {
    fetchSubServices();
  }, []);

  const fetchSubServices = async () => {
    try {
      const list = await getSubServiceList();
      setSubservices(list);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this subservice?")) return;
    try {
      await deleteSubService(id);
      setSubservices((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Failed to delete subservice.");
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
        <ComponentCard title="SubService List">
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
        </ComponentCard>
      </div>

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
    </>
  );
};

export default SubServicesPage;
