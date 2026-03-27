/**
 * Cached admin user ID — avoids hitting MongoDB on every message send.
 *
 * The admin role is assigned at login via ADMIN_GITHUB_USERNAME env var
 * and never changes at runtime, so in-process caching is safe.
 *
 * Call `clearAdminCache()` only in tests or if admin changes (restart server).
 */
const User = require('../models/User');

let _cachedAdminId = null;
let _fetchPromise = null; // Single-flight promise lock

const getAdminId = async () => {
  if (_cachedAdminId) return _cachedAdminId;
  
  // If a DB fetch is already in flight, wait for it instead of starting a new one
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    try {
      const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
      if (admin) {
        _cachedAdminId = admin._id.toString();
      }
      return _cachedAdminId;
    } finally {
      _fetchPromise = null; // Release the lock
    }
  })();

  return _fetchPromise;
};

const clearAdminCache = () => { _cachedAdminId = null; };

module.exports = { getAdminId, clearAdminCache };
