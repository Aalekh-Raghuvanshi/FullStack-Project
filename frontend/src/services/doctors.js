import api from './api.js';

export async function listDoctors(params = {}) {
  const { data } = await api.get('/doctors', { params });
  return data;
}

export async function getDoctor(doctorId) {
  const { data } = await api.get(`/doctors/${doctorId}`);
  return data.data;
}
