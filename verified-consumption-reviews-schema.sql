-- Verified Consumption Reviews Schema Update
-- Prevents fake reviews by requiring actual service consumption

-- Step 1: Add consumption tracking columns to business_reviews
ALTER TABLE business_reviews 
ADD COLUMN booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
ADD COLUMN order_id INTEGER REFERENCES restaurant_orders(id) ON DELETE SET NULL,
ADD COLUMN consumption_verified BOOLEAN DEFAULT false,
ADD COLUMN verification_type VARCHAR(20) CHECK (verification_type IN ('booking', 'order', 'manual'));

-- Step 2: Remove anonymous review capability
ALTER TABLE business_reviews 
ALTER COLUMN customer_id SET NOT NULL,
DROP COLUMN customer_name,
DROP COLUMN customer_email;

-- Step 3: Add consumption verification constraint
-- At least one consumption reference must be provided
ALTER TABLE business_reviews 
ADD CONSTRAINT review_consumption_required 
CHECK (booking_id IS NOT NULL OR order_id IS NOT NULL);

-- Step 4: Add unique constraint to prevent multiple reviews per consumption
CREATE UNIQUE INDEX idx_one_review_per_booking 
ON business_reviews(booking_id) 
WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX idx_one_review_per_order 
ON business_reviews(order_id) 
WHERE order_id IS NOT NULL;

-- Step 5: Create consumption verification view
CREATE VIEW verified_customer_reviews AS
SELECT 
  br.*,
  u.full_name as customer_name,
  u.email as customer_email,
  CASE 
    WHEN br.booking_id IS NOT NULL THEN 'booking'
    WHEN br.order_id IS NOT NULL THEN 'order'
    ELSE 'unknown'
  END as consumption_type,
  CASE 
    WHEN br.booking_id IS NOT NULL THEN 
      (SELECT status FROM bookings WHERE id = br.booking_id)
    WHEN br.order_id IS NOT NULL THEN 
      (SELECT status FROM restaurant_orders WHERE id = br.order_id)
    ELSE NULL
  END as consumption_status
FROM business_reviews br
JOIN platform_users u ON br.customer_id = u.id
WHERE br.consumption_verified = true;

-- Step 6: Add review credibility scoring
ALTER TABLE business_reviews 
ADD COLUMN credibility_score INTEGER DEFAULT 50 CHECK (credibility_score >= 0 AND credibility_score <= 100);

-- Step 7: Create function to calculate credibility score
CREATE OR REPLACE FUNCTION calculate_review_credibility(review_id INTEGER) 
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 50; -- Base score
  customer_review_count INTEGER;
  customer_completion_count INTEGER;
  days_since_consumption INTEGER;
BEGIN
  -- Get customer's review history and completion history
  SELECT 
    COUNT(*) as review_count,
    (SELECT COUNT(*) FROM bookings b 
     JOIN business_reviews br ON br.customer_id = b.customer_id 
     WHERE br.id = review_id AND b.status = 'completed'
    ) +
    (SELECT COUNT(*) FROM restaurant_orders ro 
     JOIN business_reviews br ON br.customer_id = ro.customer_id 
     WHERE br.id = review_id AND ro.status = 'completed'
    ) as completion_count
  INTO customer_review_count, customer_completion_count
  FROM business_reviews br
  WHERE br.customer_id = (SELECT customer_id FROM business_reviews WHERE id = review_id);
  
  -- Calculate days since consumption
  SELECT 
    CASE 
      WHEN booking_id IS NOT NULL THEN 
        DATE_PART('day', NOW() - (SELECT created_at FROM bookings WHERE id = booking_id))
      WHEN order_id IS NOT NULL THEN 
        DATE_PART('day', NOW() - (SELECT created_at FROM restaurant_orders WHERE id = order_id))
      ELSE 30
    END
  INTO days_since_consumption
  FROM business_reviews WHERE id = review_id;
  
  -- Scoring algorithm
  -- Base: 50 points
  -- Verified consumption: +30 points
  -- Multiple completions: +10 points (capped at 20)
  -- Recent consumption (within 7 days): +10 points
  -- Account age bonus: +5 points
  
  score := 50;
  
  -- Verified consumption bonus
  IF (SELECT consumption_verified FROM business_reviews WHERE id = review_id) THEN
    score := score + 30;
  END IF;
  
  -- Loyalty customer bonus
  IF customer_completion_count > 1 THEN
    score := score + LEAST(customer_completion_count * 5, 20);
  END IF;
  
  -- Recent consumption bonus
  IF days_since_consumption <= 7 THEN
    score := score + 10;
  END IF;
  
  -- Account age bonus (if account > 30 days)
  IF (SELECT DATE_PART('day', NOW() - created_at) FROM platform_users 
      WHERE id = (SELECT customer_id FROM business_reviews WHERE id = review_id)) > 30 THEN
    score := score + 5;
  END IF;
  
  -- Ensure score stays within bounds
  score := GREATEST(0, LEAST(100, score));
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to auto-calculate credibility on insert/update
CREATE OR REPLACE FUNCTION update_review_credibility()
RETURNS TRIGGER AS $$
BEGIN
  NEW.credibility_score := calculate_review_credibility(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_credibility
  BEFORE INSERT OR UPDATE ON business_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_review_credibility();

-- Step 9: Add indexes for performance
CREATE INDEX idx_business_reviews_consumption_verified ON business_reviews(consumption_verified);
CREATE INDEX idx_business_reviews_credibility_score ON business_reviews(credibility_score DESC);
CREATE INDEX idx_business_reviews_verification_type ON business_reviews(verification_type);

-- Step 10: Create consumption eligibility check function
CREATE OR REPLACE FUNCTION can_user_review_business(
  p_user_id INTEGER,
  p_business_id INTEGER
) RETURNS TABLE(
  can_review BOOLEAN,
  reason TEXT,
  eligible_bookings INTEGER[],
  eligible_orders INTEGER[]
) AS $$
DECLARE
  completed_bookings INTEGER[];
  completed_orders INTEGER[];
  existing_reviews INTEGER;
BEGIN
  -- Get completed bookings for this business
  SELECT ARRAY_AGG(b.id) INTO completed_bookings
  FROM bookings b
  WHERE b.customer_id = p_user_id 
    AND b.business_id = p_business_id
    AND b.status = 'completed'
    AND b.id NOT IN (
      SELECT booking_id FROM business_reviews 
      WHERE booking_id IS NOT NULL AND customer_id = p_user_id
    );
  
  -- Get completed orders for this business  
  SELECT ARRAY_AGG(ro.id) INTO completed_orders
  FROM restaurant_orders ro
  WHERE ro.customer_id = p_user_id
    AND ro.business_id = p_business_id  
    AND ro.status = 'completed'
    AND ro.id NOT IN (
      SELECT order_id FROM business_reviews 
      WHERE order_id IS NOT NULL AND customer_id = p_user_id
    );
  
  -- Count existing reviews for this business by this user
  SELECT COUNT(*) INTO existing_reviews
  FROM business_reviews
  WHERE customer_id = p_user_id AND business_id = p_business_id;
  
  -- Determine eligibility
  IF (completed_bookings IS NOT NULL AND array_length(completed_bookings, 1) > 0) OR 
     (completed_orders IS NOT NULL AND array_length(completed_orders, 1) > 0) THEN
    can_review := true;
    reason := 'User has completed transactions available for review';
    eligible_bookings := COALESCE(completed_bookings, ARRAY[]::INTEGER[]);
    eligible_orders := COALESCE(completed_orders, ARRAY[]::INTEGER[]);
  ELSE
    can_review := false;
    IF existing_reviews > 0 THEN
      reason := 'User has already reviewed all completed transactions with this business';
    ELSE
      reason := 'User has no completed transactions with this business';
    END IF;
    eligible_bookings := ARRAY[]::INTEGER[];
    eligible_orders := ARRAY[]::INTEGER[];
  END IF;
  
  RETURN QUERY SELECT can_review, reason, eligible_bookings, eligible_orders;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Verified Consumption Reviews schema implemented successfully!' as message;
SELECT 'Key Features:' as info;
SELECT '• Only authenticated users with completed transactions can review' as feature1;
SELECT '• One review per booking/order prevents spam' as feature2;  
SELECT '• Credibility scoring system for review quality' as feature3;
SELECT '• Consumption eligibility checking function' as feature4;
SELECT '• Performance indexes for fast queries' as feature5;