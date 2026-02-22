"""
QuantEdge User API
------------------
Profile, pricing history, and watchlist endpoints.
All endpoints require Bearer token authentication.
"""

from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
from typing import Optional
from backend.db.database import (
    validate_session, get_user_by_id, get_user_stats,
    get_pricing_history, add_pricing_history, delete_pricing_history,
    get_watchlist, add_watchlist_item, remove_watchlist_item,
    save_onboarding,
)

router = APIRouter(prefix="/api/user", tags=["user"])


# ── Auth helper ───────────────────────────────────────────────────────────────

def _require_user(authorization: Optional[str]) -> dict:
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "Authentication required")
    user = validate_session(token)
    if not user:
        raise HTTPException(401, "Session expired or invalid")
    return user


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/profile")
def get_profile(authorization: Optional[str] = Header(None)):
    user = _require_user(authorization)
    db_user = get_user_by_id(user["id"])
    stats   = get_user_stats(user["id"])
    return {
        "status": "ok",
        "user": {
            "id":         db_user["id"],
            "email":      db_user["email"],
            "name":       db_user.get("name", ""),
            "created_at": db_user.get("created_at", ""),
            "last_login": db_user.get("last_login", ""),
        },
        "stats": stats,
    }


# ── Onboarding ────────────────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    date_of_birth: str = ""
    age_group:     str = ""
    qualification: str = ""
    sub_choice:    str = ""
    purpose:       str = ""


@router.post("/onboarding")
def post_onboarding(req: OnboardingRequest, authorization: Optional[str] = Header(None)):
    """Save onboarding questionnaire answers for a new user."""
    user = _require_user(authorization)
    save_onboarding(
        user["id"], req.date_of_birth, req.age_group,
        req.qualification, req.sub_choice, req.purpose,
    )
    return {"status": "ok"}


# ── Pricing History ───────────────────────────────────────────────────────────

class PricingRecordRequest(BaseModel):
    model:       str
    symbol:      str
    option_type: str
    strike:      float
    expiry:      str
    spot:        Optional[float] = None
    iv:          Optional[float] = None
    result_price: Optional[float] = None
    greeks_json: Optional[str] = None
    params_json: Optional[str] = None


@router.get("/history")
def get_history(
    limit: int = Query(100, le=500),
    authorization: Optional[str] = Header(None),
):
    user = _require_user(authorization)
    records = get_pricing_history(user["id"], limit=limit)
    return {"status": "ok", "count": len(records), "records": records}


@router.post("/history")
def add_history(req: PricingRecordRequest, authorization: Optional[str] = Header(None)):
    user = _require_user(authorization)
    rid = add_pricing_history(
        user_id=user["id"], model=req.model, symbol=req.symbol,
        option_type=req.option_type, strike=req.strike, expiry=req.expiry,
        spot=req.spot, iv=req.iv, result_price=req.result_price,
        greeks_json=req.greeks_json, params_json=req.params_json,
    )
    return {"status": "ok", "id": rid}


@router.delete("/history")
def clear_history(
    record_id: Optional[int] = Query(None),
    authorization: Optional[str] = Header(None),
):
    user = _require_user(authorization)
    delete_pricing_history(user["id"], record_id=record_id)
    return {"status": "ok", "message": "Deleted"}


# ── Watchlist ─────────────────────────────────────────────────────────────────

class WatchlistItemRequest(BaseModel):
    symbol:      str
    strike:      float
    option_type: str = "CE"
    expiry:      str = ""


@router.get("/watchlist")
def get_watchlist_items(authorization: Optional[str] = Header(None)):
    user = _require_user(authorization)
    items = get_watchlist(user["id"])
    return {"status": "ok", "count": len(items), "items": items}


@router.post("/watchlist")
def add_to_watchlist(req: WatchlistItemRequest, authorization: Optional[str] = Header(None)):
    user = _require_user(authorization)
    try:
        item = add_watchlist_item(
            user["id"], req.symbol, req.strike, req.option_type, req.expiry
        )
        return {"status": "ok", "item": item}
    except ValueError as e:
        raise HTTPException(409, str(e))


@router.delete("/watchlist/{item_id}")
def remove_from_watchlist(item_id: int, authorization: Optional[str] = Header(None)):
    user = _require_user(authorization)
    remove_watchlist_item(user["id"], item_id)
    return {"status": "ok", "message": "Removed"}
