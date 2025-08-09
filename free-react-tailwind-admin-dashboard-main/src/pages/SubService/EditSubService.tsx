import React, { useEffect, useState } from "react";
import { getServiceList } from "../Services/api";
import { getSubServiceById, updateSubService } from "./api";

interface ServiceData {
  id: number;
  name: string;
  is_active: boolean;
}

interface SubServiceEditData {
  name: string;
  description?: string;
  service: number | "";
}

interface EditSubServiceProps {
  subServiceId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const EditSubService: React.FC<EditSubServiceProps> = ({
  subServiceId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [formData, setFormData] = useState<SubServiceEditData>({
    name: "",
    description: "",
    service: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const fetchServices = async () => {
      try {
        const list = await getServiceList();
        setServices(list);
      } catch {
        setError("Failed to load services");
      }
    };

    const fetchSubService = async () => {
      if (!subServiceId) return;

      setLoading(true);
      try {
        const data = await getSubServiceById(subServiceId);
        setFormData({
          name: data.name,
          description: data.description || "",
          service: data.service_details?.id || "",

        });
      } catch {
        setError("Failed to load subservice data");
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
    fetchSubService();
  }, [subServiceId, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "service" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.service) {
      setError("Please fill all required fields");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await updateSubService(subServiceId!, formData);
      onUpdated();
      onClose();
    } catch {
      setError("Failed to update subservice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">Edit SubService</h2>

        {loading ? (
          <div>Loading subservice...</div>
        ) : (
          <>
            {error && <div className="text-red-600 mb-2">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium" htmlFor="name">
                  Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block mb-1 font-medium" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="w-full border rounded px-3 py-2"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  disabled={saving}
                />
              </div>

            <div className="mb-4">
                <label className="block mb-1 font-medium" htmlFor="description">
                  Services
                </label>            
                <select
                id="service"
                name="service"
                value={formData.service || ""}
                onChange={handleChange}
                disabled={saving}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            >
                <option value="">Select a service</option>
                {services
                .filter((s) => s.is_active) // only show active services
                .map((s) => (
                    <option key={s.id} value={s.id}>
                    {s.name}
                    </option>
                ))}
            </select>
            </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={saving}
                >
                  {saving ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default EditSubService;
