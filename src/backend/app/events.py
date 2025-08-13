from datetime import datetime
from typing import Dict, Any
import os
import json
import httpx

_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    url = os.getenv("REDIS_URL")
    if not url:
        return None
    try:
        import redis  # type: ignore

        _redis_client = redis.Redis.from_url(url, decode_responses=True)
        # ping once
        _redis_client.ping()
    except Exception:
        _redis_client = None
    return _redis_client


def emit_event(name: str, payload: Dict[str, Any]) -> None:
    event = {
        "name": name,
        "ts": datetime.utcnow().isoformat(),
        "payload": payload,
    }
    # stdout
    print(f"EVENT {event['ts']} {name}: {payload}")
    # optional Redis publish
    client = _get_redis()
    if client is not None:
        try:
            client.publish("brandvx.events", str(event))
        except Exception:
            pass
    # optional PostHog capture
    try:
        _posthog_capture(event)
    except Exception:
        pass


def _posthog_capture(event: Dict[str, Any]) -> None:
    api_key = os.getenv("POSTHOG_API_KEY")
    host = os.getenv("POSTHOG_HOST", "https://app.posthog.com").rstrip("/")
    if not api_key:
        return
    # pick a deterministic distinct_id: prefer tenant_id, else operator_id, else contact_id, else 'system'
    payload = event.get("payload", {}) or {}
    distinct_id = (
        str(payload.get("tenant_id")
            or payload.get("operator_id")
            or payload.get("contact_id")
            or "system")
    )
    data = {
        "api_key": api_key,
        "event": event.get("name"),
        "distinct_id": distinct_id,
        "properties": payload,
        "timestamp": event.get("ts"),
    }
    with httpx.Client(timeout=5) as client:
        client.post(f"{host}/capture/", json=data)


