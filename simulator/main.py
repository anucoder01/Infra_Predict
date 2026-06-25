import time
import requests
import datetime as dt
from datetime import datetime

# URL of the backend ingestion API
BACKEND_URL = "http://localhost:8001/api/ingest"

# List of mock infrastructure assets
ASSETS = [
    {"id": "bridge-mumbai", "type": "bridge", "location": {"lat": 19.0356, "lng": 72.8164}},
    {"id": "bridge-chenab", "type": "bridge", "location": {"lat": 33.1519, "lng": 74.8821}},
    {"id": "dam-bhakra", "type": "powerline", "location": {"lat": 31.4114, "lng": 76.3268}},
    {"id": "statue-unity", "type": "building", "location": {"lat": 21.8380, "lng": 73.7191}},
    {"id": "bridge-kinnaur", "type": "bridge", "location": {"lat": 31.5363, "lng": 78.2618}},
    {"id": "bridge-gg", "type": "bridge", "location": {"lat": 37.8199, "lng": -122.4783}},
    {"id": "bridge-sydney", "type": "bridge", "location": {"lat": -33.8523, "lng": 151.2108}},
]

def fetch_weather(lat, lng):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current_weather=true"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json().get("current_weather", {})
            return data.get("temperature", 25.0), data.get("windspeed", 10.0)
    except Exception as e:
        print(f"Weather API error: {e}")
    return 25.0, 10.0

def fetch_earthquake(lat, lng):
    try:
        start_time_iso = (dt.datetime.utcnow() - dt.timedelta(days=1)).isoformat()
        end_time_iso = dt.datetime.utcnow().isoformat()
        url = f"https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime={start_time_iso}&endtime={end_time_iso}&latitude={lat}&longitude={lng}&maxradiuskm=500"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            features = res.json().get("features", [])
            if features:
                max_mag = max((f.get("properties", {}).get("mag", 0) for f in features), default=0)
                if max_mag and max_mag > 0:
                    return max_mag
    except Exception as e:
        print(f"USGS API error: {e}")
    return 0.0

def generate_sensor_data(asset):
    lat = asset["location"]["lat"]
    lng = asset["location"]["lng"]

    temperature, windspeed = fetch_weather(lat, lng)
    earthquake_mag = fetch_earthquake(lat, lng)

    # Derive acoustic from windspeed
    acoustic = 40.0 + windspeed * 1.5
    
    # Derive vibration from earthquake magnitude or use baseline
    vibration = 0.05
    if earthquake_mag > 0:
        vibration = 0.05 + (earthquake_mag / 10.0)

    # Thermal matches temperature
    thermal = temperature

    return {
        "asset_id": asset["id"],
        "timestamp": datetime.utcnow().isoformat(),
        "sensors": {
            "acoustic_db": round(acoustic, 2),
            "vibration_g": round(vibration, 3),
            "thermal_c": round(thermal, 2)
        },
        "drone_image_url": f"https://mock-drone-images.com/{asset['id']}/{int(time.time())}.jpg"
    }

def main():
    print(f"Starting real-world sensor data fetcher. Sending to {BACKEND_URL}")
    while True:
        for asset in ASSETS:
            payload = generate_sensor_data(asset)
            try:
                response = requests.post(BACKEND_URL, json=payload)
                if response.status_code == 200:
                    print(f"[{payload['timestamp']}] Successfully sent data for {asset['id']}")
                else:
                    print(f"[{payload['timestamp']}] Failed to send data for {asset['id']}: {response.status_code}")
            except Exception as e:
                print(f"[{payload['timestamp']}] Connection error: {e}")
        
        # Sleep for a bit before next batch, real data updates less frequently so 10s is fine, 
        # but keep it at 10s to avoid hammering public APIs too fast compared to mock.
        time.sleep(10)

if __name__ == "__main__":
    main()
