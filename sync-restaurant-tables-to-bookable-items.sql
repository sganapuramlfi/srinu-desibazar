-- Sync Restaurant Tables to Universal Bookable Items
-- This creates bookableItems entries for all existing restaurant tables

-- Step 1: Create bookable items for restaurant tables that don't have them yet
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
      WHEN rt.location_features IS NOT NULL THEN CONCAT(' • ', rt.location_features)
      ELSE ''
    END
  ) as description,
  120 as duration_minutes, -- Default 2 hour dining duration
  rt.base_price as price,
  14 as advance_booking_days, -- 2 weeks advance booking
  60 as min_booking_duration, -- 1 hour minimum
  240 as max_booking_duration, -- 4 hours maximum
  rt.is_active,
  NOW()
FROM restaurant_tables rt
WHERE NOT EXISTS (
  SELECT 1 FROM bookable_items bi 
  WHERE bi.item_type = 'restaurant_table' 
    AND bi.item_id = rt.id 
    AND bi.business_id = rt.business_id
);

-- Step 2: Update any existing bookable items that might be out of sync
UPDATE bookable_items 
SET 
  name = CONCAT('Table ', rt.table_number, 
    CASE 
      WHEN rt.floor_area IS NOT NULL THEN CONCAT(' (', rt.floor_area, ')') 
      ELSE '' 
    END
  ),
  description = CONCAT(
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
      WHEN rt.location_features IS NOT NULL THEN CONCAT(' • ', rt.location_features)
      ELSE ''
    END
  ),
  price = rt.base_price,
  is_active = rt.is_active
FROM restaurant_tables rt
WHERE bookable_items.item_type = 'restaurant_table'
  AND bookable_items.item_id = rt.id
  AND bookable_items.business_id = rt.business_id;

-- Step 3: Create function to automatically sync when restaurant tables are created/updated
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
          WHEN NEW.location_features IS NOT NULL THEN CONCAT(' • ', NEW.location_features)
          ELSE ''
        END
      ),
      120, -- 2 hours default
      NEW.base_price,
      14, -- 2 weeks advance
      60, -- 1 hour min
      240, -- 4 hours max
      NEW.is_active,
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
          WHEN NEW.location_features IS NOT NULL THEN CONCAT(' • ', NEW.location_features)
          ELSE ''
        END
      ),
      price = NEW.base_price,
      is_active = NEW.is_active
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

-- Step 4: Create trigger to keep restaurant tables and bookable items in sync
DROP TRIGGER IF EXISTS trigger_sync_restaurant_table_bookable_item ON restaurant_tables;
CREATE TRIGGER trigger_sync_restaurant_table_bookable_item
  AFTER INSERT OR UPDATE OR DELETE ON restaurant_tables
  FOR EACH ROW
  EXECUTE FUNCTION sync_restaurant_table_to_bookable_item();

-- Step 5: Verification and reporting
SELECT 'Restaurant table to bookable items sync completed!' as message;

SELECT 
  COUNT(*) as total_restaurant_tables,
  COUNT(CASE WHEN rt.is_active = true THEN 1 END) as active_tables
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
  bi.name as bookable_name,
  bi.description as bookable_description,
  bi.price as booking_price,
  bi.is_active as bookable_active
FROM restaurant_tables rt
JOIN bookable_items bi ON bi.item_type = 'restaurant_table' 
  AND bi.item_id = rt.id 
  AND bi.business_id = rt.business_id
LIMIT 5;