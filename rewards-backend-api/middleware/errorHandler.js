/**
 * Global Error Handler
 * Sanitizes error responses to prevent information leakage
 */

/**
 * Global error handling middleware
 * Logs full errors server-side but returns sanitized messages to clients
 */
export function errorHandler(err, req, res, next) {
  // Log full error for debugging (server-side only)
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  // Database errors - sanitize to generic message
  if (err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED')) {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }

  // Default: Internal server error (no stack traces to client)
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({ error: message });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Endpoint not found' });
}
