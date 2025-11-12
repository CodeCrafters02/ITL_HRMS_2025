import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { toast } from "react-toastify";

interface EditAssetModalProps {
  isOpen: boolean;
  assetId: number;
  onClose: () => void;
  onUpdated: () => void;
}

const EditAssetModal: React.FC<EditAssetModalProps> = ({
  isOpen,
  assetId,
  onClose,
  onUpdated,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: 1,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      axiosInstance.get(`app/assets/${assetId}/`).then((res) => {
        setFormData(res.data);
      });
    }
  }, [assetId, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "quantity" ? Number(value) : value }));
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await axiosInstance.put(`app/assets/${assetId}/`, formData);
      toast.success("Asset updated successfully", { position: "bottom-right" });
      onUpdated();
    } catch {
      toast.error("Failed to update asset", { position: "bottom-right" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-8 w-full max-w-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Edit Asset</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold dark:text-gray-300 mb-1">Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold dark:text-gray-300 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold dark:text-gray-300 mb-1">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAssetModal;
