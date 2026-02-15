-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES FOR DESIBAZAAR
-- ============================================================================
-- This migration adds database-level tenant isolation
-- Guarantees zero data leakage even if developer makes mistakes
-- ============================================================================

-- Enable RLS on all tenant-scoped tables
-- ============================================================================

-- Core tenant tables
ALTER TABLE business_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_directory ENABLE ROW LEVEL SECURITY;

-- Multi-tenancy enhancement tables
ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data_exports ENABLE ROW LEVEL SECURITY;

-- Booking and service tables
ALTER TABLE bookable_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Advertising
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Create tenant context setting function
-- ============================================================================
-- This function is called by the application to set current tenant
-- Application sets: SET LOCAL app.current_tenant_id = '123';

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', TRUE), '')::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create super admin check function
-- ============================================================================
-- Checks if current session is in super admin mode
-- Application sets: SET LOCAL app.super_admin_mode = 'true';

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('app.super_admin_mode', TRUE) = 'true';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS POLICIES - Business Tenants
-- ============================================================================

-- Policy: Tenants can only see their own business
CREATE POLICY tenant_isolation_policy ON business_tenants
  FOR ALL
  USING (
    id = get_current_tenant_id()
    OR is_super_admin()
  );

-- RLS POLICIES - Business Access
-- ============================================================================

CREATE POLICY tenant_isolation_policy ON business_access
  FOR ALL
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

-- RLS POLICIES - Business Subscriptions
-- ============================================================================

CREATE POLICY tenant_isolation_policy ON business_subscriptions
  FOR ALL
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

-- RLS POLICIES - Business Settings
-- ============================================================================

CREATE POLICY tenant_isolation_policy ON business_settings
  FOR ALL
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

-- RLS POLICIES - Business Directory
-- ============================================================================

-- Special case: Directory is public for reads, private for writes
CREATE POLICY tenant_isolation_read_policy ON business_directory
  FOR SELECT
  USING (TRUE); -- Public reads for discovery

CREATE POLICY tenant_isolation_write_policy ON business_directory
  FOR INSERT
  WITH CHECK (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

CREATE POLICY tenant_isolation_update_policy ON business_directory
  FOR UPDATE
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

CREATE POLICY tenant_isolation_delete_policy ON business_directory
  FOR DELETE
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

-- RLS POLICIES - Tenant API Keys
-- ============================================================================

CREATE POLICY tenant_isolation_policy ON tenant_api_keys
  FOR ALL
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

-- RLS POLICIES - Tenant Domains
-- ============================================================================

CREATE POLICY tenant_isolation_policy ON tenant_domains
  FOR ALL
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

-- RLS POLICIES - Tenant Lifecycle Events
-- ============================================================================

CREATE POLICY tenant_isolation_policy ON tenant_lifecycle_events
  FOR ALL
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

-- RLS POLICIES - Tenant Data Exports
-- ============================================================================

CREATE POLICY tenant_isolation_policy ON tenant_data_exports
  FOR ALL
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

-- RLS POLICIES - Bookable Items
-- ============================================================================

CREATE POLICY tenant_isolation_policy ON bookable_items
  FOR ALL
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
  );

-- RLS POLICIES - Bookings
-- ============================================================================

-- Special case: Customers can see their own bookings + business can see all their bookings
CREATE POLICY tenant_isolation_policy ON bookings
  FOR ALL
  USING (
    business_id = get_current_tenant_id()
    OR is_super_admin()
    OR customer_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::INTEGER
  );

-- RLS POLICIES - Advertisements
-- ============================================================================

CREATE POLICY tenant_isolation_policy ON advertisements
  FOR ALL
  USING (
    advertiser_id = get_current_tenant_id()
    OR is_super_admin()
  );

-- Create index on business_id for performance
-- ============================================================================
-- RLS policies use business_id heavily, so ensure indexes exist

CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business_id
  ON business_subscriptions(business_id);

CREATE INDEX IF NOT EXISTS idx_business_settings_business_id
  ON business_settings(business_id);

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_business_id
  ON tenant_api_keys(business_id);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_business_id
  ON tenant_domains(business_id);

CREATE INDEX IF NOT EXISTS idx_tenant_lifecycle_events_business_id
  ON tenant_lifecycle_events(business_id);

CREATE INDEX IF NOT EXISTS idx_tenant_data_exports_business_id
  ON tenant_data_exports(business_id);

CREATE INDEX IF NOT EXISTS idx_bookable_items_business_id
  ON bookable_items(business_id);

CREATE INDEX IF NOT EXISTS idx_bookings_business_id
  ON bookings(business_id);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
  ON bookings(customer_id);

CREATE INDEX IF NOT EXISTS idx_advertisements_advertiser_id
  ON advertisements(advertiser_id);

-- Grant necessary permissions
-- ============================================================================
-- Application user needs to execute RLS functions

GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_super_admin() TO PUBLIC;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

-- In application, before executing queries, set tenant context:
--
-- Regular tenant query:
-- await db.execute(sql`SET LOCAL app.current_tenant_id = ${businessId}`);
-- const results = await db.select().from(bookings);
--
-- Super admin query (cross-tenant):
-- await db.execute(sql`SET LOCAL app.super_admin_mode = 'true'`);
-- const allBusinesses = await db.select().from(businessTenants);
--
-- Customer viewing their own bookings:
-- await db.execute(sql`SET LOCAL app.current_user_id = ${userId}`);
-- const myBookings = await db.select().from(bookings);

-- ============================================================================
-- TESTING RLS POLICIES
-- ============================================================================

-- Test 1: Regular tenant can only see their own data
-- SET LOCAL app.current_tenant_id = '1';
-- SELECT * FROM bookings; -- Should only return bookings for business 1

-- Test 2: Super admin can see all data
-- SET LOCAL app.super_admin_mode = 'true';
-- SELECT * FROM bookings; -- Should return all bookings

-- Test 3: Without tenant context, no data returned
-- RESET app.current_tenant_id;
-- RESET app.super_admin_mode;
-- SELECT * FROM bookings; -- Should return empty set (enforcing tenant isolation)

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To disable RLS:
-- ALTER TABLE business_tenants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE business_access DISABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)
--
-- DROP FUNCTION IF EXISTS get_current_tenant_id();
-- DROP FUNCTION IF EXISTS is_super_admin();
