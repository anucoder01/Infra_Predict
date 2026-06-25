import time
import random
import requests
import json
from datetime import datetime

# URL of the backend ingestion API
BACKEND_URL = "http://localhost:8001/api/ingest"

# List of mock infrastructure assets
ASSETS = [
    {"id": "bridge-01", "type": "bridge", "location": {"lat": 37.8199, "lng": -122.4783}},
    {"id": "pipe-01", "type": "pipeline", "location": {"lat": 37.7749, "lng": -122.4194}},
    {"id": "power-01", "type": "powerline", "location": {"lat": 37.3382, "lng": -121.8863}},
]

def generate_sensor_data(asset):
    # Base values
    base_acoustic = 50.0
    base_vibration = 0.5
    base_thermal = 25.0

    # Introduce some randomness and potential anomalies
    anomaly_chance = random.random()
    is_anomalous = anomaly_chance > 0.95

    acoustic = base_acoustic + random.uniform(-5.0, 5.0)
    vibration = base_vibration + random.uniform(-0.1, 0.1)
    thermal = base_thermal + random.uniform(-2.0, 2.0)

    if is_anomalous:
        # Simulate a sudden spike
        acoustic += random.uniform(20.0, 50.0)
        vibration += random.uniform(1.0, 3.0)
        thermal += random.uniform(10.0, 20.0)

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
    print(f"Starting sensor data simulation. Sending to {BACKEND_URL}")
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
        
        # Sleep for a bit before next batch
        time.sleep(2)

if __name__ == "__main__":
    main()
