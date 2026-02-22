"""
Phase 14 — Deterministic Slippage Models
------------------------------------------
All slippage is computed deterministically from market state — no randomness.
Three additive components: spread-based, volatility-scaled, size-scaled.

Slippage here is a DIAGNOSTIC OUTPUT, not a cost optimisation target.
"""
import math


# Multipliers calibrated for NSE index options (empirical proxies)
SPREAD_FACTOR      = 0.004   # 0.4% of mid-price as base spread proxy
VOL_IMPACT_FACTOR  = 0.002   # additional per 1% ATM IV point
SIZE_LOG_FACTOR    = 0.0015  # logarithmic size impact coefficient


def _bid_ask_proxy(mid_price: float, atm_iv: float) -> float:
    """
    Approximates bid-ask half-spread from mid-price and IV.
    Higher IV → wider spread (common in liquid index options).
    """
    base_spread = mid_price * SPREAD_FACTOR
    vol_addon   = (atm_iv / 100.0) * mid_price * VOL_IMPACT_FACTOR * 10
    return base_spread + vol_addon


def compute_slippage(
    mid_price: float,
    atm_iv:    float,
    quantity:  int,
    order_type: str,
) -> float:
    """
    Returns deterministic slippage estimate in ₹ per unit.

    Components:
    1. Spread-based: proportional to estimated bid-ask width
    2. Vol-scaled:   wider spreads in high-IV environments
    3. Size-scaled:  larger orders → higher market impact (log scale)

    Market orders always pay full slippage; limit orders pay 30% (taker risk only).
    """
    if mid_price <= 0:
        return 0.0

    spread  = _bid_ask_proxy(mid_price, atm_iv)
    size_impact = SIZE_LOG_FACTOR * mid_price * math.log1p(quantity / 100)

    total_slippage = spread + size_impact

    # Limit orders face lower slippage — they provide liquidity rather than taking it
    if order_type == "limit":
        total_slippage *= 0.30

    return round(total_slippage, 4)


def slippage_components(
    mid_price: float,
    atm_iv:    float,
    quantity:  int,
    order_type: str,
) -> dict:
    """Returns named slippage components for diagnostic display."""
    spread      = _bid_ask_proxy(mid_price, atm_iv)
    size_impact = SIZE_LOG_FACTOR * mid_price * math.log1p(quantity / 100)
    total       = spread + size_impact
    factor      = 0.30 if order_type == "limit" else 1.0

    return {
        "spread_component": round(spread * factor, 4),
        "size_component":   round(size_impact * factor, 4),
        "total_slippage":   round(total * factor, 4),
        "order_type_factor": factor,
    }
