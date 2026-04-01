/**
 * Resource configuration metadata
 * Defines resource-specific properties and endpoints
 */

import { ENDPOINTS } from "./constants";

export interface ResourceConfig {
  endpoint: string;
  idParam: string;
  idField: string;
  nameField: string;
  operations: string[];
}

export const RESOURCE_CONFIG: Record<string, ResourceConfig> = {
  contact: {
    endpoint: ENDPOINTS.CONTACTS,
    idParam: "contactId",
    idField: "id",
    nameField: "name",
    operations: ["get", "getAll", "create", "update", "delete"],
  },
  company: {
    endpoint: ENDPOINTS.COMPANIES,
    idParam: "companyId",
    idField: "id",
    nameField: "name",
    operations: ["get", "getAll", "create", "update", "delete"],
  },
};

/**
 * Get resource configuration by name
 */
export function getResourceConfig(resourceName: string): ResourceConfig {
  const config = RESOURCE_CONFIG[resourceName];
  if (!config) {
    throw new Error(`Unknown resource: ${resourceName}`);
  }
  return config;
}

/**
 * Check if resource supports operation
 */
export function supportsOperation(
  resourceName: string,
  operation: string,
): boolean {
  try {
    const config = getResourceConfig(resourceName);
    return config.operations.includes(operation);
  } catch {
    return false;
  }
}
