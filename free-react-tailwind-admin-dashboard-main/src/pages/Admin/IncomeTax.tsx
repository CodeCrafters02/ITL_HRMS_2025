import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { axiosInstance } from "../Dashboard/api";
import { AxiosError } from "axios";
import ComponentCard from "../../components/common/ComponentCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

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
      await axiosInstance.delete(`app/income-tax-configs/${deleteId}/`);
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
        const response = await axiosInstance.get("app/income-tax-configs/");
        setTaxConfigs(response.data);
      } catch (err: unknown) {
        let msg = "Failed to fetch data.";
        if (typeof err === "object" && err !== null) {
          const errorObj = err as AxiosError;
          if (errorObj.response && errorObj.response.data) {
            if (typeof errorObj.response.data === "string") {
              msg = errorObj.response.data;
            } else if (
              typeof errorObj.response.data === "object" &&
              "error" in errorObj.response.data
            ) {
              msg = String(
                (errorObj.response.data as Record<string, unknown>).error
              );
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
    <div className="p-4 dark:bg-gray-900 min-h-screen transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Income Tax Configuration
          </h2>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors duration-200"
            onClick={() => navigate("/admin/form-income-tax")}
          >
            + Add Income Tax
          </button>
        </div>

        {/* Loading / Error / Empty */}
        {loading && <p className="dark:text-gray-300">Loading...</p>}
        {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
        {!loading && !error && taxConfigs.length === 0 && (
          <p className="dark:text-gray-300">No tax configurations available.</p>
        )}

        {/* Table */}
        {!loading && !error && taxConfigs.length > 0 && (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] z-[1000] m-5">
        <div className="max-w-full overflow-x-auto">             
          <Table >
                <TableRow>
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                    Name
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                    Salary From
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                    Salary To
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                    Tax %
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                    Action
                  </TableCell>
                </TableRow>

              <TableBody>
                {taxConfigs.map((config) => (
                  <TableRow
                    key={config.id}
                    className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                      {config.name}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                      {config.salary_from}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                      {config.salary_to}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                      {config.tax_percent}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                      <button
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-lg font-bold"
                        title="Delete"
                        onClick={() => handleDeleteClick(config.id, config.name)}
                      >
                        &#128465;
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </div>
        )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md transform transition-all">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Confirm Delete
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {deleteName}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteName("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeTax;
