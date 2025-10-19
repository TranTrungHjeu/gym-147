-- Set timezone for PostgreSQL database
SET timezone = 'Asia/Ho_Chi_Minh';

-- Set timezone for the current session
ALTER DATABASE schedule_db SET timezone = 'Asia/Ho_Chi_Minh';

-- Verify timezone setting
SELECT current_setting('timezone');
