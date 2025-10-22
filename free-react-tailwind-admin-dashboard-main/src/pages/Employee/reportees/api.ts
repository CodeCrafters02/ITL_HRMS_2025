// ==========================
// Interfaces
// ==========================

export interface EmployeeReporteeData {
  id: number;
  employee_id: string;
  full_name: string;
  status: "online" | "away" | "dnd" | "offline";
  department_name?: string;
  designation_name?: string;
}

export interface EmployeeReporteesRequest {
  employee_id: string; // The manager's employee_id to search reportees
}



import { createApiUrl } from "../../../access/access.ts";
import { axiosInstance } from "../api.ts";

// ✅ POST: Get reportees of a manager
export const getEmployeeReportees = async (
  data: EmployeeReporteesRequest
): Promise<EmployeeReporteeData[]> => {
  const url = createApiUrl("app/getreportees/");
  const response = await axiosInstance.post<EmployeeReporteeData[]>(url, data);
  return response.data;
};
