/**
 * API Key Authentication Middleware
 * Protects admin/write endpoints (POST, PUT, DELETE)
 */

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  console.error('WARNING: ADMIN_API_KEY environment variable is not set. Admin endpoints will reject all requests.');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Middleware that requires a valid API key in the X-API-Key header
 * or as a Bearer token in the Authorization header
 */
export function requireApiKey(req, res, next) {
  if (!ADMIN_API_KEY) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  const apiKey = req.headers['x-api-key'] ||
                 req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  if (!timingSafeEqual(apiKey, ADMIN_API_KEY)) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}