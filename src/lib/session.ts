import Cookies from 'js-cookie';
import { User } from '@/types';
import redis, { isRedisAvailable } from './redis';

const SESSION_COOKIE_NAME = 'taxease_session';
const SESSION_KEY_PREFIX = 'taxease:session:';
const SESSION_EXPIRY_DAYS = 7; // Session expires after 7 days
const SESSION_EXPIRY_SECONDS = SESSION_EXPIRY_DAYS * 24 * 60 * 60; // Convert to seconds

export interface SessionData {
  user: User;
  timestamp: number;
}

/**
 * Generate a session key for Redis
 */
function getSessionKey(userId: string): string {
  return `${SESSION_KEY_PREFIX}${userId}`;
}

/**
 * Store user session in Redis (if available) and cookie as fallback
 */
export async function setSession(user: User): Promise<void> {
  const sessionData: SessionData = {
    user,
    timestamp: Date.now(),
  };
  
  // Try to store in Redis first
  if (isRedisAvailable()) {
    try {
      const sessionKey = getSessionKey(user.id);
      await redis.set(sessionKey, sessionData, SESSION_EXPIRY_SECONDS);
      console.log('✅ Session stored in Redis');
    } catch (error) {
      console.error('Failed to store session in Redis:', error);
    }
  }
  
  // Store in cookie (always as fallback)
  Cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    expires: SESSION_EXPIRY_DAYS,
    sameSite: 'strict',
    secure: window.location.protocol === 'https:', // Only secure in production
  });
  
  // Also keep in localStorage as backup
  localStorage.setItem('taxease_user', JSON.stringify(user));
}

/**
 * Retrieve user session from Redis (if available) or cookie fallback
 */
export async function getSession(): Promise<User | null> {
  // Try Redis first if available
  if (isRedisAvailable()) {
    try {
      // Get user ID from cookie to construct Redis key
      const cookieSession = Cookies.get(SESSION_COOKIE_NAME);
      if (cookieSession) {
        const parsedCookie = JSON.parse(cookieSession) as SessionData;
        const sessionKey = getSessionKey(parsedCookie.user.id);
        
        const redisSession = await redis.get<SessionData>(sessionKey);
        if (redisSession) {
          console.log('✅ Session retrieved from Redis');
          return redisSession.user;
        }
      }
    } catch (error) {
      console.error('Failed to retrieve session from Redis:', error);
    }
  }
  
  try {
    const sessionCookie = Cookies.get(SESSION_COOKIE_NAME);
    
    if (sessionCookie) {
      const sessionData: SessionData = JSON.parse(sessionCookie);
      
      // Check if session is still valid (not expired)
      const sessionAge = Date.now() - sessionData.timestamp;
      const maxAge = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      
      if (sessionAge < maxAge) {
        return sessionData.user;
      } else {
        // Session expired, clear it
        await clearSession();
        return null;
      }
    }
    
    // Fallback to localStorage for backwards compatibility
    const storedUser = localStorage.getItem('taxease_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // Migrate to cookie-based session
      await setSession(user);
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Error reading session:', error);
    await clearSession();
    return null;
  }
}

/**
 * Clear user session from Redis, cookie and localStorage
 */
export async function clearSession(): Promise<void> {
  // Try to clear from Redis first
  if (isRedisAvailable()) {
    try {
      const user = await getSession();
      if (user) {
        const sessionKey = getSessionKey(user.id);
        await redis.delete(sessionKey);
        console.log('✅ Session cleared from Redis');
      }
    } catch (error) {
      console.error('Failed to clear session from Redis:', error);
    }
  }
  
  // Clear cookie and localStorage
  Cookies.remove(SESSION_COOKIE_NAME);
  localStorage.removeItem('taxease_user');
}

/**
 * Check if user has an active session
 */
export async function hasActiveSession(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Refresh session timestamp (extend expiry)
 */
export async function refreshSession(): Promise<void> {
  const user = await getSession();
  if (user) {
    await setSession(user);
  }
}
