import { useEffect, useState } from "react";
import { FiTrash2, FiEdit, FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { getProductList, deleteProduct, getServiceList, ServiceData } from "./api";
import { toast } from "react-toastify";
import EditProduct from "./EditProducts";

interface ServiceDetails {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface ProductImageData {
  id: number;
  image: string; // image URL
}
interface Product {
  id: number;
  name: string;
  description?: string | null;
  client?:string;
  service_details?: ServiceDetails | null;
  images?: ProductImageData[];  // array of image objects
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchServices()]);
  }, []);

  const fetchProducts = async () => {
    try {
      const productList = await getProductList();
      setProducts(productList);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const serviceList = await getServiceList();
      setServices(serviceList);
    } catch (err) {
      console.error("Failed to fetch services", err);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteProduct(deleteId);
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success("Product deleted successfully!");
    } catch {
      toast.error("Failed to delete product.");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    }
  };

  const onProductUpdated = () => {
    fetchProducts();
    setIsEditModalOpen(false);
    setEditProductId(null);
  };

  // Handle navigation to add product page
  const handleAddProduct = () => {
    navigate("/master/products/add");
  };

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <PageMeta title="Products" description="Products management page" />
      <PageBreadcrumb pageTitle="Products" />
      <div className="space-y-6">
        <ComponentCard title="Product List">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Manage Products
            </h3>
            <Button
              onClick={handleAddProduct}
              className="flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Add New Product
            </Button>
          </div>

          <table className="min-w-full bg-white dark:bg-white/[0.03] rounded-xl overflow-hidden">
            <thead className="bg-gray-100 dark:bg-white/[0.05]">
              <tr>
                <th className="px-5 py-3 text-left">S.no</th>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Description</th>
                <th className="px-5 py-3 text-left">Service</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Active</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-2 text-gray-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((product, idx) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">{idx + 1}</td>
                    <td className="px-5 py-4">{product.name}</td>
                    <td className="px-5 py-4">{product.description || "-"}</td>
                    <td className="px-5 py-4">
                    {product.service_details 
                        ? `${product.service_details.name}` 
                        : "-"
                    }
                    </td>    
                    <td className="px-5 py-4">{product.client}</td>
                    <td className="px-5 py-4">{product.is_active ? "Yes" : "No"}</td>
                    <td className="px-5 py-4 flex gap-3">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                        onClick={() => {
                          setEditProductId(product.id);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <FiEdit />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                        onClick={() => handleDeleteClick(product.id)}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ComponentCard>
      </div>

      {isEditModalOpen && editProductId !== null && (
        <EditProduct
          services={services}
          productId={editProductId}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onProductUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-full max-w-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Confirm Delete</h3>
          <p className="mb-6 text-gray-700 dark:text-gray-300">Are you sure you want to delete this {products.find(p => p.id === deleteId)?.name}?</p>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded"
              onClick={() => { setIsDeleteModalOpen(false); setDeleteId(null); }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded"
              onClick={handleConfirmDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
export default ProductsPage;