import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

interface IDB2BContact {
	id: string;
	organization_id: string;
	name: string;
	phone_number?: string;
	email?: string;
	user_id: string;
	lead_id?: string;
	created_at: string;
	updated_at: string;
	lead?: any;
	favorites: boolean;
	tags: Array<{
		id: string;
		organization_id: string;
		name: string;
	}>;
}

interface IDB2BLead {
	id?: string;
	owner_id?: string;
	name: string;
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
	organization_id?: string;
	created_at?: string;
	updated_at?: string;
}

interface IDB2BLeadActivity {
	id?: string;
	lead_id?: string;
	icon?: string;
	subject: string;
	description?: string;
	datetime?: string;
	user_id?: string;
	attachments?: string[];
	attachments_to_delete?: string[];
	created_at?: string;
	updated_at?: string;
}

interface IDB2BLoginResponse {
	data: {
		session: {
			access_token: string;
			refresh_token?: string;
			expires_at?: string;
		};
		user: {
			id: string;
			email: string;
			name?: string;
		};
	};
}

interface TokenCache {
	encrypted_token: string;
	iv: string;
	expires_at: Date;
	baseUrl: string;
	credentials_hash: string;
}

class SecureTokenCache {
	private cache: Map<string, TokenCache> = new Map();
	private readonly algorithm = 'aes-256-cbc';

	private getEncryptionKey(credentials: any): Buffer {
		const keyMaterial = `${credentials.email}:${credentials.password}:${credentials.baseUrl}`;
		return createHash('sha256').update(keyMaterial).digest();
	}

	private generateCredentialsHash(credentials: any): string {
		const credentialsString = `${credentials.email}:${credentials.baseUrl}`;
		return createHash('sha256').update(credentialsString).digest('hex');
	}

	private encryptToken(token: string, credentials: any): { encrypted: string; iv: string } {
		const key = this.getEncryptionKey(credentials);
		const iv = randomBytes(16);
		const cipher = createCipheriv(this.algorithm, key, iv);

		let encrypted = cipher.update(token, 'utf8', 'hex');
		encrypted += cipher.final('hex');

		return {
			encrypted,
			iv: iv.toString('hex')
		};
	}

	private decryptToken(encryptedToken: string, iv: string, credentials: any): string {
		try {
			const key = this.getEncryptionKey(credentials);
			const decipher = createDecipheriv(this.algorithm, key, Buffer.from(iv, 'hex'));

			let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
			decrypted += decipher.final('utf8');

			return decrypted;
		} catch (error) {
			throw new Error('Failed to decrypt token - credentials may have changed');
		}
	}

	set(cacheKey: string, token: string, expiresAt: Date, credentials: any): void {
		const { encrypted, iv } = this.encryptToken(token, credentials);
		const credentialsHash = this.generateCredentialsHash(credentials);

		this.cache.set(cacheKey, {
			encrypted_token: encrypted,
			iv,
			expires_at: expiresAt,
			baseUrl: credentials.baseUrl,
			credentials_hash: credentialsHash
		});
	}

	get(cacheKey: string, credentials: any): string | null {
		const cached = this.cache.get(cacheKey);

		if (!cached) {
			return null;
		}

		// Check if token has expired
		if (cached.expires_at <= new Date()) {
			this.cache.delete(cacheKey);
			return null;
		}

		// Check if credentials have changed
		const currentCredentialsHash = this.generateCredentialsHash(credentials);
		if (cached.credentials_hash !== currentCredentialsHash) {
			this.cache.delete(cacheKey);
			return null;
		}

		try {
			return this.decryptToken(cached.encrypted_token, cached.iv, credentials);
		} catch (error) {
			// If decryption fails, remove the cached entry
			this.cache.delete(cacheKey);
			return null;
		}
	}

	invalidate(cacheKey: string): void {
		this.cache.delete(cacheKey);
	}

	invalidateAll(): void {
		this.cache.clear();
	}

	// Clean up expired tokens periodically
	cleanup(): void {
		const now = new Date();
		for (const [key, value] of this.cache.entries()) {
			if (value.expires_at <= now) {
				this.cache.delete(key);
			}
		}
	}

	// Invalidate tokens for specific base URL (useful for security incidents)
	invalidateByBaseUrl(baseUrl: string): void {
		for (const [key, value] of this.cache.entries()) {
			if (value.baseUrl === baseUrl) {
				this.cache.delete(key);
			}
		}
	}

	// Get cache statistics for monitoring
	getStats(): { totalEntries: number; expiredEntries: number } {
		const now = new Date();
		let expiredCount = 0;

		for (const value of this.cache.values()) {
			if (value.expires_at <= now) {
				expiredCount++;
			}
		}

		return {
			totalEntries: this.cache.size,
			expiredEntries: expiredCount
		};
	}
}

const secureTokenCache = new SecureTokenCache();

interface RequestOptions {
	method: IHttpRequestMethods;
	url: string;
	headers?: any;
	body?: any;
	qs?: any;
	json?: boolean;
}

async function makeRequestWithRetry(
	executeFunctions: IExecuteFunctions,
	options: RequestOptions,
	maxRetries = 3,
	initialDelay = 1000
): Promise<any> {
	let lastError: any;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await executeFunctions.helpers.httpRequest(options);
		} catch (error: any) {
			lastError = error;

			// Don't retry on certain status codes
			if (error.response?.status && [400, 401, 403, 404, 422].includes(error.response.status)) {
				throw error;
			}

			// Don't retry on the last attempt
			if (attempt === maxRetries) {
				throw error;
			}

			// Handle rate limiting (429)
			if (error.response?.status === 429) {
				const retryAfter = error.response.headers?.['retry-after'];
				const delay = retryAfter ? parseInt(retryAfter) * 1000 : initialDelay * Math.pow(2, attempt);
				await new Promise(resolve => setTimeout(resolve, Math.min(delay, 30000))); // Max 30s delay
			} else {
				// Exponential backoff for other errors
				const delay = initialDelay * Math.pow(2, attempt);
				await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000))); // Max 10s delay
			}
		}
	}

	throw lastError;
}

async function getAccessToken(
	executeFunctions: IExecuteFunctions,
	credentials: any,
): Promise<string> {
	const cacheKey = `${credentials.baseUrl}:${credentials.email}`;

	// Try to get cached token
	const cachedToken = secureTokenCache.get(cacheKey, credentials);
	if (cachedToken) {
		return cachedToken;
	}

	try {
		const loginResponse = await makeRequestWithRetry(executeFunctions, {
			method: 'POST',
			url: `${credentials.baseUrl}/login`,
			body: {
				email: credentials.email,
				password: credentials.password,
			},
			json: true,
		});

		const accessToken = loginResponse.data.session.access_token;
		if (!accessToken) {
			throw new Error('No access token received from authentication response');
		}

		// Cache for 50 minutes instead of 1 hour for safety margin
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + 50);

		secureTokenCache.set(cacheKey, accessToken, expiresAt, credentials);

		return accessToken;
	} catch (error) {
		// Clean up any invalid cached tokens on auth failure
		secureTokenCache.invalidate(cacheKey);

		throw new NodeApiError(executeFunctions.getNode(), error as any, {
			message: 'Authentication failed',
			description: 'Failed to authenticate with IDB2B API',
		});
	}
}

function buildQueryString(queryParameters: any): Record<string, any> {
	const qs: Record<string, any> = {};
	if (queryParameters.parameter) {
		queryParameters.parameter.forEach((param: any) => {
			if (param.name && param.value) {
				qs[param.name] = param.value;
			}
		});
	}
	return qs;
}

function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

function validateContactData(name: string, email: string): void {
	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		throw new Error('Contact name is required and must be a non-empty string');
	}

	if (name.trim().length > 255) {
		throw new Error('Contact name cannot exceed 255 characters');
	}

	if (!email || typeof email !== 'string' || email.trim().length === 0) {
		throw new Error('Contact email is required and must be a non-empty string');
	}

	if (email.length > 320) {
		throw new Error('Email address cannot exceed 320 characters');
	}

	if (!validateEmail(email)) {
		throw new Error('Invalid email format - please provide a valid email address');
	}
}

function validateLeadData(name: string): void {
	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		throw new Error('Lead name is required and must be a non-empty string');
	}

	if (name.trim().length > 255) {
		throw new Error('Lead name cannot exceed 255 characters');
	}
}

function safeJsonParse(jsonString: string, fieldName: string): any {
	if (!jsonString || typeof jsonString !== 'string') {
		throw new Error(`${fieldName} must be a valid JSON string`);
	}

	try {
		const parsed = JSON.parse(jsonString);
		if (parsed === null) {
			throw new Error(`${fieldName} cannot be null`);
		}
		return parsed;
	} catch (error) {
		throw new Error(`Invalid JSON in ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

function validateBaseUrl(url: string): boolean {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.protocol === 'https:' && parsedUrl.hostname.length > 0;
	} catch {
		return false;
	}
}

function sanitizeErrorData(data: any): any {
	if (!data || typeof data !== 'object') {
		return {};
	}

	const sanitized: any = {};
	const allowedFields = ['message', 'error', 'code', 'type', 'validation_errors'];

	for (const field of allowedFields) {
		if (data[field] !== undefined) {
			// Ensure no sensitive data is included
			if (typeof data[field] === 'string' && data[field].length < 500) {
				sanitized[field] = data[field];
			} else if (typeof data[field] === 'object' && field === 'validation_errors') {
				sanitized[field] = data[field];
			}
		}
	}

	return sanitized;
}

export class IDB2B implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'IDB2B CRM',
		name: 'idb2b',
		icon: 'file:Icon.svg',
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
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Lead',
						value: 'lead',
					},
					{
						name: 'Lead Activities',
						value: 'leadActivities',
					},
					{
						name: 'Custom',
						value: 'custom',
					},
				],
				default: 'contact',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['contact'],
					},
				},
				options: [
					{
						name: 'Get All',
						value: 'getAll',
						action: 'Get all contacts',
						description: 'Retrieve all contacts',
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Create a contact',
						description: 'Create a new contact',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['lead'],
					},
				},
				options: [
					{
						name: 'Get All',
						value: 'getAll',
						action: 'Get all leads',
						description: 'Retrieve all leads',
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Create a lead',
						description: 'Create a new lead',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['leadActivities'],
					},
				},
				options: [
					{
						name: 'Get All',
						value: 'getAll',
						action: 'Get all activities for a lead',
						description: 'Retrieve all activities for a specific lead',
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Create a lead activity',
						description: 'Create a new activity for a lead',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['custom'],
					},
				},
				options: [
					{
						name: 'GET Request',
						value: 'get',
						action: 'Execute a GET request',
						routing: {
							request: {
								method: 'GET',
							},
						},
					},
					{
						name: 'POST Request',
						value: 'post',
						action: 'Execute a POST request',
						routing: {
							request: {
								method: 'POST',
							},
						},
					},
					{
						name: 'PUT Request',
						value: 'put',
						action: 'Execute a PUT request',
						routing: {
							request: {
								method: 'PUT',
							},
						},
					},
					{
						name: 'DELETE Request',
						value: 'delete',
						action: 'Execute a DELETE request',
						routing: {
							request: {
								method: 'DELETE',
							},
						},
					},
				],
				default: 'get',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['create'],
					},
				},
				description: 'Contact name',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['create'],
					},
				},
				description: 'Contact email',
			},
			{
				displayName: 'Phone Number',
				name: 'phone_number',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['create'],
					},
				},
				description: 'Contact phone number',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'User ID',
						name: 'user_id',
						type: 'string',
						default: '',
						description: 'ID of the user to associate with this contact',
					},
					{
						displayName: 'Lead ID',
						name: 'lead_id',
						type: 'string',
						default: '',
						description: 'ID of the lead to associate with this contact',
					},
					{
						displayName: 'Favorites',
						name: 'favorites',
						type: 'boolean',
						default: false,
						description: 'Mark contact as favorite',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						placeholder: 'Add Tag',
						description: 'Tags to associate with the contact',
						options: [
							{
								name: 'tag',
								displayName: 'Tag',
								values: [
									{
										displayName: 'Tag Name',
										name: 'name',
										type: 'string',
										default: '',
										required: true,
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['create'],
					},
				},
				description: 'Lead name',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Owner ID',
						name: 'owner_id',
						type: 'string',
						default: '',
						description: 'ID of the user who owns this lead',
					},
					{
						displayName: 'Website',
						name: 'website',
						type: 'string',
						default: '',
						description: 'Lead website URL',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Lead description',
					},
					{
						displayName: 'Status ID',
						name: 'status_id',
						type: 'string',
						default: '',
						description: 'Lead status ID',
					},
					{
						displayName: 'Source ID',
						name: 'source_id',
						type: 'string',
						default: '',
						description: 'Lead source ID',
					},
					{
						displayName: 'Size ID',
						name: 'size_id',
						type: 'string',
						default: '',
						description: 'Lead size ID',
					},
					{
						displayName: 'Industry ID',
						name: 'industry_id',
						type: 'string',
						default: '',
						description: 'Lead industry ID',
					},
					{
						displayName: 'Main Contact ID',
						name: 'main_contact_id',
						type: 'string',
						default: '',
						description: 'ID of the main contact for this lead',
					},
					{
						displayName: 'Contact Name',
						name: 'contact_name',
						type: 'string',
						default: '',
						description: 'Name of the main contact',
					},
					{
						displayName: 'Contact Email',
						name: 'contact_email',
						type: 'string',
						default: '',
						description: 'Email of the main contact',
					},
					{
						displayName: 'Contact Phone Number',
						name: 'contact_phone_number',
						type: 'string',
						default: '',
						description: 'Phone number of the main contact',
					},
				],
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Maximum number of leads to return',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Page number to retrieve',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Fields to Return',
				name: 'fields',
				type: 'multiOptions',
				default: [],
				description: 'Select specific fields to return (leave empty for all fields)',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Name',
						value: 'name',
					},
					{
						name: 'Website',
						value: 'website',
					},
					{
						name: 'Description',
						value: 'description',
					},
					{
						name: 'Owner ID',
						value: 'owner_id',
					},
					{
						name: 'Status ID',
						value: 'status_id',
					},
					{
						name: 'Source ID',
						value: 'source_id',
					},
					{
						name: 'Size ID',
						value: 'size_id',
					},
					{
						name: 'Industry ID',
						value: 'industry_id',
					},
					{
						name: 'Main Contact ID',
						value: 'main_contact_id',
					},
					{
						name: 'Contact Name',
						value: 'contact_name',
					},
					{
						name: 'Contact Email',
						value: 'contact_email',
					},
					{
						name: 'Contact Phone Number',
						value: 'contact_phone_number',
					},
					{
						name: 'Created At',
						value: 'created_at',
					},
					{
						name: 'Updated At',
						value: 'updated_at',
					},
				],
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Parameter',
				description: 'Additional query parameters',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Lead ID',
				name: 'lead_id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['leadActivities'],
						operation: ['create', 'getAll'],
					},
				},
				description: 'ID of the lead to get activities for or add activity to',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['leadActivities'],
						operation: ['create'],
					},
				},
				description: 'Subject of the activity',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['leadActivities'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Icon',
						name: 'icon',
						type: 'string',
						default: '',
						description: 'Icon for the activity',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Description of the activity',
					},
					{
						displayName: 'Date and Time',
						name: 'datetime',
						type: 'string',
						default: '',
						placeholder: '2025-10-13T10:00:00Z',
						description: 'Date and time of the activity (ISO format)',
					},
					{
						displayName: 'User ID',
						name: 'user_id',
						type: 'string',
						default: '',
						description: 'User ID associated with the activity',
					},
					{
						displayName: 'Attachments',
						name: 'attachments',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						placeholder: 'Add Attachment',
						description: 'Attachment files for the activity',
						options: [
							{
								name: 'attachment',
								displayName: 'Attachment',
								values: [
									{
										displayName: 'File Path/URL',
										name: 'file',
										type: 'string',
										default: '',
										required: true,
									},
								],
							},
						],
					},
					{
						displayName: 'Attachments to Delete',
						name: 'attachments_to_delete',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						placeholder: 'Add Attachment ID',
						description: 'Array of attachment IDs to delete (for updates)',
						options: [
							{
								name: 'attachment_id',
								displayName: 'Attachment ID',
								values: [
									{
										displayName: 'ID',
										name: 'id',
										type: 'string',
										default: '',
										required: true,
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Maximum number of activities to return',
				displayOptions: {
					show: {
						resource: ['leadActivities'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Page number to retrieve',
				displayOptions: {
					show: {
						resource: ['leadActivities'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Fields to Return',
				name: 'fields',
				type: 'multiOptions',
				default: [],
				description: 'Select specific fields to return (leave empty for all fields)',
				displayOptions: {
					show: {
						resource: ['leadActivities'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Lead ID',
						value: 'lead_id',
					},
					{
						name: 'Icon',
						value: 'icon',
					},
					{
						name: 'Subject',
						value: 'subject',
					},
					{
						name: 'Description',
						value: 'description',
					},
					{
						name: 'Date and Time',
						value: 'datetime',
					},
					{
						name: 'User ID',
						value: 'user_id',
					},
					{
						name: 'Attachments',
						value: 'attachments',
					},
					{
						name: 'Created At',
						value: 'created_at',
					},
					{
						name: 'Updated At',
						value: 'updated_at',
					},
				],
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Parameter',
				description: 'Additional query parameters',
				displayOptions: {
					show: {
						resource: ['leadActivities'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Endpoint',
				name: 'endpoint',
				type: 'string',
				default: '/api/v1/',
				placeholder: '/api/v1/resource',
				description: 'The endpoint to call',
				displayOptions: {
					show: {
						resource: ['custom'],
					},
				},
				routing: {
					request: {
						url: '={{$value}}',
					},
				},
			},
			{
				displayName: 'JSON Body',
				name: 'jsonBody',
				type: 'json',
				default: '{}',
				description: 'JSON body for POST/PUT requests',
				displayOptions: {
					show: {
						operation: ['post', 'put'],
						resource: ['custom'],
					},
				},
				routing: {
					request: {
						body: '={{JSON.parse($value)}}',
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Maximum number of contacts to return',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Page number to retrieve',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Fields to Return',
				name: 'fields',
				type: 'multiOptions',
				default: [],
				description: 'Select specific fields to return (leave empty for all fields)',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Name',
						value: 'name',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Phone Number',
						value: 'phone_number',
					},
					{
						name: 'Organization ID',
						value: 'organization_id',
					},
					{
						name: 'Created At',
						value: 'created_at',
					},
					{
						name: 'Updated At',
						value: 'updated_at',
					},
					{
						name: 'Favorites',
						value: 'favorites',
					},
					{
						name: 'Tags',
						value: 'tags',
					},
				],
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Parameter',
				description: 'Additional query parameters',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Parameter',
				displayOptions: {
					show: {
						resource: ['custom'],
					},
				},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Periodic cleanup of expired tokens (run cleanup every 100 executions)
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

				if (resource === 'contact') {
					if (operation === 'getAll') {
						method = 'GET';
						endpoint = '/contacts';

						// Add pagination parameters
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const page = this.getNodeParameter('page', i, 1) as number;
						qs.limit = limit;
						qs.page = page;

						// Add additional query parameters
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

						// Validate required fields
						validateContactData(name, email);

						// Build contact data object
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
				} else if (resource === 'lead') {
					if (operation === 'getAll') {
						method = 'GET';
						endpoint = '/leads';

						// Add pagination parameters
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const page = this.getNodeParameter('page', i, 1) as number;
						qs.limit = limit;
						qs.page = page;

						// Add additional query parameters
						const queryParameters = this.getNodeParameter('queryParameters', i, {}) as any;
						const additionalQs = buildQueryString(queryParameters);
						qs = { ...qs, ...additionalQs };
					} else if (operation === 'create') {
						method = 'POST';
						endpoint = '/leads';
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

						// Validate required fields
						validateLeadData(name);

						// Build lead data object
						body = {
							name: name.trim(),
						};

						// Add additional fields if provided
						if (additionalFields.owner_id) {
							body.owner_id = additionalFields.owner_id;
						}
						if (additionalFields.website) {
							body.website = additionalFields.website;
						}
						if (additionalFields.description) {
							body.description = additionalFields.description;
						}
						if (additionalFields.status_id) {
							body.status_id = additionalFields.status_id;
						}
						if (additionalFields.source_id) {
							body.source_id = additionalFields.source_id;
						}
						if (additionalFields.size_id) {
							body.size_id = additionalFields.size_id;
						}
						if (additionalFields.industry_id) {
							body.industry_id = additionalFields.industry_id;
						}
						if (additionalFields.main_contact_id) {
							body.main_contact_id = additionalFields.main_contact_id;
						}
						if (additionalFields.contact_name) {
							body.contact_name = additionalFields.contact_name;
						}
						if (additionalFields.contact_email) {
							body.contact_email = additionalFields.contact_email;
						}
						if (additionalFields.contact_phone_number) {
							body.contact_phone_number = additionalFields.contact_phone_number;
						}
					}
				} else if (resource === 'leadActivities') {
					if (operation === 'getAll') {
						method = 'GET';
						const leadId = this.getNodeParameter('lead_id', i) as string;

						// Validate required fields
						if (!leadId || typeof leadId !== 'string' || leadId.trim().length === 0) {
							throw new NodeOperationError(this.getNode(), 'Lead ID is required and must be a non-empty string', { itemIndex: i });
						}

						endpoint = `/leads/${leadId.trim()}/activities`;

						// Add pagination parameters
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const page = this.getNodeParameter('page', i, 1) as number;
						qs.limit = limit;
						qs.page = page;

						// Add additional query parameters
						const queryParameters = this.getNodeParameter('queryParameters', i, {}) as any;
						const additionalQs = buildQueryString(queryParameters);
						qs = { ...qs, ...additionalQs };
					} else if (operation === 'create') {
						method = 'POST';
						const leadId = this.getNodeParameter('lead_id', i) as string;
						const subject = this.getNodeParameter('subject', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

						// Validate required fields
						if (!leadId || typeof leadId !== 'string' || leadId.trim().length === 0) {
							throw new NodeOperationError(this.getNode(), 'Lead ID is required and must be a non-empty string', { itemIndex: i });
						}
						if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
							throw new NodeOperationError(this.getNode(), 'Subject is required and must be a non-empty string', { itemIndex: i });
						}

						endpoint = `/leads/${leadId.trim()}/activities`;

						// Build activity data object
						body = {
							subject: subject.trim(),
						};

						// Add additional fields if provided
						if (additionalFields.icon) {
							body.icon = additionalFields.icon;
						}
						if (additionalFields.description) {
							body.description = additionalFields.description;
						}
						if (additionalFields.datetime) {
							body.datetime = additionalFields.datetime;
						}
						if (additionalFields.user_id) {
							body.user_id = additionalFields.user_id;
						}

						// Process attachments if provided
						if (additionalFields.attachments && additionalFields.attachments.attachment) {
							body.attachments = additionalFields.attachments.attachment.map((attachment: any) => attachment.file);
						}

						// Process attachments to delete if provided
						if (additionalFields.attachments_to_delete && additionalFields.attachments_to_delete.attachment_id) {
							body.attachments_to_delete = additionalFields.attachments_to_delete.attachment_id.map((attachment: any) => attachment.id);
						}
					}
				} else if (resource === 'custom') {
					endpoint = this.getNodeParameter('endpoint', i) as string;

					// Validate endpoint
					if (!endpoint || typeof endpoint !== 'string') {
						throw new NodeOperationError(this.getNode(), 'Endpoint is required for custom requests', { itemIndex: i });
					}

					// Ensure endpoint starts with /
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

				// Enhance response for create operations
				if (operation === 'create' && (resource === 'lead' || resource === 'leadActivities')) {
					// For lead and leadActivities creation, ensure the response includes the data with ID
					if (response.message === 'success' && response.data) {
						// API returned actual data - use it
						processedResponse = response;
					} else if (response.message === 'success' && response.data === null) {
						// Fallback: create synthetic response but try to include any ID from headers or other sources
						processedResponse = {
							...response,
							data: {
								...body,
								created: true,
								status: 'success'
							}
						};
					}
				} else if (operation === 'create' && response.message === 'success' && response.data === null) {
					// Original logic for other create operations
					processedResponse = {
						...response,
						data: {
							...body,
							created: true,
							status: 'success'
						}
					};
				}

				// Apply field filtering for contact getAll operation
				if (resource === 'contact' && operation === 'getAll') {
					const fieldsToReturn = this.getNodeParameter('fields', i, []) as string[];
					if (fieldsToReturn.length > 0 && Array.isArray(response.data)) {
						processedResponse = {
							...response,
							data: response.data.map((contact: IDB2BContact) => {
								const filteredContact: Partial<IDB2BContact> = {};
								fieldsToReturn.forEach(field => {
									if (field in contact) {
										(filteredContact as any)[field] = (contact as any)[field];
									}
								});
								return filteredContact;
							})
						};
					}
				}

				// Apply field filtering for lead getAll operation
				if (resource === 'lead' && operation === 'getAll') {
					const fieldsToReturn = this.getNodeParameter('fields', i, []) as string[];
					if (fieldsToReturn.length > 0 && Array.isArray(response.data)) {
						processedResponse = {
							...response,
							data: response.data.map((lead: IDB2BLead) => {
								const filteredLead: Partial<IDB2BLead> = {};
								fieldsToReturn.forEach(field => {
									if (field in lead) {
										(filteredLead as any)[field] = (lead as any)[field];
									}
								});
								return filteredLead;
							})
						};
					}
				}

				// Apply field filtering for leadActivities getAll operation
				if (resource === 'leadActivities' && operation === 'getAll') {
					const fieldsToReturn = this.getNodeParameter('fields', i, []) as string[];
					if (fieldsToReturn.length > 0 && Array.isArray(response.data)) {
						processedResponse = {
							...response,
							data: response.data.map((activity: IDB2BLeadActivity) => {
								const filteredActivity: Partial<IDB2BLeadActivity> = {};
								fieldsToReturn.forEach(field => {
									if (field in activity) {
										(filteredActivity as any)[field] = (activity as any)[field];
									}
								});
								return filteredActivity;
							})
						};
					}
				}

				returnData.push({
					json: processedResponse as any,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					let errorData: any = { error: 'Unknown error occurred' };

					if (error instanceof Error) {
						errorData.error = error.message;

						// Enhanced error handling for HTTP errors
						if ('response' in error && error.response) {
							const response = error.response as any;
							errorData.statusCode = response.status || response.statusCode;
							errorData.statusText = response.statusText;

							// Sanitize response data to prevent information disclosure
							if (response.data) {
								// Only include non-sensitive error details
								const sanitizedData = sanitizeErrorData(response.data);
								if (Object.keys(sanitizedData).length > 0) {
									errorData.details = sanitizedData;
								}
							}

							// Specific error messages based on status codes
							switch (response.status || response.statusCode) {
								case 401:
									// Invalidate cached tokens on authentication failure
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
