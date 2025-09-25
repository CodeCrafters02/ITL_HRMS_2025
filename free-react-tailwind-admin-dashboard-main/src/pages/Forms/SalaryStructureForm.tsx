
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import Label from '../../components/form/Label';
import InputField from '../../components/form/input/InputField';

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
      if (typeof err === 'object' && err !== null && 'response' in errorObj) {
        setError(errorObj.response?.data?.detail || "Failed to add salary structure");
      } else {
        setError("Failed to add salary structure");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/salary-structure");
  };

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">Add Salary Structure</h2>
      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <Label htmlFor="name">Name</Label>
          <InputField
            id="name"
            name="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter salary structure name"
          />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label htmlFor="basicPercent">Basic %</Label>
            <InputField id="basicPercent" type="number" value={String(basicPercent)} onChange={e => setBasicPercent(e.target.value)} placeholder="Basic percent" min={'0'} />
         </div>
          <div>
            <Label htmlFor="hraPercent">HRA %</Label>
            <InputField id="hraPercent" type="number" value={String(hraPercent)} onChange={e => setHraPercent(e.target.value)} placeholder="HRA percent" min={'0'} />
           </div>
          <div>
            <Label htmlFor="conveyancePercent">Conveyance %</Label>
            <InputField id="conveyancePercent" type="number" value={String(conveyancePercent)} onChange={e => setConveyancePercent(e.target.value)} placeholder="Conveyance percent" min={'0'} />
          </div>
          <div>
            <Label htmlFor="medicalPercent">Medical %</Label>
            <InputField id="medicalPercent" type="number" value={String(medicalPercent)} onChange={e => setMedicalPercent(e.target.value)} placeholder="Medical percent" min={'0'} />
          </div>
          <div>
            <Label htmlFor="specialPercent">Special %</Label>
            <InputField id="specialPercent" type="number" value={String(specialPercent)} onChange={e => setSpecialPercent(e.target.value)} placeholder="Special percent" min={'0'} />
          </div>
          <div>
            <Label htmlFor="serviceChargePercent">Service Charge %</Label>
            <InputField id="serviceChargePercent" type="number" value={String(serviceChargePercent)} onChange={e => setServiceChargePercent(e.target.value)} placeholder="Service charge percent" min={'0'} />
          </div>
          <div>
            <Label htmlFor="totalWorkingDays">Total Working Days</Label>
            <InputField id="totalWorkingDays" type="number" value={String(totalWorkingDays)} onChange={e => setTotalWorkingDays(e.target.value)} placeholder="Total working days" min={'0'} />
          </div>
        </div>
        <div>
          <Label>Allowances</Label>
          <div className="flex gap-3 mb-2">
            <InputField type="text" placeholder="Name" value={allowanceName} onChange={e => setAllowanceName(e.target.value)} className="w-1/2" />
            <InputField type="number" placeholder="Amount" value={String(allowanceAmount)} onChange={e => setAllowanceAmount(e.target.value)} className="w-1/3" min={'0'} />
            <button type="button" onClick={handleAddAllowance} className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-green-600">Add</button>
          </div>
          {allowances.length > 0 && (
            <ul className="list-disc ml-8 mt-2">
              {allowances.map((a, idx) => (
                <li key={idx} className="flex items-center gap-3 text-base">
                  {a.name}: ₹{a.amount}
                  <button type="button" onClick={() => handleRemoveAllowance(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <Label>Deductions</Label>
          <div className="flex gap-3 mb-2">
            <InputField type="text" placeholder="Name" value={deductionName} onChange={e => setDeductionName(e.target.value)} className="w-1/2" />
            <InputField type="number" placeholder="Amount" value={String(deductionAmount)} onChange={e => setDeductionAmount(e.target.value)} className="w-1/3" min={'0'} />
           <button type="button" onClick={handleAddDeduction} className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-green-600">Add</button>
          </div>
          {deductions.length > 0 && (
            <ul className="list-disc ml-8 mt-2">
              {deductions.map((d, idx) => (
                <li key={idx} className="flex items-center gap-3 text-base">
                  {d.name}: ₹{d.amount}
                  <button type="button" onClick={() => handleRemoveDeduction(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <div className="text-red-600 text-base font-semibold mb-2">{error}</div>}
        <div className="flex gap-6 justify-end mt-8">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 rounded-lg bg-gray-400 text-white hover:bg-gray-500 text-lg font-semibold shadow"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-lg font-semibold shadow"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
