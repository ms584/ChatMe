/**
 * Sanitize an avatar URL to prevent protocol injection.
 * - Production: only https:// allowed (prevents mixed-content attacks)
 * - Development: also allows http:// for local testing
 * - Always blocks javascript:, vbscript:, data:, and other dangerous schemes
 *
 * @param {string|null|undefined} url
 * @returns {string}
 */
export const safeAvatar = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Only allow https:// (and http:// for localhost in dev mode)
  if (/^https:\/\//i.test(trimmed)) return trimmed;

  const isDev = import.meta.env.DEV;
  if (isDev && /^http:\/\/(localhost|127\.0\.0\.1)/i.test(trimmed)) return trimmed;

  return '';
};
