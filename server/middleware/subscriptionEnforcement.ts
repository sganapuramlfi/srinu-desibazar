/**
 * Subscription Enforcement Middleware
 * Enforces subscription limits and feature access across the platform
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import {
  businessSubscriptions,
  subscriptionPlans,
  salonStaff,
  restaurantStaff,
  bookings,
} from '../../db/index.js';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';

/**
 * Custom error for subscription limits
 */
export class SubscriptionLimitError extends Error {
  limit: string;
  current: number;
  max: number;
  resetDate?: Date;
  upgrade: boolean;

  constructor(data: {
    limit: string;
    current: number;
    max: number;
    resetDate?: Date;
    upgrade?: boolean;
  }) {
    super(`Subscription limit exceeded: ${data.limit}`);
    this.name = 'SubscriptionLimitError';
    this.limit = data.limit;
    this.current = data.current;
    this.max = data.max;
    this.resetDate = data.resetDate;
    this.upgrade = data.upgrade !== false;
  }

  toJSON() {
    return {
      error: this.message,
      limit: this.limit,
      current: this.current,
      max: this.max,
      resetDate: this.resetDate,
      upgrade: this.upgrade,
      upgradeUrl: '/billing',
    };
  }
}

/**
 * Get subscription with plan details
 */
async function getSubscriptionWithPlan(businessId: number) {
  const [subscription] = await db
    .select({
      subscription: businessSubscriptions,
      plan: subscriptionPlans,
    })
    .from(businessSubscriptions)
    .innerJoin(
      subscriptionPlans,
      eq(businessSubscriptions.planId, subscriptionPlans.id)
    )
    .where(eq(businessSubscriptions.businessId, businessId))
    .limit(1);

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  // Check if subscription is active
  if (!['trial', 'active'].includes(subscription.subscription.status)) {
    throw new SubscriptionLimitError({
      limit: 'subscription_inactive',
      current: 0,
      max: 0,
      upgrade: true,
    });
  }

  return subscription;
}

/**
 * Middleware to require specific feature access
 */
export function requireFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId =
        (req as any).businessContext?.businessId ||
        (req.params.businessId ? parseInt(req.params.businessId) : null) ||
        (req.user as any)?.primaryBusiness?.businessId;

      if (!businessId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { subscription, plan } = await getSubscriptionWithPlan(businessId);

      const enabledFeatures = (plan.enabledFeatures as string[]) || [];

      if (!enabledFeatures.includes(featureName)) {
        return res.status(403).json({
          error: `Feature '${featureName}' not available in your plan`,
          currentPlan: plan.name,
          feature: featureName,
          upgrade: true,
          upgradeUrl: '/billing',
        });
      }

      next();
    } catch (error) {
      if (error instanceof SubscriptionLimitError) {
        return res.status(403).json(error.toJSON());
      }
      console.error('Feature check error:', error);
      res.status(500).json({ error: 'Failed to check feature access' });
    }
  };
}

/**
 * Middleware to require specific module access
 */
export function requireModule(moduleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId =
        (req as any).businessContext?.businessId ||
        (req.params.businessId ? parseInt(req.params.businessId) : null) ||
        (req.user as any)?.primaryBusiness?.businessId;

      if (!businessId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { subscription, plan } = await getSubscriptionWithPlan(businessId);

      const enabledModules = (plan.enabledModules as string[]) || [];

      if (!enabledModules.includes(moduleName)) {
        return res.status(403).json({
          error: `Module '${moduleName}' not available in your plan`,
          currentPlan: plan.name,
          module: moduleName,
          upgrade: true,
          upgradeUrl: '/billing',
        });
      }

      next();
    } catch (error) {
      if (error instanceof SubscriptionLimitError) {
        return res.status(403).json(error.toJSON());
      }
      console.error('Module check error:', error);
      res.status(500).json({ error: 'Failed to check module access' });
    }
  };
}

/**
 * Check staff limit before adding new staff
 */
export async function checkStaffLimit(businessId: number): Promise<void> {
  const { subscription, plan } = await getSubscriptionWithPlan(businessId);

  // Null means unlimited
  if (plan.maxStaff === null) {
    return;
  }

  // Count current staff (salon + restaurant)
  const [salonStaffCount] = await db
    .select({ count: count() })
    .from(salonStaff)
    .where(eq(salonStaff.businessId, businessId));

  const [restaurantStaffCount] = await db
    .select({ count: count() })
    .from(restaurantStaff)
    .where(eq(restaurantStaff.businessId, businessId));

  const totalStaff = (salonStaffCount?.count || 0) + (restaurantStaffCount?.count || 0);

  if (totalStaff >= plan.maxStaff) {
    throw new SubscriptionLimitError({
      limit: 'staff',
      current: totalStaff,
      max: plan.maxStaff,
      upgrade: true,
    });
  }
}

/**
 * Middleware to check staff limit
 */
export const checkStaffLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const businessId =
      (req as any).businessContext?.businessId ||
      (req.params.businessId ? parseInt(req.params.businessId) : null) ||
      (req.user as any)?.primaryBusiness?.businessId ||
      (req.user as any)?.businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await checkStaffLimit(businessId);
    next();
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return res.status(402).json({ ...error.toJSON(), upgradeRequired: true });
    }
    // If subscription not found, allow action (business may not have subscription yet)
    console.warn('Staff limit check skipped:', error instanceof Error ? error.message : error);
    next();
  }
};

/**
 * Check booking limit for current month
 */
export async function checkBookingLimit(businessId: number): Promise<void> {
  const { subscription, plan } = await getSubscriptionWithPlan(businessId);

  // Null means unlimited
  if (plan.maxBookingsPerMonth === null) {
    return;
  }

  // Get start and end of current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Count bookings this month
  const [result] = await db
    .select({ count: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.businessId, businessId),
        gte(bookings.createdAt, monthStart),
        lte(bookings.createdAt, monthEnd)
      )
    );

  const bookingCount = result?.count || 0;

  if (bookingCount >= plan.maxBookingsPerMonth) {
    throw new SubscriptionLimitError({
      limit: 'bookings',
      current: bookingCount,
      max: plan.maxBookingsPerMonth,
      resetDate: subscription.subscription.currentPeriodEnd || monthEnd,
      upgrade: true,
    });
  }
}

/**
 * Middleware to check booking limit
 */
export const checkBookingLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const businessId =
      (req as any).businessContext?.businessId ||
      (req.params.businessId ? parseInt(req.params.businessId) : null) ||
      (req.user as any)?.primaryBusiness?.businessId ||
      (req.body?.businessId ? parseInt(req.body.businessId) : null);

    if (!businessId) {
      // No businessId found — allow (public booking endpoint may resolve it later)
      return next();
    }

    await checkBookingLimit(businessId);
    next();
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return res.status(402).json({ ...error.toJSON(), upgradeRequired: true });
    }
    // If subscription not found, allow action
    console.warn('Booking limit check skipped:', error instanceof Error ? error.message : error);
    next();
  }
};

/**
 * Check and deduct AI credit
 */
export async function deductAICredit(businessId: number): Promise<void> {
  const { subscription, plan } = await getSubscriptionWithPlan(businessId);

  // Null means unlimited
  if (plan.aiCreditsPerMonth === null) {
    return;
  }

  const currentUsage = (subscription.subscription.currentUsage as any) || {};
  const aiCreditsUsed = (currentUsage.aiCredits || 0) + 1;

  if (aiCreditsUsed > plan.aiCreditsPerMonth) {
    throw new SubscriptionLimitError({
      limit: 'ai_credits',
      current: aiCreditsUsed,
      max: plan.aiCreditsPerMonth,
      resetDate: subscription.subscription.currentPeriodEnd || undefined,
      upgrade: true,
    });
  }

  // Update usage
  currentUsage.aiCredits = aiCreditsUsed;

  await db
    .update(businessSubscriptions)
    .set({ currentUsage })
    .where(eq(businessSubscriptions.id, subscription.subscription.id));
}

/**
 * Middleware to check and deduct AI credit
 */
export const deductAICreditMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const businessId =
      (req as any).businessContext?.businessId ||
      (req.params.businessId ? parseInt(req.params.businessId) : null) ||
      (req.user as any)?.primaryBusiness?.businessId;

    if (!businessId) {
      return next(); // No business context — allow (public AI endpoint)
    }

    await deductAICredit(businessId);
    next();
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return res.status(402).json({ ...error.toJSON(), upgradeRequired: true });
    }
    console.warn('AI credit check skipped:', error instanceof Error ? error.message : error);
    next();
  }
};

/**
 * Check storage limit
 */
export async function checkStorageLimit(
  businessId: number,
  additionalBytes: number
): Promise<void> {
  const { subscription, plan } = await getSubscriptionWithPlan(businessId);

  // Null means unlimited
  if (plan.storageGb === null) {
    return;
  }

  const currentUsage = (subscription.subscription.currentUsage as any) || {};
  const storageUsedBytes = currentUsage.storageBytes || 0;
  const maxStorageBytes = plan.storageGb * 1024 * 1024 * 1024; // GB to bytes

  const newTotalBytes = storageUsedBytes + additionalBytes;

  if (newTotalBytes > maxStorageBytes) {
    throw new SubscriptionLimitError({
      limit: 'storage',
      current: Math.round(storageUsedBytes / (1024 * 1024 * 1024) * 100) / 100, // GB with 2 decimals
      max: plan.storageGb,
      upgrade: true,
    });
  }
}

/**
 * Track storage usage (call after successful file upload)
 */
export async function trackStorageUsage(
  businessId: number,
  bytes: number
): Promise<void> {
  const [subscription] = await db
    .select()
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.businessId, businessId))
    .limit(1);

  if (!subscription) {
    return;
  }

  const currentUsage = (subscription.currentUsage as any) || {};
  currentUsage.storageBytes = (currentUsage.storageBytes || 0) + bytes;

  await db
    .update(businessSubscriptions)
    .set({ currentUsage })
    .where(eq(businessSubscriptions.id, subscription.id));
}

/**
 * Get current usage statistics for a business
 */
export async function getUsageStatistics(businessId: number) {
  const { subscription, plan } = await getSubscriptionWithPlan(businessId);

  // Count staff
  const [salonStaffCount] = await db
    .select({ count: count() })
    .from(salonStaff)
    .where(eq(salonStaff.businessId, businessId));

  const [restaurantStaffCount] = await db
    .select({ count: count() })
    .from(restaurantStaff)
    .where(eq(restaurantStaff.businessId, businessId));

  const totalStaff = (salonStaffCount?.count || 0) + (restaurantStaffCount?.count || 0);

  // Count bookings this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [bookingCount] = await db
    .select({ count: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.businessId, businessId),
        gte(bookings.createdAt, monthStart),
        lte(bookings.createdAt, monthEnd)
      )
    );

  const currentUsage = (subscription.subscription.currentUsage as any) || {};

  return {
    staff: {
      current: totalStaff,
      max: plan.maxStaff,
      percentage: plan.maxStaff ? Math.round((totalStaff / plan.maxStaff) * 100) : 0,
    },
    bookings: {
      current: bookingCount?.count || 0,
      max: plan.maxBookingsPerMonth,
      percentage: plan.maxBookingsPerMonth
        ? Math.round(((bookingCount?.count || 0) / plan.maxBookingsPerMonth) * 100)
        : 0,
      resetDate: subscription.subscription.currentPeriodEnd,
    },
    storage: {
      current: Math.round((currentUsage.storageBytes || 0) / (1024 * 1024 * 1024) * 100) / 100, // GB
      max: plan.storageGb,
      percentage: plan.storageGb
        ? Math.round(((currentUsage.storageBytes || 0) / (plan.storageGb * 1024 * 1024 * 1024)) * 100)
        : 0,
    },
    aiCredits: {
      current: currentUsage.aiCredits || 0,
      max: plan.aiCreditsPerMonth,
      percentage: plan.aiCreditsPerMonth
        ? Math.round(((currentUsage.aiCredits || 0) / plan.aiCreditsPerMonth) * 100)
        : 0,
      resetDate: subscription.subscription.currentPeriodEnd,
    },
  };
}

/**
 * Reset monthly usage counters (call via cron job)
 */
export async function resetMonthlyUsage(): Promise<void> {
  // Get all active subscriptions that need reset
  const subscriptions = await db
    .select()
    .from(businessSubscriptions)
    .where(
      and(
        eq(businessSubscriptions.status, 'active'),
        lte(businessSubscriptions.currentPeriodEnd, new Date())
      )
    );

  for (const subscription of subscriptions) {
    const currentUsage = (subscription.currentUsage as any) || {};

    // Reset monthly counters (keep storage and other persistent metrics)
    currentUsage.aiCredits = 0;

    // Update period dates
    const newPeriodStart = subscription.currentPeriodEnd || new Date();
    const newPeriodEnd = new Date(newPeriodStart);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

    await db
      .update(businessSubscriptions)
      .set({
        currentUsage,
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
      })
      .where(eq(businessSubscriptions.id, subscription.id));
  }

  console.log(`✅ Reset monthly usage for ${subscriptions.length} subscriptions`);
}
