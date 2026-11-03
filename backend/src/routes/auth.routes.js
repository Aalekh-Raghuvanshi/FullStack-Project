const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { createAuthMiddleware } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createAuthService, toPublicUser } = require('../services/auth.service');
const { loginSchema, registerSchema } = require('../validators/auth.validator');

function createAuthRouter({ prismaClient, jwtSecret, passwordRounds, tokenLifetimeSeconds } = {}) {
  const router = express.Router();
  const service = createAuthService({ prismaClient, jwtSecret, passwordRounds, tokenLifetimeSeconds });
  const { authenticateToken, requireActiveUser } = createAuthMiddleware({ prismaClient, jwtSecret });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' },
    }),
  });

  router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
    const user = await service.register(req.body);
    return res.status(201).json({ data: user });
  });

  router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
    const result = await service.login(req.body);
    return res.status(200).json({ data: result });
  });

  router.use(authenticateToken, requireActiveUser);

  router.get('/me', (req, res) => res.status(200).json({ data: toPublicUser(req.user) }));

  router.post('/logout', async (req, res) => {
    const result = await service.logout(req.user, req.auth);
    return res.status(200).json({ data: result });
  });

  return router;
}

module.exports = createAuthRouter;
