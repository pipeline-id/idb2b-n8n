/**
 * Common utility functions for IDB2B node
 * Reusable helpers for request building and response processing
 */

import type { IDB2BContact } from "../interfaces/IDB2BContact";
import type { IDB2BLead } from "../interfaces/IDB2BLead";

/**
 * Build query string from fixedCollection parameter format
 * Converts array of name/value pairs into object
 */
export function buildQueryString(queryParameters: any): Record<string, any> {
  const qs: Record<string, any> = {};

  if (!queryParameters || !queryParameters.parameter) {
    return qs;
  }

  if (!Array.isArray(queryParameters.parameter)) {
    return qs;
  }

  queryParameters.parameter.forEach((param: any) => {
    if (param.name && param.value !== undefined && param.value !== "") {
      qs[param.name] = param.value;
    }
  });

  return qs;
}

/**
 * Safely encode resource IDs for use in URLs
 */
export function sanitizeId(id: string): string {
  return encodeURIComponent(id);
}

/**
 * Filter contact response to only include specified fields
 */
export function filterContactFields(
  contact: IDB2BContact,
  fieldsToReturn: string[],
): Partial<IDB2BContact> {
  if (!fieldsToReturn || fieldsToReturn.length === 0) {
    return contact;
  }

  const filtered: Partial<IDB2BContact> = {};
  fieldsToReturn.forEach((field) => {
    if (field in contact) {
      (filtered as any)[field] = (contact as any)[field];
    }
  });

  return filtered;
}

/**
 * Filter company response to only include specified fields
 */
export function filterCompanyFields(
  company: IDB2BLead,
  fieldsToReturn: string[],
): Partial<IDB2BLead> {
  if (!fieldsToReturn || fieldsToReturn.length === 0) {
    return company;
  }

  const filtered: Partial<IDB2BLead> = {};
  fieldsToReturn.forEach((field) => {
    if (field in company) {
      (filtered as any)[field] = (company as any)[field];
    }
  });

  return filtered;
}

/**
 * Apply field filtering to a response containing array of resources
 */
export function applyFieldFiltering<T>(
  response: any,
  fieldsToReturn: string[],
  filterFn: (item: T, fields: string[]) => Partial<T>,
): any {
  if (
    !fieldsToReturn ||
    fieldsToReturn.length === 0 ||
    !Array.isArray(response.data)
  ) {
    return response;
  }

  return {
    ...response,
    data: response.data.map((item: T) => filterFn(item, fieldsToReturn)),
  };
}

/**
 * Process response after successful API call
 */
export function processResponse(
  response: any,
  operation: string,
  requestBody?: any,
): any {
  let processed = response;

  // Enhance response for create operations when server returns no data
  if (
    operation === "create" &&
    response.message === "success" &&
    response.data === null &&
    requestBody
  ) {
    processed = {
      ...response,
      data: {
        ...requestBody,
        created: true,
        status: "success",
        _note:
          "Server did not return the created entity. Fields like id and timestamps are unavailable.",
      },
    };
  }

  // Standardize delete operation response
  if (operation === "delete") {
    processed = { deleted: true };
  }

  return processed;
}

/**
 * Build request body for contact create/update operations
 */
export function buildContactRequestBody(
  data: Record<string, any>,
  includesPhone = true,
): Record<string, any> {
  const body: Record<string, any> = {};
  const fieldAliases: Record<string, string> = {
    lead_id: "company_id",
    position: "job_title",
    user_id: "owner_id",
  };
  const supportedFields = new Set([
    "job_title",
    "company_id",
    "status_id",
    "source_id",
    "owner_id",
  ]);

  // Always include name and email if provided
  if (data.name !== undefined) {
    body.name = typeof data.name === "string" ? data.name.trim() : data.name;
  }

  if (data.email !== undefined && data.email !== null && data.email !== "") {
    const trimmedEmail = typeof data.email === "string" ? data.email.trim() : data.email;
    if (trimmedEmail !== "") body.email = trimmedEmail;
  }

  // Include phone if provided
  if (
    includesPhone &&
    data.phone_number !== undefined &&
    data.phone_number !== null &&
    data.phone_number !== ""
  ) {
    body.phone_number = data.phone_number;
  }

  // Handle tags specially - convert from fixedCollection format
  if (data.tags && data.tags.tag && Array.isArray(data.tags.tag)) {
    body.tags = data.tags.tag.map((tag: any) => ({
      name: tag.name.trim(),
    }));
  }

  if (Array.isArray(data.tags)) {
    body.tags = data.tags
      .filter((tag: any) => tag?.name)
      .map((tag: any) => ({
        name: typeof tag.name === "string" ? tag.name.trim() : tag.name,
      }));
  }

  Object.entries(data).forEach(([rawKey, rawValue]) => {
    if (
      [
        "name",
        "email",
        "phone_number",
        "tags",
      ].includes(rawKey)
    ) {
      return;
    }

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return;
    }

    const key = fieldAliases[rawKey] ?? rawKey;
    if (!supportedFields.has(key)) {
      return;
    }

    body[key] = typeof rawValue === "string" ? rawValue.trim() : rawValue;
  });

  return body;
}

/**
 * Build request body for company create/update operations
 */
export function buildCompanyRequestBody(
  data: Record<string, any>,
): Record<string, any> {
  const body: Record<string, any> = {};

  if (data.name !== undefined) {
    body.name = typeof data.name === "string" ? data.name.trim() : data.name;
  }

  // Add all other fields except name
  Object.keys(data).forEach((key) => {
    if (key !== "name" && data[key] !== undefined && data[key] !== "") {
      body[key] = data[key];
    }
  });

  return body;
}
