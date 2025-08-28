import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Employee/api";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import TextArea from "../../components/form/input/TextArea";
import DatePicker from "../../components/form/date-picker";

type LeaveType = {
	id: number;
	leave_name: string;
};


const EmpLeaveForm: React.FC = () => {
	const [leaveType, setLeaveType] = useState("");
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [reason, setReason] = useState("");
	const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState("");
	const [error, setError] = useState("");
	const [existingLeaves, setExistingLeaves] = useState<{from_date: string, to_date: string}[]>([]);
	const navigate = useNavigate();

	useEffect(() => {
		axiosInstance.get("leaves-list/").then(res => {
			setLeaveTypes(res.data);
		});
		// Fetch existing leaves for the user
		axiosInstance.get("emp-leaves/").then(res => {
			// Expecting array of leaves with from_date and to_date
			setExistingLeaves(
				Array.isArray(res.data)
					? res.data.map((l: any) => ({ from_date: l.from_date, to_date: l.to_date }))
					: []
			);
		});
	}, []);


	// Helper to check if two date ranges overlap (inclusive, backend logic, robust for date strings)
	function isDateRangeOverlap(start1: string, end1: string, start2: string, end2: string) {
		if (!start1 || !end1 || !start2 || !end2) return false;
		// Convert to yyyy-mm-dd for reliable comparison
		const toYMD = (d: string) => new Date(d).toISOString().slice(0, 10);
		const s1 = toYMD(start1);
		const e1 = toYMD(end1);
		const s2 = toYMD(start2);
		const e2 = toYMD(end2);
		return s1 <= e2 && e1 >= s2;
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setSuccess("");
		setError("");

		// Basic validation for empty fields
		if (!leaveType || !fromDate || !toDate || !reason) {
			setError("All fields are required.");
			setLoading(false);
			return;
		}

				// Validation: check for overlap with existing leaves (backend logic, robust)
				const overlap = existingLeaves.some(l =>
				  isDateRangeOverlap(fromDate, toDate, l.from_date, l.to_date)
				);
				if (overlap) {
				  setError("Leave already exists for the given dates.");
				  setLoading(false);
				  return;
				}

		try {
			await axiosInstance.post("employee-leave-create/", {
				leave_type: leaveType,
				from_date: fromDate,
				to_date: toDate,
				reason,
			});
			setSuccess("Leave application submitted successfully.");
			setLeaveType("");
			setFromDate("");
			setToDate("");
			setReason("");
			// Optionally refresh existing leaves
			axiosInstance.get("emp-leaves/").then(res => {
				setExistingLeaves(
					Array.isArray(res.data)
						? res.data.map((l: any) => ({ from_date: l.from_date, to_date: l.to_date }))
						: []
				);
			});
		} catch (err: any) {
			setError(err?.response?.data?.detail || "Failed to submit leave application.");
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		navigate(-1);
	};

			return (
				<div className="max-w-2xl mx-auto py-8 px-4">
					<ComponentCard title="Apply for Leave" desc="Fill in the details to apply for leave.">
						<form onSubmit={handleSubmit} className="space-y-6">
							<div className="space-y-4">
								<div>
									<Label htmlFor="leaveType">Leave Type *</Label>
									<select
										id="leaveType"
										className="w-full border rounded px-3 py-2"
										value={leaveType}
										onChange={e => setLeaveType(e.target.value)}
										required
									>
										<option value="">Select leave type</option>
										{leaveTypes.map((type) => (
											<option key={type.id} value={type.id}>{type.leave_name}</option>
										))}
									</select>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<DatePicker
										id="fromDate"
										label="From Date *"
										placeholder="Select from date"
										defaultDate={fromDate || undefined}
										onChange={(_dates, dateStr) => setFromDate(dateStr)}
									/>
									<DatePicker
										id="toDate"
										label="To Date *"
										placeholder="Select to date"
										defaultDate={toDate || undefined}
										onChange={(_dates, dateStr) => setToDate(dateStr)}
									/>
								</div>
								<div>
									<Label htmlFor="reason">Reason *</Label>
									<TextArea
										value={reason}
										onChange={setReason}
										rows={4}
									/>
								</div>
							</div>
							<div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
								<button
									type="button"
									className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
									onClick={handleCancel}
									disabled={loading}
								>
									Cancel
								</button>
								<button
									type="submit"
									className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
									disabled={loading}
								>
									{loading ? "Submitting..." : "Apply"}
								</button>
							</div>
							{/* Status Messages */}
							{success && (
								<div className="text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm mt-2">
									{success}
								</div>
							)}
							{error && (
								<div className="text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm mt-2">
									{error}
								</div>
							)}
						</form>
					</ComponentCard>
				</div>
			);
};

export default EmpLeaveForm;

