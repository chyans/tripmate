from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from db import get_db_connection
from routes.auth import verify_token
import os
import uuid
import subprocess
import json as json_lib
import math
import requests
from datetime import datetime
from decimal import Decimal
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

photos_bp = Blueprint("photos_bp", __name__)

# Get the directory where this file is located (routes folder)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads", "photos")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "mp4", "mov", "mp3", "wav"}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# File size limits per trip (in bytes)
MAX_TRIP_STORAGE_FREE = 100 * 1024 * 1024  # 100MB per trip
MAX_TRIP_STORAGE_PREMIUM = 1024 * 1024 * 1024  # 1GB per trip
MAX_SINGLE_FILE_SIZE_FREE = 100 * 1024 * 1024  # 100MB max per file for free users
MAX_SINGLE_FILE_SIZE_PREMIUM = 500 * 1024 * 1024  # 500MB max per file for premium users

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def get_media_type(filename, mime_type=None):
    """Determine media type from filename extension and MIME type"""
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    video_extensions = {"mp4", "mov", "avi", "mkv", "webm"}
    
    if ext in video_extensions or (mime_type and mime_type.startswith("video/")):
        return "video"
    return "image"

def dms_to_decimal(degrees, minutes, seconds, ref):
    """Convert degrees/minutes/seconds to decimal degrees"""
    try:
        decimal = float(degrees) + float(minutes) / 60.0 + float(seconds) / 3600.0
        if ref in ["S", "W"]:
            decimal = -decimal
        return Decimal(str(decimal))
    except (ValueError, TypeError, ZeroDivisionError):
        return None

def get_exif_gps(exif_data):
    """Extract GPS coordinates from EXIF data"""
    try:
        if 34853 not in exif_data:  # GPS IFD tag
            return None, None
        
        gps_info = exif_data[34853]
        lat = None
        lon = None
        
        # Get latitude
        if 1 in gps_info and 2 in gps_info:  # GPSLatitude and GPSLatitudeRef
            lat_dms = gps_info[1]
            lat_ref = gps_info[2]
            lat = dms_to_decimal(lat_dms[0], lat_dms[1], lat_dms[2], lat_ref)
        
        # Get longitude
        if 3 in gps_info and 4 in gps_info:  # GPSLongitude and GPSLongitudeRef
            lon_dms = gps_info[3]
            lon_ref = gps_info[4]
            lon = dms_to_decimal(lon_dms[0], lon_dms[1], lon_dms[2], lon_ref)
        
        return lat, lon
    except (KeyError, TypeError, IndexError):
        return None, None

def get_exif_datetime(exif_data):
    """Extract DateTimeOriginal or DateTime from EXIF data"""
    try:
        # Try DateTimeOriginal first (36867)
        if 36867 in exif_data:
            dt_str = exif_data[36867]
            return parse_exif_datetime(dt_str)
        # Fallback to DateTime (306)
        if 306 in exif_data:
            dt_str = exif_data[306]
            return parse_exif_datetime(dt_str)
        return None
    except (KeyError, TypeError):
        return None

def parse_exif_datetime(dt_str):
    """Parse EXIF datetime string to datetime object"""
    try:
        # EXIF format: "YYYY:MM:DD HH:MM:SS"
        dt_str = dt_str.replace(":", "-", 2).replace(":", " ", 1).replace("-", ":", 2)
        # Now format: "YYYY-MM-DD HH:MM:SS"
        return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
    except (ValueError, AttributeError):
        return None

def extract_image_metadata(filepath):
    """Extract GPS and datetime metadata from image file"""
    latitude = None
    longitude = None
    taken_at = None
    
    try:
        with Image.open(filepath) as img:
            exif_data = img._getexif()
            if exif_data:
                latitude, longitude = get_exif_gps(exif_data)
                taken_at = get_exif_datetime(exif_data)
    except Exception as e:
        print(f"Error extracting image metadata: {e}")
    
    return latitude, longitude, taken_at

def extract_video_metadata(filepath):
    """Extract GPS and creation time metadata from video file"""
    latitude = None
    longitude = None
    taken_at = None
    
    try:
        # Try using exiftool if available (most reliable for video metadata)
        try:
            result = subprocess.run(
                ["exiftool", "-j", "-GPSLatitude", "-GPSLongitude", "-GPSLatitudeRef", "-GPSLongitudeRef",
                 "-CreateDate", "-DateTimeOriginal", "-MediaCreateDate", filepath],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0 and result.stdout:
                exif_data = json_lib.loads(result.stdout)
                if exif_data and len(exif_data) > 0:
                    data = exif_data[0]
                    
                    # Extract GPS coordinates
                    if "GPSLatitude" in data and "GPSLongitude" in data:
                        try:
                            lat_val = float(data.get("GPSLatitude", 0))
                            lon_val = float(data.get("GPSLongitude", 0))
                            lat_ref = data.get("GPSLatitudeRef", "N")
                            lon_ref = data.get("GPSLongitudeRef", "E")
                            
                            if lat_ref == "S":
                                lat_val = -lat_val
                            if lon_ref == "W":
                                lon_val = -lon_val
                            
                            latitude = Decimal(str(lat_val))
                            longitude = Decimal(str(lon_val))
                        except (ValueError, TypeError):
                            pass
                    
                    # Extract datetime (try multiple fields)
                    for dt_field in ["DateTimeOriginal", "CreateDate", "MediaCreateDate"]:
                        if dt_field in data:
                            dt_str = data[dt_field]
                            taken_at = parse_exif_datetime(dt_str)
                            if taken_at:
                                break
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
            # exiftool not available or failed, try alternative methods
            pass
        
        # Alternative: Try ffprobe for basic metadata (if exiftool fails)
        if latitude is None or taken_at is None:
            try:
                result = subprocess.run(
                    ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", filepath],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0 and result.stdout:
                    probe_data = json_lib.loads(result.stdout)
                    format_data = probe_data.get("format", {})
                    tags = format_data.get("tags", {})
                    
                    # Try to get creation time
                    if not taken_at:
                        for dt_field in ["creation_time", "com.apple.quicktime.creationdate"]:
                            if dt_field in tags:
                                dt_str = tags[dt_field]
                                try:
                                    # ISO format: "2023-10-15T12:34:56.000000Z"
                                    taken_at = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                                except ValueError:
                                    taken_at = parse_exif_datetime(dt_str)
                                if taken_at:
                                    break
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
                pass
    except Exception as e:
        print(f"Error extracting video metadata: {e}")
    
    return latitude, longitude, taken_at

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points on Earth using the Haversine formula.
    Returns distance in kilometers.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')
    
    # Convert to float if Decimal
    lat1 = float(lat1)
    lon1 = float(lon1)
    lat2 = float(lat2)
    lon2 = float(lon2)
    
    # Radius of Earth in kilometers
    R = 6371.0
    
    # Convert degrees to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance

def match_photo_to_site(photo_lat, photo_lon, trip_data):
    """
    Match a photo's GPS coordinates to the nearest site in the travel plan.
    
    Args:
        photo_lat: Photo latitude (Decimal or float)
        photo_lon: Photo longitude (Decimal or float)
        trip_data: Dictionary with 'origin', 'destinations', and 'optimized_route' keys
    
    Returns:
        site_name (str): Name of the matched site, or "Unassigned" if no match within threshold
    """
    if photo_lat is None or photo_lon is None:
        return "Unassigned"
    
    # Threshold distance in kilometers (1.5 km default)
    MAX_DISTANCE_KM = 1.5
    
    # Collect all sites from the trip
    sites = []
    
    # Add origin if it exists
    if trip_data.get('origin') and isinstance(trip_data['origin'], dict):
        origin = trip_data['origin']
        if origin.get('name') and origin.get('lat') and origin.get('lng'):
            sites.append({
                'name': origin['name'],
                'lat': float(origin['lat']),
                'lng': float(origin['lng'])
            })
    
    # Add destinations
    destinations = trip_data.get('destinations', [])
    if isinstance(destinations, str):
        try:
            destinations = json_lib.loads(destinations)
        except:
            destinations = []
    
    if isinstance(destinations, list):
        for dest in destinations:
            if isinstance(dest, dict) and dest.get('name') and dest.get('lat') and dest.get('lng'):
                sites.append({
                    'name': dest['name'],
                    'lat': float(dest['lat']),
                    'lng': float(dest['lng'])
                })
    
    # Add optimized_route points (these are the actual route waypoints)
    optimized_route = trip_data.get('optimized_route', [])
    if isinstance(optimized_route, str):
        try:
            optimized_route = json_lib.loads(optimized_route)
        except:
            optimized_route = []
    
    if isinstance(optimized_route, list):
        for point in optimized_route:
            if isinstance(point, dict):
                # Check different possible field names
                point_name = point.get('name') or point.get('location', {}).get('name') or point.get('address', '')
                point_lat = point.get('lat') or (point.get('location', {}) or {}).get('lat')
                point_lng = point.get('lng') or (point.get('location', {}) or {}).get('lng')
                
                if point_name and point_lat and point_lng:
                    sites.append({
                        'name': point_name,
                        'lat': float(point_lat),
                        'lng': float(point_lng)
                    })
    
    if not sites:
        return "Unassigned"
    
    # Find the nearest site
    photo_lat_float = float(photo_lat)
    photo_lon_float = float(photo_lon)
    
    min_distance = float('inf')
    nearest_site = None
    
    for site in sites:
        distance = haversine_distance(
            photo_lat_float, photo_lon_float,
            site['lat'], site['lng']
        )
        
        if distance < min_distance:
            min_distance = distance
            nearest_site = site
    
    # Return site name if within threshold, otherwise "Unassigned"
    if nearest_site and min_distance <= MAX_DISTANCE_KM:
        return nearest_site['name']
    else:
        return "Unassigned"

def reverse_geocode(latitude, longitude):
    """
    Reverse geocode GPS coordinates to get city and country using Google Maps Geocoding API.

    Returns:
        (city, country) tuple, where each element may be None if not found.
    """
    if latitude is None or longitude is None:
        return None, None
    
    try:
        # Get Google Maps API key from environment
        # Try multiple possible environment variable names
        api_key = (os.getenv('GOOGLE_MAPS_API_KEY') or 
                  os.getenv('REACT_APP_GOOGLE_MAPS_API_KEY') or
                  os.getenv('GOOGLE_API_KEY'))
        
        if not api_key:
            print("Warning: Google Maps API key not found. Cannot reverse geocode.")
            print("Set GOOGLE_MAPS_API_KEY or REACT_APP_GOOGLE_MAPS_API_KEY in backend/.env")
            return None, None
        
        # Google Maps Geocoding API endpoint
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            'latlng': f"{float(latitude)},{float(longitude)}",
            'key': api_key,
            'result_type': 'locality|administrative_area_level_1|country'  # Prioritize city/state/country
        }
        
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('status') == 'OK' and data.get('results'):
                # Try to get the most relevant location name
                # Priority: locality (city) > administrative_area_level_1 (state) > country
                city = None
                country = None
                
                for result in data.get('results', []):
                    address_components = result.get('address_components', [])
                    
                    # Look for country
                    for component in address_components:
                        if 'country' in component.get('types', []):
                            country = component.get('long_name')
                            break
                    
                    # Look for city/locality first
                    for component in address_components:
                        if 'locality' in component.get('types', []):
                            city = component.get('long_name')
                            break
                    
                    # Fallback to administrative area (state/province) as city if locality not found
                    if not city:
                        for component in address_components:
                            if 'administrative_area_level_1' in component.get('types', []):
                                city = component.get('long_name')
                                break
                    
                    if city or country:
                        return city, country
                
                # If no specific component found, try formatted address of first result
                first_result = data.get('results', [{}])[0]
                if first_result.get('formatted_address'):
                    formatted = first_result.get('formatted_address', '')
                    parts = [p.strip() for p in formatted.split(',') if p.strip()]
                    if parts:
                        # Heuristic: first part as city, last part as country when possible
                        if len(parts) == 1:
                            return parts[0], None
                        return parts[0], parts[-1]
        
        return None, None
        
    except Exception as e:
        print(f"Error reverse geocoding coordinates ({latitude}, {longitude}): {e}")
        return None, None

def get_user_from_token():
    """Helper to get user from token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    payload = verify_token(token)
    return payload

@photos_bp.route("/upload", methods=["POST"])
def upload_photos():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if "photos" not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    trip_id = request.form.get("trip_id")
    location_name = request.form.get("location_name", "Unknown")
    files = request.files.getlist("photos")
    
    if not files or files[0].filename == "":
        return jsonify({"error": "No files selected"}), 400

    if not trip_id:
        return jsonify({"error": "Trip ID is required"}), 400

    # Verify trip ownership
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT user_id FROM trips WHERE id = %s", (trip_id,))
        trip = cur.fetchone()
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        if trip[0] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        # Check user's storage limit per trip (check database for current premium status)
        cur.execute("SELECT is_premium, is_admin FROM users WHERE id = %s", (user["user_id"],))
        user_row = cur.fetchone()
        is_premium = bool(user_row[0]) if user_row and user_row[0] else False
        is_admin = bool(user_row[1]) if user_row and len(user_row) > 1 and user_row[1] else False
        max_trip_storage = MAX_TRIP_STORAGE_PREMIUM if (is_premium or is_admin) else MAX_TRIP_STORAGE_FREE
        max_single_file_size = MAX_SINGLE_FILE_SIZE_PREMIUM if (is_premium or is_admin) else MAX_SINGLE_FILE_SIZE_FREE
        
        # Calculate current storage used for this trip (sum of file_size)
        cur.execute("SELECT COALESCE(SUM(file_size), 0) FROM photos WHERE trip_id = %s", (trip_id,))
        current_size = cur.fetchone()[0] or 0

        # Get trip data for site matching (origin, destinations, optimized_route)
        cur.execute(
            """SELECT origin, destinations, optimized_route FROM trips WHERE id = %s""",
            (trip_id,)
        )
        trip_row = cur.fetchone()
        trip_data = {}
        if trip_row:
            # Parse JSON fields
            origin_data = trip_row[0]
            destinations_data = trip_row[1]
            optimized_route_data = trip_row[2]
            
            if isinstance(origin_data, str):
                origin_data = json_lib.loads(origin_data) if origin_data else None
            if isinstance(destinations_data, str):
                destinations_data = json_lib.loads(destinations_data) if destinations_data else []
            if isinstance(optimized_route_data, str):
                optimized_route_data = json_lib.loads(optimized_route_data) if optimized_route_data else []
            
            trip_data = {
                'origin': origin_data,
                'destinations': destinations_data,
                'optimized_route': optimized_route_data
            }

        uploaded_photos = []
        total_size = 0
        
        for file in files:
            if not file or not allowed_file(file.filename):
                continue

            # Check file size
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)

            # Check single file size limit (based on user's plan)
            if file_size > max_single_file_size:
                max_size_mb = max_single_file_size / (1024 * 1024)
                return jsonify({"error": f"File {file.filename} exceeds maximum size limit of {int(max_size_mb)}MB"}), 400

            # Check trip storage limit
            if current_size + total_size + file_size > max_trip_storage:
                if not (is_premium or is_admin):
                    return jsonify({
                        "error": "Trip storage limit reached",
                        "message": f"Free plan allows 100MB per trip. You've used {current_size / (1024*1024):.1f}MB. Upgrade to Premium for 1GB per trip."
                    }), 400
                else:
                    return jsonify({
                        "error": "Trip storage limit reached",
                        "message": f"Premium plan allows 1GB per trip. You've used {current_size / (1024*1024):.1f}MB."
                    }), 400

            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(filepath)

            # Detect media type
            mime_type = file.content_type if hasattr(file, 'content_type') else None
            media_type = get_media_type(filename, mime_type)

            # Extract metadata (GPS coordinates and taken_at timestamp)
            latitude = None
            longitude = None
            taken_at = None
            
            try:
                if media_type == "image":
                    latitude, longitude, taken_at = extract_image_metadata(filepath)
                elif media_type == "video":
                    latitude, longitude, taken_at = extract_video_metadata(filepath)
            except Exception as e:
                print(f"Error extracting metadata from {filename}: {e}")
                # Continue without metadata - will mark as geotag_required

            # Check what metadata is missing
            missing_fields = []
            if latitude is None or longitude is None:
                missing_fields.append("gps")
            if taken_at is None:
                missing_fields.append("taken_at")
            
            geotag_required = len(missing_fields) > 0

            # Match photo to site based on GPS coordinates
            # If GPS is available, match to nearest site; otherwise use "Unassigned"
            site_name = "Unassigned"
            geocoded_location = None
            
            if latitude is not None and longitude is not None:
                # Match to site in travel plan
                site_name = match_photo_to_site(latitude, longitude, trip_data)
                
                # Reverse geocode to get actual city/place name (city + country)
                city, country = reverse_geocode(latitude, longitude)
                if city or country:
                    # Store a human-readable location string "City, Country" or just city/country
                    if city and country:
                        geocoded_location = f"{city}, {country}"
                    else:
                        geocoded_location = city or country
                    print(f"Geocoded location for photo {filename}: {geocoded_location}")
            elif taken_at is None:
                # If no GPS and no timestamp, use upload timestamp as fallback
                taken_at = datetime.now()

            # Save to database with file size, metadata, site association, and geocoded location
            cur.execute(
                """INSERT INTO photos (trip_id, location_name, site_name, geocoded_location, filename, file_path, file_size, 
                   media_type, latitude, longitude, taken_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (trip_id, location_name, site_name, geocoded_location, filename, f"/uploads/photos/{unique_filename}", file_size,
                 media_type, latitude, longitude, taken_at)
            )
            photo_id = cur.lastrowid

            photo_response = {
                "id": photo_id,
                "filename": filename,
                "url": f"/api/photos/uploads/photos/{unique_filename}",
                "location_name": location_name,
                "site_name": site_name,  # Site from travel plan that photo is associated with
                "geocoded_location": geocoded_location,  # City/place name from reverse geocoding
                "media_type": media_type,
                "uploaded_at": datetime.now().isoformat(),
                "success": True
            }
            
            # Add geotag information if required
            if geotag_required:
                photo_response["geotag_required"] = True
                photo_response["missing_fields"] = missing_fields
            else:
                photo_response["geotag_required"] = False
                if latitude and longitude:
                    photo_response["latitude"] = float(latitude)
                    photo_response["longitude"] = float(longitude)
                if taken_at:
                    photo_response["taken_at"] = taken_at.isoformat()
            
            uploaded_photos.append(photo_response)
            total_size += file_size

        conn.commit()
        return jsonify({"photos": uploaded_photos}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@photos_bp.route("/<int:photo_id>", methods=["DELETE"])
def delete_photo(photo_id):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get photo and verify ownership through trip
        cur.execute(
            """SELECT p.file_path, t.user_id FROM photos p
               JOIN trips t ON p.trip_id = t.id WHERE p.id = %s""",
            (photo_id,)
        )
        photo = cur.fetchone()
        
        if not photo:
            return jsonify({"error": "Photo not found"}), 404
        
        if photo[1] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        # Delete file
        file_path = photo[0].replace("/api/photos", "").replace("/uploads/photos/", "")
        full_path = os.path.join(UPLOAD_FOLDER, file_path.split("/")[-1])
        if os.path.exists(full_path):
            os.remove(full_path)

        # Delete from database
        cur.execute("DELETE FROM photos WHERE id = %s", (photo_id,))
        conn.commit()

        return jsonify({"message": "Photo deleted successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@photos_bp.route("/user/all", methods=["GET"])
def get_all_user_photos():
    """Get all photos for the authenticated user across all trips."""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get all photos for user's trips, grouped by trip
        cur.execute(
            """SELECT p.id, p.trip_id, t.name as trip_name, p.location_name, p.filename, p.file_path, 
               p.media_type, p.latitude, p.longitude, p.taken_at, p.uploaded_at, t.start_date, t.end_date
               FROM photos p
               INNER JOIN trips t ON p.trip_id = t.id
               WHERE t.user_id = %s
               ORDER BY p.uploaded_at DESC""",
            (user["user_id"],)
        )

        photos_by_trip = {}
        for row in cur.fetchall():
            trip_id = row[1]
            if trip_id not in photos_by_trip:
                photos_by_trip[trip_id] = {
                    "trip_id": trip_id,
                    "trip_name": row[2],
                    "start_date": row[11].isoformat() if row[11] else None,
                    "end_date": row[12].isoformat() if row[12] else None,
                    "photos": []
                }
            
            photo_data = {
                "id": row[0],
                "location_name": row[3],
                "filename": row[4],
                "url": f"/api/photos{row[5]}",
                "media_type": row[6] if len(row) > 6 else "image",
                "uploaded_at": row[10].isoformat() if row[10] else None
            }
            
            # Add geotagging fields if present
            if len(row) > 7 and row[7] is not None:
                photo_data["latitude"] = float(row[7])
            if len(row) > 8 and row[8] is not None:
                photo_data["longitude"] = float(row[8])
            if len(row) > 9 and row[9]:
                photo_data["taken_at"] = row[9].isoformat() if hasattr(row[9], 'isoformat') else str(row[9])
            
            photos_by_trip[trip_id]["photos"].append(photo_data)

        # Convert to list format
        result = list(photos_by_trip.values())
        
        # Calculate total photo count
        total_photos = sum(len(trip["photos"]) for trip in result)
        
        return jsonify({
            "photos_by_trip": result,
            "total_photos": total_photos,
            "total_trips": len(result)
        })
    except Exception as e:
        print(f"Error fetching user photos: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error fetching photos: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

@photos_bp.route("/trip/<int:trip_id>", methods=["GET"])
def get_trip_photos(trip_id):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify trip ownership
        cur.execute("SELECT user_id FROM trips WHERE id = %s", (trip_id,))
        trip = cur.fetchone()
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        if trip[0] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        cur.execute(
            """SELECT id, location_name, site_name, geocoded_location,
                      filename, file_path, media_type, latitude, longitude, 
                      taken_at, uploaded_at 
               FROM photos 
               WHERE trip_id = %s 
               ORDER BY uploaded_at ASC""",
            (trip_id,)
        )

        photos = []
        for row in cur.fetchall():
            photo_data = {
                "id": row[0],
                "location_name": row[1],
                "site_name": row[2] or "Unassigned",  # Site from travel plan
                "geocoded_location": row[3],  # City/place name from reverse geocoding
                "filename": row[4],
                "url": f"/api/photos{row[5]}",
                "media_type": row[6] if len(row) > 6 else "image",
                "uploaded_at": row[10].isoformat() if len(row) > 10 and row[10] else None
            }
            # Add geotagging fields if present
            if len(row) > 7 and row[7] is not None:  # latitude
                photo_data["latitude"] = float(row[7])
            if len(row) > 8 and row[8] is not None:  # longitude
                photo_data["longitude"] = float(row[8])
            if len(row) > 9 and row[9]:  # taken_at
                photo_data["taken_at"] = row[9].isoformat() if hasattr(row[9], 'isoformat') else str(row[9])
            
            # Mark if geotagging is required
            if (len(row) <= 7 or row[7] is None or row[8] is None) or (len(row) <= 9 or row[9] is None):
                photo_data["geotag_required"] = True
                missing = []
                if len(row) <= 7 or row[7] is None or row[8] is None:
                    missing.append("gps")
                if len(row) <= 9 or row[9] is None:
                    missing.append("taken_at")
                photo_data["missing_fields"] = missing
            else:
                photo_data["geotag_required"] = False
            
            photos.append(photo_data)

        return jsonify({"photos": photos}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@photos_bp.route("/<int:photo_id>/geotag", methods=["PATCH"])
def update_geotag(photo_id):
    """Manually set geotagging data for a photo/video"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    taken_at = data.get("taken_at")
    manual_city = data.get("city")
    manual_country = data.get("country")
    activity_notes = data.get("activities")  # free-form text about what user did
    
    # Validate latitude/longitude if provided
    if latitude is not None:
        try:
            latitude = Decimal(str(float(latitude)))
            if latitude < -90 or latitude > 90:
                return jsonify({"error": "Latitude must be between -90 and 90"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid latitude format"}), 400
    
    if longitude is not None:
        try:
            longitude = Decimal(str(float(longitude)))
            if longitude < -180 or longitude > 180:
                return jsonify({"error": "Longitude must be between -180 and 180"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid longitude format"}), 400
    
    # Validate taken_at if provided
    if taken_at is not None:
        try:
            if isinstance(taken_at, str):
                # Try parsing ISO format
                taken_at = datetime.fromisoformat(taken_at.replace("Z", "+00:00"))
            elif not isinstance(taken_at, datetime):
                return jsonify({"error": "Invalid taken_at format. Use ISO datetime string."}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid taken_at format. Use ISO datetime string (YYYY-MM-DDTHH:MM:SS)."}), 400
    
    # At least one field must be provided
    if (latitude is None and longitude is None and taken_at is None 
        and not manual_city and not manual_country and not activity_notes):
        return jsonify({"error": "At least one field (latitude, longitude, taken_at, city, country, activities) must be provided"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verify ownership
        cur.execute(
            """SELECT p.id, t.user_id FROM photos p
               JOIN trips t ON p.trip_id = t.id WHERE p.id = %s""",
            (photo_id,)
        )
        photo = cur.fetchone()
        
        if not photo:
            return jsonify({"error": "Photo not found"}), 404
        
        if photo[1] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Build update query
        updates = []
        values = []
        geocoded_location = None
        
        if latitude is not None:
            updates.append("latitude = %s")
            values.append(latitude)
        if longitude is not None:
            updates.append("longitude = %s")
            values.append(longitude)
        if taken_at is not None:
            updates.append("taken_at = %s")
            values.append(taken_at)
        
        # If both latitude and longitude are provided, reverse geocode to get location name
        if latitude is not None and longitude is not None:
            city, country = reverse_geocode(latitude, longitude)
            if city or country:
                geocoded_location = f"{city}, {country}" if city and country else (city or country)
                updates.append("geocoded_location = %s")
                values.append(geocoded_location)

        # Allow manual city/country assignment (for photos without GPS)
        if manual_city or manual_country:
            if not geocoded_location:
                geocoded_location = f"{manual_city}, {manual_country}" if manual_city and manual_country else (manual_city or manual_country)
                updates.append("geocoded_location = %s")
                values.append(geocoded_location)

        # Store / update activity notes if provided
        if activity_notes is not None:
            updates.append("activity_notes = %s")
            values.append(activity_notes.strip() or None)
        
        values.append(photo_id)
        
        cur.execute(
            f"UPDATE photos SET {', '.join(updates)} WHERE id = %s",
            values
        )
        conn.commit()
        
        return jsonify({
            "message": "Geotag data updated successfully",
            "success": True
        }), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@photos_bp.route("/trip/<int:trip_id>/timeline", methods=["GET"])
def get_trip_timeline(trip_id):
    """
    Get trip photos organized as a chronological timeline grouped by detected city/country.
    - If geocoded_location (city/country) exists, group by that.
    - If not, place photo into an Unassigned group.
    """
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify trip ownership and get trip name/destinations
        cur.execute("SELECT user_id, name, destinations FROM trips WHERE id = %s", (trip_id,))
        trip = cur.fetchone()
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        if trip[0] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        # Build a fallback label from trip destinations
        trip_name = trip[1] or "Trip"
        trip_destinations = trip[2]
        if isinstance(trip_destinations, str):
            try:
                trip_destinations = json_lib.loads(trip_destinations) if trip_destinations else []
            except Exception:
                trip_destinations = []
        fallback_label = trip_name
        if trip_destinations and isinstance(trip_destinations, list):
            dest_names = [d.get("name") or d.get("city") or "" for d in trip_destinations if isinstance(d, dict)]
            dest_names = [n for n in dest_names if n]
            if dest_names:
                fallback_label = ", ".join(dest_names[:3])

        # Get all photos for this trip with any available location info
        cur.execute(
            """SELECT id, location_name, site_name, geocoded_location,
                      filename, file_path, media_type, 
                      latitude, longitude, taken_at, uploaded_at,
                      activity_notes
               FROM photos 
               WHERE trip_id = %s 
               ORDER BY COALESCE(taken_at, uploaded_at) ASC""",
            (trip_id,)
        )

        groups = {}  # key -> { "city": ..., "country": ..., "photos": [...], "earliest_ts": datetime }
        unassigned_photos = []

        rows = cur.fetchall()
        for row in rows:
            # taken_at (index 9) or uploaded_at (index 10)
            photo_ts = row[9] or row[10]
            photo_data = {
                "id": row[0],
                "location_name": row[1],
                "site_name": row[2] or "Unassigned",
                "geocoded_location": row[3],
                "filename": row[4],
                "url": f"/api/photos{row[5]}",
                "media_type": row[6] if len(row) > 6 else "image",
                "uploaded_at": row[10].isoformat() if len(row) > 10 and row[10] else None,
                "activity_notes": row[11] if len(row) > 11 else None
            }

            # Add geotagging fields if present
            if len(row) > 7 and row[7] is not None:  # latitude
                photo_data["latitude"] = float(row[7])
            if len(row) > 8 and row[8] is not None:  # longitude
                photo_data["longitude"] = float(row[8])
            if len(row) > 9 and row[9]:  # taken_at
                photo_data["taken_at"] = row[9].isoformat() if hasattr(row[9], 'isoformat') else str(row[9])

            # Derive detectedCity / detectedCountry from geocoded_location string
            detected_city = None
            detected_country = None
            if row[3]:
                parts = [p.strip() for p in row[3].split(",") if p.strip()]
                if len(parts) == 1:
                    detected_city = parts[0]
                elif len(parts) >= 2:
                    detected_city = parts[0]
                    detected_country = parts[-1]

            photo_data["detectedCity"] = detected_city
            photo_data["detectedCountry"] = detected_country

            if detected_city or detected_country:
                # Use city+country as the grouping key
                key = f"{detected_city or ''}|{detected_country or ''}"
                if key not in groups:
                    groups[key] = {
                        "city": detected_city,
                        "country": detected_country,
                        "photos": [],
                        "earliest_ts": photo_ts
                    }
                groups[key]["photos"].append(photo_data)
                # Update earliest timestamp for the group
                if photo_ts and groups[key]["earliest_ts"]:
                    if photo_ts < groups[key]["earliest_ts"]:
                        groups[key]["earliest_ts"] = photo_ts
            else:
                # No detected city/country -> Other trip memories group
                unassigned_photos.append((photo_ts, photo_data))

        # Build timeline response: groups sorted by earliest photo timestamp
        sorted_groups = sorted(
            groups.values(),
            key=lambda g: g["earliest_ts"] or (g["photos"][0].get("uploaded_at") if g["photos"] else None)
        )

        timeline = []
        for g in sorted_groups:
            if g["city"] and g["country"]:
                title = f"{g['city']}, {g['country']}"
            else:
                title = g["city"] or g["country"] or "Unknown"

            timeline.append({
                "site_name": title,
                "detected_city": g["city"],
                "detected_country": g["country"],
                "photos": sorted(
                    g["photos"],
                    key=lambda p: p.get("taken_at") or p.get("uploaded_at") or ""
                )
            })

        # Add unassigned photos at the end, sorted chronologically
        if unassigned_photos:
            unassigned_photos_sorted = [
                p for _, p in sorted(
                    unassigned_photos,
                    key=lambda t: t[0] or t[1].get("uploaded_at") or ""
                )
            ]
            timeline.append({
                "site_name": fallback_label,
                "detected_city": None,
                "detected_country": None,
                "photos": unassigned_photos_sorted
            })

        return jsonify({
            "trip_id": trip_id,
            "timeline": timeline,
            "total_photos": sum(len(site["photos"]) for site in timeline),
            "total_sites": len(timeline)
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@photos_bp.route("/uploads/photos/<filename>")
def serve_photo(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

