import api from './api.js';

export async function listAppointments(params = {}) {
  const { data } = await api.get('/appointments', { params });
  return data;
}

export async function getAppointment(appointmentId) {
  const { data } = await api.get(`/appointments/${appointmentId}`);
  return data.data;
}

export async function createAppointment(input) {
  const { data } = await api.post('/appointments', input);
  return data.data;
}

export async function cancelAppointment(appointmentId) {
  const { data } = await api.post(`/appointments/${appointmentId}/cancel`);
  return data.data;
}

export async function rescheduleAppointment(appointmentId, input) {
  const { data } = await api.post(`/appointments/${appointmentId}/reschedule`, input);
  return data.data;
}
