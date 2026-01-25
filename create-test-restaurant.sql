-- Create Restaurant Test Data for Order Management Testing
-- This script creates a complete restaurant with menu items for testing

-- Insert test restaurant business (if not exists)
INSERT INTO business_tenants (
  name, 
  slug, 
  industry_type, 
  description, 
  status,
  contact_info,
  operating_hours,
  amenities,
  address_line1,
  city,
  state,
  postal_code,
  country,
  published_sections,
  storefront_settings,
  onboarding_completed,
  is_verified,
  created_at,
  updated_at
) VALUES (
  'Mumbai Spice Kitchen',
  'mumbai-spice-kitchen',
  'restaurant',
  'Authentic Indian cuisine with modern touch - Perfect for testing order management',
  'active',
  '{"phone": "+61-3-9876-5432", "email": "orders@mumbaispice.com.au", "whatsapp": "+61-3-9876-5432", "address": "123 Collins Street, Melbourne VIC 3000"}',
  '{"monday": {"open": "11:00", "close": "22:00"}, "tuesday": {"open": "11:00", "close": "22:00"}, "wednesday": {"open": "11:00", "close": "22:00"}, "thursday": {"open": "11:00", "close": "22:00"}, "friday": {"open": "11:00", "close": "23:00"}, "saturday": {"open": "11:00", "close": "23:00"}, "sunday": {"open": "11:00", "close": "21:00"}}',
  '["parking", "wifi", "wheelchair_access", "takeaway", "delivery"]',
  '123 Collins Street',
  'Melbourne',
  'Victoria',
  '3000',
  'Australia',
  '["menu", "services", "gallery", "reviews", "bookings", "tables"]',
  '{"showReviews": true, "showGallery": true, "showContactInfo": true, "showSocialMedia": true, "showOperatingHours": true, "theme": "default"}',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Get the business ID (assumes it's ID 1 for simplicity)
-- In production, you'd use a proper sequence or return the ID

-- Insert menu categories
INSERT INTO restaurant_menu_categories (business_id, name, description, display_order, is_active, created_at) VALUES
(1, 'Appetizers', 'Start your meal with our delicious appetizers', 1, true, NOW()),
(1, 'Main Courses', 'Our signature main dishes', 2, true, NOW()),
(1, 'Breads & Rice', 'Freshly baked breads and aromatic rice dishes', 3, true, NOW()),
(1, 'Beverages', 'Refreshing drinks and traditional beverages', 4, true, NOW()),
(1, 'Desserts', 'Sweet endings to your meal', 5, true, NOW())
ON CONFLICT DO NOTHING;

-- Insert menu items for testing orders
INSERT INTO restaurant_menu_items (
  business_id, category_id, name, description, price, prep_time_minutes, 
  spice_level, dietary_tags, allergens, in_stock, is_featured, display_order, created_at
) VALUES
-- Appetizers (category_id = 1)
(1, 1, 'Vegetable Samosa (2pcs)', 'Crispy pastry filled with spiced potatoes and peas', '8.90', 10, 2, '["vegetarian"]', '["gluten"]', true, true, 1, NOW()),
(1, 1, 'Chicken Tikka Starter', 'Marinated chicken pieces grilled in tandoor', '16.90', 15, 3, '["halal"]', '[]', true, false, 2, NOW()),
(1, 1, 'Onion Bhaji (4pcs)', 'Deep fried onion fritters with Indian spices', '9.90', 12, 2, '["vegetarian", "vegan"]', '["gluten"]', true, false, 3, NOW()),

-- Main Courses (category_id = 2)  
(1, 2, 'Butter Chicken', 'Tender chicken in rich, creamy tomato sauce', '24.90', 20, 2, '["halal"]', '["dairy"]', true, true, 1, NOW()),
(1, 2, 'Lamb Vindaloo', 'Spicy lamb curry with potatoes in tangy sauce', '28.90', 25, 4, '["halal"]', '[]', true, false, 2, NOW()),
(1, 2, 'Palak Paneer', 'Cottage cheese in creamy spinach gravy', '22.90', 18, 2, '["vegetarian"]', '["dairy"]', true, true, 3, NOW()),
(1, 2, 'Chicken Biryani', 'Fragrant basmati rice with spiced chicken', '26.90', 30, 3, '["halal"]', '[]', true, true, 4, NOW()),
(1, 2, 'Dal Makhani', 'Creamy black lentils slow-cooked with butter', '19.90', 15, 1, '["vegetarian"]', '["dairy"]', true, false, 5, NOW()),

-- Breads & Rice (category_id = 3)
(1, 3, 'Plain Naan', 'Traditional leavened bread baked in tandoor', '4.50', 8, 0, '["vegetarian"]', '["gluten", "dairy"]', true, false, 1, NOW()),
(1, 3, 'Garlic Naan', 'Naan bread topped with fresh garlic and herbs', '5.50', 8, 1, '["vegetarian"]', '["gluten", "dairy"]', true, true, 2, NOW()),
(1, 3, 'Cheese Naan', 'Naan stuffed with melted cheese', '7.50', 10, 0, '["vegetarian"]', '["gluten", "dairy"]', true, false, 3, NOW()),
(1, 3, 'Basmati Rice', 'Fragrant long-grain basmati rice', '4.90', 15, 0, '["vegetarian", "vegan", "gluten-free"]', '[]', true, false, 4, NOW()),

-- Beverages (category_id = 4)
(1, 4, 'Mango Lassi', 'Sweet yogurt drink with fresh mango', '6.90', 3, 0, '["vegetarian"]', '["dairy"]', true, true, 1, NOW()),
(1, 4, 'Masala Chai', 'Spiced Indian tea with milk', '4.90', 5, 1, '["vegetarian"]', '["dairy"]', true, false, 2, NOW()),
(1, 4, 'Fresh Lime Soda', 'Refreshing lime drink with soda water', '5.90', 2, 0, '["vegetarian", "vegan"]', '[]', true, false, 3, NOW()),

-- Desserts (category_id = 5)
(1, 5, 'Gulab Jamun (2pcs)', 'Soft milk dumplings in sweet syrup', '8.90', 5, 0, '["vegetarian"]', '["dairy"]', true, true, 1, NOW()),
(1, 5, 'Kulfi', 'Traditional Indian ice cream with pistachios', '7.90', 2, 0, '["vegetarian"]', '["dairy", "nuts"]', true, false, 2, NOW())
ON CONFLICT DO NOTHING;

-- Insert restaurant tables for reservations
INSERT INTO restaurant_tables (
  business_id, table_number, floor_area, min_capacity, max_capacity, 
  ideal_capacity, table_shape, is_booth, has_window_view, 
  is_wheelchair_accessible, is_reservable, is_active, created_at
) VALUES
(1, 'T01', 'Main Dining', 1, 2, 2, 'round', false, false, true, true, true, NOW()),
(1, 'T02', 'Main Dining', 2, 4, 4, 'square', false, false, true, true, true, NOW()),
(1, 'T03', 'Main Dining', 4, 6, 6, 'rectangle', false, false, true, true, true, NOW()),
(1, 'T04', 'Window Section', 2, 4, 4, 'round', false, true, true, true, true, NOW()),
(1, 'T05', 'Window Section', 4, 6, 6, 'rectangle', false, true, true, true, true, NOW()),
(1, 'B01', 'Private Area', 4, 8, 6, 'rectangle', true, false, true, true, true, NOW()),
(1, 'B02', 'Private Area', 6, 10, 8, 'rectangle', true, false, true, true, true, NOW()),
(1, 'P01', 'Patio', 2, 4, 4, 'round', false, true, false, true, true, NOW()),
(1, 'P02', 'Patio', 4, 6, 6, 'rectangle', false, true, false, true, true, NOW())
ON CONFLICT DO NOTHING;

-- Create a test business access entry (assuming user ID 1 exists)
-- This allows testing with authentication
INSERT INTO business_access (business_id, user_id, role, permissions, is_active, granted_at) VALUES
(1, 1, 'owner', '{"orders": "full", "tables": "full", "menu": "full", "staff": "full", "analytics": "full"}', true, NOW())
ON CONFLICT DO NOTHING;

-- Insert some sample orders for testing analytics
INSERT INTO restaurant_orders (
  business_id, order_number, order_type, customer_name, customer_phone, order_items, 
  subtotal, tax, delivery_fee, tip, total, status, ordered_at, estimated_ready_at, created_at
) VALUES
(1, 'ORD-20250104-001', 'dine_in', 'John Smith', '+61-412-345-678', 
 '[{"item_id": 4, "name": "Butter Chicken", "quantity": 1, "price": "24.90", "modifications": ["Mild spice"]}, {"item_id": 10, "name": "Garlic Naan", "quantity": 2, "price": "5.50", "modifications": []}]', 
 '35.90', '3.59', '0.00', '0.00', '39.49', 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 hours'),

(1, 'ORD-20250104-002', 'takeout', 'Sarah Johnson', '+61-423-456-789', 
 '[{"item_id": 6, "name": "Palak Paneer", "quantity": 1, "price": "22.90", "modifications": []}, {"item_id": 13, "name": "Basmati Rice", "quantity": 1, "price": "4.90", "modifications": []}]', 
 '27.80', '2.78', '0.00', '0.00', '30.58', 'ready', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '30 minutes'),

(1, 'ORD-20250104-003', 'delivery', 'Mike Wilson', '+61-434-567-890', 
 '[{"item_id": 7, "name": "Chicken Biryani", "quantity": 1, "price": "26.90", "modifications": ["Extra spicy"]}, {"item_id": 14, "name": "Mango Lassi", "quantity": 2, "price": "6.90", "modifications": []}]', 
 '40.70', '4.07', '5.00', '0.00', '49.77', 'preparing', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '15 minutes'),

(1, 'ORD-20250104-004', 'dine_in', 'Emma Davis', '+61-445-678-901', 
 '[{"item_id": 1, "name": "Vegetable Samosa (2pcs)", "quantity": 1, "price": "8.90", "modifications": []}, {"item_id": 5, "name": "Lamb Vindaloo", "quantity": 1, "price": "28.90", "modifications": ["Medium spice"]}]', 
 '37.80', '3.78', '0.00', '0.00', '41.58', 'received', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '20 minutes', NOW() - INTERVAL '5 minutes')
ON CONFLICT DO NOTHING;

-- Display success message
SELECT 'Mumbai Spice Kitchen test data created successfully!' as message;
SELECT 'Restaurant ID: 1' as restaurant_info;
SELECT COUNT(*) as menu_categories FROM restaurant_menu_categories WHERE business_id = 1;
SELECT COUNT(*) as menu_items FROM restaurant_menu_items WHERE business_id = 1;
SELECT COUNT(*) as tables FROM restaurant_tables WHERE business_id = 1;
SELECT COUNT(*) as sample_orders FROM restaurant_orders WHERE business_id = 1;