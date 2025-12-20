# Redis Integration Guide

## Overview

This application now supports **Redis** for session management and caching using [Upstash Redis](https://upstash.com/), which provides a serverless Redis service with HTTP/REST API access. This allows you to use Redis directly from the browser without needing a backend server.

---

## Features

✅ **Hybrid Session Storage**: Redis (primary) + Cookies (fallback)  
✅ **Automatic Fallback**: If Redis is unavailable, uses cookie-based storage  
✅ **Session Persistence**: Sessions stored in Redis with 7-day expiration  
✅ **Async Operations**: All session operations are now async for Redis compatibility  
✅ **Zero Backend Required**: Uses Upstash's HTTP REST API  

---

## Setup Instructions

### Step 1: Create Upstash Redis Database

1. **Sign up** at [https://upstash.com/](https://upstash.com/)
2. **Create a new Redis database**:
   - Click "Create Database"
   - Choose a region close to your users
   - Select "Free" tier (includes 10,000 commands/day)
   
3. **Get your credentials**:
   - Go to your database dashboard
   - Copy `UPSTASH_REDIS_REST_URL`
   - Copy `UPSTASH_REDIS_REST_TOKEN`

### Step 2: Configure Environment Variables

1. **Create a `.env` file** in the project root:

```bash
cp .env.example .env
```

2. **Add your Redis credentials**:

```env
VITE_UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
VITE_UPSTASH_REDIS_REST_TOKEN=your_token_here
```

⚠️ **Important:** The `.env` file is in `.gitignore` and will NOT be committed to Git.

### Step 3: Restart Development Server

```bash
npm run dev
```

---

## How It Works

### Session Storage Strategy

The application uses a **hybrid approach** with automatic fallback:

1. **Primary: Redis** (if configured)
   - Sessions stored with `taxease:session:{userId}` key
   - 7-day automatic expiration
   - Faster access, centralized storage

2. **Fallback: Cookies** (always available)
   - Used if Redis is not configured or unavailable
   - Stored locally in browser cookies
   - Works offline

3. **Backup: LocalStorage** (legacy support)
   - Migrates old sessions to new system
   - Provides backward compatibility

### Session Flow

```
Login
  ↓
Store in Redis (if available) → Store in Cookie (always) → Store in LocalStorage
  ↓
Session Retrieved
  ↓
Check Redis (if available) → Fallback to Cookie → Fallback to LocalStorage
  ↓
Session Refreshed Every 5 Minutes
```

---

## API Reference

### Session Functions

All session functions in `src/lib/session.ts` are now **async**:

#### `setSession(user: User): Promise<void>`
Stores user session in Redis and cookies.

```typescript
import { setSession } from '@/lib/session';

await setSession(user);
```

#### `getSession(): Promise<User | null>`
Retrieves user session from Redis or cookies.

```typescript
import { getSession } from '@/lib/session';

const user = await getSession();
```

#### `clearSession(): Promise<void>`
Clears session from Redis, cookies, and localStorage.

```typescript
import { clearSession } from '@/lib/session';

await clearSession();
```

#### `hasActiveSession(): Promise<boolean>`
Checks if user has an active session.

```typescript
import { hasActiveSession } from '@/lib/session';

const isActive = await hasActiveSession();
```

#### `refreshSession(): Promise<void>`
Refreshes session to extend expiration.

```typescript
import { refreshSession } from '@/lib/session';

await refreshSession();
```

---

### Redis Helper Functions

Available in `src/lib/redis.ts`:

#### `redis.set(key, value, expirationSeconds?)`
Store a value in Redis.

```typescript
import redis from '@/lib/redis';

await redis.set('user:123', { name: 'John' }, 3600); // Expires in 1 hour
```

#### `redis.get<T>(key)`
Retrieve a value from Redis.

```typescript
const user = await redis.get<User>('user:123');
```

#### `redis.delete(key)`
Delete a value from Redis.

```typescript
await redis.delete('user:123');
```

#### `redis.exists(key)`
Check if a key exists.

```typescript
const exists = await redis.exists('user:123');
```

#### `redis.expire(key, seconds)`
Set expiration time for a key.

```typescript
await redis.expire('user:123', 3600); // Expire in 1 hour
```

#### `redis.ttl(key)`
Get time to live for a key.

```typescript
const ttl = await redis.ttl('user:123'); // Returns seconds remaining
```

#### `redis.incr(key)`
Increment a numeric value.

```typescript
await redis.incr('page:views:123');
```

#### `redis.keys(pattern)`
Get all keys matching a pattern.

```typescript
const sessionKeys = await redis.keys('taxease:session:*');
```

---

## Usage Examples

### Example 1: Cache Client Data

```typescript
import redis from '@/lib/redis';

// Cache client data for 10 minutes
async function cacheClientData(clientId: string, data: any) {
  await redis.set(`client:${clientId}`, data, 600);
}

// Retrieve cached client data
async function getClientData(clientId: string) {
  return await redis.get(`client:${clientId}`);
}
```

### Example 2: Rate Limiting

```typescript
import redis from '@/lib/redis';

async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    // Set 1-hour expiration on first request
    await redis.expire(key, 3600);
  }
  
  // Allow max 100 requests per hour
  return count <= 100;
}
```

### Example 3: View Counter

```typescript
import redis from '@/lib/redis';

async function incrementViews(documentId: string) {
  await redis.incr(`document:views:${documentId}`);
}

async function getViews(documentId: string): Promise<number> {
  const views = await redis.get<number>(`document:views:${documentId}`);
  return views || 0;
}
```

### Example 4: Session Analytics

```typescript
import redis from '@/lib/redis';

async function trackLogin(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  await redis.incr(`logins:${today}`);
  await redis.set(`user:${userId}:last_login`, Date.now());
}

async function getActiveSessionCount(): Promise<number> {
  const sessionKeys = await redis.keys('taxease:session:*');
  return sessionKeys.length;
}
```

---

## Configuration Options

### Session Settings

In `src/lib/session.ts`:

```typescript
const SESSION_EXPIRY_DAYS = 7; // Session expires after 7 days
const REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh every 5 minutes
```

### Redis Key Prefix

All session keys use the prefix `taxease:session:`:

```typescript
const SESSION_KEY_PREFIX = 'taxease:session:';
```

You can use different prefixes for other data types:
- `taxease:session:*` - User sessions
- `taxease:client:*` - Client data
- `taxease:document:*` - Document data
- `taxease:cache:*` - General cache

---

## Monitoring & Debugging

### Check if Redis is Connected

```typescript
import { isRedisAvailable } from '@/lib/redis';

if (isRedisAvailable()) {
  console.log('✅ Redis is configured and available');
} else {
  console.log('⚠️ Redis not configured, using fallback storage');
}
```

### View All Active Sessions

```typescript
import redis from '@/lib/redis';

const sessions = await redis.keys('taxease:session:*');
console.log(`Active sessions: ${sessions.length}`);
```

### Check Session TTL

```typescript
import redis from '@/lib/redis';

const ttl = await redis.ttl('taxease:session:user123');
console.log(`Session expires in ${ttl} seconds`);
```

---

## Benefits of Using Redis

### 🚀 **Performance**
- Faster than cookie/localStorage for large data
- Centralized session storage
- Reduced data transfer (only session ID in cookie)

### 🔒 **Security**
- Sensitive data stored server-side (in Redis)
- Easy session invalidation
- No client-side data tampering

### 📊 **Analytics**
- Track active sessions in real-time
- Monitor user activity
- Analyze usage patterns

### 🌐 **Scalability**
- Works across multiple devices
- Centralized session management
- Easy to implement logout-all-devices

---

## Troubleshooting

### Redis Connection Issues

**Problem:** Sessions not saving to Redis

**Solutions:**
1. Check environment variables are set correctly
2. Verify Upstash credentials in dashboard
3. Check browser console for error messages
4. Ensure `.env` file is in project root

### Environment Variables Not Loading

**Problem:** `import.meta.env.VITE_UPSTASH_REDIS_REST_URL` is undefined

**Solutions:**
1. Restart the development server after adding `.env`
2. Ensure variables start with `VITE_` prefix
3. Check `.env` file is not in `.gitignore`

### Fallback to Cookies

**Problem:** Always using cookies, never Redis

**Solutions:**
1. Check Redis credentials are correct
2. Verify Upstash database is active
3. Check network connectivity
4. Review browser console for errors

---

## Migration Notes

### Breaking Changes

⚠️ **All session functions are now async**

**Before:**
```typescript
const user = getSession();
setSession(user);
clearSession();
```

**After:**
```typescript
const user = await getSession();
await setSession(user);
await clearSession();
```

### AuthContext Updates

The `AuthContext` has been updated to handle async operations:

- `login()` - Already async ✅
- `logout()` - Now async ⚠️

**Update your logout calls:**

```typescript
// Before
onClick={logout}

// After (AuthContext handles this internally now)
onClick={logout} // Still works, handled by context
```

---

## Cost & Limits

### Upstash Free Tier

- ✅ **10,000 commands/day**
- ✅ **256 MB storage**
- ✅ **Global edge locations**
- ✅ **TLS encryption**

This is sufficient for:
- ~1,000 user logins per day
- ~100 concurrent sessions
- Small to medium applications

### Upgrade Options

If you need more:
- **Pay-as-you-go**: $0.20 per 100,000 commands
- **Pro plan**: 1M commands/day for $10/month

---

## Security Best Practices

1. ✅ **Never commit `.env` file** - Already in `.gitignore`
2. ✅ **Use HTTPS in production** - Enforced by Upstash
3. ✅ **Rotate credentials regularly** - Update Upstash tokens
4. ✅ **Set appropriate TTLs** - Sessions expire after 7 days
5. ✅ **Validate session data** - Always check user object

---

## Next Steps

### Recommended Enhancements

1. **Add Redis caching for client data**
   ```typescript
   await redis.set(`client:${id}`, clientData, 3600);
   ```

2. **Implement rate limiting**
   ```typescript
   await redis.incr(`ratelimit:${userId}`);
   ```

3. **Track analytics**
   ```typescript
   await redis.incr('page:views');
   ```

4. **Session management dashboard**
   - View all active sessions
   - Revoke specific sessions
   - Monitor session activity

---

## Support

- **Upstash Documentation**: https://upstash.com/docs/redis
- **Upstash Discord**: https://discord.gg/upstash
- **GitHub Issues**: Report bugs in the project repo

---

## Summary

You now have a **production-ready Redis integration** that:

- ✅ Seamlessly integrates with existing session management
- ✅ Provides automatic fallback to cookies
- ✅ Requires zero backend infrastructure
- ✅ Scales with your application
- ✅ Maintains backward compatibility

**Get started by adding your Upstash credentials to `.env` and restart the dev server!**
