const express = require('express');
const { createAuthMiddleware, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPatientService } = require('../services/patient.service');
const { patientParamsSchema } = require('../validators/patient.validator');

function createPatientRouter({ prismaClient, jwtSecret } = {}) {
  const router = express.Router();
  const service = createPatientService({ prismaClient });
  const { authenticateToken, requireActiveUser } = createAuthMiddleware({ prismaClient, jwtSecret });
  const allowedRoles = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'];

  router.use(authenticateToken, requireActiveUser, requireRole(...allowedRoles));
  router.get('/:patientId', validate(patientParamsSchema, 'params'), async (req, res) => {
    const data = await service.getProfile({ actor: req.user, patientId: req.params.patientId });
    return res.status(200).json({ data });
  });

  return router;
}

module.exports = createPatientRouter;
