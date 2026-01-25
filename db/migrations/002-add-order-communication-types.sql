-- Migration: Add order-related communication types to business_communications constraint
-- This allows proper categorization for intelligent analysis

-- Drop the existing constraint
ALTER TABLE business_communications 
DROP CONSTRAINT IF EXISTS business_communications_communication_type_check;

-- Add the updated constraint with order-related types
ALTER TABLE business_communications 
ADD CONSTRAINT business_communications_communication_type_check 
CHECK (communication_type IN (
    'constraint_violation', 'special_request', 'complaint', 
    'inquiry', 'booking_issue', 'ai_escalation', 'large_party',
    'off_hours_request', 'capacity_issue', 'general_inquiry',
    'order_placed', 'order_update', 'order_cancelled', 
    'order_complaint', 'order_inquiry'
));

-- Update the schema documentation
COMMENT ON COLUMN business_communications.communication_type IS 
'Type of communication for analytics and routing. Includes booking-related and order-related types for comprehensive business intelligence.';