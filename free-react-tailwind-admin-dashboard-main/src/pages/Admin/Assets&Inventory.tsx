import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { FaTrash, FaPlus, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell
} from "../../components/ui/table";

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
              onClick={() => navigate("/form-assets-inventory")}
            >
              <FaPlus /> Add Asset
            </button>
          </div>
          <Table className="min-w-full rounded-lg overflow-hidden">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableCell isHeader className="px-4 py-2 text-center">S.no</TableCell>
                <TableCell isHeader className="px-4 py-2 text-left">Name</TableCell>
                <TableCell isHeader className="px-4 py-2 text-left">Description</TableCell>
                <TableCell isHeader className="px-4 py-2 text-center">Quantity</TableCell>
                <TableCell isHeader className="px-4 py-2 text-center">Icon</TableCell>
                <TableCell isHeader className="px-4 py-2 text-center">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <td colSpan={6} className="text-center py-4 text-gray-500">No assets found.</td>
                </TableRow>
              ) : (
                assets.map((asset, idx) => (
                  <TableRow key={asset.id} className="hover:bg-gray-50">
                    {editId === asset.id ? (
                      <>
                        <TableCell className="px-4 py-2 text-center align-middle">{idx + 1}</TableCell>
                        <TableCell className="px-4 py-2 align-middle">
                          <input
                            type="text"
                            value={editAsset.name || ""}
                            onChange={e => handleEditChange("name", e.target.value)}
                            className="border rounded px-2 py-1 w-full"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2 align-middle">
                          <input
                            type="text"
                            value={editAsset.description || ""}
                            onChange={e => handleEditChange("description", e.target.value)}
                            className="border rounded px-2 py-1 w-full"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2 text-center align-middle">
                          <input
                            type="number"
                            value={editAsset.quantity || 0}
                            onChange={e => handleEditChange("quantity", Number(e.target.value))}
                            className="border rounded px-2 py-1 w-20 text-center"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2 text-center align-middle">
                          {/* Optionally add image upload/edit here */}
                          {asset.icon_image && (
                            <img
                              src={asset.icon_image}
                              alt="icon"
                              className="w-10 h-10 object-cover rounded border mx-auto"
                            />
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-2 flex gap-2 justify-center align-middle">
                          <button
                            className="btn btn-sm btn-success flex items-center gap-1"
                            title="Save"
                            onClick={() => updateAsset(asset.id)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary flex items-center gap-1"
                            title="Cancel"
                            onClick={() => { setEditId(null); setEditAsset({}); }}
                          >
                            Cancel
                          </button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="px-4 py-2 text-center align-middle">{idx + 1}</TableCell>
                        <TableCell className="px-4 py-2 align-middle">{asset.name}</TableCell>
                        <TableCell className="px-4 py-2 align-middle">{asset.description}</TableCell>
                        <TableCell className="px-4 py-2 text-center align-middle">
                          <Badge color="info" variant="light">{asset.quantity}</Badge>
                        </TableCell>
                        <TableCell className="px-4 py-2 text-center align-middle">
                          {asset.icon_image && (
                            <img
                              src={asset.icon_image}
                              alt="icon"
                              className="w-10 h-10 object-cover rounded border mx-auto"
                            />
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-2 flex gap-2 justify-center align-middle">
                          <button
                            className="btn btn-sm btn-primary flex items-center gap-1"
                            title="Edit"
                            onClick={() => startEdit(asset)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-sm btn-error flex items-center gap-1"
                            title="Delete"
                            onClick={() => handleDelete(asset.id)}
                          >
                            <FaTrash />
                          </button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {loading && <div className="text-center mt-4">Loading...</div>}
        </ComponentCard>
      </div>
    </>
  );
};

export default AssetsInventory;
