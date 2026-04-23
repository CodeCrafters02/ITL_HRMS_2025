import axios from 'axios';

// Define the API URL directly to clear the build error
const API_URL = 'https://apihrms.innovyxtechlabs.com/app/';

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
    // Swapped __API_URL__ for the defined API_URL
    const response = await axios.get(`${API_URL}reportees/`);
    return response.data;
};
