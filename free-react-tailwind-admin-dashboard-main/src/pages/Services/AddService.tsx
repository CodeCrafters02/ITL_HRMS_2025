import React, { useState } from "react";
import { createService } from "./api";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

interface ServiceCreateData {
  name: string;
  description?: string;
  is_active: boolean;
}

interface AddServiceProps {
  onClose: () => void;
  onAdd: (newService: any) => void; // You can type better if you want
}

const AddService: React.FC<AddServiceProps> = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState<ServiceCreateData>({
    name: "",
    description: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);

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
    if (!formData.name.trim()) {
      // Optionally show error here
      return;
    }
    setLoading(true);
    try {
      const newService = await createService(formData);
      onAdd(newService); // Pass new service back to parent to update list
    } catch (err) {
      // Optionally handle error here
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Add New Service
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Service name"
              required
              disabled={loading}
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              disabled={loading}
              rows={3}
            />
          </div>
          <div className="mb-6 flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              disabled={loading}
              className="w-4 h-4"
            />
            <Label htmlFor="is_active" className="mb-0 cursor-pointer">
              Active
            </Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddService;
