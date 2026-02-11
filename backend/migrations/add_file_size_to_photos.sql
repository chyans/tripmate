-- Migration script to add file_size column to photos table
-- Run this if the file_size column doesn't exist in the photos table

USE tripmate_db;

-- Add file_size column if it doesn't exist
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;

