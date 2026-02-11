"""
Migration script to add is_suspended and suspended_reason columns to users table
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
    """Add is_suspended and suspended_reason columns if they don't exist"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if is_suspended column exists
        cur.execute("""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'is_suspended'
        """)
        exists_suspended = cur.fetchone()[0] > 0
        
        # Check if suspended_reason column exists
        cur.execute("""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'suspended_reason'
        """)
        exists_reason = cur.fetchone()[0] > 0
        
        if not exists_suspended:
            print("Adding is_suspended column...")
            cur.execute("ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE")
            print("[OK] is_suspended column added")
        else:
            print("[OK] is_suspended column already exists")
        
        if not exists_reason:
            print("Adding suspended_reason column...")
            cur.execute("ALTER TABLE users ADD COLUMN suspended_reason TEXT NULL")
            print("[OK] suspended_reason column added")
        else:
            print("[OK] suspended_reason column already exists")
        
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
    print("Running migration: Add suspended fields to users table")
    print("=" * 60)
    run_migration()

