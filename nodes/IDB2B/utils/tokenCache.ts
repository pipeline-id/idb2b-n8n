/**
 * Secure token caching with encryption
 * Stores authentication tokens with AES-256-CBC encryption and automatic expiry
 */

import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { TOKEN_CACHE } from "../config/constants";

interface CacheEntry {
  encrypted_token: string;
  iv: string;
  expires_at: Date;
  baseUrl: string;
  credentials_hash: string;
}

export class SecureTokenCache {
  private cache: Map<string, CacheEntry> = new Map();
  private lastCleanup: Date = new Date();

  /**
   * Generate encryption key from credentials
   */
  private getEncryptionKey(credentials: any): Buffer {
    const keyMaterial = `${credentials.email}:${credentials.password}:${credentials.baseUrl}`;
    return createHash("sha256").update(keyMaterial).digest();
  }

  /**
   * Generate hash of credentials for validation
   */
  private generateCredentialsHash(credentials: any): string {
    const credentialsString = `${credentials.email}:${credentials.baseUrl}`;
    return createHash("sha256").update(credentialsString).digest("hex");
  }

  /**
   * Encrypt token using AES-256-CBC
   */
  private encryptToken(
    token: string,
    credentials: any,
  ): { encrypted: string; iv: string } {
    const key = this.getEncryptionKey(credentials);
    const iv = randomBytes(16);
    const cipher = createCipheriv(
      TOKEN_CACHE.ENCRYPTION_ALGORITHM as any,
      key,
      iv,
    );

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
      encrypted,
      iv: iv.toString("hex"),
    };
  }

  /**
   * Decrypt token using AES-256-CBC
   */
  private decryptToken(
    encryptedToken: string,
    iv: string,
    credentials: any,
  ): string {
    try {
      const key = this.getEncryptionKey(credentials);
      const decipher = createDecipheriv(
        TOKEN_CACHE.ENCRYPTION_ALGORITHM as any,
        key,
        Buffer.from(iv, "hex"),
      );

      let decrypted = decipher.update(encryptedToken, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new Error("Failed to decrypt token - credentials may have changed");
    }
  }

  /**
   * Store token in cache with encryption
   */
  set(
    cacheKey: string,
    token: string,
    expiresAt: Date,
    credentials: any,
  ): void {
    const { encrypted, iv } = this.encryptToken(token, credentials);
    const credentialsHash = this.generateCredentialsHash(credentials);

    this.cache.set(cacheKey, {
      encrypted_token: encrypted,
      iv,
      expires_at: expiresAt,
      baseUrl: credentials.baseUrl,
      credentials_hash: credentialsHash,
    });
  }

  /**
   * Retrieve token from cache if valid
   * Returns null if expired or credentials have changed
   */
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

  /**
   * Invalidate specific cache entry
   */
  invalidate(cacheKey: string): void {
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired tokens if enough time has passed since last cleanup
   */
  cleanupIfNeeded(): void {
    const now = new Date();
    if (
      now.getTime() - this.lastCleanup.getTime() <
      TOKEN_CACHE.CLEANUP_INTERVAL_MS
    ) {
      return;
    }

    this.lastCleanup = now;
    for (const [key, value] of this.cache.entries()) {
      if (value.expires_at <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate tokens for specific base URL
   * Useful for security incidents
   */
  invalidateByBaseUrl(baseUrl: string): void {
    for (const [key, value] of this.cache.entries()) {
      if (value.baseUrl === baseUrl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getStats(): { size: number; oldestExpiry: Date | null } {
    let oldestExpiry: Date | null = null;

    for (const entry of this.cache.values()) {
      if (!oldestExpiry || entry.expires_at < oldestExpiry) {
        oldestExpiry = entry.expires_at;
      }
    }

    return {
      size: this.cache.size,
      oldestExpiry,
    };
  }
}

// Export singleton instance
export const secureTokenCache = new SecureTokenCache();
