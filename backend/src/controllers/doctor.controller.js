function createDoctorController({ doctorService }) {
  return {
    async create(req, res) {
      const data = await doctorService.create({ actor: req.user, input: req.body });
      return res.status(201).json({ data });
    },
    async deactivate(req, res) {
      const data = await doctorService.deactivate({ actor: req.user, doctorId: req.params.doctorId });
      return res.status(200).json({ data });
    },
    async getById(req, res) {
      const data = await doctorService.getById({ actor: req.user, doctorId: req.params.doctorId });
      return res.status(200).json({ data });
    },
    async list(req, res) {
      const result = await doctorService.list({ actor: req.user, query: req.validated.query });
      return res.status(200).json({ data: result.data, pagination: result.pagination });
    },
    async update(req, res) {
      const data = await doctorService.update({ actor: req.user, doctorId: req.params.doctorId, input: req.body });
      return res.status(200).json({ data });
    },
  };
}

module.exports = { createDoctorController };
