-- Debug availability for Spice Pavilion Melbourne
-- Check what tables exist and what reservations are blocking

SELECT 'BUSINESS INFO' as section, bt.id::text as id, bt.business_name as info, bt.slug as details
FROM business_tenants bt 
WHERE bt.slug = 'spice-pavilion-melbourne'

UNION ALL

SELECT 'TABLES' as section, rt.id::text as id, 
       CONCAT('Table ', rt.table_number) as info,
       CONCAT(rt.max_capacity, ' seats, ', rt.floor_area) as details
FROM restaurant_tables rt 
JOIN business_tenants bt ON rt.business_id = bt.id
WHERE bt.slug = 'spice-pavilion-melbourne'
ORDER BY rt.table_number

UNION ALL

SELECT 'RESERVATIONS' as section, b.id::text as id,
       CONCAT(b.customer_name, ' - ', b.party_size, ' people') as info,
       CONCAT(b.start_time::date, ' ', b.start_time::time, ' - ', b.status) as details
FROM bookings b
JOIN business_tenants bt ON b.business_id = bt.id  
WHERE bt.slug = 'spice-pavilion-melbourne'
ORDER BY b.start_time DESC;

-- Check specific availability for tomorrow at different times
SELECT 
    'AVAILABILITY CHECK' as test_type,
    '6:00 PM' as time_slot,
    COUNT(rt.id) as available_tables
FROM restaurant_tables rt
JOIN business_tenants bt ON rt.business_id = bt.id
WHERE bt.slug = 'spice-pavilion-melbourne'
  AND rt.is_active = true
  AND rt.max_capacity >= 2
  AND rt.id NOT IN (
    SELECT DISTINCT rr.table_id
    FROM restaurant_reservations rr
    JOIN bookings b ON rr.booking_id = b.id
    WHERE b.business_id = rt.business_id
      AND b.start_time::date = (CURRENT_DATE + INTERVAL '1 day')
      AND b.start_time::time BETWEEN '17:00'::time - INTERVAL '2 hours' 
                                 AND '17:00'::time + INTERVAL '2 hours'
      AND b.status != 'cancelled'
  )

UNION ALL

SELECT 
    'AVAILABILITY CHECK' as test_type,
    '8:00 PM' as time_slot,
    COUNT(rt.id) as available_tables::text
FROM restaurant_tables rt
JOIN business_tenants bt ON rt.business_id = bt.id
WHERE bt.slug = 'spice-pavilion-melbourne'
  AND rt.is_active = true
  AND rt.max_capacity >= 2
  AND rt.id NOT IN (
    SELECT DISTINCT rr.table_id
    FROM restaurant_reservations rr
    JOIN bookings b ON rr.booking_id = b.id
    WHERE b.business_id = rt.business_id
      AND b.start_time::date = (CURRENT_DATE + INTERVAL '1 day')
      AND b.start_time::time BETWEEN '20:00'::time - INTERVAL '2 hours' 
                                 AND '20:00'::time + INTERVAL '2 hours'
      AND b.status != 'cancelled'
  );