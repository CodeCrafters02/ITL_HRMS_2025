import React, { useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate } from "react-router-dom";

const API_URL = "/assets/"; 

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
      setError((err as any)?.response?.data?.detail || "Failed to create asset");
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-2 py-8 flex justify-center items-center min-h-[80vh]">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Add Asset</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input input-bordered w-full focus:ring-2 focus:ring-primary"
              required
              placeholder="Enter asset name"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full focus:ring-2 focus:ring-primary"
              rows={2}
              placeholder="Enter asset description"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1 text-gray-700">Quantity<span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="input input-bordered w-full focus:ring-2 focus:ring-primary"
                required
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-gray-700">Icon Image</label>
              <div className="flex items-center gap-4 mt-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file-input file-input-bordered"
                />
                {preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded border"
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2 justify-end">
            <button
              type="submit"
              className="px-6 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="px-6 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
              onClick={() => navigate("/admin/assets-inventory")}
            >
              Cancel
            </button>
          </div>
          {error && <div className="text-red-500 font-medium mt-2 text-center">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default AssetsInventoryForm;
