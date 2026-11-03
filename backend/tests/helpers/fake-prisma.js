const { randomUUID } = require('node:crypto');

function prismaError(code) {
  return Object.assign(new Error(code), { code });
}

function pickUser(user, select, include, state) {
  if (!user) return null;
  const result = { ...user };
  if (include?.patient || select?.patient) {
    const patient = [...state.patients.values()].find((item) => item.userId === user.id);
    result.patient = select?.patient?.select ? (patient ? { id: patient.id } : null) : patient || null;
  }
  if (include?.doctorProfile || select?.doctorProfile) {
    const doctor = [...state.doctors.values()].find((item) => item.userId === user.id);
    result.doctorProfile = select?.doctorProfile?.select ? (doctor ? { id: doctor.id } : null) : doctor || null;
  }
  if (select) {
    return Object.fromEntries(Object.entries(select)
      .filter(([, enabled]) => enabled === true || (enabled && typeof enabled === 'object'))
      .map(([key]) => [key, result[key]]));
  }
  return result;
}

function matchFilter(actual, filter) {
  if (filter && typeof filter === 'object' && !(filter instanceof Date)) {
    if (Object.hasOwn(filter, 'contains')) {
      if (actual == null) return false;
      const haystack = String(actual);
      const needle = String(filter.contains);
      return filter.mode === 'insensitive'
        ? haystack.toLowerCase().includes(needle.toLowerCase())
        : haystack.includes(needle);
    }
    if (Object.hasOwn(filter, 'equals')) {
      if (filter.mode === 'insensitive') return String(actual).toLowerCase() === String(filter.equals).toLowerCase();
      return actual === filter.equals;
    }
  }
  return actual === filter;
}

function matches(record, where, state) {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR') {
      if (!value.some((condition) => matches(record, condition, state))) return false;
      continue;
    }
    if (key === 'accessGrants') {
      const requestedUserId = value.some.userId;
      if (![...state.patientAccess.values()].some((grant) => grant.patientId === record.id && grant.userId === requestedUserId)) return false;
      continue;
    }
    if (!matchFilter(record[key], value)) return false;
  }
  return true;
}

function ordered(records, orderBy) {
  const orderings = Array.isArray(orderBy) ? orderBy : [orderBy || {}];
  return records.sort((left, right) => {
    for (const ordering of orderings) {
      const [key, direction] = Object.entries(ordering)[0] || [];
      if (!key || left[key] === right[key]) continue;
      const comparison = left[key] < right[key] ? -1 : 1;
      return direction === 'desc' ? -comparison : comparison;
    }
    return 0;
  });
}

function createFakePrisma() {
  const patients = new Map();
  const state = {
    users: new Map(),
    patients,
    patientProfiles: patients,
    doctors: new Map(),
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
        const user = { id: randomUUID(), ...data, isActive: data.isActive ?? true, createdAt: now, updatedAt: now };
        state.users.set(user.id, user);
        return { ...user };
      },
      async findUnique({ where, select, include }) {
        const user = where.id
          ? state.users.get(where.id)
          : [...state.users.values()].find((item) => item.email === where.email);
        return pickUser(user, select, include, state);
      },
      async findMany({ skip = 0, take = 50, select, orderBy }) {
        return ordered([...state.users.values()], orderBy)
          .slice(skip, skip + take)
          .map((user) => pickUser(user, select, undefined, state));
      },
      async update({ where, data, include }) {
        const user = state.users.get(where.id);
        if (!user) throw prismaError('P2025');
        if (data.email && [...state.users.values()].some((item) => item.id !== where.id && item.email === data.email)) throw prismaError('P2002');
        Object.assign(user, data, { updatedAt: new Date() });
        return pickUser(user, undefined, include, state);
      },
    },
    patient: {
      async create({ data }) {
        if ([...state.patients.values()].some((item) => item.patientNumber === data.patientNumber || (data.userId && item.userId === data.userId))) {
          throw prismaError('P2002');
        }
        const now = new Date();
        const patient = {
          id: randomUUID(),
          ...data,
          dateOfBirth: data.dateOfBirth ?? null,
          gender: data.gender ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          emergencyContactName: data.emergencyContactName ?? null,
          emergencyContactPhone: data.emergencyContactPhone ?? null,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt ?? now,
          updatedAt: data.updatedAt ?? now,
        };
        state.patients.set(patient.id, patient);
        return { ...patient };
      },
      async findUnique({ where, select }) {
        const patient = where.id
          ? state.patients.get(where.id)
          : [...state.patients.values()].find((item) => item.userId === where.userId);
        if (!patient || !select) return patient ? { ...patient } : null;
        return Object.fromEntries(Object.keys(select).map((key) => [key, patient[key]]));
      },
      async findMany({ where, skip = 0, take = 50, orderBy }) {
        return ordered([...state.patients.values()].filter((patient) => matches(patient, where, state)), orderBy)
          .slice(skip, skip + take).map((patient) => ({ ...patient }));
      },
      async count({ where }) {
        return [...state.patients.values()].filter((patient) => matches(patient, where, state)).length;
      },
      async update({ where, data }) {
        const patient = state.patients.get(where.id);
        if (!patient) throw prismaError('P2025');
        if (data.userId && [...state.patients.values()].some((item) => item.id !== where.id && item.userId === data.userId)) throw prismaError('P2002');
        Object.assign(patient, data, { updatedAt: new Date() });
        return { ...patient };
      },
    },
    doctor: {
      async create({ data }) {
        if ([...state.doctors.values()].some((item) => item.doctorNumber === data.doctorNumber || (data.userId && item.userId === data.userId))) {
          throw prismaError('P2002');
        }
        const now = new Date();
        const doctor = {
          id: randomUUID(),
          ...data,
          phone: data.phone ?? null,
          email: data.email ?? null,
          availability: data.availability ?? 'AVAILABLE',
          isActive: data.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        };
        state.doctors.set(doctor.id, doctor);
        return { ...doctor };
      },
      async findUnique({ where }) {
        const doctor = where.id
          ? state.doctors.get(where.id)
          : [...state.doctors.values()].find((item) => item.userId === where.userId);
        return doctor ? { ...doctor } : null;
      },
      async findMany({ where, skip = 0, take = 50, orderBy }) {
        return ordered([...state.doctors.values()].filter((doctor) => matches(doctor, where, state)), orderBy)
          .slice(skip, skip + take).map((doctor) => ({ ...doctor }));
      },
      async count({ where }) {
        return [...state.doctors.values()].filter((doctor) => matches(doctor, where, state)).length;
      },
      async update({ where, data }) {
        const doctor = state.doctors.get(where.id);
        if (!doctor) throw prismaError('P2025');
        if (data.userId && [...state.doctors.values()].some((item) => item.id !== where.id && item.userId === data.userId)) throw prismaError('P2002');
        Object.assign(doctor, data, { updatedAt: new Date() });
        return { ...doctor };
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
        if ([...state.patientAccess.values()].some((item) => item.patientId === data.patientId && item.userId === data.userId)) throw prismaError('P2002');
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
      async deleteMany({ where }) {
        let count = 0;
        for (const [id, item] of state.revokedTokens) {
          if (item.expiresAt <= where.expiresAt.lte) {
            state.revokedTokens.delete(id);
            count += 1;
          }
        }
        return { count };
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
