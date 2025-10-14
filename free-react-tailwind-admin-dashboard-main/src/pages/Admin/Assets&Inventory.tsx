import React, { useEffect, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import { axiosInstance } from "../Dashboard/api";
import { FaTrash, FaPlus, FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import EditAssetModal from "./EditAsset";


interface Asset {
  id: number;
  name: string;
  description: string;
  quantity: number;
  icon_image: string;
}

const API_URL = "app/assets/";

const AssetsInventory: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  const navigate = useNavigate();

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(API_URL);
      setAssets(res.data);
    } catch {
      toast.error("Failed to fetch assets", { position: "bottom-right" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await axiosInstance.delete(`${API_URL}${deleteId}/`);
      setAssets((prev) => prev.filter((a) => a.id !== deleteId));
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete asset", { position: "bottom-right" });
    } finally {
      setDeleteId(null);
      setDeleteName("");
      setLoading(false);
    }
  };

  const handleEditClick = (id: number) => {
    setSelectedAssetId(id);
    setIsEditModalOpen(true);
  };

  const handleAssetUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedAssetId(null);
    fetchAssets();
  };

  return (
    <>
      <PageMeta title="Assets & Inventory" description="Manage and view all company assets." />
      <PageBreadcrumb pageTitle="Assets & Inventory" />

        <div className="flex items-center justify-between mb-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2 shadow"
            onClick={() => navigate("/admin/form-assets-inventory")}
          >
            <FaPlus /> Add Asset
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-300">Loading...</div>
        ) : assets.length === 0 ? (
          <div className="text-center py-6 text-gray-600 dark:text-gray-400">No assets available</div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <Table className="min-w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <TableRow className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">#</TableCell>
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Name</TableCell>
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Description</TableCell>
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Quantity</TableCell>
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Icon</TableCell>
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Actions</TableCell>
                </TableRow>
              <TableBody>
                {assets.map((asset, index) => (
                  <TableRow key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{index + 1}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{asset.name}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{asset.description}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                      {asset.quantity}
                    </TableCell>
                    <TableCell className="p-3 text-center">
                      {asset.icon_image && (
                        <img
                          src={asset.icon_image}
                          alt="icon"
                          className="w-10 h-10 object-cover rounded mx-auto border dark:border-gray-600"
                        />
                      )}
                    </TableCell>
                    <TableCell className="p-3 text-center flex justify-center gap-3">
                      <button
                        onClick={() => handleEditClick(asset.id)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(asset.id, asset.name)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Confirm Delete
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-400">
              Are you sure you want to delete asset{" "}
              <span className="font-semibold">{deleteName}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteName("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedAssetId !== null && (
        <EditAssetModal
          isOpen={isEditModalOpen}
          assetId={selectedAssetId}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAssetId(null);
          }}
          onUpdated={handleAssetUpdated}
        />
      )}
    </>
  );
};

export default AssetsInventory;
