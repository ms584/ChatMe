/**
 * Middleware: allow only users with role === 'admin'.
 * Must be used AFTER the authenticate middleware.
 */
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

module.exports = isAdmin;
