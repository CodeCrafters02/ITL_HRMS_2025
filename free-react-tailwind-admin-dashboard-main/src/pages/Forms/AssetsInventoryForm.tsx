import React, { useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate } from "react-router-dom";

const API_URL = "app/assets/";

const AssetsInventoryForm: React.FC = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [iconImage, setIconImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIconImage(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
    } else {
      setIconImage(null);
      setPreview("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("quantity", String(quantity));
    if (iconImage) formData.append("icon_image", iconImage);
    try {
      await axiosInstance.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/admin/assets-inventory");
    } catch (err: unknown) {
      type AxiosErrorDetail = { response?: { data?: { detail?: string } } };
      const errorObj = err as AxiosErrorDetail;
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in errorObj &&
        typeof errorObj.response === "object" &&
        errorObj.response?.data?.detail
      ) {
        setError(errorObj.response.data.detail);
      } else {
        setError("Failed to create asset");
      }
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-2 py-8 flex justify-center items-center min-h-[80vh] bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 transition-colors duration-300">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
          Add Asset
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
              required
              placeholder="Enter asset name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
              rows={2}
              placeholder="Enter asset description"
            />
          </div>

          {/* Quantity + Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Quantity<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
                required
                placeholder="Enter quantity"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Icon Image
              </label>
              <div className="flex items-center gap-4 mt-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-gray-900 dark:text-gray-200 
                    file:mr-4 file:py-2 file:px-4 
                    file:rounded-lg file:border-0 
                    file:text-sm file:font-semibold 
                    file:bg-blue-50 dark:file:bg-gray-700 
                    file:text-blue-700 dark:file:text-gray-200 
                    hover:file:bg-blue-100 dark:hover:file:bg-gray-600"
                />
                {preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 mt-2 justify-end">
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors duration-200"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
              onClick={() => navigate("/admin/assets-inventory")}
            >
              Cancel
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-500 dark:text-red-400 font-medium mt-2 text-center">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AssetsInventoryForm;
