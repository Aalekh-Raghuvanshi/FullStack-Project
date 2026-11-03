import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Authentication can be attached here once a token provider is implemented.
let getAuthToken = () => null;
export function setAuthTokenProvider(provider) {
  getAuthToken = typeof provider === 'function' ? provider : () => null;
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.userMessage = error.response?.data?.error?.message
      || error.response?.data?.message
      || (error.code === 'ECONNABORTED' ? 'The server took too long to respond.' : 'Unable to reach the server. Please try again.');
    return Promise.reject(error);
  },
);

export default api;
