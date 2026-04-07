/**
 * HTTP client with retry logic and exponential backoff
 * Handles API requests with intelligent retry strategies
 */

import { IExecuteFunctions, IHttpRequestMethods, sleep } from "n8n-workflow";
import { RETRY, HTTP, ENDPOINTS, TOKEN_CACHE } from "../config/constants";
import { secureTokenCache } from "./tokenCache";
import { DataValidator } from "./validators";
import { NodeApiError } from "n8n-workflow";

export interface RequestOptions {
  method: IHttpRequestMethods;
  url: string;
  headers?: any;
  body?: any;
  formData?: any;
  qs?: any;
  json?: boolean;
}

export interface HttpClientConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
}

export class HttpClient {
  private executeFunctions: IExecuteFunctions;
  private config: HttpClientConfig;

  constructor(
    executeFunctions: IExecuteFunctions,
    config: Partial<HttpClientConfig> = {},
  ) {
    this.executeFunctions = executeFunctions;
    this.config = {
      maxRetries: config.maxRetries ?? RETRY.MAX_RETRIES,
      initialDelay: config.initialDelay ?? RETRY.INITIAL_DELAY_MS,
      maxDelay: config.maxDelay ?? RETRY.MAX_EXPONENTIAL_DELAY_MS,
    };
  }

  /**
   * Make HTTP request with exponential backoff retry logic
   */
  async makeRequest(options: RequestOptions): Promise<any> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.executeFunctions.helpers.httpRequest(options);
      } catch (error: any) {
        lastError = error;

        const shouldNotRetry = this.shouldNotRetry(error);
        if (shouldNotRetry) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === this.config.maxRetries) {
          throw error;
        }

        // Calculate delay with backoff strategy
        const delay = this.calculateBackoffDelay(error, attempt);
        await sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Determine if error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    if (!error.response) {
      return false; // Network errors are retryable
    }

    const statusCode = error.response?.status || error.response?.statusCode;
    return RETRY.NO_RETRY_STATUS_CODES.includes(statusCode);
  }

  /**
   * Calculate backoff delay based on error type and attempt number
   */
  private calculateBackoffDelay(error: any, attempt: number): number {
    const statusCode = error.response?.status || error.response?.statusCode;

    // Rate limiting: check Retry-After header
    if (statusCode === HTTP.RATE_LIMIT_STATUS) {
      const retryAfter = error.response?.headers?.[HTTP.RETRY_AFTER_HEADER];
      if (retryAfter) {
        const delaySeconds = parseInt(retryAfter);
        if (!isNaN(delaySeconds)) {
          const delayMs = delaySeconds * 1000;
          return Math.min(delayMs, RETRY.MAX_RATE_LIMIT_DELAY_MS);
        }
      }
      // Exponential backoff for rate limiting with higher max
      const delay = this.config.initialDelay * Math.pow(2, attempt);
      return Math.min(delay, RETRY.MAX_RATE_LIMIT_DELAY_MS);
    }

    // Exponential backoff for other retryable errors (5xx)
    const delay = this.config.initialDelay * Math.pow(2, attempt);
    return Math.min(delay, this.config.maxDelay);
  }
}

/**
 * Get access token with caching and auto-renewal
 */
export async function getAccessToken(
  executeFunctions: IExecuteFunctions,
  credentials: any,
): Promise<string> {
  const validator = new DataValidator();

  // Validate credentials
  const validation = validator.validateCredentials(credentials);
  if (!validation.isValid) {
    throw new NodeApiError(
      executeFunctions.getNode(),
      { message: validation.error } as any,
      {
        message: "Invalid credentials",
      },
    );
  }

  const cacheKey = `${credentials.baseUrl}:${credentials.email}`;

  // Try to get cached token
  const cachedToken = secureTokenCache.get(cacheKey, credentials);
  if (cachedToken) {
    return cachedToken;
  }

  try {
    const httpClient = new HttpClient(executeFunctions);

    const loginResponse = await httpClient.makeRequest({
      method: "POST",
      url: `${credentials.baseUrl}${ENDPOINTS.LOGIN}`,
      body: {
        email: credentials.email,
        password: credentials.password,
      },
      json: true,
    });

    // Try to extract token from various possible response formats
    const accessToken =
      loginResponse?.data?.session?.access_token ||
      loginResponse?.data?.access_token ||
      loginResponse?.session?.access_token ||
      loginResponse?.access_token;

    if (!accessToken) {
      throw new Error("No access token received from authentication response");
    }

    // Cache for 50 minutes instead of 1 hour for safety margin
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + TOKEN_CACHE.CACHE_TTL_MINUTES,
    );

    secureTokenCache.set(cacheKey, accessToken, expiresAt, credentials);

    return accessToken;
  } catch (error) {
    // Clean up any invalid cached tokens on auth failure
    secureTokenCache.invalidate(cacheKey);

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(
      executeFunctions.getNode(),
      { message: errorMessage } as any,
      {
        message: "Authentication failed",
        description: "Failed to authenticate with IDB2B API",
      },
    );
  }
}
