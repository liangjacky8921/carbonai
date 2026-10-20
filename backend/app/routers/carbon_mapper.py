"""Disabled-by-default, read-only Carbon Mapper observation endpoints."""

from datetime import date
import math
import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app import carbon_mapper
from app.db import SessionLocal, User
from app.routers import auth
from app.schemas import ok


router = APIRouter(prefix="/api/observations/carbon-mapper", tags=["observations"])


def _require_access(authorization: str = Header(default="")):
    upstream_token = carbon_mapper.require_enabled()
    configured = os.getenv("CARBON_MAPPER_ALLOWED_USER_IDS", "").strip()
    ids = [part.strip() for part in configured.split(",") if part.strip()]
    if not ids or any(not part.isdecimal() or int(part) < 1 for part in ids):
        raise HTTPException(status_code=503, detail="Observation access list is not configured")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Platform login required")
    user_id = auth._parse_token(authorization[7:].strip())
    if not isinstance(user_id, int) or isinstance(user_id, bool):
        raise HTTPException(status_code=401, detail="Invalid platform session")
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.id == user_id).first():
            raise HTTPException(status_code=401, detail="Invalid platform session")
    finally:
        db.close()
    if user_id not in {int(part) for part in ids}:
        raise HTTPException(status_code=403, detail="Observation access is restricted")
    carbon_mapper.check_user_quota(user_id)
    return upstream_token


def _bbox(value):
    try:
        parts = [float(part.strip()) for part in value.split(",")]
    except ValueError:
        parts = []
    if (len(parts) != 4 or any(not math.isfinite(n) for n in parts)
            or any(not -180 <= n <= 180 for n in (parts[0:1] + parts[2:3]))
            or any(not -90 <= n <= 90 for n in (parts[1:2] + parts[3:4]))
            or parts[0] >= parts[2] or parts[1] >= parts[3]):
        raise HTTPException(status_code=422, detail="bbox must be minLon,minLat,maxLon,maxLat")
    return parts


@router.get("")
def observations(
    bbox: str = Query(..., description="minLon,minLat,maxLon,maxLat in EPSG:4326"),
    gas: str = Query("CH4", pattern="^(CH4|CO2)$"),
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    limit: int = Query(25, ge=1, le=100),
    token: str = Depends(_require_access),
):
    box = _bbox(bbox)
    if from_date and to_date and from_date > to_date:
        raise HTTPException(status_code=422, detail="from must be no later than to")
    start = from_date.isoformat() if from_date else None
    end = to_date.isoformat() if to_date else None
    return ok(carbon_mapper.list_plumes(box, gas, start, end, limit, token))


@router.get("/{plume_id}")
def observation_detail(plume_id: str, token: str = Depends(_require_access)):
    if len(plume_id) > 128 or not all(c.isalnum() or c in "-_" for c in plume_id):
        raise HTTPException(status_code=422, detail="Invalid observation ID")
    return ok(carbon_mapper.get_plume(plume_id, token))
