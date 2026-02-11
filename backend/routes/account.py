from flask import Blueprint, request, jsonify
from db import get_db_connection
from routes.auth import verify_token
import bcrypt
import os

account_bp = Blueprint("account_bp", __name__)

def get_user_from_token():
    """Helper to get user from token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    payload = verify_token(token)
    return payload

@account_bp.route("/", methods=["GET"])
def get_account():
    """Get current user's account information"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """SELECT id, username, email, full_name, is_admin, is_premium,
                      premium_expires_at, created_at
               FROM users WHERE id = %s""",
            (user["user_id"],)
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "user": {
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "full_name": row[3],
                "is_admin": row[4],
                "is_premium": row[5],
                "premium_expires_at": row[6].isoformat() if row[6] else None,
                "created_at": row[7].isoformat(),
                "notifications_enabled": True  # Default to True since column doesn't exist in schema
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@account_bp.route("/", methods=["PUT"])
def update_account():
    """Update account information"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        updates = []
        values = []

        # Check if email is being changed and if it's already in use
        if "email" in data and data["email"]:
            cur.execute("SELECT id FROM users WHERE email = %s AND id != %s", (data["email"], user["user_id"]))
            if cur.fetchone():
                return jsonify({"error": "This email is already registered to another account"}), 400
            updates.append("email = %s")
            values.append(data["email"])

        if "full_name" in data:
            updates.append("full_name = %s")
            values.append(data["full_name"])

        # Note: notifications_enabled column doesn't exist in the current schema
        # If you want to add it, run: ALTER TABLE users ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE;
        # For now, we'll skip this update
        # if "notifications_enabled" in data:
        #     notifications_enabled = data["notifications_enabled"]
        #     if isinstance(notifications_enabled, str):
        #         notifications_enabled = notifications_enabled.lower() in ('true', '1', 'yes')
        #     notifications_enabled_value = 1 if notifications_enabled else 0
        #     updates.append("notifications_enabled = %s")
        #     values.append(notifications_enabled_value)

        # Password change requires current password
        if "password" in data and data["password"]:
            current_password = data.get("current_password")
            if not current_password:
                return jsonify({"error": "Current password is required to change password"}), 400

            # Verify current password
            cur.execute("SELECT password_hash FROM users WHERE id = %s", (user["user_id"],))
            db_user = cur.fetchone()
            if not db_user or not bcrypt.checkpw(current_password.encode("utf-8"), db_user[0].encode("utf-8")):
                return jsonify({"error": "Current password is incorrect"}), 400

            if len(data["password"]) < 8:
                return jsonify({"error": "Password must be at least 8 characters"}), 400

            password_hash = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            updates.append("password_hash = %s")
            values.append(password_hash)

        if not updates:
            return jsonify({"error": "No fields to update"}), 400

        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(user["user_id"])

        cur.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = %s",
            values
        )
        conn.commit()

        return jsonify({"message": "Account updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@account_bp.route("/", methods=["DELETE"])
def delete_account():
    """Delete user account"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    confirmation = data.get("confirmation", "").lower()

    if confirmation != "delete":
        return jsonify({"error": "Please type 'delete' to confirm account deletion"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Delete user (cascade will delete trips, photos, etc.)
        cur.execute("DELETE FROM users WHERE id = %s", (user["user_id"],))
        conn.commit()

        return jsonify({"message": "Account deleted successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

