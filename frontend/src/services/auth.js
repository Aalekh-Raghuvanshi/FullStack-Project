import api from './api.js';

export async function login(credentials) {
  const { data } = await api.post('/auth/login', credentials);
  return data.data;
}

export async function register(details) {
  const { data } = await api.post('/auth/register', details);
  return data.data;
}

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.data;
}

export async function logout() {
  const { data } = await api.post('/auth/logout');
  return data.data;
}
