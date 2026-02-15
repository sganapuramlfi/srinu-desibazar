/**
 * Tenant-Aware Logging Service
 * All logs automatically include tenant_id for audit trails
 * Supports structured logging with context propagation
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  tenantId?: number;
  userId?: number;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration: number;
    unit: 'ms' | 's';
  };
}

/**
 * Logger class with tenant context
 */
class TenantLogger {
  private context: LogContext = {};
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  /**
   * Set global context for all logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Get current context
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const minIndex = levels.indexOf(this.minLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }

  /**
   * Format log entry
   */
  private formatEntry(
    level: LogLevel,
    message: string,
    additionalContext?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...additionalContext },
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return entry;
  }

  /**
   * Write log entry
   */
  private write(entry: LogEntry): void {
    // In production, send to logging service (Datadog, CloudWatch, etc.)
    // For now, write to console with JSON formatting

    const logString = JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(logString);
        break;
      case 'info':
        console.info(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'error':
      case 'fatal':
        console.error(logString);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    const entry = this.formatEntry('debug', message, context);
    this.write(entry);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    const entry = this.formatEntry('info', message, context);
    this.write(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    const entry = this.formatEntry('warn', message, context);
    this.write(entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    const entry = this.formatEntry('error', message, context, error);
    this.write(entry);
  }

  /**
   * Log fatal error (application crash)
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    const entry = this.formatEntry('fatal', message, context, error);
    this.write(entry);
  }

  /**
   * Log performance metric
   */
  perf(message: string, durationMs: number, context?: LogContext): void {
    const entry = this.formatEntry('info', message, context);
    entry.performance = { duration: durationMs, unit: 'ms' };
    this.write(entry);
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: LogContext): TenantLogger {
    const childLogger = new TenantLogger(this.minLevel);
    childLogger.setContext({ ...this.context, ...additionalContext });
    return childLogger;
  }
}

// Singleton logger instance
const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
export const logger = new TenantLogger(logLevel);

/**
 * Express middleware to add request context to logger
 */
export function requestLoggerMiddleware() {
  return (req: any, res: any, next: any) => {
    // Generate request ID
    const requestId = req.headers['x-request-id'] || generateRequestId();

    // Extract tenant context
    const tenantId =
      req.apiAuth?.businessId ||
      req.domainTenant?.businessId ||
      req.businessId ||
      null;

    const userId = req.user?.id || null;

    // Create request-scoped logger
    req.logger = logger.child({
      tenantId,
      userId,
      requestId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
    });

    // Log incoming request
    req.logger.info('Incoming request', {
      query: req.query,
      body: sanitizeBody(req.body),
    });

    // Track request duration
    const startTime = Date.now();

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      req.logger.info('Request completed', {
        statusCode: res.statusCode,
        duration,
      });
    });

    next();
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Sanitize request body (remove sensitive fields)
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'apiKey',
    'secretKey',
    'creditCard',
    'cvv',
    'ssn',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Log tenant action (audit trail)
 */
export function logTenantAction(
  tenantId: number,
  action: string,
  details: any,
  userId?: number
): void {
  logger.info('Tenant action', {
    tenantId,
    userId,
    action,
    details,
    auditLog: true,
  });
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: any,
  tenantId?: number
): void {
  logger.warn('Security event', {
    tenantId,
    event,
    severity,
    details,
    securityLog: true,
  });
}

/**
 * Performance monitoring decorator
 */
export function Monitored(label?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const methodLabel = label || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        logger.perf(`Method executed: ${methodLabel}`, duration);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error(
          `Method failed: ${methodLabel}`,
          error as Error,
          { duration }
        );

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Example Usage:
 *
 * // 1. Basic logging with tenant context
 * logger.setContext({ tenantId: 123, userId: 456 });
 * logger.info('User logged in');
 * logger.warn('Payment failed', { amount: 100, reason: 'insufficient_funds' });
 *
 * // 2. Error logging
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   logger.error('Operation failed', error, { operation: 'riskyOperation' });
 * }
 *
 * // 3. Performance logging
 * const startTime = Date.now();
 * await slowOperation();
 * logger.perf('Slow operation completed', Date.now() - startTime);
 *
 * // 4. Audit logging
 * logTenantAction(123, 'booking_created', { bookingId: 789 }, 456);
 *
 * // 5. Security logging
 * logSecurityEvent('unauthorized_access', 'high', {
 *   attemptedResource: '/api/admin/users',
 *   ipAddress: '1.2.3.4',
 * }, 123);
 *
 * // 6. Request-scoped logging (in Express route)
 * app.get('/api/data', requestLoggerMiddleware(), (req, res) => {
 *   req.logger.info('Fetching data');
 *   // tenantId, userId, requestId automatically included
 * });
 *
 * // 7. Method monitoring
 * class BookingService {
 *   @Monitored()
 *   async createBooking(tenantId: number, data: any) {
 *     // Performance automatically logged
 *   }
 * }
 */
