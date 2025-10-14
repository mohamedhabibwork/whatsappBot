import { Context, Next } from "hono";
import { performanceMonitor } from "@repo/database";

export interface PerformanceContext {
  requestStart: number;
  requestId: string;
}

/**
 * Performance monitoring middleware
 * Tracks request duration and logs slow requests
 */
export async function performanceMiddleware(c: Context, next: Next) {
  const requestId = crypto.randomUUID();
  const requestStart = performance.now();

  // Store performance context
  c.set("performance", {
    requestStart,
    requestId,
  } as PerformanceContext);

  // Add request ID to response headers
  c.header("X-Request-ID", requestId);

  try {
    await next();
  } finally {
    const duration = performance.now() - requestStart;
    const path = c.req.path;
    const method = c.req.method;
    const status = c.res.status;

    // Log request
    const logLevel = duration > 1000 ? "warn" : "info";
    console[logLevel](`[${method}] ${path} - ${status} - ${duration.toFixed(2)}ms`, {
      requestId,
      duration,
      method,
      path,
      status,
    });

    // Log slow requests
    if (duration > 1000) {
      console.warn(`[SLOW REQUEST] ${method} ${path} took ${duration.toFixed(2)}ms`, {
        requestId,
        duration,
        method,
        path,
        status,
      });
    }
  }
}

/**
 * Get performance statistics endpoint handler
 */
export function getPerformanceStats() {
  const stats = performanceMonitor.getStats();
  
  return {
    database: {
      totalQueries: stats.totalQueries,
      averageDuration: Math.round(stats.averageDuration * 100) / 100,
      slowQueriesCount: stats.slowQueries.length,
      slowQueries: stats.slowQueries.map(q => ({
        query: q.query.substring(0, 100),
        duration: Math.round(q.duration * 100) / 100,
        timestamp: q.timestamp,
        tenantId: q.tenantId,
      })),
      queriesByTenant: Object.fromEntries(stats.queriesByTenant),
    },
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
  };
}
