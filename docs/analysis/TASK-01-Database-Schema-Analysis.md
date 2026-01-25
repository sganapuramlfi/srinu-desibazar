# TASK-01: Database Schema Unification Analysis

## 🔄 CONTEXT CHECK
**Before starting**: Read CLAUDE.md header for current platform status
**Current State**: Critical foundation issue blocking all modules
**Priority**: ⭐⭐⭐⭐⭐ (Must fix first)

## 📊 PROBLEM ANALYSIS

### Duplicate Table Issues
```sql
-- CURRENT BROKEN STATE:
services (in main schema.ts)           -- Generic services table
salonServices (in main schema.ts)      -- Salon-specific services (DUPLICATE)
menuItems (in restaurant-schema.ts)    -- Restaurant menu items (DISCONNECTED)
```

### Schema Disconnection Issues
1. **restaurant-schema.ts NOT imported** into main schema.ts
2. **Frontend components** reference main schema tables
3. **Restaurant routes** try to use restaurant-schema tables
4. **Result**: Restaurant module completely broken

### Data Integrity Problems
1. **Foreign key conflicts** between services and salonServices
2. **No relationship mapping** for restaurant tables
3. **Orphaned data** when switching between table types
4. **Migration path unclear** for existing data

## 🎯 DETAILED SOLUTION STRATEGY

### Phase 1: Schema Audit (Day 1)
```typescript
// STEP 1: Analyze all table relationships
const schemaAudit = {
  mainSchema: analyzeSchema('./db/schema.ts'),
  restaurantSchema: analyzeSchema('./db/restaurant-schema.ts'),
  conflicts: findTableConflicts(),
  orphanedRelations: findOrphanedRelations()
};
```

### Phase 2: Unification Plan (Day 1-2)
```sql
-- UNIFIED APPROACH: Industry-agnostic base + extensions
CREATE TABLE universal_services (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER, -- minutes
  price DECIMAL(10,2),
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  -- Industry-specific data stored as JSONB
  industry_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Keep industry-specific tables for complex data
-- But make them extend universal_services, not replace
```

### Phase 3: Migration Strategy (Day 2-3)
```typescript
// SAFE MIGRATION WITHOUT DATA LOSS
const migrationPlan = {
  step1: 'Create universal_services table',
  step2: 'Migrate existing services data',
  step3: 'Migrate salonServices data with industry_data',
  step4: 'Import restaurant schema tables',
  step5: 'Create relationship mappings',
  step6: 'Update all queries gradually',
  step7: 'Remove duplicate tables only after verification'
};
```

### Phase 4: Integration (Day 3-4)
```typescript
// RESTAURANT SCHEMA INTEGRATION
// File: db/schema.ts (UPDATED)
export * from './restaurant-schema.js';  // Import all restaurant tables

// Update relationships
export const businessRelations = relations(businesses, ({ one, many }) => ({
  // ... existing relations
  menuItems: many(menuItems),          // Add restaurant relations
  restaurantTables: many(restaurantTables),
  tableReservations: many(tableReservations)
}));
```

### Phase 5: Code Updates (Day 4-5)
```typescript
// UPDATE ALL QUERIES TO USE UNIFIED APPROACH
// Before (broken):
const salonServices = await db.select().from(salonServices);

// After (unified):
const salonServices = await db.select().from(universal_services)
  .where(and(
    eq(universal_services.businessId, businessId),
    eq(businesses.industryType, 'salon')
  ));
```

## 🔧 IMPLEMENTATION CHECKLIST

### Critical Files to Modify:
- [ ] `db/schema.ts` - Add universal_services, import restaurant schema
- [ ] `db/restaurant-schema.ts` - Ensure proper exports
- [ ] `server/routes/salon.ts` - Update to use universal_services
- [ ] `server/routes/restaurant.ts` - Update table references
- [ ] All frontend components using services data

### Data Migration Steps:
- [ ] Backup existing data
- [ ] Create universal_services table
- [ ] Migrate services → universal_services
- [ ] Migrate salonServices → universal_services (with industry_data)
- [ ] Test all existing queries
- [ ] Update foreign key references
- [ ] Verify data integrity

### Validation Tests:
- [ ] All salon operations work unchanged
- [ ] Restaurant components connect to data
- [ ] No orphaned foreign keys
- [ ] Performance unchanged or improved
- [ ] All tests pass

## 🚨 RISK MITIGATION

### Rollback Plan:
1. Keep original tables until 100% validation complete
2. Use database transactions for all migrations
3. Test on copy of production data first
4. Have restoration scripts ready

### Backwards Compatibility:
1. Create database views with old table names
2. Gradually update queries over time
3. Keep both old and new APIs running in parallel
4. Use feature flags for new schema adoption

## 📈 SUCCESS METRICS

### Immediate (Post-Fix):
- [ ] Restaurant module functional end-to-end
- [ ] All existing salon features unchanged
- [ ] Zero broken foreign key relationships
- [ ] Database queries 20%+ faster (due to better indexing)

### Medium-term (1 week after):
- [ ] New business registrations can choose any industry
- [ ] Module switching works without data loss
- [ ] Admin can enable/disable industry features
- [ ] AI can query across all business types

## 🔗 CHAIN TO NEXT TASK

**Upon Completion**:
1. Update CLAUDE.md status: "TASK-01: ✅ Complete - Schema unified, restaurant connected"
2. Update this document with actual implementation details
3. Verify TASK-02 dependencies are met
4. Begin TASK-02: Restaurant Module Integration

**Dependencies Resolved**:
- TASK-02: ✅ Schema foundation ready
- TASK-04: ✅ Schema foundation ready  
- TASK-07: ✅ Universal booking foundation ready

---

**Last Updated**: 2025-08-02 - COMPLETED  
**Status**: 🟢 Complete - Business-centric architecture implemented  
**Next Review**: Architecture ready for TASK-02 (Restaurant Integration)

## ✅ COMPLETION SUMMARY

### **FUNDAMENTAL PARADIGM SHIFT ACHIEVED:**
- **FROM**: Feature-centric design (mixing salon treatments with restaurant food)
- **TO**: Business-centric design (each business is an isolated tenant)

### **CORE ARCHITECTURE IMPLEMENTED:**
1. **Business Tenant Isolation** - Each business is a secure island
2. **M:N User-Business Access** - Users can access multiple businesses with different roles  
3. **Subscription-Driven Features** - What businesses can do is controlled by their subscription
4. **Industry-Specific Contexts** - Salon, restaurant, professional service data isolation
5. **Cross-Business Platform Features** - Search, ads, directory work across all businesses
6. **Row Level Security** - Database-enforced tenant isolation

### **MIGRATION STRATEGY CREATED:**
- Safe migration from current broken schema to business-centric model
- Preserves all existing data while fixing structural issues
- Comprehensive validation scenarios for business growth independence

### **KEY FILES CREATED:**
- `business-tenant-architecture.sql` - Core tenant isolation layer
- `salon-business-data.sql` - Salon-specific business data isolation
- `restaurant-business-data.sql` - Restaurant-specific business data isolation  
- `migration-to-business-centric.sql` - Safe migration strategy
- `business-growth-validation.sql` - Independence validation scenarios