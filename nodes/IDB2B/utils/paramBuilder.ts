/**
 * Request parameter builders for type-safe API request construction
 * Helps build consistent request parameters across different operations
 */

import { PAGINATION } from "../config/constants";

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  page?: number;
  offset?: number;
  pageSize?: number;
}

/**
 * Contact filter parameters
 */
export interface ContactFilterParams {
  name?: string;
  email?: string;
  status?: string;
  tags?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

/**
 * Build validated pagination parameters
 */
export function buildPaginationParams(
  limit?: number,
  page?: number,
): PaginationParams {
  return {
    limit: limit ?? PAGINATION.DEFAULT_LIMIT,
    page: page ?? PAGINATION.DEFAULT_PAGE,
  };
}

/**
 * Build contact list query parameters
 */
export function buildContactListParams(
  limit?: number,
  page?: number,
  filters?: ContactFilterParams,
): Record<string, any> {
  const params: Record<string, any> = buildPaginationParams(limit, page);

  if (filters) {
    if (filters.name) params.name = filters.name;
    if (filters.email) params.email = filters.email;
    if (filters.status) params.status = filters.status;
    if (filters.tags && filters.tags.length > 0)
      params.tags = filters.tags.join(",");
    if (filters.createdAfter) params.createdAfter = filters.createdAfter;
    if (filters.createdBefore) params.createdBefore = filters.createdBefore;
  }

  return params;
}

/**
 * Build company list query parameters
 */
export function buildCompanyListParams(
  limit?: number,
  page?: number,
  filters?: Record<string, any>,
): Record<string, any> {
  const params: Record<string, any> = buildPaginationParams(limit, page);

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params[key] = value;
      }
    });
  }

  return params;
}

/**
 * Build contact creation body
 */
export interface ContactCreateBody {
  name: string;
  email: string;
  phone_number?: string;
  [key: string]: any;
}

export function buildContactCreateBody(
  data: Record<string, any>,
): ContactCreateBody {
  const body: ContactCreateBody = {
    name: data.name,
    email: data.email,
  };

  if (data.phone_number) body.phone_number = data.phone_number;

  // Add any additional fields
  Object.keys(data).forEach((key) => {
    if (
      !["name", "email", "phone_number"].includes(key) &&
      data[key] !== undefined
    ) {
      body[key] = data[key];
    }
  });

  return body;
}

/**
 * Build contact update body (all fields optional)
 */
export interface ContactUpdateBody {
  name?: string;
  email?: string;
  phone_number?: string;
  [key: string]: any;
}

export function buildContactUpdateBody(
  data: Record<string, any>,
): ContactUpdateBody {
  const body: ContactUpdateBody = {};

  if (data.name !== undefined) body.name = data.name;
  if (data.email !== undefined) body.email = data.email;
  if (data.phone_number !== undefined) body.phone_number = data.phone_number;

  // Add additional fields
  Object.keys(data).forEach((key) => {
    if (
      !["name", "email", "phone_number"].includes(key) &&
      data[key] !== undefined
    ) {
      body[key] = data[key];
    }
  });

  return body;
}

/**
 * Build company creation body
 */
export interface CompanyCreateBody {
  name: string;
  [key: string]: any;
}

export function buildCompanyCreateBody(
  data: Record<string, any>,
): CompanyCreateBody {
  const body: CompanyCreateBody = {
    name: data.name,
  };

  // Add any additional fields
  Object.keys(data).forEach((key) => {
    if (key !== "name" && data[key] !== undefined) {
      body[key] = data[key];
    }
  });

  return body;
}

/**
 * Build company update body (all fields optional)
 */
export interface CompanyUpdateBody {
  name?: string;
  [key: string]: any;
}

export function buildCompanyUpdateBody(
  data: Record<string, any>,
): CompanyUpdateBody {
  const body: CompanyUpdateBody = {};

  if (data.name !== undefined) body.name = data.name;

  // Add additional fields
  Object.keys(data).forEach((key) => {
    if (key !== "name" && data[key] !== undefined) {
      body[key] = data[key];
    }
  });

  return body;
}

/**
 * Parameter builder class for fluent API
 */
export class RequestParamBuilder {
  private params: Record<string, any> = {};

  addPagination(limit?: number, page?: number): this {
    const pagination = buildPaginationParams(limit, page);
    this.params = { ...this.params, ...pagination };
    return this;
  }

  addFilter(key: string, value: any): this {
    if (value !== undefined && value !== null && value !== "") {
      this.params[key] = value;
    }
    return this;
  }

  addFilters(filters: Record<string, any>): this {
    Object.entries(filters).forEach(([key, value]) => {
      this.addFilter(key, value);
    });
    return this;
  }

  build(): Record<string, any> {
    return { ...this.params };
  }

  clear(): this {
    this.params = {};
    return this;
  }
}
