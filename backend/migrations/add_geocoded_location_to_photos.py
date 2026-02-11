"""
Migration: Add geocoded_location field to photos table for storing city/place names from reverse geocoding.

This migration adds a geocoded_location column to store the actual location name (city, place) 
obtained by reverse geocoding the photo's GPS coordinates.

Run this script to apply the migration:
    python backend/migrations/add_geocoded_location_to_photos.py
"""

import sys
import os
# Add parent directory to path to import db module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_db_connection

def run_migration():
    """Add geocoded_location column to photos table"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if column already exists
        cur.execute("""
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = 'photos' 
            AND column_name = 'geocoded_location'
        """)
        
        column_exists = cur.fetchone()[0] > 0
        
        if column_exists:
            print("Column 'geocoded_location' already exists in photos table. Skipping migration.")
            return
        
        # Add geocoded_location column
        print("Adding geocoded_location column to photos table...")
        cur.execute("""
            ALTER TABLE photos 
            ADD COLUMN geocoded_location VARCHAR(200) NULL AFTER site_name
        """)
        
        # Add index for faster queries by location
        print("Creating index on geocoded_location...")
        cur.execute("""
            CREATE INDEX idx_photos_geocoded_location ON photos(geocoded_location)
        """)
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error running migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()

