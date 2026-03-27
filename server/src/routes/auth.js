const express = require('express');
const passport = require('passport');
const { signToken } = require('../utils/jwt');
const authenticate = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Safe redirect helper — only allow redirects to CLIENT_URL to prevent open redirect
const safeRedirect = (res, path, query = '') => {
  const base = (process.env.CLIENT_URL || '').replace(/\/$/, '');
  return res.redirect(`${base}${path}${query}`);
};

// Step 1: Redirect user to GitHub for authentication
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// Step 2: GitHub redirects back with code → exchange for user profile → issue JWT
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${(process.env.CLIENT_URL || '').replace(/\/$/, '')}/login?error=auth_failed` }),
  (req, res) => {
    const token = signToken(req.user._id.toString(), req.user.role);
    return safeRedirect(res, '/auth/callback', `?token=${token}`);
  }
);

// GET /auth/me — return current authenticated user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-__v');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Blocked non-admin users cannot use the app
    if (user.isBlocked && user.role !== 'admin') {
      return res.status(403).json({ error: 'Your account has been blocked', isBlocked: true });
    }

    // Strip isBlocked before sending to client
    const { isBlocked: _removed, ...safeUser } = user.toObject();
    return res.json(safeUser);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/logout — invalidates client-side session safely (POST prevents CSRF-like GET abuse)
router.post('/logout', (req, res) => {
  req.logout?.(() => {});
  return res.json({ message: 'Logged out successfully' });
});

module.exports = router;
