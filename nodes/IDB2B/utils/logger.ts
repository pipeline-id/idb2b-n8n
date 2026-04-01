/**
 * Structured logging utility for IDB2B node operations
 * Provides different log levels and optional debugging
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  error?: Error;
}

export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  includeTimestamp: boolean;
  maxLogs?: number;
}

/**
 * Structured logger for tracking operation flow
 */
export class Logger {
  private logs: LogEntry[] = [];
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      level: config.level ?? LogLevel.INFO,
      includeTimestamp: config.includeTimestamp ?? true,
      maxLogs: config.maxLogs ?? 1000,
    };
  }

  /**
   * Check if logging is enabled for level
   */
  private isEnabled(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ];
    const currentIndex = levels.indexOf(this.config.level);
    const messageIndex = levels.indexOf(level);

    return messageIndex >= currentIndex;
  }

  /**
   * Add log entry
   */
  private addLog(
    level: LogLevel,
    message: string,
    data?: any,
    error?: Error,
  ): void {
    if (!this.isEnabled(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      error,
    };

    this.logs.push(entry);

    // Keep max logs in memory
    if (this.logs.length > (this.config.maxLogs || 1000)) {
      this.logs.shift();
    }

    // Also output to console if enabled
    this.outputToConsole(entry);
  }

  /**
   * Output log to console
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = this.config.includeTimestamp
      ? `[${new Date(entry.timestamp).toISOString()}]`
      : "";
    const message = `${prefix} ${entry.level}: ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.log(message, entry.data);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.log(message, entry.data);
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(message, entry.error || entry.data);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.addLog(LogLevel.DEBUG, message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.addLog(LogLevel.INFO, message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.addLog(LogLevel.WARN, message, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, data?: any): void {
    const err = error instanceof Error ? error : undefined;
    const additionalData = error instanceof Error ? data : error;

    this.addLog(LogLevel.ERROR, message, additionalData, err);
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Get logs from last N milliseconds
   */
  getRecentLogs(milliseconds: number): LogEntry[] {
    const cutoff = Date.now() - milliseconds;
    return this.logs.filter((log) => log.timestamp >= cutoff);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get logs statistics
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    for (const log of this.logs) {
      stats[log.level]++;
    }

    return stats;
  }
}

// Export default logger instance
export const logger = new Logger({
  enabled: true,
  level: LogLevel.INFO,
  includeTimestamp: true,
});

/**
 * Factory function for creating custom logger
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}
