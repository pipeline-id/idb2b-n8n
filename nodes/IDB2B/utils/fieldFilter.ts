/**
 * Field filtering utilities for server-side field selection
 * Builds query parameters for APIs that support field filtering
 */

/**
 * Build field query parameter for API requests
 * Converts array of field names to API-compatible format
 */
export function buildFieldQueryParam(
  fields: string[],
  delimiter = ",",
): string {
  if (!fields || fields.length === 0) {
    return "";
  }

  return fields.join(delimiter);
}

/**
 * Parse field query parameter from string
 */
export function parseFieldQueryParam(
  fieldParam: string,
  delimiter = ",",
): string[] {
  if (!fieldParam || typeof fieldParam !== "string") {
    return [];
  }

  return fieldParam.split(delimiter).filter((f) => f.trim().length > 0);
}

/**
 * Filter object to only include specified fields
 */
export function filterObjectFields<T extends Record<string, any>>(
  obj: T,
  fields: string[],
): Partial<T> {
  if (!fields || fields.length === 0) {
    return obj;
  }

  const filtered: Partial<T> = {};

  fields.forEach((field) => {
    if (field in obj) {
      (filtered as any)[field] = (obj as any)[field];
    }
  });

  return filtered;
}

/**
 * Filter array of objects to only include specified fields
 */
export function filterArrayObjectsFields<T extends Record<string, any>>(
  arr: T[],
  fields: string[],
): Partial<T>[] {
  if (!Array.isArray(arr) || !fields || fields.length === 0) {
    return arr;
  }

  return arr.map((item) => filterObjectFields(item, fields));
}

/**
 * Check if API supports field filtering parameter
 * Some APIs use 'fields', others use 'select', 'columns', etc.
 */
export function supportsFieldFiltering(
  apiType: "default" | "select" | "columns" = "default",
): boolean {
  return true; // Can be extended based on actual API capabilities
}

/**
 * Get field parameter name for specific API
 */
export function getFieldParamName(
  apiType: "default" | "select" | "columns" = "default",
): string {
  const paramNames: Record<string, string> = {
    default: "fields",
    select: "select",
    columns: "columns",
  };

  return paramNames[apiType] || "fields";
}

export interface FieldFilterConfig {
  fields: string[];
  useServerFiltering?: boolean;
  apiType?: "default" | "select" | "columns";
}

/**
 * Apply field filtering strategy based on configuration
 */
export class FieldFilter {
  constructor(private config: FieldFilterConfig) {}

  /**
   * Get query parameter for server-side filtering
   */
  getQueryParam(): Record<string, string> {
    if (!this.config.useServerFiltering || this.config.fields.length === 0) {
      return {};
    }

    const paramName = getFieldParamName(this.config.apiType);
    const paramValue = buildFieldQueryParam(this.config.fields);

    return {
      [paramName]: paramValue,
    };
  }

  /**
   * Apply client-side filtering to response
   */
  filterResponse<T extends Record<string, any>>(
    data: T | T[],
  ): Partial<T> | Partial<T>[] {
    if (!this.config.fields || this.config.fields.length === 0) {
      return data;
    }

    if (Array.isArray(data)) {
      return filterArrayObjectsFields(data, this.config.fields);
    }

    return filterObjectFields(data, this.config.fields);
  }
}
