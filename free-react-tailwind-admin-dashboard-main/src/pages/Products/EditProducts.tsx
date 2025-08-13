import React, { useEffect, useState } from "react";
import { getProductById, updateProduct, ProductEditData } from "./api";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { ServiceData } from "./api";

interface ImageType {
  id: number;
  image: string; // image URL
}
interface EditProductModalProps {
  productId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  services: ServiceData[]; // <-- new
}

const EditProduct: React.FC<EditProductModalProps> = ({
  productId,
  isOpen,
  onClose,
  onUpdated,
  services,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<ProductEditData>({
    name: "",
    description: "",
    client:"",
    service: undefined,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingImages, setExistingImages] = useState<ImageType[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<number[]>([]);

  useEffect(() => {
    if (productId && isOpen) {
      setLoading(true);
      getProductById(productId)
        .then((product) => {
          setFormData({
            name: product.name,
            description: product.description || "",
            service: product.service_details?.id || "",
            client: product.client, // leave empty, only update if changed
            is_active: product.is_active,
          });
          setExistingImages(product.images || []); // <-- set existing images here
          setNewImages([]); // reset new images
          setImagesToRemove([]); // reset removals
        })
        .catch(() => {
          alert("Failed to load product");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [productId, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked, files } = e.target as HTMLInputElement;

    if (name === "image" && files) {
      setNewImages((prev) => [...prev, ...Array.from(files)]);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.name.trim()) return;

  setSaving(true);
  try {
    const dataToSend = new FormData();

    // Append text fields
    dataToSend.append("name", formData.name);
    if (formData.description) dataToSend.append("description", formData.description);
    if (formData.client) dataToSend.append("client", formData.client);
    if (formData.service) dataToSend.append("service", String(formData.service));
    dataToSend.append("is_active", String(formData.is_active));

    // Append new image files
    newImages.forEach((file) => dataToSend.append("images", file));

    // Append IDs of images to remove
    imagesToRemove.forEach((id) => dataToSend.append("imagesToRemove", String(id)));

    await updateProduct(productId!, dataToSend, true); // pass flag if you want to customize axios call
    alert("Product updated successfully!");
    onUpdated();
    onClose();
  } catch {
    alert("Failed to update product.");
  } finally {
    setSaving(false);
  }
};


  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Edit Product
        </h2>

        {loading ? (
          <div>Loading product...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Name */}
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

            {/* Description */}
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

            {/* Service */}
            <div className="mb-4">
            <Label htmlFor="service">Service</Label>
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

            <div className="mb-4">
              <Label htmlFor="name">Client</Label>
              <Input
                id="client"
                name="client"
                value={formData.client}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>

            {/* Image */}
          <div className="mb-4">
            <Label>Existing Images</Label>
            <div className="flex gap-2 flex-wrap mb-2">
              {existingImages.map((img) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.image}
                    alt={`Product ${img.id}`}
                    className="w-24 h-24 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagesToRemove((prev) => [...prev, img.id]);
                      setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
                    }}
                    className="absolute top-0 right-0 bg-red-600 text-white rounded-full px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <Label>New Images</Label>
            <div className="flex gap-2 flex-wrap mb-2">
              {newImages.map((file, index) => {
                const url = URL.createObjectURL(file);
                return (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`New ${index}`}
                      className="w-24 h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setNewImages((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full px-1"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              multiple
              onChange={handleChange}
              disabled={saving}
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
                disabled={saving}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="mb-0 cursor-pointer">
                Active
              </Label>
            </div>

            {/* Buttons */}
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

export default EditProduct;
