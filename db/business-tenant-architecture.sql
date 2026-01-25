-- TASK-01 REDESIGN: Business-Centric Tenant Architecture
-- This replaces the broken user-business relationship

-- =============================================================================
-- CORE TENANT ISOLATION LAYER
-- =============================================================================

-- Platform users (people who can login)
CREATE TABLE platform_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Business tenants (isolated business contexts)
CREATE TABLE business_tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- SEO-friendly URL
  industry_type TEXT NOT NULL CHECK (industry_type IN ('salon', 'restaurant', 'event', 'realestate', 'retail', 'professional')),
  
  -- Tenant isolation
  tenant_key UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL, -- Encryption key for this business
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  
  -- Business metadata
  description TEXT,
  logo_url TEXT,
  gallery JSONB DEFAULT '[]',
  contact_info JSONB DEFAULT '{}',
  operating_hours JSONB DEFAULT '{}',
  amenities JSONB DEFAULT '[]',
  
  -- Platform tracking
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- BUSINESS ACCESS CONTROL LAYER
-- =============================================================================

-- Who can access which business (M:N relationship)
CREATE TABLE business_access (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES platform_users(id) ON DELETE CASCADE NOT NULL,
  
  -- Role within THIS business
  role_in_business TEXT NOT NULL CHECK (role_in_business IN ('owner', 'manager', 'staff', 'customer')),
  
  -- Permissions within THIS business
  permissions JSONB DEFAULT '{}' NOT NULL, -- {"can_edit_services": true, "can_view_analytics": false}
  
  -- Access control
  is_active BOOLEAN DEFAULT TRUE,
  granted_by INTEGER REFERENCES platform_users(id), -- Who gave this access
  granted_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate access
  UNIQUE(business_id, user_id)
);

-- =============================================================================
-- SUBSCRIPTION & FEATURE CONTROL LAYER  
-- =============================================================================

-- Subscription tiers and pricing
CREATE TABLE subscription_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, -- "Startup Free", "Growth", "Professional", "Enterprise"
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  
  -- Feature limits
  max_staff INTEGER,
  max_customers INTEGER,
  max_bookings_per_month INTEGER,
  ai_credits_per_month INTEGER,
  
  -- Module access
  enabled_modules JSONB DEFAULT '[]' NOT NULL, -- ["salon_basic", "restaurant_standard"]
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Business subscriptions (which plan each business has)
CREATE TABLE business_subscriptions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id INTEGER REFERENCES subscription_plans(id) NOT NULL,
  
  -- Billing
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'suspended')),
  billing_email TEXT NOT NULL,
  
  -- Usage tracking
  current_staff_count INTEGER DEFAULT 0,
  current_customer_count INTEGER DEFAULT 0,
  monthly_bookings_count INTEGER DEFAULT 0,
  monthly_ai_credits_used INTEGER DEFAULT 0,
  
  -- Subscription lifecycle
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(business_id) -- Each business has one active subscription
);

-- =============================================================================
-- INDUSTRY-SPECIFIC BUSINESS CONTEXTS
-- =============================================================================

-- Salon business context (only for salon businesses)
CREATE TABLE salon_business_contexts (
  business_id INTEGER PRIMARY KEY REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- Salon-specific settings
  booking_advance_days INTEGER DEFAULT 30,
  walk_in_enabled BOOLEAN DEFAULT TRUE,
  deposit_required BOOLEAN DEFAULT FALSE,
  deposit_percentage DECIMAL(5,2) DEFAULT 0.00,
  
  -- Staff management settings
  staff_scheduling_enabled BOOLEAN DEFAULT TRUE,
  skill_based_booking BOOLEAN DEFAULT FALSE,
  roster_auto_generation BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Restaurant business context (only for restaurant businesses)  
CREATE TABLE restaurant_business_contexts (
  business_id INTEGER PRIMARY KEY REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- Restaurant-specific settings
  table_booking_enabled BOOLEAN DEFAULT TRUE,
  online_ordering_enabled BOOLEAN DEFAULT FALSE,
  delivery_enabled BOOLEAN DEFAULT FALSE,
  pickup_enabled BOOLEAN DEFAULT TRUE,
  
  -- Kitchen settings
  prep_time_tracking BOOLEAN DEFAULT TRUE,
  inventory_management BOOLEAN DEFAULT FALSE,
  pos_integration_enabled BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Professional services business context
CREATE TABLE professional_business_contexts (
  business_id INTEGER PRIMARY KEY REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- Professional-specific settings  
  consultation_booking_enabled BOOLEAN DEFAULT TRUE,
  hourly_billing_enabled BOOLEAN DEFAULT TRUE,
  case_management_enabled BOOLEAN DEFAULT FALSE,
  document_generation_enabled BOOLEAN DEFAULT FALSE,
  
  -- Client management
  client_confidentiality_mode BOOLEAN DEFAULT TRUE,
  conflict_checking_enabled BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- CROSS-BUSINESS PLATFORM FEATURES
-- =============================================================================

-- Platform-wide business directory (public searchable data)
CREATE TABLE business_directory (
  business_id INTEGER PRIMARY KEY REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- Public searchable data
  public_name TEXT NOT NULL,
  public_description TEXT,
  public_phone TEXT,
  public_email TEXT,
  public_address JSONB,
  
  -- Location data  
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  service_area_radius_km DECIMAL(5,2),
  
  -- SEO & Discovery
  keywords JSONB DEFAULT '[]',
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  
  -- Visibility controls
  is_published BOOLEAN DEFAULT FALSE,
  is_accepting_customers BOOLEAN DEFAULT TRUE,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Platform advertisements (cross-business revenue)
CREATE TABLE platform_advertisements (
  id SERIAL PRIMARY KEY,
  advertiser_business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Ad content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  
  -- Targeting
  target_industries JSONB DEFAULT '[]', -- Which industries to show ad to
  target_locations JSONB DEFAULT '{}', -- Geographic targeting
  target_demographics JSONB DEFAULT '{}',
  
  -- Lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  budget_total DECIMAL(10,2),
  budget_daily DECIMAL(10,2),
  spent_amount DECIMAL(10,2) DEFAULT 0.00,
  
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE & SECURITY
-- =============================================================================

-- Tenant isolation indexes
CREATE INDEX idx_business_access_user_business ON business_access(user_id, business_id);
CREATE INDEX idx_business_access_business_role ON business_access(business_id, role_in_business) WHERE is_active = TRUE;

-- Subscription enforcement indexes  
CREATE INDEX idx_business_subscriptions_active ON business_subscriptions(business_id) WHERE status = 'active';
CREATE INDEX idx_subscription_usage_tracking ON business_subscriptions(business_id, monthly_bookings_count, monthly_ai_credits_used);

-- Business directory/search indexes
CREATE INDEX idx_business_directory_location ON business_directory USING GIST(latitude, longitude) WHERE is_published = TRUE;
CREATE INDEX idx_business_directory_search ON business_directory(public_name, keywords) WHERE is_published = TRUE;

-- Industry context indexes
CREATE INDEX idx_salon_contexts ON salon_business_contexts(business_id);
CREATE INDEX idx_restaurant_contexts ON restaurant_business_contexts(business_id);
CREATE INDEX idx_professional_contexts ON professional_business_contexts(business_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) FOR TENANT ISOLATION
-- =============================================================================

-- Enable RLS on all business data tables
ALTER TABLE business_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see businesses they have access to
CREATE POLICY business_access_policy ON business_tenants
  USING (id IN (
    SELECT business_id FROM business_access 
    WHERE user_id = current_setting('app.current_user_id')::INTEGER 
    AND is_active = TRUE
  ));

-- Policy: Users can only see their own access records
CREATE POLICY user_access_policy ON business_access
  USING (user_id = current_setting('app.current_user_id')::INTEGER);

COMMENT ON TABLE business_tenants IS 'Core tenant isolation - each business is a secure island';
COMMENT ON TABLE business_access IS 'M:N relationship - users can access multiple businesses with different roles';
COMMENT ON TABLE business_subscriptions IS 'Subscription control - defines what each business can do';
COMMENT ON TABLE business_directory IS 'Public business discovery - cross-tenant search and ads';