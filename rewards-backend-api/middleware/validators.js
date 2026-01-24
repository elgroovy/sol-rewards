/**
 * Input Validation Middleware
 * Uses express-validator for request validation
 */

import { query, body, validationResult } from 'express-validator';

// Solana wallet address: Base58 encoded, 32-44 characters
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Validate wallet address query parameter
 */
export function validateWalletAddress() {
  return [
    query('address')
      .trim()
      .notEmpty().withMessage('Address is required')
      .matches(SOLANA_ADDRESS_REGEX).withMessage('Invalid Solana wallet address format'),
  ];
}

/**
 * Validate pagination query parameters
 */
export function validatePagination() {
  return [
    query('page')
      .optional()
      .isInt({ min: 1, max: 10000 }).withMessage('Page must be a positive integer'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 200 }).withMessage('PageSize must be between 1 and 200'),
  ];
}

/**
 * Validate leaderboard query parameters
 */
export function validateLeaderboardParams() {
  return [
    query('asset')
      .trim()
      .notEmpty().withMessage('Asset is required')
      .custom((value) => {
        // Allow 'SOL', 'USDC', or valid Solana mint address
        if (value.toUpperCase() === 'SOL' || value.toUpperCase() === 'USDC') {
          return true;
        }
        if (SOLANA_ADDRESS_REGEX.test(value)) {
          return true;
        }
        throw new Error('Asset must be SOL, USDC, or a valid token mint address');
      }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),
    query('from')
      .optional()
      .isISO8601().withMessage('Invalid from date format (use ISO8601)'),
    query('to')
      .optional()
      .isISO8601().withMessage('Invalid to date format (use ISO8601)'),
  ];
}

/**
 * Validate eligible holders update request body
 */
export function validateHoldersUpdate() {
  return [
    body('addresses')
      .isArray({ min: 1 }).withMessage('Addresses must be a non-empty array')
      .custom((addresses) => {
        for (const addr of addresses) {
          if (typeof addr !== 'string' || !SOLANA_ADDRESS_REGEX.test(addr)) {
            throw new Error('Invalid wallet address in array');
          }
        }
        return true;
      }),
  ];
}

/**
 * Validate notification request body
 */
export function validateNotifyPayload() {
  return [
    body('messageType')
      .trim()
      .notEmpty().withMessage('messageType is required')
      .isIn(['simple', 'command', 'rewards']).withMessage('Invalid messageType'),
    body('messageText')
      .optional()
      .isString()
      .isLength({ max: 4096 }).withMessage('messageText too long (max 4096 chars)'),
    body('mediaUrl')
      .optional()
      .isURL().withMessage('Invalid mediaUrl'),
  ];
}

/**
 * Middleware to check validation results and return errors
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => e.msg)
    });
  }
  next();
}
