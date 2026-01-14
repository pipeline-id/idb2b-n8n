import { IExecuteFunctions, IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { IDB2BLead } from '../interfaces/IDB2BLead';
import { makeRequestWithRetry } from '../methods/requests';
import { validateLeadData } from '../methods/validation';
import { buildQueryString, safeJsonParse } from '../methods/utils';

export interface LeadServiceOptions {
	executeFunctions: IExecuteFunctions;
	credentials: any;
	accessToken: string;
	itemIndex: number;
}

export interface PaginationParams {
	limit?: number;
	page?: number;
}

export interface QueryParams {
	[key: string]: string | number | boolean;
}

export interface LeadGetOptions extends PaginationParams {
	fields?: string[];
	queryParams?: QueryParams;
}

export interface LeadCreateData {
	name: string;
	owner_id?: string;
	website?: string;
	description?: string;
	status_id?: string;
	source_id?: string;
	size_id?: string;
	industry_id?: string;
	main_contact_id?: string;
	contact_name?: string;
	contact_email?: string;
	contact_phone_number?: string;
}

export interface LeadUpdateData extends Partial<LeadCreateData> {}

export interface LeadImportData {
	file?: string;
	data?: IDB2BLead[];
	mapping?: Record<string, string>;
}

export interface GeocodeData {
	address?: string;
	latitude?: number;
	longitude?: number;
}

export interface NearbySearchParams extends PaginationParams {
	latitude: number;
	longitude: number;
	radius?: number;
	unit?: 'km' | 'miles';
}

export class LeadService {
	private executeFunctions: IExecuteFunctions;
	private credentials: any;
	private accessToken: string;
	private itemIndex: number;
	private baseUrl: string;

	constructor(options: LeadServiceOptions) {
		this.executeFunctions = options.executeFunctions;
		this.credentials = options.credentials;
		this.accessToken = options.accessToken;
		this.itemIndex = options.itemIndex;
		this.baseUrl = this.credentials.baseUrl;
	}

	private async makeRequest(options: {
		method: IHttpRequestMethods;
		endpoint: string;
		body?: any;
		qs?: any;
	}) {
		const { method, endpoint, body, qs } = options;

		return await makeRequestWithRetry(this.executeFunctions, {
			method,
			url: `${this.baseUrl}${endpoint}`,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
			body,
			qs,
			json: true,
		});
	}

	private validateLeadId(leadId: string): void {
		if (!leadId || typeof leadId !== 'string' || leadId.trim().length === 0) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				'Lead ID is required and must be a non-empty string',
				{ itemIndex: this.itemIndex }
			);
		}
	}

	private buildQueryString(queryParameters: any): Record<string, any> {
		const qs: Record<string, any> = {};
		if (queryParameters?.parameter) {
			queryParameters.parameter.forEach((param: any) => {
				if (param.name && param.value !== undefined) {
					qs[param.name] = param.value;
				}
			});
		}
		return qs;
	}

	async getAll(options: LeadGetOptions = {}): Promise<any> {
		const { limit = 50, page = 1, fields = [], queryParams = {} } = options;

		const qs: any = { limit, page };

		// Add additional query parameters
		Object.assign(qs, queryParams);

		const response = await this.makeRequest({
			method: 'GET',
			endpoint: '/leads',
			qs,
		});

		// Apply field filtering if specified
		if (fields.length > 0 && Array.isArray(response.data)) {
			return {
				...response,
				data: response.data.map((lead: IDB2BLead) => {
					const filteredLead: Partial<IDB2BLead> = {};
					fields.forEach(field => {
						if (field in lead) {
							(filteredLead as any)[field] = (lead as any)[field];
						}
					});
					return filteredLead;
				}),
			};
		}

		return response;
	}

	async getById(leadId: string): Promise<any> {
		this.validateLeadId(leadId);

		return await this.makeRequest({
			method: 'GET',
			endpoint: `/leads/${leadId.trim()}`,
		});
	}

	async create(leadData: LeadCreateData): Promise<any> {
		validateLeadData(leadData.name);

		const body: any = {
			name: leadData.name.trim(),
		};

		// Add optional fields
		const optionalFields = [
			'owner_id', 'website', 'description', 'status_id', 'source_id',
			'size_id', 'industry_id', 'main_contact_id', 'contact_name',
			'contact_email', 'contact_phone_number'
		];

		optionalFields.forEach(field => {
			if (leadData[field as keyof LeadCreateData]) {
				body[field] = leadData[field as keyof LeadCreateData];
			}
		});

		return await this.makeRequest({
			method: 'POST',
			endpoint: '/leads',
			body,
		});
	}

	async update(leadId: string, updateData: LeadUpdateData): Promise<any> {
		this.validateLeadId(leadId);

		if (updateData.name) {
			validateLeadData(updateData.name);
		}

		const body: any = {};

		// Add fields to update
		Object.keys(updateData).forEach(key => {
			const value = updateData[key as keyof LeadUpdateData];
			if (value !== undefined) {
				if (key === 'name' && typeof value === 'string') {
					body[key] = value.trim();
				} else {
					body[key] = value;
				}
			}
		});

		return await this.makeRequest({
			method: 'PATCH',
			endpoint: `/leads/${leadId.trim()}`,
			body,
		});
	}

	async delete(leadId: string): Promise<any> {
		this.validateLeadId(leadId);

		return await this.makeRequest({
			method: 'DELETE',
			endpoint: `/leads/${leadId.trim()}`,
		});
	}

	async bulkCreate(leads: LeadCreateData[]): Promise<any> {
		if (!Array.isArray(leads) || leads.length === 0) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				'Leads array is required and must not be empty',
				{ itemIndex: this.itemIndex }
			);
		}

		// Validate each lead
		leads.forEach((lead, index) => {
			try {
				validateLeadData(lead.name);
			} catch (error) {
				throw new NodeOperationError(
					this.executeFunctions.getNode(),
					`Lead at index ${index}: ${error instanceof Error ? error.message : 'Validation failed'}`,
					{ itemIndex: this.itemIndex }
				);
			}
		});

		return await this.makeRequest({
			method: 'POST',
			endpoint: '/leads/bulk',
			body: { leads },
		});
	}

	async bulkDelete(leadIds: string[]): Promise<any> {
		if (!Array.isArray(leadIds) || leadIds.length === 0) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				'Lead IDs array is required and must not be empty',
				{ itemIndex: this.itemIndex }
			);
		}

		// Validate each lead ID
		leadIds.forEach((id, index) => {
			if (!id || typeof id !== 'string' || id.trim().length === 0) {
				throw new NodeOperationError(
					this.executeFunctions.getNode(),
					`Invalid lead ID at index ${index}`,
					{ itemIndex: this.itemIndex }
				);
			}
		});

		return await this.makeRequest({
			method: 'DELETE',
			endpoint: '/leads/bulk',
			body: { lead_ids: leadIds.map(id => id.trim()) },
		});
	}

	async getCallLogs(leadId: string, options: PaginationParams = {}): Promise<any> {
		this.validateLeadId(leadId);

		const { limit = 50, page = 1 } = options;

		return await this.makeRequest({
			method: 'GET',
			endpoint: `/leads/${leadId.trim()}/call-logs`,
			qs: { limit, page },
		});
	}

	async assignNewContact(leadId: string, contactData: any): Promise<any> {
		this.validateLeadId(leadId);

		return await this.makeRequest({
			method: 'POST',
			endpoint: `/leads/${leadId.trim()}/assign-new-contact`,
			body: contactData,
		});
	}

	async assignContacts(leadId: string, contactIds: string[]): Promise<any> {
		this.validateLeadId(leadId);

		if (!Array.isArray(contactIds) || contactIds.length === 0) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				'Contact IDs array is required and must not be empty',
				{ itemIndex: this.itemIndex }
			);
		}

		return await this.makeRequest({
			method: 'POST',
			endpoint: `/leads/${leadId.trim()}/assign-contacts`,
			body: { contact_ids: contactIds },
		});
	}

	async removeContact(leadId: string, contactId: string): Promise<any> {
		this.validateLeadId(leadId);

		if (!contactId || typeof contactId !== 'string' || contactId.trim().length === 0) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				'Contact ID is required and must be a non-empty string',
				{ itemIndex: this.itemIndex }
			);
		}

		return await this.makeRequest({
			method: 'DELETE',
			endpoint: `/leads/${leadId.trim()}/contacts/${contactId.trim()}`,
		});
	}

	async import(importData: LeadImportData): Promise<any> {
		return await this.makeRequest({
			method: 'POST',
			endpoint: '/leads/import',
			body: importData,
		});
	}

	async getImportTemplate(): Promise<any> {
		return await this.makeRequest({
			method: 'GET',
			endpoint: '/leads/import/template',
		});
	}

	async geocode(leadId: string, geocodeData: GeocodeData): Promise<any> {
		this.validateLeadId(leadId);

		return await this.makeRequest({
			method: 'POST',
			endpoint: `/leads/${leadId.trim()}/geocode`,
			body: geocodeData,
		});
	}

	async searchNearby(params: NearbySearchParams): Promise<any> {
		const { latitude, longitude, radius = 10, unit = 'km', limit = 50, page = 1 } = params;

		if (typeof latitude !== 'number' || typeof longitude !== 'number') {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				'Latitude and longitude are required and must be numbers',
				{ itemIndex: this.itemIndex }
			);
		}

		return await this.makeRequest({
			method: 'GET',
			endpoint: '/leads/nearby/search',
			qs: {
				latitude,
				longitude,
				radius,
				unit,
				limit,
				page,
			},
		});
	}
}