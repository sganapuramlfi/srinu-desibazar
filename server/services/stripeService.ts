/**
 * Stripe Service - Payment processing and subscription management
 * Handles all Stripe API interactions for the platform
 */

import Stripe from 'stripe';
import { db } from '../../db/index.js';
import {
  businessTenants,
  businessSubscriptions,
  subscriptionPlans,
  paymentTransactions,
  paymentMethods,
  subscriptionInvoices,
} from '../../db/index.js';
import { eq, and } from 'drizzle-orm';

// Initialize Stripe
const stripeApiKey = process.env.STRIPE_SECRET_KEY;
if (!stripeApiKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY not set - payment features will be disabled');
}

export const stripe = stripeApiKey ? new Stripe(stripeApiKey, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
}) : null;

export class StripeService {
  /**
   * Create or get Stripe customer for a business
   */
  static async getOrCreateCustomer(businessId: number): Promise<string> {
    if (!stripe) throw new Error('Stripe not initialized');

    // Get business details
    const [business] = await db
      .select()
      .from(businessTenants)
      .where(eq(businessTenants.id, businessId))
      .limit(1);

    if (!business) {
      throw new Error('Business not found');
    }

    // Check if customer already exists
    const [subscription] = await db
      .select()
      .from(businessSubscriptions)
      .where(eq(businessSubscriptions.businessId, businessId))
      .limit(1);

    if (subscription && (subscription.currentUsage as any)?.stripeCustomerId) {
      return (subscription.currentUsage as any).stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      name: business.name,
      email: subscription?.billingEmail || (business.contactInfo as any)?.email,
      metadata: {
        businessId: business.id.toString(),
        industryType: business.industryType,
      },
    });

    // Store customer ID
    if (subscription) {
      const currentUsage = (subscription.currentUsage as any) || {};
      currentUsage.stripeCustomerId = customer.id;

      await db
        .update(businessSubscriptions)
        .set({ currentUsage })
        .where(eq(businessSubscriptions.id, subscription.id));
    }

    return customer.id;
  }

  /**
   * Create setup intent for collecting payment method
   */
  static async createSetupIntent(businessId: number): Promise<Stripe.SetupIntent> {
    if (!stripe) throw new Error('Stripe not initialized');

    const customerId = await this.getOrCreateCustomer(businessId);

    return await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        businessId: businessId.toString(),
      },
    });
  }

  /**
   * Save payment method to database
   */
  static async savePaymentMethod(
    businessId: number,
    stripePaymentMethodId: string,
    isDefault: boolean = false
  ): Promise<number> {
    if (!stripe) throw new Error('Stripe not initialized');

    // Retrieve payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

    // If setting as default, unset other defaults
    if (isDefault) {
      await db
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.businessId, businessId));
    }

    // Insert payment method
    const [inserted] = await db
      .insert(paymentMethods)
      .values({
        businessId,
        stripePaymentMethodId,
        type: paymentMethod.type as 'card' | 'bank_account' | 'other',
        cardBrand: paymentMethod.card?.brand || null,
        cardLast4: paymentMethod.card?.last4 || null,
        cardExpMonth: paymentMethod.card?.exp_month || null,
        cardExpYear: paymentMethod.card?.exp_year || null,
        cardFingerprint: paymentMethod.card?.fingerprint || null,
        isDefault,
        billingEmail: paymentMethod.billing_details?.email || null,
        billingName: paymentMethod.billing_details?.name || null,
        billingAddress: paymentMethod.billing_details?.address || {},
      })
      .returning();

    return inserted.id;
  }

  /**
   * Create subscription in Stripe and database
   */
  static async createSubscription(
    businessId: number,
    planId: number,
    paymentMethodId?: string
  ): Promise<void> {
    if (!stripe) throw new Error('Stripe not initialized');

    // Get plan details
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get or create customer
    const customerId = await this.getOrCreateCustomer(businessId);

    // Attach payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Get business subscription
    const [businessSub] = await db
      .select()
      .from(businessSubscriptions)
      .where(eq(businessSubscriptions.businessId, businessId))
      .limit(1);

    if (!businessSub) {
      throw new Error('Business subscription not found');
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: plan.stripePriceId || undefined,
        },
      ],
      metadata: {
        businessId: businessId.toString(),
        planId: planId.toString(),
      },
      trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
    });

    // Update business subscription with Stripe details
    const currentUsage = (businessSub.currentUsage as any) || {};
    currentUsage.stripeSubscriptionId = stripeSubscription.id;

    await db
      .update(businessSubscriptions)
      .set({
        status: stripeSubscription.status === 'trialing' ? 'trial' : 'active',
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        currentUsage,
      })
      .where(eq(businessSubscriptions.id, businessSub.id));
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  static async updateSubscription(
    businessId: number,
    newPlanId: number
  ): Promise<void> {
    if (!stripe) throw new Error('Stripe not initialized');

    // Get current subscription
    const [businessSub] = await db
      .select()
      .from(businessSubscriptions)
      .where(eq(businessSubscriptions.businessId, businessId))
      .limit(1);

    if (!businessSub) {
      throw new Error('Subscription not found');
    }

    const stripeSubscriptionId = (businessSub.currentUsage as any)?.stripeSubscriptionId;
    if (!stripeSubscriptionId) {
      throw new Error('Stripe subscription not found');
    }

    // Get new plan
    const [newPlan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, newPlanId))
      .limit(1);

    if (!newPlan || !newPlan.stripePriceId) {
      throw new Error('Plan or price not found');
    }

    // Update Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    // Update database
    await db
      .update(businessSubscriptions)
      .set({ planId: newPlanId })
      .where(eq(businessSubscriptions.id, businessSub.id));
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(
    businessId: number,
    immediately: boolean = false
  ): Promise<void> {
    if (!stripe) throw new Error('Stripe not initialized');

    // Get subscription
    const [businessSub] = await db
      .select()
      .from(businessSubscriptions)
      .where(eq(businessSubscriptions.businessId, businessId))
      .limit(1);

    if (!businessSub) {
      throw new Error('Subscription not found');
    }

    const stripeSubscriptionId = (businessSub.currentUsage as any)?.stripeSubscriptionId;
    if (!stripeSubscriptionId) {
      throw new Error('Stripe subscription not found');
    }

    // Cancel in Stripe
    if (immediately) {
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    } else {
      await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Update database
    await db
      .update(businessSubscriptions)
      .set({
        status: immediately ? 'cancelled' : 'active',
        cancelledAt: immediately ? new Date() : null,
      })
      .where(eq(businessSubscriptions.id, businessSub.id));
  }

  /**
   * Process webhook event
   */
  static async processWebhook(event: Stripe.Event): Promise<void> {
    console.log(`📥 Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle subscription updated webhook
   */
  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const businessId = parseInt(subscription.metadata.businessId || '0');
    if (!businessId) return;

    const [businessSub] = await db
      .select()
      .from(businessSubscriptions)
      .where(eq(businessSubscriptions.businessId, businessId))
      .limit(1);

    if (!businessSub) return;

    // Map Stripe status to our status
    let status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended' = 'active';
    if (subscription.status === 'trialing') status = 'trial';
    else if (subscription.status === 'past_due') status = 'past_due';
    else if (subscription.status === 'canceled') status = 'cancelled';

    await db
      .update(businessSubscriptions)
      .set({
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      })
      .where(eq(businessSubscriptions.id, businessSub.id));
  }

  /**
   * Handle subscription deleted webhook
   */
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const businessId = parseInt(subscription.metadata.businessId || '0');
    if (!businessId) return;

    await db
      .update(businessSubscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(eq(businessSubscriptions.businessId, businessId));
  }

  /**
   * Handle invoice payment succeeded webhook
   */
  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Record successful payment transaction
    const businessId = invoice.subscription_details?.metadata?.businessId;
    if (!businessId) return;

    await db.insert(paymentTransactions).values({
      businessId: parseInt(businessId),
      stripePaymentIntentId: invoice.payment_intent as string || null,
      stripeInvoiceId: invoice.id,
      amount: (invoice.amount_paid / 100).toString(),
      currency: invoice.currency.toUpperCase(),
      status: 'succeeded',
      paymentMethod: 'card',
      description: invoice.description || 'Subscription payment',
      metadata: {},
    });
  }

  /**
   * Handle invoice payment failed webhook
   */
  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const businessId = invoice.subscription_details?.metadata?.businessId;
    if (!businessId) return;

    // Record failed payment
    await db.insert(paymentTransactions).values({
      businessId: parseInt(businessId),
      stripePaymentIntentId: invoice.payment_intent as string || null,
      stripeInvoiceId: invoice.id,
      amount: (invoice.amount_due / 100).toString(),
      currency: invoice.currency.toUpperCase(),
      status: 'failed',
      failureReason: 'Payment failed',
      description: invoice.description || 'Subscription payment',
      metadata: {},
    });

    // Update subscription status
    await db
      .update(businessSubscriptions)
      .set({ status: 'past_due' })
      .where(eq(businessSubscriptions.businessId, parseInt(businessId)));
  }

  /**
   * Handle payment intent succeeded
   */
  private static async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Payment intent success is usually handled by invoice.payment_succeeded
    console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
  }

  /**
   * Handle payment intent failed
   */
  private static async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`❌ Payment failed: ${paymentIntent.id}`);
  }

  /**
   * Create refund
   */
  static async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<void> {
    if (!stripe) throw new Error('Stripe not initialized');

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason as Stripe.RefundCreateParams.Reason || undefined,
    });

    // Update transaction record
    await db
      .update(paymentTransactions)
      .set({
        status: refund.amount === refund.charge ? 'refunded' : 'partially_refunded',
        amountRefunded: (refund.amount / 100).toString(),
        refundedAt: new Date(),
      })
      .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntentId));
  }

  /**
   * Get customer portal URL
   */
  static async createPortalSession(businessId: number, returnUrl: string): Promise<string> {
    if (!stripe) throw new Error('Stripe not initialized');

    const customerId = await this.getOrCreateCustomer(businessId);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }
}
