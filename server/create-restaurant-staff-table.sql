-- Create restaurant_staff table manually
CREATE TABLE IF NOT EXISTS restaurant_staff (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  
  -- Staff info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  -- Professional details
  title TEXT,
  bio TEXT,
  years_experience INTEGER,
  
  -- Restaurant-specific roles
  department TEXT CHECK (department IN ('kitchen', 'front_of_house', 'bar', 'management')),
  position TEXT,
  
  -- Certifications
  certifications JSONB DEFAULT '[]',
  
  -- Employment
  employee_id TEXT,
  hire_date DATE,
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'casual')),
  
  -- Schedule and availability
  working_hours JSONB DEFAULT '{}',
  break_duration_minutes INTEGER DEFAULT 30,
  max_shift_hours INTEGER DEFAULT 8,
  
  -- Skills and specializations
  cuisine_specialties JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  languages JSONB DEFAULT '[]',
  
  -- Performance
  performance_rating DECIMAL(3, 2),
  customer_rating DECIMAL(3, 2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  can_take_orders BOOLEAN DEFAULT false,
  can_handle_payments BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for business_id for better performance
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_business_id ON restaurant_staff(business_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_department ON restaurant_staff(department);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_is_active ON restaurant_staff(is_active);

SELECT 'restaurant_staff table created successfully' as result;