/**
 * Data validation utilities for IDB2B node
 * Provides type-safe validation with clear error messages
 */

import { EMAIL_VALIDATION, FIELD_VALIDATION } from "../config/constants";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class DataValidator {
  /**
   * Validate email format using regex
   */
  validateEmail(email: string): boolean {
    return EMAIL_VALIDATION.REGEX.test(email);
  }

  /**
   * Validate email field with comprehensive checks
   */
  validateEmailField(email: string): ValidationResult {
    if (typeof email !== "string" || email.trim().length === 0) {
      return {
        isValid: false,
        error: "Contact email must be a non-empty string",
      };
    }

    if (email.length > EMAIL_VALIDATION.MAX_LENGTH) {
      return {
        isValid: false,
        error: `Email address cannot exceed ${EMAIL_VALIDATION.MAX_LENGTH} characters`,
      };
    }

    if (!this.validateEmail(email)) {
      return {
        isValid: false,
        error: "Invalid email format - please provide a valid email address",
      };
    }

    return { isValid: true };
  }

  /**
   * Validate contact creation data
   */
  validateContactData(
    name: string,
    email?: string,
    phoneNumber?: string,
    requirePhone = false,
  ): ValidationResult {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return {
        isValid: false,
        error: "Contact name is required and must be a non-empty string",
      };
    }

    if (name.trim().length > FIELD_VALIDATION.NAME_MAX_LENGTH) {
      return {
        isValid: false,
        error: `Contact name cannot exceed ${FIELD_VALIDATION.NAME_MAX_LENGTH} characters`,
      };
    }

    if (email) {
      const emailValidation = this.validateEmailField(email);
      if (!emailValidation.isValid) {
        return emailValidation;
      }
    }

    if (
      requirePhone &&
      (!phoneNumber ||
        typeof phoneNumber !== "string" ||
        phoneNumber.trim().length === 0)
    ) {
      return {
        isValid: false,
        error: "Contact phone number is required",
      };
    }

    return { isValid: true };
  }

  /**
   * Validate company creation data
   */
  validateCompanyData(name: string): ValidationResult {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return {
        isValid: false,
        error: "Company name is required and must be a non-empty string",
      };
    }

    if (name.trim().length > FIELD_VALIDATION.NAME_MAX_LENGTH) {
      return {
        isValid: false,
        error: `Company name cannot exceed ${FIELD_VALIDATION.NAME_MAX_LENGTH} characters`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate base URL format
   */
  validateBaseUrl(url: string): ValidationResult {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") {
        return {
          isValid: false,
          error: "Base URL must use HTTPS protocol",
        };
      }
      if (parsedUrl.hostname.length === 0) {
        return {
          isValid: false,
          error: "Base URL must have a valid hostname",
        };
      }
      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: "Invalid base URL format",
      };
    }
  }

  /**
   * Validate credentials object
   */
  validateCredentials(credentials: any): ValidationResult {
    if (!credentials) {
      return {
        isValid: false,
        error: "Credentials are required",
      };
    }

    if (!credentials.email) {
      return {
        isValid: false,
        error: "Credentials must include email",
      };
    }

    if (!credentials.password) {
      return {
        isValid: false,
        error: "Credentials must include password",
      };
    }

    if (!credentials.baseUrl) {
      return {
        isValid: false,
        error: "Credentials must include base URL",
      };
    }

    const emailValidation = this.validateEmailField(
      credentials.email as string,
    );
    if (!emailValidation.isValid) {
      return {
        isValid: false,
        error: `Invalid email in credentials: ${emailValidation.error}`,
      };
    }

    const urlValidation = this.validateBaseUrl(credentials.baseUrl as string);
    if (!urlValidation.isValid) {
      return {
        isValid: false,
        error: `Invalid base URL in credentials: ${urlValidation.error}`,
      };
    }

    return { isValid: true };
  }
}

// Export singleton instance for convenience
export const defaultValidator = new DataValidator();
