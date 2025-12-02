-- Migration: Add trainer_reply column to attendance table
-- This column allows trainers to reply to member feedback

-- Set search_path to schedule_schema
SET search_path TO schedule_schema, public;

-- AlterTable
-- Add trainer_reply column to attendance table
ALTER TABLE "schedule_schema"."attendance" ADD COLUMN IF NOT EXISTS "trainer_reply" TEXT;

