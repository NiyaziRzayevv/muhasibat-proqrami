const crypto = require('crypto');
const { env } = require('../env');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password) + env.PASSWORD_SALT).digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

module.exports = { hashPassword, verifyPassword };
