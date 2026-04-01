/**
 * Contact resource handler
 * Implements all contact-related operations (get, getAll, create, update, delete)
 */

import { HttpClient, RequestOptions } from "../utils/httpClient";
import { DataValidator } from "../utils/validators";
import { ErrorHandler } from "../utils/errorHandler";
import { ENDPOINTS, PAGINATION } from "../config/constants";
import {
  sanitizeId,
  buildContactRequestBody,
  buildQueryString,
} from "../utils/common";
import {
  IResourceHandler,
  GetAllParams,
  GetParams,
  CreateParams,
  UpdateParams,
  DeleteParams,
} from "./handlerFactory";

export class ContactHandler implements IResourceHandler {
  constructor(
    private httpClient: HttpClient,
    private validator: DataValidator,
    private errorHandler: ErrorHandler,
  ) {}

  /**
   * Get all contacts with pagination and filtering
   */
  async getAll(params: GetAllParams): Promise<any> {
    const limit = params.limit ?? PAGINATION.DEFAULT_LIMIT;
    const page = params.page ?? PAGINATION.DEFAULT_PAGE;

    const qs: Record<string, any> = {
      limit,
      page,
    };

    // Add additional query parameters if provided
    if (params.queryParameters) {
      Object.assign(qs, params.queryParameters);
    }

    const options: RequestOptions = {
      method: "GET",
      url: `${params.baseUrl}${ENDPOINTS.CONTACTS}`,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      qs,
      json: true,
    };

    return this.httpClient.makeRequest(options);
  }

  /**
   * Get single contact by ID
   */
  async get(params: GetParams): Promise<any> {
    const options: RequestOptions = {
      method: "GET",
      url: `${params.baseUrl}${ENDPOINTS.CONTACTS}/${sanitizeId(params.id)}`,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      json: true,
    };

    return this.httpClient.makeRequest(options);
  }

  /**
   * Create new contact
   */
  async create(params: CreateParams): Promise<any> {
    // Validate required fields
    const validation = this.validator.validateContactData(
      params.data.name,
      params.data.email,
    );
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const body = buildContactRequestBody(params.data);

    const options: RequestOptions = {
      method: "POST",
      url: `${params.baseUrl}${ENDPOINTS.CONTACTS}`,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      body,
      json: true,
    };

    return this.httpClient.makeRequest(options);
  }

  /**
   * Update existing contact
   */
  async update(params: UpdateParams): Promise<any> {
    // Validate fields if provided
    if (params.data.name) {
      const validation = this.validator.validateContactData(params.data.name);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
    }

    if (params.data.email) {
      const validation = this.validator.validateEmailField(params.data.email);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
    }

    const body = buildContactRequestBody(params.data);

    const options: RequestOptions = {
      method: "PATCH",
      url: `${params.baseUrl}${ENDPOINTS.CONTACTS}/${sanitizeId(params.id)}`,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      body,
      json: true,
    };

    return this.httpClient.makeRequest(options);
  }

  /**
   * Delete contact
   */
  async delete(params: DeleteParams): Promise<any> {
    const options: RequestOptions = {
      method: "DELETE",
      url: `${params.baseUrl}${ENDPOINTS.CONTACTS}/${sanitizeId(params.id)}`,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      json: true,
    };

    return this.httpClient.makeRequest(options);
  }
}
