const AppError = require('../utils/app-error');
const AppointmentRepository = require('../repositories/appointment.repository');
const { writeAuditLog } = require('./audit.service');
const { appointmentEventPublisher } = require('../events/appointment-event-publisher');

const RESCHEDULABLE_STATUSES = ['SCHEDULED', 'CONFIRMED'];
const CANCELLABLE_STATUSES = ['SCHEDULED', 'CONFIRMED'];
const TRANSITIONS = {
  SCHEDULED: ['CONFIRMED', 'NO_SHOW'],
  CONFIRMED: ['CHECKED_IN', 'NO_SHOW'],
  CHECKED_IN: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

function toAppointmentDto(appointment) {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    scheduledStart: appointment.scheduledStart.toISOString(),
    scheduledEnd: appointment.scheduledEnd.toISOString(),
    status: appointment.status,
    visitCategory: appointment.visitCategory,
    createdBy: appointment.createdBy,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

function appointmentEvent(type, appointment, actorId) {
  return {
    type,
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    actorId,
    occurredAt: new Date().toISOString(),
  };
}

function isScheduleConflict(error) {
  if (error?.code === 'P2004') return true;
  const databaseError = String(error?.meta?.database_error || error?.message || '');
  return databaseError.includes('23P01')
    || databaseError.includes('Appointment_doctor_schedule_excl')
    || databaseError.includes('Appointment_patient_schedule_excl');
}

function createAppointmentService({ prismaClient, eventPublisher = appointmentEventPublisher } = {}) {
  const repository = new AppointmentRepository(prismaClient);

  function listScope(actor) {
    if (['ADMIN', 'RECEPTIONIST'].includes(actor.role)) return null;
    if (actor.role === 'PATIENT') return { patient: { userId: actor.id, isActive: true } };
    if (actor.role === 'DOCTOR') return { doctor: { userId: actor.id, isActive: true } };
    if (actor.role === 'NURSE') return { patient: { accessGrants: { some: { userId: actor.id } } } };
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view appointments.');
  }

  function listWhere(actor, query) {
    const conditions = [];
    const scope = listScope(actor);
    if (scope) conditions.push(scope);
    if (query.status) conditions.push({ status: query.status });
    if (query.patientId) conditions.push({ patientId: query.patientId });
    if (query.doctorId) conditions.push({ doctorId: query.doctorId });
    const scheduledStart = {};
    if (query.from) scheduledStart.gte = query.from;
    if (query.to) scheduledStart.lt = query.to;
    if (Object.keys(scheduledStart).length) conditions.push({ scheduledStart });
    return conditions.length ? { AND: conditions } : {};
  }

  async function assertCanRead(actor, appointment) {
    if (['ADMIN', 'RECEPTIONIST'].includes(actor.role)) return;
    if (actor.role === 'PATIENT') {
      const patient = await repository.findPatient(appointment.patientId);
      if (patient?.userId === actor.id && patient.isActive) return;
    } else if (actor.role === 'DOCTOR') {
      const doctor = await repository.findDoctor(appointment.doctorId);
      if (doctor?.userId === actor.id && doctor.isActive) return;
    } else if (actor.role === 'NURSE') {
      const grant = await prismaClient.patientAccess.findUnique({
        where: { patientId_userId: { patientId: appointment.patientId, userId: actor.id } },
        select: { id: true },
      });
      if (grant) return;
    }
    throw new AppError(404, 'NOT_FOUND', 'The requested appointment was not found.');
  }

  async function assertCanWrite(actor, appointment, { allowPatient = false } = {}) {
    if (['ADMIN', 'RECEPTIONIST'].includes(actor.role)) return;
    if (actor.role === 'DOCTOR') {
      const doctor = await repository.findDoctor(appointment.doctorId);
      if (doctor?.userId === actor.id && doctor.isActive) return;
    } else if (allowPatient && actor.role === 'PATIENT') {
      const patient = await repository.findPatient(appointment.patientId);
      if (patient?.userId === actor.id && patient.isActive) return;
    }
    throw new AppError(404, 'NOT_FOUND', 'The requested appointment was not found.');
  }

  async function list({ actor, query }) {
    const where = listWhere(actor, query);
    const skip = (query.page - 1) * query.limit;
    const [appointments, total] = await Promise.all([
      repository.findPage({ where, skip, take: query.limit }),
      repository.count(where),
    ]);
    await writeAuditLog(prismaClient, {
      actorId: actor.id,
      action: 'appointment.list_viewed',
      targetType: 'Appointment',
      metadata: { resultCount: appointments.length },
    });
    return {
      data: appointments.map(toAppointmentDto),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async function getById({ actor, appointmentId }) {
    const appointment = await repository.findById(appointmentId);
    if (!appointment) throw new AppError(404, 'NOT_FOUND', 'The requested appointment was not found.');
    await assertCanRead(actor, appointment);
    await writeAuditLog(prismaClient, {
      actorId: actor.id,
      action: 'appointment.viewed',
      targetType: 'Appointment',
      targetId: appointment.id,
    });
    return toAppointmentDto(appointment);
  }

  async function create({ actor, input }) {
    if (!['ADMIN', 'RECEPTIONIST', 'PATIENT'].includes(actor.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to schedule appointments.');
    }
    if (input.scheduledEnd <= input.scheduledStart) {
      throw new AppError(400, 'INVALID_TIME_RANGE', 'Appointment end time must be after its start time.');
    }
    if (input.scheduledStart <= new Date()) {
      throw new AppError(400, 'APPOINTMENT_START_IN_PAST', 'Appointments must be scheduled for a future time.');
    }

    let created;
    try {
      created = await prismaClient.$transaction(async (transaction) => {
        const [patient, doctor] = await Promise.all([
          repository.findPatient(input.patientId, transaction),
          repository.findDoctor(input.doctorId, transaction),
        ]);
        if (!patient?.isActive) throw new AppError(400, 'PATIENT_NOT_ACTIVE', 'The patient does not exist or is inactive.');
        if (!doctor?.isActive) throw new AppError(400, 'DOCTOR_NOT_ACTIVE', 'The doctor does not exist or is inactive.');
        if (actor.role === 'PATIENT' && patient.userId !== actor.id) {
          throw new AppError(404, 'NOT_FOUND', 'The requested patient was not found.');
        }

        const conflict = await repository.findConflicts({
          patientId: input.patientId,
          doctorId: input.doctorId,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
        }, transaction);
        if (conflict) throw new AppError(409, 'APPOINTMENT_CONFLICT', 'The patient or doctor already has an appointment during this time.');

        const appointment = await repository.create({
          patientId: input.patientId,
          doctorId: input.doctorId,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          visitCategory: input.visitCategory,
          createdBy: actor.id,
          status: 'SCHEDULED',
        }, transaction);
        await writeAuditLog(transaction, {
          actorId: actor.id,
          action: 'appointment.created',
          targetType: 'Appointment',
          targetId: appointment.id,
        });
        return appointment;
      });
    } catch (error) {
      if (isScheduleConflict(error)) {
        throw new AppError(409, 'APPOINTMENT_CONFLICT', 'The patient or doctor already has an appointment during this time.');
      }
      throw error;
    }
    await eventPublisher.publish(appointmentEvent('appointment.created', created, actor.id));
    return toAppointmentDto(created);
  }

  async function cancel({ actor, appointmentId }) {
    const existing = await repository.findById(appointmentId);
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'The requested appointment was not found.');
    await assertCanWrite(actor, existing, { allowPatient: true });

    const now = new Date();
    if (!CANCELLABLE_STATUSES.includes(existing.status)) {
      throw new AppError(409, 'INVALID_APPOINTMENT_STATE', 'Only scheduled or confirmed appointments can be cancelled.');
    }
    if (existing.scheduledStart <= now) {
      throw new AppError(409, 'CANCELLATION_CUTOFF_PASSED', 'An appointment cannot be cancelled after its scheduled start time.');
    }

    const result = await prismaClient.$transaction(async (transaction) => {
      const updatedCount = await repository.updateMany({
        id: appointmentId,
        status: { in: CANCELLABLE_STATUSES },
        scheduledStart: { gt: now },
      }, { status: 'CANCELLED', updatedAt: now }, transaction);
      if (updatedCount.count !== 1) {
        throw new AppError(409, 'INVALID_APPOINTMENT_STATE', 'The appointment changed and can no longer be cancelled.');
      }
      const appointment = await repository.findById(appointmentId, transaction);
      await writeAuditLog(transaction, {
        actorId: actor.id,
        action: 'appointment.cancelled',
        targetType: 'Appointment',
        targetId: appointmentId,
      });
      return appointment;
    });
    await eventPublisher.publish(appointmentEvent('appointment.cancelled', result, actor.id));
    return toAppointmentDto(result);
  }

  async function reschedule({ actor, appointmentId, input }) {
    const existing = await repository.findById(appointmentId);
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'The requested appointment was not found.');
    await assertCanWrite(actor, existing, { allowPatient: true });
    if (!RESCHEDULABLE_STATUSES.includes(existing.status)) {
      throw new AppError(409, 'INVALID_APPOINTMENT_STATE', 'Only scheduled or confirmed appointments can be rescheduled.');
    }
    if (existing.scheduledStart <= new Date()) {
      throw new AppError(409, 'RESCHEDULE_CUTOFF_PASSED', 'An appointment cannot be rescheduled after its scheduled start time.');
    }
    if (input.scheduledStart <= new Date()) {
      throw new AppError(400, 'APPOINTMENT_START_IN_PAST', 'Appointments must be rescheduled for a future time.');
    }
    if (input.scheduledEnd <= input.scheduledStart) {
      throw new AppError(400, 'INVALID_TIME_RANGE', 'Appointment end time must be after its start time.');
    }

    let appointment;
    try {
      appointment = await prismaClient.$transaction(async (transaction) => {
        const current = await repository.findById(appointmentId, transaction);
        if (!current || !RESCHEDULABLE_STATUSES.includes(current.status) || current.scheduledStart <= new Date()) {
          throw new AppError(409, 'INVALID_APPOINTMENT_STATE', 'The appointment changed and can no longer be rescheduled.');
        }
        const conflict = await repository.findConflicts({
          patientId: current.patientId,
          doctorId: current.doctorId,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          excludeId: appointmentId,
        }, transaction);
        if (conflict) throw new AppError(409, 'APPOINTMENT_CONFLICT', 'The patient or doctor already has an appointment during this time.');

        const updatedCount = await repository.updateMany({
          id: appointmentId,
          status: { in: RESCHEDULABLE_STATUSES },
          scheduledStart: { equals: current.scheduledStart, gt: new Date() },
          scheduledEnd: current.scheduledEnd,
        }, {
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          updatedAt: new Date(),
        }, transaction);
        if (updatedCount.count !== 1) {
          throw new AppError(409, 'INVALID_APPOINTMENT_STATE', 'The appointment changed and can no longer be rescheduled.');
        }
        const updated = await repository.findById(appointmentId, transaction);
        await writeAuditLog(transaction, {
          actorId: actor.id,
          action: 'appointment.rescheduled',
          targetType: 'Appointment',
          targetId: appointmentId,
        });
        return updated;
      });
    } catch (error) {
      if (isScheduleConflict(error)) {
        throw new AppError(409, 'APPOINTMENT_CONFLICT', 'The patient or doctor already has an appointment during this time.');
      }
      throw error;
    }
    await eventPublisher.publish(appointmentEvent('appointment.rescheduled', appointment, actor.id));
    return toAppointmentDto(appointment);
  }

  async function transition({ actor, appointmentId, status }) {
    if (!['ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(actor.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to change appointment status.');
    }
    const existing = await repository.findById(appointmentId);
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'The requested appointment was not found.');
    await assertCanWrite(actor, existing);

    const appointment = await prismaClient.$transaction(async (transaction) => {
      const current = await repository.findById(appointmentId, transaction);
      if (!current) throw new AppError(404, 'NOT_FOUND', 'The requested appointment was not found.');
      if (!TRANSITIONS[current.status]?.includes(status)) {
        throw new AppError(409, 'INVALID_APPOINTMENT_TRANSITION', `An appointment in ${current.status} cannot transition to ${status}.`);
      }
      const now = new Date();
      if (status === 'CONFIRMED' && current.scheduledStart <= now) {
        throw new AppError(409, 'APPOINTMENT_START_PASSED', 'A past appointment cannot be confirmed.');
      }
      if (status === 'NO_SHOW' && current.scheduledStart > now) {
        throw new AppError(409, 'APPOINTMENT_NOT_DUE', 'An appointment cannot be marked no-show before its scheduled start.');
      }
      const updateResult = await repository.updateMany({ id: appointmentId, status: current.status }, {
        status,
        updatedAt: now,
      }, transaction);
      if (updateResult.count !== 1) {
        throw new AppError(409, 'INVALID_APPOINTMENT_TRANSITION', 'The appointment changed before the status update completed.');
      }
      const updated = await repository.findById(appointmentId, transaction);
      await writeAuditLog(transaction, {
        actorId: actor.id,
        action: `appointment.${status.toLowerCase()}`,
        targetType: 'Appointment',
        targetId: appointmentId,
        metadata: { fromStatus: current.status, toStatus: status },
      });
      return updated;
    });

    const eventType = status === 'CONFIRMED'
      ? 'appointment.confirmed'
      : status === 'COMPLETED'
        ? 'appointment.completed'
        : null;
    if (eventType) await eventPublisher.publish(appointmentEvent(eventType, appointment, actor.id));
    return toAppointmentDto(appointment);
  }

  return { cancel, create, getById, list, reschedule, transition };
}

module.exports = { createAppointmentService, toAppointmentDto };
