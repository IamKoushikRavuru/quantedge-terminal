"""
Phase 14 — Order Schema
------------------------
Defines the SandboxOrder structure for the execution simulator.
This is a hypothetical execution request — not a real order.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional


class SandboxOrder(BaseModel):
    instrument:  str                           = Field(..., description="NSE index symbol: NIFTY / BANKNIFTY / FINNIFTY")
    option_type: Literal["CE", "PE"]
    strike:      float                         = Field(..., gt=0)
    expiry:      str                           = Field(..., description="Expiry as YYYY-MM-DD or NSE display format")
    order_type:  Literal["market", "limit"]
    limit_price: Optional[float]               = Field(None, gt=0)
    quantity:    int                           = Field(..., ge=1, le=10_000, description="Units — hard-capped at 10,000")
    timestamp:   str                           = Field(..., description="Informational ISO timestamp only")
    # Risk caps — can be overridden by researcher within allowed ranges
    delta_cap:   float                         = Field(0.50, ge=0.01, le=0.80, description="Max absolute delta exposure")
    vega_cap:    float                         = Field(0.30, ge=0.01, le=0.60, description="Max vega exposure")
    gamma_cap:   float                         = Field(0.10, ge=0.001, le=0.25, description="Max gamma exposure")
    notional_cap: float                        = Field(1_000_000.0, ge=10_000.0, le=5_000_000.0, description="Max notional in INR")

    @field_validator("limit_price")
    @classmethod
    def limit_required_for_limit_orders(cls, v, info):
        if info.data.get("order_type") == "limit" and v is None:
            raise ValueError("limit_price is required for limit orders")
        return v

    @field_validator("instrument")
    @classmethod
    def normalise_instrument(cls, v: str) -> str:
        v = v.upper().strip()
        if v not in {"NIFTY", "BANKNIFTY", "FINNIFTY"}:
            raise ValueError(f"Instrument '{v}' not supported. Choose NIFTY, BANKNIFTY, or FINNIFTY.")
        return v
