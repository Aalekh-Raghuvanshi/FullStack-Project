const AppError = require('../utils/app-error');
const { writeAuditLog } = require('./audit.service');

function createPatientService({ prismaClient }) {
  async function getProfile({ actor, patientId }) {
    const profile = await prismaClient.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!profile) throw new AppError(404, 'NOT_FOUND', 'The requested patient was not found.');

    let authorized = actor.role === 'ADMIN' || actor.role === 'RECEPTIONIST';
    if (actor.role === 'PATIENT') authorized = profile.userId === actor.id;
    if (actor.role === 'DOCTOR' || actor.role === 'NURSE') {
      const grant = await prismaClient.patientAccess.findUnique({
        where: { patientId_userId: { patientId, userId: actor.id } },
        select: { id: true },
      });
      authorized = Boolean(grant);
    }

    // Hide whether another patient's profile exists from users without access.
    if (!authorized) throw new AppError(404, 'NOT_FOUND', 'The requested patient was not found.');

    await writeAuditLog(prismaClient, {
      actorId: actor.id,
      action: 'patient.profile_viewed',
      targetType: 'PatientProfile',
      targetId: profile.id,
    });

    return {
      id: profile.id,
      createdAt: profile.createdAt,
      patient: profile.user,
    };
  }

  return { getProfile };
}

module.exports = { createPatientService };
