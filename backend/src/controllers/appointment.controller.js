function createAppointmentController({ appointmentService }) {
  return {
    async cancel(req, res) {
      const data = await appointmentService.cancel({ actor: req.user, appointmentId: req.params.appointmentId });
      return res.status(200).json({ data });
    },
    async create(req, res) {
      const data = await appointmentService.create({ actor: req.user, input: req.body });
      return res.status(201).json({ data });
    },
    async getById(req, res) {
      const data = await appointmentService.getById({ actor: req.user, appointmentId: req.params.appointmentId });
      return res.status(200).json({ data });
    },
    async list(req, res) {
      const result = await appointmentService.list({ actor: req.user, query: req.validated.query });
      return res.status(200).json({ data: result.data, pagination: result.pagination });
    },
    async reschedule(req, res) {
      const data = await appointmentService.reschedule({
        actor: req.user,
        appointmentId: req.params.appointmentId,
        input: req.body,
      });
      return res.status(200).json({ data });
    },
    async update(req, res) {
      const data = await appointmentService.transition({
        actor: req.user,
        appointmentId: req.params.appointmentId,
        status: req.body.status,
      });
      return res.status(200).json({ data });
    },
  };
}

module.exports = { createAppointmentController };
