# Multi-Tenancy Testing Checklist
## DesiBazaar Platform - Production Verification

**Created:** 2026-02-15
**Status:** Ready for Testing
**Priority:** CRITICAL - Must verify before production deployment

---

## 🧪 TESTING OVERVIEW

This checklist ensures all multi-tenancy features are working correctly and securely. All tests must pass before deploying to production.

---

## ✅ PHASE 1: DATABASE-LEVEL ISOLATION (RLS)

### Test 1.1: RLS Policy Enforcement
```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Test 1: Set tenant context and verify isolation
SET LOCAL app.current_tenant_id = '1';
SELECT * FROM bookings; -- Should only return business_id = 1

# Test 2: Without tenant context, should return empty
RESET app.current_tenant_id;
SELECT * FROM bookings; -- Should return empty set

# Test 3: Super admin can see all
SET LOCAL app.super_admin_mode = 'true';
SELECT * FROM bookings; -- Should return all bookings

# Test 4: Wrong tenant ID returns nothing
SET LOCAL app.current_tenant_id = '999';
SELECT * FROM bookings WHERE business_id = 1; -- Should return empty
```

**Expected Results:**
- ✅ Tenant context filters results automatically
- ✅ No context = no data (secure by default)
- ✅ Super admin mode bypasses filters
- ✅ Cannot access other tenant's data

### Test 1.2: Application-Level Tenant Context
```typescript
// Test asTenant() function
const bookings = await asTenant(1, async () => {
  return db.select().from(bookings);
});
console.log('All bookings have businessId = 1:',
  bookings.every(b => b.businessId === 1)
);

// Test asSuperAdmin() function
const allBusinesses = await asSuperAdmin(async () => {
  return db.select().from(businessTenants);
});
console.log('Can see all businesses:', allBusinesses.length);
```

**Expected Results:**
- ✅ asTenant() returns only tenant's data
- ✅ asSuperAdmin() returns all data
- ✅ No cross-tenant leakage

---

## ✅ PHASE 2: API KEY AUTHENTICATION

### Test 2.1: Create and Use API Key
```bash
# Create API key
curl -X POST http://localhost:3000/api/businesses/1/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API Key",
    "scopes": ["read:bookings", "write:bookings"],
    "expiresInDays": 365
  }'

# Save the returned rawKey
export API_KEY="key_live_..."

# Use API key to access bookings
curl -X GET http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $API_KEY"
```

**Expected Results:**
- ✅ API key created successfully
- ✅ Raw key shown only once
- ✅ Can authenticate with Bearer token
- ✅ Returns only tenant's bookings

### Test 2.2: Scope-Based Authorization
```bash
# Create key with limited scope
curl -X POST http://localhost:3000/api/businesses/1/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Read Only Key",
    "scopes": ["read:bookings"]
  }'

export READ_KEY="key_live_..."

# Should work (read:bookings scope)
curl -X GET http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $READ_KEY"

# Should fail (no write:bookings scope)
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $READ_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Expected Results:**
- ✅ Read endpoint works with read scope
- ✅ Write endpoint blocked without write scope
- ✅ 403 error with clear scope requirements

### Test 2.3: API Key Security
```bash
# Test expired key
curl -X POST http://localhost:3000/api/businesses/1/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Expired Key",
    "scopes": ["read:bookings"],
    "expiresInDays": -1
  }'

# Should fail with 401
curl -X GET http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $EXPIRED_KEY"

# Test revoked key
curl -X POST http://localhost:3000/api/businesses/1/api-keys/{keyId}/revoke

# Should fail with 401
curl -X GET http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $REVOKED_KEY"
```

**Expected Results:**
- ✅ Expired keys return 401
- ✅ Revoked keys return 401
- ✅ Clear error messages

---

## ✅ PHASE 3: FILE STORAGE ISOLATION

### Test 3.1: Upload Files with Tenant Isolation
```typescript
// Upload product image for tenant 1
const file1 = await uploadFile({
  tenantId: 1,
  category: 'products',
  filename: 'product.jpg',
  buffer: imageBuffer,
  mimetype: 'image/jpeg',
});
console.log('File path:', file1.path);
// Should be: /storage/tenants/1/products/...

// Try to access as tenant 2
const result = await getFile(2, 'products', file1.filename);
console.log('Should fail:', result === null);
```

**Expected Results:**
- ✅ Files stored in tenant-scoped paths
- ✅ Cannot access other tenant's files
- ✅ File paths include tenant ID

### Test 3.2: Storage Quota Enforcement
```typescript
// Get storage usage
const usage = await getTenantStorageUsage(1);
console.log('Storage used (bytes):', usage);

// Check quota
const quota = await checkStorageQuota(1, 5); // 5GB quota
console.log('Within quota:', quota.withinQuota);
console.log('Used GB:', quota.usedGb);
```

**Expected Results:**
- ✅ Storage usage tracked accurately
- ✅ Quota check works
- ✅ Can prevent uploads over quota

### Test 3.3: GDPR File Deletion
```typescript
// Delete all files for tenant
const deletedCount = await deleteAllTenantFiles(1);
console.log('Deleted files:', deletedCount);

// Verify directory removed
const files = await listFiles(1, 'products');
console.log('Files remaining:', files.length); // Should be 0
```

**Expected Results:**
- ✅ All tenant files deleted
- ✅ Directory removed
- ✅ Other tenants unaffected

---

## ✅ PHASE 4: DOMAIN RESOLUTION

### Test 4.1: Subdomain Creation
```bash
# Create subdomain
curl -X POST http://localhost:3000/api/businesses/1/domains/subdomain \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "my-salon"
  }'

# Access via subdomain
curl -X GET http://my-salon.desibazaar.com:3000/api/bookings
```

**Expected Results:**
- ✅ Subdomain created successfully
- ✅ Domain resolves to correct tenant
- ✅ Automatic verification

### Test 4.2: Custom Domain (Enterprise)
```bash
# Add custom domain
curl -X POST http://localhost:3000/api/businesses/1/domains/custom \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "mysalon.com"
  }'

# Returns DNS verification instructions
# Add TXT record to DNS
# Verify domain
curl -X POST http://localhost:3000/api/businesses/1/domains/{domainId}/verify
```

**Expected Results:**
- ✅ Custom domain added
- ✅ Verification token generated
- ✅ DNS verification instructions clear
- ✅ Verification succeeds after DNS update

---

## ✅ PHASE 5: TENANT LIFECYCLE

### Test 5.1: Tenant Provisioning
```typescript
const { businessId, tenantKey } = await provisionTenant({
  name: 'Test Business',
  industryType: 'salon',
  ownerUserId: 1,
  subscriptionPlanId: 1,
  tenantTier: 'standard',
});

console.log('Business ID:', businessId);
console.log('Tenant Key:', tenantKey);

// Verify all created records
const business = await db.select().from(businessTenants).where(eq(businessTenants.id, businessId));
const access = await db.select().from(businessAccess).where(eq(businessAccess.businessId, businessId));
const subscription = await db.select().from(businessSubscriptions).where(eq(businessSubscriptions.businessId, businessId));

console.log('Business created:', business.length === 1);
console.log('Owner access created:', access.length === 1);
console.log('Subscription created:', subscription.length === 1);
```

**Expected Results:**
- ✅ Business record created
- ✅ Owner access created
- ✅ Subscription created
- ✅ Settings created
- ✅ Directory entry created

### Test 5.2: Tenant Suspension
```typescript
// Suspend tenant
await suspendTenant(businessId, 'Payment failure', adminUserId);

// Try to access as suspended tenant
const result = await asTenant(businessId, async () => {
  return db.select().from(bookings);
});

// Check status
const business = await getTenantStatus(businessId);
console.log('Status:', business.status); // Should be 'suspended'
console.log('Suspended at:', business.suspendedAt);
```

**Expected Results:**
- ✅ Tenant suspended successfully
- ✅ Lifecycle event logged
- ✅ Access should be denied (implement in middleware)

### Test 5.3: Data Export (GDPR)
```typescript
// Request export
const exportId = await exportTenantData(businessId, userId, 'gdpr');

// Check status
let status = await getExportStatus(exportId, businessId);
console.log('Export status:', status.status);

// Wait for completion
await new Promise(resolve => setTimeout(resolve, 5000));

status = await getExportStatus(exportId, businessId);
console.log('Export completed:', status.status === 'completed');
console.log('Records exported:', status.recordsExported);

// Download
const filePath = await getExportFilePath(exportId, businessId);
const data = fs.readFileSync(filePath, 'utf8');
const exportData = JSON.parse(data);

console.log('Tables exported:', Object.keys(exportData.tables));
```

**Expected Results:**
- ✅ Export request accepted
- ✅ Status updates to 'completed'
- ✅ File generated successfully
- ✅ Contains all tenant data
- ✅ No other tenant's data included

---

## ✅ PHASE 6: CACHING ISOLATION

### Test 6.1: Tenant-Scoped Cache
```typescript
// Set cache for tenant 1
await cache.set(1, 'settings', { timezone: 'Australia/Sydney' }, 3600);

// Get cache for tenant 1
const settings1 = await cache.get(1, 'settings');
console.log('Tenant 1 settings:', settings1);

// Try to get as tenant 2 (should be null)
const settings2 = await cache.get(2, 'settings');
console.log('Tenant 2 settings (should be null):', settings2);
```

**Expected Results:**
- ✅ Cache set for tenant 1
- ✅ Cache retrieved for tenant 1
- ✅ Cache miss for tenant 2
- ✅ No cross-tenant cache leakage

### Test 6.2: Cache Invalidation
```typescript
// Warm cache
await cache.set(1, 'products', [...products], 300);

// Update product
await updateProduct(productId);

// Invalidate cache
await cache.invalidate(1, 'products');

// Next fetch should hit database
const products = await cache.getOrCompute(
  1,
  'products',
  async () => fetchProductsFromDB(1),
  300
);
```

**Expected Results:**
- ✅ Cache invalidation works
- ✅ Fresh data fetched after invalidation

---

## ✅ PHASE 7: PAYMENT GATEWAY

### Test 7.1: Add Payment Gateway
```typescript
const result = await addPaymentGateway({
  businessId: 1,
  paymentModel: 'vendor_managed',
  gatewayProvider: 'stripe',
  credentials: {
    secretKey: 'sk_test_...',
    publishableKey: 'pk_test_...',
    webhookSecret: 'whsec_...',
  },
  isTestMode: true,
  createdBy: userId,
});

console.log('Gateway added:', result.id);
```

**Expected Results:**
- ✅ Gateway configuration stored
- ✅ Credentials encrypted
- ✅ Cannot decrypt without key

### Test 7.2: Credentials Security
```typescript
// Try to read encrypted credentials directly
const gateway = await db.select()
  .from(tenantPaymentGateways)
  .where(eq(tenantPaymentGateways.businessId, 1))
  .limit(1);

console.log('Encrypted credentials:', gateway.encryptedCredentials);
// Should be base64 encrypted string

// Decrypt with service
const credentials = await getDecryptedCredentials(1);
console.log('Decrypted:', credentials.secretKey);
// Should be original secret key
```

**Expected Results:**
- ✅ Credentials stored encrypted
- ✅ Cannot read raw credentials
- ✅ Decryption works with service

---

## ✅ PHASE 8: LOGGING WITH TENANT CONTEXT

### Test 8.1: Automatic Tenant ID Logging
```typescript
// Set tenant context
logger.setContext({ tenantId: 1, userId: 123 });

// Log message
logger.info('Booking created', { bookingId: 789 });

// Check log output includes tenant context
// Expected: { tenantId: 1, userId: 123, bookingId: 789, ... }
```

**Expected Results:**
- ✅ Logs include tenantId
- ✅ Logs include userId
- ✅ Structured JSON format

### Test 8.2: Request-Scoped Logging
```bash
# Make request with tenant context
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Check server logs
# Should include: tenantId, requestId, method, path, duration
```

**Expected Results:**
- ✅ Request logs include tenant context
- ✅ Performance tracked
- ✅ Request ID generated

---

## ✅ PHASE 9: ANALYTICS AGGREGATION

### Test 9.1: Run Daily Aggregation
```bash
# Run analytics job manually
npx tsx server/jobs/aggregateAnalytics.ts

# Check platform_analytics table
psql $DATABASE_URL -c "SELECT * FROM platform_analytics WHERE aggregation_level = 'platform' ORDER BY date DESC LIMIT 5;"
```

**Expected Results:**
- ✅ Aggregation completes without errors
- ✅ Data inserted into platform_analytics
- ✅ Metrics calculated correctly

### Test 9.2: Query Analytics
```typescript
const analytics = await getAnalytics({
  level: 'industry',
  dimension: 'salon',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
});

console.log('Analytics records:', analytics.length);
console.log('Sample:', analytics[0]);
```

**Expected Results:**
- ✅ Analytics data returned
- ✅ Filtered by level and dimension
- ✅ Date range filtering works

---

## 🔒 SECURITY TESTING

### Test S.1: Cross-Tenant Data Leakage
```typescript
// Attempt to access tenant 2's data while logged in as tenant 1
await asTenant(1, async () => {
  const bookings = await db.select()
    .from(bookings)
    .where(eq(bookings.businessId, 2)); // Try to force tenant 2

  console.log('Bookings returned:', bookings.length);
  // Should be 0 due to RLS
});
```

**Expected Results:**
- ✅ Returns empty set
- ✅ RLS prevents access

### Test S.2: API Key Isolation
```bash
# Create API key for tenant 1
export KEY_T1="..."

# Try to access tenant 2's data
curl -X GET http://localhost:3000/api/bookings?businessId=2 \
  -H "Authorization: Bearer $KEY_T1"

# Should fail or return empty
```

**Expected Results:**
- ✅ Cannot access other tenant's data
- ✅ API key scoped to single tenant

### Test S.3: File Path Traversal
```typescript
// Try to access parent directory
const result = await getFile(1, 'products', '../../../etc/passwd');

// Should fail
console.log('Path traversal blocked:', result === null);
```

**Expected Results:**
- ✅ Path traversal blocked
- ✅ Security error logged

---

## 🚀 PERFORMANCE TESTING

### Test P.1: RLS Query Overhead
```sql
-- Without RLS (before enabling)
EXPLAIN ANALYZE SELECT * FROM bookings WHERE business_id = 1;

-- With RLS (after enabling)
SET LOCAL app.current_tenant_id = '1';
EXPLAIN ANALYZE SELECT * FROM bookings;

-- Compare execution times
-- Overhead should be < 10ms
```

**Expected Results:**
- ✅ Query overhead < 10ms
- ✅ Index on business_id used

### Test P.2: Cache Performance
```typescript
// Measure cache hit
const start1 = Date.now();
const products1 = await cache.getOrCompute(1, 'products', fetchProducts, 300);
console.log('First fetch (DB):', Date.now() - start1, 'ms');

// Measure cache hit
const start2 = Date.now();
const products2 = await cache.get(1, 'products');
console.log('Second fetch (cache):', Date.now() - start2, 'ms');

// Cache should be 10-100x faster
```

**Expected Results:**
- ✅ Cache hit < 5ms
- ✅ Cache miss triggers DB fetch
- ✅ Significant speedup

---

## ✅ INTEGRATION TESTING

### Test I.1: Complete Booking Flow
```typescript
// 1. Create tenant
const { businessId } = await provisionTenant({...});

// 2. Create API key
const { rawKey } = await createApiKey({...});

// 3. Upload product image
const file = await uploadFile({...});

// 4. Create booking via API
const response = await fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${rawKey}` },
  body: JSON.stringify({...}),
});

// 5. Verify booking stored
const bookings = await asTenant(businessId, async () => {
  return db.select().from(bookings);
});

console.log('End-to-end flow successful:', bookings.length > 0);
```

**Expected Results:**
- ✅ All steps complete without errors
- ✅ Data properly isolated
- ✅ Files stored correctly

---

## 📋 TEST COMPLETION CHECKLIST

### Critical Tests (Must Pass)
- [ ] RLS policy enforcement
- [ ] API key authentication
- [ ] File storage isolation
- [ ] Cross-tenant data leakage prevention
- [ ] Cache key isolation
- [ ] Payment credential encryption
- [ ] Tenant lifecycle management
- [ ] Data export (GDPR)

### Security Tests (Must Pass)
- [ ] No cross-tenant data access
- [ ] API key scope enforcement
- [ ] File path traversal blocked
- [ ] Credentials encrypted at rest
- [ ] Audit logging functional

### Performance Tests (Should Pass)
- [ ] RLS overhead < 10ms
- [ ] Cache hit < 5ms
- [ ] File upload < 1s
- [ ] API response < 200ms

### Integration Tests (Should Pass)
- [ ] End-to-end booking flow
- [ ] Tenant provisioning automation
- [ ] Domain resolution
- [ ] Analytics aggregation

---

## 🐛 KNOWN ISSUES / LIMITATIONS

### To Be Implemented
- [ ] Redis cache provider (using memory cache for now)
- [ ] S3 file storage (using local storage for now)
- [ ] Search index isolation (pattern documented, needs implementation)
- [ ] Rate limiting (placeholder in API key service)
- [ ] SSL certificate automation for custom domains

### Future Enhancements
- [ ] Tenant migration service (shared → dedicated DB)
- [ ] Multi-region support
- [ ] Advanced analytics dashboards
- [ ] Webhook delivery system
- [ ] Tenant-specific email templates

---

## 📝 TEST REPORT TEMPLATE

```markdown
## Test Report: Multi-Tenancy Verification
**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** Development / Staging / Production

### Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Blocked: W

### Critical Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce
   - Expected vs Actual result

### Performance Metrics
- RLS overhead: X ms
- Cache hit rate: Y%
- Average API response: Z ms

### Recommendations
- [Action items]
- [Deployment readiness]

### Sign-off
- [ ] All critical tests passed
- [ ] Security verified
- [ ] Performance acceptable
- [ ] Ready for production: YES / NO
```

---

**Last Updated:** 2026-02-15
**Version:** 1.0
**Owner:** QA Team
**Reviewer:** Security Team + DevOps
