import React, { useEffect, useState } from "react";
import { getProductById, updateProduct, ProductEditData } from "./api";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { ServiceData } from "./api";

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
    service: undefined,
    image: null,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (productId && isOpen) {
      setLoading(true);
      getProductById(productId)
        .then((product) => {
          setFormData({
            name: product.name,
            description: product.description || "",
            service: product.service_details?.id || "",
            image: product.image, // leave empty, only update if changed
            is_active: product.is_active,
          });
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
      setFormData((prev) => ({ ...prev, image: files[0] }));
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
      await updateProduct(productId!, formData);
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
            {/* Image */}
            <div className="mb-4">
            <Label htmlFor="image">Product Image</Label>

            {/* Show existing image if present */}
            {typeof formData.image === "string" && formData.image && (
                <div className="mb-2">
                <img
                    src={formData.image}
                    alt="Current product"
                    className="w-32 h-32 object-cover rounded border"
                />
                </div>
            )}

            <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
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
