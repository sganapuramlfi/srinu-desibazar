-- MIGRATION FROM CURRENT SCHEMA TO BUSINESS-CENTRIC ARCHITECTURE
-- This script safely migrates existing data to the new business-tenant model

BEGIN;

-- =============================================================================
-- STEP 1: CREATE NEW BUSINESS-CENTRIC TABLES
-- =============================================================================

-- Execute the new architecture (these files should be run first)
-- \i business-tenant-architecture.sql
-- \i salon-business-data.sql  
-- \i restaurant-business-data.sql

-- =============================================================================
-- STEP 2: MIGRATE EXISTING USER DATA
-- =============================================================================

-- Migrate existing users to platform_users
INSERT INTO platform_users (id, email, password_hash, created_at)
SELECT 
  id,
  email,
  password as password_hash, -- Rename column
  created_at
FROM users
ON CONFLICT (id) DO NOTHING;

-- Update sequence to prevent ID conflicts
SELECT setval('platform_users_id_seq', (SELECT MAX(id) FROM platform_users));

-- =============================================================================
-- STEP 3: MIGRATE EXISTING BUSINESS DATA TO BUSINESS TENANTS
-- =============================================================================

-- Migrate businesses to business_tenants
INSERT INTO business_tenants (
  id, name, slug, industry_type, status, description, 
  logo_url, gallery, contact_info, operating_hours, amenities,
  onboarding_completed, created_at, updated_at
)
SELECT 
  id,
  name,
  slug,
  industry_type,
  status,
  description,
  logo as logo_url, -- Rename column
  gallery,
  contact_info,
  operating_hours,
  amenities,
  onboarding_completed,
  created_at,
  updated_at
FROM businesses
ON CONFLICT (id) DO NOTHING;

-- Update sequence
SELECT setval('business_tenants_id_seq', (SELECT MAX(id) FROM business_tenants));

-- =============================================================================
-- STEP 4: CREATE BUSINESS ACCESS RELATIONSHIPS
-- =============================================================================

-- Create business access records for existing user-business relationships
INSERT INTO business_access (business_id, user_id, role_in_business, permissions, granted_at)
SELECT 
  b.id as business_id,
  b.userId as user_id,
  -- Determine role based on original user.role
  CASE 
    WHEN u.role = 'business' THEN 'owner'
    WHEN u.role = 'admin' THEN 'manager'
    ELSE 'customer'
  END as role_in_business,
  -- Set permissions based on role
  CASE 
    WHEN u.role = 'business' THEN '{"can_edit_business": true, "can_manage_staff": true, "can_view_analytics": true}'
    WHEN u.role = 'admin' THEN '{"can_edit_business": true, "can_manage_staff": true, "can_view_analytics": true}'
    ELSE '{}'
  END::jsonb as permissions,
  b.created_at as granted_at
FROM businesses b
INNER JOIN users u ON b.userId = u.id
ON CONFLICT (business_id, user_id) DO NOTHING;

-- =============================================================================
-- STEP 5: CREATE DEFAULT SUBSCRIPTION PLANS
-- =============================================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_monthly, price_yearly, max_staff, max_customers, max_bookings_per_month, ai_credits_per_month, enabled_modules) VALUES
('Startup Free', 0.00, 0.00, 3, 100, 50, 50, '["salon_basic", "restaurant_basic"]'),
('Growth', 49.00, 490.00, 10, 500, 200, 500, '["salon_standard", "restaurant_standard", "basic_analytics"]'),
('Professional', 149.00, 1490.00, 25, 2000, 1000, 2000, '["salon_premium", "restaurant_premium", "advanced_analytics", "ai_optimization"]'),
('Enterprise', 399.00, 3990.00, -1, -1, -1, 10000, '["all_modules", "white_label", "api_access"]');

-- =============================================================================
-- STEP 6: ASSIGN DEFAULT SUBSCRIPTIONS TO EXISTING BUSINESSES
-- =============================================================================

-- Assign all existing businesses to "Growth" plan initially
INSERT INTO business_subscriptions (business_id, plan_id, billing_email, status)
SELECT 
  bt.id as business_id,
  (SELECT id FROM subscription_plans WHERE name = 'Growth') as plan_id,
  pu.email as billing_email,
  'active' as status
FROM business_tenants bt
INNER JOIN business_access ba ON bt.id = ba.business_id AND ba.role_in_business = 'owner'
INNER JOIN platform_users pu ON ba.user_id = pu.id
ON CONFLICT (business_id) DO NOTHING;

-- =============================================================================
-- STEP 7: CREATE INDUSTRY-SPECIFIC BUSINESS CONTEXTS
-- =============================================================================

-- Create salon business contexts for salon businesses
INSERT INTO salon_business_contexts (business_id, booking_advance_days, walk_in_enabled, staff_scheduling_enabled)
SELECT 
  id as business_id,
  30 as booking_advance_days,
  TRUE as walk_in_enabled, 
  TRUE as staff_scheduling_enabled
FROM business_tenants 
WHERE industry_type = 'salon'
ON CONFLICT (business_id) DO NOTHING;

-- Create restaurant business contexts for restaurant businesses  
INSERT INTO restaurant_business_contexts (business_id, table_booking_enabled, online_ordering_enabled, prep_time_tracking)
SELECT 
  id as business_id,
  TRUE as table_booking_enabled,
  FALSE as online_ordering_enabled,
  TRUE as prep_time_tracking
FROM business_tenants
WHERE industry_type = 'restaurant'
ON CONFLICT (business_id) DO NOTHING;

-- Create professional service contexts
INSERT INTO professional_business_contexts (business_id, consultation_booking_enabled, hourly_billing_enabled)
SELECT 
  id as business_id,
  TRUE as consultation_booking_enabled,
  TRUE as hourly_billing_enabled
FROM business_tenants
WHERE industry_type = 'professional'
ON CONFLICT (business_id) DO NOTHING;

-- =============================================================================
-- STEP 8: MIGRATE SALON-SPECIFIC DATA
-- =============================================================================

-- Migrate salon services (if using salonServices table)
INSERT INTO salon_services (
  business_id, name, description, duration_minutes, price, 
  service_category, is_active, created_at, updated_at
)
SELECT 
  businessId as business_id,
  name,
  description,
  duration as duration_minutes,
  price,
  'general' as service_category, -- Default category
  isActive as is_active,
  createdAt as created_at,
  updatedAt as updated_at
FROM salonServices ss
WHERE EXISTS (SELECT 1 FROM business_tenants bt WHERE bt.id = ss.businessId AND bt.industry_type = 'salon')
ON CONFLICT DO NOTHING;

-- Migrate salon staff
INSERT INTO salon_staff (
  business_id, first_name, last_name, email, phone,
  staff_position, hourly_rate, is_active, created_at, updated_at
)
SELECT 
  businessId as business_id,
  SPLIT_PART(name, ' ', 1) as first_name,
  COALESCE(SPLIT_PART(name, ' ', 2), '') as last_name,
  email,
  phone,
  COALESCE(position, 'stylist') as staff_position,
  hourlyRate as hourly_rate,
  isActive as is_active,
  createdAt as created_at,
  updatedAt as updated_at
FROM salonStaff ss
WHERE EXISTS (SELECT 1 FROM business_tenants bt WHERE bt.id = ss.businessId AND bt.industry_type = 'salon')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 9: MIGRATE RESTAURANT-SPECIFIC DATA  
-- =============================================================================

-- Migrate restaurant menu categories
INSERT INTO restaurant_menu_categories (business_id, name, description, display_order, is_active, created_at)
SELECT 
  businessId as business_id,
  name,
  description,
  displayOrder as display_order,
  isActive as is_active,
  createdAt as created_at
FROM menuCategories mc
WHERE EXISTS (SELECT 1 FROM business_tenants bt WHERE bt.id = mc.businessId AND bt.industry_type = 'restaurant')
ON CONFLICT DO NOTHING;

-- Migrate restaurant menu items
INSERT INTO restaurant_menu_items (
  business_id, category_id, name, description, price,
  preparation_time_minutes, calories, spice_level,
  is_vegetarian, is_vegan, is_gluten_free, is_halal,
  is_available, display_order, created_at, updated_at
)
SELECT 
  mi.businessId as business_id,
  mi.categoryId as category_id,
  mi.name,
  mi.description,
  mi.price,
  mi.preparationTime as preparation_time_minutes,
  mi.calories,
  mi.spiceLevel as spice_level,
  mi.isVegetarian as is_vegetarian,
  mi.isVegan as is_vegan,
  mi.isGlutenFree as is_gluten_free,
  mi.isHalal as is_halal,
  mi.isAvailable as is_available,
  mi.displayOrder as display_order,
  mi.createdAt as created_at,
  mi.updatedAt as updated_at
FROM menuItems mi
WHERE EXISTS (SELECT 1 FROM business_tenants bt WHERE bt.id = mi.businessId AND bt.industry_type = 'restaurant')
ON CONFLICT DO NOTHING;

-- Migrate restaurant tables
INSERT INTO restaurant_tables (business_id, table_number, seating_capacity, location_description, is_active, created_at)
SELECT 
  businessId as business_id,
  tableNumber as table_number,
  seatingCapacity as seating_capacity,
  location as location_description,
  isActive as is_active,
  createdAt as created_at
FROM restaurantTables rt
WHERE EXISTS (SELECT 1 FROM business_tenants bt WHERE bt.id = rt.businessId AND bt.industry_type = 'restaurant')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 10: CREATE BUSINESS DIRECTORY ENTRIES
-- =============================================================================

-- Create public directory entries for all active businesses
INSERT INTO business_directory (
  business_id, public_name, public_description, 
  public_phone, public_email, is_published
)
SELECT 
  bt.id as business_id,
  bt.name as public_name,
  bt.description as public_description,
  (bt.contact_info->>'phone') as public_phone,
  (bt.contact_info->>'email') as public_email,
  CASE WHEN bt.status = 'active' THEN TRUE ELSE FALSE END as is_published
FROM business_tenants bt
ON CONFLICT (business_id) DO UPDATE SET
  public_name = EXCLUDED.public_name,
  public_description = EXCLUDED.public_description;

-- =============================================================================
-- STEP 11: VALIDATION & CLEANUP
-- =============================================================================

-- Verify migration success
DO $$
DECLARE
  old_users_count INTEGER;
  new_users_count INTEGER;
  old_businesses_count INTEGER;
  new_businesses_count INTEGER;
  business_access_count INTEGER;
  subscription_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_users_count FROM users;
  SELECT COUNT(*) INTO new_users_count FROM platform_users;
  SELECT COUNT(*) INTO old_businesses_count FROM businesses;
  SELECT COUNT(*) INTO new_businesses_count FROM business_tenants;
  SELECT COUNT(*) INTO business_access_count FROM business_access;
  SELECT COUNT(*) INTO subscription_count FROM business_subscriptions;
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '- Users: % → %', old_users_count, new_users_count;
  RAISE NOTICE '- Businesses: % → %', old_businesses_count, new_businesses_count;
  RAISE NOTICE '- Business Access Records: %', business_access_count;
  RAISE NOTICE '- Active Subscriptions: %', subscription_count;
  
  IF new_users_count != old_users_count THEN
    RAISE EXCEPTION 'User migration failed: counts do not match';
  END IF;
  
  IF new_businesses_count != old_businesses_count THEN
    RAISE EXCEPTION 'Business migration failed: counts do not match';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully!';
END $$;

-- =============================================================================
-- STEP 12: CREATE MIGRATION STATUS TABLE
-- =============================================================================

-- Track what has been migrated
CREATE TABLE IF NOT EXISTS migration_status (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

INSERT INTO migration_status (migration_name, notes) VALUES 
('business_centric_architecture', 'Migrated from user-business model to business-tenant model with proper isolation');

COMMIT;

-- =============================================================================
-- POST-MIGRATION STEPS (Run manually after verification)
-- =============================================================================

-- After validating the migration works correctly:
-- 1. Update application code to use new tables
-- 2. Test all functionality with new schema
-- 3. When confident, run cleanup:

/*
-- CLEANUP OLD TABLES (ONLY AFTER FULL VALIDATION)
-- DROP TABLE IF EXISTS businesses CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;  
-- DROP TABLE IF EXISTS salonServices CASCADE;
-- DROP TABLE IF EXISTS salonStaff CASCADE;
-- DROP TABLE IF EXISTS menuCategories CASCADE;
-- DROP TABLE IF EXISTS menuItems CASCADE;
-- DROP TABLE IF EXISTS restaurantTables CASCADE;

-- RENAME NEW TABLES TO FINAL NAMES (if needed)
-- This step may not be necessary if application code is updated to use new names
*/

-- Migration Notes:
-- 1. All existing businesses get 'Growth' subscription initially
-- 2. Business owners get 'owner' role, others get appropriate roles  
-- 3. Industry-specific contexts are created for all businesses
-- 4. Row Level Security is enabled for tenant isolation
-- 5. Public directory entries are created for business discovery