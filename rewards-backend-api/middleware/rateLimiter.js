/**
 * Rate Limiting Configuration
 * Prevents abuse and DoS attacks
 */

import rateLimit from 'express-rate-limit';

/**
 * General rate limiter for public endpoints
 * 100 requests per 15 minutes per IP
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter limiter for admin endpoints
 * 10 requests per 15 minutes (prevents brute force on API key)
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Rate limit exceeded for admin endpoint' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});
