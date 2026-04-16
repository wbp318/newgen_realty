from fastapi import APIRouter, HTTPException

from app.schemas.market_data import (
    MarketCompRequest,
    MarketCompResponse,
    PropertyLookupRequest,
    PropertyLookupResponse,
)
from app.services import market_data

router = APIRouter(prefix="/api/market", tags=["market_data"])


@router.get("/status")
def market_status():
    """Check if market data API is configured."""
    return {"configured": market_data.is_configured()}


@router.post("/comps", response_model=MarketCompResponse)
def search_comps(request: MarketCompRequest):
    """Search for comparable sales near an address."""
    try:
        return market_data.search_comps(
            address=request.address,
            sqft=request.sqft,
            bedrooms=request.bedrooms,
            bathrooms=request.bathrooms,
            comp_count=request.comp_count,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail="Market data API error. Please try again later.")


@router.post("/property", response_model=PropertyLookupResponse)
def lookup_property(request: PropertyLookupRequest):
    """Look up property records by address."""
    try:
        return market_data.lookup_property(address=request.address)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail="Market data API error. Please try again later.")
