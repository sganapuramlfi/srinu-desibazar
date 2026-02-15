import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * Payment Gateway Configuration Schema
 * Stores per-tenant payment gateway credentials with encryption
 * Supports both platform-managed and vendor-managed payment models
 */

export const tenantPaymentGateways = pgTable("tenant_payment_gateways", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(), // FK to business_tenants

  // Payment Model
  paymentModel: text("payment_model", {
    enum: ["platform_managed", "vendor_managed"]
  }).notNull(),
  // platform_managed: All payments go to DesiBazaar, vendor gets payouts
  // vendor_managed: Each vendor has own Stripe/payment account

  // Gateway Configuration
  gatewayProvider: text("gateway_provider", {
    enum: ["stripe", "paypal", "square", "razorpay", "other"]
  }).notNull(),

  // Encrypted Credentials (stored as encrypted JSON)
  // For Stripe: { secretKey: encrypted, publishableKey: encrypted, webhookSecret: encrypted }
  // For PayPal: { clientId: encrypted, clientSecret: encrypted }
  encryptedCredentials: text("encrypted_credentials").notNull(),

  // Encryption metadata
  encryptionAlgorithm: text("encryption_algorithm").default("aes-256-gcm").notNull(),
  encryptionKeyVersion: integer("encryption_key_version").default(1).notNull(),

  // Gateway Settings
  settings: jsonb("settings").default({}).notNull(),
  // { currency: "AUD", acceptedPaymentMethods: ["card", "bank"], testMode: false }

  // Payout Configuration (for platform_managed model)
  payoutEnabled: boolean("payout_enabled").default(false),
  payoutSchedule: text("payout_schedule", {
    enum: ["daily", "weekly", "monthly", "manual"]
  }),
  payoutMinimum: integer("payout_minimum_cents"),
  platformCommissionPercent: integer("platform_commission_percent").default(0),

  // Status
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),

  // Test Mode
  isTestMode: boolean("is_test_mode").default(true),

  // Audit
  createdBy: integer("created_by"), // FK to platform_users
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment transactions log
export const tenantPaymentTransactions = pgTable("tenant_payment_transactions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  gatewayId: integer("gateway_id"), // FK to tenant_payment_gateways

  // Transaction Details
  transactionType: text("transaction_type", {
    enum: ["charge", "refund", "payout", "transfer"]
  }).notNull(),

  // External Gateway References
  gatewayTransactionId: text("gateway_transaction_id"),
  gatewayStatus: text("gateway_status"),

  // Amounts (in cents)
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").default("AUD").notNull(),
  platformFeeCents: integer("platform_fee_cents").default(0),
  netAmountCents: integer("net_amount_cents").notNull(),

  // Related Records
  bookingId: integer("booking_id"), // FK to bookings
  customerId: integer("customer_id"), // FK to platform_users

  // Payment Method
  paymentMethod: text("payment_method"), // card, bank_transfer, wallet
  paymentMethodDetails: jsonb("payment_method_details"), // { last4: "4242", brand: "visa" }

  // Status
  status: text("status", {
    enum: ["pending", "processing", "succeeded", "failed", "refunded"]
  }).notNull(),

  // Metadata
  metadata: jsonb("metadata").default({}),
  errorMessage: text("error_message"),

  // Timestamps
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payout records (for platform_managed model)
export const tenantPayouts = pgTable("tenant_payouts", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),

  // Payout Details
  payoutPeriodStart: timestamp("payout_period_start").notNull(),
  payoutPeriodEnd: timestamp("payout_period_end").notNull(),

  // Amounts (in cents)
  grossAmountCents: integer("gross_amount_cents").notNull(), // Total sales
  platformFeeCents: integer("platform_fee_cents").notNull(),
  refundsCents: integer("refunds_cents").default(0),
  netPayoutCents: integer("net_payout_cents").notNull(), // What vendor receives
  currency: text("currency").default("AUD").notNull(),

  // Status
  status: text("status", {
    enum: ["pending", "processing", "paid", "failed", "cancelled"]
  }).notNull(),

  // Gateway Details
  gatewayTransferId: text("gateway_transfer_id"),
  gatewayAccountId: text("gateway_account_id"), // Vendor's connected account ID

  // Metadata
  transactionCount: integer("transaction_count").default(0),
  metadata: jsonb("metadata").default({}),

  // Timestamps
  scheduledAt: timestamp("scheduled_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas
export const insertTenantPaymentGatewaySchema = createInsertSchema(tenantPaymentGateways);
export const selectTenantPaymentGatewaySchema = createSelectSchema(tenantPaymentGateways);
export const insertTenantPaymentTransactionSchema = createInsertSchema(tenantPaymentTransactions);
export const selectTenantPaymentTransactionSchema = createSelectSchema(tenantPaymentTransactions);
export const insertTenantPayoutSchema = createInsertSchema(tenantPayouts);
export const selectTenantPayoutSchema = createSelectSchema(tenantPayouts);

// TypeScript types
export type TenantPaymentGateway = typeof tenantPaymentGateways.$inferSelect;
export type TenantPaymentTransaction = typeof tenantPaymentTransactions.$inferSelect;
export type TenantPayout = typeof tenantPayouts.$inferSelect;
