-- COMPLETE PLATFORM REBUILD: BUSINESS-CENTRIC ARCHITECTURE
-- Drop everything and rebuild correctly from scratch

-- =============================================================================
-- STEP 1: DROP ALL OLD SCHEMAS
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- =============================================================================
-- STEP 2: CORE PLATFORM FOUNDATION
-- =============================================================================

-- Platform users (people who can login)
CREATE TABLE platform_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_phone_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Business tenants (isolated business contexts)
CREATE TABLE business_tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  industry_type TEXT NOT NULL CHECK (industry_type IN ('salon', 'restaurant', 'event', 'realestate', 'retail', 'professional')),
  
  -- Tenant isolation
  tenant_key UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  
  -- Business metadata
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  gallery JSONB DEFAULT '[]',
  contact_info JSONB DEFAULT '{}', -- {phone, email, whatsapp, address}
  social_media JSONB DEFAULT '{}', -- {facebook, instagram, twitter, linkedin}
  operating_hours JSONB DEFAULT '{}', -- {monday: {open: "09:00", close: "18:00"}}
  amenities JSONB DEFAULT '[]', -- ["parking", "wifi", "wheelchair_access"]
  
  -- Location
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Australia',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Platform tracking
  onboarding_completed BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Business access control (who can access which business)
CREATE TABLE business_access (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES platform_users(id) ON DELETE CASCADE NOT NULL,
  
  -- Role within THIS business
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff', 'customer')),
  
  -- Granular permissions
  permissions JSONB DEFAULT '{}' NOT NULL,
  
  -- Access control
  is_active BOOLEAN DEFAULT TRUE,
  granted_by INTEGER REFERENCES platform_users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  UNIQUE(business_id, user_id)
);

-- =============================================================================
-- SUBSCRIPTION & REVENUE MODEL
-- =============================================================================

-- Subscription plans
CREATE TABLE subscription_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  
  -- Feature limits
  max_staff INTEGER,
  max_customers INTEGER,
  max_bookings_per_month INTEGER,
  max_products INTEGER,
  storage_gb INTEGER DEFAULT 5,
  
  -- AI & Advanced features
  ai_credits_per_month INTEGER DEFAULT 0,
  api_access BOOLEAN DEFAULT FALSE,
  white_label BOOLEAN DEFAULT FALSE,
  
  -- Module access
  enabled_modules JSONB DEFAULT '[]' NOT NULL,
  enabled_features JSONB DEFAULT '[]' NOT NULL,
  
  -- Display
  is_active BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Business subscriptions
CREATE TABLE business_subscriptions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id INTEGER REFERENCES subscription_plans(id) NOT NULL,
  
  -- Billing
  status TEXT DEFAULT 'active' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  billing_email TEXT NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Usage tracking
  current_usage JSONB DEFAULT '{}' NOT NULL, -- {staff: 5, customers: 150, bookings: 45}
  
  -- Subscription lifecycle
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP DEFAULT NOW(),
  current_period_end TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(business_id)
);

-- =============================================================================
-- ABRAKADABRA AI SYSTEM
-- =============================================================================

-- AI contexts and sessions
CREATE TABLE ai_sessions (
  id SERIAL PRIMARY KEY,
  session_key UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  
  -- User context
  user_id INTEGER REFERENCES platform_users(id) ON DELETE CASCADE,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- AI role and permissions
  ai_role TEXT NOT NULL CHECK (ai_role IN ('helper', 'surrogate', 'system')),
  permissions JSONB DEFAULT '[]' NOT NULL,
  
  -- Session management
  purpose TEXT NOT NULL,
  max_interactions INTEGER DEFAULT 20,
  interaction_count INTEGER DEFAULT 0,
  
  -- Lifecycle
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW()
);

-- AI interaction logs
CREATE TABLE ai_interactions (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES ai_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Interaction details
  interaction_type TEXT NOT NULL,
  user_input TEXT,
  ai_response TEXT,
  context_data JSONB DEFAULT '{}',
  
  -- Performance tracking
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- UNIVERSAL BOOKING/APPOINTMENT SYSTEM
-- =============================================================================

-- Universal bookable items (polymorphic)
CREATE TABLE bookable_items (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Polymorphic reference
  item_type TEXT NOT NULL CHECK (item_type IN ('salon_service', 'restaurant_table', 'event_space', 'consultation', 'property_viewing')),
  item_id INTEGER NOT NULL,
  
  -- Common booking attributes
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  price DECIMAL(10,2),
  
  -- Availability rules
  advance_booking_days INTEGER DEFAULT 30,
  min_booking_duration INTEGER,
  max_booking_duration INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, item_type, item_id)
);

-- Universal bookings
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  bookable_item_id INTEGER REFERENCES bookable_items(id) ON DELETE CASCADE NOT NULL,
  
  -- Customer info
  customer_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Booking details
  booking_date DATE NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  party_size INTEGER DEFAULT 1,
  
  -- Status and notes
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  special_requests TEXT,
  internal_notes TEXT,
  
  -- Financial
  base_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  
  -- Metadata
  confirmation_code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- CROSS-BUSINESS FEATURES
-- =============================================================================

-- Business directory (public discovery)
CREATE TABLE business_directory (
  business_id INTEGER PRIMARY KEY REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- SEO & Discovery
  meta_title TEXT,
  meta_description TEXT,
  keywords JSONB DEFAULT '[]',
  
  -- Ratings & Reviews
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  
  -- Business highlights
  highlights JSONB DEFAULT '[]', -- ["Family Friendly", "24/7 Service", "Award Winner"]
  certifications JSONB DEFAULT '[]',
  
  -- Visibility
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Platform advertisements
CREATE TABLE advertisements (
  id SERIAL PRIMARY KEY,
  advertiser_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Ad content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  cta_text TEXT DEFAULT 'Learn More',
  cta_url TEXT,
  
  -- Targeting
  ad_type TEXT NOT NULL CHECK (ad_type IN ('banner', 'sidebar', 'sponsored', 'email')),
  target_industries JSONB DEFAULT '[]',
  target_locations JSONB DEFAULT '[]',
  target_keywords JSONB DEFAULT '[]',
  
  -- Budget & Performance
  budget_total DECIMAL(10,2),
  budget_daily DECIMAL(10,2),
  cost_per_click DECIMAL(10,2) DEFAULT 0.50,
  spent_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  
  -- Lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'completed', 'rejected')),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer profiles (platform-wide)
CREATE TABLE customer_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES platform_users(id) ON DELETE CASCADE,
  
  -- Preferences
  preferred_industries JSONB DEFAULT '[]',
  preferred_locations JSONB DEFAULT '[]',
  preferred_price_range JSONB DEFAULT '{}', -- {min: 0, max: 100}
  
  -- Behavioral data
  search_history JSONB DEFAULT '[]',
  booking_history_summary JSONB DEFAULT '{}',
  favorite_businesses JSONB DEFAULT '[]',
  
  -- Communication preferences
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- INDUSTRY CONTEXTS (Minimal - just settings)
-- =============================================================================

-- Industry-specific settings stored as JSONB
CREATE TABLE business_settings (
  business_id INTEGER PRIMARY KEY REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- Industry-specific configuration
  salon_settings JSONB DEFAULT '{}',
  restaurant_settings JSONB DEFAULT '{}',
  event_settings JSONB DEFAULT '{}',
  realestate_settings JSONB DEFAULT '{}',
  retail_settings JSONB DEFAULT '{}',
  professional_settings JSONB DEFAULT '{}',
  
  -- Common settings
  booking_settings JSONB DEFAULT '{}',
  payment_settings JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX idx_business_tenants_slug ON business_tenants(slug) WHERE status = 'active';
CREATE INDEX idx_business_tenants_location ON business_tenants USING GIST(point(longitude, latitude)) WHERE status = 'active';
CREATE INDEX idx_business_access_user_active ON business_access(user_id, is_active);
CREATE INDEX idx_bookings_business_date ON bookings(business_id, booking_date);
CREATE INDEX idx_bookings_customer ON bookings(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_business_directory_search ON business_directory USING GIN(keywords) WHERE is_published = TRUE;
CREATE INDEX idx_advertisements_active ON advertisements(ad_type, status) WHERE status = 'active';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE business_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Business access policy
CREATE POLICY business_tenant_access ON business_tenants
  USING (id IN (
    SELECT business_id FROM business_access 
    WHERE user_id = current_setting('app.current_user_id')::INTEGER 
    AND is_active = TRUE
  ));

-- Booking access policy  
CREATE POLICY booking_access ON bookings
  USING (
    business_id IN (
      SELECT business_id FROM business_access 
      WHERE user_id = current_setting('app.current_user_id')::INTEGER 
      AND is_active = TRUE
    )
    OR customer_id = current_setting('app.current_user_id')::INTEGER
  );

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, max_staff, max_customers, max_bookings_per_month, ai_credits_per_month, enabled_modules) VALUES
('Startup Free', 'Perfect for new businesses', 0.00, 0.00, 3, 100, 50, 50, '["basic_booking", "basic_profile"]'),
('Growth', 'For growing businesses', 49.00, 490.00, 10, 500, 200, 500, '["advanced_booking", "staff_management", "basic_analytics", "email_marketing"]'),
('Professional', 'Full-featured for established businesses', 149.00, 1490.00, 25, 2000, 1000, 2000, '["all_features", "advanced_analytics", "api_access", "priority_support"]'),
('Enterprise', 'Custom solutions for large businesses', 399.00, 3990.00, -1, -1, -1, 10000, '["all_features", "white_label", "dedicated_support", "custom_integrations"]');

-- Success message
SELECT 'Business-centric platform schema created successfully!' as status;