import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { IExecuteFunctions, NodeApiError } from 'n8n-workflow';
import { TokenCache, IDB2BLoginResponse } from '../interfaces/IDB2BAuth';
import { makeRequestWithRetry } from './requests';

export class SecureTokenCache {
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
		const entries = Array.from(this.cache.entries());
		for (const [key, value] of entries) {
			if (value.expires_at <= now) {
				this.cache.delete(key);
			}
		}
	}

	// Invalidate tokens for specific base URL (useful for security incidents)
	invalidateByBaseUrl(baseUrl: string): void {
		const entries = Array.from(this.cache.entries());
		for (const [key, value] of entries) {
			if (value.baseUrl === baseUrl) {
				this.cache.delete(key);
			}
		}
	}

	// Get cache statistics for monitoring
	getStats(): { totalEntries: number; expiredEntries: number } {
		const now = new Date();
		let expiredCount = 0;

		const values = Array.from(this.cache.values());
		for (const value of values) {
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

export const secureTokenCache = new SecureTokenCache();

export async function getAccessToken(
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

		const accessToken = loginResponse.data.access_token;
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