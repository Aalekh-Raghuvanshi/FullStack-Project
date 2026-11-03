const express = require('express');
const { createAuthMiddleware, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createAppointmentController } = require('../controllers/appointment.controller');
const { createAppointmentService } = require('../services/appointment.service');
const {
  appointmentCreateSchema,
  appointmentListQuerySchema,
  appointmentParamsSchema,
  appointmentRescheduleSchema,
  appointmentUpdateSchema,
} = require('../validators/appointment.validator');

function createAppointmentRouter({ prismaClient, jwtSecret, eventPublisher } = {}) {
  const router = express.Router();
  const service = createAppointmentService({ prismaClient, eventPublisher });
  const controller = createAppointmentController({ appointmentService: service });
  const { authenticateToken, requireActiveUser } = createAuthMiddleware({ prismaClient, jwtSecret });
  const readers = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'];

  router.use(authenticateToken, requireActiveUser);
  router.get('/', requireRole(...readers), validate(appointmentListQuerySchema, 'query'), controller.list);
  router.post('/', requireRole('ADMIN', 'RECEPTIONIST', 'PATIENT'), validate(appointmentCreateSchema), controller.create);
  router.get('/:appointmentId', requireRole(...readers), validate(appointmentParamsSchema, 'params'), controller.getById);
  router.patch(
    '/:appointmentId',
    requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR'),
    validate(appointmentParamsSchema, 'params'),
    validate(appointmentUpdateSchema),
    controller.update,
  );
  router.post(
    '/:appointmentId/cancel',
    requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT'),
    validate(appointmentParamsSchema, 'params'),
    controller.cancel,
  );
  router.post(
    '/:appointmentId/reschedule',
    requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT'),
    validate(appointmentParamsSchema, 'params'),
    validate(appointmentRescheduleSchema),
    controller.reschedule,
  );

  return router;
}

module.exports = createAppointmentRouter;
