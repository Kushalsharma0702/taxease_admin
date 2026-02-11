# Connection Setup Guide

## Overview

The tax-hub-dashboard-admin frontend is now connected to the main backend and database.

## Configuration Summary

### Backend Connection
- **Backend URL**: `http://localhost:8001/api/v1`
- **Database**: PostgreSQL (`CA_Project` database)
- **CORS**: Enabled for all origins (configured in `backend/app/main.py`)

### Frontend Configuration
- **Port**: 8080 (Vite dev server)
- **API Proxy**: Configured in `vite.config.ts` to proxy `/api/*` requests to `http://localhost:8001`
- **Environment**: Uses `.env` file with `VITE_API_BASE_URL=/api/v1`

### Database Configuration
- **Location**: Centralized `.env` file at project root (`/home/cyberdude/Documents/Projects/CA-final/.env`)
- **Connection**: All services use the same database configuration
- **Schema**: Managed by `database/schemas.py`

## Starting the Services

### 1. Start the Backend

```bash
cd /home/cyberdude/Documents/Projects/CA-final
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8001
```

The backend will be available at: `http://localhost:8001`
- API Documentation: `http://localhost:8001/docs`
- Health Check: `http://localhost:8001/`

### 2. Start the Frontend

```bash
cd /home/cyberdude/Documents/Projects/CA-final/tax-hub-dashboard-admin
npm install  # If not already done
npm run dev
```

The frontend will be available at: `http://localhost:8080`

### 3. Verify Connection

1. **Check Backend Health**:
   ```bash
   curl http://localhost:8001/
   # Should return: {"status":"ok"}
   ```

2. **Check Frontend Proxy**:
   ```bash
   curl http://localhost:8080/api/v1/
   # Should proxy to backend and return: {"status":"ok"}
   ```

3. **Test in Browser**:
   - Open `http://localhost:8080`
   - Open DevTools → Network tab
   - Try logging in
   - Check that API requests go to `/api/v1/*` and are proxied correctly

## Environment Variables

### Project Root `.env` (Backend & Database)
Located at: `/home/cyberdude/Documents/Projects/CA-final/.env`

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=CA_Project
DB_USER=postgres
DB_PASSWORD=Kushal07
JWT_SECRET_KEY=your-secret-key-here
STATIC_OTP=123456
STORAGE_PATH=./storage/uploads
```

### Frontend `.env` (Frontend)
Located at: `/home/cyberdude/Documents/Projects/CA-final/tax-hub-dashboard-admin/.env`

```env
VITE_API_BASE_URL=/api/v1
```

**Note**: The frontend uses a relative URL (`/api/v1`) which is proxied by Vite to the backend.

## How It Works

### Request Flow

```
Browser (http://localhost:8080)
    ↓
    Makes request to: /api/v1/admin/auth/login
    ↓
Vite Dev Server (port 8080)
    ↓
    Proxy intercepts /api/* requests
    ↓
    Forwards to: http://localhost:8001/api/v1/admin/auth/login
    ↓
Backend API (port 8001)
    ↓
    Connects to PostgreSQL database
    ↓
    Returns response
    ↓
    Response flows back through proxy
    ↓
Browser receives response
```

## Troubleshooting

### Backend Not Starting

**Error**: `ModuleNotFoundError` or import errors
**Solution**: 
```bash
cd /home/cyberdude/Documents/Projects/CA-final/backend
pip install -r requirements.txt
```

### Database Connection Failed

**Error**: `could not connect to server` or `database does not exist`
**Solution**:
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify `.env` file has correct database credentials
3. Create database if needed: `createdb CA_Project`

### Frontend Can't Connect to Backend

**Error**: `ECONNREFUSED` or CORS errors
**Solution**:
1. Verify backend is running on port 8001
2. Check `vite.config.ts` proxy configuration
3. Ensure `.env` has `VITE_API_BASE_URL=/api/v1` (relative path)

### CORS Errors

**Error**: `Access to XMLHttpRequest blocked by CORS policy`
**Solution**: Backend already has CORS enabled (`allow_origins=["*"]`). If issues persist, check:
1. Backend is running
2. Frontend is using relative URLs (not absolute)
3. Vite proxy is configured correctly

## API Endpoints

The backend provides the following main endpoints:

- **Authentication**: `/api/v1/admin/auth/login`, `/api/v1/admin/auth/register`
- **Clients**: `/api/v1/admin/clients`, `/api/v1/admin/clients/{id}`
- **Documents**: `/api/v1/admin/documents`
- **Payments**: `/api/v1/admin/payments`
- **Analytics**: `/api/v1/admin/analytics`
- **Chat**: `/api/v1/chat/{client_id}`

See `backend/README.md` for full API documentation.

## Next Steps

1. **Start both services** (backend and frontend)
2. **Test login** with admin credentials
3. **Verify data** appears in the dashboard
4. **Check database** to ensure data is being stored correctly

## Files Modified

- ✅ `tax-hub-dashboard-admin/vite.config.ts` - Added proxy configuration
- ✅ `tax-hub-dashboard-admin/src/config/index.ts` - Updated default API URL
- ✅ `tax-hub-dashboard-admin/.env` - Already configured with relative URL

## Database Schema

The database schema is defined in `database/schemas.py` and includes:
- `users` - Client user accounts
- `clients` - Client records
- `admins` - Admin/superadmin accounts
- `tax_returns` - Tax return data
- `documents` - Document metadata
- `payments` - Payment records
- `notifications` - Notifications
- `chat_messages` - Chat messages
- `t1_returns_flat` - T1 form data (flat structure)

To create/update the schema:
```bash
cd /home/cyberdude/Documents/Projects/CA-final
python3 database/schemas.py
```






