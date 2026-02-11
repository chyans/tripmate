-- Migration: Add activity_notes field to photos table
-- This field stores free-form notes/activities related to the photo

ALTER TABLE photos 
ADD COLUMN activity_notes TEXT NULL AFTER geocoded_location;


