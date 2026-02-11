from flask import Blueprint, request, jsonify
from db import get_db_connection
from routes.auth import verify_token
import bcrypt
import os
from datetime import datetime, timedelta

admin_bp = Blueprint("admin_bp", __name__)

def get_user_from_token():
    """Helper to get user from token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    payload = verify_token(token)
    return payload

def require_admin():
    """Decorator to require admin access"""
    user = get_user_from_token()
    if not user or not user.get("is_admin"):
        return None
    return user

@admin_bp.route("/users", methods=["GET"])
def get_users():
    """Get all users (admin only)"""
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Unauthorized - Admin access required"}), 403

    account_type = request.args.get("type")  # free, premium, admin
    status = request.args.get("status")  # active, deleted

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        query = """SELECT id, username, email, full_name, is_admin, is_premium,
                          premium_expires_at, is_suspended, suspended_reason, created_at
                   FROM users WHERE 1=1"""
        params = []

        if account_type:
            if account_type == "free":
                query += " AND is_premium = FALSE AND is_admin = FALSE"
            elif account_type == "premium":
                query += " AND is_premium = TRUE"
            elif account_type == "admin":
                query += " AND is_admin = TRUE"

        query += " ORDER BY created_at DESC"

        cur.execute(query, params)
        
        users = []
        for row in cur.fetchall():
            users.append({
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "full_name": row[3],
                "is_admin": bool(row[4]),
                "is_premium": bool(row[5]),
                "premium_expires_at": row[6].isoformat() if row[6] else None,
                "is_suspended": bool(row[7]) if len(row) > 7 else False,
                "suspended_reason": row[8] if len(row) > 8 and row[8] else None,
                "created_at": row[9].isoformat() if len(row) > 9 and row[9] else None
            })

        return jsonify({"users": users}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route("/users", methods=["POST"])
def create_user():
    """Create a new user (admin only)"""
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Unauthorized - Admin access required"}), 403

    data = request.get_json()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    account_type = data.get("account_type", "free")  # free, premium, admin

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if username or email already exists
        cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
        if cur.fetchone():
            return jsonify({"error": "Email already exists"}), 400

        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        
        is_admin = account_type == "admin"
        is_premium = account_type == "premium"
        premium_expires = None
        if is_premium:
            premium_expires = datetime.now() + timedelta(days=30)

        cur.execute(
            """INSERT INTO users (username, email, password_hash, full_name, is_admin, is_premium, premium_expires_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (username, email, password_hash, full_name, is_admin, is_premium, premium_expires)
        )
        user_id = cur.lastrowid
        conn.commit()
        
        # Fetch the created user
        cur.execute(
            "SELECT id, username, email, full_name, is_admin, is_premium FROM users WHERE id = %s",
            (user_id,)
        )
        user = cur.fetchone()

        return jsonify({
            "message": "User created successfully",
            "user": {
                "id": user[0],
                "username": user[1],
                "email": user[2],
                "full_name": user[3],
                "is_admin": user[4],
                "is_premium": user[5]
            }
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route("/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    """Update a user (admin only)"""
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Unauthorized - Admin access required"}), 403

    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            return jsonify({"error": "No user found with that ID"}), 404

        updates = []
        values = []

        if "username" in data:
            updates.append("username = %s")
            values.append(data["username"])
        if "email" in data:
            updates.append("email = %s")
            values.append(data["email"])
        if "full_name" in data:
            updates.append("full_name = %s")
            values.append(data["full_name"])
        # Ensure admin and premium are mutually exclusive
        if "is_admin" in data:
            # Convert boolean to 0/1 for MySQL (handle both bool and string)
            is_admin_bool = data["is_admin"]
            if isinstance(is_admin_bool, str):
                is_admin_bool = is_admin_bool.lower() in ('true', '1', 'yes')
            is_admin_value = 1 if is_admin_bool else 0
            
            updates.append("is_admin = %s")
            values.append(is_admin_value)
            
            # If setting as admin, ensure premium is false
            if is_admin_bool:
                updates.append("is_premium = 0")
                updates.append("premium_expires_at = NULL")
        if "is_premium" in data:
            # Convert boolean to 0/1 for MySQL (handle both bool and string)
            is_premium_bool = data["is_premium"]
            if isinstance(is_premium_bool, str):
                is_premium_bool = is_premium_bool.lower() in ('true', '1', 'yes')
            is_premium_value = 1 if is_premium_bool else 0
            
            # If setting as premium, ensure admin is false
            if is_premium_bool:
                updates.append("is_admin = 0")
            
            updates.append("is_premium = %s")
            values.append(is_premium_value)
            
            if is_premium_bool:
                updates.append("premium_expires_at = %s")
                values.append(datetime.now() + timedelta(days=30))
            else:
                updates.append("premium_expires_at = NULL")
        
        if "is_suspended" in data:
            # Convert boolean to 0/1 for MySQL (handle both bool and string)
            is_suspended_bool = data["is_suspended"]
            if isinstance(is_suspended_bool, str):
                is_suspended_bool = is_suspended_bool.lower() in ('true', '1', 'yes')
            is_suspended_value = 1 if is_suspended_bool else 0
            
            updates.append("is_suspended = %s")
            values.append(is_suspended_value)
            
            if "suspended_reason" in data:
                updates.append("suspended_reason = %s")
                values.append(data["suspended_reason"])
            elif is_suspended_bool:
                # If suspending but no reason provided, set default
                updates.append("suspended_reason = %s")
                values.append("Account suspended by administrator.")
            elif not is_suspended_bool:
                # If unsuspending, clear the reason
                updates.append("suspended_reason = NULL")

        if not updates:
            return jsonify({"error": "No fields to update"}), 400

        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(user_id)

        cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", values)
        conn.commit()

        return jsonify({"message": "User updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    """Delete a user (admin only)"""
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Unauthorized - Admin access required"}), 403

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            return jsonify({"error": "No user found with that ID"}), 404

        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()

        return jsonify({"message": "User deleted successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@admin_bp.route("/users/search", methods=["GET"])
def search_users():
    """Search users (admin only)"""
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Unauthorized - Admin access required"}), 403

    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Search query is required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """SELECT id, username, email, full_name, is_admin, is_premium, is_suspended, suspended_reason, created_at
               FROM users WHERE LOWER(username) LIKE LOWER(%s) OR LOWER(email) LIKE LOWER(%s) OR LOWER(full_name) LIKE LOWER(%s)
               OR CAST(id AS CHAR) = %s
               ORDER BY created_at DESC""",
            (f"%{query}%", f"%{query}%", f"%{query}%", query)
        )

        users = []
        for row in cur.fetchall():
            users.append({
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "full_name": row[3],
                "is_admin": bool(row[4]),
                "is_premium": bool(row[5]),
                "is_suspended": bool(row[6]) if len(row) > 6 else False,
                "suspended_reason": row[7] if len(row) > 7 and row[7] else None,
                "created_at": row[8].isoformat() if len(row) > 8 and row[8] else None
            })

        return jsonify({"users": users}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route("/init-db", methods=["POST"])
def init_db_endpoint():
    """
    Run the database initializer (schema + migrations).
    Protected: only works when ENABLE_DB_INIT=true is set in the environment.
    """
    if os.getenv("ENABLE_DB_INIT", "").lower() != "true":
        return jsonify({
            "error": "Database initialisation is disabled. Set ENABLE_DB_INIT=true to enable."
        }), 403

    try:
        from init_db import init_db
        init_db()
        return jsonify({"message": "Database initialised successfully."}), 200
    except Exception as e:
        return jsonify({"error": f"Database initialisation failed: {str(e)}"}), 500

