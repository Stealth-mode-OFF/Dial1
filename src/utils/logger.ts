/**
 * Logging utility for production monitoring.
 * Logs to console in development, can be extended for production services.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  context?: string;
}

const isDev = import.meta.env.DEV;

// Log levels and their console methods
const levelMethods: Record<LogLevel, keyof Console> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

// Colors for dev console
const levelColors: Record<LogLevel, string> = {
  debug: '#9ca3af',
  info: '#3b82f6',
  warn: '#f59e0b',
  error: '#ef4444',
};

// Log queue for batching (production)
const logQueue: LogEntry[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

function formatMessage(entry: LogEntry): string {
  const prefix = entry.context ? `[${entry.context}]` : '';
  return `${prefix} ${entry.message}`;
}

function logToConsole(entry: LogEntry): void {
  const method = levelMethods[entry.level];
  const message = formatMessage(entry);
  
  if (isDev) {
    const color = levelColors[entry.level];
    const style = `color: ${color}; font-weight: bold;`;
    
    if (entry.data !== undefined) {
      (console[method] as Function)(`%c${entry.level.toUpperCase()}`, style, message, entry.data);
    } else {
      (console[method] as Function)(`%c${entry.level.toUpperCase()}`, style, message);
    }
  } else {
    // Production: simpler output
    if (entry.data !== undefined) {
      (console[method] as Function)(message, entry.data);
    } else {
      (console[method] as Function)(message);
    }
  }
}

function queueLog(entry: LogEntry): void {
  logQueue.push(entry);
  
  // Flush after 5 seconds or when queue reaches 10 items
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushLogs, 5000);
  }
  
  if (logQueue.length >= 10) {
    flushLogs();
  }
}

function flushLogs(): void {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  
  if (logQueue.length === 0) return;
  
  const entries = [...logQueue];
  logQueue.length = 0;
  
  // In production, you could send to a logging service here
  // Example: sendToLoggingService(entries);
  
  if (isDev) {
    console.groupCollapsed(`📊 Flushing ${entries.length} log entries`);
    entries.forEach(e => logToConsole(e));
    console.groupEnd();
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushLogs);
}

// ============ PUBLIC API ============

function createLogEntry(level: LogLevel, message: string, data?: unknown, context?: string): LogEntry {
  return {
    level,
    message,
    data,
    context,
    timestamp: new Date().toISOString(),
  };
}

export const logger = {
  debug(message: string, data?: unknown, context?: string): void {
    if (!isDev) return; // Skip debug logs in production
    const entry = createLogEntry('debug', message, data, context);
    logToConsole(entry);
  },
  
  info(message: string, data?: unknown, context?: string): void {
    const entry = createLogEntry('info', message, data, context);
    logToConsole(entry);
    if (!isDev) queueLog(entry);
  },
  
  warn(message: string, data?: unknown, context?: string): void {
    const entry = createLogEntry('warn', message, data, context);
    logToConsole(entry);
    if (!isDev) queueLog(entry);
  },
  
  error(message: string, data?: unknown, context?: string): void {
    const entry = createLogEntry('error', message, data, context);
    logToConsole(entry);
    if (!isDev) queueLog(entry);
  },
  
  // Create a scoped logger with a fixed context
  scope(context: string) {
    return {
      debug: (msg: string, data?: unknown) => logger.debug(msg, data, context),
      info: (msg: string, data?: unknown) => logger.info(msg, data, context),
      warn: (msg: string, data?: unknown) => logger.warn(msg, data, context),
      error: (msg: string, data?: unknown) => logger.error(msg, data, context),
    };
  },
  
  // Performance timing
  time(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      logger.debug(`${label}: ${duration.toFixed(2)}ms`);
    };
  },
  
  // Flush logs immediately
  flush: flushLogs,
};

export default logger;
