-- Add sample restaurant tables for testing booking flow
-- First, let's check if we have any restaurant businesses

DO $$
DECLARE
    restaurant_business_id INTEGER;
BEGIN
    -- Get the first restaurant business
    SELECT id INTO restaurant_business_id 
    FROM business_tenants 
    WHERE industry_type = 'restaurant' 
    AND is_active = true
    LIMIT 1;
    
    IF restaurant_business_id IS NOT NULL THEN
        RAISE NOTICE 'Found restaurant business ID: %', restaurant_business_id;
        
        -- Check if tables already exist
        IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE business_id = restaurant_business_id) THEN
            RAISE NOTICE 'Adding sample tables...';
            
            -- Add sample restaurant tables
            INSERT INTO restaurant_tables (
                business_id, table_number, floor_area, min_capacity, max_capacity, 
                ideal_capacity, table_shape, is_booth, has_window_view, 
                is_wheelchair_accessible, is_reservable, is_active, created_at
            ) VALUES 
                (restaurant_business_id, 'T1', 'Main', 1, 2, 2, 'round', false, true, true, true, true, NOW()),
                (restaurant_business_id, 'T2', 'Main', 2, 4, 4, 'square', false, false, true, true, true, NOW()),
                (restaurant_business_id, 'T3', 'Main', 2, 4, 4, 'square', false, false, true, true, true, NOW()),
                (restaurant_business_id, 'T4', 'Main', 4, 6, 6, 'rectangle', false, false, true, true, true, NOW()),
                (restaurant_business_id, 'T5', 'Window', 1, 2, 2, 'round', false, true, true, true, true, NOW()),
                (restaurant_business_id, 'T6', 'Private', 6, 8, 8, 'rectangle', true, false, true, true, true, NOW()),
                (restaurant_business_id, 'T7', 'Patio', 2, 4, 4, 'round', false, false, true, true, true, NOW()),
                (restaurant_business_id, 'T8', 'Bar', 1, 3, 2, 'round', false, false, true, true, true, NOW());
            
            RAISE NOTICE 'Added 8 sample restaurant tables successfully!';
        ELSE
            RAISE NOTICE 'Tables already exist for this restaurant.';
        END IF;
    ELSE
        RAISE NOTICE 'No restaurant business found. Please create a restaurant business first.';
    END IF;
END $$;

-- Display the created tables
SELECT 
    bt.business_name,
    rt.table_number,
    rt.floor_area,
    rt.max_capacity,
    rt.has_window_view,
    rt.is_active
FROM restaurant_tables rt
JOIN business_tenants bt ON rt.business_id = bt.id
WHERE bt.industry_type = 'restaurant'
ORDER BY rt.table_number;