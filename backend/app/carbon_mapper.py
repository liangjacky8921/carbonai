"""Read-only Carbon Mapper plume adapter. No persistent or in-memory data cache.

Official API: https://api.carbonmapper.org/api/v1/docs
Data use is subject to https://carbonmapper.org/terms. This adapter is off by default.
"""

import json
import math
import os
import threading
import time
from collections import deque
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException


API_BASE = "https://api.carbonmapper.org/api/v1/catalog"
SOURCE_URL = "https://data.carbonmapper.org/"
_REQUEST_TIMES = deque()
_USER_REQUEST_TIMES = {}
_RATE_LOCK = threading.Lock()
_MAX_REQUESTS_PER_MINUTE = 10
_MAX_USER_REQUESTS_PER_MINUTE = 6
_TIMEOUT_SECONDS = 8


def require_enabled():
    if os.getenv("CARBON_MAPPER_ENABLED", "").lower() not in {"1", "true", "yes"}:
        raise HTTPException(status_code=503, detail="Carbon Mapper observation service is disabled")
    token = os.getenv("CARBON_MAPPER_API_KEY", "").strip()
    if not token:
        raise HTTPException(status_code=503, detail="Carbon Mapper API credential is not configured")
    return token


def _check_rate_limit():
    now = time.monotonic()
    with _RATE_LOCK:
        while _REQUEST_TIMES and now - _REQUEST_TIMES[0] >= 60:
            _REQUEST_TIMES.popleft()
        if len(_REQUEST_TIMES) >= _MAX_REQUESTS_PER_MINUTE:
            raise HTTPException(status_code=429, detail="Observation request limit reached; retry later")
        _REQUEST_TIMES.append(now)


def check_user_quota(user_id):
    """Bound each authorized preview account before consuming upstream quota."""
    now = time.monotonic()
    with _RATE_LOCK:
        # Prune inactive accounts so this small preview-only limiter stays bounded.
        for key, times in list(_USER_REQUEST_TIMES.items()):
            while times and now - times[0] >= 60:
                times.popleft()
            if not times:
                del _USER_REQUEST_TIMES[key]
        times = _USER_REQUEST_TIMES.setdefault(user_id, deque())
        if len(times) >= _MAX_USER_REQUESTS_PER_MINUTE:
            raise HTTPException(status_code=429, detail="Observation account quota reached; retry later")
        times.append(now)


def _get_json(path, params, token):
    _check_rate_limit()
    url = API_BASE + path + ("?" + urlencode(params, doseq=True) if params else "")
    request = Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    try:
        with urlopen(request, timeout=_TIMEOUT_SECONDS) as response:
            return json.load(response)
    except HTTPError as exc:
        # Never include an upstream body, URL or Authorization header in errors or logs.
        if exc.code in {401, 403}:
            raise HTTPException(status_code=502, detail="Carbon Mapper credential was rejected") from None
        if exc.code == 404:
            raise HTTPException(status_code=404, detail="Observation not found") from None
        if exc.code == 429:
            raise HTTPException(status_code=503, detail="Carbon Mapper is rate limiting requests") from None
        raise HTTPException(status_code=502, detail="Carbon Mapper request failed") from None
    except (TimeoutError, URLError) as exc:
        raise HTTPException(status_code=503, detail="Carbon Mapper is temporarily unavailable") from None
    except (ValueError, UnicodeError) as exc:
        raise HTTPException(status_code=502, detail="Carbon Mapper returned invalid data") from None


def _finite_number(value):
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def normalize_plume(raw):
    if not isinstance(raw, dict):
        raise ValueError("Invalid plume record")
    geometry = raw.get("geometry_json") or {}
    coordinates = geometry.get("coordinates") if geometry.get("type") == "Point" else None
    if not isinstance(coordinates, list) or len(coordinates) < 2:
        raise ValueError("Plume has no point coordinates")
    lon, lat = (_finite_number(coordinates[0]), _finite_number(coordinates[1]))
    if lon is None or lat is None or not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise ValueError("Invalid plume coordinates")
    plume_id = raw.get("plume_id")
    if not plume_id:
        raise ValueError("Plume has no ID")
    hidden = raw.get("hide_emission") is True
    return {
        "id": plume_id,
        "gas": raw.get("gas"),
        "longitude": lon,
        "latitude": lat,
        "coordinateSystem": "EPSG:4326",
        "observedAt": raw.get("scene_timestamp"),
        "publishedAt": raw.get("published_at"),
        "emissionRateKgPerHour": None if hidden else _finite_number(raw.get("emission_auto")),
        "emissionUncertaintyKgPerHour": None if hidden else _finite_number(raw.get("emission_uncertainty_auto")),
        "quality": raw.get("plume_quality"),
        "status": raw.get("status"),
        "instrument": raw.get("instrument"),
        "productCollection": raw.get("collection"),
        "emissionVersion": raw.get("emission_version"),
        "source": {"name": "Carbon Mapper", "url": SOURCE_URL},
    }


def list_plumes(bbox, gas, start, end, limit, token):
    params = [("bbox", coordinate) for coordinate in bbox]
    params.extend([("plume_gas", gas), ("limit", limit), ("offset", 0), ("status", "published")])
    if start or end:
        params.append(("datetime", f"{start or '..'}/{end or '..'}"))
    payload = _get_json("/plumes/annotated", params, token)
    if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
        raise HTTPException(status_code=502, detail="Carbon Mapper returned invalid data")
    try:
        items = [normalize_plume(item) for item in payload["items"]]
    except ValueError:
        raise HTTPException(status_code=502, detail="Carbon Mapper returned invalid data") from None
    return {
        "items": items,
        "matchedCount": payload.get("bbox_count"),
        "query": {"bbox": bbox, "gas": gas, "from": start, "to": end, "limit": limit},
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "cacheStatus": "disabled",
        "source": {"name": "Carbon Mapper", "url": SOURCE_URL, "termsUrl": "https://carbonmapper.org/terms"},
        "notice": "Discrete plume observations; no continuous monitoring or annual emissions estimate. Redistribution is subject to Carbon Mapper's non-commercial terms and attribution.",
    }


def get_plume(plume_id, token):
    payload = _get_json("/plume/" + quote(plume_id, safe=""), None, token)
    if not isinstance(payload, dict) or payload.get("status") != "published":
        raise HTTPException(status_code=404, detail="Observation not found")
    try:
        item = normalize_plume(payload)
    except ValueError:
        raise HTTPException(status_code=502, detail="Carbon Mapper returned invalid data") from None
    return {"item": item, "fetchedAt": datetime.now(timezone.utc).isoformat(), "cacheStatus": "disabled"}
