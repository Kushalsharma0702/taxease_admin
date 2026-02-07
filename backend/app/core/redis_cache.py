"""
Redis caching service with decorators and utilities
"""
import json
import pickle
from typing import Any, Optional, Callable, TypeVar
from functools import wraps
import redis.asyncio as redis
from .config import settings
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RedisCache:
    """Redis cache service"""
    
    def __init__(self):
        self._client: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self._client = await redis.from_url(
                f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}",
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                encoding="utf-8",
                decode_responses=False,  # We'll handle encoding manually
                max_connections=50,
                socket_connect_timeout=5,
                socket_timeout=5,
                health_check_interval=30,
            )
            await self._client.ping()
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self._client = None
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self._client:
            await self._client.close()
            self._client = None
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self._client:
            return None
        
        try:
            value = await self._client.get(key)
            if value:
                # Try JSON first, fallback to pickle
                try:
                    return json.loads(value.decode('utf-8'))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    return pickle.loads(value)
        except Exception as e:
            logger.error(f"Redis get error for key {key}: {e}")
        return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """Set value in cache"""
        if not self._client:
            return False
        
        try:
            ttl = ttl or settings.REDIS_CACHE_TTL
            # Try JSON first, fallback to pickle for complex objects
            try:
                serialized = json.dumps(value, default=str).encode('utf-8')
            except (TypeError, ValueError):
                serialized = pickle.dumps(value)
            
            await self._client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Redis set error for key {key}: {e}")
        return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self._client:
            return False
        
        try:
            await self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis delete error for key {key}: {e}")
        return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self._client:
            return 0
        
        try:
            keys = []
            async for key in self._client.scan_iter(match=pattern):
                keys.append(key)
            
            if keys:
                return await self._client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis delete_pattern error for {pattern}: {e}")
        return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        if not self._client:
            return False
        
        try:
            return bool(await self._client.exists(key))
        except Exception as e:
            logger.error(f"Redis exists error for key {key}: {e}")
        return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment value"""
        if not self._client:
            return None
        
        try:
            return await self._client.incrby(key, amount)
        except Exception as e:
            logger.error(f"Redis increment error for key {key}: {e}")
        return None


# Global cache instance
cache = RedisCache()


def cache_result(
    key_prefix: str,
    ttl: Optional[int] = None,
    key_params: Optional[list[str]] = None
):
    """
    Decorator to cache function results
    
    Args:
        key_prefix: Prefix for cache key
        ttl: Time to live in seconds (uses default if None)
        key_params: List of parameter names to include in cache key
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Build cache key
            if key_params:
                key_parts = [key_prefix]
                for param in key_params:
                    if param in kwargs:
                        key_parts.append(f"{param}:{kwargs[param]}")
                cache_key = ":".join(key_parts)
            else:
                cache_key = f"{key_prefix}:{func.__name__}"
            
            # Try to get from cache
            cached = await cache.get(cache_key)
            if cached is not None:
                return cached
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            await cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


async def invalidate_cache(pattern: str):
    """Invalidate cache by pattern"""
    await cache.delete_pattern(pattern)


