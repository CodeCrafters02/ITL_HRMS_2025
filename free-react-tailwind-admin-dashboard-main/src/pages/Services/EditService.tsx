import React, { useEffect, useState } from "react";
import { getServiceById, updateService } from "./api";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

interface ServiceEditData {
  name: string;
  description?: string;
  is_active: boolean;
}

interface EditServiceModalProps {
  serviceId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void; // callback to refresh service list after update
}

const EditServiceModal: React.FC<EditServiceModalProps> = ({
  serviceId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<ServiceEditData>({
    name: "",
    description: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (serviceId && isOpen) {
      setLoading(true);
      getServiceById(serviceId)
        .then((service) => {
          setFormData({
            name: service.name,
            description: service.description || "",
            is_active: service.is_active,
          });
        })
        .catch(() => {
          alert("Failed to load service");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [serviceId, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.name.trim()) return;

  setSaving(true);
  try {
    await updateService(serviceId!, formData);
    alert("Service updated successfully!");
    onUpdated();
    // Move this after async stuff finishes
    onClose();
  } catch {
    alert("Failed to update service.");
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Edit Service
        </h2>

        {loading ? (
          <div>Loading service...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                disabled={saving}
              />
            </div>
            <div className="mb-6 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                disabled={saving}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="mb-0 cursor-pointer">
                Active
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditServiceModal;
