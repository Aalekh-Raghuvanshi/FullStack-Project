const express = require('express');
const { createAuthMiddleware, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createDoctorController } = require('../controllers/doctor.controller');
const { createDoctorService } = require('../services/doctor.service');
const { doctorCreateSchema, doctorListQuerySchema, doctorParamsSchema, doctorUpdateSchema } = require('../validators/doctor.validator');

function createDoctorRouter({ prismaClient, jwtSecret } = {}) {
  const router = express.Router();
  const service = createDoctorService({ prismaClient });
  const controller = createDoctorController({ doctorService: service });
  const { authenticateToken, requireActiveUser } = createAuthMiddleware({ prismaClient, jwtSecret });
  const readers = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'];

  router.use(authenticateToken, requireActiveUser);
  router.get('/', requireRole(...readers), validate(doctorListQuerySchema, 'query'), controller.list);
  router.post('/', requireRole('ADMIN'), validate(doctorCreateSchema), controller.create);
  router.get('/:doctorId', requireRole(...readers), validate(doctorParamsSchema, 'params'), controller.getById);
  router.patch('/:doctorId', requireRole('ADMIN'), validate(doctorParamsSchema, 'params'), validate(doctorUpdateSchema), controller.update);
  router.delete('/:doctorId', requireRole('ADMIN'), validate(doctorParamsSchema, 'params'), controller.deactivate);

  return router;
}

module.exports = createDoctorRouter;
