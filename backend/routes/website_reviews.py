from flask import Blueprint, request, jsonify
from db import get_db_connection
from routes.auth import verify_token
import json

website_reviews_bp = Blueprint("website_reviews_bp", __name__)

def get_user_from_token():
    """Helper to get user from token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    payload = verify_token(token)
    return payload

@website_reviews_bp.route("/", methods=["GET"])
def get_website_reviews():
    """Get all website reviews (for admin or public display)"""
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    
    try:
        cur.execute("""
            SELECT wr.id, wr.rating, wr.comment, wr.created_at, 
                   u.username, u.full_name
            FROM website_reviews wr
            JOIN users u ON wr.user_id = u.id
            ORDER BY wr.created_at DESC
        """)
        reviews = cur.fetchall()
        
        # Convert datetime to string
        for review in reviews:
            if review.get("created_at"):
                review["created_at"] = review["created_at"].isoformat()
        
        return jsonify({"reviews": reviews}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@website_reviews_bp.route("/my", methods=["GET"])
def get_my_review():
    """Get current user's website review"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    
    try:
        cur.execute("""
            SELECT id, rating, comment, low_rating_feedback, created_at, updated_at
            FROM website_reviews
            WHERE user_id = %s
        """, (user["user_id"],))
        review = cur.fetchone()
        
        if review:
            if review.get("created_at"):
                review["created_at"] = review["created_at"].isoformat()
            if review.get("updated_at"):
                review["updated_at"] = review["updated_at"].isoformat()
            if review.get("low_rating_feedback"):
                review["low_rating_feedback"] = json.loads(review["low_rating_feedback"]) if isinstance(review["low_rating_feedback"], str) else review["low_rating_feedback"]
        
        return jsonify({"review": review}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@website_reviews_bp.route("/", methods=["POST"])
def create_website_review():
    """Create or update website review"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    rating = data.get("rating")
    comment = data.get("comment", "")
    low_rating_feedback = data.get("low_rating_feedback", [])
    
    if not rating or rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be between 1 and 5"}), 400
    
    # If rating is 1-2, require feedback
    if rating <= 2 and (not low_rating_feedback or len(low_rating_feedback) == 0):
        return jsonify({"error": "Please provide feedback for low ratings"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if user already has a review
        cur.execute("SELECT id FROM website_reviews WHERE user_id = %s", (user["user_id"],))
        existing = cur.fetchone()
        
        if existing:
            # Update existing review
            cur.execute("""
                UPDATE website_reviews 
                SET rating = %s, comment = %s, low_rating_feedback = %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """, (rating, comment, json.dumps(low_rating_feedback), user["user_id"]))
        else:
            # Create new review
            cur.execute("""
                INSERT INTO website_reviews (user_id, rating, comment, low_rating_feedback)
                VALUES (%s, %s, %s, %s)
            """, (user["user_id"], rating, comment, json.dumps(low_rating_feedback)))
        
        conn.commit()
        return jsonify({"message": "Review submitted successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@website_reviews_bp.route("/stats", methods=["GET"])
def get_review_stats():
    """Get review statistics"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                COUNT(*) as total_reviews,
                AVG(rating) as average_rating,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
            FROM website_reviews
        """)
        row = cur.fetchone()
        
        return jsonify({
            "total_reviews": row[0] or 0,
            "average_rating": float(row[1]) if row[1] else 0,
            "five_star": row[2] or 0,
            "four_star": row[3] or 0,
            "three_star": row[4] or 0,
            "two_star": row[5] or 0,
            "one_star": row[6] or 0
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


