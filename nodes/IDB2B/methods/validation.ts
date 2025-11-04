export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function validateContactData(name: string, email: string): void {
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

export function validateLeadData(name: string): void {
	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		throw new Error('Lead name is required and must be a non-empty string');
	}

	if (name.trim().length > 255) {
		throw new Error('Lead name cannot exceed 255 characters');
	}
}

export function validateBaseUrl(url: string): boolean {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.protocol === 'https:' && parsedUrl.hostname.length > 0;
	} catch {
		return false;
	}
}