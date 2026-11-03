const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const request = require('supertest');
const appModule = require('../src/app');
const { signAccessToken } = require('../src/utils/jwt');
const { createFakePrisma } = require('./helpers/fake-prisma');

const API = '/api/v1';
const JWT_SECRET = randomBytes(48).toString('base64url');

function createContext() {
  const prismaClient = createFakePrisma();
  const app = appModule.createApp({
    prismaClient,
    jwtSecret: JWT_SECRET,
    passwordRounds: 10,
    tokenLifetimeSeconds: 900,
    apiPrefix: API,
    logging: false,
  });
  return { app, prismaClient };
}

async function tokenForRole(prismaClient, role, email = `${role.toLowerCase()}@example.test`) {
  const user = await prismaClient.seedUser({ email, name: `${role} User`, role });
  return { user, token: signAccessToken(user.id, JWT_SECRET).token };
}

async function registerPatient(app, email) {
  const response = await request(app).post(`${API}/auth/register`).send({
    email,
    name: `Test ${email.split('@')[0]}`,
    password: 'CorrectHorse!Battery9',
  });
  assert.equal(response.status, 201);
  const login = await request(app).post(`${API}/auth/login`).send({ email, password: 'CorrectHorse!Battery9' });
  assert.equal(login.status, 200);
  return { user: response.body.data, token: login.body.data.accessToken };
}

const patientInput = (overrides = {}) => ({
  firstName: 'Avery',
  lastName: 'Santos',
  dateOfBirth: '1991-03-18',
  gender: 'non-binary',
  phone: '+1 555 010 0020',
  email: 'avery.santos@example.test',
  address: '12 Sample Street',
  emergencyContactName: 'Jordan Santos',
  emergencyContactPhone: '+1 555 010 0021',
  ...overrides,
});

const doctorInput = (overrides = {}) => ({
  firstName: 'Morgan',
  lastName: 'Lee',
  specialization: 'Cardiology',
  department: 'Heart Center',
  phone: '+1 555 010 0090',
  email: 'morgan.lee@example.test',
  ...overrides,
});

test('ADMIN can create, read, update, and soft-delete patient records', async () => {
  const { app, prismaClient } = createContext();
  const { token } = await tokenForRole(prismaClient, 'ADMIN');
  const created = await request(app).post(`${API}/patients`).set('Authorization', `Bearer ${token}`).send(patientInput());

  assert.equal(created.status, 201);
  const patient = created.body.data;
  assert.match(patient.patientNumber, /^PAT-[A-F0-9]{32}$/);
  assert.equal(patient.dateOfBirth, '1991-03-18');
  assert.equal(patient.gender, 'non-binary');
  assert.equal('userId' in patient, false);

  const fetched = await request(app).get(`${API}/patients/${patient.id}`).set('Authorization', `Bearer ${token}`);
  const updated = await request(app).patch(`${API}/patients/${patient.id}`).set('Authorization', `Bearer ${token}`).send({ phone: '+1 555 010 0088' });
  const deactivated = await request(app).delete(`${API}/patients/${patient.id}`).set('Authorization', `Bearer ${token}`);
  const listing = await request(app).get(`${API}/patients?isActive=false`).set('Authorization', `Bearer ${token}`);

  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.data.email, 'avery.santos@example.test');
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.phone, '+1 555 010 0088');
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.data.isActive, false);
  assert.equal(prismaClient.state.patients.has(patient.id), true, 'DELETE preserves the row as a soft delete');
  assert.equal(listing.body.pagination.total, 1);
});

test('patient records paginate, search, validate input, and reject duplicate account links', async () => {
  const { app, prismaClient } = createContext();
  const { token } = await tokenForRole(prismaClient, 'RECEPTIONIST');
  const first = await request(app).post(`${API}/patients`).set('Authorization', `Bearer ${token}`).send(patientInput({ firstName: 'Riley', email: 'riley@example.test' }));
  await request(app).post(`${API}/patients`).set('Authorization', `Bearer ${token}`).send(patientInput({ firstName: 'Taylor', email: 'taylor@example.test' }));
  const page = await request(app).get(`${API}/patients?page=2&limit=1&search=example.test`).set('Authorization', `Bearer ${token}`);
  const invalidDate = await request(app).post(`${API}/patients`).set('Authorization', `Bearer ${token}`).send(patientInput({ dateOfBirth: '2039-02-31' }));
  const invalidUuid = await request(app).get(`${API}/patients/not-a-uuid`).set('Authorization', `Bearer ${token}`);
  const unknownField = await request(app).post(`${API}/patients`).set('Authorization', `Bearer ${token}`).send(patientInput({ patientNumber: 'PAT-FORGED' }));

  assert.equal(first.status, 201);
  assert.equal(page.status, 200);
  assert.equal(page.body.data.length, 1);
  assert.equal(page.body.data[0].firstName, 'Taylor');
  assert.equal(page.body.pagination.page, 2);
  assert.equal(invalidDate.status, 400);
  assert.equal(invalidUuid.status, 400);
  assert.equal(unknownField.status, 400);

  const linked = await registerPatient(app, 'linked@example.test');
  // Simulate an existing PATIENT login account without its migrated domain record.
  prismaClient.state.patients.delete(linked.user.patientProfileId);
  const linkInput = patientInput({ userId: linked.user.id, firstName: 'Linked', lastName: 'Patient', email: 'linked.patient@example.test' });
  const linkedRecord = await request(app).post(`${API}/patients`).set('Authorization', `Bearer ${token}`).send(linkInput);
  const duplicateLink = await request(app).post(`${API}/patients`).set('Authorization', `Bearer ${token}`).send(linkInput);
  assert.equal(linkedRecord.status, 201);
  assert.equal(prismaClient.state.users.get(linked.user.id).name, 'Linked Patient');
  assert.equal(prismaClient.state.users.get(linked.user.id).email, 'linked.patient@example.test');
  assert.equal(duplicateLink.status, 409);
  assert.equal(duplicateLink.body.error.code, 'PATIENT_ACCOUNT_ALREADY_LINKED');
  assert.equal(new Set([...prismaClient.state.patients.values()].map((item) => item.patientNumber)).size, prismaClient.state.patients.size);
});

test('patients can only list, view, and update their own permitted fields', async () => {
  const { app } = createContext();
  const patientA = await registerPatient(app, 'owner@example.test');
  const patientB = await registerPatient(app, 'other@example.test');
  const list = await request(app).get(`${API}/patients`).set('Authorization', `Bearer ${patientA.token}`);
  const own = await request(app).get(`${API}/patients/${patientA.user.patientProfileId}`).set('Authorization', `Bearer ${patientA.token}`);
  const other = await request(app).get(`${API}/patients/${patientB.user.patientProfileId}`).set('Authorization', `Bearer ${patientA.token}`);
  const updateOther = await request(app).patch(`${API}/patients/${patientB.user.patientProfileId}`).set('Authorization', `Bearer ${patientA.token}`).send({ phone: '555-0199' });
  const updateProtectedField = await request(app).patch(`${API}/patients/${patientA.user.patientProfileId}`).set('Authorization', `Bearer ${patientA.token}`).send({ firstName: 'Changed' });
  const updateOwn = await request(app).patch(`${API}/patients/${patientA.user.patientProfileId}`).set('Authorization', `Bearer ${patientA.token}`).send({ phone: '555-0100' });

  assert.equal(list.body.pagination.total, 1);
  assert.equal(own.status, 200);
  assert.equal(other.status, 404);
  assert.equal(updateOther.status, 404);
  assert.equal(updateProtectedField.status, 400);
  assert.equal(updateOwn.status, 200);
  assert.equal(updateOwn.body.data.phone, '555-0100');
});

test('ADMIN can manage doctors, search the directory, and deactivate without hard deletion', async () => {
  const { app, prismaClient } = createContext();
  const { token } = await tokenForRole(prismaClient, 'ADMIN');
  const created = await request(app).post(`${API}/doctors`).set('Authorization', `Bearer ${token}`).send(doctorInput());
  const secondCreated = await request(app).post(`${API}/doctors`).set('Authorization', `Bearer ${token}`).send(doctorInput({ firstName: 'Sam', email: 'sam.doctor@example.test' }));
  const doctor = created.body.data;
  const page = await request(app).get(`${API}/doctors?search=Cardiology&department=Heart%20Center&limit=1`).set('Authorization', `Bearer ${token}`);
  const updated = await request(app).patch(`${API}/doctors/${doctor.id}`).set('Authorization', `Bearer ${token}`).send({ availability: 'ON_LEAVE' });
  const deactivated = await request(app).delete(`${API}/doctors/${doctor.id}`).set('Authorization', `Bearer ${token}`);
  const inactive = await request(app).get(`${API}/doctors?isActive=false`).set('Authorization', `Bearer ${token}`);

  assert.equal(created.status, 201);
  assert.equal(secondCreated.status, 201);
  assert.match(doctor.doctorNumber, /^DOC-[A-F0-9]{32}$/);
  assert.notEqual(doctor.doctorNumber, secondCreated.body.data.doctorNumber);
  assert.equal('userId' in doctor, false);
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.availability, 'ON_LEAVE');
  assert.equal(deactivated.body.data.isActive, false);
  assert.equal(deactivated.body.data.availability, 'OFF_DUTY');
  assert.equal(page.body.data.length, 1);
  assert.equal(inactive.body.pagination.total, 1);
  assert.equal(prismaClient.state.doctors.has(doctor.id), true);
});

test('patient and doctor routes require authentication', async () => {
  const { app } = createContext();
  const [patients, doctors] = await Promise.all([
    request(app).get(`${API}/patients`),
    request(app).get(`${API}/doctors`),
  ]);
  assert.equal(patients.status, 401);
  assert.equal(doctors.status, 401);
});

test('only ADMIN can write doctor records; duplicate linked users and invalid filters are rejected', async () => {
  const { app, prismaClient } = createContext();
  const { token: adminToken } = await tokenForRole(prismaClient, 'ADMIN');
  const { token: receptionistToken } = await tokenForRole(prismaClient, 'RECEPTIONIST');
  const doctorUser = await prismaClient.seedUser({ email: 'doctor-account@example.test', name: 'Doctor Account', role: 'DOCTOR' });
  const first = await request(app).post(`${API}/doctors`).set('Authorization', `Bearer ${adminToken}`).send(doctorInput({ userId: doctorUser.id }));
  const duplicate = await request(app).post(`${API}/doctors`).set('Authorization', `Bearer ${adminToken}`).send(doctorInput({ userId: doctorUser.id, email: 'second@example.test' }));
  const replacementUser = await prismaClient.seedUser({ email: 'replacement@example.test', name: 'Replacement Account', role: 'DOCTOR' });
  const relinked = await request(app).patch(`${API}/doctors/${first.body.data.id}`).set('Authorization', `Bearer ${adminToken}`).send({
    userId: replacementUser.id,
    firstName: 'Updated',
    lastName: 'Doctor',
    email: 'updated.doctor@example.test',
  });
  const forbidden = await request(app).post(`${API}/doctors`).set('Authorization', `Bearer ${receptionistToken}`).send(doctorInput());
  const invalidAvailability = await request(app).get(`${API}/doctors?availability=FREE`).set('Authorization', `Bearer ${adminToken}`);
  const invalidUpdate = await request(app).patch(`${API}/doctors/not-a-uuid`).set('Authorization', `Bearer ${adminToken}`).send({ department: 'Neurology' });

  assert.equal(first.status, 201);
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'DOCTOR_ACCOUNT_ALREADY_LINKED');
  assert.equal(relinked.status, 200);
  assert.equal(prismaClient.state.users.get(doctorUser.id).name, 'Morgan Lee', 'relinking leaves the old account unchanged');
  assert.equal(prismaClient.state.users.get(replacementUser.id).name, 'Updated Doctor');
  assert.equal(prismaClient.state.users.get(replacementUser.id).email, 'updated.doctor@example.test');
  assert.equal(forbidden.status, 403);
  assert.equal(invalidAvailability.status, 400);
  assert.equal(invalidUpdate.status, 400);
});
