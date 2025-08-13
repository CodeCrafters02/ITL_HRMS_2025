import React, { useState } from "react";
import { axiosInstance } from "../Employee/api";
import InputField from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import Form from "../../components/form/Form";
import { useNavigate } from "react-router-dom";

interface ChangePasswordFormProps {
	apiEndpoint?: string;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ apiEndpoint = "/change-password/" }) => {
	const navigate = useNavigate();
	const [form, setForm] = useState({
		old_password: "",
		new_password: "",
		confirm_password: "",
	});
	type ErrorType = {
		old_password?: string;
		new_password?: string;
		confirm_password?: string;
		non_field_errors?: string;
		[key: string]: string | undefined;
	};
	const [errors, setErrors] = useState<ErrorType>({});
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setForm({ ...form, [e.target.name]: e.target.value });
		setErrors({ ...errors, [e.target.name]: undefined });
		setSuccess("");
	};

			const handleSubmit = async (e: React.FormEvent) => {
				e.preventDefault();
				setLoading(true);
				setErrors({});
				setSuccess("");
				try {
							const res = await axiosInstance.patch(
								apiEndpoint,
								form
							);
					setSuccess(res.data.detail || "Password updated successfully.");
					setForm({ old_password: "", new_password: "", confirm_password: "" });
				} catch (err) {
					if (
						typeof err === "object" &&
						err !== null &&
						"response" in err &&
						(err as { response?: { data?: unknown } }).response &&
						(err as { response: { data?: unknown } }).response.data
					) {
						setErrors((err as { response: { data: ErrorType } }).response.data);
					} else {
						setErrors({ non_field_errors: "Something went wrong." });
					}
				} finally {
					setLoading(false);
				}
			};

		const handleCancel = () => {
			setForm({ old_password: "", new_password: "", confirm_password: "" });
			setErrors({});
			setSuccess("");
			navigate(-1);
		};

			return (
				<div className="container mx-auto px-2 py-8 flex justify-center items-center min-h-[80vh]">
					<div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8">
						<h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Change Password</h2>
						<Form onSubmit={handleSubmit} className="space-y-6">
							<div>
								<label className="block font-semibold mb-1 text-gray-700" htmlFor="old_password">Old Password<span className="text-red-500">*</span></label>
								<InputField
									id="old_password"
									name="old_password"
									type="password"
									value={form.old_password}
									onChange={handleChange}
									error={!!errors.old_password}
									hint={errors.old_password}
									required
									placeholder="Enter old password"
								/>
							</div>
							<div>
								<label className="block font-semibold mb-1 text-gray-700" htmlFor="new_password">New Password<span className="text-red-500">*</span></label>
								<InputField
									id="new_password"
									name="new_password"
									type="password"
									value={form.new_password}
									onChange={handleChange}
									error={!!errors.new_password}
									hint={errors.new_password}
									required
									placeholder="Enter new password"
								/>
							</div>
							<div>
								<label className="block font-semibold mb-1 text-gray-700" htmlFor="confirm_password">Confirm Password<span className="text-red-500">*</span></label>
								<InputField
									id="confirm_password"
									name="confirm_password"
									type="password"
									value={form.confirm_password}
									onChange={handleChange}
									error={!!errors.confirm_password}
									hint={errors.confirm_password}
									required
									placeholder="Confirm new password"
								/>
							</div>
							<div className="flex gap-2 mt-2 justify-end">
								<Button
									type="submit"
									size="md"
									variant="primary"
									disabled={loading}
									className="w-full"
								>
									{loading ? "Changing..." : "Change Password"}
								</Button>
								<Button
									type="button"
									size="md"
									variant="outline"
									onClick={handleCancel}
									className="w-full"
									disabled={loading}
								>
									Cancel
								</Button>
							</div>
							{errors.non_field_errors && (
								<div className="text-red-500 font-medium mt-2 text-center">{errors.non_field_errors}</div>
							)}
							{success && (
								<div className="text-green-600 font-medium mt-2 text-center">{success}</div>
							)}
						</Form>
					</div>
				</div>
			);
};

export default ChangePasswordForm;
