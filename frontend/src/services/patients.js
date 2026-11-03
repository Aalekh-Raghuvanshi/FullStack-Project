import api from './api.js';

export async function listPatients(params = {}) {
  const { data } = await api.get('/patients', { params });
  return data;
}

export async function getPatient(patientId) {
  const { data } = await api.get(`/patients/${patientId}`);
  return data.data;
}

export async function createPatient(input) {
  const { data } = await api.post('/patients', input);
  return data.data;
}

export async function updatePatient(patientId, input) {
  const { data } = await api.patch(`/patients/${patientId}`, input);
  return data.data;
}
