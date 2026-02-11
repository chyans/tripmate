from flask import Blueprint, request, jsonify
from db import get_db_connection
from routes.auth import verify_token

reviews_bp = Blueprint("reviews_bp", __name__)

def get_user_from_token():
    """Helper to get user from token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    payload = verify_token(token)
    return payload

@reviews_bp.route("/trip/<int:trip_id>", methods=["GET"])
def get_trip_reviews(trip_id):
    """Get reviews for a trip"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """SELECT r.id, r.rating, r.comment, r.created_at, u.username, u.full_name
               FROM reviews r
               JOIN users u ON r.user_id = u.id
               WHERE r.trip_id = %s
               ORDER BY r.created_at DESC""",
            (trip_id,)
        )

        reviews = []
        total_rating = 0
        count = 0

        for row in cur.fetchall():
            reviews.append({
                "id": row[0],
                "rating": row[1],
                "comment": row[2],
                "created_at": row[3].isoformat(),
                "username": row[4],
                "full_name": row[5]
            })
            total_rating += row[1]
            count += 1

        average_rating = total_rating / count if count > 0 else 0

        return jsonify({
            "reviews": reviews,
            "average_rating": round(average_rating, 2),
            "total_reviews": count
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@reviews_bp.route("/trip/<int:trip_id>", methods=["POST"])
def create_review(trip_id):
    """Create a review for a trip"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    rating = data.get("rating")
    comment = data.get("comment", "").strip()

    if rating is None:
        return jsonify({"error": "Please select a rating between 1-4 stars"}), 400

    if rating < 1 or rating > 4:
        return jsonify({"error": "Please select a rating between 1-4 stars"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify user has access to this trip (has visited it)
        cur.execute("SELECT user_id FROM trips WHERE id = %s", (trip_id,))
        trip = cur.fetchone()
        if not trip:
            return jsonify({"error": "Trip not found"}), 404

        # Check if user already reviewed this trip
        cur.execute(
            "SELECT id FROM reviews WHERE trip_id = %s AND user_id = %s",
            (trip_id, user["user_id"])
        )
        if cur.fetchone():
            return jsonify({"error": "You have already reviewed this destination"}), 400

        cur.execute(
            """INSERT INTO reviews (trip_id, user_id, rating, comment)
               VALUES (%s, %s, %s, %s)""",
            (trip_id, user["user_id"], rating, comment)
        )
        review_id = cur.lastrowid
        conn.commit()
        
        # Fetch the created review
        cur.execute(
            "SELECT id, created_at FROM reviews WHERE id = %s",
            (review_id,)
        )
        review = cur.fetchone()

        return jsonify({
            "message": "Review created successfully",
            "review": {
                "id": review[0],
                "rating": rating,
                "comment": comment,
                "created_at": review[1].isoformat()
            }
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@reviews_bp.route("/<int:review_id>", methods=["DELETE"])
def delete_review(review_id):
    """Delete a review"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify ownership
        cur.execute("SELECT user_id FROM reviews WHERE id = %s", (review_id,))
        review = cur.fetchone()
        if not review:
            return jsonify({"error": "Review not found"}), 404
        if review[0] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        cur.execute("DELETE FROM reviews WHERE id = %s", (review_id,))
        conn.commit()

        return jsonify({"message": "Review deleted successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@reviews_bp.route("/user", methods=["GET"])
def get_user_reviews():
    """Get all reviews by current user"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """SELECT r.id, r.trip_id, r.rating, r.comment, r.created_at, t.name
               FROM reviews r
               JOIN trips t ON r.trip_id = t.id
               WHERE r.user_id = %s
               ORDER BY r.created_at DESC""",
            (user["user_id"],)
        )

        reviews = []
        for row in cur.fetchall():
            reviews.append({
                "id": row[0],
                "trip_id": row[1],
                "rating": row[2],
                "comment": row[3],
                "created_at": row[4].isoformat(),
                "trip_name": row[5]
            })

        return jsonify({"reviews": reviews}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

