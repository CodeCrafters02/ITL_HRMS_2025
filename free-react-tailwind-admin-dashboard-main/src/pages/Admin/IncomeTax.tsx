import { useEffect, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { axiosInstance } from "../Dashboard/api"; // adjust path as needed
import { AxiosError } from "axios";

interface IncomeTaxConfig {
  id: number;
  name: string;
  salary_from: string;
  salary_to: string;
  tax_percent: string;
}

const IncomeTax = () => {
  const [taxConfigs, setTaxConfigs] = useState<IncomeTaxConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const navigate = useNavigate();
  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`/income-tax-configs/${deleteId}/`);
      setTaxConfigs((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
      setDeleteName("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete", { position: "bottom-right" });
    }
  };

  useEffect(() => {
    const fetchTaxConfigs = async () => {
      try {
        const response = await axiosInstance.get("/income-tax-configs/");
        setTaxConfigs(response.data);
      } catch (err: unknown) {
        let msg = "Failed to fetch data.";
        if (typeof err === "object" && err !== null) {
          const errorObj = err as AxiosError;
          if (errorObj.response && errorObj.response.data) {
            if (typeof errorObj.response.data === "string") {
              msg = errorObj.response.data;
            } else if (typeof errorObj.response.data === "object" && "error" in errorObj.response.data) {
              msg = String((errorObj.response.data as Record<string, unknown>).error);
            }
          } else if ("message" in errorObj && typeof errorObj.message === "string") {
            msg = errorObj.message;
          }
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchTaxConfigs();
  }, []);

  return (
    <div className="p-4">
      <ComponentCard title={`Income Tax Configuration (${taxConfigs.length} total)`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Income Tax Configuration</h2>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow"
            onClick={() => navigate("/admin/form-income-tax")}
          >
            + Add Income Tax
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && taxConfigs.length === 0 && (
          <p>No tax configurations available.</p>
        )}

        {!loading && !error && taxConfigs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Name</th>
                  <th className="p-2 border">Salary From</th>
                  <th className="p-2 border">Salary To</th>
                  <th className="p-2 border">Tax %</th>
                  <th className="p-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {taxConfigs.map((config) => (
                    <tr key={config.id}>
                      <td className="p-2 border">{config.name}</td>
                      <td className="p-2 border">{config.salary_from}</td>
                      <td className="p-2 border">{config.salary_to}</td>
                      <td className="p-2 border">{config.tax_percent}</td>
                      <td className="p-2 border text-center">
                        <button
                          className="text-red-600 hover:text-red-800 text-lg font-bold"
                          title="Delete"
                          onClick={() => handleDeleteClick(config.id, config.name)}
                        >
                          &#128465;
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Delete</h2>
              <p className="mb-6 text-gray-700">Are you sure you want to delete this department <span className="font-semibold">{deleteName}</span>?</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setDeleteId(null); setDeleteName(""); }}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
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
      </ComponentCard>
    </div>
  );
};

export default IncomeTax;
