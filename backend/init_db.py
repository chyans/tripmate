"""
One-time database initializer for Railway deployments.

1. Runs backend/schema_mysql.sql to create all tables (IF NOT EXISTS).
2. Ensures a `schema_migrations` tracking table exists.
3. Discovers every *.py migration in backend/migrations/, sorted by filename.
4. Skips migrations already recorded in `schema_migrations`.
5. Runs each pending migration and records it on success.

Safe to call repeatedly — everything is idempotent.
"""

import os
import sys
import importlib.util

# Ensure the backend package is importable regardless of cwd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import get_db_connection


# ---------------------------------------------------------------------------
# 1. Run the base schema
# ---------------------------------------------------------------------------

def run_schema(conn):
    """Execute schema_mysql.sql (multi-statement) against the connection."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema_mysql.sql")

    if not os.path.exists(schema_path):
        print(f"[WARN] Schema file not found: {schema_path} — skipping.")
        return

    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()

    cur = conn.cursor()
    try:
        # multi=True lets mysql-connector execute multiple statements at once
        for result in cur.execute(sql, multi=True):
            # Consume each result so the driver moves to the next statement
            if result.with_rows:
                result.fetchall()
        conn.commit()
        print("[OK] schema_mysql.sql executed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] schema_mysql.sql failed: {e}")
        raise
    finally:
        cur.close()


# ---------------------------------------------------------------------------
# 2. Ensure the migration-tracking table exists
# ---------------------------------------------------------------------------

def ensure_migrations_table(conn):
    """Create the `schema_migrations` table if it doesn't exist yet."""
    cur = conn.cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("[OK] schema_migrations table ready.")
    finally:
        cur.close()


# ---------------------------------------------------------------------------
# 3. Discover & run pending migrations
# ---------------------------------------------------------------------------

def get_applied_migrations(conn):
    """Return a set of filenames already recorded in schema_migrations."""
    cur = conn.cursor()
    try:
        cur.execute("SELECT filename FROM schema_migrations")
        return {row[0] for row in cur.fetchall()}
    finally:
        cur.close()


def record_migration(conn, filename):
    """Mark a migration as applied."""
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO schema_migrations (filename) VALUES (%s)",
            (filename,),
        )
        conn.commit()
    finally:
        cur.close()


def run_migrations(conn):
    """Run all *.py migrations in backend/migrations/ that haven't been applied yet."""
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")

    if not os.path.isdir(migrations_dir):
        print("[WARN] No migrations/ directory found — skipping.")
        return

    # Only .py files, sorted deterministically by name
    py_files = sorted(
        f for f in os.listdir(migrations_dir)
        if f.endswith(".py") and not f.startswith("__")
    )

    if not py_files:
        print("[OK] No Python migration scripts found.")
        return

    applied = get_applied_migrations(conn)
    pending = [f for f in py_files if f not in applied]

    if not pending:
        print("[OK] All migrations already applied.")
        return

    for filename in pending:
        filepath = os.path.join(migrations_dir, filename)
        print(f"\n--- Running migration: {filename} ---")

        try:
            # Dynamically import the migration module
            spec = importlib.util.spec_from_file_location(filename[:-3], filepath)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)

            # Each script exposes run_migration() or migrate()
            if hasattr(mod, "run_migration"):
                mod.run_migration()
            elif hasattr(mod, "migrate"):
                mod.migrate()
            else:
                print(f"[WARN] {filename} has no run_migration() or migrate() — skipped.")
                continue

            record_migration(conn, filename)
            print(f"[OK] {filename} applied and recorded.")

        except Exception as e:
            print(f"[ERROR] {filename} failed: {e}")
            raise


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def init_db():
    """Full database initialisation: schema → tracking table → migrations."""
    print("=" * 60)
    print("TripMate DB Initializer")
    print("=" * 60)

    conn = get_db_connection()
    try:
        run_schema(conn)
        ensure_migrations_table(conn)
        run_migrations(conn)
    finally:
        conn.close()

    print("\n" + "=" * 60)
    print("Database initialisation complete.")
    print("=" * 60)


if __name__ == "__main__":
    init_db()

