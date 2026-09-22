const jwt = require('jsonwebtoken');

const getSecret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set and contain at least 32 characters.');
  }
  return process.env.JWT_SECRET;
};

const generateToken = (user) => jwt.sign(
  { sub: String(user._id), role: user.role },
  getSecret(),
  {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer: process.env.JWT_ISSUER || 'auth-service',
    audience: process.env.JWT_AUDIENCE || 'auth-client',
  }
);

const verifyToken = (token) => jwt.verify(token, getSecret(), {
  issuer: process.env.JWT_ISSUER || 'auth-service',
  audience: process.env.JWT_AUDIENCE || 'auth-client',
});

module.exports = { generateToken, verifyToken };
