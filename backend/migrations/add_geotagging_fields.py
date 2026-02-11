#!/usr/bin/env python3
"""
Migration script to add geotagging fields to photos table:
- media_type (ENUM: 'image', 'video')
- latitude (DECIMAL(10, 8) NULL)
- longitude (DECIMAL(11, 8) NULL)
- taken_at (TIMESTAMP NULL)
"""

import sys
import os

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add parent directory to path to import db module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from backend.db import get_db_connection
except ImportError:
    from db import get_db_connection

def migrate():
    """Add geotagging fields to photos table"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        print("Adding geotagging fields to photos table...")
        
        # Check if columns already exist
        cur.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'photos' 
            AND COLUMN_NAME IN ('media_type', 'latitude', 'longitude', 'taken_at')
        """)
        existing_columns = [row[0] for row in cur.fetchall()]
        
        # Add media_type column
        if 'media_type' not in existing_columns:
            print("  Adding media_type column...")
            cur.execute("""
                ALTER TABLE photos 
                ADD COLUMN media_type ENUM('image', 'video') DEFAULT 'image' 
                AFTER file_size
            """)
            print("  [OK] media_type added")
        else:
            print("  [OK] media_type already exists")
        
        # Add latitude column
        if 'latitude' not in existing_columns:
            print("  Adding latitude column...")
            cur.execute("""
                ALTER TABLE photos 
                ADD COLUMN latitude DECIMAL(10, 8) NULL 
                AFTER media_type
            """)
            print("  [OK] latitude added")
        else:
            print("  [OK] latitude already exists")
        
        # Add longitude column
        if 'longitude' not in existing_columns:
            print("  Adding longitude column...")
            cur.execute("""
                ALTER TABLE photos 
                ADD COLUMN longitude DECIMAL(11, 8) NULL 
                AFTER latitude
            """)
            print("  [OK] longitude added")
        else:
            print("  [OK] longitude already exists")
        
        # Add taken_at column
        if 'taken_at' not in existing_columns:
            print("  Adding taken_at column...")
            cur.execute("""
                ALTER TABLE photos 
                ADD COLUMN taken_at TIMESTAMP NULL 
                AFTER longitude
            """)
            print("  [OK] taken_at added")
        else:
            print("  [OK] taken_at already exists")
        
        # Update existing records to set media_type based on filename
        print("  Updating existing records with media_type...")
        cur.execute("""
            UPDATE photos 
            SET media_type = CASE 
                WHEN LOWER(filename) LIKE '%.mp4' 
                     OR LOWER(filename) LIKE '%.mov' 
                     OR LOWER(filename) LIKE '%.avi' 
                     OR LOWER(filename) LIKE '%.mkv' 
                     OR LOWER(filename) LIKE '%.webm' 
                THEN 'video' 
                ELSE 'image' 
            END
            WHERE media_type = 'image' OR media_type IS NULL
        """)
        updated_count = cur.rowcount
        print(f"  [OK] Updated {updated_count} existing records")
        
        conn.commit()
        print("\n[OK] Migration completed successfully!")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()

