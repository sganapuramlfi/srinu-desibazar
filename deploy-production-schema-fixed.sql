-- Production Deployment: Universal Constraint Framework Schema
-- Safe deployment with existence checks and rollback capability

BEGIN;

-- =============================================================================
-- DEPLOYMENT SAFETY CHECKS
-- =============================================================================

DO $$ 
BEGIN
    -- Check if we're deploying to the right database
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'business_tenants'
    ) THEN
        RAISE EXCEPTION 'Safety check failed: business_tenants table not found. Wrong database?';
    END IF;
    
    RAISE NOTICE 'Safety check passed: Deploying to correct database';
END $$;

-- =============================================================================
-- BOOKING LIFECYCLE OPERATIONS TABLES
-- =============================================================================

-- Booking operations log (tracks all operations on bookings)
CREATE TABLE IF NOT EXISTS booking_operations (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL,
    business_id INTEGER NOT NULL,
    
    -- Operation details
    operation_type TEXT NOT NULL CHECK (operation_type IN (
        'create', 'confirm', 'cancel', 'reschedule', 'no_show', 'complete', 
        'modify', 'refund', 'charge', 'reminder_sent'
    )),
    
    -- Who performed the operation
    performed_by_user_id INTEGER,
    performed_by_role TEXT CHECK (performed_by_role IN ('customer', 'staff', 'system', 'admin')),
    
    -- Operation data
    operation_data JSONB DEFAULT '{}',
    previous_state JSONB DEFAULT '{}',
    new_state JSONB DEFAULT '{}',
    
    -- Business logic
    constraints_applied JSONB DEFAULT '[]',
    constraints_passed BOOLEAN DEFAULT true,
    constraint_violations JSONB DEFAULT '[]',
    
    -- Financial impact
    financial_impact JSONB DEFAULT '{}',
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'booking_operations_booking_id_fkey'
    ) THEN
        ALTER TABLE booking_operations 
        ADD CONSTRAINT booking_operations_booking_id_fkey 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'booking_operations_business_id_fkey'
    ) THEN
        ALTER TABLE booking_operations 
        ADD CONSTRAINT booking_operations_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES business_tenants(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'booking_operations_performed_by_user_id_fkey'
    ) THEN
        ALTER TABLE booking_operations 
        ADD CONSTRAINT booking_operations_performed_by_user_id_fkey 
        FOREIGN KEY (performed_by_user_id) REFERENCES platform_users(id);
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_booking_operations_booking_id ON booking_operations(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_operations_business_id ON booking_operations(business_id);
CREATE INDEX IF NOT EXISTS idx_booking_operations_type ON booking_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_booking_operations_date ON booking_operations(created_at);

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
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    is_mandatory BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    -- Business customization
    business_customizable BOOLEAN DEFAULT false,
    default_business_override JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add unique constraint for ON CONFLICT clause
    UNIQUE(constraint_name, industry_type)
);

-- Business-specific constraint overrides
CREATE TABLE IF NOT EXISTS business_constraint_overrides (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    constraint_id INTEGER NOT NULL,
    
    -- Override details
    is_enabled BOOLEAN DEFAULT true,
    custom_rules JSONB DEFAULT '{}',
    custom_priority INTEGER CHECK (custom_priority BETWEEN 1 AND 10),
    
    -- Reason for override
    override_reason TEXT,
    approved_by INTEGER,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_id, constraint_id)
);

-- Add foreign keys for constraint overrides
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_constraint_overrides_business_id_fkey'
    ) THEN
        ALTER TABLE business_constraint_overrides 
        ADD CONSTRAINT business_constraint_overrides_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES business_tenants(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_constraint_overrides_constraint_id_fkey'
    ) THEN
        ALTER TABLE business_constraint_overrides 
        ADD CONSTRAINT business_constraint_overrides_constraint_id_fkey 
        FOREIGN KEY (constraint_id) REFERENCES booking_constraints(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_constraint_overrides_approved_by_fkey'
    ) THEN
        ALTER TABLE business_constraint_overrides 
        ADD CONSTRAINT business_constraint_overrides_approved_by_fkey 
        FOREIGN KEY (approved_by) REFERENCES platform_users(id);
    END IF;
END $$;

-- Business booking policies
CREATE TABLE IF NOT EXISTS booking_policies (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL UNIQUE, -- Add UNIQUE constraint here
    
    -- Policy scope
    applies_to_industry BOOLEAN DEFAULT true,
    specific_item_types TEXT[],
    
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
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for booking policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'booking_policies_business_id_fkey'
    ) THEN
        ALTER TABLE booking_policies 
        ADD CONSTRAINT booking_policies_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES business_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Track all booking status changes
CREATE TABLE IF NOT EXISTS booking_status_history (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL,
    
    -- Status change details
    from_status TEXT,
    to_status TEXT NOT NULL,
    change_reason TEXT,
    
    -- Who made the change
    changed_by_user_id INTEGER,
    changed_by_role TEXT CHECK (changed_by_role IN ('customer', 'staff', 'system', 'admin')),
    
    -- Timing
    scheduled_for TIMESTAMP WITH TIME ZONE,
    actual_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Related operation
    operation_id INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT
);

-- Add foreign keys for status history
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'booking_status_history_booking_id_fkey'
    ) THEN
        ALTER TABLE booking_status_history 
        ADD CONSTRAINT booking_status_history_booking_id_fkey 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'booking_status_history_changed_by_user_id_fkey'
    ) THEN
        ALTER TABLE booking_status_history 
        ADD CONSTRAINT booking_status_history_changed_by_user_id_fkey 
        FOREIGN KEY (changed_by_user_id) REFERENCES platform_users(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'booking_status_history_operation_id_fkey'
    ) THEN
        ALTER TABLE booking_status_history 
        ADD CONSTRAINT booking_status_history_operation_id_fkey 
        FOREIGN KEY (operation_id) REFERENCES booking_operations(id);
    END IF;
END $$;

-- =============================================================================
-- DEFAULT INDUSTRY CONSTRAINTS FOR PRODUCTION
-- =============================================================================

-- Insert default constraints for restaurant industry (production-safe)
INSERT INTO booking_constraints (constraint_name, industry_type, constraint_type, rules, priority, is_mandatory) 
VALUES
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
    }', 3, true)
ON CONFLICT (constraint_name, industry_type) DO NOTHING;

-- Create default policies for all restaurant businesses (production-safe)
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

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_log_booking_operations ON bookings;
CREATE TRIGGER trigger_log_booking_operations
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION log_booking_operation();

-- =============================================================================
-- DEPLOYMENT VERIFICATION
-- =============================================================================

-- Verify deployment
DO $$ 
DECLARE
    table_count INTEGER;
    constraint_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count created tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'booking_operations',
        'booking_constraints', 
        'business_constraint_overrides',
        'booking_policies',
        'booking_status_history'
    );
    
    -- Count default constraints
    SELECT COUNT(*) INTO constraint_count
    FROM booking_constraints
    WHERE industry_type = 'restaurant';
    
    -- Count default policies
    SELECT COUNT(*) INTO policy_count
    FROM booking_policies bp
    JOIN business_tenants bt ON bp.business_id = bt.id
    WHERE bt.industry_type = 'restaurant';
    
    RAISE NOTICE 'Deployment verification:';
    RAISE NOTICE '  Tables created: %', table_count;
    RAISE NOTICE '  Restaurant constraints: %', constraint_count;
    RAISE NOTICE '  Restaurant policies: %', policy_count;
    
    IF table_count = 5 THEN
        RAISE NOTICE '✅ All booking lifecycle tables deployed successfully';
    ELSE
        RAISE WARNING '⚠️ Expected 5 tables, found %', table_count;
    END IF;
    
    IF constraint_count >= 4 THEN
        RAISE NOTICE '✅ Restaurant constraints deployed successfully';
    ELSE
        RAISE WARNING '⚠️ Expected 4+ constraints, found %', constraint_count;
    END IF;
    
    RAISE NOTICE '✅ Universal Constraint Framework deployed to production!';
END $$;

COMMIT;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

SELECT 
    'PRODUCTION DEPLOYMENT COMPLETED!' as status,
    NOW() as deployed_at,
    'Universal Constraint Framework is now live' as message;