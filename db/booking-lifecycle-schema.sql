-- Booking Lifecycle Operations Schema
-- Extends the universal booking system with lifecycle operations and constraints

-- =============================================================================
-- BOOKING LIFECYCLE OPERATIONS
-- =============================================================================

-- Booking operations log (tracks all operations on bookings)
CREATE TABLE IF NOT EXISTS booking_operations (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- Operation details
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'create', 'confirm', 'cancel', 'reschedule', 'no_show', 'complete', 
    'modify', 'refund', 'charge', 'reminder_sent'
  )),
  
  -- Who performed the operation
  performed_by_user_id INTEGER REFERENCES platform_users(id),
  performed_by_role TEXT CHECK (performed_by_role IN ('customer', 'staff', 'system', 'admin')),
  
  -- Operation data
  operation_data JSONB DEFAULT '{}', -- stores operation-specific data
  previous_state JSONB DEFAULT '{}', -- booking state before operation
  new_state JSONB DEFAULT '{}', -- booking state after operation
  
  -- Business logic
  constraints_applied JSONB DEFAULT '[]', -- which constraints were checked
  constraints_passed BOOLEAN DEFAULT true,
  constraint_violations JSONB DEFAULT '[]', -- any violations found
  
  -- Financial impact
  financial_impact JSONB DEFAULT '{}', -- {type: 'charge|refund|hold', amount: 50.00, reason: 'cancellation_fee'}
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for booking operations
CREATE INDEX IF NOT EXISTS idx_booking_operations_booking_id ON booking_operations(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_operations_business_id ON booking_operations(business_id);
CREATE INDEX IF NOT EXISTS idx_booking_operations_type ON booking_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_booking_operations_date ON booking_operations(created_at);

-- =============================================================================
-- BOOKING CONSTRAINTS SYSTEM
-- =============================================================================

-- Industry-specific constraint definitions
CREATE TABLE IF NOT EXISTS booking_constraints (
  id SERIAL PRIMARY KEY,
  
  -- Constraint identification
  constraint_name TEXT NOT NULL,
  industry_type TEXT NOT NULL CHECK (industry_type IN (
    'salon', 'restaurant', 'event', 'realestate', 'retail', 'professional',
    'healthcare', 'fitness', 'automotive', 'home_services', 'education', 'recreation'
  )),
  
  -- Constraint details
  constraint_type TEXT NOT NULL CHECK (constraint_type IN (
    'availability', 'capacity', 'timing', 'staffing', 'equipment', 
    'cancellation', 'reschedule', 'payment', 'safety', 'compliance'
  )),
  
  -- Constraint rules (stored as JSON for flexibility)
  rules JSONB NOT NULL DEFAULT '{}',
  
  -- Priority and status
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=critical, 10=nice-to-have
  is_mandatory BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Business customization
  business_customizable BOOLEAN DEFAULT false,
  default_business_override JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business-specific constraint overrides
CREATE TABLE IF NOT EXISTS business_constraint_overrides (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE,
  constraint_id INTEGER NOT NULL REFERENCES booking_constraints(id) ON DELETE CASCADE,
  
  -- Override details
  is_enabled BOOLEAN DEFAULT true,
  custom_rules JSONB DEFAULT '{}', -- overrides for the constraint rules
  custom_priority INTEGER CHECK (custom_priority BETWEEN 1 AND 10),
  
  -- Reason for override
  override_reason TEXT,
  approved_by INTEGER REFERENCES platform_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(business_id, constraint_id)
);

-- =============================================================================
-- BOOKING POLICIES (CANCELLATION, RESCHEDULE, NO-SHOW)
-- =============================================================================

-- Business booking policies
CREATE TABLE IF NOT EXISTS booking_policies (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE,
  
  -- Policy scope
  applies_to_industry BOOLEAN DEFAULT true, -- applies to all bookings for this business
  specific_item_types TEXT[], -- or specific to certain bookable item types
  
  -- Cancellation policy
  cancellation_policy JSONB DEFAULT '{
    "free_cancellation_hours": 24,
    "fee_structure": "flat",
    "fee_amount": 0,
    "fee_percentage": 0,
    "no_refund_hours": 2,
    "emergency_exceptions": true
  }',
  
  -- Reschedule policy
  reschedule_policy JSONB DEFAULT '{
    "allowed_until_hours": 24,
    "max_reschedules": 3,
    "fee_after_limit": 0,
    "same_day_allowed": false,
    "advance_booking_limit": 30
  }',
  
  -- No-show policy
  no_show_policy JSONB DEFAULT '{
    "grace_period_minutes": 15,
    "auto_cancel_minutes": 30,
    "fee_amount": 0,
    "fee_percentage": 0,
    "repeat_offender_limit": 3,
    "blocking_period_days": 30
  }',
  
  -- Payment policy
  payment_policy JSONB DEFAULT '{
    "payment_timing": "pay_at_shop",
    "deposit_required": false,
    "deposit_percentage": 0,
    "deposit_amount": 0,
    "refund_processing_days": 7,
    "payment_methods": ["cash", "card"]
  }',
  
  -- Policy metadata
  policy_version INTEGER DEFAULT 1,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- BOOKING STATUS HISTORY
-- =============================================================================

-- Track all booking status changes
CREATE TABLE IF NOT EXISTS booking_status_history (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Status change details
  from_status TEXT,
  to_status TEXT NOT NULL,
  change_reason TEXT,
  
  -- Who made the change
  changed_by_user_id INTEGER REFERENCES platform_users(id),
  changed_by_role TEXT CHECK (changed_by_role IN ('customer', 'staff', 'system', 'admin')),
  
  -- Timing
  scheduled_for TIMESTAMP WITH TIME ZONE, -- for future status changes
  actual_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Related operation
  operation_id INTEGER REFERENCES booking_operations(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT
);

-- =============================================================================
-- CONSTRAINT VALIDATION FUNCTIONS
-- =============================================================================

-- Function to validate booking operation against constraints
CREATE OR REPLACE FUNCTION validate_booking_operation(
  p_booking_id INTEGER,
  p_operation_type TEXT,
  p_operation_data JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_business RECORD;
  v_constraints RECORD;
  v_violations JSONB := '[]';
  v_result JSONB;
BEGIN
  -- Get booking and business details
  SELECT b.*, bi.item_type 
  INTO v_booking 
  FROM bookings b 
  JOIN bookable_items bi ON b.bookable_item_id = bi.id 
  WHERE b.id = p_booking_id;
  
  SELECT * INTO v_business FROM business_tenants WHERE id = v_booking.business_id;
  
  -- Get applicable constraints
  FOR v_constraints IN 
    SELECT bc.*, COALESCE(bco.custom_rules, bc.rules) as effective_rules
    FROM booking_constraints bc
    LEFT JOIN business_constraint_overrides bco ON bc.id = bco.constraint_id 
      AND bco.business_id = v_business.id 
      AND bco.is_enabled = true
    WHERE bc.industry_type = v_business.industry_type 
      AND bc.is_active = true
    ORDER BY COALESCE(bco.custom_priority, bc.priority)
  LOOP
    -- Apply constraint validation logic here
    -- This is a simplified version - real implementation would have specific validation for each constraint type
    
    -- Example: Check cancellation timing
    IF p_operation_type = 'cancel' AND v_constraints.constraint_type = 'cancellation' THEN
      DECLARE
        v_hours_before INTEGER;
        v_free_hours INTEGER;
      BEGIN
        v_hours_before := EXTRACT(EPOCH FROM (v_booking.start_time - NOW())) / 3600;
        v_free_hours := (v_constraints.effective_rules->>'free_cancellation_hours')::INTEGER;
        
        IF v_hours_before < v_free_hours AND v_constraints.is_mandatory THEN
          v_violations := v_violations || jsonb_build_object(
            'constraint_name', v_constraints.constraint_name,
            'violation_type', 'cancellation_fee_applies',
            'message', format('Cancellation fee applies - less than %s hours notice', v_free_hours),
            'fee_amount', v_constraints.effective_rules->>'fee_amount'
          );
        END IF;
      END;
    END IF;
  END LOOP;
  
  -- Build result
  v_result := jsonb_build_object(
    'is_valid', CASE WHEN jsonb_array_length(v_violations) = 0 THEN true ELSE false END,
    'violations', v_violations,
    'constraints_checked', (SELECT COUNT(*) FROM booking_constraints WHERE industry_type = v_business.industry_type),
    'validation_timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DEFAULT INDUSTRY CONSTRAINTS
-- =============================================================================

-- Insert default constraints for restaurant industry
INSERT INTO booking_constraints (constraint_name, industry_type, constraint_type, rules, priority, is_mandatory) VALUES

-- Restaurant Availability Constraints
('restaurant_table_availability', 'restaurant', 'availability', '{
  "check_table_capacity": true,
  "allow_overbooking": false,
  "buffer_time_minutes": 30,
  "max_party_size": 12
}', 1, true),

('restaurant_operating_hours', 'restaurant', 'timing', '{
  "respect_business_hours": true,
  "last_seating_minutes_before_close": 60,
  "advance_booking_days": 14
}', 1, true),

-- Restaurant Cancellation Constraints
('restaurant_cancellation_policy', 'restaurant', 'cancellation', '{
  "free_cancellation_hours": 2,
  "fee_structure": "none",
  "fee_amount": 0,
  "no_show_tracking": true,
  "repeat_no_show_limit": 3
}', 2, true),

-- Restaurant Reschedule Constraints
('restaurant_reschedule_policy', 'restaurant', 'reschedule', '{
  "allowed_until_hours": 2,
  "max_reschedules": 3,
  "fee_after_limit": 0,
  "same_day_allowed": true
}', 3, true),

-- Salon Constraints (for future implementation)
('salon_stylist_availability', 'salon', 'staffing', '{
  "require_staff_assignment": true,
  "skill_matching": true,
  "buffer_time_minutes": 15,
  "max_concurrent_clients": 1
}', 1, true),

('salon_cancellation_policy', 'salon', 'cancellation', '{
  "free_cancellation_hours": 24,
  "fee_structure": "percentage",
  "fee_percentage": 50,
  "no_show_fee_percentage": 100
}', 2, true);

-- =============================================================================
-- DEFAULT BUSINESS POLICIES
-- =============================================================================

-- Create default policies for restaurant businesses
INSERT INTO booking_policies (business_id, cancellation_policy, reschedule_policy, no_show_policy, payment_policy)
SELECT 
  id as business_id,
  '{
    "free_cancellation_hours": 2,
    "fee_structure": "none",
    "fee_amount": 0,
    "fee_percentage": 0,
    "no_refund_hours": 0,
    "emergency_exceptions": true
  }' as cancellation_policy,
  '{
    "allowed_until_hours": 2,
    "max_reschedules": 3,
    "fee_after_limit": 0,
    "same_day_allowed": true,
    "advance_booking_limit": 14
  }' as reschedule_policy,
  '{
    "grace_period_minutes": 15,
    "auto_cancel_minutes": 30,
    "fee_amount": 0,
    "fee_percentage": 0,
    "repeat_offender_limit": 3,
    "blocking_period_days": 30
  }' as no_show_policy,
  '{
    "payment_timing": "pay_at_shop",
    "deposit_required": false,
    "deposit_percentage": 0,
    "deposit_amount": 0,
    "refund_processing_days": 7,
    "payment_methods": ["cash", "card", "digital"]
  }' as payment_policy
FROM business_tenants 
WHERE industry_type = 'restaurant'
ON CONFLICT (business_id) DO NOTHING;

-- =============================================================================
-- TRIGGERS AND AUTOMATION
-- =============================================================================

-- Trigger to log booking operations automatically
CREATE OR REPLACE FUNCTION log_booking_operation() RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO booking_status_history (
      booking_id, from_status, to_status, change_reason, 
      changed_by_role, actual_time
    ) VALUES (
      NEW.id, OLD.status, NEW.status, 'Status updated',
      'system', NOW()
    );
    
    -- Log the operation
    INSERT INTO booking_operations (
      booking_id, business_id, operation_type, 
      previous_state, new_state, performed_by_role
    ) VALUES (
      NEW.id, NEW.business_id, 'modify',
      to_jsonb(OLD), to_jsonb(NEW), 'system'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_log_booking_operations ON bookings;
CREATE TRIGGER trigger_log_booking_operations
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_booking_operation();

-- =============================================================================
-- UTILITY VIEWS
-- =============================================================================

-- View for booking lifecycle summary
CREATE OR REPLACE VIEW booking_lifecycle_summary AS
SELECT 
  b.id as booking_id,
  b.business_id,
  bt.name as business_name,
  bt.industry_type,
  b.customer_name,
  b.booking_date,
  b.start_time,
  b.status as current_status,
  
  -- Operation counts
  (SELECT COUNT(*) FROM booking_operations bo WHERE bo.booking_id = b.id) as total_operations,
  (SELECT COUNT(*) FROM booking_operations bo WHERE bo.booking_id = b.id AND bo.operation_type = 'reschedule') as reschedule_count,
  
  -- Status history
  (SELECT to_status FROM booking_status_history bsh WHERE bsh.booking_id = b.id ORDER BY actual_time DESC LIMIT 1) as latest_status,
  (SELECT actual_time FROM booking_status_history bsh WHERE bsh.booking_id = b.id ORDER BY actual_time DESC LIMIT 1) as last_status_change,
  
  -- Policy compliance
  bp.cancellation_policy,
  bp.reschedule_policy,
  bp.no_show_policy,
  bp.payment_policy,
  
  b.created_at,
  b.updated_at
FROM bookings b
JOIN business_tenants bt ON b.business_id = bt.id
LEFT JOIN booking_policies bp ON bp.business_id = b.business_id AND bp.is_active = true;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

SELECT 'Booking Lifecycle Operations Schema created successfully!' as message;

-- Show summary of what was created
SELECT 
  'Tables Created' as category,
  string_agg(table_name, ', ') as items
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('booking_operations', 'booking_constraints', 'business_constraint_overrides', 'booking_policies', 'booking_status_history')

UNION ALL

SELECT 
  'Default Constraints' as category,
  COUNT(*)::text || ' constraints added' as items
FROM booking_constraints

UNION ALL

SELECT 
  'Business Policies' as category,
  COUNT(*)::text || ' policies created' as items
FROM booking_policies;