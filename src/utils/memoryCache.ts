/**
 * Simple in-memory cache for performance
 * 
 * Think of this like a temporary notepad that remembers things for 5 minutes
 * When you close the app or refresh, it forgets everything (which is safe!)
 */

type CacheItem<T> = {
  data: T;
  timestamp: number;
};

class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL = 60 * 1000; // 1 minute default (very short, very safe)
  
  /**
   * Get data from cache if it exists and isn't too old
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      // Not in cache, need to fetch from server
      return null;
    }
    
    const age = Date.now() - item.timestamp;
    const ageInSeconds = Math.round(age / 1000);
    
    if (age > this.defaultTTL) {
      // Too old, delete it and fetch fresh
      console.log(`🔄 Cache expired for ${key} (${ageInSeconds}s old)`);
      this.cache.delete(key);
      return null;
    }
    
    // Found it and it's fresh!
    console.log(`⚡ Cache hit! Using cached ${key} (${ageInSeconds}s old)`);
    return item.data as T;
  }
  
  /**
   * Save data to cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`💾 Cached ${key} for faster loading`);
  }
  
  /**
   * Clear cache for a specific key or everything
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      console.log(`🗑️ Cleared cache for ${key}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Cleared all cache');
    }
  }
}

// Create one cache for the whole app
export const memoryCache = new MemoryCache();