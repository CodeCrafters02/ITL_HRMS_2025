import axios from "axios";

// 👉 Create an axios instance
export const axiosInstance = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

// 👉 Attach access token automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 👉 Handle 401: refresh token automatically
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refresh_token")
    ) {
      originalRequest._retry = true;

      try {
        // Get new access token
        const refreshResponse = await axios.post(
          "http://127.0.0.1:8000/api/token/refresh/",
          { refresh: localStorage.getItem("refresh_token") }
        );

        const newAccessToken = refreshResponse.data.access;

        // Save new token & update header
        localStorage.setItem("access_token", newAccessToken);
        axiosInstance.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Retry original request with new token
        return axiosInstance(originalRequest);
      } catch (err) {
        // If refresh fails → log out
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/signin";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);
