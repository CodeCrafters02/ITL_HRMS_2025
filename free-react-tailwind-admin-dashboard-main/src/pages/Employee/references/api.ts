import { createApiUrl } from "../../../access/access.ts";
import { axiosInstance } from "../api.ts";
// ==========================
// Interfaces
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

// For Create
export interface EmployeeReferenceCreateData {
  name: string;
  designation: string;
  contact_number: string;
  email: string;
  resume?: File | null;
}

// For Edit
export interface EmployeeReferenceEditData {
  name: string;
  designation: string;
  contact_number: string;
  email: string;
  resume?: File | null;
}

// ==========================
// API Calls
// ==========================

export const getLoggedInEmployee = async (): Promise<{ id: number; full_name: string }> => {
  const url = createApiUrl("employee/employee-id/");
  const response = await axiosInstance.get<{ id: number; full_name: string }>(url);
  return response.data;
};


// ✅ GET list (employee sees own, admin sees all)
export const getEmployeeReferenceList = async (): Promise<EmployeeReferenceData[]> => {
  const url = createApiUrl("employee/employeereference/");
  const response = await axiosInstance.get<EmployeeReferenceData[]>(url);
  return response.data;
};

// ✅ GET by ID
export const getEmployeeReferenceById = async (id: number) => {
  const url = createApiUrl(`employee/employeereference/${id}/`);
  const response = await axiosInstance.get<EmployeeReferenceData>(url);
  return response.data;
};

// ✅ CREATE (employee adds new reference)
export const createEmployeeReference = async (data: EmployeeReferenceCreateData) => {
  const employee = await getLoggedInEmployee(); // fetch employee ID

  const url = createApiUrl("employee/employeereference/");
  const formData = new FormData();

  formData.append("name", data.name);
  formData.append("designation", data.designation);
  formData.append("contact_number", data.contact_number);
  formData.append("email", data.email);
  formData.append("employee", String(employee.id)); // <-- include employee ID

  if (data.resume) formData.append("resume", data.resume);

  const response = await axiosInstance.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

// ✅ UPDATE (admin edits/approves or employee updates)
export const updateEmployeeReference = async (id: number, data: EmployeeReferenceEditData) => {
  const url = createApiUrl(`employee/employeereference/${id}/`);
  const formData = new FormData();

  formData.append("name", data.name);
  formData.append("designation", data.designation);
  formData.append("contact_number", data.contact_number);
  formData.append("email", data.email);

  if (data.resume) formData.append("resume", data.resume);

  const response = await axiosInstance.patch(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

// ✅ DELETE
export const deleteEmployeeReference = async (id: number) => {
  const url = createApiUrl(`employee/employeereference/${id}/`);
  const response = await axiosInstance.delete(url);
  return response.data;
};
