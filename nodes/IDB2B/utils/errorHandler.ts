/**
 * Error handling utilities for IDB2B node
 * Standardized error mapping and sanitization
 */

import { ERROR_HANDLING } from "../config/constants";

export interface ErrorResponse {
  [key: string]: any;
  error: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

export interface ErrorMappingResult {
  message: string;
  description?: string;
  shouldRetry: boolean;
}

export class ErrorHandler {
  /**
   * Map HTTP-specific errors to user-friendly messages
   */
  mapHttpError(statusCode: number, response: any): ErrorMappingResult {
    const { STATUS_CODES } = ERROR_HANDLING;

    switch (statusCode) {
      case STATUS_CODES.UNAUTHORIZED:
        return {
          message: "Authentication failed - check credentials",
          description: "Invalid email, password, or credentials have expired",
          shouldRetry: false,
        };
      case STATUS_CODES.FORBIDDEN:
        return {
          message: "Access forbidden - insufficient permissions",
          description:
            "Your credentials do not have permission for this operation",
          shouldRetry: false,
        };
      case STATUS_CODES.NOT_FOUND:
        return {
          message: "Resource not found",
          description: "The requested resource does not exist",
          shouldRetry: false,
        };
      case STATUS_CODES.UNPROCESSABLE_ENTITY:
        return {
          message: "Validation error - check input data",
          description: response?.data?.validation_errors
            ? JSON.stringify(response.data.validation_errors)
            : "Request data failed validation",
          shouldRetry: false,
        };
      case STATUS_CODES.RATE_LIMITED:
        return {
          message: "Rate limit exceeded - please retry later",
          description: "Too many requests to the API",
          shouldRetry: true,
        };
      case STATUS_CODES.INTERNAL_SERVER_ERROR:
        return {
          message: "Internal server error",
          description: "The API encountered an unexpected error",
          shouldRetry: true,
        };
      default:
        return {
          message: `HTTP ${statusCode} error`,
          shouldRetry: statusCode >= 500,
        };
    }
  }

  /**
   * Sanitize error response to prevent leaking sensitive information
   */
  sanitizeErrorData(data: any): any {
    if (!data || typeof data !== "object") {
      return {};
    }

    const sanitized: any = {};

    for (const field of ERROR_HANDLING.ALLOWED_ERROR_FIELDS) {
      if (data[field] !== undefined) {
        if (typeof data[field] === "string") {
          // Truncate long strings
          sanitized[field] = data[field].substring(
            0,
            ERROR_HANDLING.ERROR_MESSAGE_MAX_LENGTH,
          );
        } else if (
          typeof data[field] === "object" &&
          field === "validation_errors"
        ) {
          // Allow validation_errors object as-is
          sanitized[field] = data[field];
        }
      }
    }

    return sanitized;
  }

  /**
   * Determine if an error should be retried
   */
  shouldRetry(error: any): boolean {
    if (!error.response) {
      return true; // Network errors are retryable
    }

    const statusCode = error.response.status || error.response.statusCode;
    const mapping = this.mapHttpError(statusCode, error.response);

    return mapping.shouldRetry;
  }

  /**
   * Extract error details from various error formats
   */
  extractErrorDetails(error: any): ErrorResponse {
    let errorData: ErrorResponse = { error: "Unknown error occurred" };

    if (error instanceof Error) {
      errorData.error = error.message;

      if ("response" in error && error.response) {
        const response = error.response as any;
        errorData.statusCode = response.status || response.statusCode;

        if (response.data) {
          const sanitizedData = this.sanitizeErrorData(response.data);
          if (Object.keys(sanitizedData).length > 0) {
            errorData.details = sanitizedData;
          }
        }
      }
    }

    return errorData;
  }
}

// Export singleton instance
export const defaultErrorHandler = new ErrorHandler();
