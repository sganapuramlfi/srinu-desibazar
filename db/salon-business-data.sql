-- SALON BUSINESS DATA LAYER
-- Business-isolated data that belongs to specific salon businesses

-- =============================================================================
-- SALON SERVICES (Business-specific)
-- =============================================================================

CREATE TABLE salon_services (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Service details
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  
  -- Salon-specific attributes
  service_category TEXT, -- "hair", "nails", "facial", "massage", etc.
  skill_level_required TEXT CHECK (skill_level_required IN ('junior', 'intermediate', 'senior')),
  requires_consultation BOOLEAN DEFAULT FALSE,
  
  -- Booking settings
  max_participants INTEGER DEFAULT 1,
  advance_booking_days INTEGER DEFAULT 7,
  same_day_booking_allowed BOOLEAN DEFAULT TRUE,
  
  -- Business rules
  is_active BOOLEAN DEFAULT TRUE,
  requires_deposit BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(10,2),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Tenant isolation
  CONSTRAINT salon_services_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'salon')
  )
);

-- =============================================================================
-- SALON STAFF (Business-specific)
-- =============================================================================

CREATE TABLE salon_staff (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL, -- Staff member's login (optional)
  
  -- Staff details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Salon-specific attributes
  staff_position TEXT, -- "stylist", "nail_tech", "massage_therapist", "receptionist"
  experience_level TEXT CHECK (experience_level IN ('junior', 'intermediate', 'senior')),
  hourly_rate DECIMAL(10,2),
  commission_rate DECIMAL(5,2), -- percentage
  
  -- Work schedule
  works_monday BOOLEAN DEFAULT FALSE,
  works_tuesday BOOLEAN DEFAULT FALSE,
  works_wednesday BOOLEAN DEFAULT FALSE,
  works_thursday BOOLEAN DEFAULT FALSE,
  works_friday BOOLEAN DEFAULT FALSE,
  works_saturday BOOLEAN DEFAULT FALSE,
  works_sunday BOOLEAN DEFAULT FALSE,
  
  -- Employment details
  employment_type TEXT CHECK (employment_type IN ('employee', 'contractor', 'booth_rental')),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Tenant isolation
  CONSTRAINT salon_staff_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'salon')
  )
);

-- =============================================================================
-- SALON STAFF SKILLS (What services each staff member can perform)
-- =============================================================================

CREATE TABLE salon_staff_skills (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  staff_id INTEGER REFERENCES salon_staff(id) ON DELETE CASCADE NOT NULL,
  service_id INTEGER REFERENCES salon_services(id) ON DELETE CASCADE NOT NULL,
  
  -- Skill assessment
  proficiency_level TEXT CHECK (proficiency_level IN ('junior', 'intermediate', 'senior')) NOT NULL,
  can_perform_solo BOOLEAN DEFAULT TRUE,
  certification_date DATE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(staff_id, service_id),
  
  -- Tenant isolation
  CONSTRAINT staff_skills_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'salon')
  )
);

-- =============================================================================
-- SALON APPOINTMENTS (Business-specific bookings)
-- =============================================================================

CREATE TABLE salon_appointments (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Who and what
  customer_id INTEGER REFERENCES platform_users(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES salon_staff(id) ON DELETE CASCADE NOT NULL,
  service_id INTEGER REFERENCES salon_services(id) ON DELETE CASCADE NOT NULL,
  
  -- When
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Appointment details
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  customer_name TEXT NOT NULL, -- For walk-ins without accounts
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Special requests
  special_requests TEXT,
  internal_notes TEXT, -- Staff-only notes
  
  -- Financial
  service_price DECIMAL(10,2) NOT NULL,
  deposit_paid DECIMAL(10,2) DEFAULT 0.00,
  total_paid DECIMAL(10,2) DEFAULT 0.00,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'deposit_paid', 'paid', 'refunded')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Tenant isolation
  CONSTRAINT salon_appointments_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'salon')
  )
);

-- =============================================================================
-- SALON SHIFT TEMPLATES (Reusable schedule patterns)
-- =============================================================================

CREATE TABLE salon_shift_templates (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Template details
  template_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Break information
  break_duration_minutes INTEGER DEFAULT 30,
  break_start_time TIME,
  
  -- Which days this template applies to
  applies_to_days JSONB DEFAULT '[]' NOT NULL, -- ["monday", "wednesday", "friday"]
  
  -- Template settings
  is_active BOOLEAN DEFAULT TRUE,
  color_hex TEXT DEFAULT '#3B82F6', -- For calendar display
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Tenant isolation
  CONSTRAINT salon_shift_templates_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'salon')
  )
);

-- =============================================================================
-- SALON STAFF SCHEDULES (Actual work schedules)
-- =============================================================================

CREATE TABLE salon_staff_schedules (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE NOT NULL,
  staff_id INTEGER REFERENCES salon_staff(id) ON DELETE CASCADE NOT NULL,
  template_id INTEGER REFERENCES salon_shift_templates(id) ON DELETE SET NULL,
  
  -- Schedule details
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Break information
  break_start_time TIME,
  break_end_time TIME,
  
  -- Actual vs scheduled
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'absent', 'sick', 'vacation')),
  
  -- Notes
  schedule_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent double-booking
  UNIQUE(staff_id, work_date),
  
  -- Tenant isolation
  CONSTRAINT salon_staff_schedules_business_tenant CHECK (
    business_id IN (SELECT id FROM business_tenants WHERE industry_type = 'salon')
  )
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Service lookup
CREATE INDEX idx_salon_services_business_active ON salon_services(business_id, is_active);
CREATE INDEX idx_salon_services_category ON salon_services(business_id, service_category) WHERE is_active = TRUE;

-- Staff management
CREATE INDEX idx_salon_staff_business_active ON salon_staff(business_id, is_active);
CREATE INDEX idx_salon_staff_position ON salon_staff(business_id, staff_position) WHERE is_active = TRUE;

-- Skill matching
CREATE INDEX idx_salon_staff_skills_lookup ON salon_staff_skills(business_id, service_id, proficiency_level);

-- Appointment scheduling
CREATE INDEX idx_salon_appointments_date_staff ON salon_appointments(business_id, appointment_date, staff_id);
CREATE INDEX idx_salon_appointments_customer ON salon_appointments(business_id, customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_salon_appointments_status ON salon_appointments(business_id, status, appointment_date);

-- Schedule management
CREATE INDEX idx_salon_schedules_staff_date ON salon_staff_schedules(staff_id, work_date);
CREATE INDEX idx_salon_schedules_business_date ON salon_staff_schedules(business_id, work_date);

-- =============================================================================
-- ROW LEVEL SECURITY FOR SALON DATA
-- =============================================================================

-- Enable RLS
ALTER TABLE salon_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Only access salon data for businesses user has access to
CREATE POLICY salon_data_access_policy ON salon_services
  USING (business_id IN (
    SELECT business_id FROM business_access 
    WHERE user_id = current_setting('app.current_user_id')::INTEGER 
    AND is_active = TRUE
  ));

CREATE POLICY salon_staff_access_policy ON salon_staff
  USING (business_id IN (
    SELECT business_id FROM business_access 
    WHERE user_id = current_setting('app.current_user_id')::INTEGER 
    AND is_active = TRUE
  ));

CREATE POLICY salon_appointments_access_policy ON salon_appointments
  USING (business_id IN (
    SELECT business_id FROM business_access 
    WHERE user_id = current_setting('app.current_user_id')::INTEGER 
    AND is_active = TRUE
  ));

-- =============================================================================
-- FOREIGN KEY RELATIONSHIPS
-- =============================================================================

-- Staff skills must reference same business
ALTER TABLE salon_staff_skills 
ADD CONSTRAINT fk_staff_skills_same_business 
CHECK (
  business_id = (SELECT business_id FROM salon_staff WHERE id = staff_id) AND
  business_id = (SELECT business_id FROM salon_services WHERE id = service_id)
);

-- Appointments must reference same business entities
ALTER TABLE salon_appointments
ADD CONSTRAINT fk_appointments_same_business
CHECK (
  business_id = (SELECT business_id FROM salon_staff WHERE id = staff_id) AND
  business_id = (SELECT business_id FROM salon_services WHERE id = service_id)
);

COMMENT ON TABLE salon_services IS 'Salon-specific services - isolated per business tenant';
COMMENT ON TABLE salon_staff IS 'Salon staff members - each belongs to one business';
COMMENT ON TABLE salon_appointments IS 'Salon appointments - fully isolated per business';
COMMENT ON TABLE salon_staff_skills IS 'Staff-service skill mapping - business-scoped';