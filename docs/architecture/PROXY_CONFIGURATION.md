# 🔌 Vite Proxy Configuration - Admin Dashboard

## Overview

The admin dashboard uses **Vite's built-in proxy** to forward API requests from the frontend (port 8080/8081/8082) to the backend (port 8002). This eliminates CORS issues during development.

---

## 🎯 How It Works

### **Request Flow**

```
Browser (http://localhost:8082)
    ↓
    Makes request to: /api/v1/auth/login
    ↓
Vite Dev Server (port 8082)
    ↓
    Proxy intercepts /api/* requests
    ↓
    Forwards to: http://localhost:8002/api/v1/auth/login
    ↓
Backend API (port 8002)
    ↓
    Responds with data
    ↓
    Response flows back through proxy
    ↓
Browser receives response
```

---

## ⚙️ Configuration Files

### **1. `vite.config.ts`** - Proxy Configuration

```typescript
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:8002',  // Backend server
        changeOrigin: true,                // Changes host header
        secure: false,                     // Allows self-signed certs
        ws: true,                          // WebSocket support
      }
    }
  },
}));
```

**What each option does:**
- `target`: Backend server URL (admin-api on port 8002)
- `changeOrigin`: Changes the `Host` header to match the target
- `secure`: Set to `false` for local development (no SSL verification)
- `ws`: Enable WebSocket proxying for real-time features

### **2. `.env`** - Environment Variables

```properties
# Use relative URLs for API calls (Vite proxy will handle routing)
VITE_API_BASE_URL=/api/v1
```

**Important:** The `VITE_API_BASE_URL` must be a **relative path** starting with `/api` so Vite's proxy intercepts it.

### **3. `src/services/api.ts`** - API Client

```typescript
/**
 * API service - Uses relative URLs for Vite proxy
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
```

**Key Points:**
- ✅ **Correct**: `/api/v1` (relative path → proxy intercepts)
- ❌ **Wrong**: `http://localhost:8002/api/v1` (absolute URL → bypasses proxy)

### **4. Backend CORS** - `services/admin-api/app/core/config.py`

```python
CORS_ORIGINS: Union[str, list[str]] = Field(
    default=[
        "http://localhost:8080",  # Vite default port
        "http://localhost:8081",  # Vite fallback port 1
        "http://localhost:8082",  # Vite fallback port 2
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082"
    ],
    env="CORS_ORIGINS"
)
```

**Why all three ports?**
Vite tries ports 8080, 8081, 8082 in order until it finds a free one.

---

## ✅ Verifying the Setup

### **1. Check Backend is Running**
```bash
curl http://localhost:8002/docs
# Should return HTML (Swagger UI)
```

### **2. Check Frontend Proxy Works**
```bash
# Assuming frontend is on port 8082
curl http://localhost:8082/api/v1/health
# Should proxy to backend and return response
```

### **3. Check in Browser DevTools**
Open Chrome DevTools → Network tab → Login → Check:
- **Request URL**: `http://localhost:8082/api/v1/auth/login`
- **Status**: Should be 200 or 401 (not CORS error)
- **Response**: JSON from backend

---

## 🐛 Troubleshooting

### **Problem 1: Proxy Error - ECONNREFUSED**

**Symptoms:**
```
[vite] http proxy error: /api/v1/auth/login
AggregateError [ECONNREFUSED]
```

**Cause:** Backend (port 8002) is not running

**Fix:**
```bash
cd /home/cyberdude/Documents/Projects/CA-final/services/admin-api
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

---

### **Problem 2: CORS Errors Despite Proxy**

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Cause:** API client is using absolute URLs instead of relative paths

**Fix:**
Check `src/services/api.ts`:
```typescript
// ✅ Correct
const API_BASE_URL = '/api/v1';

// ❌ Wrong
const API_BASE_URL = 'http://localhost:8002/api/v1';
```

---

### **Problem 3: 404 Not Found on API Calls**

**Symptoms:**
```
GET http://localhost:8082/api/v1/clients 404 Not Found
```

**Cause:** Proxy configuration mismatch or backend route doesn't exist

**Fix:**
1. Check `vite.config.ts` has `/api` proxy
2. Verify backend has the route:
```bash
curl http://localhost:8002/docs
# Check if the endpoint exists in Swagger UI
```

---

### **Problem 4: Proxy Works but Backend Returns 401**

**Symptoms:**
```
POST /api/v1/auth/login → 401 Unauthorized
```

**Cause:** This is **normal** if credentials are wrong

**Fix:** Use correct credentials:
```
Email: superadmin@taxease.ca
Password: demo123
```

---

## 📊 Proxy Debugging

### **Enable Proxy Logging**

The `vite.config.ts` already includes logging:

```typescript
proxy: {
  '/api': {
    configure: (proxy) => {
      proxy.on('error', (err) => {
        console.log('❌ Proxy error:', err);
      });
      proxy.on('proxyReq', (proxyReq, req) => {
        console.log('➡️  Proxying:', req.method, req.url);
      });
      proxy.on('proxyRes', (proxyRes, req) => {
        console.log('✅ Proxied:', req.url, '→', proxyRes.statusCode);
      });
    },
  }
}
```

**Check Vite console output** to see:
- `➡️ Proxying: POST /api/v1/auth/login`
- `✅ Proxied: /api/v1/auth/login → 200`

---

## 🔄 Production Setup

**Note:** Vite proxy **only works in development**. For production:

### **Option 1: Deploy Both on Same Domain**
```
https://yourdomain.com/         → Frontend (static files)
https://yourdomain.com/api/     → Backend (reverse proxy)
```

### **Option 2: Use Absolute URLs with CORS**
Update `.env.production`:
```properties
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

Backend must allow production origin:
```python
CORS_ORIGINS = ["https://yourdomain.com"]
```

---

## 📝 Quick Reference

### **Service Ports**
- **Frontend (Vite)**: 8080, 8081, or 8082
- **Backend (Admin API)**: 8002
- **Tax-hub Backend**: 8001 (legacy, not used by dashboard)

### **Important Files**
1. `vite.config.ts` - Proxy rules
2. `.env` - API base URL
3. `src/services/api.ts` - API client
4. `services/admin-api/app/core/config.py` - CORS origins

### **Key Commands**
```bash
# Start backend
cd services/admin-api && source venv/bin/activate && uvicorn app.main:app --port 8002 --reload

# Start frontend
cd tax-hub-dashboard && npm run dev

# Test proxy
curl http://localhost:8082/api/v1/health
```

---

## ✨ Summary

✅ **Frontend** uses relative URLs (`/api/v1`)  
✅ **Vite proxy** forwards to `http://localhost:8002`  
✅ **Backend** allows CORS from `http://localhost:8080/8081/8082`  
✅ **No CORS errors** during development  
✅ **Permanent solution** - configured in version control  

**Result:** Seamless API communication between frontend and backend! 🎉

---

**Last Updated**: December 20, 2024  
**Maintained By**: Development Team
