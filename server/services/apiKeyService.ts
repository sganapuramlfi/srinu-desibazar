import crypto from 'crypto';
import { db, tenantApiKeys } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';

/**
 * Generate cryptographically secure API key
 * Format: key_live_abc123def456ghi789... (prefix + 64 char hex)
 */
export function generateApiKey(prefix: string = 'key'): {
  keyId: string;
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  // Generate 32 random bytes = 64 hex characters
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const rawKey = `${prefix}_${randomBytes}`;

  // SHA-256 hash for secure storage
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  // Store first 12 chars for display (safe to show)
  const keyPrefix = rawKey.substring(0, 12);

  // Unique key ID for reference
  const keyId = `keyid_${crypto.randomBytes(16).toString('hex')}`;

  return { keyId, rawKey, keyHash, keyPrefix };
}

/**
 * Create API key for a tenant (business)
 * Returns the raw key which should be shown ONCE to the user
 */
export async function createApiKey(params: {
  businessId: number;
  name: string;
  scopes: string[];
  createdBy: number;
  description?: string;
  expiresInDays?: number;
  rateLimit?: number;
}): Promise<{ keyId: string; rawKey: string; keyPrefix: string }> {
  const { keyId, rawKey, keyHash, keyPrefix } = generateApiKey('key_live');

  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await db.insert(tenantApiKeys).values({
    businessId: params.businessId,
    keyId,
    keyHash,
    keyPrefix,
    name: params.name,
    description: params.description,
    scopes: params.scopes as any,
    expiresAt,
    createdBy: params.createdBy,
    rateLimit: params.rateLimit || 1000,
    isActive: true,
  });

  // Return raw key ONCE (never stored in DB)
  return { keyId, rawKey, keyPrefix };
}

/**
 * Verify API key and return tenant context
 * Checks: key validity, expiration, active status
 */
export async function verifyApiKey(rawKey: string): Promise<{
  valid: boolean;
  businessId?: number;
  scopes?: string[];
  keyId?: string;
}> {
  try {
    // Hash the provided key
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Find matching API key
    const [apiKey] = await db
      .select()
      .from(tenantApiKeys)
      .where(
        and(
          eq(tenantApiKeys.keyHash, keyHash),
          eq(tenantApiKeys.isActive, true)
        )
      )
      .limit(1);

    if (!apiKey) {
      return { valid: false };
    }

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return { valid: false };
    }

    // Update last used timestamp (fire and forget)
    db.update(tenantApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(tenantApiKeys.id, apiKey.id))
      .execute()
      .catch((err) => console.error('Failed to update API key last used:', err));

    return {
      valid: true,
      businessId: apiKey.businessId,
      scopes: Array.isArray(apiKey.scopes) ? apiKey.scopes : [],
      keyId: apiKey.keyId,
    };
  } catch (error) {
    console.error('API key verification error:', error);
    return { valid: false };
  }
}

/**
 * List all API keys for a business (without revealing actual keys)
 */
export async function listApiKeys(businessId: number) {
  return db
    .select({
      id: tenantApiKeys.id,
      keyId: tenantApiKeys.keyId,
      keyPrefix: tenantApiKeys.keyPrefix,
      name: tenantApiKeys.name,
      description: tenantApiKeys.description,
      scopes: tenantApiKeys.scopes,
      rateLimit: tenantApiKeys.rateLimit,
      isActive: tenantApiKeys.isActive,
      expiresAt: tenantApiKeys.expiresAt,
      lastUsedAt: tenantApiKeys.lastUsedAt,
      createdAt: tenantApiKeys.createdAt,
    })
    .from(tenantApiKeys)
    .where(eq(tenantApiKeys.businessId, businessId))
    .orderBy(tenantApiKeys.createdAt);
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(keyId: string, businessId: number): Promise<boolean> {
  const result = await db
    .update(tenantApiKeys)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(tenantApiKeys.keyId, keyId),
        eq(tenantApiKeys.businessId, businessId)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(keyId: string, businessId: number): Promise<boolean> {
  const result = await db
    .delete(tenantApiKeys)
    .where(
      and(
        eq(tenantApiKeys.keyId, keyId),
        eq(tenantApiKeys.businessId, businessId)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Update API key metadata (name, description, scopes, rate limit)
 */
export async function updateApiKey(params: {
  keyId: string;
  businessId: number;
  name?: string;
  description?: string;
  scopes?: string[];
  rateLimit?: number;
}): Promise<boolean> {
  const updates: any = { updatedAt: new Date() };

  if (params.name !== undefined) updates.name = params.name;
  if (params.description !== undefined) updates.description = params.description;
  if (params.scopes !== undefined) updates.scopes = params.scopes;
  if (params.rateLimit !== undefined) updates.rateLimit = params.rateLimit;

  const result = await db
    .update(tenantApiKeys)
    .set(updates)
    .where(
      and(
        eq(tenantApiKeys.keyId, params.keyId),
        eq(tenantApiKeys.businessId, params.businessId)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Check rate limit for API key (basic implementation)
 * In production, use Redis for distributed rate limiting
 */
export async function checkRateLimit(
  keyId: string,
  rateLimitWindow: number = 3600 // 1 hour in seconds
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  // TODO: Implement Redis-based rate limiting with sliding window
  // For now, return always allowed
  // This is a placeholder for future implementation

  return {
    allowed: true,
    limit: 1000,
    remaining: 1000,
  };
}

/**
 * Rotate API key (generate new key, deactivate old one)
 */
export async function rotateApiKey(params: {
  oldKeyId: string;
  businessId: number;
  createdBy: number;
}): Promise<{ keyId: string; rawKey: string; keyPrefix: string } | null> {
  // Get old key details
  const [oldKey] = await db
    .select()
    .from(tenantApiKeys)
    .where(
      and(
        eq(tenantApiKeys.keyId, params.oldKeyId),
        eq(tenantApiKeys.businessId, params.businessId)
      )
    )
    .limit(1);

  if (!oldKey) {
    return null;
  }

  // Create new key with same settings
  const newKey = await createApiKey({
    businessId: params.businessId,
    name: `${oldKey.name} (Rotated)`,
    description: oldKey.description || undefined,
    scopes: Array.isArray(oldKey.scopes) ? oldKey.scopes : [],
    createdBy: params.createdBy,
    rateLimit: oldKey.rateLimit,
  });

  // Deactivate old key
  await revokeApiKey(params.oldKeyId, params.businessId);

  return newKey;
}
