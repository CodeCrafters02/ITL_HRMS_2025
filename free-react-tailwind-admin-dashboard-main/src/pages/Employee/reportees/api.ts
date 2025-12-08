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
  photo?: string;
  is_checked_in?: boolean; // Track if employee has checked in today
}

export interface EmployeeReporteesRequest {
  employee_id: string; // The manager's employee_id to search reportees
}

export interface EmployeeProfessionalData {
  id: number;
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  mobile: string;
  photo?: string;
  department_name?: string;
  designation_name?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  ctc?: number;
  gross_salary?: number;
  previous_employer?: string;
  previous_designation_name?: string;
  previous_salary?: number;
  epf_status?: string;
  uan?: string;
  source_of_employment?: string;
  shift_assigned?: {
    id: number;
    shift_type: string;
  };
}

export interface EmployeeDetailsRequest {
  employee_id: string;
}



import { createApiUrl } from "../../../access/access.ts";
import { axiosInstance } from "../api.ts";

// ✅ POST: Get reportees of a manager
export const getEmployeeReportees = async (
  data: EmployeeReporteesRequest
): Promise<EmployeeReporteeData[]> => {
  const url = createApiUrl("app/getreportees/");
  const response = await axiosInstance.post<EmployeeReporteeData[]>(url, data);
  console.log('API Response from getEmployeeReportees:', response.data);
  console.log('First employee photo URL:', response.data[0]?.photo);
  return response.data;
};

// ✅ GET: Get professional details of an employee
export const getEmployeeProfessionalDetails = async (
  employeeId: string
): Promise<EmployeeProfessionalData> => {
  const url = createApiUrl(`employee/employee-profile/${employeeId}/`);
  const response = await axiosInstance.get<EmployeeProfessionalData>(url);
  return response.data;
};
