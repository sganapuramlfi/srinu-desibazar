-- Check existing database tables before deploying booking lifecycle schema
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check if our booking lifecycle tables already exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN (
        'booking_operations',
        'booking_constraints', 
        'business_constraint_overrides',
        'booking_policies',
        'booking_status_history'
    )
ORDER BY table_name, ordinal_position;