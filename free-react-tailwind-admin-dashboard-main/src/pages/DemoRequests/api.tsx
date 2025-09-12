import { createApiUrl} from "../../access/access.ts";
import axios from "axios";

export interface DemoRequest {
  id: number;
  name: string;
  email: string;
  contact_number: string;
  service: {
    id: number;
    name: string;
  };
  preferred_datetime: string;
  message?: string | null;
  submitted_at: string;
}

export const getDemoRequests = async (): Promise<DemoRequest[]> => {
  const url = createApiUrl("/website/demorequest/");
  const response = await axios.get(url, {});
  return response.data;
};
