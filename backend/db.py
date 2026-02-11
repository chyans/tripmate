import mysql.connector
from mysql.connector import Error
import os
import urllib.parse
from dotenv import load_dotenv

# Load .env from this file's own directory
_env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(_env_path)


def get_db_connection():
    """
    Connect to MySQL database.
    Supports two configuration styles:
      1. DATABASE_URL  –  mysql+pymysql://user:pass@host:port/db
                          mysql://user:pass@host:port/db
      2. Separate vars –  MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
                          (also accepts legacy DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
    All values come from environment variables. No secrets are hardcoded.
    """
    # Reload .env every call so a server restart isn't required after edits
    load_dotenv(_env_path, override=True)

    try:
        database_url = os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL")

        if database_url:
            # Strip SQLAlchemy dialect prefix if present
            url = database_url
            for prefix in ("mysql+pymysql://", "mysql://"):
                if url.startswith(prefix):
                    url = url[len(prefix):]
                    break

            # Format:  user:pass@host:port/db
            userinfo, hostinfo = url.rsplit("@", 1)
            user, password = userinfo.split(":", 1)
            user = urllib.parse.unquote(user)
            password = urllib.parse.unquote(password)

            if "/" in hostinfo:
                hostport, database = hostinfo.split("/", 1)
            else:
                hostport = hostinfo
                database = "tripmate_db"

            if ":" in hostport:
                host, port_str = hostport.split(":", 1)
                port = int(port_str)
            else:
                host = hostport
                port = 3306

            conn = mysql.connector.connect(
                host=host,
                port=port,
                database=database,
                user=user,
                password=password,
            )
        else:
            # Fall back to individual env vars.
            # Check MYSQL* first (Railway convention), then legacy DB_* names.
            host = os.getenv("MYSQLHOST") or os.getenv("DB_HOST", "localhost")
            port = int(os.getenv("MYSQLPORT") or os.getenv("DB_PORT", "3306"))
            user = os.getenv("MYSQLUSER") or os.getenv("DB_USER", "root")
            password = os.getenv("MYSQLPASSWORD") or os.getenv("DB_PASSWORD", "")
            database = os.getenv("MYSQLDATABASE") or os.getenv("DB_NAME", "tripmate_db")

            conn = mysql.connector.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                database=database,
            )

        return conn

    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        print("\nMake sure:")
        print("1. MySQL server is running")
        print("2. Database 'tripmate_db' exists (run schema_mysql.sql first)")
        print("3. Username and password are correct")
        print("4. DATABASE_URL or MYSQL* environment variables are set")
        raise
