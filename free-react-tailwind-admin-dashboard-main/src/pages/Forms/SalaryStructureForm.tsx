import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import Label from '../../components/form/Label';
import InputField from '../../components/form/input/InputField';
import Button from "../../components/ui/button/Button";

interface Allowance {
  name: string;
  amount: number;
}

interface Deduction {
  name: string;
  amount: number;
}

export default function SalaryStructureForm() {
  const [name, setName] = useState("");
  const [basicPercent, setBasicPercent] = useState('0');
  const [hraPercent, setHraPercent] = useState('0');
  const [conveyancePercent, setConveyancePercent] = useState('0');
  const [medicalPercent, setMedicalPercent] = useState('0');
  const [specialPercent, setSpecialPercent] = useState('0');
  const [serviceChargePercent, setServiceChargePercent] = useState('0');
  const [totalWorkingDays, setTotalWorkingDays] = useState('0');
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [allowanceName, setAllowanceName] = useState("");
  const [allowanceAmount, setAllowanceAmount] = useState('0');
  const [deductionName, setDeductionName] = useState("");
  const [deductionAmount, setDeductionAmount] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAddAllowance = () => {
    if (!allowanceName || Number(allowanceAmount) <= 0) return;
    setAllowances([...allowances, { name: allowanceName, amount: Number(allowanceAmount) }]);
    setAllowanceName("");
    setAllowanceAmount('0');
  };

  const handleRemoveAllowance = (idx: number) => {
    setAllowances(allowances.filter((_, i) => i !== idx));
  };

  const handleAddDeduction = () => {
    if (!deductionName || Number(deductionAmount) <= 0) return;
    setDeductions([...deductions, { name: deductionName, amount: Number(deductionAmount) }]);
    setDeductionName("");
    setDeductionAmount('0');
  };

  const handleRemoveDeduction = (idx: number) => {
    setDeductions(deductions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axiosInstance.post("app/salary-structures/", {
        name,
        basic_percent: Number(basicPercent),
        hra_percent: Number(hraPercent),
        conveyance_percent: Number(conveyancePercent),
        medical_percent: Number(medicalPercent),
        special_percent: Number(specialPercent),
        service_charge_percent: Number(serviceChargePercent),
        total_working_days: Number(totalWorkingDays),
        allowances,
        deductions,
      });
      navigate("/admin/salary-structure");
    } catch (err: unknown) {
      type AxiosErrorType = { response?: { data?: { detail?: string } } };
      const errorObj = err as AxiosErrorType;
      setError(errorObj.response?.data?.detail || "Failed to add salary structure");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => navigate("/admin/salary-structure");

  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-auto relative mt-10">
        <button
          onClick={handleCancel}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-4xl font-bold"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Add Salary Structure
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <InputField
              id="name"
              name="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={loading}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'basicPercent', label: 'Basic %', value: basicPercent, setter: setBasicPercent },
              { id: 'hraPercent', label: 'HRA %', value: hraPercent, setter: setHraPercent },
              { id: 'conveyancePercent', label: 'Conveyance %', value: conveyancePercent, setter: setConveyancePercent },
              { id: 'medicalPercent', label: 'Medical %', value: medicalPercent, setter: setMedicalPercent },
              { id: 'specialPercent', label: 'Special %', value: specialPercent, setter: setSpecialPercent },
              { id: 'serviceChargePercent', label: 'Service Charge %', value: serviceChargePercent, setter: setServiceChargePercent },
              { id: 'totalWorkingDays', label: 'Total Working Days', value: totalWorkingDays, setter: setTotalWorkingDays },
            ].map(field => (
              <div key={field.id}>
                <Label htmlFor={field.id}>{field.label}</Label>
                <InputField
                  id={field.id}
                  type="number"
                  value={String(field.value)}
                  onChange={e => field.setter(e.target.value)}
                  placeholder={field.label}
                  min="0"
                  disabled={loading}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
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
                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
              <InputField
                type="number"
                placeholder="Amount"
                value={String(allowanceAmount)}
                onChange={e => setAllowanceAmount(e.target.value)}
                className="w-24 p-2 border rounded dark:bg-gray-700 dark:text-white"
                min="0"
                disabled={loading}
              />
              <Button type="button" onClick={handleAddAllowance} disabled={loading}>
                Add
              </Button>
            </div>
            {allowances.length > 0 && (
              <ul className="list-disc ml-4 text-gray-800 dark:text-gray-200">
                {allowances.map((a, idx) => (
                  <li key={idx} className="flex justify-between items-center">
                    {a.name}: ₹{a.amount}
                    <button type="button" onClick={() => handleRemoveAllowance(idx)} className="text-red-500 hover:text-red-700 text-sm">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
              <InputField
                type="number"
                placeholder="Amount"
                value={String(deductionAmount)}
                onChange={e => setDeductionAmount(e.target.value)}
                className="w-24 p-2 border rounded dark:bg-gray-700 dark:text-white"
                min="0"
                disabled={loading}
              />
              <Button type="button" onClick={handleAddDeduction} disabled={loading}>
                Add
              </Button>
            </div>
            {deductions.length > 0 && (
              <ul className="list-disc ml-4 text-gray-800 dark:text-gray-200">
                {deductions.map((d, idx) => (
                  <li key={idx} className="flex justify-between items-center">
                    {d.name}: ₹{d.amount}
                    <button type="button" onClick={() => handleRemoveDeduction(idx)} className="text-red-500 hover:text-red-700 text-sm">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div className="text-red-600 font-semibold">{error}</div>}

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
