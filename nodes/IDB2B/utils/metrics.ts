/**
 * Performance metrics collection and monitoring
 * Tracks operation performance for optimization insights
 */

export interface OperationMetrics {
  operationName: string;
  resource: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  itemsProcessed: number;
  successCount: number;
  failureCount: number;
  avgTimePerItem?: number;
  memoryUsed?: number;
  errorDetails?: string;
}

export interface MetricsSnapshot {
  totalOperations: number;
  totalDuration: number;
  totalItems: number;
  totalSuccesses: number;
  totalFailures: number;
  avgDuration: number;
  successRate: number;
}

/**
 * Metrics collector for tracking operation performance
 */
export class MetricsCollector {
  private metrics: Map<string, OperationMetrics[]> = new Map();
  private currentOperation: OperationMetrics | null = null;

  /**
   * Start tracking a new operation
   */
  startOperation(
    operationName: string,
    resource: string,
    itemCount: number,
  ): void {
    this.currentOperation = {
      operationName,
      resource,
      startTime: Date.now(),
      itemsProcessed: itemCount,
      successCount: 0,
      failureCount: 0,
    };
  }

  /**
   * Record operation completion
   */
  endOperation(
    successCount: number,
    failureCount: number,
    errorDetails?: string,
  ): void {
    if (!this.currentOperation) {
      return;
    }

    this.currentOperation.endTime = Date.now();
    this.currentOperation.duration =
      this.currentOperation.endTime - this.currentOperation.startTime;
    this.currentOperation.successCount = successCount;
    this.currentOperation.failureCount = failureCount;
    this.currentOperation.avgTimePerItem =
      this.currentOperation.itemsProcessed > 0
        ? this.currentOperation.duration / this.currentOperation.itemsProcessed
        : 0;

    if (errorDetails) {
      this.currentOperation.errorDetails = errorDetails;
    }

    // Store metrics by operation type
    const key = `${this.currentOperation.resource}:${this.currentOperation.operationName}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(this.currentOperation);

    this.currentOperation = null;
  }

  /**
   * Record successful item
   */
  recordSuccess(): void {
    if (this.currentOperation) {
      this.currentOperation.successCount++;
    }
  }

  /**
   * Record failed item
   */
  recordFailure(): void {
    if (this.currentOperation) {
      this.currentOperation.failureCount++;
    }
  }

  /**
   * Get metrics for specific operation
   */
  getOperationMetrics(
    resource: string,
    operationName: string,
  ): OperationMetrics[] {
    const key = `${resource}:${operationName}`;
    return this.metrics.get(key) || [];
  }

  /**
   * Get metrics snapshot for all operations
   */
  getSnapshot(): MetricsSnapshot {
    let totalOperations = 0;
    let totalDuration = 0;
    let totalItems = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;

    for (const operationMetrics of this.metrics.values()) {
      for (const metric of operationMetrics) {
        totalOperations++;
        totalDuration += metric.duration || 0;
        totalItems += metric.itemsProcessed;
        totalSuccesses += metric.successCount;
        totalFailures += metric.failureCount;
      }
    }

    return {
      totalOperations,
      totalDuration,
      totalItems,
      totalSuccesses,
      totalFailures,
      avgDuration: totalOperations > 0 ? totalDuration / totalOperations : 0,
      successRate: totalItems > 0 ? (totalSuccesses / totalItems) * 100 : 0,
    };
  }

  /**
   * Get historical metrics
   */
  getAllMetrics(): Record<string, OperationMetrics[]> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.currentOperation = null;
  }

  /**
   * Get slowest operations
   */
  getSlowestOperations(limit = 5): OperationMetrics[] {
    const all: OperationMetrics[] = [];

    for (const operationMetrics of this.metrics.values()) {
      all.push(...operationMetrics);
    }

    return all
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  /**
   * Get operations with highest failure rate
   */
  getFailureProne(limit = 5): OperationMetrics[] {
    const all: OperationMetrics[] = [];

    for (const operationMetrics of this.metrics.values()) {
      all.push(...operationMetrics);
    }

    return all
      .filter((m) => m.itemsProcessed > 0)
      .sort((a, b) => {
        const aFailRate = a.failureCount / a.itemsProcessed;
        const bFailRate = b.failureCount / b.itemsProcessed;
        return bFailRate - aFailRate;
      })
      .slice(0, limit);
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
