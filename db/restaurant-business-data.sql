-- RESTAURANT BUSINESS DATA LAYER
-- Business-isolated data that belongs to specific restaurant businesses

-- =============================================================================
-- RESTAURANT MENU MANAGEMENT (Business-specific)
-- =============================================================================

CREATE TABLE restaurant_menu_categories (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Category details
  name TEXT NOT NULL, -- "Appetizers", "Mains", "Desserts", "Beverages"
  description TEXT,
  display_order INTEGER DEFAULT 0,
  
  -- Category settings
  is_active BOOLEAN DEFAULT TRUE,
  available_days JSONB DEFAULT '[]', -- ["monday", "tuesday"] - if category has limited availability
  available_time_start TIME, -- "17:00" for dinner-only categories
  available_time_end TIME,   -- "22:00"
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Tenant isolation
  CONSTRAINT restaurant_menu_categories_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'restaurant')
  )
);

CREATE TABLE restaurant_menu_items (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  category_id INTEGER REFERENCES restaurant_menu_categories(id) ON DELETE CASCADE,
  
  -- Item details
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  
  -- Restaurant-specific attributes
  preparation_time_minutes INTEGER,
  calories INTEGER,
  spice_level INTEGER CHECK (spice_level BETWEEN 0 AND 5),
  portion_size TEXT, -- "small", "regular", "large"
  
  -- Dietary information
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  is_halal BOOLEAN DEFAULT FALSE,
  is_kosher BOOLEAN DEFAULT FALSE,
  contains_allergens JSONB DEFAULT '[]', -- ["nuts", "dairy", "shellfish"]
  
  -- Availability & inventory
  is_available BOOLEAN DEFAULT TRUE,
  available_days JSONB DEFAULT '[]', -- If item has limited availability
  available_time_start TIME,
  available_time_end TIME,
  
  -- Inventory management
  stock_quantity INTEGER,
  is_unlimited_stock BOOLEAN DEFAULT TRUE,
  low_stock_threshold INTEGER DEFAULT 5,
  
  -- Display settings
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_spicy BOOLEAN DEFAULT FALSE,
  is_chef_special BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Tenant isolation
  CONSTRAINT restaurant_menu_items_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'restaurant')
  )
);

-- =============================================================================
-- RESTAURANT TABLES & SEATING (Business-specific)
-- =============================================================================

CREATE TABLE restaurant_tables (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Table details
  table_number TEXT NOT NULL,
  seating_capacity INTEGER NOT NULL,
  table_type TEXT, -- "booth", "round", "square", "bar", "outdoor"
  location_description TEXT, -- "Window side", "Private corner", "Patio"
  
  -- Table features
  has_high_chair BOOLEAN DEFAULT FALSE,
  has_wheelchair_access BOOLEAN DEFAULT TRUE,
  is_reservable BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Pricing (if different rates for different tables)
  minimum_spend DECIMAL(10,2),
  reservation_fee DECIMAL(10,2) DEFAULT 0.00,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique table numbers per business
  UNIQUE(business_id, table_number),
  
  -- Tenant isolation
  CONSTRAINT restaurant_tables_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'restaurant')
  )
);

-- =============================================================================
-- RESTAURANT RESERVATIONS (Business-specific)
-- =============================================================================

CREATE TABLE restaurant_reservations (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  
  -- Customer details
  customer_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- Reservation details
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL,
  duration_minutes INTEGER DEFAULT 120, -- Typical dining duration
  
  -- Special requirements
  special_requests TEXT,
  dietary_restrictions JSONB DEFAULT '[]',
  occasion TEXT, -- "birthday", "anniversary", "business_meeting"
  
  -- Reservation management
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  confirmation_code TEXT UNIQUE,
  
  -- Financial
  deposit_required DECIMAL(10,2) DEFAULT 0.00,
  deposit_paid DECIMAL(10,2) DEFAULT 0.00,
  
  -- Staff notes
  internal_notes TEXT,
  seating_preferences TEXT, -- "window", "quiet", "near_kitchen"
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Tenant isolation
  CONSTRAINT restaurant_reservations_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'restaurant')
  )
);

-- =============================================================================
-- RESTAURANT ORDERS (Delivery/Pickup/Dine-in)
-- =============================================================================

CREATE TABLE restaurant_orders (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Customer details
  customer_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- Order type and details
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'pickup', 'delivery')),
  table_id INTEGER REFERENCES restaurant_tables(id), -- For dine-in orders
  
  -- Delivery information (if applicable)
  delivery_address JSONB, -- {"street": "", "city": "", "postal_code": ""}
  delivery_instructions TEXT,
  delivery_fee DECIMAL(10,2) DEFAULT 0.00,
  
  -- Order items
  order_items JSONB NOT NULL, -- [{"menu_item_id": 1, "quantity": 2, "price": 15.99, "special_instructions": ""}]
  
  -- Financial summary
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  tip_amount DECIMAL(10,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Order timing
  order_time TIMESTAMP DEFAULT NOW(),
  requested_time TIMESTAMP, -- When customer wants the order
  estimated_ready_time TIMESTAMP,
  actual_ready_time TIMESTAMP,
  delivered_time TIMESTAMP,
  
  -- Order status
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled')),
  
  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_method TEXT, -- "cash", "card", "online"
  
  -- Staff notes
  kitchen_notes TEXT,
  delivery_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Tenant isolation
  CONSTRAINT restaurant_orders_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'restaurant')
  )
);

-- =============================================================================
-- RESTAURANT STAFF (Business-specific)
-- =============================================================================

CREATE TABLE restaurant_staff (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  
  -- Staff details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Restaurant-specific roles
  position TEXT NOT NULL CHECK (position IN ('manager', 'head_chef', 'sous_chef', 'cook', 'server', 'host', 'bartender', 'cashier', 'delivery_driver')),
  experience_level TEXT CHECK (experience_level IN ('junior', 'intermediate', 'senior')),
  
  -- Employment details
  hourly_rate DECIMAL(10,2),
  salary_annual DECIMAL(10,2),
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'seasonal')),
  
  -- Work availability
  available_days JSONB DEFAULT '[]', -- ["monday", "tuesday", "wednesday"]
  preferred_shifts JSONB DEFAULT '[]', -- ["morning", "afternoon", "evening"]
  
  -- Skills and certifications
  skills JSONB DEFAULT '[]', -- ["food_safety", "bartending", "pos_systems"]
  certifications JSONB DEFAULT '[]',
  languages_spoken JSONB DEFAULT '[]',
  
  -- Employment lifecycle
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Performance tracking
  customer_rating DECIMAL(3,2) DEFAULT 0.00,
  orders_served INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Tenant isolation
  CONSTRAINT restaurant_staff_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'restaurant')
  )
);

-- =============================================================================
-- RESTAURANT OPERATING HOURS & AVAILABILITY
-- =============================================================================

CREATE TABLE restaurant_operating_hours (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Day and service type
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  service_type TEXT NOT NULL CHECK (service_type IN ('dine_in', 'pickup', 'delivery')),
  
  -- Operating hours
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME,
  close_time TIME,
  
  -- Special hours (holidays, etc.)
  is_24_hours BOOLEAN DEFAULT FALSE,
  
  -- Capacity management
  max_reservations_per_hour INTEGER,
  max_pickup_orders_per_hour INTEGER,
  max_delivery_orders_per_hour INTEGER,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(business_id, day_of_week, service_type),
  
  -- Tenant isolation
  CONSTRAINT restaurant_operating_hours_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'restaurant')
  )
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Menu browsing
CREATE INDEX idx_restaurant_menu_items_category_active ON restaurant_menu_items(business_id, category_id, is_available);
CREATE INDEX idx_restaurant_menu_items_featured ON restaurant_menu_items(business_id, is_featured) WHERE is_available = TRUE;

-- Table management
CREATE INDEX idx_restaurant_tables_capacity ON restaurant_tables(business_id, seating_capacity, is_active);
CREATE INDEX idx_restaurant_reservations_date_time ON restaurant_reservations(business_id, reservation_date, reservation_time);

-- Order management  
CREATE INDEX idx_restaurant_orders_type_status ON restaurant_orders(business_id, order_type, status);
CREATE INDEX idx_restaurant_orders_time ON restaurant_orders(business_id, order_time);

-- Staff scheduling
CREATE INDEX idx_restaurant_staff_position_active ON restaurant_staff(business_id, position, is_active);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all restaurant tables
ALTER TABLE restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_orders ENABLE ROW LEVEL SECURITY;

-- Policies for business access
CREATE POLICY restaurant_menu_access_policy ON restaurant_menu_items
  USING (business_id IN (
    SELECT business_id FROM business_access 
    WHERE user_id = current_setting('app.current_user_id')::INTEGER 
    AND is_active = TRUE
  ));

CREATE POLICY restaurant_reservations_access_policy ON restaurant_reservations
  USING (business_id IN (
    SELECT business_id FROM business_access 
    WHERE user_id = current_setting('app.current_user_id')::INTEGER 
    AND is_active = TRUE
  ));

-- =============================================================================
-- REFERENTIAL INTEGRITY FOR SAME-BUSINESS ENTITIES
-- =============================================================================

-- Menu items must belong to categories in the same business
ALTER TABLE restaurant_menu_items
ADD CONSTRAINT fk_menu_items_same_business
CHECK (
  category_id IS NULL OR 
  business_id = (SELECT business_id FROM restaurant_menu_categories WHERE id = category_id)
);

-- Reservations must reference tables in the same business
ALTER TABLE restaurant_reservations
ADD CONSTRAINT fk_reservations_same_business  
CHECK (
  table_id IS NULL OR
  business_id = (SELECT business_id FROM restaurant_tables WHERE id = table_id)
);

COMMENT ON TABLE restaurant_menu_items IS 'Restaurant menu items - fully isolated per business';
COMMENT ON TABLE restaurant_tables IS 'Restaurant seating - each table belongs to one business';
COMMENT ON TABLE restaurant_reservations IS 'Table reservations - business-scoped bookings';
COMMENT ON TABLE restaurant_orders IS 'Food orders - delivery/pickup/dine-in orders per business';