import { useEffect, useState } from "react";
import { FiTrash2, FiEdit } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getSubServiceList, deleteSubService } from "./api";
import AddSubService from "./AddSubService";
import EditSubService from "./EditSubService";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";

interface SubService {
  id: number;
  name: string;
  description?: string | null;
  service: number;
  service_details?: {
    id: number;
    name: string;
  };
  is_active?: boolean;
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

  const onSubServiceAdded = (newSubService: SubService) => {
    setSubservices((prev) => [newSubService, ...prev]);
    setIsAddModalOpen(false);
  };

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
        {/* <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-xl shadow p-6"> */}
          {/* <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            SubService List
          </h2> */}
          <button
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add New SubService
          </button>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      S.no
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Description
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Service
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {subservices.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"
                        colSpan={5}
                      >
                        No subservices found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subservices.map((subservice, idx) => (
                      <TableRow
                        key={subservice.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                      >
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">
                          {subservice.name}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">
                          {subservice.description
                            ? subservice.description.length > 20
                              ? subservice.description.slice(0, 20) + "..."
                              : subservice.description
                            : "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">
                          {subservice.service_details?.name || "N/A"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">
                          <div className="flex gap-3 items-center">
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
                          </div>

                          {deleteConfirmId === subservice.id && (
                            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
                              <div className="bg-white rounded-lg shadow-lg p-6 w-80">
                                <div className="mb-4 text-lg font-semibold text-gray-800">
                                  Confirm Delete
                                </div>
                                <div className="mb-6 text-gray-600">
                                  Are you sure you want to delete{" "}
                                  <b>{subservice.name}</b>?
                                </div>
                                <div className="flex gap-4 justify-end">
                                  <button
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                    onClick={() => confirmDelete(subservice.id)}
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        {/* </div> */}
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

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        aria-label="Notification"
      />
    </>
  );
};

export default SubServicesPage;
