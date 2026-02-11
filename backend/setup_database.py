"""
Setup MySQL database by running schema_mysql.sql
"""
import mysql.connector
from mysql.connector import Error
import getpass

def setup_database():
    print("MySQL Database Setup")
    print("=" * 50)
    
    # Get MySQL password
    password = getpass.getpass("Enter MySQL root password (press Enter if no password): ")
    if not password:
        password = ""
    
    try:
        # Connect to MySQL server (without database first)
        print("\nConnecting to MySQL server...")
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password=password
        )
        
        if conn.is_connected():
            print("✓ Connected to MySQL server")
            
            cursor = conn.cursor()
            
            # Read and execute SQL file
            print("\nReading schema file...")
            with open("schema_mysql.sql", "r", encoding="utf-8") as f:
                sql_file = f.read()
            
            # Split by semicolons and execute each statement
            print("Creating database and tables...")
            statements = sql_file.split(';')
            
            for statement in statements:
                statement = statement.strip()
                if statement and not statement.startswith('--'):
                    try:
                        cursor.execute(statement)
                    except Error as e:
                        # Ignore errors for IF NOT EXISTS statements
                        if "already exists" not in str(e).lower():
                            print(f"  Note: {e}")
            
            conn.commit()
            print("✓ Database and tables created successfully!")
            
            # Verify tables
            cursor.execute("USE tripmate_db")
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            print(f"\n✓ Found {len(tables)} table(s):")
            for table in tables:
                print(f"  - {table[0]}")
            
            cursor.close()
            conn.close()
            print("\n✓ Database setup complete!")
            return True
            
    except Error as e:
        print(f"\n✗ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure MySQL server is running")
        print("2. Check your MySQL root password")
        print("3. Make sure you're in the backend directory")
        return False

if __name__ == "__main__":
    setup_database()

