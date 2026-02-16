import time
from typing import List

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api")

_last_request_time: float = 0.0

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "Cartographix/1.0"


class GeocodeSuggestion(BaseModel):
    display_name: str
    city: str
    country: str
    lat: float
    lon: float


@router.get("/geocode", response_model=List[GeocodeSuggestion])
async def geocode(q: str = Query(..., min_length=2)) -> List[GeocodeSuggestion]:
    global _last_request_time

    # Rate limit: max 1 request/second to Nominatim
    now = time.monotonic()
    elapsed = now - _last_request_time
    if elapsed < 1.0:
        import asyncio
        await asyncio.sleep(1.0 - elapsed)

    _last_request_time = time.monotonic()

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                NOMINATIM_URL,
                params={"q": q, "format": "json", "limit": 5, "addressdetails": 1},
                headers={"User-Agent": USER_AGENT},
            )
            resp.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Geocoding service unavailable")

    results: List[GeocodeSuggestion] = []
    for item in resp.json():
        addr = item.get("address", {})
        city = (
            addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("municipality")
            or item.get("name", "")
        )
        country = addr.get("country", "")
        results.append(
            GeocodeSuggestion(
                display_name=item.get("display_name", ""),
                city=city,
                country=country,
                lat=float(item.get("lat", 0)),
                lon=float(item.get("lon", 0)),
            )
        )

    return results
