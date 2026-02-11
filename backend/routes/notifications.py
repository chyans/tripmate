from flask import Blueprint, request, jsonify
from db import get_db_connection

notifications_bp = Blueprint("notifications_bp", __name__)

def create_default_notifications(user_id, is_premium=False):
    """Create default notifications for a user if they don't exist"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if user already has the default notifications
        cur.execute(
            """SELECT type FROM notifications WHERE user_id = %s AND type IN ('feature', 'premium_upgrade')""",
            (user_id,)
        )
        existing_types = [row[0] for row in cur.fetchall()]
        
        # Create feature notification if it doesn't exist
        if 'feature' not in existing_types:
            cur.execute(
                """INSERT INTO notifications (user_id, message, type, is_read) 
                   VALUES (%s, %s, %s, FALSE)""",
                (user_id, 
                 "New feature: Google Maps routing now supports real-time weather and traffic conditions! Plan your trips with optimal routes based on current conditions.",
                 "feature")
            )
        
        # Only add premium upgrade notification for free users if it doesn't exist
        if not is_premium and 'premium_upgrade' not in existing_types:
            cur.execute(
                """INSERT INTO notifications (user_id, message, type, is_read) 
                   VALUES (%s, %s, %s, FALSE)""",
                (user_id,
                 "Upgrade to Premium now and unlock unlimited trips, AI-powered Q&A, video exports, and more! Special offer: Only $9.99/month. Don't miss out on this exclusive discount!",
                 "premium_upgrade")
            )
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error creating default notifications: {str(e)}")
    finally:
        cur.close()
        conn.close()

def get_user_from_token():
    """Helper to get user from token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    # Import here to avoid circular dependency
    from routes.auth import verify_token
    payload = verify_token(token)
    return payload

@notifications_bp.route("/", methods=["GET"])
def get_notifications():
    """Get all notifications for current user"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get user's premium status
        cur.execute("SELECT is_premium FROM users WHERE id = %s", (user["user_id"],))
        user_data = cur.fetchone()
        is_premium = user_data[0] if user_data else False

        # Get notifications (exclude premium upgrade notification if user is premium)
        if is_premium:
            cur.execute(
                """SELECT id, message, type, is_read, created_at
                   FROM notifications WHERE user_id = %s AND type != 'premium_upgrade'
                   ORDER BY created_at DESC""",
                (user["user_id"],)
            )
        else:
            cur.execute(
                """SELECT id, message, type, is_read, created_at
                   FROM notifications WHERE user_id = %s
                   ORDER BY created_at DESC""",
                (user["user_id"],)
            )

        notifications = []
        for row in cur.fetchall():
            notifications.append({
                "id": row[0],
                "message": row[1],
                "type": row[2],
                "is_read": bool(row[3]),
                "created_at": row[4].isoformat() if row[4] else None
            })

        unread_count = sum(1 for n in notifications if not n["is_read"])

        return jsonify({
            "notifications": notifications,
            "unread_count": unread_count
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@notifications_bp.route("/<int:notification_id>/read", methods=["PUT"])
def mark_read(notification_id):
    """Mark a notification as read"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s",
            (notification_id, user["user_id"])
        )
        conn.commit()

        if cur.rowcount == 0:
            return jsonify({"error": "Notification not found"}), 404

        return jsonify({"message": "Notification marked as read"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@notifications_bp.route("/<int:notification_id>", methods=["DELETE"])
def delete_notification(notification_id):
    """Delete a notification"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "DELETE FROM notifications WHERE id = %s AND user_id = %s",
            (notification_id, user["user_id"])
        )
        conn.commit()

        if cur.rowcount == 0:
            return jsonify({"error": "Notification not found"}), 404

        return jsonify({"message": "Notification deleted successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@notifications_bp.route("/read-all", methods=["PUT"])
def mark_all_read():
    """Mark all notifications as read"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE",
            (user["user_id"],)
        )
        conn.commit()

        return jsonify({"message": "All notifications marked as read"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

