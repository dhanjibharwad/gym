/**
 * Enterprise In-Memory Cache Layer
 * 
 * Provides fast, efficient caching with automatic expiration and LRU eviction.
 * This is a lightweight alternative to Redis for Next.js applications.
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
  lastAccessed: number;
  size: number; // Approximate size in KB
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number; // Maximum items in cache
  private maxMemoryMB: number; // Maximum memory usage in MB
  private currentMemoryMB: number = 0;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    maxSize: 0
  };

  constructor(maxItems: number = 1000, maxMemoryMB: number = 50) {
    this.cache = new Map();
    this.maxSize = maxItems;
    this.maxMemoryMB = maxMemoryMB;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.currentMemoryMB -= entry.size;
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Update last accessed time for LRU
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateStats();
    
    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const sizeKB = 1; // fixed estimate — avoids expensive JSON.stringify on every write
    
    // Evict if necessary
    while (this.cache.size >= this.maxSize || this.currentMemoryMB + sizeKB / 1024 > this.maxMemoryMB) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
      lastAccessed: Date.now(),
      size: sizeKB
    };

    this.cache.set(key, entry);
    this.currentMemoryMB += sizeKB / 1024;
    this.updateStats();
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryMB -= entry.size;
      this.cache.delete(key);
      this.updateStats();
      return true;
    }
    return false;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryMB = 0;
    this.updateStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get or compute value (with caching)
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Try cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute and cache
    const value = await computeFn();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Delete keys by pattern
   */
  deleteByPattern(pattern: RegExp): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        const entry = this.cache.get(key)!;
        this.currentMemoryMB -= entry.size;
        this.cache.delete(key);
        deleted++;
      }
    }
    this.updateStats();
    return deleted;
  }

  /**
   * Invalidate cache tags
   */
  invalidateTags(...tags: string[]): void {
    tags.forEach(tag => {
      this.deleteByPattern(new RegExp(`^${tag}:`));
    });
  }

  /**
   * Warm up cache with pre-computed values
   */
  warmUp(entries: Array<{ key: string; value: any; ttl?: number }>): void {
    entries.forEach(({ key, value, ttl = 300 }) => {
      this.set(key, value, ttl);
    });
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.currentMemoryMB -= entry.size;
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.maxSize = this.maxSize;
  }
}

// Singleton instance
let globalCache: MemoryCache | null = null;

export function getGlobalCache(): MemoryCache {
  if (!globalCache) {
    globalCache = new MemoryCache(2000, 100); // 2000 items, 100MB limit
  }
  return globalCache;
}

// Convenience functions
export const cache = {
  get: <T>(key: string) => getGlobalCache().get<T>(key),
  set: <T>(key: string, value: T, ttl?: number) => getGlobalCache().set(key, value, ttl),
  delete: (key: string) => getGlobalCache().delete(key),
  clear: () => getGlobalCache().clear(),
  getStats: () => getGlobalCache().getStats(),
  getOrCompute: <T>(key: string, fn: () => Promise<T>, ttl?: number) => 
    getGlobalCache().getOrCompute(key, fn, ttl),
  invalidateTags: (...tags: string[]) => getGlobalCache().invalidateTags(...tags),
};

export default MemoryCache;
