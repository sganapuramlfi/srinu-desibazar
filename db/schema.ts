import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, uuid, date, time, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// =============================================================================
// CORE PLATFORM FOUNDATION
// =============================================================================

// Platform users (people who can login)
export const platformUsers = pgTable("platform_users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isEmailVerified: boolean("is_email_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  
  // User preferences and settings
  preferences: jsonb("preferences").default({}), // {favoriteCategories: [], preferredLocations: [], bookingReminders: true}
  notificationSettings: jsonb("notification_settings").default({}), // {bookingConfirmations: true, smsNotifications: true}
  
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business tenants (isolated business contexts)
export const businessTenants = pgTable("business_tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  industryType: text("industry_type", {
    enum: ["salon", "restaurant", "event", "realestate", "retail", "professional"]
  }).notNull(),

  // Tenant isolation
  tenantKey: uuid("tenant_key").defaultRandom().unique().notNull(),
  status: text("status", {
    enum: ["pending", "active", "suspended", "closed"]
  }).default("pending").notNull(),

  // Multi-tenancy enhancements
  tenantTier: text("tenant_tier", {
    enum: ["free", "standard", "professional", "enterprise"]
  }).default("standard"),
  dataResidency: text("data_residency", {
    enum: ["au-sydney", "us-east", "eu-west", "ap-southeast"]
  }).default("au-sydney"),
  customDomainEnabled: boolean("custom_domain_enabled").default(false),
  apiAccessEnabled: boolean("api_access_enabled").default(false),
  whiteLabelEnabled: boolean("white_label_enabled").default(false),
  maxUsers: integer("max_users").default(10),
  storageQuotaGb: integer("storage_quota_gb").default(5),
  storageUsedGb: decimal("storage_used_gb", { precision: 10, scale: 2 }).default("0"),
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),
  deletedAt: timestamp("deleted_at"),

  // Business metadata
  description: text("description"),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  gallery: jsonb("gallery").default([]),
  contactInfo: jsonb("contact_info").default({}), // {phone, email, whatsapp, address}
  socialMedia: jsonb("social_media").default({}), // {facebook, instagram, twitter, linkedin}
  operatingHours: jsonb("operating_hours").default({}), // {monday: {open: "09:00", close: "18:00"}}
  amenities: jsonb("amenities").default([]), // ["parking", "wifi", "wheelchair_access"]

  // Location
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country").default("Australia"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),

  // Storefront Publishing Control
  publishedSections: jsonb("published_sections").default([]).notNull(), // ["menu", "services", "gallery", "reviews", "bookings", "staff", "tables"]
  storefrontSettings: jsonb("storefront_settings").default({
    showReviews: true,
    showGallery: true,
    showContactInfo: true,
    showSocialMedia: true,
    showOperatingHours: true,
    theme: "default"
  }).notNull(),

  // Platform tracking
  onboardingCompleted: boolean("onboarding_completed").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business access control (who can access which business)
export const businessAccess = pgTable("business_access", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => platformUsers.id, { onDelete: 'cascade' }).notNull(),

  // Role within THIS business
  role: text("role", {
    enum: ["owner", "manager", "staff", "customer"]
  }).notNull(),

  // Granular permissions
  permissions: jsonb("permissions").default({}).notNull(),

  // Access control
  isActive: boolean("is_active").default(true),
  grantedBy: integer("granted_by").references(() => platformUsers.id),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"),

  // Session tracking for security
  lastAccessAt: timestamp("last_access_at"),
  accessCount: integer("access_count").default(0),
  lastIpAddress: text("last_ip_address"),
  sessionTokenHash: text("session_token_hash"),
});

// =============================================================================
// MULTI-TENANCY ENHANCEMENTS
// =============================================================================

// Tenant API keys for programmatic access
export const tenantApiKeys = pgTable("tenant_api_keys", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),

  // API Key Management
  keyId: text("key_id").unique().notNull(),              // Public identifier (e.g., "key_live_abc123")
  keyHash: text("key_hash").notNull(),                   // SHA-256 hash of actual key
  keyPrefix: text("key_prefix").notNull(),               // First 8 chars for identification

  // Key Metadata
  name: text("name").notNull(),                          // "Production API", "Mobile App"
  description: text("description"),

  // Scopes & Permissions
  scopes: jsonb("scopes").default([]),                   // ["read:bookings", "write:services"]
  rateLimit: integer("rate_limit").default(1000),        // Requests per hour

  // Key Lifecycle
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdBy: integer("created_by").references(() => platformUsers.id),

  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenant domains (subdomains and custom domains)
export const tenantDomains = pgTable("tenant_domains", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),

  // Domain Configuration
  domainType: text("domain_type", {
    enum: ["subdomain", "custom"]
  }).notNull(),
  domainValue: text("domain_value").unique().notNull(),  // "salon-name.desibazaar.com" or "mysalon.com"

  // SSL/DNS Status
  isVerified: boolean("is_verified").default(false),
  verificationToken: text("verification_token"),          // For domain ownership verification
  sslStatus: text("ssl_status").default("pending"),       // pending, active, failed
  dnsRecords: jsonb("dns_records"),                       // Required DNS configuration

  // Domain Lifecycle
  isPrimary: boolean("is_primary").default(false),        // Primary domain for this tenant
  isActive: boolean("is_active").default(true),
  activatedAt: timestamp("activated_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenant lifecycle events tracking
export const tenantLifecycleEvents = pgTable("tenant_lifecycle_events", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }),

  // Event Details
  eventType: text("event_type").notNull(),               // created, activated, suspended, resumed, deleted
  eventStatus: text("event_status").notNull(),           // pending, in_progress, completed, failed
  triggeredBy: integer("triggered_by").references(() => platformUsers.id),

  // Event Context
  previousState: text("previous_state"),
  newState: text("new_state"),
  reason: text("reason"),
  metadata: jsonb("metadata").default({}),

  // Execution Details
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").defaultNow(),
});

// Tenant data exports for GDPR compliance
export const tenantDataExports = pgTable("tenant_data_exports", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),

  // Export Configuration
  exportType: text("export_type", {
    enum: ["full", "gdpr", "backup"]
  }).notNull(),
  exportFormat: text("export_format").default("json"),   // json, csv, sql
  requestedBy: integer("requested_by").references(() => platformUsers.id).notNull(),

  // Export Status
  status: text("status", {
    enum: ["pending", "processing", "completed", "failed"]
  }).notNull(),
  progressPercent: integer("progress_percent").default(0),

  // Export Files
  filePath: text("file_path"),                           // S3 or local path
  fileSizeBytes: integer("file_size_bytes"),
  downloadUrl: text("download_url"),                     // Pre-signed URL
  downloadExpiresAt: timestamp("download_expires_at"),

  // Metadata
  tablesIncluded: jsonb("tables_included"),              // List of exported tables
  recordsExported: integer("records_exported"),

  // Lifecycle
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").defaultNow(),
});

// Platform analytics (cross-tenant aggregated metrics)
export const platformAnalytics = pgTable("platform_analytics", {
  id: serial("id").primaryKey(),

  // Time Dimensions
  date: date("date").notNull(),
  hour: integer("hour"),                                 // 0-23 for hourly aggregation

  // Aggregation Level
  aggregationLevel: text("aggregation_level").notNull(), // platform, industry, region, tier
  dimensionValue: text("dimension_value"),               // "salon", "au-sydney", "enterprise"

  // Business Metrics (Aggregated, Anonymized)
  totalBusinesses: integer("total_businesses").default(0),
  activeBusinesses: integer("active_businesses").default(0),
  newSignups: integer("new_signups").default(0),
  churnedBusinesses: integer("churned_businesses").default(0),

  // Booking Metrics
  totalBookings: integer("total_bookings").default(0),
  totalBookingValue: decimal("total_booking_value", { precision: 12, scale: 2 }).default("0"),
  avgBookingValue: decimal("avg_booking_value", { precision: 10, scale: 2 }),

  // User Metrics
  totalUsers: integer("total_users").default(0),
  activeUsers: integer("active_users").default(0),

  // Revenue Metrics
  mrr: decimal("mrr", { precision: 12, scale: 2 }).default("0"),  // Monthly Recurring Revenue
  arr: decimal("arr", { precision: 12, scale: 2 }).default("0"),  // Annual Recurring Revenue

  // Storage Metrics
  totalStorageGb: decimal("total_storage_gb", { precision: 10, scale: 2 }).default("0"),

  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// SUBSCRIPTION & REVENUE MODEL
// =============================================================================

// Subscription plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).notNull(),
  priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }),
  
  // Feature limits
  maxStaff: integer("max_staff"),
  maxCustomers: integer("max_customers"),
  maxBookingsPerMonth: integer("max_bookings_per_month"),
  maxProducts: integer("max_products"),
  storageGb: integer("storage_gb").default(5),
  
  // AI & Advanced features
  aiCreditsPerMonth: integer("ai_credits_per_month").default(0),
  apiAccess: boolean("api_access").default(false),
  whiteLabel: boolean("white_label").default(false),
  
  // Module access
  enabledModules: jsonb("enabled_modules").default([]).notNull(),
  enabledFeatures: jsonb("enabled_features").default([]).notNull(),
  
  // Display
  isActive: boolean("is_active").default(true),
  isPopular: boolean("is_popular").default(false),
  displayOrder: integer("display_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Business subscriptions
export const businessSubscriptions = pgTable("business_subscriptions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  
  // Billing
  status: text("status", {
    enum: ["trial", "active", "past_due", "cancelled", "suspended"]
  }).default("active").notNull(),
  billingEmail: text("billing_email").notNull(),
  billingCycle: text("billing_cycle", {
    enum: ["monthly", "yearly"]
  }).default("monthly").notNull(),
  
  // Usage tracking
  currentUsage: jsonb("current_usage").default({}).notNull(), // {staff: 5, customers: 150, bookings: 45}
  
  // Subscription lifecycle
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start").defaultNow(),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment transactions (Stripe payment records)
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }),
  subscriptionId: integer("subscription_id").references(() => businessSubscriptions.id, { onDelete: 'set null' }),

  // Stripe references
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  stripeChargeId: text("stripe_charge_id"),
  stripeInvoiceId: text("stripe_invoice_id"),

  // Payment details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("AUD").notNull(),
  status: text("status", {
    enum: ["pending", "processing", "succeeded", "failed", "refunded", "partially_refunded"]
  }).notNull(),

  // Payment method
  paymentMethod: text("payment_method"), // card, bank_account
  paymentMethodId: integer("payment_method_id"),

  // Metadata
  description: text("description"),
  metadata: jsonb("metadata").default({}),
  failureReason: text("failure_reason"),

  // Refund tracking
  amountRefunded: decimal("amount_refunded", { precision: 10, scale: 2 }).default("0"),
  refundedAt: timestamp("refunded_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment methods (saved customer payment methods)
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),

  // Stripe reference
  stripePaymentMethodId: text("stripe_payment_method_id").unique().notNull(),

  // Payment method details
  type: text("type", {
    enum: ["card", "bank_account", "other"]
  }).notNull(),

  // Card details (if type = card)
  cardBrand: text("card_brand"), // visa, mastercard, amex
  cardLast4: text("card_last4"),
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  cardFingerprint: text("card_fingerprint"),

  // Bank account details (if type = bank_account)
  bankName: text("bank_name"),
  bankLast4: text("bank_last4"),

  // Settings
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),

  // Billing details
  billingEmail: text("billing_email"),
  billingName: text("billing_name"),
  billingAddress: jsonb("billing_address").default({}),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription invoices (Stripe invoice records)
export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => businessSubscriptions.id, { onDelete: 'cascade' }).notNull(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),

  // Stripe reference
  stripeInvoiceId: text("stripe_invoice_id").unique().notNull(),
  stripeCustomerId: text("stripe_customer_id"),

  // Invoice details
  invoiceNumber: text("invoice_number").unique().notNull(),
  invoiceDate: timestamp("invoice_date").defaultNow().notNull(),
  dueDate: timestamp("due_date"),

  // Amounts
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0").notNull(),
  amountRemaining: decimal("amount_remaining", { precision: 10, scale: 2 }).notNull(),

  // Status
  status: text("status", {
    enum: ["draft", "open", "paid", "void", "uncollectible"]
  }).notNull(),

  // Line items
  lineItems: jsonb("line_items").default([]).notNull(), // [{description, amount, quantity}]

  // Files
  invoicePdfUrl: text("invoice_pdf_url"),
  hostedInvoiceUrl: text("hosted_invoice_url"), // Stripe hosted URL

  // Payment
  paymentIntentId: text("payment_intent_id"),
  paidAt: timestamp("paid_at"),

  // Period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Metadata
  metadata: jsonb("metadata").default({}),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// ABRAKADABRA AI SYSTEM
// =============================================================================

// AI contexts and sessions
export const aiSessions = pgTable("ai_sessions", {
  id: serial("id").primaryKey(),
  sessionKey: uuid("session_key").defaultRandom().unique().notNull(),
  
  // User context
  userId: integer("user_id").references(() => platformUsers.id, { onDelete: 'cascade' }),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }),
  
  // AI role and permissions
  aiRole: text("ai_role", {
    enum: ["helper", "surrogate", "system"]
  }).notNull(),
  permissions: jsonb("permissions").default([]).notNull(),
  
  // Session management
  purpose: text("purpose").notNull(),
  maxInteractions: integer("max_interactions").default(20),
  interactionCount: integer("interaction_count").default(0),
  
  // Lifecycle
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
});

// AI interaction logs
export const aiInteractions = pgTable("ai_interactions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => aiSessions.id, { onDelete: 'cascade' }).notNull(),
  
  // Interaction details
  interactionType: text("interaction_type").notNull(),
  userInput: text("user_input"),
  aiResponse: text("ai_response"),
  contextData: jsonb("context_data").default({}),
  
  // Performance tracking
  processingTimeMs: integer("processing_time_ms"),
  tokensUsed: integer("tokens_used"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// UNIVERSAL BOOKING/APPOINTMENT SYSTEM
// =============================================================================

// Universal bookable items (polymorphic)
export const bookableItems = pgTable("bookable_items", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Polymorphic reference
  itemType: text("item_type", {
    enum: ["salon_service", "restaurant_table", "event_space", "consultation", "property_viewing"]
  }).notNull(),
  itemId: integer("item_id").notNull(),
  
  // Common booking attributes
  name: text("name").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes"),
  price: decimal("price", { precision: 10, scale: 2 }),
  
  // Availability rules
  advanceBookingDays: integer("advance_booking_days").default(30),
  minBookingDuration: integer("min_booking_duration"),
  maxBookingDuration: integer("max_booking_duration"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Universal bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  bookableItemId: integer("bookable_item_id").references(() => bookableItems.id, { onDelete: 'cascade' }).notNull(),
  
  // Customer info
  customerId: integer("customer_id").references(() => platformUsers.id, { onDelete: 'set null' }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  
  // Booking details
  bookingDate: date("booking_date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  partySize: integer("party_size").default(1),
  
  // Status and notes
  status: text("status", {
    enum: ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"]
  }).default("pending").notNull(),
  specialRequests: text("special_requests"),
  internalNotes: text("internal_notes"),
  
  // Financial
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).default("0"),
  paymentStatus: text("payment_status", {
    enum: ["pending", "partial", "paid", "refunded"]
  }).default("pending").notNull(),
  
  // Metadata
  confirmationCode: text("confirmation_code").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// CROSS-BUSINESS FEATURES
// =============================================================================

// Business directory (public discovery)
export const businessDirectory = pgTable("business_directory", {
  businessId: integer("business_id").primaryKey().references(() => businessTenants.id, { onDelete: 'cascade' }),
  
  // SEO & Discovery
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  keywords: jsonb("keywords").default([]),
  
  // Ratings & Reviews
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: integer("total_reviews").default(0),
  totalBookings: integer("total_bookings").default(0),
  
  // Business highlights
  highlights: jsonb("highlights").default([]), // ["Family Friendly", "24/7 Service", "Award Winner"]
  certifications: jsonb("certifications").default([]),
  
  // Visibility
  isFeatured: boolean("is_featured").default(false),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform advertisements
export const advertisements = pgTable("advertisements", {
  id: serial("id").primaryKey(),
  advertiserId: integer("advertiser_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Ad content
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  ctaText: text("cta_text").default("Learn More"),
  ctaUrl: text("cta_url"),
  
  // Targeting
  adType: text("ad_type", {
    enum: ["banner", "sidebar", "sponsored", "email"]
  }).notNull(),
  targetIndustries: jsonb("target_industries").default([]),
  targetLocations: jsonb("target_locations").default([]),
  targetKeywords: jsonb("target_keywords").default([]),
  
  // Budget & Performance
  budgetTotal: decimal("budget_total", { precision: 10, scale: 2 }),
  budgetDaily: decimal("budget_daily", { precision: 10, scale: 2 }),
  costPerClick: decimal("cost_per_click", { precision: 10, scale: 2 }).default("0.50"),
  spentAmount: decimal("spent_amount", { precision: 10, scale: 2 }).default("0.00"),
  
  // Metrics
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  
  // Lifecycle
  status: text("status", {
    enum: ["draft", "pending", "active", "paused", "completed", "rejected"]
  }).default("draft").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer profiles (platform-wide)
export const customerProfiles = pgTable("customer_profiles", {
  userId: integer("user_id").primaryKey().references(() => platformUsers.id, { onDelete: 'cascade' }),
  
  // Preferences
  preferredIndustries: jsonb("preferred_industries").default([]),
  preferredLocations: jsonb("preferred_locations").default([]),
  preferredPriceRange: jsonb("preferred_price_range").default({}), // {min: 0, max: 100}
  
  // Behavioral data
  searchHistory: jsonb("search_history").default([]),
  bookingHistorySummary: jsonb("booking_history_summary").default({}),
  favoriteBusinesses: jsonb("favorite_businesses").default([]),
  
  // Communication preferences
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  marketingConsent: boolean("marketing_consent").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business settings (industry-specific configuration)
export const businessSettings = pgTable("business_settings", {
  businessId: integer("business_id").primaryKey().references(() => businessTenants.id, { onDelete: 'cascade' }),
  
  // Industry-specific configuration
  salonSettings: jsonb("salon_settings").default({}),
  restaurantSettings: jsonb("restaurant_settings").default({}),
  eventSettings: jsonb("event_settings").default({}),
  realestateSettings: jsonb("realestate_settings").default({}),
  retailSettings: jsonb("retail_settings").default({}),
  professionalSettings: jsonb("professional_settings").default({}),
  
  // Common settings
  bookingSettings: jsonb("booking_settings").default({}),
  paymentSettings: jsonb("payment_settings").default({}),
  notificationSettings: jsonb("notification_settings").default({}),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer favorites (businesses users have saved)
export const customerFavorites = pgTable("customer_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => platformUsers.id, { onDelete: 'cascade' }).notNull(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Ensure a user can only favorite a business once
  uniqueUserBusiness: uniqueIndex("unique_user_business_favorite").on(table.userId, table.businessId),
}));

// =============================================================================
// ADMIN MANAGEMENT
// =============================================================================

// Admin users (platform administrators)
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),

  // Admin role and permissions
  role: text("role", {
    enum: ["admin", "super_admin"]
  }).default("admin").notNull(),

  // Account status
  isActive: boolean("is_active").default(true),
  isSuperAdmin: boolean("is_super_admin").default(false),

  // Activity tracking
  lastLogin: timestamp("last_login"),
  loginCount: integer("login_count").default(0),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin audit logs (track all admin actions)
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => adminUsers.id, { onDelete: 'set null' }),
  adminUsername: text("admin_username"), // Preserve username even if admin deleted

  // Action details
  action: text("action").notNull(), // "login", "create_business", "delete_user", etc.
  resourceType: text("resource_type"), // "business", "user", "subscription", etc.
  resourceId: integer("resource_id"),
  details: jsonb("details").default({}),

  // Request metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Result
  success: boolean("success").default(true),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").defaultNow(),
});

// AI feature subscriptions (marketing/notification list)
export const aiSubscriptions = pgTable("ai_subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),

  // Subscription preferences
  features: text("features").default("[]"), // JSON string of interested features
  notifyOnLaunch: boolean("notify_on_launch").default(true),
  subscribed: boolean("subscribed").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// RELATIONSHIPS
// =============================================================================

// Platform user relationships
export const platformUserRelations = relations(platformUsers, ({ many }) => ({
  businessAccess: many(businessAccess),
  bookings: many(bookings),
  aiSessions: many(aiSessions),
  customerProfile: many(customerProfiles),
}));

// Business tenant relationships
export const businessTenantRelations = relations(businessTenants, ({ many, one }) => ({
  businessAccess: many(businessAccess),
  subscription: one(businessSubscriptions, {
    fields: [businessTenants.id],
    references: [businessSubscriptions.businessId],
  }),
  settings: one(businessSettings, {
    fields: [businessTenants.id],
    references: [businessSettings.businessId],
  }),
  directory: one(businessDirectory, {
    fields: [businessTenants.id],
    references: [businessDirectory.businessId],
  }),
  bookableItems: many(bookableItems),
  bookings: many(bookings),
  advertisements: many(advertisements),
}));

// Business access relationships
export const businessAccessRelations = relations(businessAccess, ({ one }) => ({
  business: one(businessTenants, {
    fields: [businessAccess.businessId],
    references: [businessTenants.id],
  }),
  user: one(platformUsers, {
    fields: [businessAccess.userId],
    references: [platformUsers.id],
  }),
  grantedByUser: one(platformUsers, {
    fields: [businessAccess.grantedBy],
    references: [platformUsers.id],
  }),
}));

// Subscription relationships
export const subscriptionPlanRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(businessSubscriptions),
}));

export const businessSubscriptionRelations = relations(businessSubscriptions, ({ one }) => ({
  business: one(businessTenants, {
    fields: [businessSubscriptions.businessId],
    references: [businessTenants.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [businessSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
}));

// Booking relationships
export const bookableItemRelations = relations(bookableItems, ({ one, many }) => ({
  business: one(businessTenants, {
    fields: [bookableItems.businessId],
    references: [businessTenants.id],
  }),
  bookings: many(bookings),
}));

export const bookingRelations = relations(bookings, ({ one }) => ({
  business: one(businessTenants, {
    fields: [bookings.businessId],
    references: [businessTenants.id],
  }),
  bookableItem: one(bookableItems, {
    fields: [bookings.bookableItemId],
    references: [bookableItems.id],
  }),
  customer: one(platformUsers, {
    fields: [bookings.customerId],
    references: [platformUsers.id],
  }),
}));

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

// Platform users
export const insertPlatformUserSchema = createInsertSchema(platformUsers);
export const selectPlatformUserSchema = createSelectSchema(platformUsers);

// Business tenants
export const insertBusinessTenantSchema = createInsertSchema(businessTenants);
export const selectBusinessTenantSchema = createSelectSchema(businessTenants);

// Business access
export const insertBusinessAccessSchema = createInsertSchema(businessAccess);
export const selectBusinessAccessSchema = createSelectSchema(businessAccess);

// Subscriptions
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);
export const selectSubscriptionPlanSchema = createSelectSchema(subscriptionPlans);
export const insertBusinessSubscriptionSchema = createInsertSchema(businessSubscriptions);
export const selectBusinessSubscriptionSchema = createSelectSchema(businessSubscriptions);

// Payment transactions
export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions);
export const selectPaymentTransactionSchema = createSelectSchema(paymentTransactions);

// Payment methods
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods);
export const selectPaymentMethodSchema = createSelectSchema(paymentMethods);

// Subscription invoices
export const insertSubscriptionInvoiceSchema = createInsertSchema(subscriptionInvoices);
export const selectSubscriptionInvoiceSchema = createSelectSchema(subscriptionInvoices);

// Bookings
export const insertBookableItemSchema = createInsertSchema(bookableItems);
export const selectBookableItemSchema = createSelectSchema(bookableItems);
export const insertBookingSchema = createInsertSchema(bookings);
export const selectBookingSchema = createSelectSchema(bookings);

// Advertisements
export const insertAdvertisementSchema = createInsertSchema(advertisements);
export const selectAdvertisementSchema = createSelectSchema(advertisements);

// Zod schemas for customerFavorites
export const insertCustomerFavoriteSchema = createInsertSchema(customerFavorites);
export const selectCustomerFavoriteSchema = createSelectSchema(customerFavorites);

// Zod schemas for admin tables
export const insertAdminUserSchema = createInsertSchema(adminUsers);
export const selectAdminUserSchema = createSelectSchema(adminUsers);
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs);
export const selectAdminAuditLogSchema = createSelectSchema(adminAuditLogs);

// Zod schemas for AI subscriptions
export const insertAiSubscriptionSchema = createInsertSchema(aiSubscriptions);
export const selectAiSubscriptionSchema = createSelectSchema(aiSubscriptions);

// Zod schemas for multi-tenancy tables
export const insertTenantApiKeySchema = createInsertSchema(tenantApiKeys);
export const selectTenantApiKeySchema = createSelectSchema(tenantApiKeys);
export const insertTenantDomainSchema = createInsertSchema(tenantDomains);
export const selectTenantDomainSchema = createSelectSchema(tenantDomains);
export const insertTenantLifecycleEventSchema = createInsertSchema(tenantLifecycleEvents);
export const selectTenantLifecycleEventSchema = createSelectSchema(tenantLifecycleEvents);
export const insertTenantDataExportSchema = createInsertSchema(tenantDataExports);
export const selectTenantDataExportSchema = createSelectSchema(tenantDataExports);
export const insertPlatformAnalyticsSchema = createInsertSchema(platformAnalytics);
export const selectPlatformAnalyticsSchema = createSelectSchema(platformAnalytics);

// Export types
export type PlatformUser = typeof platformUsers.$inferSelect;
export type BusinessTenant = typeof businessTenants.$inferSelect;
export type BusinessAccess = typeof businessAccess.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type BusinessSubscription = typeof businessSubscriptions.$inferSelect;
export type BookableItem = typeof bookableItems.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Advertisement = typeof advertisements.$inferSelect;
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type CustomerFavorite = typeof customerFavorites.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type AiSubscription = typeof aiSubscriptions.$inferSelect;
export type TenantApiKey = typeof tenantApiKeys.$inferSelect;
export type TenantDomain = typeof tenantDomains.$inferSelect;
export type TenantLifecycleEvent = typeof tenantLifecycleEvents.$inferSelect;
export type TenantDataExport = typeof tenantDataExports.$inferSelect;
export type PlatformAnalytics = typeof platformAnalytics.$inferSelect;