from flask import Blueprint, request, jsonify
from db import get_db_connection
import bcrypt
from datetime import datetime, timedelta
import jwt
import os

auth_bp = Blueprint("auth_bp", __name__)

# JWT secret key (in production, use environment variable)
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

def verify_token(token):
    """Verify JWT token - exported for use in other modules"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def generate_token(user_id, username, is_admin=False, is_premium=False):
    """Generate JWT token for user"""
    payload = {
        "user_id": user_id,
        "username": username,
        "is_admin": is_admin,
        "is_premium": is_premium,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if username or email already exists
        cur.execute(
            "SELECT id FROM users WHERE username = %s OR email = %s",
            (username, email)
        )
        if cur.fetchone():
            return jsonify({"error": "Username or email already exists"}), 400

        # Hash password
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # Insert user
        cur.execute(
            """INSERT INTO users (username, email, password_hash, full_name)
               VALUES (%s, %s, %s, %s)""",
            (username, email, password_hash, full_name)
        )
        user_id = cur.lastrowid
        conn.commit()
        
        # Fetch the created user
        cur.execute(
            "SELECT id, username, email, full_name, is_admin, is_premium FROM users WHERE id = %s",
            (user_id,)
        )
        user = cur.fetchone()

        # Create default notifications for new user
        try:
            from routes.notifications import create_default_notifications
            create_default_notifications(user_id, user[5])
        except Exception as e:
            print(f"Error creating default notifications: {str(e)}")

        token = generate_token(user[0], user[1], user[4], user[5])

        return jsonify({
            "message": "Registration successful",
            "token": token,
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

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request data"}), 400
            
        username = data.get("username", "").strip()
        password = data.get("password", "")

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            # Try to get all columns including suspended ones
            # If columns don't exist, fall back to basic query
            user = None
            has_suspended_columns = False
            
            try:
                cur.execute(
                    "SELECT id, username, email, password_hash, full_name, is_admin, is_premium, is_suspended, suspended_reason FROM users WHERE username = %s OR email = %s",
                    (username, username)
                )
                user = cur.fetchone()
                has_suspended_columns = True
            except Exception as e:
                # If suspended columns don't exist, use query without them
                print(f"Note: Suspended columns may not exist, using basic query: {e}")
                try:
                    cur.execute(
                        "SELECT id, username, email, password_hash, full_name, is_admin, is_premium FROM users WHERE username = %s OR email = %s",
                        (username, username)
                    )
                    user = cur.fetchone()
                except Exception as db_error:
                    print(f"Database error during login: {db_error}")
                    return jsonify({"error": "Database error. Please try again."}), 500

            if not user:
                return jsonify({"error": "Invalid credentials"}), 401

            # Check if account is suspended (only if columns exist and were selected)
            if has_suspended_columns and len(user) > 7:
                try:
                    is_suspended = bool(user[7]) if user[7] is not None else False
                    if is_suspended:
                        suspended_reason = user[8] if len(user) > 8 and user[8] else "This account has been suspended."
                        return jsonify({
                            "error": "Your account has been suspended.",
                            "reason": suspended_reason
                        }), 403
                except (IndexError, TypeError) as e:
                    # Suspended columns don't exist or weren't selected, skip check
                    print(f"Note: Could not check suspension status: {e}")
                    pass

            # Verify password
            try:
                if not bcrypt.checkpw(password.encode("utf-8"), user[3].encode("utf-8")):
                    return jsonify({"error": "Invalid credentials"}), 401
            except Exception as pw_error:
                print(f"Password verification error: {pw_error}")
                return jsonify({"error": "Invalid credentials"}), 401

            # Check if premium is still valid
            is_premium = bool(user[6]) if len(user) > 6 else False
            try:
                cur.execute("SELECT premium_expires_at FROM users WHERE id = %s", (user[0],))
                premium_result = cur.fetchone()
                premium_expires = premium_result[0] if premium_result else None
                
                if premium_expires and datetime.now() > premium_expires:
                    # Premium expired, update user
                    cur.execute("UPDATE users SET is_premium = FALSE WHERE id = %s", (user[0],))
                    conn.commit()
                    is_premium = False
            except Exception as e:
                print(f"Error checking premium status: {str(e)}")
            
            # Ensure user has default notifications (don't block login if this fails)
            try:
                from routes.notifications import create_default_notifications
                create_default_notifications(user[0], is_premium)
            except Exception as e:
                print(f"Warning: Could not create default notifications: {str(e)}")
                if "Table" not in str(e) and "doesn't exist" not in str(e):
                    import traceback
                    traceback.print_exc()

            token = generate_token(user[0], user[1], user[5] if len(user) > 5 else False, is_premium)

            return jsonify({
                "message": "Login successful",
                "token": token,
                "user": {
                    "id": user[0],
                    "username": user[1],
                    "email": user[2],
                    "full_name": user[4] if len(user) > 4 else "",
                    "is_admin": bool(user[5]) if len(user) > 5 else False,
                    "is_premium": is_premium
                }
            }), 200

        except Exception as e:
            print(f"Login error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"Login failed: {str(e)}"}), 500
        finally:
            cur.close()
            conn.close()
    except Exception as e:
        print(f"Login request error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Request error: {str(e)}"}), 500

@auth_bp.route("/verify", methods=["POST"])
def verify():
    """Verify token and return user info"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    
    if not token:
        return jsonify({"error": "Token required"}), 401

    payload = verify_token(token)
    if not payload:
        return jsonify({"error": "Invalid or expired token"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT id, username, email, full_name, is_admin, is_premium FROM users WHERE id = %s",
            (payload["user_id"],)
        )
        user = cur.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "user": {
                "id": user[0],
                "username": user[1],
                "email": user[2],
                "full_name": user[3],
                "is_admin": user[4],
                "is_premium": user[5]
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

