/**
 * Request deduplication cache
 * Caches identical API requests to avoid duplicate calls
 */

import { createHash } from "node:crypto";

interface CacheEntry {
  data: any;
  timestamp: number;
}

/**
 * Generate cache key from request parameters
 */
function generateCacheKey(method: string, url: string, body?: any): string {
  const keyParts = [method, url];

  if (body && Object.keys(body).length > 0) {
    keyParts.push(JSON.stringify(body));
  }

  const keyString = keyParts.join("|");
  return createHash("sha256").update(keyString).digest("hex");
}

/**
 * Request cache for deduplicating identical requests
 * Particularly useful for reducing authentication calls in workflows with cached credentials
 */
export class RequestCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL = 5000; // 5 seconds default

  /**
   * Get cached response if available and not expired
   */
  get(method: string, url: string, body?: any, ttl?: number): any | null {
    const key = generateCacheKey(method, url, body);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    const maxAge = ttl ?? this.defaultTTL;

    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store response in cache
   */
  set(method: string, url: string, data: any, body?: any, ttl?: number): void {
    const key = generateCacheKey(method, url, body);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Auto-cleanup old entries if cache gets too large
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  /**
   * Execute request function with caching
   * Returns cached result if available, otherwise executes and caches result
   */
  async makeRequest(
    method: string,
    url: string,
    requestFn: () => Promise<any>,
    body?: any,
    ttl?: number,
  ): Promise<any> {
    // Check cache first
    const cached = this.get(method, url, body, ttl);
    if (cached !== null) {
      return cached;
    }

    // Execute request
    const data = await requestFn();

    // Cache the result
    this.set(method, url, data, body, ttl);

    return data;
  }

  /**
   * Invalidate cache entry
   */
  invalidate(method: string, url: string, body?: any): void {
    const key = generateCacheKey(method, url, body);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries for specific URL
   */
  invalidateByUrl(url: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(url)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = this.defaultTTL;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge * 2) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; expiringCount: number } {
    const now = Date.now();
    let expiringCount = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp >= this.defaultTTL) {
        expiringCount++;
      }
    }

    return {
      size: this.cache.size,
      expiringCount,
    };
  }
}

// Export singleton instance
export const requestCache = new RequestCache();
