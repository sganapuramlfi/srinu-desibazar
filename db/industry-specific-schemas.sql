-- INDUSTRY-SPECIFIC SCHEMAS
-- Each industry has its own isolated data model

-- =============================================================================
-- SALON BUSINESS SCHEMA
-- =============================================================================

-- Salon services/treatments
CREATE TABLE salon_services (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Service details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- "hair", "nails", "facial", "massage", "spa"
  
  -- Duration and pricing
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  
  -- Service requirements
  requires_consultation BOOLEAN DEFAULT FALSE,
  requires_patch_test BOOLEAN DEFAULT FALSE,
  min_age INTEGER,
  
  -- Booking rules
  buffer_time_minutes INTEGER DEFAULT 0, -- cleanup time after service
  max_advance_days INTEGER DEFAULT 30,
  cancellation_hours INTEGER DEFAULT 24,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Salon staff members
CREATE TABLE salon_staff (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  
  -- Staff info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  -- Professional details
  title TEXT, -- "Senior Stylist", "Nail Technician"
  bio TEXT,
  years_experience INTEGER,
  
  -- Employment
  employee_id TEXT,
  hire_date DATE,
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
  
  -- Availability
  working_hours JSONB DEFAULT '{}', -- {monday: {start: "09:00", end: "17:00"}}
  break_duration_minutes INTEGER DEFAULT 30,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_bookable BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Staff service specializations
CREATE TABLE salon_staff_services (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES salon_staff(id) ON DELETE CASCADE NOT NULL,
  service_id INTEGER REFERENCES salon_services(id) ON DELETE CASCADE NOT NULL,
  
  -- Skill level
  proficiency_level TEXT CHECK (proficiency_level IN ('learning', 'capable', 'expert')) DEFAULT 'capable',
  
  -- Custom pricing (if different from standard)
  custom_price DECIMAL(10,2),
  custom_duration_minutes INTEGER,
  
  UNIQUE(staff_id, service_id)
);

-- Salon appointments
CREATE TABLE salon_appointments (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Links to universal booking
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Salon-specific details
  service_id INTEGER REFERENCES salon_services(id) NOT NULL,
  staff_id INTEGER REFERENCES salon_staff(id) NOT NULL,
  
  -- Additional salon data
  color_formula TEXT, -- for hair coloring
  patch_test_date DATE,
  previous_appointment_id INTEGER REFERENCES salon_appointments(id),
  
  -- Products used (for tracking)
  products_used JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- RESTAURANT BUSINESS SCHEMA  
-- =============================================================================

-- Menu categories
CREATE TABLE restaurant_menu_categories (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Category info
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Availability
  available_times JSONB DEFAULT '{}', -- {start: "11:00", end: "15:00"}
  available_days JSONB DEFAULT '[]', -- ["monday", "tuesday"]
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Menu items
CREATE TABLE restaurant_menu_items (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  category_id INTEGER REFERENCES restaurant_menu_categories(id) ON DELETE SET NULL,
  
  -- Item details
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  
  -- Preparation
  prep_time_minutes INTEGER,
  cooking_method TEXT,
  serving_size TEXT,
  
  -- Nutrition
  calories INTEGER,
  nutrition_info JSONB DEFAULT '{}',
  
  -- Dietary
  dietary_tags JSONB DEFAULT '[]', -- ["vegetarian", "vegan", "gluten-free", "halal"]
  allergens JSONB DEFAULT '[]', -- ["nuts", "dairy", "shellfish"]
  spice_level INTEGER CHECK (spice_level BETWEEN 0 AND 5),
  
  -- Inventory
  in_stock BOOLEAN DEFAULT TRUE,
  daily_limit INTEGER,
  
  -- Display
  is_featured BOOLEAN DEFAULT FALSE,
  is_popular BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Restaurant tables
CREATE TABLE restaurant_tables (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Table info
  table_number TEXT NOT NULL,
  floor_area TEXT, -- "Main", "Patio", "Private"
  
  -- Capacity
  min_capacity INTEGER DEFAULT 1,
  max_capacity INTEGER NOT NULL,
  ideal_capacity INTEGER,
  
  -- Features
  table_shape TEXT, -- "round", "square", "rectangle"
  is_booth BOOLEAN DEFAULT FALSE,
  has_window_view BOOLEAN DEFAULT FALSE,
  is_wheelchair_accessible BOOLEAN DEFAULT TRUE,
  
  -- Availability
  is_reservable BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, table_number)
);

-- Table reservations
CREATE TABLE restaurant_reservations (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Links to universal booking
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Restaurant-specific
  table_id INTEGER REFERENCES restaurant_tables(id),
  occasion TEXT, -- "birthday", "anniversary", "business"
  
  -- Preferences
  seating_preference TEXT, -- "window", "quiet", "near bar"
  dietary_requirements JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Food orders
CREATE TABLE restaurant_orders (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Order info
  order_number TEXT UNIQUE NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'takeout', 'delivery')),
  
  -- Customer
  customer_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- Order items
  order_items JSONB NOT NULL, -- [{item_id, quantity, modifications, price}]
  
  -- Totals
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  tip DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'preparing', 'ready', 'delivered', 'completed', 'cancelled')),
  
  -- Timing
  ordered_at TIMESTAMP DEFAULT NOW(),
  estimated_ready_at TIMESTAMP,
  ready_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Delivery info
  delivery_address JSONB,
  delivery_instructions TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- EVENT BUSINESS SCHEMA
-- =============================================================================

-- Event spaces/venues
CREATE TABLE event_spaces (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Space details
  name TEXT NOT NULL,
  description TEXT,
  space_type TEXT, -- "ballroom", "conference", "outdoor", "theater"
  
  -- Capacity
  max_capacity_standing INTEGER,
  max_capacity_seated INTEGER,
  max_capacity_theater INTEGER,
  square_feet INTEGER,
  
  -- Features
  features JSONB DEFAULT '[]', -- ["projector", "sound_system", "stage", "dance_floor"]
  
  -- Pricing
  hourly_rate DECIMAL(10,2),
  half_day_rate DECIMAL(10,2),
  full_day_rate DECIMAL(10,2),
  
  -- Rules
  min_booking_hours INTEGER DEFAULT 2,
  setup_time_hours DECIMAL(3,1) DEFAULT 1,
  cleanup_time_hours DECIMAL(3,1) DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Event bookings
CREATE TABLE event_bookings (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  space_id INTEGER REFERENCES event_spaces(id) NOT NULL,
  
  -- Event details
  event_type TEXT, -- "wedding", "corporate", "birthday", "conference"
  expected_guests INTEGER,
  
  -- Services
  catering_required BOOLEAN DEFAULT FALSE,
  decoration_required BOOLEAN DEFAULT FALSE,
  av_equipment_required BOOLEAN DEFAULT FALSE,
  
  -- Special requirements
  setup_requirements TEXT,
  special_requests JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- PROFESSIONAL SERVICES SCHEMA
-- =============================================================================

-- Service types (consultations, appointments)
CREATE TABLE professional_services (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Service info
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT, -- "consultation", "therapy", "training", "assessment"
  
  -- Duration and pricing
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  price_type TEXT CHECK (price_type IN ('fixed', 'hourly', 'package')),
  
  -- Delivery
  delivery_method TEXT CHECK (delivery_method IN ('in_person', 'online', 'hybrid')),
  online_platform TEXT, -- "zoom", "teams", "google_meet"
  
  -- Requirements
  requires_intake_form BOOLEAN DEFAULT FALSE,
  requires_contract BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Professional consultants
CREATE TABLE professional_consultants (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  
  -- Consultant info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  credentials TEXT,
  bio TEXT,
  
  -- Expertise
  specializations JSONB DEFAULT '[]',
  languages JSONB DEFAULT '[]',
  
  -- Availability
  consultation_hours JSONB DEFAULT '{}',
  timezone TEXT DEFAULT 'Australia/Sydney',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_accepting_clients BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Consultation bookings
CREATE TABLE professional_consultations (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES professional_services(id) NOT NULL,
  consultant_id INTEGER REFERENCES professional_consultants(id) NOT NULL,
  
  -- Consultation details
  meeting_link TEXT,
  intake_form_completed BOOLEAN DEFAULT FALSE,
  contract_signed BOOLEAN DEFAULT FALSE,
  
  -- Notes
  consultation_notes TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR INDUSTRY TABLES
-- =============================================================================

-- Salon indexes
CREATE INDEX idx_salon_services_business ON salon_services(business_id, is_active);
CREATE INDEX idx_salon_staff_business ON salon_staff(business_id, is_active);
CREATE INDEX idx_salon_appointments_date ON salon_appointments(business_id, created_at);

-- Restaurant indexes
CREATE INDEX idx_restaurant_menu_items_category ON restaurant_menu_items(category_id, is_active);
CREATE INDEX idx_restaurant_tables_capacity ON restaurant_tables(business_id, max_capacity);
CREATE INDEX idx_restaurant_orders_status ON restaurant_orders(business_id, status);

-- Event indexes
CREATE INDEX idx_event_spaces_capacity ON event_spaces(business_id, max_capacity_seated);

-- Professional indexes
CREATE INDEX idx_professional_services_type ON professional_services(business_id, service_type);

-- Success
SELECT 'Industry-specific schemas created successfully!' as status;