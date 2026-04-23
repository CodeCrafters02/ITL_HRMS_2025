import axios from 'axios';

// 1. Define the API URL properly (Fixes TS2304)
const API_URL = 'https://apihrms.innovyxtechlabs.com/app/';

export const fetchMyReportees = async () => {
    // Change __API_URL__ to API_URL
    const response = await axios.get(`${API_URL}reportees/`);
    return response.data;
};

export type ReferenceStatus = 'Pending' | 'Approved' | 'Rejected';

export interface EmployeeReferenceItem {
    id: number;
    name: string;
    designation: string;
    contact_number: string;
    email: string;
    status: ReferenceStatus;
    resume?: string;
    // 2. Added missing fields (Fixes TS2339)
    admin_comment?: string; 
    submitted_at: string;   
    created_at: string;
}

// 3. Update the data shape for creation (Fixes TS2353)
export interface CreateReferenceData {
    name: string;
    designation: string;
    contact_number: string;
    email: string;
    resume: File | null;
}

export const fetchMyReferences = async (): Promise<EmployeeReferenceItem[]> => {
    const response = await axios.get(`${API_URL}references/`);
    return response.data;
};

// Updated to accept the correct object shape
export const createReference = async (data: CreateReferenceData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('designation', data.designation);
    formData.append('contact_number', data.contact_number);
    formData.append('email', data.email);
    if (data.resume) {
        formData.append('resume', data.resume);
    }

    const response = await axios.post(`${API_URL}references/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const buildResumeUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://apihrms.innovyxtechlabs.com${path}`;
};
