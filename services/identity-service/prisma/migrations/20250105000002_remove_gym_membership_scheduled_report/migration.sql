-- Migration: Remove gym_memberships and scheduled_reports tables

-- Drop gym_memberships table
DROP TABLE IF EXISTS "gym_memberships" CASCADE;

-- Drop scheduled_reports table
DROP TABLE IF EXISTS "scheduled_reports" CASCADE;
