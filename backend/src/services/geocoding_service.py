import httpx
from typing import Optional, Tuple


async def geocode_address(city: str, street: str, house: str) -> Optional[Tuple[float, float]]:
    """
    Geocode an address using OpenStreetMap Nominatim.
    Returns (latitude, longitude) or None if not found.
    """
    parts = [p for p in [house, street, city, "Belarus"] if p]
    query = ", ".join(parts)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": query, "format": "json", "limit": 1, "addressdetails": 0},
                headers={"User-Agent": "RentHouseApp/1.0"},
            )
            data = resp.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None
