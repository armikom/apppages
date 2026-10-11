/**
 * Shared logging types and constants used by both dashboard and functions.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  correlationId?: string;
  userId?: string;
  accountId?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

export function serializeError(err: unknown): LogEntry["error"] | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { name: "UnknownError", message: String(err) };
}

export function shouldLog(current: LogLevel, minimum: LogLevel): boolean {
  return LOG_LEVELS[current] >= LOG_LEVELS[minimum];
}
