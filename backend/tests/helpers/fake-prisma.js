const { randomUUID } = require('node:crypto');

function prismaError(code) {
  return Object.assign(new Error(code), { code });
}

function pickUser(user, select, include, state) {
  if (!user) return null;
  const result = { ...user };
  if (include?.patientProfile || select?.patientProfile) {
    const profile = [...state.patientProfiles.values()].find((item) => item.userId === user.id);
    if (select?.patientProfile?.select) {
      result.patientProfile = profile ? { id: profile.id } : null;
    } else {
      result.patientProfile = profile || null;
    }
  }
  if (select) {
    return Object.fromEntries(Object.entries(select)
      .filter(([, enabled]) => enabled === true || (enabled && typeof enabled === 'object'))
      .map(([key]) => [key, result[key]]));
  }
  return result;
}

function createFakePrisma() {
  const state = {
    users: new Map(),
    patientProfiles: new Map(),
    patientAccess: new Map(),
    revokedTokens: new Map(),
    auditLogs: [],
  };

  const client = {
    state,
    async $transaction(callback) {
      return callback(client);
    },
    user: {
      async create({ data }) {
        if ([...state.users.values()].some((user) => user.email === data.email)) throw prismaError('P2002');
        const now = new Date();
        const user = {
          id: randomUUID(),
          ...data,
          isActive: data.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        };
        state.users.set(user.id, user);
        return { ...user };
      },
      async findUnique({ where, select, include }) {
        const user = where.id
          ? state.users.get(where.id)
          : [...state.users.values()].find((item) => item.email === where.email);
        return pickUser(user, select, include, state);
      },
      async findMany({ skip = 0, take = 50, select }) {
        return [...state.users.values()]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(skip, skip + take)
          .map((user) => pickUser(user, select, undefined, state));
      },
      async update({ where, data, include }) {
        const user = state.users.get(where.id);
        if (!user) throw prismaError('P2025');
        Object.assign(user, data, { updatedAt: new Date() });
        return pickUser(user, undefined, include, state);
      },
    },
    patientProfile: {
      async create({ data }) {
        const profile = { id: randomUUID(), userId: data.userId, createdAt: new Date() };
        state.patientProfiles.set(profile.id, profile);
        return { ...profile };
      },
      async findUnique({ where, select, include }) {
        const profile = where.id
          ? state.patientProfiles.get(where.id)
          : [...state.patientProfiles.values()].find((item) => item.userId === where.userId);
        if (!profile) return null;
        const result = { ...profile };
        if (include?.user) {
          const user = state.users.get(profile.userId);
          result.user = user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
        }
        if (select) return Object.fromEntries(Object.keys(select).map((key) => [key, result[key]]));
        return result;
      },
    },
    patientAccess: {
      async findUnique({ where }) {
        if (where.patientId_userId) {
          const { patientId, userId } = where.patientId_userId;
          return [...state.patientAccess.values()].find((item) => item.patientId === patientId && item.userId === userId) || null;
        }
        return state.patientAccess.get(where.id) || null;
      },
      async create({ data, select }) {
        if ([...state.patientAccess.values()].some((item) => item.patientId === data.patientId && item.userId === data.userId)) {
          throw prismaError('P2002');
        }
        const grant = { id: randomUUID(), ...data, createdAt: new Date() };
        state.patientAccess.set(grant.id, grant);
        return select ? Object.fromEntries(Object.keys(select).map((key) => [key, grant[key]])) : grant;
      },
      async delete({ where }) {
        const grant = state.patientAccess.get(where.id);
        if (!grant) throw prismaError('P2025');
        state.patientAccess.delete(where.id);
        return grant;
      },
    },
    revokedToken: {
      async findFirst({ where }) {
        const item = [...state.revokedTokens.values()].find((token) => token.jti === where.jti && token.expiresAt > where.expiresAt.gt);
        return item ? { id: item.id } : null;
      },
      async create({ data }) {
        if ([...state.revokedTokens.values()].some((item) => item.jti === data.jti)) throw prismaError('P2002');
        const item = { id: randomUUID(), ...data, createdAt: new Date() };
        state.revokedTokens.set(item.id, item);
        return item;
      },
    },
    auditLog: {
      async create({ data }) {
        const record = { id: randomUUID(), ...data, createdAt: new Date() };
        state.auditLogs.push(record);
        return record;
      },
    },
  };

  client.seedUser = async ({ email, name, role, isActive = true, passwordHash = 'not-used' }) => {
    const now = new Date();
    const user = { id: randomUUID(), email, name, role, isActive, passwordHash, createdAt: now, updatedAt: now };
    state.users.set(user.id, user);
    return user;
  };

  return client;
}

module.exports = { createFakePrisma };
