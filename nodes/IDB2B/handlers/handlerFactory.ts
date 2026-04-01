/**
 * Handler factory for creating resource-specific operation handlers
 * Provides a centralized way to instantiate and retrieve handlers
 */

import { ContactHandler } from "./ContactHandler";
import { CompanyHandler } from "./CompanyHandler";
import { HttpClient } from "../utils/httpClient";
import { DataValidator } from "../utils/validators";
import { ErrorHandler } from "../utils/errorHandler";
import { IExecuteFunctions } from "n8n-workflow";

/**
 * Interface defining all required operations for a resource handler
 */
export interface IResourceHandler {
  getAll(params: GetAllParams): Promise<any>;
  get(params: GetParams): Promise<any>;
  create(params: CreateParams): Promise<any>;
  update(params: UpdateParams): Promise<any>;
  delete(params: DeleteParams): Promise<any>;
}

/**
 * Parameters for getAll operation
 */
export interface GetAllParams {
  baseUrl: string;
  accessToken: string;
  limit?: number;
  page?: number;
  queryParameters?: Record<string, any>;
}

/**
 * Parameters for get operation
 */
export interface GetParams {
  baseUrl: string;
  accessToken: string;
  id: string;
}

/**
 * Parameters for create operation
 */
export interface CreateParams {
  baseUrl: string;
  accessToken: string;
  data: Record<string, any>;
}

/**
 * Parameters for update operation
 */
export interface UpdateParams {
  baseUrl: string;
  accessToken: string;
  id: string;
  data: Record<string, any>;
}

/**
 * Parameters for delete operation
 */
export interface DeleteParams {
  baseUrl: string;
  accessToken: string;
  id: string;
}

/**
 * Handler factory class for creating handlers
 */
export class HandlerFactory {
  private contactHandler: ContactHandler;
  private companyHandler: CompanyHandler;

  constructor(
    private executeFunctions: IExecuteFunctions,
    private httpClient: HttpClient,
    private validator: DataValidator,
    private errorHandler: ErrorHandler,
  ) {
    this.contactHandler = new ContactHandler(
      httpClient,
      validator,
      errorHandler,
    );
    this.companyHandler = new CompanyHandler(
      httpClient,
      validator,
      errorHandler,
    );
  }

  /**
   * Get handler for specified resource
   */
  getHandler(resource: string): IResourceHandler {
    switch (resource) {
      case "contact":
        return this.contactHandler;
      case "company":
        return this.companyHandler;
      default:
        throw new Error(`Unknown resource: ${resource}`);
    }
  }

  /**
   * Check if resource is supported
   */
  isResourceSupported(resource: string): boolean {
    return ["contact", "company"].includes(resource);
  }

  /**
   * Get list of supported resources
   */
  getSupportedResources(): string[] {
    return ["contact", "company"];
  }
}

/**
 * Create handler factory for current execution
 */
export function createHandlerFactory(
  executeFunctions: IExecuteFunctions,
  httpClient: HttpClient,
  validator: DataValidator,
  errorHandler: ErrorHandler,
): HandlerFactory {
  return new HandlerFactory(
    executeFunctions,
    httpClient,
    validator,
    errorHandler,
  );
}
