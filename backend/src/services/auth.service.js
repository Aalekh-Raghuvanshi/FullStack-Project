const { randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const AppError = require('../utils/app-error');
const { getPasswordRounds } = require('../utils/password');
const { getTokenLifetimeSeconds, signAccessToken } = require('../utils/jwt');
const { splitPersonName } = require('../utils/person-name');
const { createRecordNumber } = require('../utils/record-number');
const { writeAuditLog } = require('./audit.service');

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(user.patient ? { patientProfileId: user.patient.id } : {}),
  };
}

function createAuthService({ prismaClient, jwtSecret, passwordRounds, tokenLifetimeSeconds }) {
  const rounds = getPasswordRounds(passwordRounds);
  const lifetime = getTokenLifetimeSeconds(tokenLifetimeSeconds);
  const dummyHashPromise = bcrypt.hash(randomBytes(32).toString('base64url'), rounds);

  async function register({ email, password, name }) {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, rounds);
    const { firstName, lastName } = splitPersonName(name);

    try {
      const user = await prismaClient.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name: name.trim(),
            role: 'PATIENT',
          },
        });
        const patient = await transaction.patient.create({
          data: {
            userId: createdUser.id,
            patientNumber: createRecordNumber('PAT'),
            firstName,
            lastName,
            email: normalizedEmail,
          },
        });
        await writeAuditLog(transaction, {
          actorId: createdUser.id,
          action: 'auth.register',
          targetType: 'User',
          targetId: createdUser.id,
        });
        return { ...createdUser, patient };
      });
      return toPublicUser(user);
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.');
      }
      throw error;
    }
  }

  async function login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prismaClient.user.findUnique({
      where: { email: normalizedEmail },
      include: { patient: { select: { id: true } } },
    });
    const passwordHash = user?.passwordHash || await dummyHashPromise;
    const validPassword = await bcrypt.compare(password, passwordHash);

    if (!user || !validPassword) {
      await writeAuditLog(prismaClient, { action: 'auth.login_failed' });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (!user.isActive) {
      await writeAuditLog(prismaClient, {
        actorId: user.id,
        action: 'auth.login_inactive',
        targetType: 'User',
        targetId: user.id,
      });
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account is inactive.');
    }

    const issued = signAccessToken(user.id, jwtSecret, lifetime);
    await writeAuditLog(prismaClient, {
      actorId: user.id,
      action: 'auth.login',
      targetType: 'User',
      targetId: user.id,
    });

    return {
      user: toPublicUser(user),
      accessToken: issued.token,
      tokenType: 'Bearer',
      expiresIn: issued.expiresIn,
    };
  }

  async function logout(user, token) {
    await prismaClient.$transaction(async (transaction) => {
      await transaction.revokedToken.create({
        data: {
          jti: token.jti,
          userId: user.id,
          expiresAt: new Date(token.exp * 1000),
        },
      });
      await writeAuditLog(transaction, {
        actorId: user.id,
        action: 'auth.logout',
        targetType: 'User',
        targetId: user.id,
      });
    });
    return { message: 'Logged out successfully.' };
  }

  return { login, logout, register };
}

module.exports = { createAuthService, toPublicUser };
