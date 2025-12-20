/**
 * Application Configuration
 * Centralized configuration management for the Tax Hub Admin application
 */

export const config = {
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Tax Hub Admin',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE || 'development',
  },

  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
    maxFileSize: Number(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 10,
  },

  redis: {
    enabled: !!(
      import.meta.env.VITE_UPSTASH_REDIS_REST_URL &&
      import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN
    ),
    url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
    token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
  },

  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    errorTracking: import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true',
    performanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
  },

  security: {
    enableCSP: import.meta.env.VITE_ENABLE_CSP === 'true',
    sessionTimeoutMinutes: Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) || 30,
  },

  logging: {
    level: import.meta.env.VITE_LOG_LEVEL || 'info',
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true',
  },

  // Helper methods
  isDevelopment: () => import.meta.env.DEV,
  isProduction: () => import.meta.env.PROD,
  
  // Validate configuration
  validate: () => {
    const errors: string[] = [];

    if (!config.api.baseUrl) {
      errors.push('API base URL is not configured');
    }

    if (config.isProduction() && !config.redis.enabled) {
      console.warn('⚠️ Redis is not configured in production. Consider enabling for better performance.');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }

    return true;
  },
} as const;

// Validate configuration on load in production
if (config.isProduction()) {
  try {
    config.validate();
    console.log('✅ Configuration validated successfully');
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
  }
}

export default config;
