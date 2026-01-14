import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	NodeOperationError,
} from 'n8n-workflow';

// Direct imports from specific files
import { IDB2BContact } from './interfaces/IDB2BContact';
import { IDB2BLead } from './interfaces/IDB2BLead';
import { getAccessToken, secureTokenCache } from './methods/authentication';
import { makeRequestWithRetry } from './methods/requests';
import { validateContactData, validateLeadData, validateEmail, validateBaseUrl } from './methods/validation';
import { buildQueryString, safeJsonParse, sanitizeErrorData } from './methods/utils';
import { LeadService } from './services/LeadService';
import { LeadOperations } from './handlers/LeadOperations';
import { resourceProperty, customEndpointProperty, customJsonBodyProperty, customQueryParametersProperty } from './descriptions/sharedProperties';
import { contactOperations, contactFields } from './descriptions/contactProperties';
import { leadOperations, leadFields } from './descriptions/leadProperties';
import { customOperations } from './descriptions/customProperties';

export class IDB2B implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'IDB2B CRM',
		name: 'idb2b',
		icon: 'file:idb2b.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with IDB2B API',
		defaults: {
			name: 'IDB2B',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'idb2bApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			resourceProperty,
			contactOperations,
			leadOperations,
			customOperations,
			...contactFields,
			...leadFields,
			customEndpointProperty,
			customJsonBodyProperty,
			customQueryParametersProperty,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Periodic cleanup of expired tokens
		if (Math.random() < 0.01) {
			secureTokenCache.cleanup();
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const credentials = await this.getCredentials('idb2bApi');

				// Validate credentials
				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials found. Please configure your IDB2B API credentials.', { itemIndex: i });
				}

				if (!credentials.email || !credentials.password || !credentials.baseUrl) {
					throw new NodeOperationError(this.getNode(), 'Incomplete credentials. Email, password, and base URL are required.', { itemIndex: i });
				}

				if (!validateEmail(credentials.email as string)) {
					throw new NodeOperationError(this.getNode(), 'Invalid email format in credentials.', { itemIndex: i });
				}

				if (!validateBaseUrl(credentials.baseUrl as string)) {
					throw new NodeOperationError(this.getNode(), 'Invalid base URL in credentials. Must be a valid HTTPS URL.', { itemIndex: i });
				}

				const accessToken = await getAccessToken(this, credentials);

				let method: IHttpRequestMethods = 'GET';
				let endpoint = '';
				let body: any = undefined;
				let qs: any = {};

				// Handle Contact operations
				if (resource === 'contact') {
					if (operation === 'getAll') {
						method = 'GET';
						endpoint = '/contacts';

						const limit = this.getNodeParameter('limit', i, 50) as number;
						const page = this.getNodeParameter('page', i, 1) as number;
						qs.limit = limit;
						qs.page = page;

						const queryParameters = this.getNodeParameter('queryParameters', i, {}) as any;
						const additionalQs = buildQueryString(queryParameters);
						qs = { ...qs, ...additionalQs };
					} else if (operation === 'create') {
						method = 'POST';
						endpoint = '/contacts';
						const name = this.getNodeParameter('name', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const phone_number = this.getNodeParameter('phone_number', i, '') as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

						validateContactData(name, email);

						body = {
							name: name.trim(),
							email: email.trim(),
							...(phone_number && { phone_number }),
						};

						// Add additional fields
						if (additionalFields.user_id) {
							body.user_id = additionalFields.user_id;
						}
						if (additionalFields.lead_id) {
							body.lead_id = additionalFields.lead_id;
						}
						if (typeof additionalFields.favorites === 'boolean') {
							body.favorites = additionalFields.favorites;
						}

						// Process tags if provided
						if (additionalFields.tags && additionalFields.tags.tag) {
							body.tags = additionalFields.tags.tag.map((tag: any) => ({
								name: tag.name.trim(),
							}));
						}
					}
				}
				// Handle Lead operations
				else if (resource === 'lead') {
					const leadService = new LeadService({
						executeFunctions: this,
						credentials,
						accessToken,
						itemIndex: i,
					});

					const leadOperations = new LeadOperations(leadService, this, i);
					const response = await leadOperations.execute(operation);

					returnData.push({
						json: response,
						pairedItem: { item: i },
					});
					continue;
				}
				// Handle Custom operations
				else if (resource === 'custom') {
					endpoint = this.getNodeParameter('endpoint', i) as string;

					if (!endpoint || typeof endpoint !== 'string') {
						throw new NodeOperationError(this.getNode(), 'Endpoint is required for custom requests', { itemIndex: i });
					}

					if (!endpoint.startsWith('/')) {
						endpoint = '/' + endpoint;
					}

					method = operation.toUpperCase() as IHttpRequestMethods;

					if (['post', 'put'].includes(operation)) {
						const jsonBody = this.getNodeParameter('jsonBody', i) as string;
						if (jsonBody && jsonBody.trim()) {
							body = safeJsonParse(jsonBody, 'JSON Body');
						}
					}

					const queryParameters = this.getNodeParameter('queryParameters', i, {}) as any;
					qs = buildQueryString(queryParameters);
				}

				// Only execute request for contact and custom operations
				if (resource === 'contact' || resource === 'custom') {
					const response = await makeRequestWithRetry(this, {
						method,
						url: `${credentials.baseUrl}${endpoint}`,
						headers: {
							Authorization: `Bearer ${accessToken}`,
						},
						body,
						qs,
						json: true,
					});

					let processedResponse = response;

					// Apply field filtering for contact getAll operations
					if (resource === 'contact' && operation === 'getAll') {
						const fieldsToReturn = this.getNodeParameter('fields', i, []) as string[];
						if (fieldsToReturn.length > 0 && Array.isArray(response.data)) {
							processedResponse = {
								...response,
								data: response.data.map((item: IDB2BContact) => {
									const filteredItem: Partial<IDB2BContact> = {};
									fieldsToReturn.forEach(field => {
										if (field in item) {
											(filteredItem as any)[field] = (item as any)[field];
										}
									});
									return filteredItem;
								})
							};
						}
					}

					returnData.push({
						json: processedResponse as any,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					let errorData: any = { error: 'Unknown error occurred' };

					if (error instanceof Error) {
						errorData.error = error.message;

						if ('response' in error && error.response) {
							const response = error.response as any;
							errorData.statusCode = response.status || response.statusCode;
							errorData.statusText = response.statusText;

							if (response.data) {
								const sanitizedData = sanitizeErrorData(response.data);
								if (Object.keys(sanitizedData).length > 0) {
									errorData.details = sanitizedData;
								}
							}

							switch (response.status || response.statusCode) {
								case 401:
									const credentials = await this.getCredentials('idb2bApi');
									const cacheKey = `${credentials.baseUrl}:${credentials.email}`;
									secureTokenCache.invalidate(cacheKey);
									errorData.error = 'Authentication failed - check credentials';
									break;
								case 403:
									errorData.error = 'Access forbidden - insufficient permissions';
									break;
								case 404:
									errorData.error = 'Resource not found';
									break;
								case 422:
									errorData.error = 'Validation error - check input data';
									break;
								case 429:
									errorData.error = 'Rate limit exceeded - please retry later';
									break;
								case 500:
									errorData.error = 'Internal server error';
									break;
							}
						}
					}

					returnData.push({
						json: errorData,
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}