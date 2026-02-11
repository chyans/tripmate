from flask import Blueprint, request, jsonify
from db import get_db_connection
from routes.auth import verify_token
from datetime import datetime, timedelta

premium_bp = Blueprint("premium_bp", __name__)

def get_user_from_token():
    """Helper to get user from token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    payload = verify_token(token)
    return payload

@premium_bp.route("/subscribe", methods=["POST"])
def subscribe():
    """Subscribe to premium (simplified - in production, integrate payment gateway)"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    # In production, you'd process payment here
    # For now, we'll just grant premium access
    
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Grant premium for 30 days
        premium_expires = datetime.now() + timedelta(days=30)
        cur.execute(
            "UPDATE users SET is_premium = TRUE, premium_expires_at = %s WHERE id = %s",
            (premium_expires, user["user_id"])
        )
        conn.commit()

        return jsonify({
            "message": "Premium subscription activated successfully",
            "premium_expires_at": premium_expires.isoformat()
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@premium_bp.route("/cancel", methods=["POST"])
def cancel_subscription():
    """Cancel premium subscription"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get current premium expiration
        cur.execute("SELECT premium_expires_at FROM users WHERE id = %s", (user["user_id"],))
        row = cur.fetchone()
        
        if not row or not row[0]:
            return jsonify({"error": "No active premium subscription"}), 400

        # Premium will remain active until expiration date
        # We just don't renew it
        return jsonify({
            "message": "Subscription cancellation confirmed. Premium access will remain until the end of your billing period.",
            "premium_expires_at": row[0].isoformat()
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

