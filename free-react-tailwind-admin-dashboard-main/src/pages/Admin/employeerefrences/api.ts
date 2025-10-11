import { createApiUrl } from "../../../access/access.ts";
import { axiosInstance } from "../../Dashboard/api.ts";

// ==========================
// Admin APIs
// ==========================

export interface EmployeeReferenceData {
  id: number;
  employee: number;
  employee_name?: string;
  name: string;
  designation: string;
  contact_number: string;
  email: string;
  resume?: string; // URL to uploaded file
  status: "Pending" | "Approved" | "Rejected";
  admin_comment?: string;
  submitted_at: string;
  updated_at: string;
}

// ✅ Get all employee references (admin only)
export const getAllEmployeeReferences = async (): Promise<EmployeeReferenceData[]> => {
  const url = createApiUrl("employee/employeereference/");
  const response = await axiosInstance.get<EmployeeReferenceData[]>(url);
  return response.data;
};

// ✅ Get a specific employee reference by ID
export const getEmployeeReferenceDetails = async (id: number): Promise<EmployeeReferenceData> => {
  const url = createApiUrl(`employee/employeereference/${id}/`);
  const response = await axiosInstance.get<EmployeeReferenceData>(url);
  return response.data;
};

// ✅ Review (Approve / Reject / Add comment)
// Use this only if your Django backend has a `/review/` endpoint
export const reviewEmployeeReference = async (
  id: number,
  data: { status: "Approved" | "Rejected" | "Pending"; admin_comment?: string }
) => {
  const url = createApiUrl(`employee/employeereference/${id}/review/`);
  const response = await axiosInstance.patch(url, data);
  return response.data;
};

// ✅ Otherwise (if your backend doesn’t have `/review/`, use this):
export const updateEmployeeReferenceByAdmin = async (
  id: number,
  data: { status?: "Approved" | "Rejected" | "Pending"; admin_comment?: string }
) => {
  const url = createApiUrl(`employee/employeereference/${id}/`);
  const response = await axiosInstance.patch(url, data);
  return response.data;
};
