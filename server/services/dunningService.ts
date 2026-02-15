/**
 * Dunning Service - Payment Failure Handling
 * Manages payment failures, retries, and subscription suspensions
 */

import { db } from '../../db/index.js';
import {
  businessSubscriptions,
  subscriptionPlans,
  businessTenants,
  paymentTransactions,
} from '../../db/index.js';
import { eq, and, lte } from 'drizzle-orm';

interface DunningState {
  failedAt: Date;
  attemptCount: number;
  lastEmailSent: Date | null;
  gracePeriodEnd: Date;
}

const GRACE_PERIOD_DAYS = 3;

/**
 * Send payment failure email
 */
async function sendPaymentFailureEmail(
  business: any,
  subscription: any,
  daysSinceFailure: number
) {
  console.log(`📧 Sending payment failure email (Day ${daysSinceFailure})`);
  console.log(`   Business: ${business.name}`);
  console.log(`   Email: ${subscription.billingEmail}`);

  // TODO: Implement actual email sending
  // Templates: payment_failed_day_0.html, payment_failed_day_1.html, etc.
}

/**
 * Get or initialize dunning state
 */
function getDunningState(subscription: any): DunningState | null {
  const currentUsage = (subscription.currentUsage as any) || {};
  return currentUsage.dunningState || null;
}

/**
 * Set dunning state
 */
async function setDunningState(
  subscriptionId: number,
  state: DunningState
): Promise<void> {
  const [subscription] = await db
    .select()
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) return;

  const currentUsage = (subscription.currentUsage as any) || {};
  currentUsage.dunningState = state;

  await db
    .update(businessSubscriptions)
    .set({ currentUsage })
    .where(eq(businessSubscriptions.id, subscriptionId));
}

/**
 * Clear dunning state (payment succeeded)
 */
async function clearDunningState(subscriptionId: number): Promise<void> {
  const [subscription] = await db
    .select()
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) return;

  const currentUsage = (subscription.currentUsage as any) || {};
  delete currentUsage.dunningState;

  await db
    .update(businessSubscriptions)
    .set({
      currentUsage,
      status: 'active', // Reactivate subscription
    })
    .where(eq(businessSubscriptions.id, subscriptionId));

  console.log(`✅ Dunning state cleared for subscription ${subscriptionId}`);
}

/**
 * Handle payment failed event
 */
export async function handlePaymentFailed(
  subscriptionId: number,
  amount: number,
  failureReason: string
): Promise<void> {
  console.log(`💳 Payment failed for subscription ${subscriptionId}`);
  console.log(`   Amount: $${amount}`);
  console.log(`   Reason: ${failureReason}`);

  // Get subscription
  const [subscription] = await db
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
    .where(eq(businessSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) {
    console.error(`Subscription ${subscriptionId} not found`);
    return;
  }

  // Get or initialize dunning state
  let dunningState = getDunningState(subscription.subscription);

  if (!dunningState) {
    // First failure - initialize dunning
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    dunningState = {
      failedAt: new Date(),
      attemptCount: 1,
      lastEmailSent: null,
      gracePeriodEnd,
    };

    // Update subscription status to past_due
    await db
      .update(businessSubscriptions)
      .set({ status: 'past_due' })
      .where(eq(businessSubscriptions.id, subscriptionId));

    console.log(`⚠️  Subscription marked as past_due`);
    console.log(`   Grace period until: ${gracePeriodEnd}`);
  } else {
    // Subsequent failure - increment count
    dunningState.attemptCount++;
  }

  // Save dunning state
  await setDunningState(subscriptionId, dunningState);

  // Send immediate failure email
  await sendPaymentFailureEmail(subscription.business, subscription.subscription, 0);

  // Record payment transaction
  await db.insert(paymentTransactions).values({
    businessId: subscription.business.id,
    subscriptionId: subscription.subscription.id,
    amount: amount.toString(),
    currency: 'AUD',
    status: 'failed',
    failureReason,
    description: 'Subscription payment failed',
    metadata: {},
  });
}

/**
 * Handle payment succeeded (after previous failure)
 */
export async function handlePaymentSucceeded(
  subscriptionId: number,
  amount: number
): Promise<void> {
  console.log(`✅ Payment succeeded for subscription ${subscriptionId}`);

  // Get subscription
  const [subscription] = await db
    .select()
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) return;

  // Check if subscription was in dunning
  const dunningState = getDunningState(subscription);

  if (dunningState) {
    // Clear dunning state and reactivate
    await clearDunningState(subscriptionId);

    // TODO: Send reactivation success email
    console.log(`📧 Should send reactivation email to ${subscription.billingEmail}`);
  }

  // Record successful payment
  await db.insert(paymentTransactions).values({
    businessId: subscription.businessId,
    subscriptionId: subscription.id,
    amount: amount.toString(),
    currency: 'AUD',
    status: 'succeeded',
    description: 'Subscription payment successful',
    metadata: {},
  });
}

/**
 * Daily dunning check (run via cron)
 */
export async function processDunningQueue(): Promise<void> {
  console.log('🔍 Processing dunning queue...');

  // Get all past_due subscriptions
  const pastDueSubscriptions = await db
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
    .where(eq(businessSubscriptions.status, 'past_due'));

  console.log(`   Found ${pastDueSubscriptions.length} past_due subscriptions`);

  let emailsSent = 0;
  let suspensions = 0;

  for (const sub of pastDueSubscriptions) {
    const dunningState = getDunningState(sub.subscription);

    if (!dunningState) {
      console.warn(`No dunning state for subscription ${sub.subscription.id}`);
      continue;
    }

    const daysSinceFailure = Math.floor(
      (Date.now() - dunningState.failedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const now = new Date();

    // Send follow-up emails on day 1, 3
    if ([1, 3].includes(daysSinceFailure)) {
      const lastEmailDate = dunningState.lastEmailSent;
      const shouldSendEmail = !lastEmailDate ||
        lastEmailDate.getDate() !== now.getDate();

      if (shouldSendEmail) {
        await sendPaymentFailureEmail(sub.business, sub.subscription, daysSinceFailure);
        dunningState.lastEmailSent = now;
        await setDunningState(sub.subscription.id, dunningState);
        emailsSent++;
      }
    }

    // Suspend if grace period has ended
    if (now >= dunningState.gracePeriodEnd) {
      await suspendSubscription(sub.subscription.id);
      await sendPaymentFailureEmail(sub.business, sub.subscription, 4); // Final email
      suspensions++;
    }
  }

  console.log(`✅ Dunning check complete:`);
  console.log(`   - ${emailsSent} follow-up emails sent`);
  console.log(`   - ${suspensions} subscriptions suspended`);
}

/**
 * Suspend subscription (after grace period)
 */
async function suspendSubscription(subscriptionId: number): Promise<void> {
  await db
    .update(businessSubscriptions)
    .set({
      status: 'suspended',
      cancelledAt: new Date(),
    })
    .where(eq(businessSubscriptions.id, subscriptionId));

  console.log(`🚫 Subscription ${subscriptionId} suspended (grace period expired)`);
}

/**
 * Manual retry payment (admin feature)
 */
export async function retryPayment(subscriptionId: number): Promise<boolean> {
  console.log(`🔄 Manually retrying payment for subscription ${subscriptionId}`);

  // Get subscription with Stripe details
  const [subscription] = await db
    .select()
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const stripeSubscriptionId = (subscription.currentUsage as any)?.stripeSubscriptionId;
  if (!stripeSubscriptionId) {
    throw new Error('Stripe subscription ID not found');
  }

  // TODO: Trigger Stripe retry
  // await stripe.subscriptions.update(stripeSubscriptionId, {
  //   billing_cycle_anchor: 'now',
  // });

  console.log(`✅ Payment retry triggered`);
  return true;
}

/**
 * Get dunning statistics
 */
export async function getDunningStats() {
  const pastDue = await db
    .select({ count: businessSubscriptions.id })
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.status, 'past_due'));

  const suspended = await db
    .select({ count: businessSubscriptions.id })
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.status, 'suspended'));

  const failedPayments = await db
    .select({ count: paymentTransactions.id })
    .from(paymentTransactions)
    .where(
      and(
        eq(paymentTransactions.status, 'failed'),
        gte(paymentTransactions.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      )
    );

  return {
    pastDue: pastDue.length,
    suspended: suspended.length,
    failedPaymentsLast30Days: failedPayments.length,
  };
}
