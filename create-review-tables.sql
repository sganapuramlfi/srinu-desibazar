-- Create Review Management Tables
-- Manual SQL creation to avoid schema push conflicts

-- Create business_reviews table
CREATE TABLE IF NOT EXISTS business_reviews (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  
  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  
  -- Customer Info (for anonymous reviews)
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  
  -- Business Response
  business_response TEXT,
  responded_at TIMESTAMP,
  responded_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  
  -- Review Source & Verification
  source VARCHAR(50) DEFAULT 'platform',
  is_verified BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  is_helpful INTEGER DEFAULT 0,
  
  -- Response Management
  response_status VARCHAR(20) DEFAULT 'pending',
  flag_reason TEXT,
  flagged_at TIMESTAMP,
  flagged_by INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
  
  -- Metadata
  review_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create review_templates table
CREATE TABLE IF NOT EXISTS review_templates (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- Template Info
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('positive', 'negative', 'neutral', 'complaint', 'compliment')),
  
  -- Template Content  
  template TEXT NOT NULL,
  description TEXT,
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create review_analytics table
CREATE TABLE IF NOT EXISTS review_analytics (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- Rating Distribution
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  
  -- Rating Breakdown
  five_star_count INTEGER DEFAULT 0,
  four_star_count INTEGER DEFAULT 0,
  three_star_count INTEGER DEFAULT 0,
  two_star_count INTEGER DEFAULT 0,
  one_star_count INTEGER DEFAULT 0,
  
  -- Response Management
  total_responses INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_response_time INTEGER DEFAULT 0,
  
  -- Review Sources
  platform_reviews INTEGER DEFAULT 0,
  google_reviews INTEGER DEFAULT 0,
  facebook_reviews INTEGER DEFAULT 0,
  manual_reviews INTEGER DEFAULT 0,
  
  -- Time Periods
  period_type VARCHAR(20) NOT NULL,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  
  -- Metadata
  last_calculated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_reviews_business_id ON business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_rating ON business_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_business_reviews_status ON business_reviews(response_status);
CREATE INDEX IF NOT EXISTS idx_business_reviews_date ON business_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_review_templates_business_id ON review_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_review_templates_category ON review_templates(category);
CREATE INDEX IF NOT EXISTS idx_review_analytics_business_id ON review_analytics(business_id);

-- Display success message
SELECT 'Review management tables created successfully!' as message;