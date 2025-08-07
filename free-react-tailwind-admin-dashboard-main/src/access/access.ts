import { jwtDecode } from 'jwt-decode';

// Global type declaration for API_URL
declare const __API_URL__: string;

// Type definitions
interface JwtPayload {
  exp: number;
  [key: string]: any;
}

interface RefreshTokenResponse {
  access: string;
}

interface AuthHeaders {
  'Content-Type': string;
  'Authorization': string;
  [key: string]: string;
}

interface FileUploadHeaders {
  'Content-Type': string;
  'Authorization': string;
  [key: string]: string;
}

const API_URL: string = __API_URL__;

const createApiUrl = (path: string): string => {
  const url = `${API_URL}${path}`;
  return url;
};

const getAuthHeaders = async (): Promise<AuthHeaders> => {
  let access_token: string | null = localStorage.getItem('access');
  let refresh_token: string | null = localStorage.getItem('refresh');

  if (isAccessTokenExpired(access_token)) {
    const newAccessToken = await refreshAccessToken(refresh_token);
    access_token = newAccessToken;
    localStorage.setItem('access', newAccessToken);
  }

  const headers: AuthHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`,
  };
  return headers;
};

const getAuthHeadersFile = async (): Promise<FileUploadHeaders> => {
  let access_token: string | null = localStorage.getItem('access');
  let refresh_token: string | null = localStorage.getItem('refresh');

  if (isAccessTokenExpired(access_token)) {
    const newAccessToken = await refreshAccessToken(refresh_token);
    access_token = newAccessToken;
    localStorage.setItem('access', newAccessToken);
  }

  const headers: FileUploadHeaders = {
    'Content-Type': 'multipart/form-data',
    'Authorization': `Bearer ${access_token}`,
  };
  return headers;
};

const isAccessTokenExpired = (access_token: string | null): boolean => {
  if (!access_token) {
    return true;
  }

  try {
    const decoded = jwtDecode<JwtPayload>(access_token);
    const currentTime = Date.now() / 1000;
    const isExpired = decoded.exp < currentTime;
    return isExpired;
  } catch (error) {
    return true;
  }
};

const refreshAccessToken = async (refresh_token: string | null): Promise<string> => {
  if (!refresh_token) {
    throw new Error('No refresh token available');
  }

  try {
    const refreshUrl = createApiUrl('/token/refresh/');
    
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data: RefreshTokenResponse = await response.json();
    
    // The response should be in format: {"access": "<token>"}
    const accessToken = data.access;
    
    if (!accessToken) {
      throw new Error('No access token received in response');
    }
    
    return accessToken;
  } catch (error) {
    throw error;
  }
};

export { createApiUrl, getAuthHeaders, getAuthHeadersFile };
export type { AuthHeaders, FileUploadHeaders, JwtPayload, RefreshTokenResponse };
