-- Add preferences and notification settings columns to platform_users table
ALTER TABLE platform_users 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}';

-- Update existing users with default preferences
UPDATE platform_users 
SET preferences = '{
  "favoriteCategories": [],
  "preferredLocations": [],
  "bookingReminders": true,
  "marketingEmails": false,
  "smsNotifications": true
}'::jsonb
WHERE preferences IS NULL OR preferences = '{}'::jsonb;

-- Update existing users with default notification settings
UPDATE platform_users 
SET notification_settings = '{
  "bookingConfirmations": true,
  "bookingReminders": true,
  "promotionalEmails": false,
  "smsNotifications": true,
  "pushNotifications": true
}'::jsonb
WHERE notification_settings IS NULL OR notification_settings = '{}'::jsonb;