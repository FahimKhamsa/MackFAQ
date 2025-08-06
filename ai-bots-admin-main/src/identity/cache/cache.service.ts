import { Injectable, Logger } from '@nestjs/common';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheItem<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 1000;

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = Date.now();

    return item.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, options?: CacheOptions): void {
    // Clean up cache if it's getting too large
    if (this.cache.size >= (options?.maxSize || this.maxSize)) {
      this.evictLeastRecentlyUsed();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, item);
  }

  /**
   * Get or set item in cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, options);
    return data;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache or items matching pattern
   */
  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.logger.log('Cache cleared completely');
      return;
    }

    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    this.logger.log(
      `Cleared ${keysToDelete.length} cache items matching pattern: ${pattern}`,
    );
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    mostAccessed: Array<{ key: string; accessCount: number }>;
  } {
    const items = Array.from(this.cache.entries());
    const totalAccess = items.reduce(
      (sum, [, item]) => sum + item.accessCount,
      0,
    );

    const mostAccessed = items
      .map(([key, item]) => ({ key, accessCount: item.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate:
        totalAccess > 0 ? totalAccess / (totalAccess + this.cache.size) : 0,
      mostAccessed,
    };
  }

  /**
   * Evict least recently used items
   */
  private evictLeastRecentlyUsed(): void {
    const items = Array.from(this.cache.entries());

    // Sort by last accessed time (oldest first)
    items.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    // Remove oldest 10% of items
    const itemsToRemove = Math.max(1, Math.floor(items.length * 0.1));

    for (let i = 0; i < itemsToRemove; i++) {
      this.cache.delete(items[i][0]);
    }

    this.logger.log(`Evicted ${itemsToRemove} least recently used cache items`);
  }

  /**
   * Clean up expired items
   */
  cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.defaultTTL) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      this.logger.log(`Cleaned up ${keysToDelete.length} expired cache items`);
    }
  }

  /**
   * Generate cache key for ID relationships
   */
  static generateIdKey(type: string, id: number | string): string {
    return `id:${type}:${id}`;
  }

  /**
   * Generate cache key for user data
   */
  static generateUserKey(userId: number, dataType: string): string {
    return `user:${userId}:${dataType}`;
  }

  /**
   * Generate cache key for project data
   */
  static generateProjectKey(projectId: number, dataType: string): string {
    return `project:${projectId}:${dataType}`;
  }
}
