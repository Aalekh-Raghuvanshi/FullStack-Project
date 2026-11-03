const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const appModule = require('../src/app');
const { JWT_AUDIENCE, JWT_ISSUER, getJwtSecret, signAccessToken } = require('../src/utils/jwt');
const { createFakePrisma } = require('./helpers/fake-prisma');

const JWT_SECRET = randomBytes(48).toString('base64url');
const API = '/api/v1';

test('example JWT secrets are rejected', () => {
  assert.throws(() => getJwtSecret('CHANGE_ME'), { code: 'AUTH_CONFIGURATION_ERROR' });
  assert.throws(() => getJwtSecret('replace-with-a-long-random-secret'), { code: 'AUTH_CONFIGURATION_ERROR' });
});

function createTestContext() {
  const prismaClient = createFakePrisma();
  const app = appModule.createApp({
    prismaClient,
    jwtSecret: JWT_SECRET,
    passwordRounds: 10,
    tokenLifetimeSeconds: 900,
    logging: false,
  });
  return { app, prismaClient };
}

async function registerPatient(app, email = 'patient@example.test', password = 'CorrectHorse!Battery9') {
  const response = await request(app).post(`${API}/auth/register`).send({
    email,
    name: 'Casey Patient',
    password,
  });
  assert.equal(response.status, 201);
  return response.body.data;
}

async function login(app, email = 'patient@example.test', password = 'CorrectHorse!Battery9') {
  return request(app).post(`${API}/auth/login`).send({ email, password });
}

test('registration creates a patient account and never returns the password hash', async () => {
  const { app, prismaClient } = createTestContext();
  const response = await request(app).post(`${API}/auth/register`).send({
    email: '  PATIENT@example.test ',
    name: 'Casey Patient',
    password: 'CorrectHorse!Battery9',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.role, 'PATIENT');
  assert.equal(response.body.data.email, 'patient@example.test');
  assert.equal(typeof response.body.data.patientProfileId, 'string');
  assert.equal('passwordHash' in response.body.data, false);
  assert.notEqual([...prismaClient.state.users.values()][0].passwordHash, 'CorrectHorse!Battery9');
  assert.match([...prismaClient.state.users.values()][0].passwordHash, /^\$2[aby]\$/);
  assert.equal(prismaClient.state.auditLogs[0].action, 'auth.register');
});

test('public registration rejects role assignment and duplicate email', async () => {
  const { app, prismaClient } = createTestContext();
  const body = { email: 'admin@example.test', name: 'New User', password: 'CorrectHorse!Battery9' };
  const attemptedAdmin = await request(app).post(`${API}/auth/register`).send({ ...body, role: 'ADMIN' });
  assert.equal(attemptedAdmin.status, 400);
  assert.equal(prismaClient.state.users.size, 0);

  const created = await request(app).post(`${API}/auth/register`).send(body);
  const duplicate = await request(app).post(`${API}/auth/register`).send({ ...body, email: 'ADMIN@example.test' });
  assert.equal(created.status, 201);
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'EMAIL_ALREADY_REGISTERED');
});

test('login returns a short-lived access token and a public user profile', async () => {
  const { app } = createTestContext();
  await registerPatient(app);
  const response = await login(app);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.tokenType, 'Bearer');
  assert.equal(response.body.data.expiresIn, 900);
  assert.equal(typeof response.body.data.accessToken, 'string');
  assert.equal(response.body.data.user.role, 'PATIENT');
  assert.equal('passwordHash' in response.body.data.user, false);
});

test('unknown email and wrong password receive the same generic login error', async () => {
  const { app } = createTestContext();
  await registerPatient(app);
  const wrongPassword = await login(app, 'patient@example.test', 'WrongPassword!123');
  const unknownEmail = await login(app, 'missing@example.test', 'WrongPassword!123');

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(wrongPassword.body.error, unknownEmail.body.error);
  assert.equal(wrongPassword.body.error.message, 'Invalid email or password.');
});

test('invalid and expired JWTs are rejected', async () => {
  const { app, prismaClient } = createTestContext();
  const user = await prismaClient.seedUser({ email: 'test@example.test', name: 'Test', role: 'PATIENT' });
  const expiredToken = jwt.sign({}, JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    jwtid: 'expired-token',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: -1,
  });

  const invalid = await request(app).get(`${API}/auth/me`).set('Authorization', 'Bearer invalid-token');
  const expired = await request(app).get(`${API}/auth/me`).set('Authorization', `Bearer ${expiredToken}`);
  assert.equal(invalid.status, 401);
  assert.equal(expired.status, 401);
});

test('protected endpoints reject missing authentication and insufficient roles', async () => {
  const { app } = createTestContext();
  const missing = await request(app).get(`${API}/auth/me`);
  assert.equal(missing.status, 401);

  await registerPatient(app);
  const tokenResponse = await login(app);
  const forbidden = await request(app)
    .get(`${API}/admin/users`)
    .set('Authorization', `Bearer ${tokenResponse.body.data.accessToken}`);
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.body.error.code, 'FORBIDDEN');
});

test('inactive users cannot log in or continue using an existing token', async () => {
  const { app, prismaClient } = createTestContext();
  const user = await registerPatient(app);
  const tokenResponse = await login(app);
  prismaClient.state.users.get(user.id).isActive = false;

  const inactiveLogin = await login(app);
  const inactiveRequest = await request(app)
    .get(`${API}/auth/me`)
    .set('Authorization', `Bearer ${tokenResponse.body.data.accessToken}`);
  assert.equal(inactiveLogin.status, 403);
  assert.equal(inactiveLogin.body.error.code, 'ACCOUNT_INACTIVE');
  assert.equal(inactiveRequest.status, 403);
});

test('patients can view only their own profile; logout revokes the access token', async () => {
  const { app } = createTestContext();
  const patientA = await registerPatient(app, 'a@example.test');
  const patientB = await registerPatient(app, 'b@example.test');
  const tokenResponse = await login(app, 'a@example.test');
  const token = tokenResponse.body.data.accessToken;

  const ownProfile = await request(app)
    .get(`${API}/patients/${patientA.patientProfileId}`)
    .set('Authorization', `Bearer ${token}`);
  const otherProfile = await request(app)
    .get(`${API}/patients/${patientB.patientProfileId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(ownProfile.status, 200);
  assert.equal(ownProfile.body.data.email, 'a@example.test');
  assert.equal(otherProfile.status, 404);

  const logout = await request(app).post(`${API}/auth/logout`).set('Authorization', `Bearer ${token}`);
  const afterLogout = await request(app).get(`${API}/auth/me`).set('Authorization', `Bearer ${token}`);
  assert.equal(logout.status, 200);
  assert.equal(afterLogout.status, 401);
});

test('ADMIN can promote a clinician and grant patient-specific access', async () => {
  const { app, prismaClient } = createTestContext();
  const patient = await registerPatient(app, 'subject@example.test');
  const clinician = await registerPatient(app, 'clinician@example.test');
  const admin = await prismaClient.seedUser({ email: 'admin@example.test', name: 'Admin', role: 'ADMIN' });
  const adminToken = signAccessToken(admin.id, JWT_SECRET).token;

  const roleChange = await request(app)
    .patch(`${API}/admin/users/${clinician.id}/role`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ role: 'DOCTOR' });
  assert.equal(roleChange.status, 200);
  assert.equal(roleChange.body.data.role, 'DOCTOR');

  const grant = await request(app)
    .post(`${API}/admin/patient-access`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ patientId: patient.patientProfileId, userId: clinician.id });
  assert.equal(grant.status, 201);

  const clinicianLogin = await login(app, 'clinician@example.test');
  const patientRecord = await request(app)
    .get(`${API}/patients/${patient.patientProfileId}`)
    .set('Authorization', `Bearer ${clinicianLogin.body.data.accessToken}`);
  assert.equal(patientRecord.status, 200);
  assert.equal(patientRecord.body.data.email, 'subject@example.test');
  assert.ok(prismaClient.state.auditLogs.some((entry) => entry.action === 'admin.user_role_changed'));
});
