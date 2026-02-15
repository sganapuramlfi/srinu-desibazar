import crypto from 'crypto';
import { db } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';

/**
 * Payment Gateway Service
 * Manages per-tenant payment gateway configuration with encryption
 * Supports both platform-managed and vendor-managed payment models
 */

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_VERSION = 1;

/**
 * Get encryption key from environment
 * CRITICAL: Store this in secure key management system (AWS KMS, HashiCorp Vault)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.PAYMENT_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('PAYMENT_ENCRYPTION_KEY environment variable not set');
  }

  // Key should be 32 bytes (256 bits) for AES-256
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt payment credentials
 */
export function encryptCredentials(credentials: any): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const credentialsJson = JSON.stringify(credentials);
  const encrypted = Buffer.concat([
    cipher.update(credentialsJson, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Store: iv + authTag + encrypted data
  const result = Buffer.concat([iv, authTag, encrypted]);
  return result.toString('base64');
}

/**
 * Decrypt payment credentials
 */
export function decryptCredentials(encryptedData: string): any {
  const key = getEncryptionKey();
  const buffer = Buffer.from(encryptedData, 'base64');

  // Extract: iv (16 bytes) + authTag (16 bytes) + encrypted data
  const iv = buffer.subarray(0, 16);
  const authTag = buffer.subarray(16, 32);
  const encrypted = buffer.subarray(32);

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Payment Models
 */
export type PaymentModel = 'platform_managed' | 'vendor_managed';

export type PaymentGatewayProvider = 'stripe' | 'paypal' | 'square' | 'razorpay' | 'other';

export interface StripeCredentials {
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
  connectedAccountId?: string; // For Stripe Connect
}

export interface PayPalCredentials {
  clientId: string;
  clientSecret: string;
  webhookId?: string;
}

export type PaymentCredentials = StripeCredentials | PayPalCredentials | Record<string, string>;

/**
 * Add payment gateway for tenant
 */
export async function addPaymentGateway(params: {
  businessId: number;
  paymentModel: PaymentModel;
  gatewayProvider: PaymentGatewayProvider;
  credentials: PaymentCredentials;
  settings?: any;
  isTestMode?: boolean;
  payoutEnabled?: boolean;
  payoutSchedule?: 'daily' | 'weekly' | 'monthly' | 'manual';
  platformCommissionPercent?: number;
  createdBy: number;
}) {
  // Encrypt credentials
  const encryptedCredentials = encryptCredentials(params.credentials);

  // Insert gateway configuration
  // NOTE: This is a placeholder - actual implementation needs proper schema
  // See db/payment-gateway-schema.ts

  console.log('Payment gateway added:', {
    businessId: params.businessId,
    provider: params.gatewayProvider,
    model: params.paymentModel,
  });

  return {
    id: 1, // Placeholder
    businessId: params.businessId,
    gatewayProvider: params.gatewayProvider,
    paymentModel: params.paymentModel,
  };
}

/**
 * Get payment gateway for tenant
 */
export async function getPaymentGateway(businessId: number) {
  // NOTE: This is a placeholder - actual implementation needs proper schema
  // Query from tenant_payment_gateways table

  console.log('Getting payment gateway for business:', businessId);

  return null; // Placeholder
}

/**
 * Get decrypted credentials for tenant
 */
export async function getDecryptedCredentials(businessId: number): Promise<PaymentCredentials | null> {
  const gateway = await getPaymentGateway(businessId);

  if (!gateway) {
    return null;
  }

  // Decrypt credentials
  // const credentials = decryptCredentials(gateway.encryptedCredentials);
  // return credentials;

  return null; // Placeholder
}

/**
 * Update payment gateway credentials
 */
export async function updatePaymentGateway(
  businessId: number,
  updates: {
    credentials?: PaymentCredentials;
    settings?: any;
    isTestMode?: boolean;
    payoutEnabled?: boolean;
  }
) {
  let encryptedCredentials;

  if (updates.credentials) {
    encryptedCredentials = encryptCredentials(updates.credentials);
  }

  // NOTE: This is a placeholder - actual implementation needs proper schema
  // Update tenant_payment_gateways table

  console.log('Payment gateway updated for business:', businessId);

  return true;
}

/**
 * Delete payment gateway
 */
export async function deletePaymentGateway(businessId: number): Promise<boolean> {
  // NOTE: This is a placeholder - actual implementation needs proper schema
  // Delete from tenant_payment_gateways table

  console.log('Payment gateway deleted for business:', businessId);

  return true;
}

/**
 * Verify payment gateway credentials
 * Makes a test API call to payment provider
 */
export async function verifyPaymentGateway(businessId: number): Promise<boolean> {
  const credentials = await getDecryptedCredentials(businessId);

  if (!credentials) {
    throw new Error('Payment gateway not configured');
  }

  // TODO: Implement actual verification
  // For Stripe: Make test API call with credentials
  // For PayPal: Verify client credentials

  return true;
}

/**
 * Create payment intent (for vendor-managed model)
 */
export async function createPaymentIntent(params: {
  businessId: number;
  amountCents: number;
  currency: string;
  description: string;
  metadata?: any;
}) {
  const credentials = await getDecryptedCredentials(params.businessId);

  if (!credentials) {
    throw new Error('Payment gateway not configured');
  }

  // TODO: Implement Stripe payment intent creation
  // Use tenant's own Stripe credentials

  console.log('Creating payment intent:', params);

  return {
    paymentIntentId: 'pi_test_123',
    clientSecret: 'pi_test_123_secret',
    amount: params.amountCents,
  };
}

/**
 * Process payout (for platform-managed model)
 */
export async function processPayout(params: {
  businessId: number;
  periodStart: Date;
  periodEnd: Date;
}) {
  // TODO: Implement payout logic
  // 1. Calculate gross sales
  // 2. Deduct platform commission
  // 3. Deduct refunds
  // 4. Create Stripe transfer to vendor's connected account

  console.log('Processing payout:', params);

  return {
    payoutId: 1,
    netAmountCents: 10000,
    status: 'pending',
  };
}

/**
 * Handle payment webhook
 */
export async function handlePaymentWebhook(params: {
  businessId: number;
  provider: PaymentGatewayProvider;
  event: any;
}) {
  // TODO: Implement webhook handling
  // Verify webhook signature with tenant's webhook secret
  // Process event (payment succeeded, payment failed, etc.)

  console.log('Handling payment webhook:', params.provider, params.event.type);

  return { processed: true };
}

/**
 * Example Usage:
 *
 * // 1. Add Stripe gateway for vendor-managed payments
 * await addPaymentGateway({
 *   businessId: 123,
 *   paymentModel: 'vendor_managed',
 *   gatewayProvider: 'stripe',
 *   credentials: {
 *     secretKey: 'sk_live_...',
 *     publishableKey: 'pk_live_...',
 *     webhookSecret: 'whsec_...',
 *   },
 *   isTestMode: false,
 *   createdBy: 1,
 * });
 *
 * // 2. Create payment intent with vendor's credentials
 * const intent = await createPaymentIntent({
 *   businessId: 123,
 *   amountCents: 5000,
 *   currency: 'AUD',
 *   description: 'Booking payment',
 * });
 *
 * // 3. Process payout (platform-managed model)
 * await processPayout({
 *   businessId: 123,
 *   periodStart: new Date('2026-02-01'),
 *   periodEnd: new Date('2026-02-28'),
 * });
 */

// CRITICAL SECURITY NOTES:
// 1. NEVER log decrypted credentials
// 2. Store PAYMENT_ENCRYPTION_KEY in secure key management system
// 3. Rotate encryption keys regularly
// 4. Use separate keys for test and production environments
// 5. Audit all access to payment credentials
