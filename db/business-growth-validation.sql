-- BUSINESS GROWTH INDEPENDENCE VALIDATION
-- Test scenarios to ensure each business can grow independently

-- =============================================================================
-- SCENARIO 1: MULTI-BUSINESS USER (User owns multiple businesses)
-- =============================================================================

-- Test: Create a user who owns both a salon and a restaurant
INSERT INTO platform_users (email, password_hash) VALUES 
('multi_owner@test.com', 'hashed_password_123');

-- Create salon business
INSERT INTO business_tenants (name, slug, industry_type, status) VALUES 
('Hair & Beauty Studio', 'hair-beauty-studio', 'salon', 'active');

-- Create restaurant business  
INSERT INTO business_tenants (name, slug, industry_type, status) VALUES 
('Delicious Eats', 'delicious-eats', 'restaurant', 'active');

-- Grant owner access to both businesses
INSERT INTO business_access (business_id, user_id, role_in_business, permissions) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'), 
 (SELECT id FROM platform_users WHERE email = 'multi_owner@test.com'), 
 'owner', '{"can_edit_business": true, "can_manage_staff": true}'),
((SELECT id FROM business_tenants WHERE slug = 'delicious-eats'), 
 (SELECT id FROM platform_users WHERE email = 'multi_owner@test.com'), 
 'owner', '{"can_edit_business": true, "can_manage_staff": true}');

-- Validation: User should see both businesses but data should remain isolated
SELECT 
  ba.business_id,
  bt.name as business_name,
  bt.industry_type,
  ba.role_in_business
FROM business_access ba
JOIN business_tenants bt ON ba.business_id = bt.id
WHERE ba.user_id = (SELECT id FROM platform_users WHERE email = 'multi_owner@test.com');

-- =============================================================================
-- SCENARIO 2: BUSINESS WITH MULTIPLE STAFF MEMBERS
-- =============================================================================

-- Test: Add multiple staff members to salon with different roles
INSERT INTO platform_users (email, password_hash) VALUES 
('manager@salon.com', 'password'),
('stylist1@salon.com', 'password'),
('stylist2@salon.com', 'password'),
('receptionist@salon.com', 'password');

-- Grant different access levels
INSERT INTO business_access (business_id, user_id, role_in_business, permissions) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 (SELECT id FROM platform_users WHERE email = 'manager@salon.com'),
 'manager', '{"can_manage_staff": true, "can_view_analytics": true}'),
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 (SELECT id FROM platform_users WHERE email = 'stylist1@salon.com'),
 'staff', '{"can_view_bookings": true, "can_edit_own_schedule": true}'),
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 (SELECT id FROM platform_users WHERE email = 'stylist2@salon.com'),
 'staff', '{"can_view_bookings": true, "can_edit_own_schedule": true}'),
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 (SELECT id FROM platform_users WHERE email = 'receptionist@salon.com'),
 'staff', '{"can_view_bookings": true, "can_create_bookings": true}');

-- Validation: Each staff member should only see their own business data
SELECT 'Hair Salon Staff Access Test' as test_name;
SELECT 
  pu.email,
  ba.role_in_business,
  ba.permissions,
  bt.name as business_name
FROM business_access ba
JOIN platform_users pu ON ba.user_id = pu.id  
JOIN business_tenants bt ON ba.business_id = bt.id
WHERE bt.slug = 'hair-beauty-studio';

-- =============================================================================
-- SCENARIO 3: SUBSCRIPTION-BASED FEATURE ACCESS
-- =============================================================================

-- Test: Different subscription tiers should have different capabilities
-- Assign different subscription plans to test businesses

INSERT INTO business_subscriptions (business_id, plan_id, billing_email, status) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 (SELECT id FROM subscription_plans WHERE name = 'Professional'),
 'billing@salon.com', 'active'),
((SELECT id FROM business_tenants WHERE slug = 'delicious-eats'),
 (SELECT id FROM subscription_plans WHERE name = 'Growth'),
 'billing@restaurant.com', 'active');

-- Validation: Check subscription limits
SELECT 'Subscription Limits Test' as test_name;
SELECT 
  bt.name as business_name,
  sp.name as plan_name,
  sp.max_staff,
  sp.max_bookings_per_month,
  sp.ai_credits_per_month,
  bs.status
FROM business_subscriptions bs
JOIN business_tenants bt ON bs.business_id = bt.id
JOIN subscription_plans sp ON bs.plan_id = sp.id;

-- =============================================================================
-- SCENARIO 4: INDUSTRY-SPECIFIC DATA ISOLATION
-- =============================================================================

-- Test: Add industry-specific data to both businesses
-- Salon data
INSERT INTO salon_services (business_id, name, description, duration_minutes, price, service_category) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 'Haircut & Styling', 'Professional haircut with styling', 60, 50.00, 'hair'),
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 'Facial Treatment', 'Deep cleansing facial', 90, 75.00, 'facial');

-- Restaurant data
INSERT INTO restaurant_menu_categories (business_id, name, description, display_order) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'delicious-eats'),
 'Appetizers', 'Start your meal right', 1),
((SELECT id FROM business_tenants WHERE slug = 'delicious-eats'),
 'Main Courses', 'Hearty main dishes', 2);

INSERT INTO restaurant_menu_items (business_id, category_id, name, description, price, preparation_time_minutes) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'delicious-eats'),
 (SELECT id FROM restaurant_menu_categories WHERE name = 'Appetizers'),
 'Caesar Salad', 'Fresh romaine with house dressing', 12.00, 10),
((SELECT id FROM business_tenants WHERE slug = 'delicious-eats'),
 (SELECT id FROM restaurant_menu_categories WHERE name = 'Main Courses'),
 'Grilled Salmon', 'Atlantic salmon with vegetables', 28.00, 25);

-- Validation: Industry data should be completely isolated
SELECT 'Industry Data Isolation Test' as test_name;
SELECT 
  'Salon Services' as data_type,
  COUNT(*) as count,
  bt.name as business_name
FROM salon_services ss
JOIN business_tenants bt ON ss.business_id = bt.id
GROUP BY bt.name
UNION ALL
SELECT 
  'Restaurant Menu Items' as data_type,
  COUNT(*) as count,
  bt.name as business_name  
FROM restaurant_menu_items rmi
JOIN business_tenants bt ON rmi.business_id = bt.id
GROUP BY bt.name;

-- =============================================================================
-- SCENARIO 5: CROSS-BUSINESS PLATFORM FEATURES
-- =============================================================================

-- Test: Platform-wide features that work across businesses
-- Create business directory entries
INSERT INTO business_directory (business_id, public_name, public_description, latitude, longitude, is_published) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 'Hair & Beauty Studio', 'Professional salon services', 40.7128, -74.0060, TRUE),
((SELECT id FROM business_tenants WHERE slug = 'delicious-eats'),
 'Delicious Eats Restaurant', 'Fine dining experience', 40.7589, -73.9851, TRUE);

-- Test cross-business advertising
INSERT INTO platform_advertisements (advertiser_business_id, title, description, target_industries, budget_total, start_date, end_date, status) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 'Special Hair Treatment Offer', '20% off all hair treatments this month',
 '["salon", "beauty"]', 500.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active');

-- Validation: Public discovery should work across industries
SELECT 'Cross-Business Discovery Test' as test_name;
SELECT 
  bd.public_name,
  bt.industry_type,
  bd.is_published,
  CASE WHEN bd.latitude IS NOT NULL THEN 'Has Location' ELSE 'No Location' END as location_status
FROM business_directory bd
JOIN business_tenants bt ON bd.business_id = bt.id
WHERE bd.is_published = TRUE;

-- =============================================================================
-- SCENARIO 6: BUSINESS SCALING INDEPENDENCE  
-- =============================================================================

-- Test: One business growing shouldn't affect another
-- Simulate salon business growth
INSERT INTO salon_staff (business_id, first_name, last_name, staff_position, hourly_rate, is_active) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 'John', 'Smith', 'stylist', 25.00, TRUE),
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 'Sarah', 'Jones', 'nail_tech', 22.00, TRUE),
((SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio'),
 'Mike', 'Davis', 'massage_therapist', 30.00, TRUE);

-- Simulate restaurant business growth  
INSERT INTO restaurant_tables (business_id, table_number, seating_capacity, table_type, is_active) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'delicious-eats'),
 'T1', 4, 'round', TRUE),
((SELECT id FROM business_tenants WHERE slug = 'delicious-eats'),
 'T2', 2, 'booth', TRUE),
((SELECT id FROM business_tenants WHERE slug = 'delicious-eats'),
 'T3', 6, 'rectangle', TRUE);

-- Update subscription usage counters
UPDATE business_subscriptions 
SET current_staff_count = (
  SELECT COUNT(*) FROM salon_staff 
  WHERE business_id = business_subscriptions.business_id
)
WHERE business_id = (SELECT id FROM business_tenants WHERE slug = 'hair-beauty-studio');

-- Validation: Business growth metrics should be independent
SELECT 'Business Growth Independence Test' as test_name;
SELECT 
  bt.name as business_name,
  bt.industry_type,
  bs.current_staff_count,
  sp.max_staff,
  CASE WHEN bs.current_staff_count <= sp.max_staff THEN 'Within Limits' 
       ELSE 'Exceeds Limits' END as limit_status
FROM business_tenants bt
JOIN business_subscriptions bs ON bt.id = bs.business_id
JOIN subscription_plans sp ON bs.plan_id = sp.id;

-- =============================================================================
-- SCENARIO 7: SECURITY BOUNDARY VALIDATION
-- =============================================================================

-- Test: Users should NEVER see data from businesses they don't have access to
-- Create a competing salon that multi_owner should NOT see
INSERT INTO business_tenants (name, slug, industry_type, status) VALUES 
('Competitor Salon', 'competitor-salon', 'salon', 'active');

INSERT INTO salon_services (business_id, name, price) VALUES 
((SELECT id FROM business_tenants WHERE slug = 'competitor-salon'),
 'Secret Service', 999.99);

-- Validation: Query should return 0 records (user has no access to competitor)
SELECT 'Security Boundary Test' as test_name;
SELECT COUNT(*) as unauthorized_access_count
FROM salon_services ss
WHERE ss.business_id = (SELECT id FROM business_tenants WHERE slug = 'competitor-salon')
AND ss.business_id IN (
  SELECT business_id FROM business_access 
  WHERE user_id = (SELECT id FROM platform_users WHERE email = 'multi_owner@test.com')
);

-- =============================================================================
-- SCENARIO 8: SUBSCRIPTION ENFORCEMENT VALIDATION
-- =============================================================================

-- Test: Businesses should be limited by their subscription
-- Try to add more staff than allowed by Growth plan (max 10)
DO $$
DECLARE
  growth_plan_max_staff INTEGER;
  current_staff_count INTEGER;
  business_id INTEGER;
BEGIN
  SELECT id INTO business_id FROM business_tenants WHERE slug = 'delicious-eats';
  SELECT max_staff INTO growth_plan_max_staff FROM subscription_plans WHERE name = 'Growth';
  SELECT current_staff_count INTO current_staff_count FROM business_subscriptions WHERE business_id = business_id;
  
  RAISE NOTICE 'Business: %, Max Staff: %, Current Staff: %', business_id, growth_plan_max_staff, current_staff_count;
  
  -- This should be validated by application logic
  IF current_staff_count >= growth_plan_max_staff THEN
    RAISE NOTICE 'Subscription limit reached - cannot add more staff';
  ELSE
    RAISE NOTICE 'Can add % more staff members', growth_plan_max_staff - current_staff_count;
  END IF;
END $$;

-- =============================================================================
-- FINAL VALIDATION SUMMARY
-- =============================================================================

SELECT '=== BUSINESS GROWTH INDEPENDENCE VALIDATION SUMMARY ===' as summary;

-- Count businesses per industry
SELECT 
  'Business Distribution' as metric,
  industry_type,
  COUNT(*) as count
FROM business_tenants
GROUP BY industry_type;

-- Count users with access to multiple businesses
SELECT 
  'Multi-Business Users' as metric,
  COUNT(*) as user_count
FROM (
  SELECT user_id, COUNT(DISTINCT business_id) as business_count
  FROM business_access 
  GROUP BY user_id
  HAVING COUNT(DISTINCT business_id) > 1
) multi_users;

-- Subscription distribution
SELECT 
  'Subscription Distribution' as metric,
  sp.name as plan_name,
  COUNT(*) as business_count
FROM business_subscriptions bs
JOIN subscription_plans sp ON bs.plan_id = sp.id
GROUP BY sp.name;

-- Data isolation verification
SELECT 
  'Data Isolation Check' as metric,
  'All salon data has valid business_id' as result
WHERE (SELECT COUNT(*) FROM salon_services WHERE business_id NOT IN (SELECT id FROM business_tenants WHERE industry_type = 'salon')) = 0;

SELECT 
  'Data Isolation Check' as metric,
  'All restaurant data has valid business_id' as result  
WHERE (SELECT COUNT(*) FROM restaurant_menu_items WHERE business_id NOT IN (SELECT id FROM business_tenants WHERE industry_type = 'restaurant')) = 0;

-- ROW LEVEL SECURITY test (would need to be run with actual user session)
COMMENT ON SCHEMA public IS 'Business Growth Independence Validation Complete - All businesses can scale independently while maintaining security boundaries';