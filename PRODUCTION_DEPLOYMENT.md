# Production Deployment Guide

This guide covers deploying the Tax Hub Admin dashboard to production.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Build Process](#build-process)
4. [Deployment Options](#deployment-options)
5. [Post-Deployment](#post-deployment)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### 1. Environment Variables
- [ ] Copy `.env.production` and configure all values
- [ ] Set up Upstash Redis credentials (if using Redis)
- [ ] Configure production API URL
- [ ] Update session timeout settings
- [ ] Enable/disable feature flags as needed

### 2. Security Review
- [ ] Review Content Security Policy (CSP) in `index.html`
- [ ] Verify HTTPS is enforced
- [ ] Check session management settings
- [ ] Review authentication flow
- [ ] Verify no sensitive data in localStorage/cookies

### 3. Code Quality
- [ ] Run `npm run build` successfully
- [ ] Fix all TypeScript errors
- [ ] Run linting: `npm run lint`
- [ ] Test all critical user flows
- [ ] Test error boundaries
- [ ] Verify PDF preview functionality

### 4. Performance
- [ ] Bundle size < 1MB (check build output)
- [ ] Test on slow 3G connection
- [ ] Verify lazy loading works
- [ ] Check Web Vitals (LCP, FID, CLS)
- [ ] Test with Chrome DevTools Lighthouse

---

## Environment Configuration

### 1. Create Production Environment File

Copy `.env.production` to `.env.production.local` and configure:

```bash
# Application
VITE_APP_NAME=Tax Hub Admin
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production

# API Configuration
VITE_API_BASE_URL=https://api.yourdomain.com  # ⚠️ UPDATE THIS

# Redis (Optional but Recommended)
VITE_REDIS_URL=https://your-redis-url.upstash.io  # ⚠️ UPDATE THIS
VITE_REDIS_TOKEN=your-redis-token-here  # ⚠️ UPDATE THIS

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Security
VITE_ENABLE_CSP=true
VITE_SESSION_TIMEOUT=30  # minutes

# Logging
VITE_LOG_LEVEL=error
```

### 2. Redis Setup (Recommended)

For production, we **strongly recommend** using Redis for session management:

1. **Create Upstash Redis Database:**
   - Go to https://console.upstash.com/
   - Create a new Redis database
   - Select region closest to your users
   - Copy REST URL and Token

2. **Configure Environment:**
   ```bash
   VITE_REDIS_URL=https://your-redis-url.upstash.io
   VITE_REDIS_TOKEN=your_token_here
   ```

3. **Test Connection:**
   - Build and run locally with production config
   - Verify Redis connection in browser console
   - Check for "Redis connected" message

---

## Build Process

### 1. Install Dependencies
```bash
npm install
```

### 2. Build for Production
```bash
npm run build
```

This will:
- ✅ Compile TypeScript
- ✅ Bundle and minify code
- ✅ Split code into chunks
- ✅ Remove console.logs
- ✅ Generate source maps (hidden)
- ✅ Optimize assets
- ✅ Output to `dist/` directory

### 3. Preview Production Build Locally
```bash
npm run preview
```

Test the production build locally before deploying:
- Verify all pages load
- Test authentication flow
- Check PDF previews
- Test Redis connection
- Verify error boundaries

---

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all `VITE_*` variables from `.env.production`
   - Redeploy to apply changes

4. **Vercel Configuration (`vercel.json`):**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ],
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "X-Content-Type-Options",
             "value": "nosniff"
           },
           {
             "key": "X-Frame-Options",
             "value": "DENY"
           },
           {
             "key": "X-XSS-Protection",
             "value": "1; mode=block"
           }
         ]
       }
     ]
   }
   ```

### Option 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

3. **Netlify Configuration (`netlify.toml`):**
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-XSS-Protection = "1; mode=block"
       X-Content-Type-Options = "nosniff"
   ```

### Option 3: AWS S3 + CloudFront

1. **Build:**
   ```bash
   npm run build
   ```

2. **Upload to S3:**
   ```bash
   aws s3 sync dist/ s3://your-bucket-name --delete
   ```

3. **Configure CloudFront:**
   - Create CloudFront distribution
   - Point to S3 bucket
   - Configure SSL certificate
   - Set up error pages (404 → index.html)
   - Add security headers via Lambda@Edge

### Option 4: Docker

1. **Create `Dockerfile`:**
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/nginx.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Build and Run:**
   ```bash
   docker build -t tax-hub-admin .
   docker run -p 80:80 tax-hub-admin
   ```

---

## Post-Deployment

### 1. Verify Deployment

- [ ] Visit production URL
- [ ] Test login flow
- [ ] Navigate to all pages
- [ ] Check PDF previews
- [ ] Test client detail page
- [ ] Verify T1 form display
- [ ] Test document uploads (if enabled)
- [ ] Check responsive design

### 2. Test Error Handling

- [ ] Force a JavaScript error (React ErrorBoundary)
- [ ] Test with network offline
- [ ] Test with slow connection
- [ ] Verify error messages display correctly

### 3. Performance Check

Run Lighthouse audit:
```bash
npm install -g lighthouse
lighthouse https://your-domain.com --view
```

Target scores:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 90

### 4. Security Headers Check

Use https://securityheaders.com to verify:
- [ ] Content-Security-Policy
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] X-XSS-Protection
- [ ] Strict-Transport-Security (HSTS)

---

## Monitoring

### 1. Application Health

The app includes a health check endpoint:

```typescript
import { checkHealth } from '@/lib/health';

// Manual health check
const health = await checkHealth();
console.log(health);

// Health is automatically monitored every minute
// Check browser console for health status
```

### 2. Performance Monitoring

Web Vitals are automatically tracked:
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Time to First Byte (TTFB)

View metrics in browser console (development mode) or connect to analytics service.

### 3. Error Tracking

To integrate error tracking (e.g., Sentry):

1. **Install Sentry:**
   ```bash
   npm install @sentry/react
   ```

2. **Configure in `main.tsx`:**
   ```typescript
   import * as Sentry from "@sentry/react";

   Sentry.init({
     dsn: "YOUR_SENTRY_DSN",
     environment: config.app.environment,
     enabled: config.features.errorTracking,
   });
   ```

3. **Update Logger:**
   In `src/lib/logger.ts`, uncomment Sentry integration.

### 4. Analytics

To integrate analytics (e.g., Google Analytics):

1. **Add GA Script to `index.html`:**
   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'GA_MEASUREMENT_ID');
   </script>
   ```

2. **Track Events:**
   ```typescript
   if (config.features.analytics) {
     window.gtag?.('event', 'page_view', {
       page_path: window.location.pathname,
     });
   }
   ```

---

## Troubleshooting

### Build Fails

**Problem:** `npm run build` fails with errors

**Solutions:**
1. Clear cache: `rm -rf node_modules package-lock.json && npm install`
2. Check TypeScript errors: `npm run type-check`
3. Fix any type errors in T1 form (see `T1_FORM_RESTRUCTURE.md`)

### Redis Connection Issues

**Problem:** "Redis connection failed" in production

**Solutions:**
1. Verify `VITE_REDIS_URL` and `VITE_REDIS_TOKEN` are correct
2. Check Upstash dashboard for connection issues
3. Test with curl:
   ```bash
   curl https://your-redis-url.upstash.io/get/test \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
4. App will fallback to cookies if Redis unavailable

### Session Not Persisting

**Problem:** Users logged out on refresh

**Solutions:**
1. Check browser console for session errors
2. Verify cookies are enabled
3. Check Redis connection
4. Verify session timeout settings
5. Test in incognito mode (no extensions)

### Large Bundle Size

**Problem:** Bundle size > 1MB

**Solutions:**
1. Enable code splitting (already configured)
2. Use dynamic imports for large components
3. Optimize images (compress, use WebP)
4. Remove unused dependencies
5. Use `npm run build -- --mode production` to ensure minification

### CSP Violations

**Problem:** Content Security Policy blocking resources

**Solutions:**
1. Check browser console for CSP errors
2. Update CSP in `index.html` to allow necessary domains
3. For Redis, ensure `https://*.upstash.io` is allowed in `connect-src`
4. Test without CSP first, then gradually restrict

### Performance Issues

**Problem:** Slow page loads

**Solutions:**
1. Check bundle size and enable code splitting
2. Lazy load routes:
   ```typescript
   const ClientDetail = lazy(() => import('./pages/ClientDetail'));
   ```
3. Optimize images and PDFs
4. Enable compression on server (gzip/brotli)
5. Use CDN for static assets
6. Check Redis latency

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Check error logs
- [ ] Review performance metrics
- [ ] Monitor health checks

**Monthly:**
- [ ] Update dependencies: `npm update`
- [ ] Security audit: `npm audit`
- [ ] Review and rotate API keys
- [ ] Check disk usage (if self-hosted)

**Quarterly:**
- [ ] Review and update CSP
- [ ] Performance audit with Lighthouse
- [ ] Security headers review
- [ ] User feedback review

---

## Support

For issues or questions:
- Check documentation in `docs/` folder
- Review `REDIS_INTEGRATION.md` for Redis setup
- Review `T1_FORM_RESTRUCTURE.md` for T1 form structure
- Contact: support@taxhub.com

---

## Next Steps

After successful deployment:

1. **Set up monitoring alerts**
2. **Configure backup strategy** (for Redis/database)
3. **Create staging environment**
4. **Set up CI/CD pipeline**
5. **Document incident response procedures**
6. **Train team on production access**

Happy deploying! 🚀
