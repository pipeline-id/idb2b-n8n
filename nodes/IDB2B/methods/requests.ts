import { IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';

export interface RequestOptions {
	method: IHttpRequestMethods;
	url: string;
	headers?: any;
	body?: any;
	qs?: any;
	json?: boolean;
}

export async function makeRequestWithRetry(
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