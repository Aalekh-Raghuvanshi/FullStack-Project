const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const AppError = require('./app-error');

const JWT_ISSUER = 'medicore-ai-api';
const JWT_AUDIENCE = 'medicore-ai-client';
const TOKEN_LIFETIME_SECONDS = 15 * 60;

function getJwtSecret(override) {
  const secret = typeof override === 'function' ? override() : override ?? process.env.JWT_SECRET;
  if (
    typeof secret !== 'string'
    || Buffer.byteLength(secret, 'utf8') < 32
    || /^(change[_-]?me|replace|your[_-])/i.test(secret.trim())
  ) {
    throw new AppError(500, 'AUTH_CONFIGURATION_ERROR', 'Authentication is not configured.');
  }
  return secret;
}

function getTokenLifetimeSeconds(override) {
  const configured = override ?? process.env.JWT_ACCESS_TOKEN_TTL_SECONDS;
  if (configured === undefined) return TOKEN_LIFETIME_SECONDS;
  const lifetime = Number.parseInt(configured, 10);
  if (!Number.isInteger(lifetime) || `${lifetime}` !== `${configured}` || lifetime < 300 || lifetime > 3600) {
    throw new AppError(500, 'AUTH_CONFIGURATION_ERROR', 'Authentication is not configured.');
  }
  return lifetime;
}

function signAccessToken(userId, secretOverride, lifetimeSeconds = TOKEN_LIFETIME_SECONDS) {
  const secret = getJwtSecret(secretOverride);
  const tokenId = randomUUID();
  const token = jwt.sign({}, secret, {
    algorithm: 'HS256',
    subject: userId,
    jwtid: tokenId,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: lifetimeSeconds,
  });
  return { token, tokenId, expiresIn: lifetimeSeconds };
}

function verifyAccessToken(token, secretOverride) {
  const payload = jwt.verify(token, getJwtSecret(secretOverride), {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  if (
    typeof payload !== 'object'
    || typeof payload.sub !== 'string'
    || typeof payload.jti !== 'string'
    || !Number.isInteger(payload.exp)
  ) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }
  return payload;
}

module.exports = {
  JWT_AUDIENCE,
  JWT_ISSUER,
  TOKEN_LIFETIME_SECONDS,
  getJwtSecret,
  getTokenLifetimeSeconds,
  signAccessToken,
  verifyAccessToken,
};
