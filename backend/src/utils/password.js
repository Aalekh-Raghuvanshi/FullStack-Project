const bcrypt = require('bcrypt');

const DEFAULT_ROUNDS = 12;

function getPasswordRounds(override) {
  const rounds = Number.parseInt(override ?? process.env.BCRYPT_ROUNDS ?? `${DEFAULT_ROUNDS}`, 10);
  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) {
    throw new Error('BCRYPT_ROUNDS must be an integer between 10 and 15.');
  }
  return rounds;
}

async function hashPassword(password, rounds) {
  return bcrypt.hash(password, getPasswordRounds(rounds));
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { comparePassword, getPasswordRounds, hashPassword };
