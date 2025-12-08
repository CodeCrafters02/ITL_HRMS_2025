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
					? res.data.map((l: { from_date: string; to_date: string }) => ({ from_date: l.from_date, to_date: l.to_date }))
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

		// Date validation: start date should not be after end date
		const startDateObj = new Date(fromDate);
		const endDateObj = new Date(toDate);
		
		if (startDateObj > endDateObj) {
			setError("Start date cannot be after end date. Please select valid dates.");
			setLoading(false);
			return;
		}

					// Validation: check for overlap with existing leaves (backend logic, robust)
					const overlappingLeave = existingLeaves.find(l =>
						isDateRangeOverlap(fromDate, toDate, l.from_date, l.to_date)
					);
					if (overlappingLeave) {
						setError(`Leave already exists for the selected dates. Your leave request overlaps with an existing leave from ${overlappingLeave.from_date} to ${overlappingLeave.to_date}.`);
						setLoading(false);
						return;
					}		try {
			const payload = {
				leave_type: parseInt(leaveType),
				from_date: fromDate,
				to_date: toDate,
				reason,
			};
			console.log('📤 Sending leave application:', payload);
			
			const response = await axiosInstance.post("employee-leave-create/", payload);
			console.log('✅ Leave created successfully:', response.data);
			
			setSuccess("Leave application submitted successfully! Redirecting...");
			
			// Clear form fields
			setLeaveType("");
			setFromDate("");
			setToDate("");
			setReason("");
			
			// Redirect to leave application page after showing success message
			setTimeout(() => {
				navigate('/employee/leave-application', { replace: true });
			}, 1500);
		} catch (err: any) {
			console.error('❌ Leave creation error:', err);
			console.error('❌ Error response:', err.response);
			console.error('❌ Error data:', err.response?.data);
			
			// Handle different error response formats
			let errorMessage = "Failed to submit leave application. Please try again.";
			
			if (err.response?.data) {
				// Check for detail field (string) - common for ValidationError
				if (typeof err.response.data.detail === 'string') {
					errorMessage = err.response.data.detail;
				}
				// Check for non-field errors (array)
				else if (Array.isArray(err.response.data.non_field_errors)) {
					errorMessage = err.response.data.non_field_errors.join(', ');
				}
				// Check if it's a direct array (DRF ValidationError)
				else if (Array.isArray(err.response.data)) {
					errorMessage = err.response.data.join(', ');
				}
				// Check for field-specific errors (object)
				else if (typeof err.response.data === 'object') {
					const errors = Object.entries(err.response.data)
						.filter(([key]) => key !== 'detail') // Exclude already handled detail
						.map(([field, messages]) => {
							const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
							if (Array.isArray(messages)) {
								return `${fieldName}: ${messages.join(', ')}`;
							}
							return `${fieldName}: ${messages}`;
						})
						.join('; ');
					if (errors) errorMessage = errors;
				}
			} else if (err.message) {
				// Network or other errors
				errorMessage = `Error: ${err.message}`;
			}
			
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		navigate(-1);
	};

			return (
				<div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 py-8 px-4">
					<div className="max-w-2xl mx-auto">
						<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
							{/* Header with Gradient */}
							<div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
								<h2 className="text-2xl font-bold text-white mb-2">Apply for Leave</h2>
								<p className="text-blue-100">Fill in the details to submit your leave request</p>
							</div>

							<form onSubmit={handleSubmit} className="p-6">
								<div className="space-y-6">
									<div>
										<Label htmlFor="leaveType">
											<span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Leave Type *</span>
										</Label>
										<select
											id="leaveType"
											className="w-full mt-1 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
										<Label htmlFor="reason">
											<span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reason *</span>
										</Label>
										<TextArea
											value={reason}
											onChange={setReason}
											rows={4}
											className="w-full mt-1 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
										/>
								</div>
								</div>
								<div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 border-t-2 border-gray-200 dark:border-gray-700 mt-6">
									<button
										type="button"
										className="w-full sm:w-auto px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
										onClick={handleCancel}
										disabled={loading}
									>
										Cancel
									</button>
									<button
										type="submit"
										className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
										disabled={loading}
									>
										{loading ? (
											<span className="flex items-center justify-center gap-2">
												<svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
												Submitting...
											</span>
										) : "Submit Application"}
									</button>
								</div>
								{/* Status Messages */}
								{success && (
									<div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 p-4 rounded-lg mt-4">
										<svg className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span className="text-green-700 dark:text-green-300 font-medium">{success}</span>
									</div>
								)}
								{error && (
									<div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 p-4 rounded-lg mt-4">
										<svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span className="text-red-700 dark:text-red-300 font-medium">{error}</span>
									</div>
								)}
							</form>
						</div>
					</div>
				</div>
			);
};

export default EmpLeaveForm;

