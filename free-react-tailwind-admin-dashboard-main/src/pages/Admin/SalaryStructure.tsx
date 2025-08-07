import React, { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate } from "react-router-dom";

interface Allowance {
  id?: number;
  name: string;
  amount: number;
}

interface Deduction {
  id?: number;
  name: string;
  amount: number;
}

interface SalaryStructure {
  id: number;
  name: string;
  basic_percent: number;
  hra_percent: number;
  conveyance_percent: number;
  medical_percent: number;
  special_percent: number;
  service_charge_percent: number;
  total_working_days: number;
  created_at: string;
  allowances: Allowance[];
  deductions: Deduction[];
}

const SalaryStructureList: React.FC = () => {
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSalaryStructures = async () => {
      try {
        const response = await axiosInstance.get("/salary-structures/");
        setSalaryStructures(response.data);
      } catch (err: any) {
        setError("Failed to fetch salary structures");
      } finally {
        setLoading(false);
      }
    };
    fetchSalaryStructures();
  }, []);

  if (loading) return <div>Loading salary structures...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">Salary Structures</h2>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => navigate("/form-salary-structure")}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow hover:bg-blue-700"
        >
          Add Salary Structure
        </button>
      </div>
      <div className="overflow-x-auto bg-white rounded-xl shadow-lg p-8">
        {salaryStructures.length === 0 ? (
          <p className="text-center py-12 text-gray-500 text-lg">No salary structures found.</p>
        ) : (
          <table className="w-full border border-gray-200 rounded-xl shadow-lg bg-white text-base table-fixed">
            <colgroup>
              <col style={{width: '60px'}} />
              <col style={{width: '180px'}} />
              <col style={{width: '110px'}} />
              <col style={{width: '110px'}} />
              <col style={{width: '130px'}} />
              <col style={{width: '110px'}} />
              <col style={{width: '110px'}} />
              <col style={{width: '150px'}} />
              <col style={{width: '110px'}} />
              <col style={{width: '170px'}} />
              <col style={{width: '180px'}} />
              <col style={{width: '180px'}} />
              <col style={{width: '90px'}} />
            </colgroup>
            <thead>
              <tr className="bg-gray-100 sticky top-0 z-10 text-base font-bold text-gray-700">
                <th className="px-6 py-4 border-b">S.no</th>
                <th className="px-6 py-4 border-b">Name</th>
                <th className="px-6 py-4 border-b">Basic %</th>
                <th className="px-6 py-4 border-b">HRA %</th>
                <th className="px-6 py-4 border-b">Conveyance %</th>
                <th className="px-6 py-4 border-b">Medical %</th>
                <th className="px-6 py-4 border-b">Special %</th>
                <th className="px-6 py-4 border-b">Service Charge %</th>
                <th className="px-6 py-4 border-b">Total Days</th>
                <th className="px-6 py-4 border-b">Created At</th>
                <th className="px-6 py-4 border-b">Allowances</th>
                <th className="px-6 py-4 border-b">Deductions</th>
                <th className="px-6 py-4 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {salaryStructures.map((structure, idx) => (
                <tr key={structure.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50 transition-colors' : 'bg-gray-50 hover:bg-blue-50 transition-colors'}>
                  <td className="px-6 py-4 border-b">{idx + 1}</td>
                  <td className="px-6 py-4 border-b font-semibold">{structure.name}</td>
                  <td className="px-6 py-4 border-b">{structure.basic_percent}%</td>
                  <td className="px-6 py-4 border-b">{structure.hra_percent}%</td>
                  <td className="px-6 py-4 border-b">{structure.conveyance_percent}%</td>
                  <td className="px-6 py-4 border-b">{structure.medical_percent}%</td>
                  <td className="px-6 py-4 border-b">{structure.special_percent}%</td>
                  <td className="px-6 py-4 border-b">{structure.service_charge_percent}%</td>
                  <td className="px-6 py-4 border-b">{structure.total_working_days}</td>
                  <td className="px-6 py-4 border-b">{new Date(structure.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 border-b">
                    {structure.allowances.length > 0 ? (
                      <ul className="list-disc ml-4">
                        {structure.allowances.map((a, idx2) => (
                          <li key={idx2}>{a.name}: ₹{a.amount}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 border-b">
                    {structure.deductions.length > 0 ? (
                      <ul className="list-disc ml-4">
                        {structure.deductions.map((d, idx2) => (
                          <li key={idx2}>{d.name}: ₹{d.amount}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 border-b text-center">
                    <button className="text-red-600 hover:text-red-800 text-xl" title="Delete">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SalaryStructureList;
