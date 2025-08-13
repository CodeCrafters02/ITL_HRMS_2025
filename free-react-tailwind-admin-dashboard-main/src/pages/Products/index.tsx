import { useEffect, useState } from "react";
import { FiTrash2, FiEdit } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import { getProductList, deleteProduct,getServiceList,ServiceData } from "./api"; // product api
import AddProducts from "./AddProducts";
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
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]); // <-- new state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchServices()]);
  }, []);

  const fetchProducts = async () => {
    try {
      const productList = await getProductList();
      setProducts(productList);
    } catch (err: unknown) {
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

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Failed to delete product.");
    }
  };

  const onProductAdded = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
    setIsAddModalOpen(false);
  };

  const onProductUpdated = () => {
    fetchProducts();
    setIsEditModalOpen(false);
    setEditProductId(null);
  };

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <PageMeta title="Products" description="Products management page" />
      <PageBreadcrumb pageTitle="Products" />
      <div className="space-y-6">
        <ComponentCard title="Product List">
          <button
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add New Product
          </button>

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
                        onClick={() => handleDelete(product.id)}
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

      {isAddModalOpen && (
        <AddProducts
          services={services} // <-- pass here
          onClose={() => setIsAddModalOpen(false)}
          onAdd={onProductAdded}
        />
      )}

      {isEditModalOpen && editProductId !== null && (
        <EditProduct
          services={services} // <-- pass here
          productId={editProductId}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onProductUpdated}
        />
      )}
    </>
  );
};
export default ProductsPage;