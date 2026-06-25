from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
import pandas as pd
import random
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

app = FastAPI(title="InfraPredict Backend API")

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock in-memory database
db_assets = [
    {"id": "bridge-mumbai", "name": "Bandra-Worli Sea Link", "type": "bridge", "location": {"lat": 19.0356, "lng": 72.8164}, "health": 100},
    {"id": "bridge-chenab", "name": "Chenab Bridge", "type": "bridge", "location": {"lat": 33.1519, "lng": 74.8821}, "health": 100},
    {"id": "dam-bhakra", "name": "Bhakra Nangal Dam", "type": "powerline", "location": {"lat": 31.4114, "lng": 76.3268}, "health": 100},
    {"id": "statue-unity", "name": "Statue of Unity", "type": "building", "location": {"lat": 21.8380, "lng": 73.7191}, "health": 100},
    {"id": "bridge-kinnaur", "name": "Bailey Bridge, Kinnaur", "type": "bridge", "location": {"lat": 31.5363, "lng": 78.2618}, "health": 100},
    {"id": "bridge-gg", "name": "Golden Gate Bridge", "type": "bridge", "location": {"lat": 37.8199, "lng": -122.4783}, "health": 100},
    {"id": "bridge-sydney", "name": "Sydney Harbour Bridge", "type": "bridge", "location": {"lat": -33.8523, "lng": 151.2108}, "health": 100},
]
db_sensor_readings: Dict[str, List[Dict[str, Any]]] = {asset["id"]: [] for asset in db_assets}
db_alerts: List[Dict[str, Any]] = []

class SensorData(BaseModel):
    acoustic_db: float
    vibration_g: float
    thermal_c: float

class IngestPayload(BaseModel):
    asset_id: str
    timestamp: str
    sensors: SensorData
    drone_image_url: str

def mock_ml_predict(sensors: SensorData) -> Dict[str, Any]:
    # Very simple heuristic mimicking a trained model
    # Real ML model (e.g., IsolationForest) would go here
    anomaly = False
    severity = "low"
    prob = random.uniform(0.01, 0.1)

    if sensors.acoustic_db > 80 or sensors.thermal_c > 35 or sensors.vibration_g > 1.0:
        anomaly = True
        severity = "high"
        prob = random.uniform(0.8, 0.99)
    elif sensors.acoustic_db > 60 or sensors.thermal_c > 30 or sensors.vibration_g > 0.7:
        anomaly = True
        severity = "medium"
        prob = random.uniform(0.4, 0.8)
    
    return {"is_anomaly": anomaly, "severity": severity, "failure_probability": round(prob, 2)}

@app.post("/api/ingest")
async def ingest_data(payload: IngestPayload):
    if payload.asset_id not in db_sensor_readings:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Store reading
    reading = payload.dict()
    db_sensor_readings[payload.asset_id].append(reading)
    
    # Keep only last 100 readings per asset to prevent memory leak
    if len(db_sensor_readings[payload.asset_id]) > 100:
        db_sensor_readings[payload.asset_id].pop(0)

    # Run ML prediction
    prediction = mock_ml_predict(payload.sensors)
    
    # Generate alert if anomaly detected
    if prediction["is_anomaly"]:
        alert = {
            "id": f"alert-{int(datetime.utcnow().timestamp())}-{random.randint(1000,9999)}",
            "asset_id": payload.asset_id,
            "timestamp": payload.timestamp,
            "severity": prediction["severity"],
            "message": f"Anomaly detected on {payload.asset_id}. Failure probability: {prediction['failure_probability']*100}%.",
            "prediction": prediction
        }
        db_alerts.insert(0, alert)
        
        # Update asset health score
        for asset in db_assets:
            if asset["id"] == payload.asset_id:
                asset["health"] = max(0, asset["health"] - (10 if prediction["severity"] == "high" else 5))
                break

    return {"status": "success", "prediction": prediction}

@app.get("/api/infrastructure")
async def get_infrastructure():
    return {"assets": db_assets}

@app.get("/api/infrastructure/{asset_id}/sensors")
async def get_asset_sensors(asset_id: str, limit: int = 20):
    if asset_id not in db_sensor_readings:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"readings": db_sensor_readings[asset_id][-limit:]}

@app.get("/api/alerts")
async def get_alerts(limit: int = 10):
    return {"alerts": db_alerts[:limit]}

cached_news = []
last_news_fetch = 0

@app.get("/api/news")
def get_news():
    global cached_news, last_news_fetch
    now = datetime.utcnow().timestamp()
    
    # Fetch news at most once every 5 minutes (300 seconds)
    if now - last_news_fetch > 300 or not cached_news:
        try:
            url = 'https://news.google.com/rss/search?q=bridge+collapse+OR+infrastructure+crash+India+2026&hl=en-IN&gl=IN&ceid=IN:en'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            res = urllib.request.urlopen(req, timeout=5).read()
            root = ET.fromstring(res)
            headlines = []
            for item in root.findall('.//item')[:15]:
                title = item.find('title').text if item.find('title') is not None else "No Title"
                link = item.find('link').text if item.find('link') is not None else "#"
                headlines.append({"title": title, "link": link})
            if headlines:
                cached_news = headlines
                last_news_fetch = now
        except Exception as e:
            print(f"Error fetching news: {e}")
            
    return {"news": cached_news}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
