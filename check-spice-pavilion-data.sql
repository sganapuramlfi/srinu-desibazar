-- Check Spice Pavilion Melbourne data
SELECT 
    bt.id as business_id,
    bt.business_name,
    bt.industry_type,
    bt.slug
FROM business_tenants bt 
WHERE bt.business_name ILIKE '%spice%pavilion%' 
   OR bt.slug = 'spice-pavilion-melbourne';

-- Check if there are any restaurant tables for this business
SELECT 
    rt.business_id,
    rt.table_number,
    rt.floor_area,
    rt.max_capacity,
    rt.has_window_view,
    rt.is_active
FROM restaurant_tables rt
JOIN business_tenants bt ON rt.business_id = bt.id
WHERE bt.business_name ILIKE '%spice%pavilion%' 
   OR bt.slug = 'spice-pavilion-melbourne'
ORDER BY rt.table_number;

-- Check existing reservations
SELECT 
    rr.id,
    bt.business_name,
    b.customer_name,
    b.party_size,
    b.start_time,
    b.status,
    rt.table_number
FROM restaurant_reservations rr
JOIN business_tenants bt ON rr.business_id = bt.id
JOIN bookings b ON rr.booking_id = b.id
LEFT JOIN restaurant_tables rt ON rr.table_id = rt.id
WHERE bt.business_name ILIKE '%spice%pavilion%' 
   OR bt.slug = 'spice-pavilion-melbourne'
ORDER BY b.start_time DESC;

-- Check if business exists and what the actual business ID is
SELECT 
    id, 
    business_name, 
    slug, 
    industry_type,
    is_active
FROM business_tenants 
WHERE industry_type = 'restaurant' 
  AND is_active = true
ORDER BY created_at DESC
LIMIT 5;