const express = require('express');
const { createAuthMiddleware, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPatientController } = require('../controllers/patient.controller');
const { createPatientManagementService } = require('../services/patient-management.service');
const {
  patientCreateSchema,
  patientListQuerySchema,
  patientParamsSchema,
  patientSelfUpdateSchema,
  patientStaffUpdateSchema,
} = require('../validators/patient-management.validator');

function createPatientRouter({ prismaClient, jwtSecret } = {}) {
  const router = express.Router();
  const service = createPatientManagementService({ prismaClient });
  const controller = createPatientController({ patientService: service });
  const { authenticateToken, requireActiveUser } = createAuthMiddleware({ prismaClient, jwtSecret });
  const readers = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'];

  router.use(authenticateToken, requireActiveUser);
  router.get('/', requireRole(...readers), validate(patientListQuerySchema, 'query'), controller.list);
  router.post('/', requireRole('ADMIN', 'RECEPTIONIST'), validate(patientCreateSchema), controller.create);
  router.get('/:patientId', requireRole(...readers), validate(patientParamsSchema, 'params'), controller.getById);
  router.patch(
    '/:patientId',
    requireRole('ADMIN', 'RECEPTIONIST', 'PATIENT'),
    validate(patientParamsSchema, 'params'),
    (req, res, next) => validate(req.user.role === 'PATIENT' ? patientSelfUpdateSchema : patientStaffUpdateSchema)(req, res, next),
    controller.update,
  );
  router.delete('/:patientId', requireRole('ADMIN', 'RECEPTIONIST'), validate(patientParamsSchema, 'params'), controller.deactivate);

  return router;
}

module.exports = createPatientRouter;
