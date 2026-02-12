from flask import Blueprint, jsonify, request
import requests
from datetime import datetime, timedelta
import os

weather_traffic_bp = Blueprint('weather_traffic', __name__)

# OpenWeatherMap API base URL
OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5'

def get_openweather_key():
    """Read API key at request time so Railway env vars are always picked up."""
    return os.getenv('OPENWEATHER_API_KEY', '')

@weather_traffic_bp.route('/api/weather', methods=['GET'])
def get_weather():
    """
    Get weather information for a location.
    Query params: lat, lng
    """
    try:
        lat = request.args.get('lat')
        lng = request.args.get('lng')
        
        if not lat or not lng:
            return jsonify({"error": "Latitude and longitude are required"}), 400
        
        api_key = get_openweather_key()
        if not api_key:
            return jsonify({
                "error": "Weather API not configured",
                "message": "OpenWeatherMap API key not set"
            }), 503
        
        # Get current weather
        weather_url = f"{OPENWEATHER_BASE_URL}/weather"
        params = {
            'lat': lat,
            'lon': lng,
            'appid': api_key,
            'units': 'metric'  # Celsius
        }
        
        response = requests.get(weather_url, params=params, timeout=5)
        
        if response.status_code != 200:
            return jsonify({
                "error": "Failed to fetch weather data",
                "message": response.text
            }), response.status_code
        
        data = response.json()
        
        # Format weather data
        current_time = datetime.now()
        weather_info = {
            'location': data.get('name', 'Unknown'),
            'country': data.get('sys', {}).get('country', ''),
            'temperature': round(data.get('main', {}).get('temp', 0)),
            'feels_like': round(data.get('main', {}).get('feels_like', 0)),
            'description': data.get('weather', [{}])[0].get('description', '').title(),
            'icon': data.get('weather', [{}])[0].get('icon', ''),
            'humidity': data.get('main', {}).get('humidity', 0),
            'wind_speed': round(data.get('wind', {}).get('speed', 0) * 3.6, 1),  # Convert m/s to km/h
            'visibility': round(data.get('visibility', 0) / 1000, 1) if data.get('visibility') else None,  # Convert to km
            'condition': _get_weather_condition(data.get('weather', [{}])[0].get('main', '').lower()),
            'is_good_weather': _is_good_weather_for_travel(data),
            'fetched_at': current_time.isoformat(),  # Timestamp when data was fetched
            'date': current_time.strftime('%Y-%m-%d'),
            'time': current_time.strftime('%H:%M:%S')
        }
        
        return jsonify(weather_info)
        
    except requests.exceptions.Timeout:
        return jsonify({"error": "Weather service timeout"}), 504
    except Exception as e:
        print(f"Error fetching weather: {str(e)}")
        return jsonify({"error": f"Error fetching weather: {str(e)}"}), 500

@weather_traffic_bp.route('/api/weather/forecast', methods=['GET'])
def get_weather_forecast():
    """
    Get 5-day weather forecast for a location.
    Query params: lat, lng
    """
    try:
        lat = request.args.get('lat')
        lng = request.args.get('lng')
        
        if not lat or not lng:
            return jsonify({"error": "Latitude and longitude are required"}), 400
        
        api_key = get_openweather_key()
        if not api_key:
            return jsonify({
                "error": "Weather API not configured",
                "message": "OpenWeatherMap API key not set"
            }), 503
        
        # Get 5-day forecast
        forecast_url = f"{OPENWEATHER_BASE_URL}/forecast"
        params = {
            'lat': lat,
            'lon': lng,
            'appid': api_key,
            'units': 'metric'
        }
        
        response = requests.get(forecast_url, params=params, timeout=5)
        
        if response.status_code != 200:
            return jsonify({
                "error": "Failed to fetch weather forecast",
                "message": response.text
            }), response.status_code
        
        data = response.json()
        
        # Format forecast data (next 5 days, 3-hour intervals)
        forecast_list = []
        for item in data.get('list', [])[:8]:  # Get next 24 hours (8 * 3-hour intervals)
            forecast_list.append({
                'datetime': datetime.fromtimestamp(item.get('dt', 0)),
                'temperature': round(item.get('main', {}).get('temp', 0)),
                'description': item.get('weather', [{}])[0].get('description', '').title(),
                'icon': item.get('weather', [{}])[0].get('icon', ''),
                'wind_speed': round(item.get('wind', {}).get('speed', 0) * 3.6, 1),
                'condition': _get_weather_condition(item.get('weather', [{}])[0].get('main', '').lower())
            })
        
        return jsonify({
            'location': data.get('city', {}).get('name', 'Unknown'),
            'country': data.get('city', {}).get('country', ''),
            'forecast': forecast_list
        })
        
    except Exception as e:
        print(f"Error fetching weather forecast: {str(e)}")
        return jsonify({"error": f"Error fetching weather forecast: {str(e)}"}), 500

def _get_weather_condition(weather_main):
    """Map weather condition to user-friendly status."""
    condition_map = {
        'clear': 'Clear',
        'clouds': 'Cloudy',
        'rain': 'Rainy',
        'drizzle': 'Light Rain',
        'thunderstorm': 'Storm',
        'snow': 'Snowy',
        'mist': 'Misty',
        'fog': 'Foggy',
        'haze': 'Hazy'
    }
    return condition_map.get(weather_main, 'Unknown')

def _is_good_weather_for_travel(weather_data):
    """Determine if weather is good for travel."""
    weather_main = weather_data.get('weather', [{}])[0].get('main', '').lower()
    visibility = weather_data.get('visibility', 10000)
    wind_speed = weather_data.get('wind', {}).get('speed', 0) * 3.6  # Convert to km/h
    
    # Bad weather conditions
    bad_conditions = ['thunderstorm', 'heavy rain', 'extreme']
    
    # Check if weather is bad
    if any(bad in weather_main for bad in bad_conditions):
        return False
    
    # Check visibility (less than 1km is bad)
    if visibility < 1000:
        return False
    
    # Check wind speed (more than 50 km/h is concerning)
    if wind_speed > 50:
        return False
    
    return True

