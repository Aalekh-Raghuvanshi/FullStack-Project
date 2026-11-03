const AppError = require('../utils/app-error');
const PatientRepository = require('../repositories/patient.repository');
const { createRecordNumber } = require('../utils/record-number');
const { writeAuditLog } = require('./audit.service');

function toPatientDto(patient) {
  return {
    id: patient.id,
    patientNumber: patient.patientNumber,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    emergencyContactName: patient.emergencyContactName,
    emergencyContactPhone: patient.emergencyContactPhone,
    isActive: patient.isActive,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

function assertCanRead(actor, patient, accessGrant) {
  if (actor.role === 'ADMIN') return;
  if (!patient.isActive) throw new AppError(404, 'NOT_FOUND', 'The requested patient was not found.');
  if (actor.role === 'RECEPTIONIST') return;
  if (actor.role === 'PATIENT' && patient.userId === actor.id) return;
  if (['DOCTOR', 'NURSE'].includes(actor.role) && accessGrant) return;
  throw new AppError(404, 'NOT_FOUND', 'The requested patient was not found.');
}

function isEmailUniqueConflict(error) {
  const target = error?.meta?.target;
  const fields = Array.isArray(target) ? target : [target];
  return fields.some((field) => String(field).toLowerCase().includes('email'));
}

function createPatientManagementService({ prismaClient }) {
  const repository = new PatientRepository(prismaClient);

  async function list({ actor, query }) {
    if (query.isActive === false && actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only administrators can filter inactive patient records.');
    }
    const where = { isActive: query.isActive ?? true };
    if (actor.role === 'PATIENT') where.userId = actor.id;
    if (['DOCTOR', 'NURSE'].includes(actor.role)) {
      where.accessGrants = { some: { userId: actor.id } };
    }
    if (query.gender) where.gender = query.gender;
    if (query.search) {
      where.OR = [
        { patientNumber: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const skip = (query.page - 1) * query.limit;
    const [patients, total] = await Promise.all([
      repository.findPage({ where, skip, take: query.limit }),
      repository.count(where),
    ]);
    await writeAuditLog(prismaClient, {
      actorId: actor.id,
      action: 'patient.list_viewed',
      targetType: 'Patient',
      metadata: { resultCount: patients.length },
    });
    return {
      data: patients.map(toPatientDto),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async function getById({ actor, patientId }) {
    const patient = await repository.findById(patientId);
    if (!patient) throw new AppError(404, 'NOT_FOUND', 'The requested patient was not found.');

    let accessGrant = false;
    if (['DOCTOR', 'NURSE'].includes(actor.role)) {
      accessGrant = Boolean(await prismaClient.patientAccess.findUnique({
        where: { patientId_userId: { patientId, userId: actor.id } },
        select: { id: true },
      }));
    }
    assertCanRead(actor, patient, accessGrant);
    await writeAuditLog(prismaClient, {
      actorId: actor.id,
      action: 'patient.record_viewed',
      targetType: 'Patient',
      targetId: patient.id,
    });
    return toPatientDto(patient);
  }

  async function create({ actor, input }) {
    if (!['ADMIN', 'RECEPTIONIST'].includes(actor.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to create patient records.');
    }
    const userId = input.userId || null;
    let linkedUser = null;
    if (userId) {
      linkedUser = await prismaClient.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true, email: true },
      });
      if (!linkedUser || linkedUser.role !== 'PATIENT' || !linkedUser.isActive) {
        throw new AppError(400, 'INVALID_USER_LINK', 'Link only an active PATIENT account.');
      }
      if (await repository.findByUserId(userId)) {
        throw new AppError(409, 'PATIENT_ACCOUNT_ALREADY_LINKED', 'This account is already linked to a patient record.');
      }
    }

    const normalizedEmail = input.email?.toLowerCase() ?? linkedUser?.email ?? null;
    const data = {
      ...input,
      userId,
      ...(input.dateOfBirth ? { dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`) } : { dateOfBirth: null }),
      email: normalizedEmail,
    };
    data.patientNumber = createRecordNumber('PAT');

    try {
      const patient = await prismaClient.$transaction(async (transaction) => {
        if (userId) {
          await transaction.user.update({
            where: { id: userId },
            data: {
              email: normalizedEmail,
              name: [input.firstName, input.lastName].filter(Boolean).join(' '),
            },
          });
        }
        const created = await repository.create(data, transaction);
        await writeAuditLog(transaction, {
          actorId: actor.id,
          action: 'patient.record_created',
          targetType: 'Patient',
          targetId: created.id,
        });
        return created;
      });
      return toPatientDto(patient);
    } catch (error) {
      if (error?.code === 'P2002') {
        if (isEmailUniqueConflict(error)) {
          throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'That email address is already associated with an account.');
        }
        throw new AppError(409, 'PATIENT_IDENTIFIER_CONFLICT', 'The patient number or account link conflicts with an existing record.');
      }
      throw error;
    }
  }

  async function update({ actor, patientId, input }) {
    const current = await repository.findById(patientId);
    if (!current) throw new AppError(404, 'NOT_FOUND', 'The requested patient was not found.');

    if (actor.role === 'PATIENT') {
      assertCanRead(actor, current, false);
      const allowedFields = new Set(['phone', 'email', 'address', 'emergencyContactName', 'emergencyContactPhone']);
      if (Object.keys(input).some((key) => !allowedFields.has(key))) {
        throw new AppError(403, 'FORBIDDEN', 'Patients may update only their own contact information.');
      }
    } else if (!['ADMIN', 'RECEPTIONIST'].includes(actor.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to update patient demographics.');
    } else if (actor.role === 'RECEPTIONIST' && !current.isActive) {
      throw new AppError(404, 'NOT_FOUND', 'The requested patient was not found.');
    }
    if (Object.hasOwn(input, 'isActive') && actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only administrators can reactivate patient records.');
    }

    const data = { ...input };
    if (Object.hasOwn(data, 'dateOfBirth')) {
      data.dateOfBirth = data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00.000Z`) : null;
    }
    if (Object.hasOwn(data, 'email')) data.email = data.email?.toLowerCase() ?? null;
    if (current.userId && data.email === null) {
      throw new AppError(400, 'INVALID_EMAIL', 'A linked patient account must retain an email address.');
    }

    try {
      const updated = await prismaClient.$transaction(async (transaction) => {
        const userData = {};
        if (Object.hasOwn(data, 'email')) userData.email = data.email;
        if (Object.hasOwn(data, 'firstName') || Object.hasOwn(data, 'lastName')) {
          userData.name = [data.firstName ?? current.firstName, data.lastName ?? current.lastName].filter(Boolean).join(' ');
        }
        if (current.userId && Object.keys(userData).length) {
          await transaction.user.update({ where: { id: current.userId }, data: userData });
        }
        const patient = await repository.update(patientId, data, transaction);
        await writeAuditLog(transaction, {
          actorId: actor.id,
          action: Object.hasOwn(data, 'isActive')
            ? (data.isActive ? 'patient.record_reactivated' : 'patient.record_deactivated')
            : 'patient.record_updated',
          targetType: 'Patient',
          targetId: patient.id,
        });
        return patient;
      });
      return toPatientDto(updated);
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'That email address is already associated with an account.');
      }
      throw error;
    }
  }

  async function deactivate({ actor, patientId }) {
    if (!['ADMIN', 'RECEPTIONIST'].includes(actor.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to deactivate patient records.');
    }
    const current = await repository.findById(patientId);
    if (!current || (actor.role === 'RECEPTIONIST' && !current.isActive)) {
      throw new AppError(404, 'NOT_FOUND', 'The requested patient was not found.');
    }
    const patient = await prismaClient.$transaction(async (transaction) => {
      const updated = await repository.update(patientId, { isActive: false }, transaction);
      await writeAuditLog(transaction, {
        actorId: actor.id,
        action: 'patient.record_deactivated',
        targetType: 'Patient',
        targetId: patientId,
      });
      return updated;
    });
    return toPatientDto(patient);
  }

  return { create, deactivate, getById, list, update };
}

module.exports = { createPatientManagementService, toPatientDto };
