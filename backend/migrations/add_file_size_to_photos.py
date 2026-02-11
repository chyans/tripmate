"""
Migration script to add file_size column to photos table
Run this once to update your existing database
"""
import sys
import os
# Add parent directory to path to import db module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import mysql.connector
from mysql.connector import Error
from db import get_db_connection

def run_migration():
    """Add file_size column if it doesn't exist"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if file_size column exists
        cur.execute("""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'photos' 
            AND COLUMN_NAME = 'file_size'
        """)
        exists = cur.fetchone()[0] > 0
        
        if not exists:
            print("Adding file_size column...")
            cur.execute("ALTER TABLE photos ADD COLUMN file_size BIGINT DEFAULT 0")
            print("[OK] file_size column added")
        else:
            print("[OK] file_size column already exists")
        
        conn.commit()
        print("\n[OK] Migration completed successfully!")
        
    except Error as e:
        conn.rollback()
        print(f"Error running migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("Running migration: Add file_size to photos table")
    print("=" * 60)
    run_migration()

