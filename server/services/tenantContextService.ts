import { db } from '../../db/index.js';
import { sql } from 'drizzle-orm';

/**
 * Tenant Context Service
 * Manages PostgreSQL RLS tenant context and super admin mode
 * Ensures database-level tenant isolation
 */

export type TenantContext = {
  tenantId: number;
  mode: 'tenant' | 'super_admin';
  userId?: number;
};

/**
 * Execute a database query with tenant context
 * This sets the RLS context variables before executing the query
 */
export async function withTenantContext<T>(
  context: TenantContext,
  callback: () => Promise<T>
): Promise<T> {
  // Start a transaction to isolate context
  return db.transaction(async (tx) => {
    // Set tenant context based on mode
    if (context.mode === 'super_admin') {
      // Super admin mode - can query across all tenants
      await tx.execute(sql`SET LOCAL app.super_admin_mode = 'true'`);
    } else {
      // Regular tenant mode - isolated to single tenant
      await tx.execute(sql`SET LOCAL app.current_tenant_id = ${context.tenantId}`);
    }

    // Set user context if provided (for customer bookings)
    if (context.userId) {
      await tx.execute(sql`SET LOCAL app.current_user_id = ${context.userId}`);
    }

    // Execute the callback with the context set
    // TypeScript doesn't know that 'tx' can be used in place of 'db'
    // So we temporarily cast it (this is safe within the transaction)
    const originalDb = global.db;
    (global as any).db = tx;

    try {
      const result = await callback();
      return result;
    } finally {
      // Restore original db
      (global as any).db = originalDb;
    }
  });
}

/**
 * Execute query in tenant-scoped mode
 */
export async function asTenant<T>(
  tenantId: number,
  callback: () => Promise<T>
): Promise<T> {
  return withTenantContext(
    { tenantId, mode: 'tenant' },
    callback
  );
}

/**
 * Execute query in super admin mode (cross-tenant)
 */
export async function asSuperAdmin<T>(
  callback: () => Promise<T>
): Promise<T> {
  return withTenantContext(
    { tenantId: 0, mode: 'super_admin' },
    callback
  );
}

/**
 * Execute query as customer (for viewing own bookings)
 */
export async function asCustomer<T>(
  userId: number,
  callback: () => Promise<T>
): Promise<T> {
  return withTenantContext(
    { tenantId: 0, mode: 'tenant', userId },
    callback
  );
}

/**
 * Middleware to automatically set tenant context from request
 */
export function autoTenantContext() {
  return async (req: any, res: any, next: any) => {
    // Extract tenant context from request
    const tenantId =
      req.apiAuth?.businessId || // From API key
      req.domainTenant?.businessId || // From domain
      req.businessId || // From session
      null;

    if (tenantId) {
      // Store tenant context in request for easy access
      req.tenantContext = {
        tenantId,
        mode: 'tenant' as const,
        userId: req.user?.id,
      };
    }

    next();
  };
}

/**
 * Helper to get tenant context from request
 */
export function getTenantContext(req: any): TenantContext | null {
  return req.tenantContext || null;
}

/**
 * Execute query with tenant context from request
 */
export async function withRequestContext<T>(
  req: any,
  callback: () => Promise<T>
): Promise<T> {
  const context = getTenantContext(req);

  if (!context) {
    throw new Error('No tenant context found in request');
  }

  return withTenantContext(context, callback);
}

/**
 * Create a tenant-aware database client
 * This wraps the database client to automatically set context
 */
export function createTenantDb(tenantId: number) {
  return {
    // Proxy all database methods to use tenant context
    select: (...args: any[]) => asTenant(tenantId, () => (db.select as any)(...args)),
    insert: (...args: any[]) => asTenant(tenantId, () => (db.insert as any)(...args)),
    update: (...args: any[]) => asTenant(tenantId, () => (db.update as any)(...args)),
    delete: (...args: any[]) => asTenant(tenantId, () => (db.delete as any)(...args)),
    execute: (...args: any[]) => asTenant(tenantId, () => (db.execute as any)(...args)),
    transaction: (callback: any) =>
      asTenant(tenantId, () => db.transaction(callback)),
  };
}

/**
 * Example Usage:
 *
 * // 1. In route handler with automatic context
 * app.get('/api/bookings', autoTenantContext(), async (req, res) => {
 *   const bookings = await withRequestContext(req, async () => {
 *     return db.select().from(bookings);
 *   });
 * });
 *
 * // 2. Explicit tenant context
 * const bookings = await asTenant(123, async () => {
 *   return db.select().from(bookings);
 * });
 *
 * // 3. Super admin query (cross-tenant)
 * const allBusinesses = await asSuperAdmin(async () => {
 *   return db.select().from(businessTenants);
 * });
 *
 * // 4. Customer viewing own bookings
 * const myBookings = await asCustomer(userId, async () => {
 *   return db.select().from(bookings);
 * });
 *
 * // 5. Create tenant-scoped db client
 * const tenantDb = createTenantDb(123);
 * const bookings = await tenantDb.select().from(bookings);
 */
