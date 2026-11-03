const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const request = require('supertest');
const appModule = require('../src/app');
const { signAccessToken } = require('../src/utils/jwt');
const { createFakePrisma } = require('./helpers/fake-prisma');

const API = '/api/v1';
const JWT_SECRET = randomBytes(48).toString('base64url');

function createContext({ eventPublisher = { async publish() {} } } = {}) {
  const prismaClient = createFakePrisma();
  const app = appModule.createApp({
    prismaClient,
    jwtSecret: JWT_SECRET,
    passwordRounds: 10,
    tokenLifetimeSeconds: 900,
    apiPrefix: API,
    logging: false,
    eventPublisher,
  });
  return { app, prismaClient };
}

async function tokenForRole(prismaClient, role, email = `${role.toLowerCase()}@example.test`) {
  const user = await prismaClient.seedUser({ email, name: `${role} User`, role });
  return { user, token: signAccessToken(user.id, JWT_SECRET).token };
}

async function createPeople(prismaClient, { patientUserId = null } = {}) {
  let patientUser;
  if (patientUserId) {
    patientUser = { id: patientUserId };
  } else {
    patientUser = await prismaClient.seedUser({ email: `patient-${randomBytes(4).toString('hex')}@example.test`, name: 'Synthetic Patient', role: 'PATIENT' });
  }
  const doctorUser = await prismaClient.seedUser({ email: `doctor-${randomBytes(4).toString('hex')}@example.test`, name: 'Synthetic Doctor', role: 'DOCTOR' });
  const patient = await prismaClient.seedPatient({ userId: patientUser.id });
  const doctor = await prismaClient.seedDoctor({ userId: doctorUser.id });
  return { patient, patientUser, doctor, doctorUser };
}

function futureSlot(offsetHours = 2, durationMinutes = 45) {
  const scheduledStart = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);
  return { scheduledStart: scheduledStart.toISOString(), scheduledEnd: scheduledEnd.toISOString() };
}

function appointmentInput(people, slot = futureSlot(), overrides = {}) {
  return {
    patientId: people.patient.id,
    doctorId: people.doctor.id,
    ...slot,
    visitCategory: 'Routine consultation',
    ...overrides,
  };
}

async function book(app, token, input) {
  return request(app).post(`${API}/appointments`).set('Authorization', `Bearer ${token}`).send(input);
}

test('a valid booking stores UTC ISO timestamps and publishes appointment.created', async () => {
  const published = [];
  const { app, prismaClient } = createContext({ eventPublisher: { async publish(event) { published.push(event); } } });
  const { token, user } = await tokenForRole(prismaClient, 'RECEPTIONIST');
  const people = await createPeople(prismaClient);
  const slot = futureSlot();
  const offsetStart = new Date(new Date(slot.scheduledStart).getTime() + 5.5 * 60 * 60 * 1000).toISOString().replace('Z', '+05:30');
  const offsetEnd = new Date(new Date(slot.scheduledEnd).getTime() + 5.5 * 60 * 60 * 1000).toISOString().replace('Z', '+05:30');
  const created = await book(app, token, appointmentInput(people, { scheduledStart: offsetStart, scheduledEnd: offsetEnd }));

  assert.equal(created.status, 201);
  assert.equal(created.body.data.status, 'SCHEDULED');
  assert.equal(created.body.data.createdBy, user.id);
  assert.equal(created.body.data.scheduledStart, slot.scheduledStart);
  assert.equal(created.body.data.scheduledEnd, slot.scheduledEnd);
  assert.match(created.body.data.scheduledStart, /Z$/);
  assert.match(created.body.data.scheduledEnd, /Z$/);
  assert.match(created.body.data.createdAt, /Z$/);
  assert.equal(published.length, 1);
  assert.equal(published[0].type, 'appointment.created');
  assert.equal(prismaClient.state.appointments.size, 1);
});

test('booking validates timestamp order, references, and active records', async () => {
  const { app, prismaClient } = createContext();
  const { token } = await tokenForRole(prismaClient, 'ADMIN');
  const people = await createPeople(prismaClient);
  const slot = futureSlot();
  const invalidOrder = await book(app, token, appointmentInput(people, {
    scheduledStart: slot.scheduledStart,
    scheduledEnd: slot.scheduledStart,
  }));
  const noOffset = await book(app, token, appointmentInput(people, {
    scheduledStart: slot.scheduledStart.slice(0, -1),
    scheduledEnd: slot.scheduledEnd,
  }));
  const inactivePatient = await prismaClient.seedPatient({ isActive: false });
  const inactivePatientBooking = await book(app, token, appointmentInput({ patient: inactivePatient, doctor: people.doctor }, futureSlot(4)));
  const inactiveDoctor = await prismaClient.seedDoctor({ isActive: false });
  const inactiveDoctorBooking = await book(app, token, appointmentInput({ patient: people.patient, doctor: inactiveDoctor }, futureSlot(5)));
  const missingDoctor = await book(app, token, appointmentInput(people, futureSlot(5), { doctorId: '5a6894fc-d33c-43ee-a104-c1906fd31c29' }));

  assert.equal(invalidOrder.status, 400);
  assert.equal(noOffset.status, 400);
  assert.equal(inactivePatientBooking.status, 400);
  assert.equal(inactivePatientBooking.body.error.code, 'PATIENT_NOT_ACTIVE');
  assert.equal(inactiveDoctorBooking.status, 400);
  assert.equal(inactiveDoctorBooking.body.error.code, 'DOCTOR_NOT_ACTIVE');
  assert.equal(missingDoctor.status, 400);
  assert.equal(missingDoctor.body.error.code, 'DOCTOR_NOT_ACTIVE');
});

test('conflict checks reject overlapping doctor or patient bookings but allow adjacent visits', async () => {
  const { app, prismaClient } = createContext();
  const { token } = await tokenForRole(prismaClient, 'ADMIN');
  const firstPeople = await createPeople(prismaClient);
  const secondPeople = await createPeople(prismaClient);
  const slot = futureSlot();
  const first = await book(app, token, appointmentInput(firstPeople, slot));
  const sameDoctor = await book(app, token, appointmentInput({ patient: secondPeople.patient, doctor: firstPeople.doctor }, slot));
  const differentDoctor = await book(app, token, appointmentInput({ patient: firstPeople.patient, doctor: secondPeople.doctor }, slot));
  const adjacent = await book(app, token, appointmentInput(secondPeople, {
    scheduledStart: slot.scheduledEnd,
    scheduledEnd: new Date(new Date(slot.scheduledEnd).getTime() + 45 * 60 * 1000).toISOString(),
  }));

  assert.equal(first.status, 201);
  assert.equal(sameDoctor.status, 409, 'overlapping doctor booking should be rejected');
  assert.equal(differentDoctor.status, 409, 'overlapping patient booking should be rejected');
  assert.equal(sameDoctor.body.error.code, 'APPOINTMENT_CONFLICT');
  assert.equal(adjacent.status, 201);

  const concurrentSlot = futureSlot(10);
  const concurrent = await Promise.all([
    book(app, token, appointmentInput(firstPeople, concurrentSlot)),
    book(app, token, appointmentInput({ patient: secondPeople.patient, doctor: firstPeople.doctor }, concurrentSlot)),
  ]);
  assert.deepEqual(concurrent.map((response) => response.status).sort(), [201, 409]);
});

test('patients see and manage only their own appointments; doctors see only assigned visits', async () => {
  const { app, prismaClient } = createContext();
  const patientAUser = await tokenForRole(prismaClient, 'PATIENT', 'owner@example.test');
  const patientBUser = await tokenForRole(prismaClient, 'PATIENT', 'other@example.test');
  const peopleA = await createPeople(prismaClient, { patientUserId: patientAUser.user.id });
  const peopleB = await createPeople(prismaClient, { patientUserId: patientBUser.user.id });
  const admin = await tokenForRole(prismaClient, 'ADMIN');
  const appointmentA = await book(app, admin.token, appointmentInput(peopleA));
  const appointmentB = await book(app, admin.token, appointmentInput(peopleB, futureSlot(4)));

  const ownList = await request(app).get(`${API}/appointments`).set('Authorization', `Bearer ${patientAUser.token}`);
  const otherAppointment = await request(app).get(`${API}/appointments/${appointmentB.body.data.id}`).set('Authorization', `Bearer ${patientAUser.token}`);
  const otherCancel = await request(app).post(`${API}/appointments/${appointmentB.body.data.id}/cancel`).set('Authorization', `Bearer ${patientAUser.token}`);
  const bookForOtherPatient = await book(app, patientAUser.token, appointmentInput(peopleB, futureSlot(6)));
  const assignedDoctor = await request(app).get(`${API}/appointments/${appointmentA.body.data.id}`).set('Authorization', `Bearer ${signAccessToken(peopleA.doctorUser.id, JWT_SECRET).token}`);
  const unassignedDoctor = await request(app).get(`${API}/appointments/${appointmentB.body.data.id}`).set('Authorization', `Bearer ${signAccessToken(peopleA.doctorUser.id, JWT_SECRET).token}`);
  const doctorList = await request(app).get(`${API}/appointments`).set('Authorization', `Bearer ${signAccessToken(peopleA.doctorUser.id, JWT_SECRET).token}`);

  assert.equal(ownList.body.pagination.total, 1);
  assert.equal(otherAppointment.status, 404);
  assert.equal(otherCancel.status, 404);
  assert.equal(bookForOtherPatient.status, 404);
  assert.equal(assignedDoctor.status, 200);
  assert.equal(unassignedDoctor.status, 404);
  assert.equal(doctorList.body.pagination.total, 1);
});

test('cancellation releases a slot and emits appointment.cancelled', async () => {
  const published = [];
  const { app, prismaClient } = createContext({ eventPublisher: { async publish(event) { published.push(event); } } });
  const patientUser = await tokenForRole(prismaClient, 'PATIENT', 'cancel@example.test');
  const people = await createPeople(prismaClient, { patientUserId: patientUser.user.id });
  const admin = await tokenForRole(prismaClient, 'ADMIN');
  const slot = futureSlot();
  const created = await book(app, patientUser.token, appointmentInput(people, slot));
  const cancelled = await request(app).post(`${API}/appointments/${created.body.data.id}/cancel`).set('Authorization', `Bearer ${patientUser.token}`);
  const replacement = await book(app, admin.token, appointmentInput(people, slot));

  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.status, 'CANCELLED');
  assert.equal(replacement.status, 201);
  assert.deepEqual(published.map((event) => event.type), ['appointment.created', 'appointment.cancelled', 'appointment.created']);
});

test('rescheduling checks conflicts, preserves status, and emits appointment.rescheduled', async () => {
  const published = [];
  const { app, prismaClient } = createContext({ eventPublisher: { async publish(event) { published.push(event); } } });
  const { token } = await tokenForRole(prismaClient, 'ADMIN');
  const people = await createPeople(prismaClient);
  const otherPeople = await createPeople(prismaClient);
  const first = await book(app, token, appointmentInput(people));
  const occupiedSlot = futureSlot(8);
  const occupied = await book(app, token, appointmentInput({ patient: otherPeople.patient, doctor: people.doctor }, occupiedSlot));
  const confirmed = await request(app).patch(`${API}/appointments/${first.body.data.id}`).set('Authorization', `Bearer ${token}`).send({ status: 'CONFIRMED' });
  const movedSlot = futureSlot(6);
  const moved = await request(app).post(`${API}/appointments/${first.body.data.id}/reschedule`).set('Authorization', `Bearer ${token}`).send(movedSlot);
  const collision = await request(app).post(`${API}/appointments/${occupied.body.data.id}/reschedule`).set('Authorization', `Bearer ${token}`).send(movedSlot);

  assert.equal(confirmed.status, 200);
  assert.equal(moved.status, 200);
  assert.equal(moved.body.data.status, 'CONFIRMED');
  assert.equal(moved.body.data.scheduledStart, movedSlot.scheduledStart);
  assert.equal(collision.status, 409, 'reschedule should be rejected when the new slot conflicts');
  assert.equal(collision.body.error.code, 'APPOINTMENT_CONFLICT');
  assert.deepEqual(published.map((event) => event.type), [
    'appointment.created',
    'appointment.created',
    'appointment.confirmed',
    'appointment.rescheduled',
  ]);
});

test('lifecycle transitions reject invalid changes and publish confirmation and completion events', async () => {
  const published = [];
  const { app, prismaClient } = createContext({ eventPublisher: { async publish(event) { published.push(event); } } });
  const admin = await tokenForRole(prismaClient, 'ADMIN');
  const people = await createPeople(prismaClient);
  const created = await book(app, admin.token, appointmentInput(people));
  const invalidComplete = await request(app).patch(`${API}/appointments/${created.body.data.id}`).set('Authorization', `Bearer ${admin.token}`).send({ status: 'COMPLETED' });
  const confirmed = await request(app).patch(`${API}/appointments/${created.body.data.id}`).set('Authorization', `Bearer ${admin.token}`).send({ status: 'CONFIRMED' });
  const doctorToken = signAccessToken(people.doctorUser.id, JWT_SECRET).token;
  const checkedIn = await request(app).patch(`${API}/appointments/${created.body.data.id}`).set('Authorization', `Bearer ${doctorToken}`).send({ status: 'CHECKED_IN' });
  const inProgress = await request(app).patch(`${API}/appointments/${created.body.data.id}`).set('Authorization', `Bearer ${doctorToken}`).send({ status: 'IN_PROGRESS' });
  const completed = await request(app).patch(`${API}/appointments/${created.body.data.id}`).set('Authorization', `Bearer ${doctorToken}`).send({ status: 'COMPLETED' });
  const cancelCompleted = await request(app).post(`${API}/appointments/${created.body.data.id}/cancel`).set('Authorization', `Bearer ${admin.token}`);
  const rescheduleCompleted = await request(app).post(`${API}/appointments/${created.body.data.id}/reschedule`).set('Authorization', `Bearer ${admin.token}`).send(futureSlot(10));

  assert.equal(invalidComplete.status, 409);
  assert.equal(confirmed.status, 200);
  assert.equal(checkedIn.status, 200);
  assert.equal(inProgress.status, 200);
  assert.equal(completed.status, 200);
  assert.equal(completed.body.data.status, 'COMPLETED');
  assert.equal(cancelCompleted.status, 409);
  assert.equal(rescheduleCompleted.status, 409);
  assert.deepEqual(published.map((event) => event.type), ['appointment.created', 'appointment.confirmed', 'appointment.completed']);
});

test('appointments paginate and filter by status and start-time range; authentication is required', async () => {
  const { app, prismaClient } = createContext();
  const { token } = await tokenForRole(prismaClient, 'ADMIN');
  const people = await createPeople(prismaClient);
  const firstSlot = futureSlot(2);
  const secondSlot = futureSlot(5);
  const first = await book(app, token, appointmentInput(people, firstSlot));
  const second = await book(app, token, appointmentInput(people, secondSlot));
  await request(app).patch(`${API}/appointments/${first.body.data.id}`).set('Authorization', `Bearer ${token}`).send({ status: 'CONFIRMED' });
  const page = await request(app).get(`${API}/appointments?page=1&limit=1&status=CONFIRMED&from=${encodeURIComponent(firstSlot.scheduledStart)}&to=${encodeURIComponent(secondSlot.scheduledStart)}`).set('Authorization', `Bearer ${token}`);
  const invalidRange = await request(app).get(`${API}/appointments?from=${encodeURIComponent(secondSlot.scheduledStart)}&to=${encodeURIComponent(firstSlot.scheduledStart)}`).set('Authorization', `Bearer ${token}`);
  const missingAuth = await request(app).get(`${API}/appointments`);

  assert.equal(second.status, 201);
  assert.equal(page.status, 200);
  assert.equal(page.body.data.length, 1);
  assert.equal(page.body.data[0].id, first.body.data.id);
  assert.equal(page.body.pagination.total, 1);
  assert.equal(invalidRange.status, 400);
  assert.equal(missingAuth.status, 401);
});
