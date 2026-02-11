-- Migration: Add geocoded_location field to photos table
-- This field stores the city/place name obtained from reverse geocoding GPS coordinates

ALTER TABLE photos 
ADD COLUMN geocoded_location VARCHAR(200) NULL AFTER site_name;

-- Add index for faster queries by location
CREATE INDEX idx_photos_geocoded_location ON photos(geocoded_location);

