const AppError = require('../utils/app-error');
const DoctorRepository = require('../repositories/doctor.repository');
const { createRecordNumber } = require('../utils/record-number');
const { writeAuditLog } = require('./audit.service');

function toDoctorDto(doctor) {
  return {
    id: doctor.id,
    doctorNumber: doctor.doctorNumber,
    firstName: doctor.firstName,
    lastName: doctor.lastName,
    specialization: doctor.specialization,
    department: doctor.department,
    phone: doctor.phone,
    email: doctor.email,
    availability: doctor.availability,
    isActive: doctor.isActive,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
  };
}

function uniqueConflict(error) {
  const target = error?.meta?.target;
  const fields = Array.isArray(target) ? target : [target];
  if (fields.some((field) => String(field).toLowerCase().includes('email'))) {
    return new AppError(409, 'EMAIL_ALREADY_IN_USE', 'That email address is already associated with an account.');
  }
  return new AppError(409, 'DOCTOR_IDENTIFIER_CONFLICT', 'The doctor number or account link conflicts with an existing record.');
}

function createDoctorService({ prismaClient }) {
  const repository = new DoctorRepository(prismaClient);

  async function list({ actor, query }) {
    if (query.isActive === false && actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only administrators can filter inactive doctor records.');
    }
    const where = { isActive: query.isActive ?? true };
    if (query.availability) where.availability = query.availability;
    if (query.department) where.department = { equals: query.department, mode: 'insensitive' };
    if (query.specialization) where.specialization = { equals: query.specialization, mode: 'insensitive' };
    if (query.search) {
      where.OR = [
        { doctorNumber: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { specialization: { contains: query.search, mode: 'insensitive' } },
        { department: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const skip = (query.page - 1) * query.limit;
    const [doctors, total] = await Promise.all([
      repository.findPage({ where, skip, take: query.limit }),
      repository.count(where),
    ]);
    await writeAuditLog(prismaClient, {
      actorId: actor.id,
      action: 'doctor.list_viewed',
      targetType: 'Doctor',
      metadata: { resultCount: doctors.length },
    });
    return {
      data: doctors.map(toDoctorDto),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async function getById({ actor, doctorId }) {
    const doctor = await repository.findById(doctorId);
    if (!doctor || (!doctor.isActive && actor.role !== 'ADMIN')) {
      throw new AppError(404, 'NOT_FOUND', 'The requested doctor was not found.');
    }
    await writeAuditLog(prismaClient, {
      actorId: actor.id,
      action: 'doctor.record_viewed',
      targetType: 'Doctor',
      targetId: doctor.id,
    });
    return toDoctorDto(doctor);
  }

  async function validateDoctorAccount(userId) {
    if (!userId) return null;
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true, email: true },
    });
    if (!user || user.role !== 'DOCTOR' || !user.isActive) {
      throw new AppError(400, 'INVALID_USER_LINK', 'Link only an active DOCTOR account.');
    }
    if (await repository.findByUserId(userId)) {
      throw new AppError(409, 'DOCTOR_ACCOUNT_ALREADY_LINKED', 'This account is already linked to a doctor record.');
    }
    return user;
  }

  async function create({ actor, input }) {
    if (actor.role !== 'ADMIN') throw new AppError(403, 'FORBIDDEN', 'Only administrators can create doctor records.');
    const userId = input.userId || null;
    const linkedUser = await validateDoctorAccount(userId);
    const data = {
      ...input,
      userId,
      doctorNumber: createRecordNumber('DOC'),
      email: input.email?.toLowerCase() ?? linkedUser?.email ?? null,
    };

    try {
      const doctor = await prismaClient.$transaction(async (transaction) => {
        if (userId) {
          await transaction.user.update({
            where: { id: userId },
            data: { name: `${input.firstName} ${input.lastName}`, email: data.email },
          });
        }
        const created = await repository.create(data, transaction);
        await writeAuditLog(transaction, {
          actorId: actor.id,
          action: 'doctor.record_created',
          targetType: 'Doctor',
          targetId: created.id,
        });
        return created;
      });
      return toDoctorDto(doctor);
    } catch (error) {
      if (error?.code === 'P2002') {
        throw uniqueConflict(error);
      }
      throw error;
    }
  }

  async function update({ actor, doctorId, input }) {
    if (actor.role !== 'ADMIN') throw new AppError(403, 'FORBIDDEN', 'Only administrators can update doctor records.');
    const current = await repository.findById(doctorId);
    if (!current) throw new AppError(404, 'NOT_FOUND', 'The requested doctor was not found.');
    const data = { ...input };
    if (Object.hasOwn(data, 'email')) data.email = data.email?.toLowerCase() ?? null;
    const userLinkChanged = Object.hasOwn(data, 'userId') && data.userId !== current.userId;
    const linkedUser = userLinkChanged ? await validateDoctorAccount(data.userId) : null;
    const linkedUserId = Object.hasOwn(data, 'userId') ? data.userId : current.userId;
    if (linkedUserId && Object.hasOwn(data, 'email') && data.email === null) {
      throw new AppError(400, 'INVALID_EMAIL', 'A linked doctor account must retain an email address.');
    }
    if (linkedUserId && userLinkChanged && !Object.hasOwn(data, 'email')) {
      data.email = linkedUser.email;
    }

    try {
      const doctor = await prismaClient.$transaction(async (transaction) => {
        if (linkedUserId && (
          userLinkChanged
          || Object.hasOwn(data, 'firstName')
          || Object.hasOwn(data, 'lastName')
          || Object.hasOwn(data, 'email')
        )) {
          const userData = {};
          if (userLinkChanged || Object.hasOwn(data, 'firstName') || Object.hasOwn(data, 'lastName')) {
            userData.name = `${data.firstName ?? current.firstName} ${data.lastName ?? current.lastName}`;
          }
          if (Object.hasOwn(data, 'email')) userData.email = data.email;
          await transaction.user.update({ where: { id: linkedUserId }, data: userData });
        }
        const updated = await repository.update(doctorId, data, transaction);
        await writeAuditLog(transaction, {
          actorId: actor.id,
          action: Object.hasOwn(data, 'isActive')
            ? (data.isActive ? 'doctor.record_reactivated' : 'doctor.record_deactivated')
            : 'doctor.record_updated',
          targetType: 'Doctor',
          targetId: doctorId,
        });
        return updated;
      });
      return toDoctorDto(doctor);
    } catch (error) {
      if (error?.code === 'P2002') {
        throw uniqueConflict(error);
      }
      throw error;
    }
  }

  async function deactivate({ actor, doctorId }) {
    if (actor.role !== 'ADMIN') throw new AppError(403, 'FORBIDDEN', 'Only administrators can deactivate doctor records.');
    const current = await repository.findById(doctorId);
    if (!current) throw new AppError(404, 'NOT_FOUND', 'The requested doctor was not found.');
    const doctor = await prismaClient.$transaction(async (transaction) => {
      const updated = await repository.update(doctorId, { isActive: false, availability: 'OFF_DUTY' }, transaction);
      await writeAuditLog(transaction, {
        actorId: actor.id,
        action: 'doctor.record_deactivated',
        targetType: 'Doctor',
        targetId: doctorId,
      });
      return updated;
    });
    return toDoctorDto(doctor);
  }

  return { create, deactivate, getById, list, update };
}

module.exports = { createDoctorService, toDoctorDto };
