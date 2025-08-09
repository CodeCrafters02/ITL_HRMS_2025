import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api"; // adjust path as needed

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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTaxConfigs = async () => {
      try {
        const response = await axiosInstance.get("/income-tax-configs/");
        setTaxConfigs(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };

    fetchTaxConfigs();
  }, []);

  return (
    <div className="p-4">
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
              </tr>
            </thead>
            <tbody>
              {taxConfigs.map((config) => (
                <tr key={config.id}>
                  <td className="p-2 border">{config.name}</td>
                  <td className="p-2 border">{config.salary_from}</td>
                  <td className="p-2 border">{config.salary_to}</td>
                  <td className="p-2 border">{config.tax_percent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default IncomeTax;
