import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  timeout: 15000,
});

let getAuthToken = () => window.sessionStorage.getItem('medicore.accessToken');
let onUnauthorized = () => {};
export function setAuthTokenProvider(provider) {
  getAuthToken = typeof provider === 'function' ? provider : () => window.sessionStorage.getItem('medicore.accessToken');
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = typeof handler === 'function' ? handler : () => {};
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config._medicoreAuthenticatedRequest = true;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;
    const isAuthEndpoint = /\/auth\/(login|register)$/.test(error.config?.url || '');
    const sessionInvalid = status === 401 || (status === 403 && errorCode === 'ACCOUNT_INACTIVE');
    if (sessionInvalid && error.config?._medicoreAuthenticatedRequest && !isAuthEndpoint) onUnauthorized();
    error.userMessage = error.response?.data?.error?.message
      || error.response?.data?.message
      || (status === 403 ? 'You do not have permission to perform this action.' : null)
      || (error.code === 'ECONNABORTED' ? 'The server took too long to respond.' : 'Unable to reach the server. Please try again.');
    return Promise.reject(error);
  },
);

export default api;
