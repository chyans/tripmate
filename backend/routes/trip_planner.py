from flask import Blueprint, request, jsonify
import itertools
import math

trip_bp = Blueprint("trip_bp", __name__)

# Temporary mock data - in real case, you’ll use Google Maps API for distances
def haversine(coord1, coord2):
    """Calculate great-circle distance between two coordinates."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371  # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

@trip_bp.route("/plan", methods=["POST"])
def plan_trip():
    data = request.json
    locations = data.get("locations")  # [{"name": "Place A", "lat": 1.23, "lng": 4.56}, ...]

    if not locations or len(locations) < 2:
        return jsonify({"error": "At least two locations required"}), 400

    # Compute all permutations and choose shortest route (brute force for demo)
    best_route = None
    best_distance = float("inf")

    for perm in itertools.permutations(locations[1:]):  # fix start point
        route = [locations[0]] + list(perm)
        total_distance = 0
        for i in range(len(route) - 1):
            total_distance += haversine(
                (route[i]["lat"], route[i]["lng"]),
                (route[i+1]["lat"], route[i+1]["lng"])
            )
        if total_distance < best_distance:
            best_distance = total_distance
            best_route = route

    return jsonify({
        "optimized_route": best_route,
        "total_distance_km": round(best_distance, 2)
    })
