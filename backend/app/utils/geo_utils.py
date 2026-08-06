import math
from typing import Optional

from loguru import logger
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import Complaint


def haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))

    return R * c


async def get_address_from_coordinates(
    lat: float, lon: float
) -> dict:
    try:
        from geopy.geocoders import Nominatim

        geolocator = Nominatim(user_agent="smart_village")
        location = geolocator.reverse(f"{lat}, {lon}", exactly_one=True, language="en")
        if location is None:
            return {"display_name": "Unknown location"}
        address = location.raw.get("address", {})
        return {
            "display_name": location.address or "",
            "road": address.get("road", ""),
            "village": address.get("village", address.get("town", address.get("city", ""))),
            "district": address.get("state_district", address.get("county", "")),
            "state": address.get("state", ""),
            "pincode": address.get("postcode", ""),
            "country": address.get("country", ""),
            "ward": address.get("ward", ""),
            "suburb": address.get("suburb", ""),
        }
    except Exception as e:
        logger.error(f"Geocoding failed for ({lat}, {lon}): {e}")
        return {"display_name": "Unknown location", "error": str(e)}


async def find_nearby_complaints(
    db: AsyncSession,
    lat: float,
    lon: float,
    radius_meters: int = 500,
    exclude_complaint_id: Optional[int] = None,
) -> list[Complaint]:
    lat_offset = radius_meters / 111320.0
    lon_offset = radius_meters / (111320.0 * math.cos(math.radians(lat)))

    lat_min = lat - lat_offset
    lat_max = lat + lat_offset
    lon_min = lon - lon_offset
    lon_max = lon + lon_offset

    conditions = [
        Complaint.latitude.isnot(None),
        Complaint.longitude.isnot(None),
        Complaint.latitude >= lat_min,
        Complaint.latitude <= lat_max,
        Complaint.longitude >= lon_min,
        Complaint.longitude <= lon_max,
    ]
    if exclude_complaint_id is not None:
        conditions.append(Complaint.id != exclude_complaint_id)

    result = await db.execute(
        select(Complaint).where(and_(*conditions))
    )
    candidates = list(result.scalars().all())

    nearby = []
    for c in candidates:
        d = haversine_distance(lat, lon, c.latitude, c.longitude)
        if d <= radius_meters:
            c._distance = round(d, 2)
            nearby.append(c)

    nearby.sort(key=lambda x: x._distance)
    return nearby
