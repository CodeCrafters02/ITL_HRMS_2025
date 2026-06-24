import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/app/`;

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        Authorization: `Bearer ${token}`,
    };
};

export interface Payslip {
    id: number;
    payslip_id: string;
    employee: number;
    employee_name: string;
    employee_id_str: string;
    company: number;
    company_name: string;
    month: number;
    year: number;
    file: string | null;
    status: string;
    created_at: string;
}

export interface PayrollBatch {
    id: number;
    month: number;
    year: number;
    status: 'Draft' | 'Locked';
    company: number;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface RolloutDashboardItem {
    employee_id_str: string;
    employee_name: string;
    payroll_id: number | null;
    batch_id: number | null;
    is_report?: boolean;
    net_pay: number;
    details: {
        gross: number;
        deductions: number;
        ot_pay: number;
        loan_emi: number;
        asset_deduction: number;
        days_paid: number;
        present_days: number;
        half_days: number;
        paid_leaves: number;
        unpaid_leaves: number;
        expected_working_days: number;
        absent_days: number;
        overtime_hours: number;
        checked_in_days: number;
        earned_basic: number;
        basic_salary: number;
        reimbursement: number;
    };
    payslip_id: string | null;
    payslip_status: string;
    file: string | null;
    id: number | null;
}

export const fetchPayslips = async (params?: any): Promise<PaginatedResponse<Payslip>> => {
    const response = await axios.get(`${API_URL}payslips/`, { headers: getHeaders(), params });
    return response.data;
};

export const fetchPayrollBatches = async (params?: any): Promise<PaginatedResponse<PayrollBatch>> => {
    const response = await axios.get(`${API_URL}payroll-batches/`, { headers: getHeaders(), params });
    return response.data;
};

export const generatePayslip = async (payrollId: number, isReport: boolean = false, regenerate: boolean = false, startDate?: string, endDate?: string) => {
    const response = await axios.post(`${API_URL}payslips/generate/`, {
        payroll_id: payrollId,
        is_report: isReport,
        regenerate: regenerate,
        start_date: startDate,
        end_date: endDate
    }, { headers: getHeaders() });
    return response.data;
};

export const fetchRolloutDashboard = async (month?: number, year?: number, startDate?: string, endDate?: string): Promise<RolloutDashboardItem[]> => {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await axios.get(`${API_URL}payslips/rollout-dashboard/`, { 
        headers: getHeaders(), 
        params
    });
    return response.data;
};

export const rolloutPayslips = async (batchId: number, employeeIds?: number[]) => {
    const response = await axios.post(`${API_URL}payroll-batches/${batchId}/rollout-payslips/`, {
        employee_ids: employeeIds
    }, { headers: getHeaders() });
    return response.data;
};

export const publishPayslip = async (id: number) => {
    const response = await axios.post(`${API_URL}payslips/${id}/publish/`, {}, { headers: getHeaders() });
    return response.data;
};

export const bulkPublishPayslips = async (ids: number[]) => {
    const response = await axios.post(`${API_URL}payslips/bulk-publish/`, { ids }, { headers: getHeaders() });
    return response.data;
};

export const bulkGeneratePayslips = async (payrollIds: number[], isReport: boolean = false, regenerate: boolean = false, startDate?: string, endDate?: string) => {
    const response = await axios.post(`${API_URL}payslips/bulk-generate/`, {
        payroll_ids: payrollIds,
        is_report: isReport,
        regenerate: regenerate,
        start_date: startDate,
        end_date: endDate
    }, { headers: getHeaders() });
    return response.data;
};

export const downloadPayslip = async (fileUrl: string) => {
    try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileUrl.split('/').pop() || 'payslip.pdf');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download failed:', error);
        // Fallback to direct link if fetch fails (e.g. CORS)
        window.open(fileUrl, '_blank');
    }
};
