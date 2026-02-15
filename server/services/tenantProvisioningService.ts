import { db } from '../../db/index.js';
import {
  businessTenants,
  businessAccess,
  businessSubscriptions,
  businessSettings,
  businessDirectory,
  tenantLifecycleEvents,
} from '../../db/index.js';
import { eq, and } from 'drizzle-orm';

/**
 * Generate URL-safe slug from business name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Log a lifecycle event for a tenant
 */
export async function logLifecycleEvent(params: {
  businessId?: number;
  eventType: string;
  eventStatus: string;
  triggeredBy?: number;
  previousState?: string;
  newState?: string;
  reason?: string;
  metadata?: any;
}): Promise<number> {
  const [event] = await db
    .insert(tenantLifecycleEvents)
    .values({
      businessId: params.businessId,
      eventType: params.eventType,
      eventStatus: params.eventStatus,
      triggeredBy: params.triggeredBy,
      previousState: params.previousState,
      newState: params.newState,
      reason: params.reason,
      metadata: params.metadata || {},
      startedAt: new Date(),
    })
    .returning();

  return event.id;
}

/**
 * Update a lifecycle event
 */
export async function updateLifecycleEvent(
  eventId: number,
  updates: {
    eventStatus?: string;
    newState?: string;
    completedAt?: Date;
    errorMessage?: string;
  }
): Promise<void> {
  await db
    .update(tenantLifecycleEvents)
    .set(updates)
    .where(eq(tenantLifecycleEvents.id, eventId));
}

/**
 * Provision a new tenant (automated during business registration)
 * Creates business tenant, access, subscription, settings, and directory entry
 */
export async function provisionTenant(data: {
  name: string;
  industryType: string;
  ownerUserId: number;
  subscriptionPlanId: number;
  slug?: string;
  tenantTier?: 'free' | 'standard' | 'professional' | 'enterprise';
  dataResidency?: 'au-sydney' | 'us-east' | 'eu-west' | 'ap-southeast';
}): Promise<{ businessId: number; tenantKey: string }> {
  // Log provisioning start
  const eventId = await logLifecycleEvent({
    eventType: 'created',
    eventStatus: 'in_progress',
    triggeredBy: data.ownerUserId,
    newState: 'pending',
    metadata: { name: data.name, industryType: data.industryType },
  });

  try {
    // 1. Create business tenant
    const [business] = await db
      .insert(businessTenants)
      .values({
        name: data.name,
        slug: data.slug || generateSlug(data.name),
        industryType: data.industryType as any,
        status: 'pending',
        tenantTier: data.tenantTier || 'standard',
        dataResidency: data.dataResidency || 'au-sydney',
        onboardingCompleted: false,
        isVerified: false,
      })
      .returning();

    // Update lifecycle event with business ID
    await db
      .update(tenantLifecycleEvents)
      .set({ businessId: business.id })
      .where(eq(tenantLifecycleEvents.id, eventId));

    // 2. Create business access (owner)
    await db.insert(businessAccess).values({
      businessId: business.id,
      userId: data.ownerUserId,
      role: 'owner',
      permissions: { full_access: true } as any,
      grantedBy: data.ownerUserId,
      isActive: true,
      accessCount: 0,
    });

    // 3. Create subscription
    const trialDays = 180; // 6 months trial
    await db.insert(businessSubscriptions).values({
      businessId: business.id,
      planId: data.subscriptionPlanId,
      status: 'trial',
      billingEmail: '', // Will be set by owner later
      billingCycle: 'monthly',
      trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currentUsage: {} as any,
    });

    // 4. Create default settings
    await db.insert(businessSettings).values({
      businessId: business.id,
      bookingSettings: {} as any,
      paymentSettings: {} as any,
      notificationSettings: {} as any,
    });

    // 5. Create directory entry
    await db.insert(businessDirectory).values({
      businessId: business.id,
      isPublished: false,
      keywords: [] as any,
      highlights: [] as any,
      certifications: [] as any,
      averageRating: '0.00',
      totalReviews: 0,
      totalBookings: 0,
      isFeatured: false,
    });

    // Update lifecycle event to completed
    await updateLifecycleEvent(eventId, {
      eventStatus: 'completed',
      newState: 'pending',
      completedAt: new Date(),
    });

    return {
      businessId: business.id,
      tenantKey: business.tenantKey,
    };
  } catch (error: any) {
    // Log failure
    await updateLifecycleEvent(eventId, {
      eventStatus: 'failed',
      errorMessage: error.message,
      completedAt: new Date(),
    });

    throw error;
  }
}

/**
 * Activate tenant (after onboarding complete)
 * Changes status from 'pending' to 'active'
 */
export async function activateTenant(
  businessId: number,
  activatedBy?: number
): Promise<void> {
  // Get current status
  const [business] = await db
    .select()
    .from(businessTenants)
    .where(eq(businessTenants.id, businessId))
    .limit(1);

  if (!business) {
    throw new Error('Business not found');
  }

  // Update business status
  await db
    .update(businessTenants)
    .set({
      status: 'active',
      onboardingCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(businessTenants.id, businessId));

  // Log lifecycle event
  await logLifecycleEvent({
    businessId,
    eventType: 'activated',
    eventStatus: 'completed',
    triggeredBy: activatedBy,
    previousState: business.status,
    newState: 'active',
    completedAt: new Date(),
  });
}

/**
 * Suspend tenant (payment failure, policy violation, etc.)
 * Changes status to 'suspended' and records reason
 */
export async function suspendTenant(
  businessId: number,
  reason: string,
  suspendedBy: number
): Promise<void> {
  // Get current status
  const [business] = await db
    .select()
    .from(businessTenants)
    .where(eq(businessTenants.id, businessId))
    .limit(1);

  if (!business) {
    throw new Error('Business not found');
  }

  if (business.status === 'suspended') {
    throw new Error('Business is already suspended');
  }

  // Update business status
  await db
    .update(businessTenants)
    .set({
      status: 'suspended',
      suspendedAt: new Date(),
      suspensionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(businessTenants.id, businessId));

  // Log lifecycle event
  await logLifecycleEvent({
    businessId,
    eventType: 'suspended',
    eventStatus: 'completed',
    triggeredBy: suspendedBy,
    previousState: business.status,
    newState: 'suspended',
    reason,
    completedAt: new Date(),
  });
}

/**
 * Resume suspended tenant
 * Changes status from 'suspended' back to 'active'
 */
export async function resumeTenant(
  businessId: number,
  resumedBy: number
): Promise<void> {
  // Get current status
  const [business] = await db
    .select()
    .from(businessTenants)
    .where(eq(businessTenants.id, businessId))
    .limit(1);

  if (!business) {
    throw new Error('Business not found');
  }

  if (business.status !== 'suspended') {
    throw new Error('Business is not suspended');
  }

  // Update business status
  await db
    .update(businessTenants)
    .set({
      status: 'active',
      suspendedAt: null,
      suspensionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(businessTenants.id, businessId));

  // Log lifecycle event
  await logLifecycleEvent({
    businessId,
    eventType: 'resumed',
    eventStatus: 'completed',
    triggeredBy: resumedBy,
    previousState: 'suspended',
    newState: 'active',
    completedAt: new Date(),
  });
}

/**
 * Soft delete tenant (GDPR right to be forgotten)
 * Changes status to 'closed' and marks deletion timestamp
 * Actual data deletion should happen after 30-day retention period
 */
export async function deleteTenant(
  businessId: number,
  deletedBy: number,
  reason?: string
): Promise<void> {
  // Get current status
  const [business] = await db
    .select()
    .from(businessTenants)
    .where(eq(businessTenants.id, businessId))
    .limit(1);

  if (!business) {
    throw new Error('Business not found');
  }

  if (business.status === 'closed') {
    throw new Error('Business is already deleted');
  }

  // Update business status (soft delete)
  await db
    .update(businessTenants)
    .set({
      status: 'closed',
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(businessTenants.id, businessId));

  // Log lifecycle event
  await logLifecycleEvent({
    businessId,
    eventType: 'deleted',
    eventStatus: 'completed',
    triggeredBy: deletedBy,
    previousState: business.status,
    newState: 'closed',
    reason,
    completedAt: new Date(),
  });

  // TODO: Schedule hard delete job after 30 days
  // This would be handled by a separate cleanup job
}

/**
 * Get lifecycle history for a tenant
 */
export async function getLifecycleHistory(
  businessId: number,
  limit: number = 50
) {
  return db
    .select()
    .from(tenantLifecycleEvents)
    .where(eq(tenantLifecycleEvents.businessId, businessId))
    .orderBy(tenantLifecycleEvents.createdAt)
    .limit(limit);
}

/**
 * Get tenant status and metadata
 */
export async function getTenantStatus(businessId: number) {
  const [business] = await db
    .select({
      id: businessTenants.id,
      name: businessTenants.name,
      slug: businessTenants.slug,
      status: businessTenants.status,
      tenantKey: businessTenants.tenantKey,
      tenantTier: businessTenants.tenantTier,
      dataResidency: businessTenants.dataResidency,
      onboardingCompleted: businessTenants.onboardingCompleted,
      suspendedAt: businessTenants.suspendedAt,
      suspensionReason: businessTenants.suspensionReason,
      deletedAt: businessTenants.deletedAt,
      createdAt: businessTenants.createdAt,
    })
    .from(businessTenants)
    .where(eq(businessTenants.id, businessId))
    .limit(1);

  return business;
}

/**
 * Bulk tenant operations for admin
 */
export async function bulkSuspendTenants(
  businessIds: number[],
  reason: string,
  suspendedBy: number
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const businessId of businessIds) {
    try {
      await suspendTenant(businessId, reason, suspendedBy);
      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push(`Business ${businessId}: ${error.message}`);
    }
  }

  return results;
}
