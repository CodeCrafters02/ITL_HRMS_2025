import axios from 'axios';

export interface Reportee {
    id: number;
    full_name: string;
    employee_id: string;
    department_name: string;
    designation_name: string;
    status: string;
    is_checked_in: boolean;
    photo?: string;
}

export const fetchMyReportees = async (): Promise<Reportee[]> => {
    // This uses the base URL defined in your vite.config.ts
    // Adjust the endpoint path ('reportees/') if your backend uses a different name
    const response = await axios.get(`${__API_URL__}reportees/`);
    return response.data;
};
