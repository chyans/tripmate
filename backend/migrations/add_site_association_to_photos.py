"""
Migration: Add site_name field to photos table for associating photos with specific sites in travel plan.

This migration adds a site_name column to the photos table to store which site/place from the trip's
travel plan each photo is associated with based on GPS coordinates matching.

Run this script to apply the migration:
    python backend/migrations/add_site_association_to_photos.py
"""

import sys
import os
# Add parent directory to path to import db module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_db_connection

def run_migration():
    """Add site_name column to photos table"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if column already exists
        cur.execute("""
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = 'photos' 
            AND column_name = 'site_name'
        """)
        
        column_exists = cur.fetchone()[0] > 0
        
        if column_exists:
            print("Column 'site_name' already exists in photos table. Skipping migration.")
            return
        
        # Add site_name column
        print("Adding site_name column to photos table...")
        cur.execute("""
            ALTER TABLE photos 
            ADD COLUMN site_name VARCHAR(200) NULL AFTER location_name
        """)
        
        # Add index for faster queries by site
        print("Creating index on site_name...")
        cur.execute("""
            CREATE INDEX idx_photos_site_name ON photos(site_name)
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

