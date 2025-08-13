import React, { useState, useEffect } from "react";
import { createProduct, getServiceList, ServiceData } from "./api";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

interface ProductCreateData {
  name: string;
  description?: string;
  service?: number;
  client?:string;
  images?: File[]; // now an array of files
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
    client:"",
    service: undefined,
    images: [],
    is_active: true,
  });

  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

useEffect(() => {
  if (!formData.images || formData.images.length === 0) {
    setPreviewUrls([]);
    return;
  }
  const urls = formData.images.map(file => URL.createObjectURL(file));
  setPreviewUrls(urls);

  console.log("Preview URLs set:", urls);

  return () => {
    urls.forEach(url => URL.revokeObjectURL(url));
  };
}, [formData.images]);


  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getServiceList();
        setServices(data.filter((service) => service.is_active));
      } catch (error) {
        console.error("Failed to fetch services", error);
      }
    };
    fetchServices();
  }, []);

  // Handle generic inputs (name, description, service, is_active)
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    if (name !== "images") {
      setFormData((prev) => ({
        ...prev,
        [name]:
          name === "service"
            ? value
              ? parseInt(value, 10)
              : undefined
            : type === "checkbox"
            ? checked
            : value,
      }));
    }
  };

  // Handle adding new image(s)
const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files) return;

  const newFiles = Array.from(e.target.files);
  console.log("Selected files:", newFiles);

  setFormData((prev) => {
    const updatedImages = [...(prev.images || []), ...newFiles];
    console.log("Updated images array:", updatedImages);
    return {
      ...prev,
      images: updatedImages,
    };
  });

  e.target.value = "";
};

  // Remove an image by index
  const removeImage = (index: number) => {
    setFormData((prev) => {
      const newImages = [...(prev.images || [])];
      newImages.splice(index, 1);
      return {
        ...prev,
        images: newImages,
      };
    });
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto">
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
            <div className="mb-4">
            <Label htmlFor="description">Client</Label>
            <textarea
              id="client"
              name="client"
              value={formData.client}
              onChange={handleChange}
              placeholder="Client"
              disabled={loading}
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

          {/* Multiple Image Upload */}
{/* Multiple Image Upload */}
<div className="mb-4">
  <Label>Product Images</Label>

  {/* Image previews */}
  <div className="flex flex-wrap gap-2 items-center mb-2">
    {previewUrls.length > 0 ? (
      previewUrls.map((url, idx) => (
        <div key={idx} className="relative w-20 h-20 border rounded overflow-hidden">
          <img
            src={url}
            alt={`Preview ${idx}`}
            className="object-cover w-full h-full"
          />
          <button
            type="button"
            onClick={() => removeImage(idx)}
            className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700"
          >
            &times;
          </button>
        </div>
      ))
    ) : (
      <p className="text-gray-500 dark:text-gray-400">No images selected</p>
    )}
  </div>

  {/* Add More Images Button */}
  <label
    htmlFor="image-upload"
    className={`flex items-center justify-center w-20 h-20 border border-dashed rounded cursor-pointer
      ${
        previewUrls.length > 0
          ? "border-green-500 text-green-600 dark:text-green-400"
          : "border-gray-400 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    title="Add Images"
  >
    {previewUrls.length > 0 ? (
      <span className="select-none text-sm font-semibold">
        + Add more ({previewUrls.length})
      </span>
    ) : (
      <span className="text-3xl select-none">+</span>
    )}
    <input
      id="image-upload"
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={handleImageChange}
      disabled={loading}
    />
  </label>
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
