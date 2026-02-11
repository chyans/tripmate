-- Migration: Add site_name field to photos table for associating photos with specific sites in travel plan
-- This field stores the name of the site/place from the trip's destinations or optimized_route
-- that the photo is associated with based on GPS coordinates

ALTER TABLE photos 
ADD COLUMN site_name VARCHAR(200) NULL AFTER location_name;

-- Add index for faster queries by site
CREATE INDEX idx_photos_site_name ON photos(site_name);

