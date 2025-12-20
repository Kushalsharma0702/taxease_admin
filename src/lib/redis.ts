import { Redis } from '@upstash/redis';

/**
 * Redis Configuration for Tax Hub Admin
 * 
 * To use this, you need to:
 * 1. Sign up at https://upstash.com/
 * 2. Create a Redis database
 * 3. Copy UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * 4. Add them to your .env file:
 *    VITE_UPSTASH_REDIS_REST_URL=your_url_here
 *    VITE_UPSTASH_REDIS_REST_TOKEN=your_token_here
 */

// Initialize Redis client
let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  // Check if Redis credentials are configured
  const url = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('Redis credentials not configured. Using fallback storage.');
    return null;
  }

  // Create singleton instance
  if (!redisClient) {
    redisClient = new Redis({
      url,
      token,
    });
  }

  return redisClient;
}

/**
 * Check if Redis is available and configured
 */
export function isRedisAvailable(): boolean {
  const url = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;
  return !!(url && token);
}

/**
 * Redis helper functions
 */
export const redis = {
  /**
   * Set a value in Redis with optional expiration (in seconds)
   */
  async set(key: string, value: any, expirationSeconds?: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (expirationSeconds) {
        await client.setex(key, expirationSeconds, stringValue);
      } else {
        await client.set(key, stringValue);
      }
      
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  },

  /**
   * Get a value from Redis
   */
  async get<T = any>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
      
      if (!value) return null;
      
      // Try to parse JSON, if it fails return as string
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      }
      
      return value as T;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  },

  /**
   * Delete a value from Redis
   */
  async delete(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DELETE error:', error);
      return false;
    }
  },

  /**
   * Check if a key exists in Redis
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  },

  /**
   * Set expiration time for a key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  },

  /**
   * Get time to live for a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    const client = getRedisClient();
    if (!client) return -1;

    try {
      return await client.ttl(key);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -1;
    }
  },

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      return await client.incr(key);
    } catch (error) {
      console.error('Redis INCR error:', error);
      return null;
    }
  },

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const client = getRedisClient();
    if (!client) return [];

    try {
      return await client.keys(pattern);
    } catch (error) {
      console.error('Redis KEYS error:', error);
      return [];
    }
  },
};

export default redis;
