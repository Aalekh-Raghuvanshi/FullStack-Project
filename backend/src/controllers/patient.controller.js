function createPatientController({ patientService }) {
  return {
    async create(req, res) {
      const data = await patientService.create({ actor: req.user, input: req.body });
      return res.status(201).json({ data });
    },
    async deactivate(req, res) {
      const data = await patientService.deactivate({ actor: req.user, patientId: req.params.patientId });
      return res.status(200).json({ data });
    },
    async getById(req, res) {
      const data = await patientService.getById({ actor: req.user, patientId: req.params.patientId });
      return res.status(200).json({ data });
    },
    async list(req, res) {
      const result = await patientService.list({ actor: req.user, query: req.validated.query });
      return res.status(200).json({ data: result.data, pagination: result.pagination });
    },
    async update(req, res) {
      const data = await patientService.update({ actor: req.user, patientId: req.params.patientId, input: req.body });
      return res.status(200).json({ data });
    },
  };
}

module.exports = { createPatientController };
