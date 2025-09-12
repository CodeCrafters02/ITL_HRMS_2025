import React, { useEffect, useState } from "react";
import { getServiceList } from "../Services/api";  
import { createSubService } from "./api";

interface ServiceOption {
  id: number;
  name: string;
  is_active?: boolean;
}


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

interface AddSubServiceProps {
  onClose: () => void;
  onAdd: (newSubService: SubService) => void;
}

const AddSubService: React.FC<AddSubServiceProps> = ({ onClose, onAdd }) => {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serviceId, setServiceId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const list = await getServiceList();
        setServices(list);
      } catch {
        setError("Failed to load services");
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !serviceId) {
      setError("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const data = {
        name,
        description,
        service: serviceId,
      };
      const newSubService = await createSubService(data);
      onAdd(newSubService);
    } catch {
      setError("Failed to create subservice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">Add New SubService</h2>

        {error && <div className="text-red-600 mb-2">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Name *</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Description</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

        <div>
        <label className="block mb-1 font-medium">Service *</label>
        {loadingServices ? (
            <div>Loading services...</div>
        ) : (
            <select
            className="w-full border rounded px-3 py-2"
            value={serviceId}
            onChange={(e) => setServiceId(Number(e.target.value))}
            required
            >
            <option value="">Select a service</option>
            {services
                .filter((s) => s.is_active)
                .map((s) => (
                <option key={s.id} value={s.id}>
                    {s.name}
                </option>
                ))}
            </select>
        )}
        </div>


          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="px-4 py-2 border rounded"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded"
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubService;
