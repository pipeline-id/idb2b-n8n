export function buildQueryString(queryParameters: any): Record<string, any> {
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

export function safeJsonParse(jsonString: string, fieldName: string): any {
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

export function sanitizeErrorData(data: any): any {
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