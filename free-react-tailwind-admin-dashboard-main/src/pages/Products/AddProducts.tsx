import React, { useState, useEffect } from "react";
import { createProduct, getServiceList, ServiceData } from "./api"; // updated api file
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

interface ProductCreateData {
  name: string;
  description?: string;
  service?: number;
  image?: File;
  is_active: boolean;
}

interface AddProductProps {
  onClose: () => void;
  onAdd: (newProduct: any) => void;
}

const AddProduct: React.FC<AddProductProps> = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState<ProductCreateData>({
    name: "",
    description: "",
    service: undefined,
    image: undefined,
    is_active: true,
  });
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch service list for dropdown
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getServiceList();
        setServices(data.filter(service => service.is_active));
      } catch (error) {
        console.error("Failed to fetch services", error);
      }
    };
    fetchServices();
  }, []);

    const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
    const { name, value, type, checked, files } = e.target as HTMLInputElement;
    
    if (type === "file" && files) {
        setFormData((prev) => ({
        ...prev,
        image: files[0],
        }));
    } else {
        setFormData((prev) => ({
        ...prev,
        [name]: name === "service"
            ? value ? parseInt(value, 10) : undefined // convert to number
            : type === "checkbox"
            ? checked
            : value,
        }));
    }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      const newProduct = await createProduct(formData);
      onAdd(newProduct);
      onClose();
    } catch(err) {
      alert("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Add New Product
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-4">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Product name"
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
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

          {/* Service Dropdown */}
          <div className="mb-4">
            <Label htmlFor="service">Service</Label>
            <select
              id="service"
              name="service"
              value={formData.service ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              disabled={loading}
              required
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          {/* Image Upload */}
          <div className="mb-4">
            <Label htmlFor="image">Product Image</Label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              onChange={handleChange}
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Active Checkbox */}
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

          {/* Buttons */}
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

export default AddProduct;
