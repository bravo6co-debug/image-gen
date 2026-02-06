/**
 * Structured Logger for API (Server-side)
 * Provides consistent logging with levels, context, and environment-aware output
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Log level priority (higher = more important)
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get minimum log level from environment
function getMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return envLevel;
  }
  // Default: debug in development, info in production
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
}

// Check if JSON output is enabled (for production/monitoring)
function isJsonOutput(): boolean {
  return process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';
}

// Format log entry for output
function formatLogEntry(entry: LogEntry): string {
  if (isJsonOutput()) {
    return JSON.stringify(entry);
  }

  // Human-readable format for development
  const timestamp = entry.timestamp.split('T')[1].split('.')[0]; // HH:MM:SS
  const levelStr = entry.level.toUpperCase().padEnd(5);
  let output = `[${timestamp}] ${levelStr} ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    const contextStr = Object.entries(entry.context)
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' ');
    output += ` | ${contextStr}`;
  }

  if (entry.error) {
    output += `\n  Error: ${entry.error.message}`;
    if (entry.error.stack && process.env.NODE_ENV === 'development') {
      output += `\n  ${entry.error.stack}`;
    }
  }

  return output;
}

// Create a log entry and output
function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  const minLevel = getMinLevel();
  if (LOG_LEVELS[level] < LOG_LEVELS[minLevel]) {
    return; // Skip logs below minimum level
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  const output = formatLogEntry(entry);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Logger instance with scoped context
 */
class Logger {
  private scope: string;
  private defaultContext: LogContext;

  constructor(scope: string, defaultContext: LogContext = {}) {
    this.scope = scope;
    this.defaultContext = defaultContext;
  }

  private mergeContext(context?: LogContext): LogContext {
    return {
      scope: this.scope,
      ...this.defaultContext,
      ...context,
    };
  }

  debug(message: string, context?: LogContext): void {
    log('debug', message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    log('info', message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    log('warn', message, this.mergeContext(context), error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    log('error', message, this.mergeContext(context), error);
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(this.scope, {
      ...this.defaultContext,
      ...additionalContext,
    });
  }
}

/**
 * Create a logger for a specific module/scope
 */
export function createLogger(scope: string, defaultContext?: LogContext): Logger {
  return new Logger(scope, defaultContext);
}

// Default logger for quick use
export const logger = createLogger('app');

// Re-export types
export type { LogLevel, LogContext, Logger };
