import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiTrash2, FiEdit } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import { getServiceList, deleteService } from "./api";
import AddService from "./AddService";
import EditService from "./EditService";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";

interface Service {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editServiceId, setEditServiceId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const servicesList = await getServiceList();
      setServices(servicesList);
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
      await deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.success("Service deleted successfully.");
    } catch {
      toast.error("Failed to delete service.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const onServiceAdded = (newService: Service) => {
    setServices((prev) => [newService, ...prev]);
    setIsAddModalOpen(false);
  };

  const onServiceUpdated = () => {
    fetchServices();
    setIsEditModalOpen(false);
    setEditServiceId(null);
  };

  if (loading) return <div>Loading services...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover aria-label="Notification" />
      <PageMeta title="Services" description="Services management page" />
      <PageBreadcrumb pageTitle="Services" />

      <div className="space-y-6">
        {/* <ComponentCard title="Service List"> */}
          <button
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add New Service
          </button>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      #
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Name
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Description
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Active
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                        No services found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((service, idx) => (
                      <TableRow key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{idx + 1}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{service.name}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">
                          {service.description
                            ? service.description.length > 20
                              ? service.description.slice(0, 20) + "..."
                              : service.description
                            : "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{service.is_active ? "Yes" : "No"}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">
                          <div className="flex gap-3 items-center">
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                              onClick={() => {
                                setEditServiceId(service.id);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <FiEdit />
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                              onClick={() => handleDelete(service.id)}
                            >
                              <FiTrash2 />
                            </button>
                          </div>

                          {deleteConfirmId === service.id && (
                            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
                              <div className="bg-white rounded-lg shadow-lg p-6 w-80">
                                <div className="mb-4 text-lg font-semibold text-gray-800">Confirm Delete</div>
                                <div className="mb-6 text-gray-600">
                                  Are you sure you want to delete <b>{service.name}</b>?
                                </div>
                                <div className="flex gap-4 justify-end">
                                  <button
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                    onClick={() => confirmDelete(service.id)}
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
        {/* </ComponentCard> */}
      </div>

      {isAddModalOpen && (
        <AddService onClose={() => setIsAddModalOpen(false)} onAdd={onServiceAdded} />
      )}
      {isEditModalOpen && editServiceId !== null && (
        <EditService
          serviceId={editServiceId}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onServiceUpdated}
        />
      )}
    </>
  );
};

export default ServicesPage;
