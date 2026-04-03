/**
 * Utility functions for debugging and logging
 */

import { LOG_CONFIG } from "./config";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  const currentLevel =
    LOG_LEVELS[LOG_CONFIG.LEVEL as LogLevel] || LOG_LEVELS.info;
  return LOG_LEVELS[level] >= currentLevel;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLog(level: string, message: string, data?: any): string {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  debug: (message: string, data?: any) => {
    if (shouldLog("debug")) {
      console.debug(formatLog("debug", message, data));
    }
  },

  info: (message: string, data?: any) => {
    if (shouldLog("info")) {
      console.info(formatLog("info", message, data));
    }
  },

  warn: (message: string, data?: any) => {
    if (shouldLog("warn")) {
      console.warn(formatLog("warn", message, data));
    }
  },

  error: (message: string, error?: Error | any) => {
    if (shouldLog("error")) {
      const errorObj =
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : error;
      console.error(formatLog("error", message, errorObj));
    }
  },
};

/**
 * Performance measurement utility
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = Date.now();
  }

  end(): number {
    const duration = Date.now() - this.startTime;
    if (LOG_CONFIG.ENABLE_PERFORMANCE_LOGS) {
      logger.debug(`[PERF] ${this.name} completed in ${duration}ms`);
    }
    return duration;
  }

  checkpoint(label: string): number {
    const elapsed = Date.now() - this.startTime;
    if (LOG_CONFIG.ENABLE_PERFORMANCE_LOGS) {
      logger.debug(`[PERF] ${this.name} - ${label}: ${elapsed}ms`);
    }
    return elapsed;
  }
}

/**
 * Retry utility for failed operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        logger.warn(
          `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms`,
          { error: lastError.message },
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error("Retry failed");
}

/**
 * Safe error extraction
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    return JSON.stringify(error);
  }
  return "Unknown error";
}

/**
 * Memory usage stats (Node.js only)
 */
export function getMemoryStats(): {
  heapUsed: string;
  heapTotal: string;
  external: string;
  rss: string;
} {
  const mem = process.memoryUsage();
  const toMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

  return {
    heapUsed: `${toMB(mem.heapUsed)} MB`,
    heapTotal: `${toMB(mem.heapTotal)} MB`,
    external: `${toMB(mem.external)} MB`,
    rss: `${toMB(mem.rss)} MB`,
  };
}

/**
 * Log memory stats for debugging
 */
export function logMemoryStats(): void {
  if (LOG_CONFIG.ENABLE_PERFORMANCE_LOGS) {
    const stats = getMemoryStats();
    logger.debug("Memory stats", stats);
  }
}

/**
 * Validation helper
 */
export function validateRequired<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
      errors.push(`Missing required field: ${String(field)}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
