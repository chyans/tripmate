from flask import Flask, request, jsonify
from flask_cors import CORS
import math, csv, heapq, itertools
import os
from dotenv import load_dotenv
from routes.photos import photos_bp
from routes.ai_chat import ai_bp
from routes.export import export_bp

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- CORS configuration ---
# In production, set FRONTEND_URL to your deployed frontend origin (e.g. https://tripmate-frontend.up.railway.app)
# Multiple origins can be comma-separated.
_allowed_origins = os.getenv("FRONTEND_URL", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [o.strip() for o in _allowed_origins.split(",") if o.strip()]
CORS(
    app,
    origins=allowed_origins,
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type", "Content-Disposition", "Content-Length"],
)

# Initialize AI service on startup
try:
    from ai_service import get_ai_service
    print("Initializing AI service on startup...")
    ai_service = get_ai_service()
    if ai_service.df is not None:
        print(f"AI service initialized successfully with {len(ai_service.df)} entries!")
    else:
        print("AI service initialized but knowledge base not loaded yet.")
except Exception as e:
    print(f"Warning: Could not initialize AI service on startup: {e}")
    import traceback
    traceback.print_exc()

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Auto-run database migrations on startup (adds missing columns if needed)
try:
    from db import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'notifications_enabled'
    """)
    if cur.fetchone()[0] == 0:
        cur.execute("ALTER TABLE users ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE")
        conn.commit()
        print("[Migration] Added notifications_enabled column to users table")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Warning: Auto-migration check failed: {e}")

# Register blueprints
from routes.auth import auth_bp
from routes.trips import trips_bp
from routes.account import account_bp
from routes.admin import admin_bp
from routes.premium import premium_bp
from routes.budget import budget_bp
from routes.notifications import notifications_bp
from routes.reviews import reviews_bp
from routes.website_reviews import website_reviews_bp
from routes.weather_traffic import weather_traffic_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(trips_bp, url_prefix="/api/trips")
app.register_blueprint(photos_bp, url_prefix="/api/photos")
app.register_blueprint(ai_bp, url_prefix="/api/ai")
app.register_blueprint(export_bp, url_prefix="/api/export")
app.register_blueprint(account_bp, url_prefix="/api/account")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(premium_bp, url_prefix="/api/premium")
app.register_blueprint(budget_bp, url_prefix="/api/budget")
app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
app.register_blueprint(reviews_bp, url_prefix="/api/reviews")
app.register_blueprint(website_reviews_bp, url_prefix="/api/website-reviews")
app.register_blueprint(weather_traffic_bp)

# --- Haversine Distance ---
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (
        math.sin(dLat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dLon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# --- Load airports from dataset ---
# --- Load airports and filter only those used in routes ---
def load_airports_and_routes():
    # Step 1: Load all airports
    airports = {}
    with open("airports.dat", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            try:
                iata = row[4].strip()
                if not iata or len(iata) != 3:
                    continue
                name = row[1]
                lat, lng = float(row[6]), float(row[7])
                airports[iata] = {"name": name, "lat": lat, "lng": lng}
            except:
                continue

    # Step 2: Load routes and collect airports that have scheduled flights
    used_airports = set()
    graph = {}

    with open("routes.dat", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 5:
                continue
            src, dest = row[2].strip(), row[4].strip()
            if src in airports and dest in airports:
                used_airports.update([src, dest])
                d = haversine(
                    airports[src]["lat"], airports[src]["lng"],
                    airports[dest]["lat"], airports[dest]["lng"]
                )
                graph.setdefault(src, []).append((dest, d))

    # Step 3: Keep only airports that appear in routes
    filtered_airports = {code: info for code, info in airports.items() if code in used_airports}

    print(f"Loaded {len(filtered_airports)} commercial airports connected by routes.")
    return filtered_airports, graph

# --- Improved Dijkstra’s Algorithm ---
def dijkstra(graph, start, goal):
    pq = [(0, start, [start])]
    visited = set()

    while pq:
        (dist, node, path) = heapq.heappop(pq)
        if node == goal:
            return dist, path
        if node in visited:
            continue
        visited.add(node)

        for neighbor, weight in graph.get(node, []):
            if neighbor not in visited:
                heapq.heappush(pq, (dist + weight, neighbor, path + [neighbor]))

    # no route found
    return float("inf"), []



# --- Load global data once ---
print("Loading airports and routes...")
AIRPORTS, GRAPH = load_airports_and_routes()

# --- Find nearest airport given coordinates ---
def find_nearest_airport(lat, lng):
    nearest = None
    min_d = float("inf")
    for code, info in AIRPORTS.items():
        d = haversine(lat, lng, info["lat"], info["lng"])
        if d < min_d:
            min_d = d
            nearest = {"code": code, **info}
    return nearest

@app.route("/api/trip-planner/plan", methods=["POST"])
def plan_trip():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        origin = data.get("origin")
        destinations = data.get("destinations", [])
        preference = data.get("preference", "auto")  # "auto", "driving", "flying"

        if not origin or not destinations:
            return jsonify({"error": "Origin and at least one destination required"}), 400

        # Validate origin has coordinates
        if not origin.get("lat") or not origin.get("lng"):
            return jsonify({"error": "Origin must have valid latitude and longitude"}), 400

        # Validate destinations have coordinates
        for i, dest in enumerate(destinations):
            if not dest.get("lat") or not dest.get("lng"):
                return jsonify({"error": f"Destination {i+1} must have valid latitude and longitude"}), 400

        all_locations = [origin] + destinations
        n = len(all_locations)

        # --- Compute distance matrix ---
        dist_matrix = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i != j:
                    dist_matrix[i][j] = haversine(
                        all_locations[i]["lat"], all_locations[i]["lng"],
                        all_locations[j]["lat"], all_locations[j]["lng"]
                    )

        # --- Keep user's order (don't optimize) ---
        # Users want to visit destinations in the order they specified
        optimized_route = all_locations

        # --- Smart routing: Compare driving vs flying for each segment ---
        final_route = []
        total_distance = 0

        for i in range(len(optimized_route) - 1):
            start = optimized_route[i]
            end = optimized_route[i + 1]
            direct_dist = haversine(start["lat"], start["lng"], end["lat"], end["lng"])

            # Find nearest airports
            dep_airport = find_nearest_airport(start["lat"], start["lng"])
            arr_airport = find_nearest_airport(end["lat"], end["lng"])
            
            # Calculate airport-to-airport distance
            airport_dist = haversine(dep_airport["lat"], dep_airport["lng"], arr_airport["lat"], arr_airport["lng"])
            
            # Calculate total flight distance (drive to airport + flight + drive from airport)
            drive_to_airport = haversine(start["lat"], start["lng"], dep_airport["lat"], dep_airport["lng"])
            drive_from_airport = haversine(arr_airport["lat"], arr_airport["lng"], end["lat"], end["lng"])
            total_flight_distance = drive_to_airport + airport_dist + drive_from_airport
            
            # Use Dijkstra for actual flight routes if available
            dijkstra_dist, airport_path = dijkstra(GRAPH, dep_airport["code"], arr_airport["code"])
            
            # Determine if we should use the scheduled route or direct flight
            use_scheduled_route = False
            if not math.isinf(dijkstra_dist):
                # Check if scheduled route is reasonable (not too much longer than direct flight)
                # If scheduled route is more than 30% longer than direct flight, just use direct flight
                if dijkstra_dist <= airport_dist * 1.3 and len(airport_path) <= 3:  # Max 1 connection
                    use_scheduled_route = True
                    total_flight_distance = drive_to_airport + dijkstra_dist + drive_from_airport
                else:
                    # Scheduled route is too long or has too many connections, use direct flight distance
                    total_flight_distance = drive_to_airport + airport_dist + drive_from_airport
            
            # Decision logic based on user preference
            if preference == "driving":
                use_flight = False
            elif preference == "flying":
                # Prefer flying for anything over 50km, even without scheduled routes
                use_flight = (
                    direct_dist > 50 and  # Very low threshold for flying preference
                    dep_airport["code"] != arr_airport["code"]  # Don't fly to same airport
                )
            else:  # preference == "auto"
                # Use flight if:
                # 1. Direct distance > 200km (reasonable threshold for considering flights)
                # 2. Flight route is more efficient than driving
                # 3. Flight route isn't significantly longer (within 20% of driving distance)
                use_flight = (
                    direct_dist > 200 and 
                    total_flight_distance < direct_dist * 1.2 and
                    dep_airport["code"] != arr_airport["code"]  # Don't fly to same airport
                )

            if use_flight:
                # Use flight route
                segment = []
                
                # For "flying" preference, use DIRECT flights (no connections)
                if preference == "flying":
                    # Direct flight - just departure and arrival airports
                    segment.append({
                        "name": dep_airport["name"], 
                        "lat": dep_airport["lat"], 
                        "lng": dep_airport["lng"], 
                        "type": "airport",
                        "is_flight_start": True
                    })
                    segment.append({
                        "name": arr_airport["name"],
                        "lat": arr_airport["lat"],
                        "lng": arr_airport["lng"],
                        "type": "airport",
                    })
                    # Just the direct flight distance
                    total_distance += airport_dist
                    print(f"[INFO] Using DIRECT flight ({preference}): {dep_airport['name']} -> {arr_airport['name']} ({airport_dist:.1f}km)")
                else:
                    # For "auto", include ground transport
                    segment.append(start)
                    segment.append({
                        "name": dep_airport["name"], 
                        "lat": dep_airport["lat"], 
                        "lng": dep_airport["lng"], 
                        "type": "airport"
                    })

                    # Only add intermediate airports if we're using scheduled route and it's beneficial
                    if use_scheduled_route and len(airport_path) > 2:
                        for code in airport_path[1:-1]:
                            if code in AIRPORTS:
                                a = AIRPORTS[code]
                                segment.append({
                                    "name": a["name"], 
                                    "lat": a["lat"], 
                                    "lng": a["lng"], 
                                    "type": "airport"
                                })
                        print(f"[INFO] Using scheduled flight route: {' -> '.join(airport_path)} ({dijkstra_dist:.1f}km)")
                    elif not math.isinf(dijkstra_dist) and not use_scheduled_route:
                        print(f"[INFO] Scheduled route too long ({dijkstra_dist:.1f}km via {len(airport_path)-1} stops), using direct flight instead ({airport_dist:.1f}km)")
                    else:
                        print(f"[INFO] No scheduled route found, using direct flight ({airport_dist:.1f}km)")

                    segment.append({
                        "name": arr_airport["name"],
                        "lat": arr_airport["lat"],
                        "lng": arr_airport["lng"],
                        "type": "airport",
                    })
                    segment.append(end)
                    
                    # Full distance including ground transport
                    total_distance += total_flight_distance
                    
                final_route.extend(segment)
            else:
                # Use driving route
                final_route.extend([start, end])
                total_distance += direct_dist
                print(f"[INFO] Using driving route ({preference}): {start['name']} -> {end['name']} ({direct_dist:.1f}km)")

        # Remove duplicate consecutive nodes
        cleaned = []
        for loc in final_route:
            if not cleaned or loc["name"] != cleaned[-1]["name"]:
                cleaned.append(loc)

        return jsonify({
            "optimized_route": cleaned,
            "total_distance_km": round(total_distance, 2)
        })
    except Exception as e:
        print(f"Error in plan_trip: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error planning trip: {str(e)}"}), 500

@app.route('/api/trip-planner/nearest-airport', methods=['POST'])
def nearest_airport():
    data = request.get_json()
    lat, lng = data.get('lat'), data.get('lng')

    if lat is None or lng is None:
        return jsonify({"error": "Missing coordinates"}), 400

    airports, _ = load_airports_and_routes()  # Use your existing loader

    nearest = None
    min_dist = float('inf')
    for code, info in airports.items():
        d = haversine(lat, lng, info["lat"], info["lng"])
        if d < min_dist:
            min_dist = d
            nearest = {"name": info["name"], "lat": info["lat"], "lng": info["lng"], "iata": code}

    if not nearest:
        return jsonify({"error": "No airports found"}), 404

    return jsonify(nearest)

@app.route("/health", methods=["GET"])
def health_check():
    """Lightweight health-check endpoint. Also verifies DB connectivity."""
    try:
        from db import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cur.close()
        conn.close()
        return jsonify({"status": "healthy", "database": "connected"}), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "database": str(e)}), 503


@app.route("/__routes", methods=["GET"])
def list_routes():
    """Temporary debug endpoint — lists every registered route."""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            "endpoint": rule.endpoint,
            "methods": sorted(rule.methods - {"HEAD", "OPTIONS"}),
            "path": rule.rule,
        })
    routes.sort(key=lambda r: r["path"])
    return jsonify(routes), 200


if __name__ == "__main__":
    print("Server starting... please wait.")
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
