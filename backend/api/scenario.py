"""
Phase 11 — Scenario Engine
---------------------------
Counterfactual scenario analysis: re-prices options under user-defined shocks.

This is NOT prediction. It answers:
  "If spot/vol moved by X%, what would the option surface theoretically look like?"

Uses existing Black-Scholes and Heston engines. Read-only.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal, List, Optional
import numpy as np
from datetime import datetime

from backend.pricing.black_scholes import black_scholes_price, black_scholes_greeks
from backend.services.data_fetcher  import fetch_spot, fetch_option_chain

router = APIRouter(prefix="/api/scenario", tags=["scenario"])

DISCLAIMER = (
    "Counterfactual analysis only. Outputs show theoretical re-pricing under hypothetical shocks. "
    "This is NOT a forecast, NOT a prediction, and NOT investment advice."
)

# ── Request / Response models ─────────────────────────────────────────────────

class ScenarioRequest(BaseModel):
    symbol:          str   = Field("NIFTY", description="NSE index symbol")
    strike:          float = Field(..., gt=0, description="Option strike price")
    option_type:     Literal["call", "put"] = Field("call")
    base_spot:       Optional[float] = Field(None, description="Override spot (uses live if None)")
    base_iv:         float = Field(0.15, ge=0.01, le=2.0, description="Base implied volatility (decimal)")
    time_to_expiry:  float = Field(0.05, ge=0.001, le=1.0, description="Base T in years (~0.05 = ~18 days)")
    risk_free_rate:  float = Field(0.065, ge=0.0, le=0.20)

    # Shock parameters (bounded)
    spot_shock_pct:  float = Field(0.0,  ge=-30.0, le=30.0,  description="Spot shock ±%")
    vol_shock_pct:   float = Field(0.0,  ge=-50.0, le=50.0,  description="IV shock ±%")
    days_forward:    int   = Field(0,    ge=0,     le=30,     description="Days of time decay")

    model: Literal["black-scholes"] = Field("black-scholes")


class GreeksSnapshot(BaseModel):
    delta: float; gamma: float; theta: float; vega: float; rho: float


class ScenarioResult(BaseModel):
    disclaimer:    str
    symbol:        str
    strike:        float
    option_type:   str

    # Base scenario
    base_spot:     float
    base_iv:       float
    base_tte:      float
    base_price:    float
    base_greeks:   dict

    # Shocked scenario
    shocked_spot:  float
    shocked_iv:    float
    shocked_tte:   float
    shocked_price: float
    shocked_greeks: dict

    # Deltas
    price_change:  float
    price_change_pct: float
    delta_pnl:     float    # First-order approximation Δ * ΔS
    gamma_pnl:     float    # Second-order: 0.5 * Γ * ΔS²
    vega_pnl:      float    # Vega * Δσ
    theta_pnl:     float    # Theta * days

    # Surface deformation
    surface_rows:  List[dict]
    as_of:         str


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/run", response_model=ScenarioResult)
def run_scenario(req: ScenarioRequest):
    """
    Re-price an option under hypothetical shocks.
    The output is explicitly counterfactual — not a forecast.
    """
    r = req.risk_free_rate

    # Resolve base spot
    if req.base_spot and req.base_spot > 0:
        base_spot = req.base_spot
    else:
        spot_data = fetch_spot(req.symbol.upper())
        base_spot = spot_data.get("spot") or 22000.0

    # Compute shocked inputs
    shocked_spot = base_spot * (1 + req.spot_shock_pct / 100.0)
    shocked_iv   = req.base_iv * (1 + req.vol_shock_pct / 100.0)
    shocked_iv   = max(0.01, min(shocked_iv, 5.0))   # clamp to sane range
    shocked_tte  = max(0.0005, req.time_to_expiry - req.days_forward / 365.0)

    # Price both scenarios
    base_price    = black_scholes_price(base_spot,    req.strike, req.time_to_expiry, r, req.base_iv, req.option_type)
    shocked_price = black_scholes_price(shocked_spot, req.strike, shocked_tte,        r, shocked_iv,  req.option_type)

    base_greeks    = black_scholes_greeks(base_spot,    req.strike, req.time_to_expiry, r, req.base_iv, req.option_type)
    shocked_greeks = black_scholes_greeks(shocked_spot, req.strike, shocked_tte,        r, shocked_iv,  req.option_type)

    # Attribution
    dS         = shocked_spot - base_spot
    dsigma     = shocked_iv   - req.base_iv
    delta_pnl  = base_greeks["delta"] * dS
    gamma_pnl  = 0.5 * base_greeks["gamma"] * dS ** 2
    vega_pnl   = base_greeks["vega"] * (dsigma * 100)      # vega is per 1% σ
    theta_pnl  = base_greeks["theta"] * req.days_forward

    price_change = float(shocked_price) - float(base_price)
    price_change_pct = (price_change / float(base_price) * 100) if base_price else 0.0

    # Surface deformation: re-price a range of strikes under shocked conditions
    chain_data = fetch_option_chain(req.symbol.upper())
    options    = chain_data.get("options", [])
    strikes_near = sorted(
        set(o["strike"] for o in options),
        key=lambda k: abs(k - base_spot)
    )[:12]

    surface_rows = []
    for K in sorted(strikes_near):
        base_p    = black_scholes_price(base_spot,    K, req.time_to_expiry, r, req.base_iv, req.option_type)
        shocked_p = black_scholes_price(shocked_spot, K, shocked_tte,        r, shocked_iv,  req.option_type)
        base_g    = black_scholes_greeks(base_spot,    K, req.time_to_expiry, r, req.base_iv, req.option_type)
        shocked_g = black_scholes_greeks(shocked_spot, K, shocked_tte,        r, shocked_iv,  req.option_type)
        surface_rows.append({
            "strike":          K,
            "base_price":      round(float(base_p), 2),
            "shocked_price":   round(float(shocked_p), 2),
            "price_change":    round(float(shocked_p) - float(base_p), 2),
            "base_delta":      round(base_g["delta"], 4),
            "shocked_delta":   round(shocked_g["delta"], 4),
            "base_gamma":      round(base_g["gamma"], 6),
            "shocked_gamma":   round(shocked_g["gamma"], 6),
            "moneyness":       round(K / base_spot - 1, 4),
        })

    return ScenarioResult(
        disclaimer     = DISCLAIMER,
        symbol         = req.symbol.upper(),
        strike         = req.strike,
        option_type    = req.option_type,
        base_spot      = round(base_spot, 2),
        base_iv        = round(req.base_iv, 4),
        base_tte       = round(req.time_to_expiry, 4),
        base_price     = round(float(base_price), 2),
        base_greeks    = {k: round(v, 6) for k, v in base_greeks.items()},
        shocked_spot   = round(shocked_spot, 2),
        shocked_iv     = round(shocked_iv, 4),
        shocked_tte    = round(shocked_tte, 4),
        shocked_price  = round(float(shocked_price), 2),
        shocked_greeks = {k: round(v, 6) for k, v in shocked_greeks.items()},
        price_change   = round(price_change, 2),
        price_change_pct = round(price_change_pct, 2),
        delta_pnl      = round(delta_pnl, 2),
        gamma_pnl      = round(gamma_pnl, 2),
        vega_pnl       = round(vega_pnl, 2),
        theta_pnl      = round(theta_pnl, 2),
        surface_rows   = surface_rows,
        as_of          = datetime.utcnow().isoformat() + "Z",
    )
