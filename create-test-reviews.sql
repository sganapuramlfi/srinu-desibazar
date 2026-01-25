-- Create Test Review Data for Mumbai Spice Kitchen
-- This script creates sample reviews and templates for testing the review management system

-- Insert sample business reviews
INSERT INTO business_reviews (
  business_id, customer_id, rating, title, comment, customer_name, customer_email,
  source, is_verified, is_published, response_status, review_date, created_at, updated_at
) VALUES
-- 5-star reviews
(1, NULL, 5, 'Amazing Food and Service!', 'Had an incredible dining experience at Mumbai Spice Kitchen. The butter chicken was absolutely divine and the staff were so friendly. Will definitely be coming back!', 'Sarah Johnson', 'sarah.johnson@email.com', 'platform', true, true, 'pending', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

(1, NULL, 5, 'Best Indian Food in Melbourne', 'Authentic flavors, generous portions, and excellent service. The biryani was perfectly spiced and the naan was fresh from the tandoor. Highly recommend!', 'Michael Chen', 'michael.chen@email.com', 'google', true, true, 'responded', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

-- 4-star reviews  
(1, NULL, 4, 'Great food, could improve ambiance', 'The food was excellent - we tried the lamb vindaloo and palak paneer. Both were delicious. The restaurant could use some decoration improvements but overall a good experience.', 'Emma Davis', 'emma.davis@email.com', 'platform', false, true, 'pending', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

(1, NULL, 4, 'Solid Indian Restaurant', 'Good quality food with reasonable prices. The samosas were crispy and the lassi was refreshing. Service was a bit slow but worth the wait.', 'James Wilson', 'james.wilson@email.com', 'facebook', false, true, 'responded', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

-- 3-star reviews
(1, NULL, 3, 'Average experience', 'Food was okay but not exceptional. The chicken tikka was a bit dry and the service could have been more attentive. Price was reasonable though.', 'Lisa Zhang', 'lisa.zhang@email.com', 'platform', false, true, 'pending', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

-- 2-star reviews
(1, NULL, 2, 'Disappointing visit', 'Had high expectations but was let down. The food took very long to arrive and when it did, it was lukewarm. The curry lacked flavor and the naan was tough.', 'Robert Brown', 'robert.brown@email.com', 'google', false, true, 'flagged', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

-- 1-star review
(1, NULL, 1, 'Terrible experience', 'Worst Indian food I have ever had. The service was rude, food was cold, and the restaurant was dirty. Would not recommend to anyone.', 'Anonymous Customer', NULL, 'platform', false, true, 'pending', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days')

ON CONFLICT DO NOTHING;

-- Add business responses to some reviews
UPDATE business_reviews SET 
  business_response = 'Thank you so much for your wonderful review, Sarah! We are thrilled that you enjoyed your dining experience with us. The butter chicken is indeed one of our signature dishes, and we are delighted it met your expectations. We look forward to welcoming you back soon!',
  responded_at = NOW() - INTERVAL '4 days',
  responded_by = 1,
  response_status = 'responded'
WHERE business_id = 1 AND customer_name = 'Michael Chen';

UPDATE business_reviews SET
  business_response = 'Thank you for your feedback, James. We appreciate you taking the time to review us. We are working on improving our service speed and are glad you found the food quality and prices reasonable. We hope to serve you again soon with even better service!',
  responded_at = NOW() - INTERVAL '6 days', 
  responded_by = 1,
  response_status = 'responded'
WHERE business_id = 1 AND customer_name = 'James Wilson';

-- Flag inappropriate review
UPDATE business_reviews SET
  response_status = 'flagged',
  flag_reason = 'Inappropriate language and potentially fake review',
  flagged_at = NOW() - INTERVAL '3 days',
  flagged_by = 1
WHERE business_id = 1 AND customer_name = 'Robert Brown';

-- Insert review response templates
INSERT INTO review_templates (
  business_id, name, category, template, description, usage_count, is_active, created_at, updated_at
) VALUES
-- Positive response templates
(1, 'Thank You - Positive', 'positive', 'Thank you so much for your wonderful review! We are thrilled that you enjoyed your dining experience with us. We look forward to welcoming you back soon!', 'Standard response for positive reviews', 2, true, NOW(), NOW()),

(1, 'Signature Dish Appreciation', 'compliment', 'We are delighted that you enjoyed our [DISH NAME]! It is indeed one of our signature dishes, prepared with authentic spices and traditional techniques. Thank you for recognizing our efforts, and we hope to serve you again soon!', 'For reviews that mention specific signature dishes', 1, true, NOW(), NOW()),

-- Negative response templates  
(1, 'Apologetic - Service Issues', 'complaint', 'We sincerely apologize for the service issues you experienced during your visit. This does not reflect our usual standards, and we are taking immediate steps to address these concerns. We would love the opportunity to make this right - please contact us directly so we can arrange a complimentary meal for you.', 'For complaints about slow or poor service', 0, true, NOW(), NOW()),

(1, 'Food Quality Apology', 'negative', 'We are truly sorry that your meal did not meet your expectations. Food quality is our top priority, and we take your feedback very seriously. We would appreciate the opportunity to discuss this further and invite you back for a better experience. Please reach out to us directly.', 'For complaints about food quality', 0, true, NOW(), NOW()),

-- Neutral response templates
(1, 'Thank You - Constructive Feedback', 'neutral', 'Thank you for your honest feedback. We appreciate both the positive comments and the areas you have identified for improvement. Your suggestions help us continue to enhance our service and dining experience for all our guests.', 'For balanced reviews with both praise and criticism', 0, true, NOW(), NOW()),

(1, 'Thank You - General', 'neutral', 'Thank you for taking the time to review Mumbai Spice Kitchen. We appreciate your feedback and are glad you chose to dine with us. We hope to see you again soon!', 'Generic thank you for any review', 0, true, NOW(), NOW())

ON CONFLICT DO NOTHING;

-- Create initial review analytics entry
INSERT INTO review_analytics (
  business_id, average_rating, total_reviews, five_star_count, four_star_count, 
  three_star_count, two_star_count, one_star_count, total_responses, response_rate,
  platform_reviews, google_reviews, facebook_reviews, period_type, period_start, 
  period_end, last_calculated, created_at, updated_at
) VALUES (
  1, 
  (SELECT ROUND(AVG(rating), 2) FROM business_reviews WHERE business_id = 1),
  (SELECT COUNT(*) FROM business_reviews WHERE business_id = 1),
  (SELECT COUNT(*) FROM business_reviews WHERE business_id = 1 AND rating = 5),
  (SELECT COUNT(*) FROM business_reviews WHERE business_id = 1 AND rating = 4),
  (SELECT COUNT(*) FROM business_reviews WHERE business_id = 1 AND rating = 3),
  (SELECT COUNT(*) FROM business_reviews WHERE business_id = 1 AND rating = 2),
  (SELECT COUNT(*) FROM business_reviews WHERE business_id = 1 AND rating = 1),
  (SELECT COUNT(*) FROM business_reviews WHERE business_id = 1 AND business_response IS NOT NULL),
  (SELECT ROUND((COUNT(CASE WHEN business_response IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)), 2) FROM business_reviews WHERE business_id = 1),
  (SELECT COUNT(*) FROM business_reviews WHERE business_id = 1 AND source = 'platform'),
  (SELECT COUNT(*) FROM business_reviews WHERE business_id = 1 AND source = 'google'), 
  (SELECT COUNT(*) FROM business_reviews WHERE business_id = 1 AND source = 'facebook'),
  'all_time',
  NULL,
  NULL,
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Display results
SELECT 'Mumbai Spice Kitchen review test data created successfully!' as message;
SELECT 'Business ID: 1' as business_info;
SELECT COUNT(*) as total_reviews FROM business_reviews WHERE business_id = 1;
SELECT COUNT(*) as review_templates FROM review_templates WHERE business_id = 1;
SELECT COUNT(*) as reviews_with_responses FROM business_reviews WHERE business_id = 1 AND business_response IS NOT NULL;
SELECT ROUND(AVG(rating), 2) as average_rating FROM business_reviews WHERE business_id = 1;