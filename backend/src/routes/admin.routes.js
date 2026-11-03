const express = require('express');
const { createAuthMiddleware, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createAdminService } = require('../services/admin.service');
const {
  listUsersQuerySchema,
  patientAccessSchema,
  userRoleSchema,
  userStatusSchema,
  uuidParamsSchema,
} = require('../validators/admin.validator');

function createAdminRouter({ prismaClient, jwtSecret } = {}) {
  const router = express.Router();
  const service = createAdminService({ prismaClient });
  const { authenticateToken, requireActiveUser } = createAuthMiddleware({ prismaClient, jwtSecret });

  router.use(authenticateToken, requireActiveUser, requireRole('ADMIN'));

  router.get('/users', validate(listUsersQuerySchema, 'query'), async (req, res) => {
    const data = await service.listUsers(req.validated.query);
    return res.status(200).json({ data });
  });

  router.patch('/users/:userId/role', validate(uuidParamsSchema, 'params'), validate(userRoleSchema), async (req, res) => {
    const data = await service.updateUserRole({ actor: req.user, targetId: req.params.userId, role: req.body.role });
    return res.status(200).json({ data });
  });

  router.patch('/users/:userId/status', validate(uuidParamsSchema, 'params'), validate(userStatusSchema), async (req, res) => {
    const data = await service.updateUserStatus({ actor: req.user, targetId: req.params.userId, isActive: req.body.isActive });
    return res.status(200).json({ data });
  });

  router.post('/patient-access', validate(patientAccessSchema), async (req, res) => {
    const data = await service.grantPatientAccess({ actor: req.user, ...req.body });
    return res.status(201).json({ data });
  });

  router.delete('/patient-access/:accessId', validate(uuidParamsSchema, 'params'), async (req, res) => {
    await service.revokePatientAccess({ actor: req.user, accessId: req.params.accessId });
    return res.status(200).json({ data: { message: 'Patient access revoked.' } });
  });

  return router;
}

module.exports = createAdminRouter;
