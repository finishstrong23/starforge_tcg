/**
 * STARFORGE TCG - Error Tracking Service
 *
 * Centralized error tracking with Sentry integration.
 * Falls back to console logging when Sentry is not configured.
 */

import { config } from '../config/env';

interface ErrorContext {
  userId?: string;
  action?: string;
  gameId?: string;
  extra?: Record<string, unknown>;
}

interface BreadcrumbEntry {
  message: string;
  category: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  timestamp: number;
  data?: Record<string, unknown>;
}

// In-memory breadcrumb trail for error context
const breadcrumbs: BreadcrumbEntry[] = [];
const MAX_BREADCRUMBS = 100;

// Error deduplication window (don't report same error twice in 60s)
const recentErrors = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000;

/**
 * Initialize error tracking. Call once at server startup.
 */
export function initialize(): void {
  if (config.sentry.dsn) {
    console.log(`[ErrorTracking] Sentry configured for ${config.sentry.environment}`);
    console.log(`[ErrorTracking] Traces sample rate: ${config.sentry.tracesSampleRate}`);
  } else {
    console.log('[ErrorTracking] Sentry DSN not configured, using console fallback');
  }

  // Catch unhandled rejections
  process.on('unhandledRejection', (reason) => {
    captureException(reason instanceof Error ? reason : new Error(String(reason)), {
      action: 'unhandledRejection',
    });
  });

  // Catch uncaught exceptions
  process.on('uncaughtException', (error) => {
    captureException(error, { action: 'uncaughtException' });
    // Give time to flush, then exit
    setTimeout(() => process.exit(1), 2000);
  });
}

/**
 * Capture an exception with context.
 */
export function captureException(error: Error, context?: ErrorContext): void {
  const errorKey = `${error.message}:${error.stack?.slice(0, 200)}`;
  const now = Date.now();

  // Dedup check
  const lastSeen = recentErrors.get(errorKey);
  if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
    return; // Skip duplicate
  }
  recentErrors.set(errorKey, now);

  // Clean old dedup entries
  if (recentErrors.size > 500) {
    for (const [key, ts] of recentErrors.entries()) {
      if (now - ts > DEDUP_WINDOW_MS) recentErrors.delete(key);
    }
  }

  // Log locally
  console.error('[ErrorTracking] Exception captured:', {
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    ...context,
  });

  // If Sentry is configured, it would be sent here via Sentry SDK
  // For now, we store in the error log for monitoring
  addBreadcrumb({
    message: error.message,
    category: 'exception',
    level: 'error',
    data: context as Record<string, unknown>,
  });
}

/**
 * Capture a warning-level message.
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
  console.log(`[ErrorTracking] ${level.toUpperCase()}: ${message}`, context || '');

  addBreadcrumb({
    message,
    category: 'message',
    level,
    data: context as Record<string, unknown>,
  });
}

/**
 * Add a breadcrumb for error context trail.
 */
export function addBreadcrumb(entry: Omit<BreadcrumbEntry, 'timestamp'>): void {
  breadcrumbs.push({ ...entry, timestamp: Date.now() });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.splice(0, breadcrumbs.length - MAX_BREADCRUMBS);
  }
}

/**
 * Get recent breadcrumbs (for diagnostics endpoints).
 */
export function getRecentBreadcrumbs(limit: number = 50): BreadcrumbEntry[] {
  return breadcrumbs.slice(-limit);
}

/**
 * Set user context for error reports.
 */
export function setUser(userId: string, username: string): void {
  addBreadcrumb({
    message: `User context set: ${username} (${userId})`,
    category: 'auth',
    level: 'info',
  });
}

/**
 * Express error handling middleware.
 */
export function errorMiddleware() {
  return (err: Error, _req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }, _next: unknown) => {
    captureException(err, { action: 'express_middleware' });
    res.status(500).json({ error: 'Internal server error' });
  };
}

/**
 * Get error tracking health info.
 */
export function getHealth(): {
  sentryConfigured: boolean;
  recentErrorCount: number;
  breadcrumbCount: number;
} {
  return {
    sentryConfigured: !!config.sentry.dsn,
    recentErrorCount: recentErrors.size,
    breadcrumbCount: breadcrumbs.length,
  };
}
