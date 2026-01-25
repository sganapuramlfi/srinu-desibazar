-- Business Communication & Alert System Schema
-- Extends Universal Constraint Framework with communication layer

BEGIN;

-- =============================================================================
-- CUSTOMER-BUSINESS COMMUNICATION SYSTEM
-- =============================================================================

-- Main communication threads between customers and businesses
CREATE TABLE IF NOT EXISTS business_communications (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
    
    -- Communication context
    communication_type TEXT NOT NULL CHECK (communication_type IN (
        'constraint_violation', 'special_request', 'complaint', 
        'inquiry', 'booking_issue', 'ai_escalation', 'large_party',
        'off_hours_request', 'capacity_issue', 'general_inquiry',
        'order_placed', 'order_update', 'order_cancelled', 
        'order_complaint', 'order_inquiry',
        'booking_placed', 'booking_confirmed', 'booking_cancelled',
        'booking_rescheduled', 'booking_completed', 'booking_no_show',
        'booking_complaint', 'booking_inquiry'
    )),
    
    -- Original constraint context (if applicable)
    constraint_violation_id INTEGER REFERENCES booking_operations(id),
    original_booking_request JSONB DEFAULT '{}',
    constraint_violations JSONB DEFAULT '[]',
    
    -- Communication thread
    thread_id UUID DEFAULT gen_random_uuid(),
    subject TEXT,
    messages JSONB DEFAULT '[]', -- Array of message objects
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    
    -- Customer information (for non-registered users)
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    
    -- AI involvement
    ai_suggestions JSONB DEFAULT '{}',
    ai_resolution_attempted BOOLEAN DEFAULT false,
    ai_confidence_score DECIMAL(3,2),
    
    -- Business response tracking
    business_notified_at TIMESTAMP WITH TIME ZONE,
    business_responded_at TIMESTAMP WITH TIME ZONE,
    business_response_time_minutes INTEGER,
    first_response_time_minutes INTEGER,
    
    -- Resolution tracking
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_type TEXT CHECK (resolution_type IN (
        'booking_completed', 'alternative_accepted', 'direct_contact',
        'policy_exception', 'customer_satisfied', 'no_resolution'
    )),
    customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating BETWEEN 1 AND 5),
    
    -- Business impact
    led_to_booking BOOLEAN DEFAULT false,
    recovered_revenue DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    source_page TEXT, -- Which page customer was on
    user_agent TEXT,
    ip_address TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_communications_business_id ON business_communications(business_id);
CREATE INDEX IF NOT EXISTS idx_business_communications_customer_id ON business_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_business_communications_status ON business_communications(status);
CREATE INDEX IF NOT EXISTS idx_business_communications_type ON business_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_business_communications_created ON business_communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_communications_thread ON business_communications(thread_id);

-- =============================================================================
-- BUSINESS ALERT & NOTIFICATION PREFERENCES
-- =============================================================================

-- Business owner preferences for alerts and notifications
CREATE TABLE IF NOT EXISTS business_alert_preferences (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE UNIQUE,
    
    -- Alert channels
    email_alerts BOOLEAN DEFAULT true,
    sms_alerts BOOLEAN DEFAULT false,
    in_app_alerts BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    
    -- Alert triggers
    constraint_violations BOOLEAN DEFAULT true,
    large_party_requests BOOLEAN DEFAULT true,
    off_hours_requests BOOLEAN DEFAULT true,
    repeat_customer_issues BOOLEAN DEFAULT true,
    new_messages BOOLEAN DEFAULT true,
    booking_conflicts BOOLEAN DEFAULT true,
    
    -- Alert timing
    immediate_alerts TEXT[] DEFAULT ARRAY['large_party_requests', 'urgent_issues', 'new_messages'],
    daily_digest BOOLEAN DEFAULT true,
    weekly_summary BOOLEAN DEFAULT true,
    
    -- Business hours for notifications
    notification_hours JSONB DEFAULT '{"start": "09:00", "end": "21:00", "timezone": "UTC"}',
    weekend_notifications BOOLEAN DEFAULT false,
    
    -- Contact information
    primary_email TEXT,
    sms_phone TEXT,
    backup_email TEXT,
    
    -- Escalation rules
    escalation_after_minutes INTEGER DEFAULT 60,
    escalation_email TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- AI SUGGESTION SYSTEM
-- =============================================================================

-- AI-generated suggestions for constraint violations
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id SERIAL PRIMARY KEY,
    communication_id INTEGER REFERENCES business_communications(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
    
    -- Suggestion context
    original_constraint_type TEXT NOT NULL,
    constraint_violation_data JSONB DEFAULT '{}',
    
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
        'alternative_time', 'alternative_venue', 'split_booking',
        'waitlist', 'direct_contact', 'special_arrangement',
        'nearby_business', 'reschedule', 'policy_exception'
    )),
    
    -- AI-generated suggestions
    primary_suggestion JSONB NOT NULL,
    alternative_suggestions JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2) NOT NULL,
    reasoning TEXT,
    
    -- Customer interaction tracking
    suggestions_shown_at TIMESTAMP WITH TIME ZONE,
    customer_viewed BOOLEAN DEFAULT false,
    customer_clicked_suggestion BOOLEAN DEFAULT false,
    selected_suggestion_type TEXT,
    
    -- Success tracking
    customer_accepted BOOLEAN DEFAULT false,
    led_to_booking BOOLEAN DEFAULT false,
    alternative_booking_id INTEGER REFERENCES bookings(id),
    revenue_recovered DECIMAL(10,2) DEFAULT 0,
    
    -- Business response
    business_approved BOOLEAN DEFAULT NULL, -- NULL = not reviewed, true/false = approved/rejected
    business_notes TEXT,
    
    -- Learning data
    customer_feedback TEXT,
    suggestion_quality_score INTEGER CHECK (suggestion_quality_score BETWEEN 1 AND 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for AI suggestions
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_communication ON ai_suggestions(communication_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_business ON ai_suggestions(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created ON ai_suggestions(created_at DESC);

-- =============================================================================
-- NOTIFICATION QUEUE SYSTEM
-- =============================================================================

-- Queue for all types of notifications (email, SMS, push, in-app)
CREATE TABLE IF NOT EXISTS notification_queue (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES business_tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES platform_users(id) ON DELETE CASCADE,
    communication_id INTEGER REFERENCES business_communications(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'email', 'sms', 'push', 'in_app', 'webhook'
    )),
    
    channel_specific_data JSONB DEFAULT '{}', -- Phone number for SMS, device token for push, etc.
    
    -- Message content
    subject TEXT,
    message_text TEXT NOT NULL,
    message_html TEXT,
    data JSONB DEFAULT '{}', -- Additional structured data
    
    -- Delivery scheduling
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1 = highest
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery tracking
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'sent', 'delivered', 'failed', 'expired', 'cancelled'
    )),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    delivery_attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Error tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- External service tracking
    external_message_id TEXT, -- For tracking with email/SMS providers
    external_status TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notification queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_business ON notification_queue(business_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(notification_type);

-- =============================================================================
-- COMMUNICATION ANALYTICS
-- =============================================================================

-- Track communication patterns and business insights
CREATE TABLE IF NOT EXISTS communication_analytics (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES business_tenants(id) ON DELETE CASCADE,
    
    -- Time period
    date_period DATE NOT NULL,
    period_type TEXT DEFAULT 'daily' CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
    
    -- Communication metrics
    total_communications INTEGER DEFAULT 0,
    new_communications INTEGER DEFAULT 0,
    resolved_communications INTEGER DEFAULT 0,
    avg_response_time_minutes DECIMAL(10,2),
    avg_resolution_time_hours DECIMAL(10,2),
    
    -- Constraint violation patterns
    constraint_violations JSONB DEFAULT '{}', -- Count by type
    ai_suggestions_generated INTEGER DEFAULT 0,
    ai_suggestions_accepted INTEGER DEFAULT 0,
    
    -- Business impact
    bookings_recovered INTEGER DEFAULT 0,
    revenue_recovered DECIMAL(10,2) DEFAULT 0,
    customer_satisfaction_avg DECIMAL(3,2),
    
    -- Channel performance
    email_notifications_sent INTEGER DEFAULT 0,
    sms_notifications_sent INTEGER DEFAULT 0,
    in_app_alerts_sent INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_id, date_period, period_type)
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_communication_analytics_business_date ON communication_analytics(business_id, date_period DESC);
CREATE INDEX IF NOT EXISTS idx_communication_analytics_period ON communication_analytics(period_type, date_period DESC);

-- =============================================================================
-- TRIGGERS AND AUTOMATION
-- =============================================================================

-- Function to update communication timestamps
CREATE OR REPLACE FUNCTION update_communication_timestamps() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- If status changed to 'resolved' or 'closed', set resolved_at
    IF OLD.status != NEW.status AND NEW.status IN ('resolved', 'closed') AND OLD.resolved_at IS NULL THEN
        NEW.resolved_at = NOW();
    END IF;
    
    -- Calculate response time when business first responds
    IF OLD.business_responded_at IS NULL AND NEW.business_responded_at IS NOT NULL THEN
        NEW.business_response_time_minutes = EXTRACT(EPOCH FROM (NEW.business_responded_at - NEW.created_at)) / 60;
        NEW.first_response_time_minutes = NEW.business_response_time_minutes;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for communication timestamp updates
DROP TRIGGER IF EXISTS trigger_update_communication_timestamps ON business_communications;
CREATE TRIGGER trigger_update_communication_timestamps
    BEFORE UPDATE ON business_communications
    FOR EACH ROW
    EXECUTE FUNCTION update_communication_timestamps();

-- Function to automatically create business alert preferences for new businesses
CREATE OR REPLACE FUNCTION create_default_alert_preferences() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO business_alert_preferences (business_id)
    VALUES (NEW.id)
    ON CONFLICT (business_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default alert preferences
DROP TRIGGER IF EXISTS trigger_create_default_alert_preferences ON business_tenants;
CREATE TRIGGER trigger_create_default_alert_preferences
    AFTER INSERT ON business_tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_default_alert_preferences();

-- =============================================================================
-- DEFAULT DATA
-- =============================================================================

-- Create default alert preferences for existing businesses
INSERT INTO business_alert_preferences (business_id)
SELECT id FROM business_tenants
ON CONFLICT (business_id) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify all tables were created
DO $$ 
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'business_communications',
        'business_alert_preferences', 
        'ai_suggestions',
        'notification_queue',
        'communication_analytics'
    );
    
    RAISE NOTICE 'Business Communication System Tables Created: %', table_count;
    
    IF table_count = 5 THEN
        RAISE NOTICE '✅ All communication system tables deployed successfully';
    ELSE
        RAISE WARNING '⚠️ Expected 5 tables, found %', table_count;
    END IF;
END $$;

COMMIT;

-- Success message
SELECT 
    'BUSINESS COMMUNICATION SYSTEM DEPLOYED!' as status,
    NOW() as deployed_at,
    'Customer-Business messaging and AI suggestions now available' as message;