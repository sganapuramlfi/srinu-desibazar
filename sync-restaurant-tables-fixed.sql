-- Fixed Restaurant Tables to Universal Bookable Items Sync
-- Using correct column names from the actual schema

-- Step 1: Create bookable items for restaurant tables
INSERT INTO bookable_items (
  business_id, 
  item_type, 
  item_id, 
  name, 
  description, 
  duration_minutes, 
  price, 
  advance_booking_days,
  min_booking_duration,
  max_booking_duration,
  is_active,
  created_at
)
SELECT DISTINCT
  rt.business_id,
  'restaurant_table'::text as item_type,
  rt.id as item_id,
  CONCAT('Table ', rt.table_number, 
    CASE 
      WHEN rt.floor_area IS NOT NULL THEN CONCAT(' (', rt.floor_area, ')') 
      ELSE '' 
    END
  ) as name,
  CONCAT(
    'Seats ', rt.min_capacity, 
    CASE 
      WHEN rt.max_capacity != rt.min_capacity THEN CONCAT('-', rt.max_capacity)
      ELSE ''
    END,
    ' guests',
    CASE 
      WHEN rt.table_shape IS NOT NULL THEN CONCAT(' • ', rt.table_shape, ' table')
      ELSE ''
    END,
    CASE 
      WHEN rt.has_window_view = true THEN ' • Window view'
      ELSE ''
    END,
    CASE 
      WHEN rt.is_booth = true THEN ' • Booth seating'
      ELSE ''
    END
  ) as description,
  120 as duration_minutes, -- Default 2 hour dining duration
  50.00 as price, -- Default table reservation fee
  14 as advance_booking_days, -- 2 weeks advance booking
  60 as min_booking_duration, -- 1 hour minimum
  240 as max_booking_duration, -- 4 hours maximum
  rt.is_active AND rt.is_reservable,
  NOW()
FROM restaurant_tables rt
WHERE NOT EXISTS (
  SELECT 1 FROM bookable_items bi 
  WHERE bi.item_type = 'restaurant_table' 
    AND bi.item_id = rt.id 
    AND bi.business_id = rt.business_id
);

-- Step 2: Update the trigger function with correct column names
CREATE OR REPLACE FUNCTION sync_restaurant_table_to_bookable_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO bookable_items (
      business_id, item_type, item_id, name, description, 
      duration_minutes, price, advance_booking_days,
      min_booking_duration, max_booking_duration, is_active, created_at
    ) VALUES (
      NEW.business_id,
      'restaurant_table',
      NEW.id,
      CONCAT('Table ', NEW.table_number, 
        CASE 
          WHEN NEW.floor_area IS NOT NULL THEN CONCAT(' (', NEW.floor_area, ')') 
          ELSE '' 
        END
      ),
      CONCAT(
        'Seats ', NEW.min_capacity, 
        CASE 
          WHEN NEW.max_capacity != NEW.min_capacity THEN CONCAT('-', NEW.max_capacity)
          ELSE ''
        END,
        ' guests',
        CASE 
          WHEN NEW.table_shape IS NOT NULL THEN CONCAT(' • ', NEW.table_shape, ' table')
          ELSE ''
        END,
        CASE 
          WHEN NEW.has_window_view = true THEN ' • Window view'
          ELSE ''
        END,
        CASE 
          WHEN NEW.is_booth = true THEN ' • Booth seating'
          ELSE ''
        END
      ),
      120, -- 2 hours default
      50.00, -- Default reservation fee
      14, -- 2 weeks advance
      60, -- 1 hour min
      240, -- 4 hours max
      NEW.is_active AND NEW.is_reservable,
      NOW()
    );
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    UPDATE bookable_items 
    SET 
      name = CONCAT('Table ', NEW.table_number, 
        CASE 
          WHEN NEW.floor_area IS NOT NULL THEN CONCAT(' (', NEW.floor_area, ')') 
          ELSE '' 
        END
      ),
      description = CONCAT(
        'Seats ', NEW.min_capacity, 
        CASE 
          WHEN NEW.max_capacity != NEW.min_capacity THEN CONCAT('-', NEW.max_capacity)
          ELSE ''
        END,
        ' guests',
        CASE 
          WHEN NEW.table_shape IS NOT NULL THEN CONCAT(' • ', NEW.table_shape, ' table')
          ELSE ''
        END,
        CASE 
          WHEN NEW.has_window_view = true THEN ' • Window view'
          ELSE ''
        END,
        CASE 
          WHEN NEW.is_booth = true THEN ' • Booth seating'
          ELSE ''
        END
      ),
      is_active = NEW.is_active AND NEW.is_reservable
    WHERE item_type = 'restaurant_table'
      AND item_id = NEW.id
      AND business_id = NEW.business_id;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE bookable_items 
    SET is_active = false
    WHERE item_type = 'restaurant_table'
      AND item_id = OLD.id
      AND business_id = OLD.business_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Verification and reporting
SELECT 'Fixed restaurant table sync completed!' as message;

SELECT 
  COUNT(*) as total_restaurant_tables,
  COUNT(CASE WHEN rt.is_active = true AND rt.is_reservable = true THEN 1 END) as reservable_tables
FROM restaurant_tables rt;

SELECT 
  COUNT(*) as total_bookable_restaurant_items,
  COUNT(CASE WHEN bi.is_active = true THEN 1 END) as active_bookable_items
FROM bookable_items bi 
WHERE bi.item_type = 'restaurant_table';

-- Sample of synced data
SELECT 
  rt.business_id,
  rt.table_number,
  rt.floor_area,
  CONCAT(rt.min_capacity, '-', rt.max_capacity) as capacity,
  rt.is_reservable,
  bi.name as bookable_name,
  bi.description as bookable_description,
  bi.is_active as bookable_active
FROM restaurant_tables rt
LEFT JOIN bookable_items bi ON bi.item_type = 'restaurant_table' 
  AND bi.item_id = rt.id 
  AND bi.business_id = rt.business_id
LIMIT 5;