const prisma = require('../config/prisma');
const AppError = require('../utils/app-error');
const { verifyAccessToken } = require('../utils/jwt');

function unauthorized() {
  return new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
}

function createAuthMiddleware({ prismaClient = prisma, jwtSecret } = {}) {
  async function authenticateToken(req, _res, next) {
    try {
      const header = req.get('authorization') || '';
      const match = header.match(/^Bearer\s+([^\s]+)$/i);
      if (!match) throw unauthorized();

      let payload;
      try {
        payload = verifyAccessToken(match[1], jwtSecret);
      } catch (error) {
        if (error instanceof AppError && error.status >= 500) throw error;
        throw unauthorized();
      }

      const revoked = await prismaClient.revokedToken.findFirst({
        where: { jti: payload.jti, expiresAt: { gt: new Date() } },
        select: { id: true },
      });
      if (revoked) throw unauthorized();

      req.auth = { userId: payload.sub, jti: payload.jti, exp: payload.exp };
      return next();
    } catch (error) {
      return next(error);
    }
  }

  async function requireActiveUser(req, _res, next) {
    try {
      if (!req.auth?.userId) throw unauthorized();
      const user = await prismaClient.user.findUnique({
        where: { id: req.auth.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          patient: { select: { id: true } },
        },
      });
      if (!user) throw unauthorized();
      if (!user.isActive) throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account is inactive.');
      req.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  }

  return { authenticateToken, requireActiveUser };
}

function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }
    return next();
  };
}

const defaultMiddleware = createAuthMiddleware();

module.exports = {
  ...defaultMiddleware,
  createAuthMiddleware,
  requireRole,
};
