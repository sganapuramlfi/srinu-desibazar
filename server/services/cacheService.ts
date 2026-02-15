/**
 * Tenant-Aware Caching Service
 * Prevents cross-tenant cache leakage with proper key prefixing
 * Supports Redis and in-memory caching
 */

export type CacheProvider = 'redis' | 'memory';

/**
 * In-memory cache store (for development/testing)
 */
class MemoryCacheStore {
  private store: Map<string, { value: any; expiresAt: number | null }> = new Map();

  async get(key: string): Promise<any | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;

    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async flush(): Promise<void> {
    this.store.clear();
  }

  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter((key) => regex.test(key));
  }
}

/**
 * Redis cache store (for production)
 */
class RedisCacheStore {
  private client: any; // Redis client

  constructor() {
    // TODO: Initialize Redis client
    // this.client = redis.createClient({ url: process.env.REDIS_URL });
  }

  async get(key: string): Promise<any | null> {
    // const value = await this.client.get(key);
    // return value ? JSON.parse(value) : null;
    return null; // Placeholder
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    // const serialized = JSON.stringify(value);
    // if (ttlSeconds) {
    //   await this.client.setex(key, ttlSeconds, serialized);
    // } else {
    //   await this.client.set(key, serialized);
    // }
  }

  async del(key: string): Promise<void> {
    // await this.client.del(key);
  }

  async flush(): Promise<void> {
    // await this.client.flushdb();
  }

  async keys(pattern: string): Promise<string[]> {
    // return await this.client.keys(pattern);
    return []; // Placeholder
  }
}

/**
 * Tenant-aware cache manager
 */
class TenantCacheManager {
  private provider: CacheProvider;
  private store: MemoryCacheStore | RedisCacheStore;

  constructor(provider: CacheProvider = 'memory') {
    this.provider = provider;
    this.store = provider === 'redis' ? new RedisCacheStore() : new MemoryCacheStore();
  }

  /**
   * Generate tenant-scoped cache key
   * Format: tenant:{tenantId}:{resource}:{identifier}
   */
  private getTenantKey(tenantId: number, resource: string, identifier?: string): string {
    const parts = ['tenant', tenantId.toString(), resource];

    if (identifier) {
      parts.push(identifier);
    }

    return parts.join(':');
  }

  /**
   * Get cached value for tenant
   */
  async get(tenantId: number, resource: string, identifier?: string): Promise<any | null> {
    const key = this.getTenantKey(tenantId, resource, identifier);
    return this.store.get(key);
  }

  /**
   * Set cached value for tenant
   */
  async set(
    tenantId: number,
    resource: string,
    value: any,
    ttlSeconds?: number,
    identifier?: string
  ): Promise<void> {
    const key = this.getTenantKey(tenantId, resource, identifier);
    return this.store.set(key, value, ttlSeconds);
  }

  /**
   * Delete cached value for tenant
   */
  async del(tenantId: number, resource: string, identifier?: string): Promise<void> {
    const key = this.getTenantKey(tenantId, resource, identifier);
    return this.store.del(key);
  }

  /**
   * Delete all cached values for a resource across all tenants
   */
  async delResource(resource: string): Promise<void> {
    const pattern = `tenant:*:${resource}:*`;
    const keys = await this.store.keys(pattern);

    for (const key of keys) {
      await this.store.del(key);
    }
  }

  /**
   * Delete all cached values for a tenant
   */
  async delTenant(tenantId: number): Promise<void> {
    const pattern = `tenant:${tenantId}:*`;
    const keys = await this.store.keys(pattern);

    for (const key of keys) {
      await this.store.del(key);
    }
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    return this.store.flush();
  }

  /**
   * Cache-aside pattern: Get or compute
   */
  async getOrCompute<T>(
    tenantId: number,
    resource: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = 300,
    identifier?: string
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get(tenantId, resource, identifier);

    if (cached !== null) {
      return cached as T;
    }

    // Compute value
    const value = await computeFn();

    // Store in cache
    await this.set(tenantId, resource, value, ttlSeconds, identifier);

    return value;
  }

  /**
   * Invalidate cache for specific resource
   */
  async invalidate(tenantId: number, resource: string, identifier?: string): Promise<void> {
    await this.del(tenantId, resource, identifier);
  }

  /**
   * Warm cache for tenant
   */
  async warm(tenantId: number, data: Array<{ resource: string; value: any; ttl?: number }>): Promise<void> {
    for (const item of data) {
      await this.set(tenantId, item.resource, item.value, item.ttl);
    }
  }
}

// Singleton cache instance
const cacheProvider: CacheProvider = (process.env.CACHE_PROVIDER as CacheProvider) || 'memory';
export const cache = new TenantCacheManager(cacheProvider);

/**
 * Cache decorator for methods
 */
export function Cached(resource: string, ttlSeconds: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tenantId = args[0]; // Assume first arg is tenantId

      if (typeof tenantId !== 'number') {
        throw new Error('First argument must be tenantId for cached methods');
      }

      const identifier = args.slice(1).join(':'); // Use remaining args as identifier

      return cache.getOrCompute(
        tenantId,
        resource,
        () => originalMethod.apply(this, args),
        ttlSeconds,
        identifier
      );
    };

    return descriptor;
  };
}

/**
 * Example Usage:
 *
 * // 1. Cache business settings
 * await cache.set(123, 'settings', { timezone: 'Australia/Sydney' }, 3600);
 * const settings = await cache.get(123, 'settings');
 *
 * // 2. Cache product list
 * const products = await cache.getOrCompute(
 *   123,
 *   'products',
 *   async () => db.select().from(products).where(eq(products.businessId, 123)),
 *   300
 * );
 *
 * // 3. Invalidate cache after update
 * await cache.invalidate(123, 'products');
 *
 * // 4. Delete all cache for tenant
 * await cache.delTenant(123);
 *
 * // 5. Use decorator
 * class BusinessService {
 *   @Cached('business-details', 600)
 *   async getBusinessDetails(tenantId: number) {
 *     return db.select().from(businessTenants).where(eq(businessTenants.id, tenantId));
 *   }
 * }
 *
 * // 6. Warm cache on tenant login
 * await cache.warm(123, [
 *   { resource: 'settings', value: settings, ttl: 3600 },
 *   { resource: 'products', value: products, ttl: 300 },
 * ]);
 */

// Common cache TTLs
export const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
  WEEK: 604800,     // 7 days
};

// Cache key prefixes for consistency
export const CacheKeys = {
  BUSINESS_SETTINGS: 'settings',
  BUSINESS_DETAILS: 'business',
  PRODUCTS: 'products',
  SERVICES: 'services',
  STAFF: 'staff',
  MENU: 'menu',
  BOOKINGS_TODAY: 'bookings:today',
  ANALYTICS_DASHBOARD: 'analytics:dashboard',
  SUBSCRIPTION: 'subscription',
};
