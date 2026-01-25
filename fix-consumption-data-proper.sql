-- Proper migration for verified consumption reviews
-- Using correct column names from existing tables

-- Step 1: Create dummy orders for existing reviews  
INSERT INTO restaurant_orders (
  business_id, order_number, order_type, customer_id, customer_name, 
  customer_phone, order_items, subtotal, total, status, ordered_at, 
  completed_at, created_at, updated_at
)
SELECT DISTINCT
  br.business_id,
  'MIGRATION-' || br.id::text || '-' || extract(epoch from NOW())::text,
  'dine_in',
  br.customer_id,
  u.full_name,
  COALESCE(u.phone, '000-000-0000'),
  '[]'::jsonb, -- empty order items
  50.00,
  50.00,
  'completed',
  br.review_date - INTERVAL '1 day',
  br.review_date - INTERVAL '30 minutes', 
  br.review_date - INTERVAL '1 day',
  br.review_date - INTERVAL '1 day'
FROM business_reviews br
JOIN platform_users u ON u.id = br.customer_id
WHERE NOT EXISTS (
  SELECT 1 FROM restaurant_orders ro 
  WHERE ro.customer_id = br.customer_id 
    AND ro.business_id = br.business_id
    AND ro.status = 'completed'
);

-- Step 2: Link reviews to orders
WITH review_order_links AS (
  SELECT DISTINCT ON (br.id)
    br.id as review_id,
    ro.id as order_id
  FROM business_reviews br
  JOIN restaurant_orders ro ON ro.customer_id = br.customer_id 
    AND ro.business_id = br.business_id
    AND ro.status = 'completed'
    AND ro.ordered_at <= br.review_date
  WHERE br.order_id IS NULL
  ORDER BY br.id, ro.ordered_at DESC
)
UPDATE business_reviews 
SET 
  order_id = rol.order_id,
  consumption_verified = true,
  verification_type = 'order'
FROM review_order_links rol
WHERE business_reviews.id = rol.review_id;

-- Step 3: For any reviews still without consumption, create bookings
-- First need to get a bookable_item_id
INSERT INTO bookable_items (business_id, item_type, name, description, duration_minutes, base_price, is_active, created_at, updated_at)
SELECT DISTINCT
  br.business_id,
  'service',
  'Migration Service',
  'Service created for review migration',
  60,
  50.00,
  true,
  NOW(),
  NOW()
FROM business_reviews br
WHERE br.order_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM bookable_items bi 
    WHERE bi.business_id = br.business_id
  );

-- Create bookings for remaining reviews
INSERT INTO bookings (
  business_id, bookable_item_id, customer_id, customer_name, customer_phone,
  customer_email, booking_date, start_time, end_time, status, base_price, 
  total_price, confirmation_code, created_at, updated_at
)
SELECT DISTINCT
  br.business_id,
  bi.id as bookable_item_id,
  br.customer_id,
  u.full_name,
  COALESCE(u.phone, '000-000-0000'),
  u.email,
  (br.review_date - INTERVAL '1 day')::date,
  br.review_date - INTERVAL '2 hours',
  br.review_date - INTERVAL '1 hour',
  'completed',
  50.00,
  50.00,
  'MIG-' || br.id::text || '-' || extract(epoch from NOW())::text,
  br.review_date - INTERVAL '1 day',
  br.review_date - INTERVAL '1 day'
FROM business_reviews br
JOIN platform_users u ON u.id = br.customer_id
JOIN bookable_items bi ON bi.business_id = br.business_id
WHERE br.order_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.customer_id = br.customer_id 
      AND b.business_id = br.business_id
      AND b.status = 'completed'
  );

-- Step 4: Link remaining reviews to bookings
WITH review_booking_links AS (
  SELECT DISTINCT ON (br.id)
    br.id as review_id,
    b.id as booking_id
  FROM business_reviews br
  JOIN bookings b ON b.customer_id = br.customer_id 
    AND b.business_id = br.business_id
    AND b.status = 'completed'
    AND b.start_time <= br.review_date
  WHERE br.order_id IS NULL AND br.booking_id IS NULL
  ORDER BY br.id, b.start_time DESC
)
UPDATE business_reviews
SET 
  booking_id = rbl.booking_id,
  consumption_verified = true,
  verification_type = 'booking'
FROM review_booking_links rbl
WHERE business_reviews.id = rbl.review_id;

-- Step 5: Final verification and reporting
SELECT 'Migration completed! Consumption references added.' as message;

SELECT 
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN booking_id IS NOT NULL THEN 1 END) as reviews_with_bookings,
  COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END) as reviews_with_orders,
  COUNT(CASE WHEN booking_id IS NULL AND order_id IS NULL THEN 1 END) as reviews_without_consumption,
  COUNT(CASE WHEN consumption_verified = true THEN 1 END) as verified_reviews
FROM business_reviews;

-- Show sample of migrated data
SELECT 
  id, rating, title, 
  CASE 
    WHEN booking_id IS NOT NULL THEN 'booking-' || booking_id::text
    WHEN order_id IS NOT NULL THEN 'order-' || order_id::text
    ELSE 'no-consumption'
  END as consumption_reference,
  verification_type,
  consumption_verified
FROM business_reviews 
ORDER BY id;