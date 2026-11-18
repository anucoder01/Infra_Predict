"""Durable telemetry storage with SQLite default and PostgreSQL URL support."""
from __future__ import annotations

import json
import os
import sqlite3
from typing import Any

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./backend/infrapredict.db")


class TelemetryStore:
    def __init__(self, database_url: str = DATABASE_URL):
        self.database_url = database_url
        self._sqlite_path = None
        self._postgres = database_url.startswith(("postgresql://", "postgres://"))
        if self._postgres:
            try:
                import psycopg
            except ImportError as exc:
                raise RuntimeError("PostgreSQL selected; install backend requirements") from exc
        else:
            self._sqlite_path = database_url.removeprefix("sqlite:///")
            os.makedirs(os.path.dirname(os.path.abspath(self._sqlite_path)), exist_ok=True)
        self._initialize()

    def _connect(self):
        if self._postgres:
            import psycopg
            return psycopg.connect(self.database_url)
        return sqlite3.connect(self._sqlite_path)

    def _initialize(self):
        with self._connect() as conn:
            if self._postgres:
                conn.execute("CREATE TABLE IF NOT EXISTS telemetry (id BIGSERIAL PRIMARY KEY, asset_id TEXT NOT NULL, timestamp TEXT NOT NULL, payload JSONB NOT NULL)")
                conn.execute("CREATE INDEX IF NOT EXISTS telemetry_asset_time ON telemetry(asset_id, timestamp DESC)")
                conn.execute("CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, payload JSONB NOT NULL)")
            else:
                conn.execute("CREATE TABLE IF NOT EXISTS telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id TEXT NOT NULL, timestamp TEXT NOT NULL, payload TEXT NOT NULL)")
                conn.execute("CREATE INDEX IF NOT EXISTS telemetry_asset_time ON telemetry(asset_id, timestamp DESC)")
                conn.execute("CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, payload TEXT NOT NULL)")

    def add_reading(self, reading: dict[str, Any]) -> None:
        with self._connect() as conn:
            if self._postgres:
                conn.execute("INSERT INTO telemetry(asset_id,timestamp,payload) VALUES (%s,%s,%s)", (reading["asset_id"], reading["timestamp"], json.dumps(reading)))
            else:
                conn.execute("INSERT INTO telemetry(asset_id,timestamp,payload) VALUES (?,?,?)", (reading["asset_id"], reading["timestamp"], json.dumps(reading)))

    def readings(self, asset_id: str, limit: int = 30) -> list[dict[str, Any]]:
        with self._connect() as conn:
            marker = "%s" if self._postgres else "?"
            rows = conn.execute(f"SELECT payload FROM telemetry WHERE asset_id={marker} ORDER BY id DESC LIMIT {int(limit)}", (asset_id,)).fetchall()
        return [json.loads(row[0]) if isinstance(row[0], str) else row[0] for row in reversed(rows)]

    def add_alert(self, alert: dict[str, Any]) -> None:
        with self._connect() as conn:
            marker = "%s" if self._postgres else "?"
            conn.execute(f"INSERT INTO alerts(id,timestamp,payload) VALUES ({marker},{marker},{marker}) ON CONFLICT(id) DO NOTHING", (alert["id"], alert["timestamp"], json.dumps(alert)))

    def alerts(self, limit: int = 15) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(f"SELECT payload FROM alerts ORDER BY timestamp DESC LIMIT {int(limit)}").fetchall()
        return [json.loads(row[0]) if isinstance(row[0], str) else row[0] for row in rows]
