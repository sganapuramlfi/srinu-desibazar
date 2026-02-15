# 🎯 DESIBAZAR - IMPLEMENTATION ACTION PLAN
## Roadmap to Production-Ready Platform

**Document Created:** 2026-02-15
**Status:** Active Development Plan
**Target Launch Date:** Q2 2026 (16 weeks from now)
**Based On:** Comprehensive Implementation Analysis (DESIBAZAR-COMPLETE-OVERVIEW.md)

---

## 📋 EXECUTIVE SUMMARY

**Current Platform Status:** 68% Complete (Alpha Stage)
**Critical Blockers:** 5 major issues preventing production launch
**Total Estimated Effort:** 282 hours (~10-12 weeks with 1 senior developer)
**Estimated Budget:** $75,000 - $95,000

### Critical Success Factors:
1. ✅ Fix revenue model enforcement (enables monetization)
2. ✅ Complete schema migration (eliminates bugs)
3. ✅ Integrate payment processing (Stripe)
4. ✅ Implement real-time features (modern UX)
5. ✅ Security hardening (production-ready)

---

## 🚨 PHASE 1: EMERGENCY FIXES (Week 1-2)
**Duration:** 2 weeks
**Effort:** 50 hours
**Budget:** $7,500
**Goal:** Fix breaking issues, stabilize platform

### 1.1 - Fix Missing Services Table (CRITICAL)
```
Priority: P0 (Blocker)
Effort: 4 hours
Assigned To: Backend Developer

Current Issue:
- Routes reference non-existent "services" table
- Endpoints return 500 errors
- Lines: server/routes.ts (207-261)

Routes Affected:
❌ POST /api/businesses/:businessId/services
❌ GET /api/businesses/:businessId/services
❌ PUT /api/businesses/:businessId/services/:id
❌ DELETE /api/businesses/:businessId/services/:id

Solution Options:
A) Remove legacy routes (use salonServices/restaurantMenuItems) ✅ RECOMMENDED
B) Create universal services table
C) Update to use bookableItems polymorphic

Action Items:
□ Comment out legacy service routes
□ Add deprecation notice in API docs
□ Update frontend to use industry-specific endpoints
□ Test salon and restaurant service management
□ Deploy fix to staging

Success Criteria:
✓ No 500 errors on service endpoints
✓ Salon service management works
✓ Restaurant menu management works

Files to Modify:
- server/routes.ts (remove lines 207-261)
- API documentation
```

### 1.2 - Connect Restaurant Staff Endpoints (CRITICAL)
```
Priority: P0 (Core Feature)
Effort: 3 hours
Assigned To: Backend Developer

Current Issue:
- restaurantStaff table EXISTS but routes NOT connected
- Frontend component exists but non-functional
- Lines: server/routes/restaurant.ts (632-643)

Affected Endpoints:
❌ GET /api/restaurant/:businessId/staff
❌ POST /api/restaurant/:businessId/staff
❌ PUT /api/restaurant/:businessId/staff/:id
❌ DELETE /api/restaurant/:businessId/staff/:id

Action Items:
□ Implement GET /staff endpoint (query restaurantStaff table)
□ Implement POST /staff endpoint (create staff member)
□ Implement PUT /staff/:id endpoint (update staff)
□ Implement DELETE /staff/:id endpoint (remove staff)
□ Add authorization checks (businessAccess)
□ Test CRUD operations
□ Update RestaurantStaffTab.tsx if needed

Success Criteria:
✓ Restaurant owners can add staff
✓ Staff list displays correctly
✓ Staff update/delete works
✓ Authorization enforced

Files to Modify:
- server/routes/restaurant.ts (implement TODOs at lines 632-643)
- Test in frontend: client/src/components/RestaurantStaffTab.tsx
```

### 1.3 - Fix Business Authorization (HIGH)
```
Priority: P1 (Security)
Effort: 3 hours
Assigned To: Backend Developer

Current Issue:
- Legacy userId references instead of businessAccess
- Inconsistent authorization model
- Lines: server/routes.ts (940, 974)
- File: server/middleware/businessAuth.ts

Action Items:
□ Audit all routes using direct userId checks
□ Update to use businessAccess table
□ Fix businessAuth.ts middleware imports
□ Update authorization logic to new schema
□ Add role-based checks where missing
□ Test with different user roles (owner/manager/staff)

Success Criteria:
✓ All authorization uses businessAccess table
✓ No direct userId foreign key references
✓ Role-based permissions work correctly

Files to Modify:
- server/middleware/businessAuth.ts
- server/routes.ts (lines 940, 974)
- Any other files with userId-based business access
```

### 1.4 - Add Rate Limiting (HIGH)
```
Priority: P1 (Security)
Effort: 4 hours
Assigned To: Backend Developer

Current Issue:
- No protection against brute force attacks
- Unlimited login attempts
- No API throttling

Action Items:
□ Install express-rate-limit package
□ Configure login endpoint rate limit (5 attempts / 15 min)
□ Configure API endpoints rate limit (100 req / 15 min)
□ Configure strict admin rate limit (3 attempts / hour)
□ Add rate limit headers to responses
□ Test rate limiting behavior
□ Document rate limits in API docs

Implementation:
```typescript
import rateLimit from 'express-rate-limit';

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
});

// Admin rate limiter
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many admin login attempts',
});

// Apply to routes
app.post('/api/simple/login', loginLimiter, ...);
app.use('/api', apiLimiter);
app.post('/api/admin/login', adminLimiter, ...);
```

Success Criteria:
✓ Login attempts limited
✓ API requests throttled
✓ Brute force attacks prevented

Files to Modify:
- server/index.ts (add rate limiting middleware)
- package.json (add express-rate-limit)
```

### 1.5 - Security Headers (MEDIUM)
```
Priority: P1 (Security)
Effort: 2 hours
Assigned To: Backend Developer

Current Issue:
- No security headers configured
- Vulnerable to XSS, clickjacking
- Missing CSP (Content Security Policy)

Action Items:
□ Install helmet package
□ Configure security headers
□ Setup Content Security Policy
□ Enable HSTS for production
□ Test security header presence
□ Run security audit (npm audit)

Implementation:
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

Success Criteria:
✓ Security headers present in responses
✓ CSP configured correctly
✓ No npm audit vulnerabilities

Files to Modify:
- server/index.ts
- package.json
```

### 1.6 - Update Schema-Dependent Routes (HIGH)
```
Priority: P1 (Stability)
Effort: 8 hours
Assigned To: Backend Developer

Current Issue:
- Commented out routes: aiSubscriptionRoutes, setupSampleData
- Lines: server/routes.ts (31, 44, 114, 168)
- Routes incompatible with new schema

Action Items:
□ Audit ai-subscription.ts for schema compatibility
□ Update to use businessTenants instead of businesses
□ Update sample data generation script
□ Test sample data creation
□ Uncomment and re-enable routes
□ Update any references to old schema

Success Criteria:
✓ AI subscription routes functional
✓ Sample data generation works
✓ All schema references consistent

Files to Modify:
- server/routes/ai-subscription.ts
- server/routes/sample-data.ts
- server/routes.ts (uncomment lines 31, 168)
```

### 1.7 - Fix Admin Authentication (HIGH)
```
Priority: P1 (Security)
Effort: 6 hours
Assigned To: Backend Developer

Current Issue:
- Hardcoded fallback admin credentials
- Single admin user only
- No admin audit logging
- Lines: server/middleware/adminAuth.ts (5-8)

Action Items:
□ Create adminUsers table
□ Implement proper admin authentication
□ Remove hardcoded credentials
□ Add admin audit logging
□ Support multiple admin accounts
□ Add 2FA for admin (optional but recommended)

Database Schema:
```sql
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin', -- admin, super_admin
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE TABLE admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admin_users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id INTEGER,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Success Criteria:
✓ No hardcoded admin credentials
✓ Multiple admin users supported
✓ Admin actions logged

Files to Modify:
- db/schema.ts (add adminUsers, adminAuditLogs)
- server/middleware/adminAuth.ts
- server/routes/simplified-auth.ts (admin login)
```

### 1.8 - Create Missing Customer Favorites Table (MEDIUM)
```
Priority: P2 (Feature)
Effort: 4 hours
Assigned To: Backend Developer

Current Issue:
- Favorites functionality stubbed but not implemented
- Lines: server/routes/consumer.ts (149, 161)

Action Items:
□ Create customerFavorites table
□ Implement GET /consumer/favorites endpoint
□ Implement POST /consumer/favorites/:businessId endpoint
□ Implement DELETE /consumer/favorites/:businessId endpoint
□ Add favorites to BusinessDirectory display
□ Test favorites functionality

Database Schema:
```sql
CREATE TABLE customer_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES platform_users(id) ON DELETE CASCADE,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);
```

Success Criteria:
✓ Users can favorite businesses
✓ Favorites display on consumer dashboard
✓ Unfavorite functionality works

Files to Modify:
- db/schema.ts
- server/routes/consumer.ts (implement TODOs)
- client/src/pages/ConsumerDashboard.tsx
```

### 1.9 - Create Restaurant Promotions Table (MEDIUM)
```
Priority: P2 (Feature)
Effort: 6 hours
Assigned To: Backend + Frontend Developer

Current Issue:
- Promotions table doesn't exist
- Frontend component exists but non-functional
- Lines: server/routes/restaurant.ts (656-667)

Action Items:
□ Create restaurantPromotions table
□ Implement GET /promotions endpoint
□ Implement POST /promotions endpoint
□ Implement PUT /promotions/:id endpoint
□ Implement DELETE /promotions/:id endpoint
□ Connect RestaurantPromotionsTab.tsx
□ Test promotion CRUD operations

Database Schema:
```sql
CREATE TABLE restaurant_promotions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT, -- percentage, fixed_amount, buy_one_get_one
  discount_value DECIMAL(10, 2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  applicable_days JSONB DEFAULT '[]', -- ["monday", "friday"]
  applicable_times JSONB, -- {start: "17:00", end: "20:00"}
  min_order_amount DECIMAL(10, 2),
  max_discount_amount DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Success Criteria:
✓ Restaurant owners can create promotions
✓ Promotions display on public storefront
✓ Discount calculation works

Files to Modify:
- db/restaurant-schema.ts
- server/routes/restaurant.ts
- client/src/components/RestaurantPromotionsTab.tsx
```

### 1.10 - Testing & QA (CRITICAL)
```
Priority: P0 (Quality)
Effort: 10 hours
Assigned To: QA / Full Team

Action Items:
□ Test all fixed endpoints
□ Regression testing (ensure nothing broke)
□ Security testing (rate limits, auth)
□ Performance testing (query optimization)
□ User acceptance testing (critical flows)
□ Document all test results
□ Fix any discovered bugs

Test Scenarios:
- User registration and login
- Business creation and onboarding
- Service/menu management
- Booking creation
- Staff management
- Authorization checks
- Rate limit triggers

Success Criteria:
✓ All critical flows working
✓ No regression bugs
✓ Security measures functioning
✓ Performance acceptable (<500ms API responses)

Deliverable:
- Test results document
- Bug list (if any)
```

---

## 💰 PHASE 2: REVENUE MODEL ENABLEMENT (Week 3-5)
**Duration:** 3 weeks
**Effort:** 80 hours
**Budget:** $12,000
**Goal:** Enable platform monetization

### 2.1 - Stripe Integration (CRITICAL)
```
Priority: P0 (Revenue)
Effort: 20 hours
Assigned To: Senior Backend Developer

Prerequisites:
- Stripe account created
- API keys obtained (test + production)
- Webhook endpoint configured

Action Items:
□ Install Stripe SDK (npm install stripe)
□ Create Stripe service wrapper
□ Implement payment method collection
□ Implement subscription creation
□ Implement subscription updates
□ Setup webhook handlers
□ Test payment flows (test mode)
□ Handle payment failures
□ Implement refund logic
□ Add payment security measures

Key Stripe Webhooks to Handle:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
- payment_intent.succeeded
- payment_intent.payment_failed

Database Tables Needed:
```sql
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id),
  subscription_id INTEGER REFERENCES business_subscriptions(id),
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'AUD',
  status TEXT, -- succeeded, failed, pending, refunded
  payment_method TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_methods (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id),
  stripe_payment_method_id TEXT NOT NULL,
  type TEXT, -- card, bank_account
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscription_invoices (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES business_subscriptions(id),
  stripe_invoice_id TEXT,
  invoice_number TEXT UNIQUE,
  amount_due DECIMAL(10, 2),
  amount_paid DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  status TEXT, -- draft, open, paid, void, uncollectible
  invoice_pdf TEXT, -- URL to PDF
  hosted_invoice_url TEXT, -- Stripe hosted URL
  due_date DATE,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Implementation Structure:
```typescript
// server/services/stripeService.ts
export class StripeService {
  async createCustomer(business: BusinessTenant): Promise<string>
  async createSubscription(businessId: number, planId: number): Promise<void>
  async updateSubscription(subscriptionId: string, newPlanId: number): Promise<void>
  async cancelSubscription(subscriptionId: string): Promise<void>
  async addPaymentMethod(businessId: number, paymentMethodId: string): Promise<void>
  async processWebhook(event: Stripe.Event): Promise<void>
  async createRefund(paymentIntentId: string, amount?: number): Promise<void>
}
```

API Endpoints to Create:
- POST /api/billing/setup-intent (client secret for payment method)
- POST /api/billing/payment-method (save payment method)
- GET /api/billing/payment-methods (list saved methods)
- DELETE /api/billing/payment-method/:id (remove method)
- POST /api/billing/subscribe (create subscription)
- PUT /api/billing/subscription (update/upgrade/downgrade)
- POST /api/billing/subscription/cancel (cancel subscription)
- GET /api/billing/invoices (list invoices)
- POST /api/billing/webhook (Stripe webhook handler)

Success Criteria:
✓ Businesses can add payment methods
✓ Subscriptions created successfully
✓ Payments processed correctly
✓ Webhooks handled properly
✓ Refunds work when needed

Files to Create/Modify:
- db/schema.ts (add payment tables)
- server/services/stripeService.ts (new)
- server/routes/billing.ts (new)
- server/routes.ts (register billing routes)
- .env (add Stripe keys)
```

### 2.2 - Subscription Enforcement Middleware (CRITICAL)
```
Priority: P0 (Revenue)
Effort: 15 hours
Assigned To: Backend Developer

Current Issue:
- Subscription limits defined but NEVER checked
- Businesses have unlimited access
- No feature gating

Action Items:
□ Create subscription middleware
□ Implement limit checking logic
□ Add usage tracking
□ Create quota exceeded responses
□ Add upgrade prompts
□ Test all limit scenarios

Limits to Enforce:
1. Staff limit (maxStaff)
2. Booking limit (maxBookingsPerMonth)
3. Product limit (maxProducts)
4. Storage limit (storageGb)
5. AI credits (aiCreditsPerMonth)
6. Module access (enabledModules)
7. Feature access (enabledFeatures)
8. API access (apiAccess)

Implementation:
```typescript
// server/middleware/subscriptionEnforcement.ts

export async function requireSubscriptionFeature(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const businessId = req.businessId;

    const subscription = await db.query.businessSubscriptions.findFirst({
      where: eq(businessSubscriptions.businessId, businessId),
      with: { plan: true }
    });

    if (!subscription) {
      return res.status(403).json({
        error: 'No active subscription',
        upgrade: true
      });
    }

    const plan = subscription.plan;

    if (!plan.enabledFeatures.includes(feature)) {
      return res.status(403).json({
        error: `Feature '${feature}' not available in your plan`,
        currentPlan: plan.name,
        upgrade: true,
        upgradeUrl: '/pricing'
      });
    }

    next();
  };
}

export async function checkStaffLimit(businessId: number) {
  const subscription = await getSubscription(businessId);
  const currentStaffCount = await countStaff(businessId);

  if (currentStaffCount >= subscription.plan.maxStaff) {
    throw new SubscriptionLimitError({
      limit: 'staff',
      current: currentStaffCount,
      max: subscription.plan.maxStaff,
      upgrade: true
    });
  }
}

export async function checkBookingLimit(businessId: number) {
  const subscription = await getSubscription(businessId);
  const currentMonthBookings = await countBookingsThisMonth(businessId);

  if (currentMonthBookings >= subscription.plan.maxBookingsPerMonth) {
    throw new SubscriptionLimitError({
      limit: 'bookings',
      current: currentMonthBookings,
      max: subscription.plan.maxBookingsPerMonth,
      resetDate: subscription.currentPeriodEnd
    });
  }
}

export async function deductAICredit(businessId: number) {
  const subscription = await getSubscription(businessId);

  const currentUsage = subscription.currentUsage as any;
  currentUsage.aiCredits = (currentUsage.aiCredits || 0) + 1;

  if (currentUsage.aiCredits > subscription.plan.aiCreditsPerMonth) {
    throw new SubscriptionLimitError({
      limit: 'ai_credits',
      current: currentUsage.aiCredits,
      max: subscription.plan.aiCreditsPerMonth,
      resetDate: subscription.currentPeriodEnd
    });
  }

  await db.update(businessSubscriptions)
    .set({ currentUsage })
    .where(eq(businessSubscriptions.id, subscription.id));
}
```

Where to Apply:
- Staff creation routes → checkStaffLimit()
- Booking creation routes → checkBookingLimit()
- File upload routes → checkStorageLimit()
- AI query routes → checkAICredits()
- Module routes → requireModule(moduleName)
- Premium features → requireFeature(featureName)

Success Criteria:
✓ Limits enforced on all relevant endpoints
✓ Clear error messages with upgrade prompts
✓ Usage tracking accurate
✓ Subscription changes immediately apply

Files to Create/Modify:
- server/middleware/subscriptionEnforcement.ts (new)
- server/routes/salon.ts (add limit checks)
- server/routes/restaurant.ts (add limit checks)
- server/routes/bookings.ts (add limit checks)
- server/routes/ai-*.ts (add credit deduction)
```

### 2.3 - Subscription Plans Setup (HIGH)
```
Priority: P1 (Revenue)
Effort: 8 hours
Assigned To: Product Manager + Backend Developer

Action Items:
□ Define subscription tier features
□ Set pricing for each tier
□ Create initial subscription plans in database
□ Sync with Stripe products and prices
□ Document plan differences
□ Create pricing comparison page

Recommended Pricing Structure (AUD):

FREE TIER (180-day trial):
- Price: $0/month
- maxStaff: 3
- maxBookingsPerMonth: 50
- maxProducts: 20
- storageGb: 2
- aiCreditsPerMonth: 50
- enabledModules: ["salon", "restaurant"]
- enabledFeatures: ["basic_booking", "basic_reporting"]

PREMIUM TIER:
- Price: $79/month or $790/year (save 17%)
- maxStaff: 15
- maxBookingsPerMonth: 500
- maxProducts: 100
- storageGb: 10
- aiCreditsPerMonth: 500
- enabledModules: ALL
- enabledFeatures: ["advanced_booking", "analytics", "promotions", "reviews"]

ENTERPRISE TIER:
- Price: $299/month or $2,990/year (save 17%)
- maxStaff: null (unlimited)
- maxBookingsPerMonth: null (unlimited)
- maxProducts: null (unlimited)
- storageGb: 50
- aiCreditsPerMonth: 5000
- apiAccess: true
- whiteLabel: true
- enabledModules: ALL
- enabledFeatures: ALL

Database Population:
```sql
-- Free tier
INSERT INTO subscription_plans (
  name, description, price_monthly, price_yearly,
  max_staff, max_bookings_per_month, max_products,
  storage_gb, ai_credits_per_month,
  enabled_modules, enabled_features,
  is_popular, display_order
) VALUES (
  'Free Trial',
  '180-day trial with essential features',
  0, 0, 3, 50, 20, 2, 50,
  '["salon", "restaurant"]'::jsonb,
  '["basic_booking", "basic_reporting"]'::jsonb,
  false, 0
);

-- Premium tier (similar structure)
-- Enterprise tier (similar structure)
```

Success Criteria:
✓ All tiers defined in database
✓ Stripe products/prices created
✓ Clear feature differentiation

Files to Modify:
- db/populate-platform-data.ts (add subscription plans)
- docs/PRICING.md (new, document pricing)
```

### 2.4 - Billing Portal Frontend (HIGH)
```
Priority: P1 (UX)
Effort: 12 hours
Assigned To: Frontend Developer

Current Issue:
- BusinessSubscriptionTab is display-only
- No upgrade/downgrade functionality
- No payment method management

Action Items:
□ Create BillingPortal page component
□ Implement plan comparison UI
□ Add payment method form (Stripe Elements)
□ Create subscription upgrade flow
□ Add invoice history display
□ Implement cancellation flow
□ Add usage statistics display
□ Test all user flows

Pages/Components to Create:

1. BillingPortal.tsx (main page)
   - Current plan summary
   - Usage statistics (progress bars)
   - Upgrade/downgrade CTA
   - Payment method management
   - Invoice history

2. PlanComparisonModal.tsx
   - Side-by-side plan comparison
   - Feature checklist
   - Pricing display
   - "Upgrade" buttons

3. PaymentMethodForm.tsx
   - Stripe CardElement integration
   - Save payment method
   - Default payment method selection

4. UpgradeConfirmationDialog.tsx
   - Prorated pricing calculation
   - Confirmation before upgrade
   - Success/error handling

5. CancelSubscriptionDialog.tsx
   - Cancellation reason collection
   - Confirmation before cancel
   - Feedback form

6. UsageStatistics.tsx
   - Staff: 8/15 (progress bar)
   - Bookings: 245/500 (progress bar)
   - Storage: 3.2GB/10GB (progress bar)
   - AI Credits: 120/500 (progress bar)

API Integration:
```typescript
// Example: Upgrade subscription
const upgradeSubscription = async (newPlanId: number) => {
  try {
    const response = await fetch(`/api/billing/subscription`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: newPlanId })
    });

    if (!response.ok) throw new Error('Upgrade failed');

    const result = await response.json();
    toast.success('Subscription upgraded successfully!');
    router.push('/dashboard');
  } catch (error) {
    toast.error('Failed to upgrade subscription');
  }
};
```

Success Criteria:
✓ Users can view current subscription
✓ Users can upgrade/downgrade plans
✓ Payment methods manageable
✓ Invoices downloadable
✓ Cancellation flow works

Files to Create:
- client/src/pages/BillingPortal.tsx
- client/src/components/PlanComparisonModal.tsx
- client/src/components/PaymentMethodForm.tsx
- client/src/components/UpgradeConfirmationDialog.tsx
- client/src/components/CancelSubscriptionDialog.tsx
- client/src/components/UsageStatistics.tsx

Files to Modify:
- client/src/App.tsx (add billing route)
- client/src/components/BusinessSubscriptionTab.tsx (add link to billing portal)
```

### 2.5 - Trial Management & Conversion (MEDIUM)
```
Priority: P2 (Revenue)
Effort: 8 hours
Assigned To: Backend Developer

Action Items:
□ Implement trial expiration checks
□ Create trial warning emails (7 days, 3 days, 1 day before)
□ Auto-suspend on trial expiration
□ Create conversion workflow
□ Track trial conversion metrics
□ Implement trial extension (admin feature)

Database Updates:
```sql
-- Add trial tracking fields
ALTER TABLE business_subscriptions ADD COLUMN trial_days_remaining INTEGER;
ALTER TABLE business_subscriptions ADD COLUMN trial_warning_sent BOOLEAN DEFAULT FALSE;

-- Conversion tracking
CREATE TABLE subscription_events (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES business_subscriptions(id),
  event_type TEXT, -- trial_started, trial_expired, converted, cancelled
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Automated Jobs Needed:
```typescript
// Daily cron job
async function checkTrialExpirations() {
  const expiringTrials = await db.query.businessSubscriptions.findMany({
    where: and(
      eq(businessSubscriptions.status, 'trial'),
      lte(businessSubscriptions.trialEndsAt, addDays(new Date(), 7))
    )
  });

  for (const subscription of expiringTrials) {
    const daysRemaining = differenceInDays(subscription.trialEndsAt, new Date());

    if ([7, 3, 1].includes(daysRemaining)) {
      await emailService.sendTrialExpirationWarning(subscription, daysRemaining);
    }

    if (daysRemaining === 0) {
      await suspendSubscription(subscription.id);
      await emailService.sendTrialExpired(subscription);
    }
  }
}
```

Email Templates Needed:
- trial_7_days_warning.html
- trial_3_days_warning.html
- trial_1_day_warning.html
- trial_expired.html
- trial_converted.html

Success Criteria:
✓ Trials expire automatically
✓ Warning emails sent on schedule
✓ Smooth conversion process
✓ Metrics tracked

Files to Create/Modify:
- server/jobs/trialManagement.ts (new, cron job)
- server/services/emailService.ts (add trial emails)
- db/schema.ts (add subscription_events)
```

### 2.6 - Invoice Generation (MEDIUM)
```
Priority: P2 (Professional)
Effort: 10 hours
Assigned To: Backend Developer

Action Items:
□ Create invoice PDF template
□ Implement PDF generation (puppeteer or pdfkit)
□ Store invoices in database
□ Email invoices to customers
□ Create invoice download endpoint
□ Add tax calculation (GST for Australia)

Implementation:
```typescript
import PDFDocument from 'pdfkit';

async function generateInvoicePDF(invoice: SubscriptionInvoice) {
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(`/invoices/${invoice.invoiceNumber}.pdf`);

  doc.pipe(stream);

  // Company header
  doc.fontSize(20).text('DesiBazaar', 50, 50);
  doc.fontSize(10).text('ABN: 12 345 678 901', 50, 75);

  // Invoice details
  doc.fontSize(16).text(`Invoice #${invoice.invoiceNumber}`, 50, 120);
  doc.fontSize(10).text(`Date: ${format(invoice.invoiceDate, 'dd/MM/yyyy')}`, 50, 145);

  // Line items
  doc.text(`Subscription: ${invoice.plan.name}`, 50, 180);
  doc.text(`Amount: $${invoice.amount_due}`, 50, 195);
  doc.text(`GST: $${invoice.tax}`, 50, 210);
  doc.fontSize(12).text(`Total: $${invoice.total}`, 50, 230);

  doc.end();

  await new Promise(resolve => stream.on('finish', resolve));

  return `/invoices/${invoice.invoiceNumber}.pdf`;
}
```

Success Criteria:
✓ Professional invoice PDFs generated
✓ Invoices emailed automatically
✓ Downloadable from billing portal

Files to Create/Modify:
- server/services/invoiceService.ts (new)
- server/templates/invoice.html (PDF template)
- server/routes/billing.ts (add invoice download endpoint)
```

### 2.7 - Payment Failure Handling (Dunning) (MEDIUM)
```
Priority: P2 (Revenue Protection)
Effort: 7 hours
Assigned To: Backend Developer

Action Items:
□ Handle failed payment webhooks
□ Implement retry logic (Stripe Smart Retries)
□ Send payment failure emails
□ Grace period before suspension (3 days)
□ Auto-suspend after grace period
□ Reactivation on successful payment

Dunning Email Sequence:
1. Day 0: "Payment failed, we'll retry"
2. Day 1: "Payment still failed, please update"
3. Day 3: "Final warning, update payment method"
4. Day 4: "Subscription suspended"

Implementation:
```typescript
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = await findSubscriptionByStripeId(invoice.subscription);

  // Update status to past_due
  await db.update(businessSubscriptions)
    .set({ status: 'past_due' })
    .where(eq(businessSubscriptions.id, subscription.id));

  // Send email
  await emailService.sendPaymentFailedEmail(subscription);

  // Schedule suspension if not resolved in 3 days
  await scheduleJob({
    type: 'suspend_subscription',
    subscriptionId: subscription.id,
    executeAt: addDays(new Date(), 3)
  });
}
```

Success Criteria:
✓ Failed payments handled gracefully
✓ Email sequence sent
✓ Grace period enforced
✓ Revenue recovery maximized

Files to Create/Modify:
- server/services/stripeService.ts (webhook handlers)
- server/jobs/dunningManagement.ts (new)
- server/services/emailService.ts (dunning emails)
```

---

## 🚀 PHASE 3: FEATURE COMPLETION (Week 6-8)
**Duration:** 3 weeks
**Effort:** 85 hours
**Budget:** $12,750
**Goal:** Complete remaining features, polish UX

### 3.1 - WebSocket Real-Time Integration (HIGH)
```
Priority: P1 (UX)
Effort: 15 hours
Assigned To: Full-Stack Developer

Current Issue:
- Chat messages require polling
- No real-time notifications
- TODOs at chat.ts lines 367, 404

Action Items:
□ Setup WebSocket server (ws or socket.io)
□ Implement connection authentication
□ Create event handlers (messages, bookings, etc)
□ Implement chat message broadcasting
□ Add typing indicators
□ Create notification system
□ Build frontend WebSocket client
□ Handle reconnection logic
□ Test concurrent connections

WebSocket Events to Support:
- chat:message (new chat message)
- chat:typing (typing indicator)
- chat:read (message read receipt)
- booking:created (new booking notification)
- booking:updated (booking status change)
- booking:cancelled (booking cancellation)
- notification:new (generic notification)

Server Implementation:
```typescript
// server/websocket.ts
import { WebSocketServer } from 'ws';

export function setupWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    // Authenticate connection
    const token = req.headers['sec-websocket-protocol'];
    const user = verifyToken(token);

    if (!user) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    ws.userId = user.id;

    // Join user to their rooms (business channels)
    user.businesses.forEach(business => {
      ws.join(`business:${business.id}`);
    });

    ws.on('message', (data) => {
      const event = JSON.parse(data);
      handleWebSocketEvent(ws, event);
    });
  });
}

function broadcast(channel: string, event: any) {
  wss.clients.forEach(client => {
    if (client.rooms?.includes(channel)) {
      client.send(JSON.stringify(event));
    }
  });
}
```

Frontend Implementation:
```typescript
// client/src/hooks/useWebSocket.ts
export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const ws = new WebSocket('ws://localhost:3000', token);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3 seconds
      setTimeout(() => setSocket(new WebSocket('ws://localhost:3000', token)), 3000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleIncomingEvent(data);
    };

    setSocket(ws);

    return () => ws.close();
  }, []);

  return { socket, connected };
}
```

Success Criteria:
✓ Real-time chat works
✓ Notifications appear instantly
✓ Reconnection handles network issues
✓ Scalable to 1000+ concurrent connections

Files to Create/Modify:
- server/websocket.ts (new)
- server/index.ts (initialize WebSocket server)
- server/routes/chat.ts (broadcast messages via WebSocket)
- client/src/hooks/useWebSocket.ts (new)
- client/src/contexts/WebSocketContext.tsx (new)
```

### 3.2 - AI Surrogate User Execution (HIGH)
```
Priority: P1 (Competitive Differentiator)
Effort: 20 hours
Assigned To: Senior Full-Stack Developer

Current Issue:
- AI can suggest but not execute bookings
- Registered tier defined but not functional
- Lines: ai-abrakadabra-fixed.ts (97-114)

Action Items:
□ Implement booking creation from AI intent
□ Create user confirmation flow UI
□ Add payment requirement for AI bookings
□ Implement transaction rollback on rejection
□ Add audit logging for AI actions
□ Create safety constraints (spending limits)
□ Test end-to-end AI booking flow

Intent Parsing Implementation:
```typescript
// server/services/aiIntentParser.ts
interface BookingIntent {
  action: 'book' | 'cancel' | 'modify';
  serviceType: 'salon' | 'restaurant';
  serviceId?: number;
  date: Date;
  time: string;
  partySize?: number;
  specialRequests?: string;
}

async function parseBookingIntent(userMessage: string, context: any): Promise<BookingIntent> {
  const prompt = `
    Parse this booking request into structured data:
    "${userMessage}"

    Available context:
    - Business: ${context.businessName}
    - Services: ${JSON.stringify(context.services)}

    Return JSON with: action, serviceType, serviceId, date, time, partySize, specialRequests
  `;

  const response = await llm.complete(prompt);
  return JSON.parse(response);
}
```

Execution with Confirmation:
```typescript
// server/services/aiSurrogateService.ts
async function executeSurrogateBooking(intent: BookingIntent, userId: number) {
  // 1. Validate intent is safe
  validateBookingIntent(intent);

  // 2. Check subscription allows AI bookings
  await checkAIBookingPermission(userId);

  // 3. Create pending booking (not confirmed)
  const pendingBooking = await createPendingBooking({
    ...intent,
    status: 'ai_pending_confirmation',
    createdBy: 'ai_surrogate'
  });

  // 4. Send confirmation request to user
  await sendConfirmationRequest(userId, pendingBooking);

  // 5. Wait for user response (timeout: 5 minutes)
  const confirmed = await waitForConfirmation(pendingBooking.id, 300000);

  if (confirmed) {
    // Convert to real booking
    await confirmBooking(pendingBooking.id);
    return { success: true, bookingId: pendingBooking.id };
  } else {
    // Rollback
    await cancelPendingBooking(pendingBooking.id);
    return { success: false, reason: 'user_rejected' };
  }
}
```

Frontend Confirmation UI:
```tsx
// client/src/components/AIBookingConfirmation.tsx
export function AIBookingConfirmation({ pendingBooking }) {
  const [countdown, setCountdown] = useState(300); // 5 minutes

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>🤖 AI wants to book for you</AlertDialogTitle>
          <AlertDialogDescription>
            Service: {pendingBooking.serviceName}<br/>
            Date: {format(pendingBooking.date, 'PPP')}<br/>
            Time: {pendingBooking.time}<br/>
            Price: ${pendingBooking.price}

            <Progress value={(countdown / 300) * 100} className="mt-4" />
            <p className="text-xs mt-2">Expires in {Math.floor(countdown / 60)}:{countdown % 60}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleReject}>Reject</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Confirm Booking</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Safety Constraints:
```typescript
const AI_BOOKING_LIMITS = {
  maxBookingsPerDay: 5,
  maxSpendPerBooking: 500, // AUD
  requirePaymentMethod: true,
  requireConfirmation: true,
  autoApproveUnder: 50, // Auto-approve bookings under $50 (optional)
};
```

Success Criteria:
✓ AI can parse booking intents accurately
✓ Users receive clear confirmation requests
✓ Bookings execute on confirmation
✓ Rollback works on rejection
✓ Safety limits enforced

Files to Create/Modify:
- server/services/aiIntentParser.ts (new)
- server/services/aiSurrogateService.ts (new)
- server/routes/ai-abrakadabra-fixed.ts (implement execution)
- client/src/components/AIBookingConfirmation.tsx (new)
- db/schema.ts (add aiBookingRequests table)
```

### 3.3 - Advanced Analytics Dashboard (MEDIUM)
```
Priority: P2 (Business Value)
Effort: 25 hours
Assigned To: Full-Stack Developer

Current Issue:
- Only basic stats available
- No trends or insights
- No predictive analytics

Action Items:
□ Create analytics tables (aggregated data)
□ Implement daily aggregation jobs
□ Build analytics engine (trend calculation)
□ Create dashboard components with charts
□ Add AI-powered insights
□ Implement export functionality (PDF, CSV)
□ Add comparison periods (vs last month)
□ Test performance with large datasets

Database Schema:
```sql
CREATE TABLE business_analytics (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id),
  date DATE NOT NULL,

  -- Booking metrics
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  cancelled_bookings INTEGER DEFAULT 0,
  no_show_bookings INTEGER DEFAULT 0,

  -- Revenue metrics
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  average_booking_value DECIMAL(10, 2) DEFAULT 0,

  -- Customer metrics
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,

  -- Staff metrics
  staff_utilization_rate DECIMAL(5, 2), -- percentage

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, date)
);

CREATE TABLE analytics_trends (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id),
  metric_name TEXT NOT NULL,
  trend_direction TEXT, -- up, down, stable
  change_percentage DECIMAL(5, 2),
  period TEXT, -- daily, weekly, monthly
  calculated_at TIMESTAMP DEFAULT NOW()
);
```

Analytics Calculations:
```typescript
// server/services/analyticsEngine.ts
export class AnalyticsEngine {
  async calculateDailyMetrics(businessId: number, date: Date) {
    const bookings = await getBookingsForDate(businessId, date);

    return {
      totalBookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: bookings.reduce((sum, b) => sum + b.totalPrice, 0),
      averageBookingValue: calculateAverage(bookings.map(b => b.totalPrice)),
      newCustomers: await countNewCustomers(businessId, date),
      returningCustomers: await countReturningCustomers(businessId, date),
    };
  }

  async predictNextWeekBookings(businessId: number): Promise<number> {
    // Simple moving average prediction
    const last4Weeks = await getBookingCountsForWeeks(businessId, 4);
    const average = last4Weeks.reduce((a, b) => a + b, 0) / last4Weeks.length;

    // Apply growth trend
    const trend = calculateTrend(last4Weeks);
    return Math.round(average * (1 + trend));
  }

  async generateInsights(businessId: number): Promise<string[]> {
    const insights = [];

    // Busiest day analysis
    const busiestDay = await findBusiestDay(businessId);
    insights.push(`Your busiest day is ${busiestDay}, consider adding staff.`);

    // Revenue trend
    const revenueTrend = await calculateRevenueTrend(businessId);
    if (revenueTrend > 0.1) {
      insights.push(`Revenue is up ${(revenueTrend * 100).toFixed(1)}% vs last month! 📈`);
    }

    // Popular services
    const topService = await findMostPopularService(businessId);
    insights.push(`${topService.name} is your most popular service.`);

    return insights;
  }
}
```

Dashboard Components:
```tsx
// client/src/pages/AnalyticsDashboard.tsx
export function AnalyticsDashboard() {
  const { data } = useQuery('analytics', fetchAnalytics);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Total Bookings" value={data.totalBookings} change="+12%" />
        <MetricCard title="Revenue" value={`$${data.revenue}`} change="+8%" />
        <MetricCard title="Avg Booking Value" value={`$${data.avgValue}`} change="+5%" />
        <MetricCard title="Customers" value={data.customers} change="+15%" />
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle>🤖 AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          {data.insights.map(insight => (
            <Alert key={insight}>
              <AlertDescription>{insight}</AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={data.bookingTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={data.revenueByService} />
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <Button onClick={exportToPDF}>
        <Download className="mr-2 h-4 w-4" />
        Export Report
      </Button>
    </div>
  );
}
```

Success Criteria:
✓ Real-time analytics calculated
✓ Trends displayed clearly
✓ AI insights actionable
✓ Export functionality works

Files to Create/Modify:
- db/schema.ts (add analytics tables)
- server/services/analyticsEngine.ts (new)
- server/jobs/dailyAnalytics.ts (new, cron job)
- server/routes/analytics.ts (new)
- client/src/pages/AnalyticsDashboard.tsx (new)
- client/src/components/analytics/* (new charts)
```

### 3.4 - File Upload Improvements (MEDIUM)
```
Priority: P2 (Performance)
Effort: 12 hours
Assigned To: Backend Developer

Current Issues:
- No file cleanup
- No virus scanning
- No CDN integration
- No image optimization

Action Items:
□ Implement file cleanup on update
□ Add virus scanning (ClamAV)
□ Integrate CDN (AWS S3 + CloudFront or Cloudflare R2)
□ Add image optimization (Sharp)
□ Implement storage quota enforcement
□ Add file access logging

File Cleanup:
```typescript
// server/services/fileService.ts
async function replaceFile(oldUrl: string | null, newFile: Express.Multer.File): Promise<string> {
  // Delete old file if exists
  if (oldUrl) {
    const oldPath = path.join(__dirname, '..', 'public', oldUrl);
    if (fs.existsSync(oldPath)) {
      await fs.unlink(oldPath);
    }
  }

  // Save new file
  const newUrl = await saveFile(newFile);
  return newUrl;
}
```

Image Optimization:
```typescript
import sharp from 'sharp';

async function optimizeImage(file: Express.Multer.File): Promise<string[]> {
  const baseName = path.parse(file.filename).name;
  const outputDir = path.join(__dirname, '..', 'public', 'uploads', 'optimized');

  // Generate multiple sizes
  const sizes = {
    thumbnail: { width: 200, height: 200 },
    medium: { width: 800, height: 600 },
    full: { width: 1920, height: 1080 },
  };

  const urls = [];

  for (const [sizeName, dimensions] of Object.entries(sizes)) {
    const outputPath = path.join(outputDir, `${baseName}-${sizeName}.webp`);

    await sharp(file.path)
      .resize(dimensions.width, dimensions.height, { fit: 'inside' })
      .webp({ quality: 85 })
      .toFile(outputPath);

    urls.push(`/uploads/optimized/${baseName}-${sizeName}.webp`);
  }

  return urls; // [thumbnail, medium, full]
}
```

CDN Integration (AWS S3):
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

async function uploadToS3(file: Express.Multer.File): Promise<string> {
  const s3 = new S3Client({ region: 'ap-southeast-2' });

  const key = `uploads/${Date.now()}-${file.originalname}`;

  await s3.send(new PutObjectCommand({
    Bucket: 'desibazaar-assets',
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
  }));

  return `https://cdn.desibazaar.com/${key}`;
}
```

Success Criteria:
✓ Old files deleted automatically
✓ Images optimized (WebP format)
✓ CDN serving files (faster load)
✓ Storage quotas enforced

Files to Modify:
- server/services/fileService.ts (new)
- server/routes.ts (update upload handlers)
- package.json (add sharp, @aws-sdk/client-s3)
```

### 3.5 - Email Notification System (MEDIUM)
```
Priority: P2 (Communication)
Effort: 13 hours
Assigned To: Backend Developer

Current Issue:
- No email sending infrastructure
- No email templates

Action Items:
□ Setup email service (SendGrid, AWS SES, or Resend)
□ Create email templates
□ Implement email sending service
□ Add email queue (for reliability)
□ Create unsubscribe functionality
□ Test email delivery

Email Templates Needed:
1. Welcome email (user registration)
2. Booking confirmation
3. Booking reminder (1 day before)
4. Booking completed (thank you + review request)
5. Booking cancelled
6. Password reset
7. Trial expiration warnings (7d, 3d, 1d)
8. Payment successful
9. Payment failed
10. Invoice

Email Service Setup:
```typescript
// server/services/emailService.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  async sendBookingConfirmation(booking: Booking) {
    await resend.emails.send({
      from: 'noreply@desibazaar.com',
      to: booking.customerEmail,
      subject: `Booking Confirmed - ${booking.businessName}`,
      html: renderTemplate('booking-confirmation', {
        customerName: booking.customerName,
        businessName: booking.businessName,
        date: format(booking.bookingDate, 'PPP'),
        time: booking.startTime,
        confirmationCode: booking.confirmationCode,
      }),
    });
  }

  async sendBookingReminder(booking: Booking) {
    await resend.emails.send({
      from: 'noreply@desibazaar.com',
      to: booking.customerEmail,
      subject: `Reminder: Your booking tomorrow at ${booking.businessName}`,
      html: renderTemplate('booking-reminder', booking),
    });
  }

  // ... other email methods
}
```

Email Queue (for reliability):
```typescript
// Use BullMQ or pg-boss for email queue
import Queue from 'bull';

const emailQueue = new Queue('email', process.env.REDIS_URL);

// Producer
export async function queueEmail(type: string, data: any) {
  await emailQueue.add(type, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
  });
}

// Consumer
emailQueue.process(async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case 'booking-confirmation':
      await emailService.sendBookingConfirmation(data);
      break;
    case 'booking-reminder':
      await emailService.sendBookingReminder(data);
      break;
    // ... other types
  }
});
```

Success Criteria:
✓ Emails sent reliably
✓ Professional templates
✓ Queue handles failures
✓ Unsubscribe works

Files to Create:
- server/services/emailService.ts (new)
- server/templates/emails/* (new, email templates)
- server/jobs/emailQueue.ts (new)
- .env (add email service keys)
```

---

## 🔒 PHASE 4: SECURITY & POLISH (Week 9-10)
**Duration:** 2 weeks
**Effort:** 35 hours
**Budget:** $5,250
**Goal:** Production-ready security and polish

### 4.1 - Security Audit (CRITICAL)
```
Priority: P0 (Production Blocker)
Effort: 15 hours
Assigned To: Senior Developer + Security Expert

Action Items:
□ SQL injection testing
□ XSS vulnerability scanning
□ CSRF protection verification
□ Authentication bypass attempts
□ Authorization escalation testing
□ Session hijacking tests
□ File upload security testing
□ API endpoint fuzzing
□ Dependency vulnerability scan
□ GDPR compliance review

Testing Checklist:

1. Input Validation:
   □ Test all form inputs with malicious data
   □ SQL injection attempts on search/filters
   □ Script tags in text fields
   □ File upload with malicious files

2. Authentication:
   □ Brute force login attempts
   □ Session fixation attacks
   □ JWT token manipulation (if used)
   □ Password reset token guessing

3. Authorization:
   □ Access other users' data
   □ Access other businesses' data
   □ Privilege escalation attempts
   □ Business switching vulnerabilities

4. API Security:
   □ Rate limiting working
   □ CORS configured correctly
   □ API keys not exposed
   □ Proper error messages (no info leakage)

5. Data Protection:
   □ Passwords hashed properly
   □ Sensitive data encrypted
   □ HTTPS enforced
   □ Secure cookies

Tools to Use:
- OWASP ZAP (automated scanning)
- Burp Suite (manual testing)
- npm audit (dependency check)
- Snyk (vulnerability scanning)

Deliverable:
- Security audit report with findings
- Risk assessment (Critical/High/Medium/Low)
- Remediation plan

Files to Review:
- All authentication/authorization code
- All database queries
- All file upload handlers
- All API endpoints
```

### 4.2 - Performance Optimization (HIGH)
```
Priority: P1 (UX)
Effort: 12 hours
Assigned To: Full-Stack Developer

Action Items:
□ Database indexing
□ Query optimization
□ Frontend code splitting
□ Image lazy loading
□ API response caching
□ Bundle size reduction
□ Lighthouse audit (score >90)

Database Optimizations:
```sql
-- Add missing indexes
CREATE INDEX idx_bookings_business_date ON bookings(business_id, booking_date);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_business_tenants_slug ON business_tenants(slug);
CREATE INDEX idx_platform_users_email ON platform_users(email);
CREATE INDEX idx_business_access_user ON business_access(user_id, business_id);

-- Analyze and optimize slow queries
EXPLAIN ANALYZE SELECT * FROM bookings WHERE business_id = 1 AND booking_date > NOW();
```

Frontend Optimizations:
```typescript
// Code splitting with React.lazy
const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));

// Image lazy loading
<img loading="lazy" src={imageUrl} alt="..." />

// API caching with React Query
const { data } = useQuery('bookings', fetchBookings, {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

Success Criteria:
✓ Lighthouse score > 90
✓ API responses < 500ms
✓ Page load < 3 seconds
✓ Bundle size < 500KB

Tools:
- Lighthouse (Chrome DevTools)
- React DevTools Profiler
- pg_stat_statements (Postgres)
- webpack-bundle-analyzer
```

### 4.3 - Testing & QA (HIGH)
```
Priority: P1 (Quality)
Effort: 8 hours
Assigned To: QA Engineer + Full Team

Action Items:
□ Manual testing (all critical flows)
□ Cross-browser testing (Chrome, Firefox, Safari, Edge)
□ Mobile responsive testing
□ API endpoint testing (Postman collection)
□ Load testing (simulate 100 concurrent users)
□ Bug tracking and fixes

Critical User Flows to Test:
1. User Registration & Login
2. Business Onboarding
3. Service/Menu Creation
4. Booking Creation (customer)
5. Booking Management (business)
6. Payment & Subscription
7. AI Chat & Booking
8. Review Submission

Load Testing:
```bash
# Use Apache Bench or k6
ab -n 1000 -c 100 http://localhost:3000/api/businesses

# Or k6
k6 run load-test.js
```

Bug Tracking:
- Create GitHub Issues for all bugs
- Prioritize: P0 (blocker), P1 (critical), P2 (major), P3 (minor)
- Fix P0 and P1 before launch

Deliverable:
- Test results document
- Bug list with priorities
- All P0/P1 bugs fixed
```

---

## 🎨 PHASE 5: NICE-TO-HAVE ENHANCEMENTS (Post-Launch)
**Duration:** Ongoing
**Effort:** 32+ hours
**Budget:** $4,800+
**Goal:** Continuous improvement

### 5.1 - Multi-Language Support (15 hours)
```
Target Languages: English, Hindi, Punjabi

Action Items:
□ Setup react-i18next
□ Extract all hardcoded strings
□ Professional translations
□ Language switcher UI
□ RTL support for Urdu/Arabic
□ AI multilingual support

ROI: Opens new markets (2-3x addressable market)
```

### 5.2 - Mobile Apps (40+ hours)
```
Technology: React Native or PWA

Action Items:
□ Setup React Native project
□ Implement core features
□ Push notifications
□ Offline mode
□ App store deployment (iOS + Android)

ROI: Reach mobile-first users
```

### 5.3 - Advanced AI Features (20 hours)
```
Features:
- Smart scheduling optimizer
- Dynamic pricing recommendations
- Predictive analytics
- Weather-based suggestions
- Voice booking (Twilio integration)

ROI: Competitive differentiation
```

### 5.4 - Social Integration (15 hours)
```
Features:
- Instagram story integration
- Facebook Marketplace sync
- Google My Business sync
- Referral rewards program
- Social sharing incentives

ROI: Viral growth, lower CAC
```

### 5.5 - Business Collaboration Network (12 hours)
```
Features:
- Cross-business recommendations
- Shared loyalty programs
- Revenue sharing on referrals
- Partnership management

ROI: Network effects, ecosystem growth
```

---

## 📊 PROJECT TRACKING & METRICS

### Weekly Check-Ins
```
Every Monday:
□ Review previous week progress
□ Update task statuses
□ Identify blockers
□ Adjust timeline if needed
□ Demo completed features

Metrics to Track:
- Tasks completed vs planned
- Bugs found vs fixed
- Test coverage percentage
- API response times
- User feedback scores
```

### Launch Readiness Checklist
```
Before Going Live:
□ All P0/P1 bugs fixed
□ Security audit passed
□ Performance benchmarks met
□ Payment processing tested (live mode)
□ Backup & disaster recovery plan
□ Monitoring & alerting setup
□ Customer support ready
□ Legal docs ready (Terms, Privacy)
□ Pricing & plans finalized
□ Marketing materials ready
```

### Success Metrics (Post-Launch)
```
Week 1:
- 10 businesses onboarded
- 0 critical bugs
- < 500ms average API response
- > 95% uptime

Month 1:
- 50 businesses onboarded
- 10% trial-to-paid conversion
- 500+ bookings created
- Customer satisfaction > 4.5/5

Month 3:
- 200 businesses onboarded
- $10,000 MRR
- 5,000+ bookings
- Platform profitability
```

---

## 💵 BUDGET BREAKDOWN

### Development Costs
```
Phase 1 (Emergency Fixes): $7,500
Phase 2 (Revenue Model): $12,000
Phase 3 (Feature Completion): $12,750
Phase 4 (Security & Polish): $5,250
TOTAL: $37,500 (base development)

Additional Costs:
- Senior Developer (rates: $50-75/hr)
- Project Management: $5,000
- Testing & QA: $3,000
- Design/UX: $2,500
- Contingency (20%): $9,600
TOTAL WITH OVERHEAD: $57,600

Infrastructure Costs (Monthly):
- Hosting (AWS/Heroku): $200
- Database (RDS): $150
- CDN (CloudFront): $50
- Email (Resend): $20
- Monitoring (Sentry): $29
- Total Monthly: ~$450

Third-Party Services (One-Time):
- Stripe setup: Free
- SSL certificate: Free (Let's Encrypt)
- Domain: $20/year
```

### Timeline Summary
```
Week 1-2: Emergency Fixes → Platform Stable
Week 3-5: Revenue Model → Can Generate Revenue
Week 6-8: Features → Feature-Complete
Week 9-10: Security & Testing → Production-Ready

Total: 10 weeks (2.5 months)
```

---

## 🚀 IMMEDIATE NEXT STEPS (This Week)

### Day 1-2:
1. ✅ Fix services table issue (4h)
2. ✅ Connect restaurant staff endpoints (3h)
3. ✅ Fix business authorization (3h)

### Day 3-4:
4. ✅ Add rate limiting (4h)
5. ✅ Security headers (2h)
6. ✅ Update schema-dependent routes (8h)

### Day 5:
7. ✅ Fix admin authentication (6h)
8. ✅ Create missing tables (4h)

---

## 📞 ESCALATION & SUPPORT

### Technical Blockers:
- Contact: Development Team Lead
- Response Time: 4 hours

### Business Decisions:
- Contact: Product Manager
- Response Time: 24 hours

### Budget/Timeline Issues:
- Contact: Project Manager
- Response Time: Same day

---

**Document End**

This action plan should be reviewed weekly and updated as priorities shift.
All tasks should be tracked in GitHub Issues or your project management tool.