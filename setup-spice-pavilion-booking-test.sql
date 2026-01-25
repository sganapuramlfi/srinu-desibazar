-- Setup complete booking test data for Spice Pavilion Melbourne

-- First, find or create the Spice Pavilion business
DO $$
DECLARE
    spice_business_id INTEGER;
    test_user_id INTEGER;
BEGIN
    -- Check if Spice Pavilion exists
    SELECT id INTO spice_business_id 
    FROM business_tenants 
    WHERE slug = 'spice-pavilion-melbourne' OR business_name ILIKE '%spice%pavilion%';
    
    IF spice_business_id IS NULL THEN
        RAISE NOTICE 'Spice Pavilion not found. Creating...';
        
        -- Create the business
        INSERT INTO business_tenants (
            business_name, slug, industry_type, business_description,
            is_active, subscription_tier, created_at
        ) VALUES (
            'Spice Pavilion Melbourne',
            'spice-pavilion-melbourne', 
            'restaurant',
            'Authentic Indian cuisine in the heart of Melbourne',
            true,
            'premium',
            NOW()
        ) RETURNING id INTO spice_business_id;
        
        RAISE NOTICE 'Created Spice Pavilion with ID: %', spice_business_id;
    ELSE
        RAISE NOTICE 'Found Spice Pavilion with ID: %', spice_business_id;
    END IF;
    
    -- Check if tables exist, if not create them
    IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE business_id = spice_business_id) THEN
        RAISE NOTICE 'Adding restaurant tables...';
        
        INSERT INTO restaurant_tables (
            business_id, table_number, floor_area, min_capacity, max_capacity, 
            ideal_capacity, table_shape, is_booth, has_window_view, 
            is_wheelchair_accessible, is_reservable, is_active, created_at
        ) VALUES 
            (spice_business_id, 'T1', 'Main', 1, 2, 2, 'round', false, true, true, true, true, NOW()),
            (spice_business_id, 'T2', 'Main', 2, 4, 4, 'square', false, false, true, true, true, NOW()),
            (spice_business_id, 'T3', 'Main', 2, 4, 4, 'square', false, false, true, true, true, NOW()),
            (spice_business_id, 'T4', 'Main', 4, 6, 6, 'rectangle', false, false, true, true, true, NOW()),
            (spice_business_id, 'T5', 'Window', 1, 2, 2, 'round', false, true, true, true, true, NOW()),
            (spice_business_id, 'T6', 'Private', 6, 8, 8, 'rectangle', true, false, true, true, true, NOW()),
            (spice_business_id, 'T7', 'Patio', 2, 4, 4, 'round', false, false, true, true, true, NOW()),
            (spice_business_id, 'T8', 'Bar', 1, 3, 2, 'round', false, false, true, true, true, NOW());
        
        RAISE NOTICE 'Added 8 restaurant tables';
    ELSE
        RAISE NOTICE 'Tables already exist';
    END IF;
    
    -- Create a test reservation for tomorrow at 7 PM to test conflict detection
    SELECT id INTO test_user_id FROM platform_users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Create a booking for table T2 tomorrow at 7 PM
        INSERT INTO bookings (
            business_id, customer_name, customer_phone, customer_email,
            booking_date, start_time, end_time, party_size, status,
            special_requests, created_at
        ) VALUES (
            spice_business_id,
            'Test Customer',
            '+61400123456',
            'test@example.com',
            (CURRENT_DATE + INTERVAL '1 day')::text,
            (CURRENT_DATE + INTERVAL '1 day' + TIME '19:00')::timestamp,
            (CURRENT_DATE + INTERVAL '1 day' + TIME '21:00')::timestamp,
            4,
            'confirmed',
            'Window table if possible',
            NOW()
        );
        
        -- Link it to restaurant reservation
        INSERT INTO restaurant_reservations (
            business_id, booking_id, table_id, occasion, seating_preference, created_at
        ) SELECT 
            spice_business_id,
            b.id,
            rt.id,
            'dinner',
            'window',
            NOW()
        FROM bookings b, restaurant_tables rt 
        WHERE b.business_id = spice_business_id 
          AND rt.business_id = spice_business_id 
          AND rt.table_number = 'T2'
          AND b.customer_name = 'Test Customer'
        LIMIT 1;
        
        RAISE NOTICE 'Added test reservation for tomorrow 7 PM';
    END IF;
    
END $$;

-- Display the setup results
SELECT 
    'Business Info' as type,
    bt.id::text as id,
    bt.business_name as name,
    bt.slug as details,
    bt.industry_type as extra
FROM business_tenants bt 
WHERE bt.slug = 'spice-pavilion-melbourne'

UNION ALL

SELECT 
    'Tables' as type,
    rt.id::text as id,
    rt.table_number as name,
    rt.floor_area as details,
    rt.max_capacity::text as extra
FROM restaurant_tables rt 
JOIN business_tenants bt ON rt.business_id = bt.id
WHERE bt.slug = 'spice-pavilion-melbourne'

UNION ALL

SELECT 
    'Reservations' as type,
    b.id::text as id,
    b.customer_name as name,
    b.start_time::text as details,
    b.status as extra
FROM bookings b
JOIN business_tenants bt ON b.business_id = bt.id
WHERE bt.slug = 'spice-pavilion-melbourne'

ORDER BY type, id;