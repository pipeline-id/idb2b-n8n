import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	NodeApiError,
	NodeOperationError,
	sleep,
} from 'n8n-workflow';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { contactOperations, contactFields } from './descriptions/contactProperties';
import { companyOperations, companyFields } from './descriptions/companyProperties';
import type { IDB2BContact } from './interfaces/IDB2BContact';
import type { IDB2BLead } from './interfaces/IDB2BLead';

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
	private lastCleanup: Date = new Date();
	private readonly cleanupIntervalMs = 10 * 60 * 1000; // 10 minutes

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

	// Clean up expired tokens if enough time has passed since last cleanup
	cleanupIfNeeded(): void {
		const now = new Date();
		if (now.getTime() - this.lastCleanup.getTime() < this.cleanupIntervalMs) {
			return;
		}
		this.lastCleanup = now;
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
				await sleep(Math.min(delay, 30000));
			} else {
				// Exponential backoff for other errors
				const delay = initialDelay * Math.pow(2, attempt);
				await sleep(Math.min(delay, 10000));
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

		const accessToken =
			loginResponse?.data?.session?.access_token ||
			loginResponse?.data?.access_token ||
			loginResponse?.session?.access_token ||
			loginResponse?.access_token;

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

function validateEmailField(email: string): void {
	if (typeof email !== 'string' || email.trim().length === 0) {
		throw new Error('Contact email must be a non-empty string');
	}

	if (email.length > 320) {
		throw new Error('Email address cannot exceed 320 characters');
	}

	if (!validateEmail(email)) {
		throw new Error('Invalid email format - please provide a valid email address');
	}
}

function validateContactData(name: string, email?: string): void {
	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		throw new Error('Contact name is required and must be a non-empty string');
	}

	if (name.trim().length > 255) {
		throw new Error('Contact name cannot exceed 255 characters');
	}

	if (email) {
		validateEmailField(email);
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

function validateBaseUrl(url: string): boolean {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.protocol === 'https:' && parsedUrl.hostname.length > 0;
	} catch {
		return false;
	}
}

function sanitizeId(id: string): string {
	return encodeURIComponent(id);
}

function sanitizeErrorData(data: any): any {
	if (!data || typeof data !== 'object') {
		return {};
	}

	const sanitized: any = {};
	const allowedFields = ['message', 'error', 'code', 'type', 'validation_errors'];

	for (const field of allowedFields) {
		if (data[field] !== undefined) {
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
		displayName: 'IDB2B API',
		name: 'idb2b',
		icon: 'file:Icon.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'AI Agents that turn conversations into customers for WhatsApp, Instagram & TikTok',
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
						name: 'Company',
						value: 'company',
					},
				],
				default: 'contact',
			},
			contactOperations,
			companyOperations,
			...contactFields,
			...companyFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Time-based cleanup of expired tokens
		secureTokenCache.cleanupIfNeeded();

		// Fetch credentials and token once before the loop
		const credentials = await this.getCredentials('idb2bApi');

		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'No credentials found. Please configure your IDB2B API credentials.');
		}

		if (!credentials.email || !credentials.password || !credentials.baseUrl) {
			throw new NodeOperationError(this.getNode(), 'Incomplete credentials. Email, password, and base URL are required.');
		}

		if (!validateEmail(credentials.email as string)) {
			throw new NodeOperationError(this.getNode(), 'Invalid email format in credentials.');
		}

		if (!validateBaseUrl(credentials.baseUrl as string)) {
			throw new NodeOperationError(this.getNode(), 'Invalid base URL in credentials. Must be a valid HTTPS URL.');
		}

		const accessToken = await getAccessToken(this, credentials);

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let method: IHttpRequestMethods = 'GET';
				let endpoint = '';
				let body: any = undefined;
				let qs: any = {};

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
					} else if (operation === 'get') {
						method = 'GET';
						const contactId = this.getNodeParameter('contactId', i) as string;
						endpoint = `/contacts/${sanitizeId(contactId)}`;
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

						Object.keys(additionalFields).forEach(key => {
							if (additionalFields[key] !== undefined && additionalFields[key] !== '') {
								if (key === 'tags' && additionalFields.tags && additionalFields.tags.tag) {
									body.tags = additionalFields.tags.tag.map((tag: any) => ({
										name: tag.name.trim(),
									}));
								} else {
									body[key] = additionalFields[key];
								}
							}
						});
					} else if (operation === 'update') {
						method = 'PATCH';
						const contactId = this.getNodeParameter('contactId', i) as string;
						endpoint = `/contacts/${sanitizeId(contactId)}`;

						const name = this.getNodeParameter('name', i, '') as string;
						const email = this.getNodeParameter('email', i, '') as string;
						const phone_number = this.getNodeParameter('phone_number', i, '') as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

						body = {};
						if (name) {
							validateContactData(name);
							body.name = name.trim();
						}
						if (email) {
							validateEmailField(email);
							body.email = email.trim();
						}
						if (phone_number) {
							body.phone_number = phone_number;
						}

						Object.keys(additionalFields).forEach(key => {
							if (additionalFields[key] !== undefined && additionalFields[key] !== '') {
								if (key === 'tags' && additionalFields.tags && additionalFields.tags.tag) {
									body.tags = additionalFields.tags.tag.map((tag: any) => ({
										name: tag.name.trim(),
									}));
								} else {
									body[key] = additionalFields[key];
								}
							}
						});
					} else if (operation === 'delete') {
						method = 'DELETE';
						const contactId = this.getNodeParameter('contactId', i) as string;
						endpoint = `/contacts/${sanitizeId(contactId)}`;
					}
				} else if (resource === 'company') {
					if (operation === 'getAll') {
						method = 'GET';
						endpoint = '/companies';

						const limit = this.getNodeParameter('limit', i, 50) as number;
						const page = this.getNodeParameter('page', i, 1) as number;
						qs.limit = limit;
						qs.page = page;

						const queryParameters = this.getNodeParameter('queryParameters', i, {}) as any;
						const additionalQs = buildQueryString(queryParameters);
						qs = { ...qs, ...additionalQs };
					} else if (operation === 'get') {
						method = 'GET';
						const companyId = this.getNodeParameter('companyId', i) as string;
						endpoint = `/companies/${sanitizeId(companyId)}`;
					} else if (operation === 'create') {
						method = 'POST';
						endpoint = '/companies';
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

						validateLeadData(name);

						body = {
							name: name.trim(),
						};

						Object.keys(additionalFields).forEach(key => {
							if (additionalFields[key] !== undefined && additionalFields[key] !== '') {
								body[key] = additionalFields[key];
							}
						});
					} else if (operation === 'update') {
						method = 'PATCH';
						const companyId = this.getNodeParameter('companyId', i) as string;
						endpoint = `/companies/${sanitizeId(companyId)}`;

						const name = this.getNodeParameter('name', i, '') as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

						body = {};
						if (name) {
							validateLeadData(name);
							body.name = name.trim();
						}

						Object.keys(additionalFields).forEach(key => {
							if (additionalFields[key] !== undefined && additionalFields[key] !== '') {
								body[key] = additionalFields[key];
							}
						});
					} else if (operation === 'delete') {
						method = 'DELETE';
						const companyId = this.getNodeParameter('companyId', i) as string;
						endpoint = `/companies/${sanitizeId(companyId)}`;
					}
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
				if (operation === 'create' && response.message === 'success' && response.data === null) {
					processedResponse = {
						...response,
						data: {
							...body,
							created: true,
							status: 'success',
							_note: 'Server did not return the created entity. Fields like id and timestamps are unavailable.',
						}
					};
				}

				// Return standardized response for delete operations (n8n UX guideline)
			if (operation === 'delete') {
				processedResponse = { deleted: true };
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

				// Apply field filtering for company getAll operation
				if (resource === 'company' && operation === 'getAll') {
					const fieldsToReturn = this.getNodeParameter('fields', i, []) as string[];
					if (fieldsToReturn.length > 0 && Array.isArray(response.data)) {
						processedResponse = {
							...response,
							data: response.data.map((company: IDB2BLead) => {
								const filteredCompany: Partial<IDB2BLead> = {};
								fieldsToReturn.forEach(field => {
									if (field in company) {
										(filteredCompany as any)[field] = (company as any)[field];
									}
								});
								return filteredCompany;
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
									// Use outer-scope credentials to invalidate cache
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
