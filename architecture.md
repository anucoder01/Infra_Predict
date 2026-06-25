# InfraPredict AI Architecture

## High-Level System Design

```mermaid
graph TD
    subgraph Edge / Sensors
        A1[Acoustic Sensors] --> B[Data Simulator]
        A2[Vibration Sensors] --> B
        A3[Thermal Sensors] --> B
        A4[Drone Visuals] --> B
    end

    subgraph GCP Ingestion & Processing
        B -- HTTP POST --> C(Cloud Run / FastAPI Backend)
        C -- Store Readings --> D[(Firestore)]
        C -- Store History --> E[(BigQuery)]
    end

    subgraph Vertex AI / ML Engine
        C -- Inference Request --> F[Anomaly Detection Model]
        F -- Probability & Severity --> C
    end

    subgraph Frontend Application
        G[Next.js Dashboard] -- Polls / WebSocket --> C
        C -- Real-time Alerts --> G
        D -- Reads Data --> G
    end

    style C fill:#3b82f6,stroke:#1d4ed8,color:#fff
    style G fill:#10b981,stroke:#047857,color:#fff
    style F fill:#f59e0b,stroke:#b45309,color:#fff
```

## Component Details

1. **Edge/Sensors:** Simulated via a Python script (`simulator/main.py`) that generates pseudo-random multi-modal data and introduces sudden anomalous spikes.
2. **Backend API:** A FastAPI service (`backend/main.py`) that ingests data, stores it in memory (or Firestore in production), and runs ML inferences.
3. **ML Inference:** Currently an integrated mock anomaly detection heuristic acting as a stand-in for a Vertex AI deployed Isolation Forest model.
4. **Frontend:** A Next.js 14 App Router application with TailwindCSS and Recharts, offering real-time visualization of sensor telemetries, infrastructure health, and alerts via an interactive Map (`react-leaflet`).
