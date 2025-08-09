import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { FaTrash, FaPlus, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/ui/badge/Badge";

// Asset type definition
interface Asset {
  id: number;
  name: string;
  description: string;
  quantity: number;
  icon_image: string;
}

const API_URL = "/assets/"; // Adjust to your actual endpoint

const AssetsInventory: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editAsset, setEditAsset] = useState<Partial<Asset>>({});
  const navigate = useNavigate();

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(API_URL);
      setAssets(res.data);
    } catch {
      // Optionally handle error
    }
    setLoading(false);
  };

  const startEdit = (asset: Asset) => {
    setEditId(asset.id);
    setEditAsset({ ...asset });
  };

  const handleEditChange = (field: keyof Asset, value: string | number) => {
    setEditAsset((prev) => ({ ...prev, [field]: value }));
  };

  const updateAsset = async (id: number) => {
    setLoading(true);
    try {
      await axiosInstance.put(`${API_URL}${id}/`, editAsset);
      setEditId(null);
      setEditAsset({});
      fetchAssets();
    } catch {
      // Optionally handle error
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      await axiosInstance.delete(`${API_URL}${id}/`);
      fetchAssets();
    } catch {
      // Optionally handle error
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  return (
    <>
      <PageMeta title="Assets & Inventory" description="Manage and view all company assets and inventory." />
      <PageBreadcrumb pageTitle="Assets & Inventory" />
      <div className="space-y-6">
        <ComponentCard title="Assets & Inventory">
          <div className="flex items-center justify-between mb-6">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2 shadow"
              onClick={() => navigate("/admin/form-assets-inventory")}
            >
              <FaPlus /> Add Asset
            </button>
          </div>
          {loading && <div className="text-center mt-4">Loading...</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.length === 0 ? (
              <div className="shadow-lg bg-yellow-50 rounded-xl border border-yellow-200 flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-lg font-medium mb-2">No assets found</p>
                <p className="text-sm">Get started by adding your first asset</p>
              </div>
            ) : (
              assets.map((asset, idx) => (
                <div key={asset.id} className="shadow-lg rounded-xl border border-gray-200 hover:shadow-2xl transition-shadow duration-200 bg-gradient-to-br from-green-50 via-indigo-100 to-purple-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-700">
                  <div className="p-6 space-y-3">
                    {editId === asset.id ? (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm dark:bg-blue-900/30 dark:text-blue-400">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={editAsset.name || ""}
                            onChange={e => handleEditChange("name", e.target.value)}
                            className="border rounded px-2 py-1 w-full"
                            placeholder="Asset Name"
                          />
                        </div>
                        <input
                          type="text"
                          value={editAsset.description || ""}
                          onChange={e => handleEditChange("description", e.target.value)}
                          className="border rounded px-2 py-1 w-full mb-2"
                          placeholder="Description"
                        />
                        <input
                          type="number"
                          value={editAsset.quantity || 0}
                          onChange={e => handleEditChange("quantity", Number(e.target.value))}
                          className="border rounded px-2 py-1 w-20 text-center mb-2"
                          placeholder="Quantity"
                        />
                        <div className="mb-2 text-center">
                          {asset.icon_image && (
                            <img
                              src={asset.icon_image}
                              alt="icon"
                              className="w-10 h-10 object-cover rounded border mx-auto"
                            />
                          )}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button className="text-green-600 hover:text-green-800" title="Save" onClick={() => updateAsset(asset.id)}>
                            <FaEdit />
                          </button>
                          <button className="text-gray-500 hover:text-gray-700" title="Cancel" onClick={() => { setEditId(null); setEditAsset({}); }}>
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm dark:bg-blue-900/30 dark:text-blue-400">
                            {idx + 1}
                          </span>
                          <span className="text-lg font-medium text-gray-900 dark:text-white truncate">
                            {asset.name}
                          </span>
                        </div>
                        <div className="mb-2 text-gray-700 dark:text-gray-400">
                          {asset.description}
                        </div>
                        <Badge variant="light">Quantity: {asset.quantity}</Badge>
                        <div className="mb-2 text-center">
                          {asset.icon_image && (
                            <img
                              src={asset.icon_image}
                              alt="icon"
                              className="w-10 h-10 object-cover rounded border mx-auto"
                            />
                          )}
                        </div>
                        <div className="flex gap-2 justify-end mt-2">
                          <button className="text-blue-600 hover:text-blue-800" title="Edit" onClick={() => startEdit(asset)}>
                            <FaEdit />
                          </button>
                          <button className="text-red-600 hover:text-red-800" title="Delete" onClick={() => handleDelete(asset.id)}>
                            <FaTrash />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ComponentCard>
      </div>
    </>
  );
};

export default AssetsInventory;
