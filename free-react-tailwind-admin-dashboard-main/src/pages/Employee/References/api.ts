import axios from 'axios';

export type ReferenceStatus = 'Pending' | 'Approved' | 'Rejected';

export interface EmployeeReferenceItem {
    id: number;
    name: string;
    designation: string;
    contact_number: string;
    email: string;
    status: ReferenceStatus;
    resume?: string;
    created_at: string;
}

export const fetchMyReferences = async (): Promise<EmployeeReferenceItem[]> => {
    const response = await axios.get(`${__API_URL__}references/`);
    return response.data;
};

export const createReference = async (formData: FormData) => {
    const response = await axios.post(`${__API_URL__}references/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const buildResumeUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Assuming your media is served from the base domain
    return `https://apihrms.innovyxtechlabs.com${path}`;
};
