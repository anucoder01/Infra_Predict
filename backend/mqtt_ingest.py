"""Optional MQTT-to-HTTP ingestion bridge. Configure MQTT_* environment variables."""
from __future__ import annotations
import json
import os
import urllib.request


def start_mqtt_listener() -> None:
    broker = os.environ.get("MQTT_BROKER")
    if not broker:
        return
    try:
        import paho.mqtt.client as mqtt
    except ImportError as exc:
        raise RuntimeError("MQTT_BROKER is set; install paho-mqtt") from exc
    host = broker.replace("mqtt://", "").replace("mqtts://", "").split(":")[0]
    port = int(os.environ.get("MQTT_PORT", "1883"))
    topic = os.environ.get("MQTT_TOPIC", "infrapredict/+/telemetry")
    api_url = os.environ.get("INGEST_URL", "http://127.0.0.1:8001/api/ingest")

    def on_connect(client, userdata, flags, rc, properties=None):
        if rc == 0:
            client.subscribe(topic)

    def on_message(client, userdata, message):
        try:
            payload = json.loads(message.payload.decode("utf-8"))
            request = urllib.request.Request(api_url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(request, timeout=5):
                pass
        except Exception as exc:
            print(f"MQTT telemetry rejected: {type(exc).__name__}")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    username, password = os.environ.get("MQTT_USERNAME"), os.environ.get("MQTT_PASSWORD")
    if username:
        client.username_pw_set(username, password)
    client.connect(host, port, keepalive=60)
    client.loop_start()
