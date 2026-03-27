const { verifyToken } = require('../utils/jwt');

/**
 * Middleware: extract and verify JWT from Authorization header.
 * Sets req.user = { id, role } from verified token payload.
 * NEVER trusts userId from the client body/params.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Reject absurdly long tokens before running CPU-intensive jwt.verify
  // A valid HS256 JWT is typically 150–250 characters
  if (!token || token.length > 500) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authenticate;
