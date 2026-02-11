-- Migration script to add is_suspended and suspended_reason columns to users table
-- Run this if these columns don't exist in the users table

USE tripmate_db;

-- Add is_suspended column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- Add suspended_reason column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS suspended_reason TEXT NULL;

