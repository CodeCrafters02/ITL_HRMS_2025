import { createApiUrl } from "../../../access/access.ts";
import { axiosInstance } from "../../Dashboard/api.ts";

// ==========================
// Employee Status APIs (Read-only)
// ==========================

export interface EmployeeStatusData {
  id: number;
  full_name: string;
  photo?: string | null;
  status: "online" | "away" | "dnd" | "offline";
  last_active: string;
}

// ✅ Get all employee statuses
export const getAllEmployeeStatuses = async (): Promise<EmployeeStatusData[]> => {
  const url = createApiUrl("app/employeestatus/"); // adjust path if needed
  const response = await axiosInstance.get<EmployeeStatusData[]>(url);
  return response.data;
};

// ✅ Get a specific employee status by ID
export const getEmployeeStatusById = async (id: number): Promise<EmployeeStatusData> => {
  const url = createApiUrl(`app/employeestatus/${id}/`);
  const response = await axiosInstance.get<EmployeeStatusData>(url);
  return response.data;
};
