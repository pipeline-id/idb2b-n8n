/**
 * Batch processor for concurrent operation handling
 * Processes items with concurrency control and error handling
 */

export interface BatchConfig {
  concurrency: number;
  batchSize?: number;
  retryPolicy?: "fail-first" | "continue-on-fail";
  timeout?: number;
}

export interface BatchResult {
  itemIndex: number;
  success: boolean;
  data?: any;
  error?: Error;
}

/**
 * Process an array of items concurrently with concurrency limits
 * Uses Promise-based concurrency control without external dependencies
 */
export class BatchProcessor {
  /**
   * Process items with concurrent execution
   * @param items Array of items to process
   * @param processor Async function that processes each item
   * @param config Configuration for batch processing
   * @returns Array of results in original order
   */
  async processBatch<T>(
    items: T[],
    processor: (item: T, index: number) => Promise<any>,
    config: BatchConfig,
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = Array(items.length);

    // Initialize results array with pending state
    for (let i = 0; i < items.length; i++) {
      results[i] = { itemIndex: i, success: false };
    }

    // Process with concurrency control
    const concurrency = Math.max(1, config.concurrency);
    const promises: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      // If we have reached concurrency limit, wait for one to complete
      if (promises.length >= concurrency) {
        await Promise.race(promises);
        // Remove completed promises
        promises.splice(
          promises.findIndex((p) => p === null),
          1,
        );
      }

      // Create new processing promise
      const processingPromise = this.processItem(
        items[i],
        i,
        processor,
        results,
        config,
      );

      promises.push(processingPromise);
    }

    // Wait for all remaining promises
    await Promise.all(promises);

    return results;
  }

  /**
   * Process single item and store result
   */
  private async processItem<T>(
    item: T,
    index: number,
    processor: (item: T, index: number) => Promise<any>,
    results: BatchResult[],
    config: BatchConfig,
  ): Promise<void> {
    try {
      const data = await processor(item, index);
      results[index] = {
        itemIndex: index,
        success: true,
        data,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      results[index] = {
        itemIndex: index,
        success: false,
        error: err,
      };

      // Handle retry policy
      if (config.retryPolicy === "fail-first") {
        throw err;
      }
      // Continue on fail - error is already recorded in results
    }
  }

  /**
   * Process items in batches (groups of fixed size)
   * Useful for API endpoints that support batch operations
   */
  async processBatches<T>(
    items: T[],
    processor: (batch: T[]) => Promise<any>,
    batchSize: number,
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    let itemIndex = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, items.length));

      try {
        const data = await processor(batch);
        // Add result for each item in the batch
        for (let j = 0; j < batch.length; j++) {
          results.push({
            itemIndex: itemIndex++,
            success: true,
            data: Array.isArray(data) ? data[j] : data,
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        // Add error result for each item in the batch
        for (let j = 0; j < batch.length; j++) {
          results.push({
            itemIndex: itemIndex++,
            success: false,
            error: err,
          });
        }
      }
    }

    return results;
  }
}

/**
 * Calculate optimal concurrency level based on item count
 */
export function calculateOptimalConcurrency(itemCount: number): number {
  if (itemCount <= 5) return 1;
  if (itemCount <= 50) return 5;
  if (itemCount <= 100) return 10;
  return 15; // Max reasonable concurrency for public APIs
}

/**
 * Factory function for creating batch processor
 */
export function createBatchProcessor(): BatchProcessor {
  return new BatchProcessor();
}
