class PatientRepository {
  constructor(prismaClient) {
    this.prismaClient = prismaClient;
  }

  findById(id, database = this.prismaClient) {
    return database.patient.findUnique({ where: { id } });
  }

  findByUserId(userId, database = this.prismaClient) {
    return database.patient.findUnique({ where: { userId } });
  }

  findPage({ where, skip, take }, database = this.prismaClient) {
    return database.patient.findMany({
      where,
      skip,
      take,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  count(where, database = this.prismaClient) {
    return database.patient.count({ where });
  }

  create(data, database = this.prismaClient) {
    return database.patient.create({ data });
  }

  update(id, data, database = this.prismaClient) {
    return database.patient.update({ where: { id }, data });
  }
}

module.exports = PatientRepository;
