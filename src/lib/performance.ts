import { useEffect, useRef } from 'react';
import logger from '@/lib/logger';
import config from '@/config';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Hook for monitoring component render performance
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    if (!config.features.performanceMonitoring) return;

    renderCount.current += 1;
    renderStartTime.current = performance.now();

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      
      if (renderTime > 16) { // More than 1 frame (60fps)
        logger.warn(`Slow render in ${componentName}`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCount.current,
        });
      }
    };
  });
}

/**
 * Measure Web Vitals (Core Web Vitals)
 */
export function measureWebVitals() {
  if (!config.features.performanceMonitoring) return;

  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        const lcp: PerformanceMetric = {
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          rating: getRating('LCP', lastEntry.renderTime || lastEntry.loadTime),
        };
        
        logger.info('Web Vitals - LCP', lcp);
        reportMetric(lcp);
      });
      
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (error) {
      logger.error('Failed to observe LCP', error);
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid: PerformanceMetric = {
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            rating: getRating('FID', entry.processingStart - entry.startTime),
          };
          
          logger.info('Web Vitals - FID', fid);
          reportMetric(fid);
        });
      });
      
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (error) {
      logger.error('Failed to observe FID', error);
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        const cls: PerformanceMetric = {
          name: 'CLS',
          value: clsValue,
          rating: getRating('CLS', clsValue),
        };
        
        logger.info('Web Vitals - CLS', cls);
        reportMetric(cls);
      });
      
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      logger.error('Failed to observe CLS', error);
    }
  }

  // Time to First Byte (TTFB)
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const ttfb: PerformanceMetric = {
        name: 'TTFB',
        value: navigation.responseStart - navigation.requestStart,
        rating: getRating('TTFB', navigation.responseStart - navigation.requestStart),
      };
      
      logger.info('Web Vitals - TTFB', ttfb);
      reportMetric(ttfb);
    }
  });
}

function getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    TTFB: [800, 1800],
  };

  const [goodThreshold, poorThreshold] = thresholds[metric] || [0, 0];

  if (value <= goodThreshold) return 'good';
  if (value <= poorThreshold) return 'needs-improvement';
  return 'poor';
}

function reportMetric(metric: PerformanceMetric) {
  // Send to analytics service
  if (config.features.analytics) {
    try {
      // window.gtag?.('event', 'web_vitals', {
      //   event_category: 'Web Vitals',
      //   event_label: metric.name,
      //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      //   metric_rating: metric.rating,
      //   non_interaction: true,
      // });
    } catch (error) {
      logger.error('Failed to report metric to analytics', error);
    }
  }
}

/**
 * Measure API call performance
 */
export function measureApiCall(endpoint: string, startTime: number) {
  if (!config.features.performanceMonitoring) return;

  const duration = performance.now() - startTime;
  
  logger.debug(`API Call Performance: ${endpoint}`, {
    duration: `${duration.toFixed(2)}ms`,
    endpoint,
  });

  if (duration > 3000) {
    logger.warn(`Slow API call: ${endpoint}`, {
      duration: `${duration.toFixed(2)}ms`,
    });
  }
}

/**
 * Measure component mount time
 */
export function measureComponentMount(componentName: string): () => void {
  if (!config.features.performanceMonitoring) {
    return () => {};
  }

  const startTime = performance.now();
  
  return () => {
    const mountTime = performance.now() - startTime;
    
    logger.debug(`Component Mount: ${componentName}`, {
      mountTime: `${mountTime.toFixed(2)}ms`,
    });

    if (mountTime > 100) {
      logger.warn(`Slow component mount: ${componentName}`, {
        mountTime: `${mountTime.toFixed(2)}ms`,
      });
    }
  };
}
