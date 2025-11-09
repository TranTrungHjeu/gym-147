-- Create separate databases for each microservice
-- This script runs automatically when PostgreSQL container first starts

-- Create databases
CREATE DATABASE identity_db;
CREATE DATABASE member_db;
CREATE DATABASE schedule_db;
CREATE DATABASE billing_db;

-- Grant all privileges to gym user
GRANT ALL PRIVILEGES ON DATABASE identity_db TO gym;
GRANT ALL PRIVILEGES ON DATABASE member_db TO gym;
GRANT ALL PRIVILEGES ON DATABASE schedule_db TO gym;
GRANT ALL PRIVILEGES ON DATABASE billing_db TO gym;

-- Print confirmation
\echo 'All databases created successfully!'
