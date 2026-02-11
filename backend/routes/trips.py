from flask import Blueprint, request, jsonify
from db import get_db_connection
from routes.auth import verify_token
from datetime import datetime
import json

trips_bp = Blueprint("trips_bp", __name__)

def get_user_from_token():
    """Helper to get user from token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    from routes.auth import verify_token
    payload = verify_token(token)
    return payload

@trips_bp.route("/monthly-count", methods=["GET"])
def get_monthly_trip_count():
    """Get monthly trip count for free users"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    # Premium users have unlimited trips
    if user.get("is_premium"):
        return jsonify({
            "trips_used": 0,
            "limit": None,
            "is_premium": True
        }), 200

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get current month start
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)
        
        # Count trips created this month
        cur.execute(
            "SELECT COUNT(*) FROM trips WHERE user_id = %s AND created_at >= %s",
            (user["user_id"], month_start)
        )
        trips_this_month = cur.fetchone()[0]
        
        return jsonify({
            "trips_used": trips_this_month,
            "limit": 2,
            "is_premium": False
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@trips_bp.route("/", methods=["GET"])
def get_trips():
    """Get all trips for the current user"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """SELECT id, name, description, origin, destinations, optimized_route,
                      total_distance_km, route_mode, travel_preference, budget,
                      start_date, end_date, created_at, updated_at
               FROM trips WHERE user_id = %s ORDER BY created_at DESC""",
            (user["user_id"],)
        )
        
        trips = []
        for row in cur.fetchall():
            # Parse JSON fields if they are strings
            origin_data = row[3]
            destinations_data = row[4]
            optimized_route_data = row[5]
            
            if isinstance(origin_data, str):
                origin_data = json.loads(origin_data) if origin_data else None
            if isinstance(destinations_data, str):
                destinations_data = json.loads(destinations_data) if destinations_data else []
            if isinstance(optimized_route_data, str):
                optimized_route_data = json.loads(optimized_route_data) if optimized_route_data else []
            
            trips.append({
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "origin": origin_data,
                "destinations": destinations_data,
                "optimized_route": optimized_route_data,
                "total_distance_km": float(row[6]) if row[6] else None,
                "route_mode": row[7],
                "travel_preference": row[8],
                "budget": float(row[9]) if row[9] else None,
                "start_date": row[10].isoformat() if row[10] else None,
                "end_date": row[11].isoformat() if row[11] else None,
                "created_at": row[12].isoformat(),
                "updated_at": row[13].isoformat()
            })

        return jsonify({"trips": trips}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@trips_bp.route("/<int:trip_id>", methods=["GET"])
def get_trip(trip_id):
    """Get a specific trip"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """SELECT id, name, description, origin, destinations, optimized_route,
                      total_distance_km, route_mode, travel_preference, budget,
                      start_date, end_date, created_at, updated_at, user_id
               FROM trips WHERE id = %s""",
            (trip_id,)
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"error": "Trip not found"}), 404

        # Check if user owns this trip
        if row[14] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        # Parse JSON fields if they are strings
        origin_data = row[3]
        destinations_data = row[4]
        optimized_route_data = row[5]
        
        if isinstance(origin_data, str):
            origin_data = json.loads(origin_data) if origin_data else None
        if isinstance(destinations_data, str):
            destinations_data = json.loads(destinations_data) if destinations_data else []
        if isinstance(optimized_route_data, str):
            optimized_route_data = json.loads(optimized_route_data) if optimized_route_data else []
        
        trip = {
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "origin": origin_data,
            "destinations": destinations_data,
            "optimized_route": optimized_route_data,
            "total_distance_km": float(row[6]) if row[6] else None,
            "route_mode": row[7],
            "travel_preference": row[8],
            "budget": float(row[9]) if row[9] else None,
            "start_date": row[10].isoformat() if row[10] else None,
            "end_date": row[11].isoformat() if row[11] else None,
            "created_at": row[12].isoformat(),
            "updated_at": row[13].isoformat()
        }

        return jsonify({"trip": trip}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@trips_bp.route("/", methods=["POST"])
def create_trip():
    """Create a new trip"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    origin = data.get("origin")
    destinations = data.get("destinations", [])
    optimized_route = data.get("optimized_route", [])
    total_distance_km = data.get("total_distance_km")
    route_mode = data.get("route_mode", "DRIVING")
    travel_preference = data.get("travel_preference", "auto")
    budget = data.get("budget")
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    if not name:
        return jsonify({"error": "Trip name is required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check monthly trip limit for free users (2 trips per month)
        if not user.get("is_premium"):
            # Get current month start
            now = datetime.now()
            month_start = datetime(now.year, now.month, 1)
            
            # Count trips created this month
            cur.execute(
                "SELECT COUNT(*) FROM trips WHERE user_id = %s AND created_at >= %s",
                (user["user_id"], month_start)
            )
            trips_this_month = cur.fetchone()[0]
            
            if trips_this_month >= 2:
                return jsonify({
                    "error": "Monthly trip limit reached",
                    "message": "Free plan allows up to 2 trips per month. Upgrade to Premium for unlimited trips."
                }), 403
        cur.execute(
            """INSERT INTO trips (user_id, name, description, origin, destinations,
                      optimized_route, total_distance_km, route_mode, travel_preference,
                      budget, start_date, end_date)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                user["user_id"], name, description,
                json.dumps(origin) if origin else None,
                json.dumps(destinations),
                json.dumps(optimized_route),
                total_distance_km, route_mode, travel_preference,
                budget,
                datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else None,
                datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else None
            )
        )
        trip_id = cur.lastrowid
        conn.commit()
        
        # Fetch the created trip
        cur.execute(
            "SELECT id, name, created_at FROM trips WHERE id = %s",
            (trip_id,)
        )
        trip = cur.fetchone()

        return jsonify({
            "message": "Trip created successfully",
            "trip": {
                "id": trip[0],
                "name": trip[1],
                "created_at": trip[2].isoformat()
            }
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@trips_bp.route("/<int:trip_id>", methods=["PUT"])
def update_trip(trip_id):
    """Update a trip"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check ownership
        cur.execute("SELECT user_id FROM trips WHERE id = %s", (trip_id,))
        trip = cur.fetchone()
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        if trip[0] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        # Build update query dynamically
        updates = []
        values = []

        if "name" in data:
            updates.append("name = %s")
            values.append(data["name"])
        if "description" in data:
            updates.append("description = %s")
            values.append(data["description"])
        if "origin" in data:
            updates.append("origin = %s")
            values.append(json.dumps(data["origin"]) if data["origin"] else None)
        if "destinations" in data:
            updates.append("destinations = %s")
            values.append(json.dumps(data["destinations"]))
        if "optimized_route" in data:
            updates.append("optimized_route = %s")
            values.append(json.dumps(data["optimized_route"]))
        if "total_distance_km" in data:
            updates.append("total_distance_km = %s")
            values.append(data["total_distance_km"])
        if "route_mode" in data:
            updates.append("route_mode = %s")
            values.append(data["route_mode"])
        if "travel_preference" in data:
            updates.append("travel_preference = %s")
            values.append(data["travel_preference"])
        if "budget" in data:
            updates.append("budget = %s")
            values.append(data["budget"])
        if "start_date" in data:
            updates.append("start_date = %s")
            values.append(datetime.fromisoformat(data["start_date"].replace("Z", "+00:00")) if data["start_date"] else None)
        if "end_date" in data:
            updates.append("end_date = %s")
            values.append(datetime.fromisoformat(data["end_date"].replace("Z", "+00:00")) if data["end_date"] else None)

        if not updates:
            return jsonify({"error": "No fields to update"}), 400

        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(trip_id)

        cur.execute(
            f"UPDATE trips SET {', '.join(updates)} WHERE id = %s",
            values
        )
        conn.commit()

        return jsonify({"message": "Trip updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@trips_bp.route("/<int:trip_id>", methods=["DELETE"])
def delete_trip(trip_id):
    """Delete a trip"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check ownership
        cur.execute("SELECT user_id FROM trips WHERE id = %s", (trip_id,))
        trip = cur.fetchone()
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        if trip[0] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        cur.execute("DELETE FROM trips WHERE id = %s", (trip_id,))
        conn.commit()

        return jsonify({"message": "Trip deleted successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@trips_bp.route("/search", methods=["GET"])
def search_trips():
    """Search trips by name"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Search query is required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """SELECT id, name, description, created_at
               FROM trips WHERE user_id = %s AND LOWER(name) LIKE LOWER(%s)
               ORDER BY created_at DESC""",
            (user["user_id"], f"%{query}%")
        )

        trips = []
        for row in cur.fetchall():
            trips.append({
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "created_at": row[3].isoformat()
            })

        return jsonify({"trips": trips}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

