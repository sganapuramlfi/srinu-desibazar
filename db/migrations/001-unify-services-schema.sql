-- TASK-01: Database Schema Unification Migration
-- Safe migration script to unify services tables
-- Run this after schema changes are deployed

BEGIN;

-- Step 1: Add new industryData column to services table (if not exists)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS industry_data JSONB DEFAULT '{}' NOT NULL;

-- Step 2: Migrate any existing salonServices data to unified services table
-- This preserves existing data while moving to unified structure
INSERT INTO services (
  business_id, 
  name, 
  description, 
  duration, 
  price, 
  category,
  is_active, 
  max_participants, 
  industry_data,
  settings, 
  created_at, 
  updated_at
)
SELECT 
  business_id,
  name,
  description,
  duration,
  price,
  'salon' as category, -- Mark as salon service
  is_active,
  max_participants,
  '{"type": "salon"}' as industry_data, -- Salon-specific data
  settings,
  created_at,
  updated_at
FROM salon_services
WHERE NOT EXISTS (
  -- Avoid duplicates if migration run multiple times
  SELECT 1 FROM services s 
  WHERE s.business_id = salon_services.business_id 
    AND s.name = salon_services.name
    AND s.category = 'salon'
);

-- Step 3: Update staff_skills table to reference migrated services
-- Map old salonServices IDs to new services IDs
UPDATE staff_skills 
SET service_id = (
  SELECT s.id 
  FROM services s
  INNER JOIN salon_services ss ON ss.business_id = s.business_id 
    AND ss.name = s.name 
    AND s.category = 'salon'
  WHERE ss.id = staff_skills.service_id
)
WHERE service_id IN (SELECT id FROM salon_services);

-- Step 4: Verify migration success
DO $$
DECLARE
  salon_services_count INT;
  migrated_services_count INT;
  orphaned_skills_count INT;
BEGIN
  SELECT COUNT(*) INTO salon_services_count FROM salon_services;
  SELECT COUNT(*) INTO migrated_services_count FROM services WHERE category = 'salon';
  SELECT COUNT(*) INTO orphaned_skills_count FROM staff_skills ss
    WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.id = ss.service_id);
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '- Original salon_services: %', salon_services_count;
  RAISE NOTICE '- Migrated to services: %', migrated_services_count;
  RAISE NOTICE '- Orphaned staff_skills: %', orphaned_skills_count;
  
  IF orphaned_skills_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % orphaned staff_skills records found', orphaned_skills_count;
  END IF;
  
  RAISE NOTICE 'Migration completed successfully!';
END $$;

-- Step 5: Create view for backwards compatibility (optional)
-- This allows old code to continue working during transition
CREATE OR REPLACE VIEW salon_services_view AS
SELECT 
  id,
  business_id,
  name,
  description,
  duration,
  price,
  is_active,
  max_participants,
  settings,
  created_at,
  updated_at
FROM services 
WHERE category = 'salon';

COMMIT;

-- Migration complete! 
-- Next steps:
-- 1. Update application code to use unified services table
-- 2. Test all salon functionality
-- 3. After verification, drop salon_services table
-- 4. Update staffSkills queries to use services table