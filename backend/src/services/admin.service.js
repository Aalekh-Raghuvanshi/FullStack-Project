const AppError = require('../utils/app-error');
const { writeAuditLog } = require('./audit.service');
const { toPublicUser } = require('./auth.service');

function createAdminService({ prismaClient }) {
  async function listUsers({ take, skip }) {
    const users = await prismaClient.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        patientProfile: { select: { id: true } },
      },
    });
    return users.map(toPublicUser);
  }

  async function updateUserRole({ actor, targetId, role }) {
    const current = await prismaClient.user.findUnique({ where: { id: targetId } });
    if (!current) throw new AppError(404, 'NOT_FOUND', 'The requested user was not found.');
    if (actor.id === targetId && role !== 'ADMIN') {
      throw new AppError(400, 'SELF_ROLE_CHANGE_NOT_ALLOWED', 'You cannot remove your own administrator role.');
    }

    const updated = await prismaClient.$transaction(async (transaction) => {
      const user = await transaction.user.update({ where: { id: targetId }, data: { role } });
      let patientProfile = null;
      if (role === 'PATIENT') {
        patientProfile = await transaction.patientProfile.findUnique({ where: { userId: targetId } });
        if (!patientProfile) {
          patientProfile = await transaction.patientProfile.create({ data: { userId: targetId } });
        }
      }
      await writeAuditLog(transaction, {
        actorId: actor.id,
        action: 'admin.user_role_changed',
        targetType: 'User',
        targetId,
        metadata: { fromRole: current.role, toRole: role },
      });
      return { ...user, patientProfile };
    });
    return toPublicUser(updated);
  }

  async function updateUserStatus({ actor, targetId, isActive }) {
    if (actor.id === targetId && !isActive) {
      throw new AppError(400, 'SELF_DEACTIVATION_NOT_ALLOWED', 'You cannot deactivate your own account.');
    }
    const updated = await prismaClient.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id: targetId },
        data: { isActive },
        include: { patientProfile: { select: { id: true } } },
      });
      await writeAuditLog(transaction, {
        actorId: actor.id,
        action: isActive ? 'admin.user_activated' : 'admin.user_deactivated',
        targetType: 'User',
        targetId,
        metadata: { isActive },
      });
      return user;
    });
    return toPublicUser(updated);
  }

  async function grantPatientAccess({ actor, patientId, userId }) {
    const [patient, user] = await Promise.all([
      prismaClient.patientProfile.findUnique({ where: { id: patientId }, select: { id: true } }),
      prismaClient.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } }),
    ]);
    if (!patient || !user) throw new AppError(404, 'NOT_FOUND', 'The requested patient or user was not found.');
    if (!user.isActive || !['DOCTOR', 'NURSE'].includes(user.role)) {
      throw new AppError(400, 'INVALID_PATIENT_ACCESS', 'Patient access can be granted only to an active doctor or nurse.');
    }

    try {
      return await prismaClient.$transaction(async (transaction) => {
        const grant = await transaction.patientAccess.create({
          data: { patientId, userId, grantedById: actor.id },
          select: { id: true, patientId: true, userId: true, createdAt: true },
        });
        await writeAuditLog(transaction, {
          actorId: actor.id,
          action: 'admin.patient_access_granted',
          targetType: 'PatientProfile',
          targetId: patientId,
          metadata: { userId },
        });
        return grant;
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new AppError(409, 'PATIENT_ACCESS_EXISTS', 'This user already has access to the patient.');
      }
      throw error;
    }
  }

  async function revokePatientAccess({ actor, accessId }) {
    const access = await prismaClient.patientAccess.findUnique({ where: { id: accessId } });
    if (!access) throw new AppError(404, 'NOT_FOUND', 'The requested access grant was not found.');
    await prismaClient.$transaction(async (transaction) => {
      await transaction.patientAccess.delete({ where: { id: accessId } });
      await writeAuditLog(transaction, {
        actorId: actor.id,
        action: 'admin.patient_access_revoked',
        targetType: 'PatientProfile',
        targetId: access.patientId,
        metadata: { userId: access.userId },
      });
    });
  }

  return { grantPatientAccess, listUsers, revokePatientAccess, updateUserRole, updateUserStatus };
}

module.exports = { createAdminService };
