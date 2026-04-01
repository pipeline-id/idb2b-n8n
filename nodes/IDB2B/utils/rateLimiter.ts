/**
 * Adaptive rate limiter for API requests
 * Monitors 429 responses and adjusts concurrency dynamically
 */

import { sleep } from "n8n-workflow";

export interface RateLimitConfig {
  initialConcurrency: number;
  minConcurrency: number;
  maxConcurrency: number;
  backoffMultiplier: number;
  recoveryMultiplier: number;
}

export interface RateLimitState {
  currentConcurrency: number;
  rateLimitedAt?: number;
  consecutiveLimits: number;
  successCount: number;
  failureCount: number;
}

/**
 * Adaptive rate limiter that adjusts concurrency based on API responses
 */
export class AdaptiveRateLimiter {
  private config: RateLimitConfig;
  private state: RateLimitState;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      initialConcurrency: config.initialConcurrency ?? 5,
      minConcurrency: config.minConcurrency ?? 1,
      maxConcurrency: config.maxConcurrency ?? 20,
      backoffMultiplier: config.backoffMultiplier ?? 0.5,
      recoveryMultiplier: config.recoveryMultiplier ?? 1.1,
    };

    this.state = {
      currentConcurrency: this.config.initialConcurrency,
      consecutiveLimits: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  /**
   * Handle rate limit error (429 response)
   */
  handleRateLimit(): void {
    this.state.rateLimitedAt = Date.now();
    this.state.consecutiveLimits++;

    // Reduce concurrency
    const newConcurrency = Math.max(
      this.config.minConcurrency,
      Math.floor(this.state.currentConcurrency * this.config.backoffMultiplier),
    );
    this.state.currentConcurrency = newConcurrency;
  }

  /**
   * Handle successful request
   */
  handleSuccess(): void {
    this.state.successCount++;

    // Try to recover concurrency gradually
    if (
      this.state.consecutiveLimits === 0 &&
      this.state.successCount % 5 === 0
    ) {
      const newConcurrency = Math.min(
        this.config.maxConcurrency,
        Math.ceil(
          this.state.currentConcurrency * this.config.recoveryMultiplier,
        ),
      );
      this.state.currentConcurrency = newConcurrency;
    }
  }

  /**
   * Handle failed request (non-429)
   */
  handleFailure(): void {
    this.state.failureCount++;
    this.state.consecutiveLimits = 0; // Reset limit counter on other errors
  }

  /**
   * Get current concurrency level
   */
  getConcurrency(): number {
    return this.state.currentConcurrency;
  }

  /**
   * Get current state
   */
  getState(): RateLimitState {
    return { ...this.state };
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = {
      currentConcurrency: this.config.initialConcurrency,
      consecutiveLimits: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  /**
   * Calculate delay based on rate limit response
   */
  calculateDelay(retryAfterSeconds?: number): number {
    if (retryAfterSeconds) {
      return retryAfterSeconds * 1000;
    }

    // Exponential backoff based on consecutive limits
    const baseDelay = 1000;
    return Math.min(
      baseDelay * Math.pow(2, this.state.consecutiveLimits),
      30000,
    );
  }

  /**
   * Execute request with rate limiting
   */
  async executeWithRateLimit<T>(
    requestFn: () => Promise<T>,
    onRateLimit?: (delayMs: number) => void,
  ): Promise<T> {
    try {
      const result = await requestFn();
      this.handleSuccess();
      return result;
    } catch (error: any) {
      const statusCode = error.response?.status || error.response?.statusCode;

      if (statusCode === 429) {
        const retryAfter = error.response?.headers?.["retry-after"];
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter) : undefined;
        const delay = this.calculateDelay(retryAfterSeconds);

        this.handleRateLimit();

        if (onRateLimit) {
          onRateLimit(delay);
        }

        await sleep(delay);

        // Retry the request
        return this.executeWithRateLimit(requestFn, onRateLimit);
      }

      this.handleFailure();
      throw error;
    }
  }
}

/**
 * Factory function for creating rate limiter
 */
export function createAdaptiveRateLimiter(
  config?: Partial<RateLimitConfig>,
): AdaptiveRateLimiter {
  return new AdaptiveRateLimiter(config);
}

// Export singleton instance
export const adaptiveRateLimiter = new AdaptiveRateLimiter();
