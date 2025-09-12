import { createApiUrl} from "../../access/access.ts";
import axios from "axios";

export interface ContactRequest {
  id: number;
  name: string;
  email: string;
  contact_number: string;
  message?: string | null;
  created_at: string;
}

export const getContactRequests = async (): Promise<ContactRequest[]> => {
  const url = createApiUrl("/website/contactrequest/");
  const response = await axios.get(url, {
    // If authentication needed:
    // headers: getAuthHeaders(),
  });
  return response.data;
};
