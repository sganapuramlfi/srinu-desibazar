/**
 * Billing Routes - Subscription and payment management
 * Handles Stripe integration, payment methods, subscriptions, and webhooks
 */

import { Router, Request, Response } from 'express';
import { StripeService, stripe } from '../services/stripeService.js';
import { getInvoicePath, invoiceExists } from '../services/invoiceService.js';
import { db } from '../../db/index.js';
import {
  businessSubscriptions,
  subscriptionPlans,
  paymentMethods,
  paymentTransactions,
  subscriptionInvoices,
} from '../../db/index.js';
import { eq, desc, and } from 'drizzle-orm';
import Stripe from 'stripe';

const router = Router();

/**
 * Create setup intent for payment method collection
 * POST /api/billing/setup-intent
 */
router.post('/setup-intent', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const setupIntent = await StripeService.createSetupIntent(businessId);

    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (error) {
    console.error('Setup intent error:', error);
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
});

/**
 * Save payment method
 * POST /api/billing/payment-method
 */
router.post('/payment-method', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;
    const { paymentMethodId, isDefault } = req.body;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method ID required' });
    }

    const id = await StripeService.savePaymentMethod(
      businessId,
      paymentMethodId,
      isDefault
    );

    res.json({
      success: true,
      paymentMethodId: id,
      message: 'Payment method saved successfully',
    });
  } catch (error) {
    console.error('Save payment method error:', error);
    res.status(500).json({ error: 'Failed to save payment method' });
  }
});

/**
 * Get all payment methods for business
 * GET /api/billing/payment-methods
 */
router.get('/payment-methods', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const methods = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.businessId, businessId),
          eq(paymentMethods.isActive, true)
        )
      )
      .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));

    res.json(methods);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
});

/**
 * Delete payment method
 * DELETE /api/billing/payment-method/:id
 */
router.delete('/payment-method/:id', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;
    const methodId = parseInt(req.params.id);

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get payment method
    const [method] = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.id, methodId),
          eq(paymentMethods.businessId, businessId)
        )
      )
      .limit(1);

    if (!method) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Detach from Stripe
    if (stripe) {
      await stripe.paymentMethods.detach(method.stripePaymentMethodId);
    }

    // Mark as inactive
    await db
      .update(paymentMethods)
      .set({ isActive: false })
      .where(eq(paymentMethods.id, methodId));

    res.json({ success: true, message: 'Payment method removed' });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

/**
 * Create or update subscription
 * POST /api/billing/subscribe
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;
    const { planId, paymentMethodId } = req.body;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID required' });
    }

    await StripeService.createSubscription(businessId, planId, paymentMethodId);

    res.json({
      success: true,
      message: 'Subscription created successfully',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * Update subscription (upgrade/downgrade)
 * PUT /api/billing/subscription
 */
router.put('/subscription', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;
    const { planId } = req.body;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID required' });
    }

    await StripeService.updateSubscription(businessId, planId);

    res.json({
      success: true,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

/**
 * Cancel subscription
 * POST /api/billing/subscription/cancel
 */
router.post('/subscription/cancel', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;
    const { immediately } = req.body;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await StripeService.cancelSubscription(businessId, immediately);

    res.json({
      success: true,
      message: immediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will cancel at end of period',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * Get subscription details
 * GET /api/billing/subscription
 */
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [subscription] = await db
      .select()
      .from(businessSubscriptions)
      .where(eq(businessSubscriptions.businessId, businessId))
      .limit(1);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Get plan details
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, subscription.planId))
      .limit(1);

    res.json({
      ...subscription,
      plan,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

/**
 * Get invoices
 * GET /api/billing/invoices
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const invoices = await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.businessId, businessId))
      .orderBy(desc(subscriptionInvoices.createdAt))
      .limit(50);

    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

/**
 * Get payment history
 * GET /api/billing/transactions
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const transactions = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.businessId, businessId))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(50);

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

/**
 * Get customer portal URL
 * GET /api/billing/portal
 */
router.get('/portal', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;
    const returnUrl = req.query.returnUrl as string || `${req.protocol}://${req.get('host')}/dashboard`;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const portalUrl = await StripeService.createPortalSession(businessId, returnUrl);

    res.json({ url: portalUrl });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * Get available subscription plans
 * GET /api/billing/plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.displayOrder);

    res.json(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

/**
 * Stripe webhook handler
 * POST /api/billing/webhook
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret || !stripe) {
      return res.status(400).json({ error: 'Webhook not configured' });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Process the event
    await StripeService.processWebhook(event);

    res.json({ received: true, type: event.type });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Download invoice PDF
 * GET /api/billing/invoice/:invoiceNumber
 */
router.get('/invoice/:invoiceNumber', async (req: Request, res: Response) => {
  try {
    const businessId = req.user?.businessId || (req as any).businessId;
    const { invoiceNumber } = req.params;

    if (!businessId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify invoice belongs to business
    const [invoice] = await db
      .select()
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.invoiceNumber, invoiceNumber),
          eq(subscriptionInvoices.businessId, businessId)
        )
      )
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if PDF exists
    if (!invoiceExists(invoiceNumber)) {
      return res.status(404).json({ error: 'Invoice PDF not found' });
    }

    // Send PDF file
    const filepath = getInvoicePath(invoiceNumber);
    res.download(filepath, `${invoiceNumber}.pdf`);
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

export default router;
