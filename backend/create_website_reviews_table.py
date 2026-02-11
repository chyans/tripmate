#!/usr/bin/env python3
"""
Script to create the website_reviews table if it doesn't exist
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import get_db_connection

def create_website_reviews_table():
    """Create the website_reviews table if it doesn't exist"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Create the table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS website_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                rating INT CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                low_rating_feedback JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE(user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # Create index if it doesn't exist
        try:
            cur.execute("""
                CREATE INDEX idx_website_reviews_user_id ON website_reviews(user_id)
            """)
        except Exception as e:
            # Index might already exist, which is fine
            if "Duplicate key name" not in str(e):
                print(f"Note: Index creation: {e}")
        
        conn.commit()
        print("Success: website_reviews table created successfully!")
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error creating table: {e}")
        return False
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("Creating website_reviews table...")
    success = create_website_reviews_table()
    sys.exit(0 if success else 1)

