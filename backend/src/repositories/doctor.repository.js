class DoctorRepository {
  constructor(prismaClient) {
    this.prismaClient = prismaClient;
  }

  findById(id, database = this.prismaClient) {
    return database.doctor.findUnique({ where: { id } });
  }

  findByUserId(userId, database = this.prismaClient) {
    return database.doctor.findUnique({ where: { userId } });
  }

  findPage({ where, skip, take }, database = this.prismaClient) {
    return database.doctor.findMany({
      where,
      skip,
      take,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  count(where, database = this.prismaClient) {
    return database.doctor.count({ where });
  }

  create(data, database = this.prismaClient) {
    return database.doctor.create({ data });
  }

  update(id, data, database = this.prismaClient) {
    return database.doctor.update({ where: { id }, data });
  }
}

module.exports = DoctorRepository;
