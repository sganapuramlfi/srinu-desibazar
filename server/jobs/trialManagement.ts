/**
 * Trial Management Cron Job
 * Checks for trial expirations and sends warning emails
 * Run daily: node --loader tsx server/jobs/trialManagement.ts
 */

import { db } from '../../db/index.js';
import { businessSubscriptions, subscriptionPlans, businessTenants, platformUsers, businessAccess } from '../../db/index.js';
import { eq, and, lte, gte } from 'drizzle-orm';
import { emailService } from '../services/emailService.js';

interface TrialSubscription {
  subscription: typeof businessSubscriptions.$inferSelect;
  plan: typeof subscriptionPlans.$inferSelect;
  business: typeof businessTenants.$inferSelect;
}

/**
 * Get the billing email for a subscription (falls back to owner's platform email)
 */
async function getBillingEmail(subscription: TrialSubscription): Promise<string | null> {
  if (subscription.subscription.billingEmail) {
    return subscription.subscription.billingEmail;
  }
  // Fall back to business owner's email
  const [ownerAccess] = await db
    .select({ email: platformUsers.email })
    .from(businessAccess)
    .innerJoin(platformUsers, eq(platformUsers.id, businessAccess.userId))
    .where(and(
      eq(businessAccess.businessId, subscription.business.id),
      eq(businessAccess.role, 'owner'),
      eq(businessAccess.isActive, true)
    ))
    .limit(1);
  return ownerAccess?.email || null;
}

/**
 * Send trial expiration warning email
 */
async function sendTrialWarningEmail(
  subscription: TrialSubscription,
  daysRemaining: number
) {
  console.log(`📧 Sending ${daysRemaining}-day trial warning email for: ${subscription.business.name}`);
  const email = await getBillingEmail(subscription);
  if (email) {
    await emailService.sendTrialExpiryWarning(email, subscription.business.name, daysRemaining);
  }
}

/**
 * Send trial expired email
 */
async function sendTrialExpiredEmail(subscription: TrialSubscription) {
  console.log(`📧 Sending trial expired email for: ${subscription.business.name}`);
  const email = await getBillingEmail(subscription);
  if (email) {
    await emailService.sendTrialExpired(email, subscription.business.name);
  }
}

/**
 * Send trial converted email
 */
async function sendTrialConvertedEmail(subscription: TrialSubscription) {
  console.log(`📧 Sending trial converted email for: ${subscription.business.name}`);
  const email = await getBillingEmail(subscription);
  if (email) {
    await emailService.sendWelcomeEmail(email, subscription.business.name, subscription.business.industryType || 'business');
  }
}

/**
 * Suspend subscription (trial expired without payment)
 */
async function suspendSubscription(subscriptionId: number) {
  await db
    .update(businessSubscriptions)
    .set({
      status: 'suspended',
      cancelledAt: new Date(),
    })
    .where(eq(businessSubscriptions.id, subscriptionId));

  console.log(`🚫 Subscription ${subscriptionId} suspended (trial expired)`);
}

/**
 * Get days remaining until trial end
 */
function getDaysRemaining(trialEndsAt: Date): number {
  const now = new Date();
  const endDate = new Date(trialEndsAt);
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Main trial management function
 */
export async function checkTrialExpirations() {
  console.log('🔍 Checking trial expirations...');

  try {
    // Calculate date range for trials expiring in the next 7 days
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Get all active trial subscriptions expiring soon
    const trialSubscriptions = await db
      .select({
        subscription: businessSubscriptions,
        plan: subscriptionPlans,
        business: businessTenants,
      })
      .from(businessSubscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(businessSubscriptions.planId, subscriptionPlans.id)
      )
      .innerJoin(
        businessTenants,
        eq(businessSubscriptions.businessId, businessTenants.id)
      )
      .where(
        and(
          eq(businessSubscriptions.status, 'trial'),
          lte(businessSubscriptions.trialEndsAt, sevenDaysFromNow)
        )
      );

    console.log(`   Found ${trialSubscriptions.length} trial subscriptions expiring soon`);

    let warningsSent = 0;
    let suspensions = 0;

    for (const sub of trialSubscriptions) {
      if (!sub.subscription.trialEndsAt) continue;

      const daysRemaining = getDaysRemaining(sub.subscription.trialEndsAt);

      // Send warning emails at 7, 3, and 1 day marks
      if ([7, 3, 1].includes(daysRemaining)) {
        await sendTrialWarningEmail(sub, daysRemaining);
        warningsSent++;
      }

      // Suspend if trial has expired (0 or negative days)
      if (daysRemaining <= 0) {
        await suspendSubscription(sub.subscription.id);
        await sendTrialExpiredEmail(sub);
        suspensions++;
      }
    }

    console.log(`✅ Trial check complete:`);
    console.log(`   - ${warningsSent} warnings sent`);
    console.log(`   - ${suspensions} subscriptions suspended`);

    // Check for recent conversions (trials that upgraded to paid)
    const recentConversions = await db
      .select({
        subscription: businessSubscriptions,
        plan: subscriptionPlans,
        business: businessTenants,
      })
      .from(businessSubscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(businessSubscriptions.planId, subscriptionPlans.id)
      )
      .innerJoin(
        businessTenants,
        eq(businessSubscriptions.businessId, businessTenants.id)
      )
      .where(
        and(
          eq(businessSubscriptions.status, 'active'),
          gte(businessSubscriptions.updatedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        )
      );

    // Send conversion congratulations emails
    for (const sub of recentConversions) {
      // Check if this was a recent conversion from trial
      const currentUsage = (sub.subscription.currentUsage as any) || {};
      if (currentUsage.convertedFromTrial) {
        await sendTrialConvertedEmail(sub);

        // Clear the flag so we don't send again
        currentUsage.convertedFromTrial = false;
        await db
          .update(businessSubscriptions)
          .set({ currentUsage })
          .where(eq(businessSubscriptions.id, sub.subscription.id));
      }
    }

    return {
      success: true,
      warningsSent,
      suspensions,
      conversions: recentConversions.length,
    };
  } catch (error) {
    console.error('❌ Trial management error:', error);
    throw error;
  }
}

/**
 * Track trial conversion
 */
export async function trackTrialConversion(subscriptionId: number) {
  const [subscription] = await db
    .select()
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // Mark as converted in usage metadata
  const currentUsage = (subscription.currentUsage as any) || {};
  currentUsage.convertedFromTrial = true;
  currentUsage.conversionDate = new Date();

  await db
    .update(businessSubscriptions)
    .set({ currentUsage })
    .where(eq(businessSubscriptions.id, subscriptionId));

  console.log(`✅ Trial conversion tracked for subscription ${subscriptionId}`);
}

/**
 * Extend trial (admin feature)
 */
export async function extendTrial(
  subscriptionId: number,
  additionalDays: number
): Promise<void> {
  const [subscription] = await db
    .select()
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (subscription.status !== 'trial') {
    throw new Error('Subscription is not in trial status');
  }

  if (!subscription.trialEndsAt) {
    throw new Error('Trial end date not set');
  }

  const newTrialEndDate = new Date(subscription.trialEndsAt);
  newTrialEndDate.setDate(newTrialEndDate.getDate() + additionalDays);

  await db
    .update(businessSubscriptions)
    .set({
      trialEndsAt: newTrialEndDate,
    })
    .where(eq(businessSubscriptions.id, subscriptionId));

  console.log(`✅ Trial extended by ${additionalDays} days for subscription ${subscriptionId}`);
  console.log(`   New trial end date: ${newTrialEndDate}`);
}

// Run immediately if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting trial management job...\n');
  checkTrialExpirations()
    .then((result) => {
      console.log('\n✅ Job completed successfully');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Job failed:', error);
      process.exit(1);
    });
}
