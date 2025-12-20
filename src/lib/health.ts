import config from '@/config';
import logger from '@/lib/logger';

/**
 * Health check endpoint for monitoring
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    redis: 'connected' | 'disconnected' | 'not_configured';
    storage: 'available' | 'unavailable';
    api: 'reachable' | 'unreachable';
  };
}

export async function checkHealth(): Promise<HealthStatus> {
  const startTime = performance.now();
  
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.app.version,
    environment: config.app.environment,
    checks: {
      redis: 'not_configured',
      storage: 'available',
      api: 'reachable',
    },
  };

  try {
    // Check Redis connection
    if (config.redis.url) {
      try {
        const { isRedisAvailable } = await import('@/lib/redis');
        const redisAvailable = await isRedisAvailable();
        health.checks.redis = redisAvailable ? 'connected' : 'disconnected';
        
        if (!redisAvailable) {
          health.status = 'degraded';
          logger.warn('Redis health check failed');
        }
      } catch (error) {
        health.checks.redis = 'disconnected';
        health.status = 'degraded';
        logger.error('Redis health check error', error);
      }
    }

    // Check localStorage availability
    try {
      localStorage.setItem('health_check', 'test');
      localStorage.removeItem('health_check');
      health.checks.storage = 'available';
    } catch (error) {
      health.checks.storage = 'unavailable';
      health.status = 'degraded';
      logger.error('Storage health check failed', error);
    }

    // Check API reachability
    try {
      const response = await fetch(`${config.api.baseUrl}/health`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      
      health.checks.api = response.ok ? 'reachable' : 'unreachable';
      
      if (!response.ok) {
        health.status = 'degraded';
        logger.warn('API health check failed', { status: response.status });
      }
    } catch (error) {
      // API might not have a health endpoint, this is okay
      health.checks.api = 'unreachable';
      logger.debug('API health check skipped (no endpoint)', error);
    }

  } catch (error) {
    health.status = 'unhealthy';
    logger.error('Health check failed', error);
  }

  const duration = performance.now() - startTime;
  logger.debug('Health check completed', {
    status: health.status,
    duration: `${duration.toFixed(2)}ms`,
    checks: health.checks,
  });

  return health;
}

/**
 * Initialize health check polling
 */
export function startHealthMonitoring(intervalMs: number = 60000) {
  if (!config.features.performanceMonitoring) {
    return;
  }

  logger.info('Starting health monitoring', { intervalMs });

  // Initial health check
  checkHealth().then((health) => {
    logger.info('Initial health check', health);
  });

  // Periodic health checks
  const intervalId = setInterval(async () => {
    const health = await checkHealth();
    
    if (health.status === 'unhealthy') {
      logger.error('Application health check failed', health);
    } else if (health.status === 'degraded') {
      logger.warn('Application health degraded', health);
    } else {
      logger.debug('Application healthy', health);
    }
  }, intervalMs);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId);
  });

  return intervalId;
}
