import type { Database } from "./client";

export interface QueryPerformanceMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  tenantId?: string;
  userId?: string;
}

export interface PerformanceStats {
  totalQueries: number;
  averageDuration: number;
  slowQueries: QueryPerformanceMetrics[];
  queriesByTenant: Map<string, number>;
}

class PerformanceMonitor {
  private metrics: QueryPerformanceMetrics[] = [];
  private readonly slowQueryThreshold: number;
  private readonly maxMetricsSize: number;

  constructor(slowQueryThreshold = 1000, maxMetricsSize = 1000) {
    this.slowQueryThreshold = slowQueryThreshold; // ms
    this.maxMetricsSize = maxMetricsSize;
  }

  /**
   * Record a query execution
   */
  recordQuery(metric: QueryPerformanceMetrics): void {
    this.metrics.push(metric);

    // Log slow queries
    if (metric.duration > this.slowQueryThreshold) {
      console.warn(`[SLOW QUERY] ${metric.duration}ms - ${metric.query.substring(0, 100)}...`, {
        tenantId: metric.tenantId,
        userId: metric.userId,
        duration: metric.duration,
      });
    }

    // Prevent memory leak by limiting metrics size
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    const totalQueries = this.metrics.length;
    const averageDuration = totalQueries > 0
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
      : 0;

    const slowQueries = this.metrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const queriesByTenant = new Map<string, number>();
    this.metrics.forEach(m => {
      if (m.tenantId) {
        queriesByTenant.set(m.tenantId, (queriesByTenant.get(m.tenantId) || 0) + 1);
      }
    });

    return {
      totalQueries,
      averageDuration,
      slowQueries,
      queriesByTenant,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit = 100): QueryPerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure query execution time
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  context?: { tenantId?: string; userId?: string }
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    performanceMonitor.recordQuery({
      query: queryName,
      duration,
      timestamp: new Date(),
      tenantId: context?.tenantId,
      userId: context?.userId,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    performanceMonitor.recordQuery({
      query: `${queryName} (FAILED)`,
      duration,
      timestamp: new Date(),
      tenantId: context?.tenantId,
      userId: context?.userId,
    });

    throw error;
  }
}

/**
 * Create a performance monitoring wrapper for database operations
 */
export function createMonitoredDb(db: Database, context?: { tenantId?: string; userId?: string }) {
  return new Proxy(db, {
    get(target, prop) {
      const original = target[prop as keyof Database];
      
      if (typeof original === 'function') {
        return async (...args: any[]) => {
          return measureQuery(
            `db.${String(prop)}`,
            () => (original as any).apply(target, args),
            context
          );
        };
      }
      
      return original;
    },
  });
}
