class AppointmentRepository {
  constructor(prismaClient) {
    this.prismaClient = prismaClient;
  }

  findById(id, database = this.prismaClient) {
    return database.appointment.findUnique({ where: { id } });
  }

  findPatient(id, database = this.prismaClient) {
    return database.patient.findUnique({ where: { id } });
  }

  findDoctor(id, database = this.prismaClient) {
    return database.doctor.findUnique({ where: { id } });
  }

  findConflicts({ patientId, doctorId, scheduledStart, scheduledEnd, excludeId }, database = this.prismaClient) {
    return database.appointment.findFirst({
      where: {
        status: { not: 'CANCELLED' },
        scheduledStart: { lt: scheduledEnd },
        scheduledEnd: { gt: scheduledStart },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [{ doctorId }, { patientId }],
      },
      select: { id: true, doctorId: true, patientId: true },
    });
  }

  findPage({ where, skip, take }, database = this.prismaClient) {
    return database.appointment.findMany({
      where,
      skip,
      take,
      orderBy: [{ scheduledStart: 'asc' }, { id: 'asc' }],
    });
  }

  count(where, database = this.prismaClient) {
    return database.appointment.count({ where });
  }

  create(data, database = this.prismaClient) {
    return database.appointment.create({ data });
  }

  updateMany(where, data, database = this.prismaClient) {
    return database.appointment.updateMany({ where, data });
  }
}

module.exports = AppointmentRepository;
