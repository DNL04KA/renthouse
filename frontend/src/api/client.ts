import axios from 'axios';

const BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api/v1';

// Authenticated client — attaches JWT, redirects to /login on 401
export const apiClient = axios.create({ baseURL: BASE });

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
apiClient.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; }
        return Promise.reject(err);
    }
);

// Public client — no token, no redirects, for guest browsing
export const publicApiClient = axios.create({ baseURL: BASE });
