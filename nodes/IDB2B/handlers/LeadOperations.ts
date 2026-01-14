import { IExecuteFunctions } from 'n8n-workflow';
import { LeadService } from '../services/LeadService';
import { safeJsonParse } from '../methods/utils';

export class LeadOperations {
	private leadService: LeadService;
	private executeFunctions: IExecuteFunctions;
	private itemIndex: number;

	constructor(leadService: LeadService, executeFunctions: IExecuteFunctions, itemIndex: number) {
		this.leadService = leadService;
		this.executeFunctions = executeFunctions;
		this.itemIndex = itemIndex;
	}

	async execute(operation: string): Promise<any> {
		switch (operation) {
			case 'getAll':
				return this.handleGetAll();
			case 'get':
				return this.handleGet();
			case 'create':
				return this.handleCreate();
			case 'update':
				return this.handleUpdate();
			case 'delete':
				return this.handleDelete();
			case 'createMultiple':
				return this.handleCreateMultiple();
			case 'deleteMultiple':
				return this.handleDeleteMultiple();
			case 'getCallLogs':
				return this.handleGetCallLogs();
			case 'assignNewContact':
				return this.handleAssignNewContact();
			case 'assignContacts':
				return this.handleAssignContacts();
			case 'removeContact':
				return this.handleRemoveContact();
			case 'import':
				return this.handleImport();
			case 'getImportTemplate':
				return this.handleGetImportTemplate();
			case 'geocode':
				return this.handleGeocode();
			case 'searchNearby':
				return this.handleSearchNearby();
			default:
				throw new Error(`Unknown operation: ${operation}`);
		}
	}

	private async handleGetAll(): Promise<any> {
		const limit = this.executeFunctions.getNodeParameter('limit', this.itemIndex, 50) as number;
		const page = this.executeFunctions.getNodeParameter('page', this.itemIndex, 1) as number;
		const fields = this.executeFunctions.getNodeParameter('fields', this.itemIndex, []) as string[];
		const queryParameters = this.executeFunctions.getNodeParameter('queryParameters', this.itemIndex, {}) as any;

		// Build query parameters
		const queryParams: any = {};
		if (queryParameters?.parameter) {
			queryParameters.parameter.forEach((param: any) => {
				if (param.name && param.value !== undefined) {
					queryParams[param.name] = param.value;
				}
			});
		}

		return await this.leadService.getAll({
			limit,
			page,
			fields,
			queryParams,
		});
	}

	private async handleGet(): Promise<any> {
		const leadId = this.executeFunctions.getNodeParameter('leadId', this.itemIndex) as string;
		return await this.leadService.getById(leadId);
	}

	private async handleCreate(): Promise<any> {
		const name = this.executeFunctions.getNodeParameter('name', this.itemIndex) as string;
		const additionalFields = this.executeFunctions.getNodeParameter('additionalFields', this.itemIndex, {}) as any;

		const leadData: any = {
			name: name.trim(),
		};

		// Add additional fields
		const optionalFields = [
			'owner_id', 'website', 'description', 'status_id', 'source_id',
			'size_id', 'industry_id', 'main_contact_id', 'contact_name',
			'contact_email', 'contact_phone_number'
		];

		optionalFields.forEach(field => {
			if (additionalFields[field] !== undefined) {
				leadData[field] = additionalFields[field];
			}
		});

		return await this.leadService.create(leadData);
	}

	private async handleUpdate(): Promise<any> {
		const leadId = this.executeFunctions.getNodeParameter('leadId', this.itemIndex) as string;
		const name = this.executeFunctions.getNodeParameter('name', this.itemIndex, '') as string;
		const additionalFields = this.executeFunctions.getNodeParameter('additionalFields', this.itemIndex, {}) as any;

		const updateData: any = {};

		// Add name if provided
		if (name && name.trim()) {
			updateData.name = name.trim();
		}

		// Add additional fields
		const optionalFields = [
			'owner_id', 'website', 'description', 'status_id', 'source_id',
			'size_id', 'industry_id', 'main_contact_id', 'contact_name',
			'contact_email', 'contact_phone_number'
		];

		optionalFields.forEach(field => {
			if (additionalFields[field] !== undefined) {
				updateData[field] = additionalFields[field];
			}
		});

		return await this.leadService.update(leadId, updateData);
	}

	private async handleDelete(): Promise<any> {
		const leadId = this.executeFunctions.getNodeParameter('leadId', this.itemIndex) as string;
		return await this.leadService.delete(leadId);
	}

	private async handleCreateMultiple(): Promise<any> {
		const leadsDataString = this.executeFunctions.getNodeParameter('leadsData', this.itemIndex) as string;
		const leadsData = safeJsonParse(leadsDataString, 'Leads Data');

		if (!Array.isArray(leadsData)) {
			throw new Error('Leads data must be an array');
		}

		return await this.leadService.bulkCreate(leadsData);
	}

	private async handleDeleteMultiple(): Promise<any> {
		const leadIdsString = this.executeFunctions.getNodeParameter('leadIds', this.itemIndex) as string;
		const leadIds = leadIdsString.split(',').map(id => id.trim()).filter(id => id);

		if (leadIds.length === 0) {
			throw new Error('At least one lead ID is required');
		}

		return await this.leadService.bulkDelete(leadIds);
	}

	private async handleGetCallLogs(): Promise<any> {
		const leadId = this.executeFunctions.getNodeParameter('leadId', this.itemIndex) as string;
		const limit = this.executeFunctions.getNodeParameter('limit', this.itemIndex, 50) as number;
		const page = this.executeFunctions.getNodeParameter('page', this.itemIndex, 1) as number;

		return await this.leadService.getCallLogs(leadId, { limit, page });
	}

	private async handleAssignNewContact(): Promise<any> {
		const leadId = this.executeFunctions.getNodeParameter('leadId', this.itemIndex) as string;
		const newContactData = this.executeFunctions.getNodeParameter('newContactData', this.itemIndex, {}) as any;

		return await this.leadService.assignNewContact(leadId, newContactData);
	}

	private async handleAssignContacts(): Promise<any> {
		const leadId = this.executeFunctions.getNodeParameter('leadId', this.itemIndex) as string;
		const contactIdsString = this.executeFunctions.getNodeParameter('contactIds', this.itemIndex) as string;
		const contactIds = contactIdsString.split(',').map(id => id.trim()).filter(id => id);

		if (contactIds.length === 0) {
			throw new Error('At least one contact ID is required');
		}

		return await this.leadService.assignContacts(leadId, contactIds);
	}

	private async handleRemoveContact(): Promise<any> {
		const leadId = this.executeFunctions.getNodeParameter('leadId', this.itemIndex) as string;
		const contactId = this.executeFunctions.getNodeParameter('contactId', this.itemIndex) as string;

		return await this.leadService.removeContact(leadId, contactId);
	}

	private async handleImport(): Promise<any> {
		const importData = this.executeFunctions.getNodeParameter('importData', this.itemIndex, {}) as any;

		const data: any = {};

		if (importData.file) {
			data.file = importData.file;
		}

		if (importData.mapping) {
			data.mapping = safeJsonParse(importData.mapping, 'Field Mapping');
		}

		return await this.leadService.import(data);
	}

	private async handleGetImportTemplate(): Promise<any> {
		return await this.leadService.getImportTemplate();
	}

	private async handleGeocode(): Promise<any> {
		const leadId = this.executeFunctions.getNodeParameter('leadId', this.itemIndex) as string;
		const geocodeData = this.executeFunctions.getNodeParameter('geocodeData', this.itemIndex, {}) as any;

		return await this.leadService.geocode(leadId, geocodeData);
	}

	private async handleSearchNearby(): Promise<any> {
		const latitude = this.executeFunctions.getNodeParameter('latitude', this.itemIndex) as number;
		const longitude = this.executeFunctions.getNodeParameter('longitude', this.itemIndex) as number;
		const limit = this.executeFunctions.getNodeParameter('limit', this.itemIndex, 50) as number;
		const page = this.executeFunctions.getNodeParameter('page', this.itemIndex, 1) as number;
		const searchOptions = this.executeFunctions.getNodeParameter('searchOptions', this.itemIndex, {}) as any;

		const params: any = {
			latitude,
			longitude,
			limit,
			page,
		};

		if (searchOptions.radius !== undefined) {
			params.radius = searchOptions.radius;
		}

		if (searchOptions.unit) {
			params.unit = searchOptions.unit;
		}

		return await this.leadService.searchNearby(params);
	}
}