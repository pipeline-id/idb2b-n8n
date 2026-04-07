/**
 * Activity resource handler
 * Implements CRUD operations for lead/contact activities
 */

import { HttpClient, RequestOptions } from "../utils/httpClient";
import { DataValidator } from "../utils/validators";
import { ErrorHandler } from "../utils/errorHandler";
import { ENDPOINTS, PAGINATION } from "../config/constants";
import { sanitizeId } from "../utils/common";
import {
  IResourceHandler,
  GetAllParams,
  GetParams,
  CreateParams,
  UpdateParams,
  DeleteParams,
} from "./handlerFactory";

export interface ActivityGetAllParams extends GetAllParams {
  companyId: string;
}

export interface ActivityCreateParams extends CreateParams {
  // data should include either company_id or contact_id
}

export class ActivityHandler implements IResourceHandler {
  constructor(
    private httpClient: HttpClient,
    private validator: DataValidator,
    private errorHandler: ErrorHandler,
  ) {}

  /**
   * Get all activities for a specific company/lead
   */
  async getAll(params: ActivityGetAllParams): Promise<any> {
    const limit = params.limit ?? PAGINATION.DEFAULT_LIMIT;
    const page = params.page ?? PAGINATION.DEFAULT_PAGE;

    const qs: Record<string, any> = { limit, page };

    if (params.queryParameters) {
      Object.assign(qs, params.queryParameters);
    }

    const options: RequestOptions = {
      method: "GET",
      url: `${params.baseUrl}/leads/${sanitizeId(params.companyId)}/activities`,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      qs,
      json: true,
    };

    return this.httpClient.makeRequest(options);
  }

  /**
   * Get single activity by ID
   */
  async get(params: GetParams): Promise<any> {
    const options: RequestOptions = {
      method: "GET",
      url: `${params.baseUrl}${ENDPOINTS.ACTIVITIES}/${sanitizeId(params.id)}`,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      json: true,
    };

    return this.httpClient.makeRequest(options);
  }

  /**
   * Create a new activity (linked to a company or contact)
   */
  async create(params: CreateParams): Promise<any> {
    const { company_id, contact_id, subject, description, datetime, icon, user_id } = params.data;

    if (!subject || !subject.trim()) {
      throw new Error("Subject is required to create an activity");
    }

    if (!company_id && !contact_id) {
      throw new Error("Either company_id or contact_id is required");
    }

    const body: Record<string, any> = {
      subject: subject.trim(),
    };

    if (company_id) body.company_id = company_id;
    if (contact_id) body.contact_id = contact_id;
    if (description) body.description = description;
    if (datetime) body.datetime = datetime;
    if (icon) body.icon = icon;
    if (user_id) body.user_id = user_id;

    const options: RequestOptions = {
      method: "POST",
      url: `${params.baseUrl}${ENDPOINTS.ACTIVITIES}`,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      body,
      json: true,
    };

    return this.httpClient.makeRequest(options);
  }

  /**
   * Update an existing activity
   */
  async update(params: UpdateParams): Promise<any> {
    const { subject, description, datetime, icon, user_id } = params.data;

    const body: Record<string, any> = {};

    if (subject) body.subject = subject.trim();
    if (description !== undefined && description !== "") body.description = description;
    if (datetime) body.datetime = datetime;
    if (icon) body.icon = icon;
    if (user_id) body.user_id = user_id;

    const options: RequestOptions = {
      method: "PATCH",
      url: `${params.baseUrl}${ENDPOINTS.ACTIVITIES}/${sanitizeId(params.id)}`,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      body,
      json: true,
    };

    return this.httpClient.makeRequest(options);
  }

  /**
   * Delete an activity
   */
  async delete(params: DeleteParams): Promise<any> {
    const options: RequestOptions = {
      method: "DELETE",
      url: `${params.baseUrl}${ENDPOINTS.ACTIVITIES}/${sanitizeId(params.id)}`,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      json: true,
    };

    return this.httpClient.makeRequest(options);
  }
}
