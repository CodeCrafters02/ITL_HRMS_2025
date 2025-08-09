import { useEffect, useState } from "react";
import { FiTrash2,FiEdit} from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import { getServiceList,deleteService } from "./api";
import AddService from "./AddService";
import EditService from "./EditService";

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

const handleDelete = async (id: number) => {
  if (!window.confirm("Are you sure you want to delete this service?")) return;
  try {
    await deleteService(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  } catch {
    alert("Failed to delete service.");
  }
};


  // When a new service is added, refresh list or append to services
  const onServiceAdded = (newService: Service) => {
    setServices((prev) => [newService, ...prev]);
    setIsAddModalOpen(false);
  };
   const onServiceUpdated = () => {
    console.log("jj")
    fetchServices();
    setIsEditModalOpen(false);
    setEditServiceId(null);
  };

  if (loading) return <div>Loading services...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <PageMeta title="Services" description="Services management page" />
      <PageBreadcrumb pageTitle="Services" />
      <div className="space-y-6">
        <ComponentCard title="Service List">
          <button
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add New Service
          </button>

          <table
            className="min-w-full bg-white dark:bg-white/[0.03] rounded-xl overflow-hidden"
            aria-label="Services List"
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
                  Active
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-2 text-gray-400">
                    No services found.
                  </td>
                </tr>
              ) : (
                services.map((service, idx) => (
                  <tr
                    key={service.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.08]"
                  >
                    <td className="px-5 py-4 text-start">{idx + 1}</td>
                    <td className="px-5 py-4 text-start">{service.name}</td>
                    <td className="px-5 py-4 text-start">{service.description || "-"}</td>
                    <td className="px-5 py-4 text-start">{service.is_active ? "Yes" : "No"}</td>
                    <td className="px-5 py-4 text-start flex gap-3 items-center">
                    <button
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                      onClick={() => {
                        console.log("Editing service with ID:", service.id);
                      setEditServiceId(service.id);      //  store ID
                      setIsEditModalOpen(true);          //  open modal
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ComponentCard>
      </div>

      {isAddModalOpen && (
        <AddService
          onClose={() => setIsAddModalOpen(false)}
          onAdd={onServiceAdded}
        />
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
