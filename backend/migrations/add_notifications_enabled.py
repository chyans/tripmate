"""
Migration script to add notifications_enabled column to users table.
Safe to re-run — checks if the column already exists.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mysql.connector import Error
from db import get_db_connection


def run_migration():
    """Add notifications_enabled column if it doesn't exist."""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'notifications_enabled'
        """)
        exists = cur.fetchone()[0] > 0

        if not exists:
            print("Adding notifications_enabled column...")
            cur.execute(
                "ALTER TABLE users ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE"
            )
            conn.commit()
            print("[OK] notifications_enabled column added")
        else:
            print("[OK] notifications_enabled column already exists")

    except Error as e:
        conn.rollback()
        print(f"Error running migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    print("Running migration: Add notifications_enabled to users table")
    print("=" * 60)
    run_migration()

