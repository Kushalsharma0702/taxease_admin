import config from '@/config';

/**
 * Logger utility for consistent logging across the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = config.isDevelopment();
  private logLevel = config.logging.level;

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel as LogLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug') && config.logging.enableDebug) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, error));
      
      // In production, you might want to send errors to a tracking service
      if (!this.isDevelopment && config.features.errorTracking) {
        this.sendToErrorTracking(message, error);
      }
    }
  }

  private sendToErrorTracking(message: string, error?: any): void {
    // Placeholder for error tracking service integration
    // e.g., Sentry, LogRocket, etc.
    try {
      // window.Sentry?.captureException(error, { extra: { message } });
    } catch (err) {
      console.error('Failed to send error to tracking service:', err);
    }
  }

  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  table(data: any): void {
    if (this.isDevelopment) {
      console.table(data);
    }
  }

  time(label: string): void {
    if (this.isDevelopment || config.features.performanceMonitoring) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment || config.features.performanceMonitoring) {
      console.timeEnd(label);
    }
  }
}

export const logger = new Logger();
export default logger;
