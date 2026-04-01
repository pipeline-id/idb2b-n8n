/**
 * Configuration constants for IDB2B node operations
 * Centralized management of timeouts, retry policies, and validation parameters
 */

// Token Cache Settings
export const TOKEN_CACHE = {
  CLEANUP_INTERVAL_MS: 10 * 60 * 1000, // 10 minutes
  CACHE_TTL_MINUTES: 50, // Cache tokens for 50 minutes (vs 1 hour for safety margin)
  ENCRYPTION_ALGORITHM: "aes-256-cbc",
};

// Retry Configuration
export const RETRY = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_EXPONENTIAL_DELAY_MS: 10000, // Max delay for general errors
  MAX_RATE_LIMIT_DELAY_MS: 30000, // Max delay for 429 rate limit errors
  NO_RETRY_STATUS_CODES: [400, 401, 403, 404, 422], // Don't retry these HTTP status codes
};

// HTTP Request Settings
export const HTTP = {
  DEFAULT_TIMEOUT_MS: 30000,
  RATE_LIMIT_STATUS: 429,
  RETRY_AFTER_HEADER: "retry-after",
};

// Email Validation
export const EMAIL_VALIDATION = {
  REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MAX_LENGTH: 320,
};

// Field Validation
export const FIELD_VALIDATION = {
  NAME_MAX_LENGTH: 255,
  EMAIL_MAX_LENGTH: 320,
  ERROR_MESSAGE_MAX_LENGTH: 500,
};

// Error Handling
export const ERROR_HANDLING = {
  ALLOWED_ERROR_FIELDS: [
    "message",
    "error",
    "code",
    "type",
    "validation_errors",
  ],
  ERROR_MESSAGE_MAX_LENGTH: 500,
  STATUS_CODES: {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    UNPROCESSABLE_ENTITY: 422,
    RATE_LIMITED: 429,
    INTERNAL_SERVER_ERROR: 500,
  },
};

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  DEFAULT_PAGE: 1,
};

// API Endpoints
export const ENDPOINTS = {
  LOGIN: "/login",
  CONTACTS: "/contacts",
  COMPANIES: "/companies",
};

// Response Processing
export const RESPONSE = {
  SUCCESS_MESSAGE: "success",
  CREATE_NULL_DATA_NOTE:
    "Server did not return the created entity. Fields like id and timestamps are unavailable.",
};
