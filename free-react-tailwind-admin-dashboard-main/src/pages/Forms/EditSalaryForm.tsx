import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import Label from "../../components/form/Label";
import InputField from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

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
  created_at?: string;
  allowances: Allowance[];
  deductions: Deduction[];
}

const EditSalaryFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const salaryId = Number(id);
  const navigate = useNavigate();

  const [salaryData, setSalaryData] = useState<SalaryStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [allowanceName, setAllowanceName] = useState("");
  const [allowanceAmount, setAllowanceAmount] = useState("0");
  const [deductionName, setDeductionName] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("0");

  useEffect(() => {
    if (!salaryId) return;
    const fetchSalary = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get(`app/salary-structures/${salaryId}/`);
        setSalaryData(response.data);
      } catch (err) {
        toast.error("Failed to fetch salary structure.");
      } finally {
        setLoading(false);
      }
    };
    fetchSalary();
  }, [salaryId]);

  const handleAddAllowance = () => {
    if (!allowanceName || Number(allowanceAmount) <= 0) return;
    setSalaryData(prev => prev ? {
      ...prev,
      allowances: [...prev.allowances, { name: allowanceName, amount: Number(allowanceAmount) }]
    } : prev);
    setAllowanceName("");
    setAllowanceAmount("0");
  };

  const handleRemoveAllowance = (idx: number) => {
    setSalaryData(prev => prev ? {
      ...prev,
      allowances: prev.allowances.filter((_, i) => i !== idx)
    } : prev);
  };

  const handleAddDeduction = () => {
    if (!deductionName || Number(deductionAmount) <= 0) return;
    setSalaryData(prev => prev ? {
      ...prev,
      deductions: [...prev.deductions, { name: deductionName, amount: Number(deductionAmount) }]
    } : prev);
    setDeductionName("");
    setDeductionAmount("0");
  };

  const handleRemoveDeduction = (idx: number) => {
    setSalaryData(prev => prev ? {
      ...prev,
      deductions: prev.deductions.filter((_, i) => i !== idx)
    } : prev);
  };

  const handleChange = (field: keyof SalaryStructure, value: string) => {
    setSalaryData(prev => prev ? { ...prev, [field]: Number(value) } : prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryData) return;
    setLoading(true);
    try {
      await axiosInstance.put(`app/salary-structures/${salaryId}/`, salaryData);
      toast.success("Salary structure updated successfully!");
      navigate("/admin/salary-structure"); // Redirect back to list
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update salary structure.");
    } finally {
      setLoading(false);
    }
  };

  if (!salaryData) return <div className="p-6">Loading salary structure...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <ToastContainer position="bottom-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 dark:text-gray-400">Edit Salary Structure</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <Label htmlFor="name">Name *</Label>
          <InputField
            id="name"
            value={salaryData.name}
            onChange={e => setSalaryData(prev => prev ? { ...prev, name: e.target.value } : prev)}
            required
            disabled={loading}
          />
        </div>

        {/* Percentage Fields */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: "basic_percent", label: "Basic %", value: salaryData.basic_percent },
            { id: "hra_percent", label: "HRA %", value: salaryData.hra_percent },
            { id: "conveyance_percent", label: "Conveyance %", value: salaryData.conveyance_percent },
            { id: "medical_percent", label: "Medical %", value: salaryData.medical_percent },
            { id: "special_percent", label: "Special %", value: salaryData.special_percent },
            { id: "service_charge_percent", label: "Service Charge %", value: salaryData.service_charge_percent },
            { id: "total_working_days", label: "Working Days", value: salaryData.total_working_days },
          ].map(f => (
            <div key={f.id}>
              <Label htmlFor={f.id}>{f.label}</Label>
              <InputField
                id={f.id}
                type="number"
                value={String(f.value)}
                onChange={e => handleChange(f.id as keyof SalaryStructure, e.target.value)}
                min="0"
              />
            </div>
          ))}
        </div>

        {/* Allowances */}
        <div>
          <Label>Allowances</Label>
          <div className="flex gap-2 mb-2">
            <InputField
              type="text"
              placeholder="Name"
              value={allowanceName}
              onChange={e => setAllowanceName(e.target.value)}
            />
            <InputField
              type="number"
              placeholder="Amount"
              value={allowanceAmount}
              onChange={e => setAllowanceAmount(e.target.value)}
            />
            <Button type="button" onClick={handleAddAllowance}>Add</Button>
          </div>
          <div className="space-y-1">
            {salaryData.allowances.map((a, idx) => (
              <div key={idx} className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                <span>{a.name}: ₹{a.amount}</span>
                <button type="button" onClick={() => handleRemoveAllowance(idx)} className="text-red-600 hover:text-red-800">Remove</button>
              </div>
            ))}
          </div>
        </div>

        {/* Deductions */}
        <div>
          <Label>Deductions</Label>
          <div className="flex gap-2 mb-2">
            <InputField
              type="text"
              placeholder="Name"
              value={deductionName}
              onChange={e => setDeductionName(e.target.value)}
            />
            <InputField
              type="number"
              placeholder="Amount"
              value={deductionAmount}
              onChange={e => setDeductionAmount(e.target.value)}
            />
            <Button type="button" onClick={handleAddDeduction}>Add</Button>
          </div>
          <div className="space-y-1">
            {salaryData.deductions.map((d, idx) => (
              <div key={idx} className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                <span>{d.name}: ₹{d.amount}</span>
                <button type="button" onClick={() => handleRemoveDeduction(idx)} className="text-red-600 hover:text-red-800">Remove</button>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/salary-structure")} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
        </div>
      </form>
    </div>
  );
};

export default EditSalaryFormPage;
