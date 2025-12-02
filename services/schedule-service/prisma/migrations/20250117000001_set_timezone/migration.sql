-- Set timezone for the current session
-- Note: In Supabase, we use schemas, not separate databases
-- Timezone is set at the connection level, not per database
SET timezone = 'Asia/Ho_Chi_Minh';

-- Verify timezone setting
SELECT current_setting('timezone');
