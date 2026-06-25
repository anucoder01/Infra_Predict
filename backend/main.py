from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
import pandas as pd
import random

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
    {"id": "bridge-01", "name": "Golden Gate Bridge", "type": "bridge", "location": {"lat": 37.8199, "lng": -122.4783}, "health": 100},
    {"id": "pipe-01", "name": "Main Water Line A", "type": "pipeline", "location": {"lat": 37.7749, "lng": -122.4194}, "health": 100},
    {"id": "power-01", "name": "High Voltage Line 1", "type": "powerline", "location": {"lat": 37.3382, "lng": -121.8863}, "health": 100},
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

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
