# Quick Start: Redis Setup

## What Changed?

Your application now supports **Redis** for session management! 🎉

## Benefits

- ✅ **Faster session access** - Centralized storage
- ✅ **Better security** - Sensitive data stored server-side
- ✅ **Analytics ready** - Track active sessions
- ✅ **No backend needed** - Uses Upstash's HTTP API
- ✅ **Automatic fallback** - Still works without Redis

## Setup (5 minutes)

### 1. Get Redis Credentials (Free)

1. Sign up at [https://upstash.com/](https://upstash.com/)
2. Create a new Redis database (free tier)
3. Copy your credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2. Configure Environment

Create `.env` file in project root:

```bash
cp .env.example .env
```

Add your credentials:

```env
VITE_UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
VITE_UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 3. Restart Dev Server

```bash
npm run dev
```

That's it! Your app now uses Redis for sessions. 🚀

## Check If It's Working

Open browser console on login - you should see:

```
✅ Session stored in Redis
✅ Session retrieved from Redis
```

## Without Redis?

No problem! The app automatically falls back to cookies if Redis is not configured. Everything still works.

## Learn More

See [REDIS_INTEGRATION.md](./REDIS_INTEGRATION.md) for:
- Detailed API reference
- Usage examples (caching, rate limiting, analytics)
- Troubleshooting guide
- Security best practices

---

**Note:** Never commit your `.env` file - it's already in `.gitignore`
