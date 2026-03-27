const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGO = 'HS256';
const JWT_EXPIRES = '7d';

// Fail fast on startup if secret is missing to prevent runtime crash loop
if (!JWT_SECRET) {
  console.error('🔥 FATAL ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1); 
}

// Fail fast if secret is too weak
if (JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET is shorter than 32 characters — use a longer secret in production!');
}

/**
 * Generate a signed JWT containing userId and role.
 * Algorithm is explicitly pinned to HS256 to prevent alg:none attacks.
 */
const signToken = (userId, role) => {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, {
    algorithm: JWT_ALGO,
    expiresIn: JWT_EXPIRES,
  });
};

/**
 * Verify and decode a JWT.
 * Algorithm allowlist prevents tokens signed with unexpected algorithms.
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] });
};

module.exports = { signToken, verifyToken };
