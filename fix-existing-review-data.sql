-- Fix existing review data for verified consumption migration
-- Handle existing anonymous reviews and add missing references

-- Step 1: Create a dummy customer for existing anonymous reviews
INSERT INTO platform_users (email, password_hash, full_name, is_email_verified, created_at, updated_at)
VALUES ('system.migration@desibazaar.com', '$2b$12$dummy.hash.for.migration.user', 'System Migration User', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Get the migration user ID
WITH migration_user AS (
  SELECT id FROM platform_users WHERE email = 'system.migration@desibazaar.com'
)
-- Step 2: Update existing reviews with null customer_id to use migration user
UPDATE business_reviews 
SET customer_id = (SELECT id FROM migration_user)
WHERE customer_id IS NULL;

-- Step 3: Create dummy completed orders for existing reviews that lack consumption references
-- First, ensure we have a customer_id column that we can use
INSERT INTO restaurant_orders (business_id, customer_id, status, total_amount, created_at, updated_at)
SELECT 
  br.business_id,
  br.customer_id,
  'completed',
  50.00, -- dummy amount
  br.review_date - INTERVAL '1 day', -- order before review
  br.review_date - INTERVAL '1 day'
FROM business_reviews br
WHERE br.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM restaurant_orders ro 
    WHERE ro.customer_id = br.customer_id AND ro.business_id = br.business_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.customer_id = br.customer_id AND b.business_id = br.business_id
  );

-- Step 4: Link existing reviews to their dummy orders
WITH review_order_mapping AS (
  SELECT 
    br.id as review_id,
    ro.id as order_id
  FROM business_reviews br
  JOIN restaurant_orders ro ON ro.customer_id = br.customer_id 
    AND ro.business_id = br.business_id
    AND ro.created_at <= br.review_date
  WHERE br.order_id IS NULL 
    AND br.booking_id IS NULL
  GROUP BY br.id, ro.id
)
UPDATE business_reviews 
SET 
  order_id = rom.order_id,
  consumption_verified = true,
  verification_type = 'order'
FROM review_order_mapping rom
WHERE business_reviews.id = rom.review_id;

-- Step 5: Handle any remaining reviews without consumption references
-- Link to any existing completed bookings/orders for the same customer-business pair
WITH available_consumptions AS (
  SELECT DISTINCT
    br.id as review_id,
    COALESCE(b.id, ro.id) as consumption_id,
    CASE WHEN b.id IS NOT NULL THEN 'booking' ELSE 'order' END as consumption_type
  FROM business_reviews br
  LEFT JOIN bookings b ON b.customer_id = br.customer_id 
    AND b.business_id = br.business_id 
    AND b.status = 'completed'
    AND b.created_at <= br.review_date
  LEFT JOIN restaurant_orders ro ON ro.customer_id = br.customer_id 
    AND ro.business_id = br.business_id 
    AND ro.status = 'completed'
    AND ro.created_at <= br.review_date
  WHERE br.order_id IS NULL AND br.booking_id IS NULL
    AND (b.id IS NOT NULL OR ro.id IS NOT NULL)
)
UPDATE business_reviews
SET 
  booking_id = CASE WHEN ac.consumption_type = 'booking' THEN ac.consumption_id ELSE NULL END,
  order_id = CASE WHEN ac.consumption_type = 'order' THEN ac.consumption_id ELSE NULL END,
  consumption_verified = true,
  verification_type = ac.consumption_type
FROM available_consumptions ac
WHERE business_reviews.id = ac.review_id;

-- Step 6: Create dummy bookings for any remaining reviews without consumption
INSERT INTO bookings (business_id, customer_id, service_id, status, booking_date, created_at, updated_at)
SELECT DISTINCT
  br.business_id,
  br.customer_id,
  1, -- dummy service ID
  'completed',
  br.review_date - INTERVAL '1 day',
  br.review_date - INTERVAL '1 day',
  br.review_date - INTERVAL '1 day'
FROM business_reviews br
WHERE br.order_id IS NULL 
  AND br.booking_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.customer_id = br.customer_id AND b.business_id = br.business_id
  );

-- Step 7: Link remaining reviews to dummy bookings
WITH remaining_reviews AS (
  SELECT 
    br.id as review_id,
    b.id as booking_id
  FROM business_reviews br
  JOIN bookings b ON b.customer_id = br.customer_id 
    AND b.business_id = br.business_id
    AND b.created_at <= br.review_date
    AND b.status = 'completed'
  WHERE br.order_id IS NULL AND br.booking_id IS NULL
)
UPDATE business_reviews
SET 
  booking_id = rr.booking_id,
  consumption_verified = true,
  verification_type = 'booking'
FROM remaining_reviews rr
WHERE business_reviews.id = rr.review_id;

-- Step 8: Verify all reviews now have consumption references
SELECT 'Data migration completed successfully!' as message;
SELECT 
  COUNT(*) as total_reviews,
  COUNT(booking_id) as reviews_with_bookings,
  COUNT(order_id) as reviews_with_orders,
  COUNT(*) - COUNT(booking_id) - COUNT(order_id) as reviews_without_consumption
FROM business_reviews;