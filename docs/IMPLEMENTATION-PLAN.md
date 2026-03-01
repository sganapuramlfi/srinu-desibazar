# DesiBazar — Full Implementation Plan
**Created:** 2026-02-26
**Status:** Phase 0 + Phase 1 + Phase 3 (partial) COMPLETE

---

## IMPLEMENTATION STATUS

### PHASE 0 — Fix What Is Broken ✅ COMPLETE

| Task | Status | Files Changed |
|------|--------|---------------|
| FIX-01: Enable Advertising API | ✅ Done | `client/src/components/advertising/SidebarAd.tsx`, `server/routes.ts` |
| FIX-02: Fix Session Persistence | ✅ Done | `server/auth.ts` |
| FIX-03: Fix Module Loader Path | ✅ Done | `server/ModuleLoader.ts` |
| FIX-04: Activate Subscription Enforcement | ✅ Done | `server/middleware/subscriptionEnforcement.ts`, `server/routes/salon.ts`, `server/routes/restaurant.ts` |
| FIX-05: Activate Trial Management | ✅ Done | `server/index.ts`, `server/jobs/trialManagement.ts` |
| FIX-06: Implement Email Delivery | ✅ Done | `server/services/emailService.ts`, `server/jobs/trialManagement.ts` |

### PHASE 1 — Complete Half-Done Features ✅ COMPLETE

| Task | Status | Files Changed |
|------|--------|---------------|
| TASK-13: Salon Module Verification | ✅ Done | No changes needed — code was correct |
| TASK-04: Subscription Usage API | ✅ Done | `server/routes/billing.ts`, `client/src/pages/BillingPortal.tsx` |
| TASK-02: Restaurant → Universal Booking | ✅ Done | `server/routes/restaurant.ts` |
| TASK-05: Landing Page Discovery | ✅ Done | `server/routes.ts` |

### PHASE 2 — Build Core Platform Features 🔲 PENDING

| Task | Status | Notes |
|------|--------|-------|
| TASK-08: Enable AI Abrakadabra | 🔲 Pending | Set provider to ollama in modules.json |
| TASK-03: AI Surrogate Security | 🔲 Pending | Wire aiPermissions enforcement |
| TASK-06: Location Intelligence | 🔲 Pending | Haversine formula for geo queries |

### PHASE 3 — Business Intelligence ⚠️ PARTIAL

| Task | Status | Notes |
|------|--------|-------|
| TASK-09: Analytics Dashboard | ✅ Done | Job + API endpoint; UI integration pending |
| TASK-10: Smart Advertising System | 🔲 Pending | Budget enforcement needed |
| TASK-11: Module Management Console | 🔲 Pending | Subscription→module linking |
| TASK-12: Customer Journey Optimization | 🔲 Pending | Recommendations + reminders |

### PHASE 4 — Security & Performance 🔲 PENDING

| Task | Status | Notes |
|------|--------|-------|
| TASK-16: Security Hardening | ⚠️ Partial | Rate limiting done; CSRF/XSS pending |
| TASK-17: Performance Optimization | 🔲 Pending | DB indexes, caching |
| TASK-18: API Standardisation | 🔲 Pending | Response format standardisation |

### PHASE 5 — Module Expansion 🔲 PENDING

| Task | Status | Notes |
|------|--------|-------|
| TASK-14: Restaurant Feature Parity | 🔲 Pending | Promotions, waitlist, order workflow |
| TASK-15: Module Placeholders | 🔲 Pending | RealEstate, Retail, Professional tabs |

### PHASE 6 — Platform Scaling 🔲 PENDING

| Task | Status | Notes |
|------|--------|-------|
| TASK-19: Multi-Tenant Completion | 🔲 Pending | API key enforcement, data export |
| TASK-20: Platform API & SDK | 🔲 Pending | Public API, OpenAPI spec |

---

## DETAILED CHANGES MADE

### FIX-01: Enable Advertising API
**Problem:** `SidebarAd.tsx` had `enabled: false` preventing any ad fetching. The server route used a non-existent `adCampaigns` table.

**Changes:**
- `client/src/components/advertising/SidebarAd.tsx:56-60`: Changed `enabled: false` → `enabled: true`, added explicit `queryFn` to pass `adType` as URL param
- `server/routes.ts:608-760`: Replaced all `adCampaigns` references with `advertisements` table; mapped column names (`advertiserId`→businessId, `description`→content, `ctaUrl`→clickUrl); added defaults for missing columns (animationType, size, priority); fixed ad tracking to update impressions/clicks in DB; fixed admin campaigns endpoint

**Result:** Real ads from DB render in sidebar; click/impression tracking works.

---

### FIX-02: Fix Session Persistence
**Problem:** `createMemoryStore` loses all sessions on server restart.

**Changes:**
- `server/auth.ts`: Replaced `memorystore` import with `connect-pg-simple` and `Pool`; replaced `MemoryStore` with `PgSession` backed by PostgreSQL; extended session duration from 24h to 7 days; table auto-creates via `createTableIfMissing: true`
- Installed: `connect-pg-simple @types/connect-pg-simple`

**Result:** Sessions survive server restarts.

---

### FIX-03: Fix Module Loader Path
**Problem:** `updateModuleConfig` in `ModuleLoader.ts` used wrong path for `modules.json`.

**Changes:**
- `server/ModuleLoader.ts:152`: Changed `path.join(__dirname, 'modules/config/modules.json')` → `path.join(__dirname, '../modules/config/modules.json')`

---

### FIX-04: Activate Subscription Enforcement Middleware
**Problem:** `checkStaffLimitMiddleware` and `checkBookingLimitMiddleware` were written but not wired to routes. Also had wrong `businessId` resolution using `req.user?.businessId` (doesn't exist in new schema).

**Changes:**
- `server/middleware/subscriptionEnforcement.ts`: Fixed all businessId resolution to use `req.businessContext?.businessId || req.params.businessId || req.user?.primaryBusiness?.businessId`; changed HTTP status from 403 to 402 (Payment Required); added graceful fallback when subscription not found
- `server/routes/salon.ts`: Added import + `checkStaffLimitMiddleware` to `POST /businesses/:businessId/staff`
- `server/routes/restaurant.ts`: Added import + `checkStaffLimitMiddleware` to `POST /restaurants/:businessId/staff`

**Result:** Adding staff beyond plan limit returns 402.

---

### FIX-05: Activate Trial Management Cron Job
**Problem:** Trial management job existed but wasn't scheduled to run automatically.

**Changes:**
- `server/index.ts`: Added `node-cron` import + daily 2am cron job calling `checkTrialExpirations()`
- Installed: `node-cron @types/node-cron`

---

### FIX-06: Implement Email Delivery
**Problem:** `emailService.ts` existed but lacked trial/booking-specific email methods. Trial management used TODO stubs.

**Changes:**
- `server/services/emailService.ts`: Added `sendTrialExpiryWarning()`, `sendTrialExpired()`, `sendBookingConfirmation()`, `sendReviewRequest()` methods with HTML templates
- `server/jobs/trialManagement.ts`: Added `emailService` import; replaced TODO stubs with real email calls; added `getBillingEmail()` helper that falls back to owner's platform email

---

### TASK-04: Subscription Usage API
**Problem:** `BillingPortal.tsx` showed hardcoded mock usage data.

**Changes:**
- `server/routes/billing.ts`: Added `GET /api/billing/usage` endpoint that calls `getUsageStatistics()` from subscriptionEnforcement middleware
- `client/src/pages/BillingPortal.tsx:65-76`: Replaced mock data with real `/api/billing/usage` API call

---

### TASK-02: Restaurant → Universal Booking
**Problem:** Restaurant table creation didn't create `bookableItems` entries; reservation could fail if no tables exist.

**Changes:**
- `server/routes/restaurant.ts` (table creation route): Added automatic `bookableItems` insert after table creation
- `server/routes/restaurant.ts` (reservation creation): Added fallback generic `bookableItems` entry creation if no table-specific item exists

---

### TASK-05: Landing Page Business Discovery
**Problem:** `/api/businesses` ignored `industry` and `limit` query params; no `/api/businesses/featured` endpoint; search loaded all data into JS.

**Changes:**
- `server/routes.ts`: Enhanced `GET /api/businesses` to support `industry`, `limit`, `page` params with SQL filtering; added `GET /api/businesses/featured` (top 6 active); improved `GET /api/businesses/search` to use SQL `ilike` filtering with pagination

---

### TASK-09: Analytics (Wiring)
**Problem:** `aggregateDailyAnalytics()` existed but wasn't scheduled.

**Changes:**
- `server/index.ts`: Added daily midnight cron for `aggregateDailyAnalytics()`
- `server/routes.ts`: Added `GET /api/admin/analytics` endpoint

---

## NEXT PRIORITY TASKS

### 1. TASK-08: Enable AI Abrakadabra
**File:** `modules/config/modules.json`
Change `"provider": "mock"` → `"provider": "ollama"`
Set env vars: `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://localhost:11435`

### 2. TASK-10: Smart Advertising (Budget Enforcement)
**Files:** `server/routes.ts` (advertising routes), `server/routes/billing.ts`
- Track spend against `budgetTotal` and `budgetDaily`
- Pause campaign when budget exhausted
- Add `POST /api/advertising/campaigns` for business owners

### 3. TASK-14: Restaurant Feature Parity
**Files:** `server/routes/restaurant.ts`, restaurant UI components
- Activate `restaurantPromotions` table — show on public business page
- Order status workflow: pending → preparing → ready → delivered
- Waitlist when tables full

### 4. TASK-06: Location Intelligence
**Files:** `server/routes.ts` (businesses/search endpoint)
- Add Haversine formula SQL for distance calculation
- `GET /api/businesses/search?lat=&lng=&radius=10`
- Frontend: browser geolocation + "Near you" section

### 5. TASK-15: Module Placeholders
**Files:** `client/src/pages/BusinessDashboard.tsx`
- Add placeholder tabs for realestate, retail, professional industries
- Each shows "Coming Soon" but has structural presence

---

## ENVIRONMENT VARIABLES NEEDED

```env
# Session
SESSION_SECRET=<random-32-char-string>
DATABASE_URL=postgresql://postgres:postgres@localhost:9100/desibazaar

# Stripe (for billing)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...

# Email
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
FROM_EMAIL=noreply@desibazaar.com
FROM_NAME=DesiBazaar Platform

# AI
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11435

# App URL (for email links)
APP_URL=http://localhost:5173
```

---

## VERIFICATION CHECKLIST

### Phase 0 ✅
- [x] SidebarAd shows real ads from DB (not mock) when ads exist in `advertisements` table
- [x] Server restart doesn't log out users (PostgreSQL session store)
- [x] Module loader path fixed (no startup errors for modules config)
- [x] Creating staff beyond plan limit returns HTTP 402
- [x] Trial expiry job logs and sends emails when run
- [x] Email service has booking confirmation, trial expiry templates

### Phase 1 ✅
- [x] `/api/billing/usage` returns real staff/booking counts
- [x] BillingPortal shows real usage (not mock)
- [x] Restaurant reservation creates record in universal `bookings` table
- [x] Business directory searches by industry with SQL (no in-memory filtering)
- [x] `/api/businesses/featured` endpoint available

### Phase 3 (Partial) ✅
- [x] Analytics aggregation runs daily at midnight
- [x] `/api/admin/analytics` endpoint available
