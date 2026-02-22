"""
Phase 11 — Market Structure Analytics
--------------------------------------
Read-only derived metrics from NSE option chain.
Computes: OI profile, Gamma Exposure (GEX), Max Pain,
          flow metrics (PCR, ΔOI), and vol regime classification.

All outputs are structural analysis. Not directional forecasts.
"""

from fastapi import APIRouter, Query
from typing import Optional
import numpy as np
from datetime import datetime

from backend.services.data_fetcher import fetch_option_chain, fetch_spot
from backend.pricing.black_scholes import black_scholes_greeks

router = APIRouter(prefix="/api/market", tags=["market-structure"])

DISCLAIMER = "Structural metrics derived from market data. Not directional forecasts. For research use only."

# ── Helpers ───────────────────────────────────────────────────────────────────

def _first_expiry_data(raw_options: list, expiry: Optional[str] = None) -> list:
    """Filter options to a single expiry (first available if not specified)."""
    if not raw_options:
        return []
    if expiry:
        rows = [o for o in raw_options if o.get("expiry", "").lower() == expiry.lower()]
        return rows or raw_options  # fallback to all if no match
    # Group by expiry, take first
    first_exp = raw_options[0].get("expiry", "")
    return [o for o in raw_options if o.get("expiry", "") == first_exp]


def _compute_max_pain(options: list) -> float:
    """
    Max pain strike: the strike at which total open-interest-weighted losses
    for all option holders are maximised (i.e. where writers profit most).
    """
    strikes = sorted(set(o["strike"] for o in options))
    if not strikes:
        return 0.0
    min_pain = float("inf")
    max_pain_strike = strikes[0]
    for S in strikes:
        total_pain = 0.0
        for o in options:
            K = o["strike"]
            call_oi = o.get("call_oi", 0) or 0
            put_oi  = o.get("put_oi", 0) or 0
            # Payoff if S is settlement price
            call_loss = max(S - K, 0) * call_oi
            put_loss  = max(K - S, 0) * put_oi
            total_pain += call_loss + put_loss
        if total_pain < min_pain:
            min_pain = total_pain
            max_pain_strike = S
    return float(max_pain_strike)


def _compute_gex(options: list, spot: float, r: float = 0.065, T: float = 7/365) -> list:
    """
    Gamma Exposure (GEX) per strike.
    GEX = Gamma * OI * Contract_multiplier (75 for NIFTY)
    Call GEX is positive (dealers long gamma), Put GEX is negative (dealers short gamma).
    """
    if T <= 0:
        T = 1 / 365
    result = []
    for o in options:
        strike = o["strike"]
        call_iv = (o.get("call_iv") or 0) / 100.0
        put_iv  = (o.get("put_iv") or 0) / 100.0
        call_oi = o.get("call_oi", 0) or 0
        put_oi  = o.get("put_oi", 0) or 0

        call_gex = 0.0
        if call_iv > 0.001 and spot > 0:
            g = black_scholes_greeks(spot, strike, T, r, call_iv, "call")
            call_gex = g["gamma"] * call_oi * 75  # NSE lot ~ 75 units (NIFTY)

        put_gex = 0.0
        if put_iv > 0.001 and spot > 0:
            g = black_scholes_greeks(spot, strike, T, r, put_iv, "put")
            put_gex = -(g["gamma"] * put_oi * 75)  # negative — puts flip dealer gamma

        result.append({
            "strike":    strike,
            "call_gex":  round(call_gex, 2),
            "put_gex":   round(put_gex, 2),
            "net_gex":   round(call_gex + put_gex, 2),
        })
    return result


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/oi-profile")
def oi_profile(
    symbol:  str = Query("NIFTY", description="NSE index symbol"),
    expiry:  Optional[str] = Query(None, description="Expiry date filter DD-Mon-YYYY"),
):
    """
    Strike-wise Open Interest profile, Gamma Exposure, and Max Pain.
    All values are derived metrics — not price predictions.
    """
    chain_data = fetch_option_chain(symbol.upper())
    spot_data  = fetch_spot(symbol.upper())
    spot       = spot_data.get("spot") or 22000.0

    options = _first_expiry_data(chain_data.get("options", []), expiry)
    expiry_used = options[0].get("expiry", "N/A") if options else "N/A"

    # Strike-wise OI table
    strikes = sorted(set(o["strike"] for o in options))
    oi_rows = []
    total_call_oi = 0
    total_put_oi  = 0
    for k in strikes:
        row = next((o for o in options if o["strike"] == k), {})
        c_oi = row.get("call_oi", 0) or 0
        p_oi = row.get("put_oi", 0) or 0
        total_call_oi += c_oi
        total_put_oi  += p_oi
        oi_rows.append({
            "strike":   k,
            "call_oi":  c_oi,
            "put_oi":   p_oi,
            "net_oi":   c_oi - p_oi,
            "is_atm":   abs(k - spot) == min(abs(s - spot) for s in strikes),
        })

    max_pain = _compute_max_pain(options)

    # GEX — estimate T from expiry string if possible
    T_est = 7 / 365  # default 1 week
    gex_rows = _compute_gex(options, spot, T=T_est)

    # Net GEX flip level
    net_gex_by_strike = [(r["strike"], r["net_gex"]) for r in gex_rows]
    gamma_flip = None
    for i in range(1, len(net_gex_by_strike)):
        prev_gex = net_gex_by_strike[i - 1][1]
        curr_gex = net_gex_by_strike[i][1]
        if prev_gex * curr_gex < 0:  # sign change
            gamma_flip = (net_gex_by_strike[i - 1][0] + net_gex_by_strike[i][0]) / 2
            break

    return {
        "disclaimer":     DISCLAIMER,
        "symbol":         symbol.upper(),
        "spot":           spot,
        "expiry":         expiry_used,
        "max_pain":       max_pain,
        "max_pain_vs_spot_pct": round((max_pain - spot) / spot * 100, 2) if spot else 0,
        "gamma_flip":     gamma_flip,
        "total_call_oi":  total_call_oi,
        "total_put_oi":   total_put_oi,
        "pcr_oi":         round(total_put_oi / total_call_oi, 3) if total_call_oi else None,
        "oi_rows":        oi_rows,
        "gex_rows":       gex_rows,
        "as_of":          datetime.utcnow().isoformat() + "Z",
        "data_stale":     chain_data.get("_cache_stale", False),
    }


@router.get("/flow-metrics")
def flow_metrics(
    symbol: str = Query("NIFTY", description="NSE index symbol"),
    expiry: Optional[str] = Query(None),
):
    """
    Put/Call ratios (volume and OI), change-in-OI analysis,
    and inferred dealer net positioning proxy.
    """
    chain_data = fetch_option_chain(symbol.upper())
    options    = _first_expiry_data(chain_data.get("options", []), expiry)
    expiry_used = options[0].get("expiry", "N/A") if options else "N/A"

    total_call_vol = sum(o.get("call_volume", 0) or 0 for o in options)
    total_put_vol  = sum(o.get("put_volume",  0) or 0 for o in options)
    total_call_oi  = sum(o.get("call_oi",     0) or 0 for o in options)
    total_put_oi   = sum(o.get("put_oi",      0) or 0 for o in options)

    pcr_vol = round(total_put_vol / total_call_vol, 3) if total_call_vol else None
    pcr_oi  = round(total_put_oi  / total_call_oi,  3) if total_call_oi  else None

    # Strike-wise volume skew (where is vol concentrated)
    top_call_strikes = sorted(options, key=lambda o: o.get("call_volume", 0) or 0, reverse=True)[:5]
    top_put_strikes  = sorted(options, key=lambda o: o.get("put_volume",  0) or 0, reverse=True)[:5]

    # Dealer positioning proxy: sum(call_OI - put_OI) above/below ATM
    spot_data = fetch_spot(symbol.upper())
    spot = spot_data.get("spot") or 22000.0
    otm_calls = [o for o in options if o["strike"] > spot]
    itm_puts  = [o for o in options if o["strike"] > spot]
    dealer_proxy_label = "Net Dealer Short Gamma (elevated call OI above spot)" if total_call_oi > total_put_oi else "Net Dealer Long Gamma (elevated put OI)"

    # Classify PCR regime
    if pcr_oi is None:
        pcr_regime = "unavailable"
    elif pcr_oi < 0.7:
        pcr_regime = "bearish_positioning"       # more calls than puts — bearish for option buyers
    elif pcr_oi > 1.3:
        pcr_regime = "elevated_put_demand"
    else:
        pcr_regime = "balanced"

    return {
        "disclaimer":          DISCLAIMER,
        "symbol":              symbol.upper(),
        "spot":                spot,
        "expiry":              expiry_used,
        "pcr_volume":          pcr_vol,
        "pcr_oi":              pcr_oi,
        "pcr_regime":          pcr_regime,
        "total_call_volume":   total_call_vol,
        "total_put_volume":    total_put_vol,
        "total_call_oi":       total_call_oi,
        "total_put_oi":        total_put_oi,
        "dealer_proxy_label":  dealer_proxy_label,
        "top_call_strikes_by_vol": [{"strike": o["strike"], "volume": o.get("call_volume", 0)} for o in top_call_strikes],
        "top_put_strikes_by_vol":  [{"strike": o["strike"], "volume": o.get("put_volume",  0)} for o in top_put_strikes],
        "as_of":               datetime.utcnow().isoformat() + "Z",
        "data_stale":          chain_data.get("_cache_stale", False),
    }


@router.get("/vol-regime")
def vol_regime(
    symbol: str = Query("NIFTY", description="NSE index symbol"),
    expiry: Optional[str] = Query(None),
):
    """
    Volatility regime classification.
    IV percentile estimate, IV vs HV proxy, term structure shape.
    """
    chain_data = fetch_option_chain(symbol.upper())
    options    = _first_expiry_data(chain_data.get("options", []), expiry)
    expiry_used = options[0].get("expiry", "N/A") if options else "N/A"

    # ATM IV (average of near-ATM call and put IV)
    spot_data = fetch_spot(symbol.upper())
    spot = spot_data.get("spot") or 22000.0

    all_strikes = sorted(set(o["strike"] for o in options))
    atm_strike  = min(all_strikes, key=lambda k: abs(k - spot)) if all_strikes else spot

    atm_row    = next((o for o in options if o["strike"] == atm_strike), {})
    atm_call_iv = (atm_row.get("call_iv") or 0) / 100.0
    atm_put_iv  = (atm_row.get("put_iv")  or 0) / 100.0
    atm_iv      = (atm_call_iv + atm_put_iv) / 2 if atm_call_iv and atm_put_iv else max(atm_call_iv, atm_put_iv)

    # IV skew: OTM put IV vs OTM call IV (skew = put premium)
    otm_put_strike  = max((k for k in all_strikes if k < spot), default=atm_strike)
    otm_call_strike = min((k for k in all_strikes if k > spot), default=atm_strike)
    otm_put_row  = next((o for o in options if o["strike"] == otm_put_strike), {})
    otm_call_row = next((o for o in options if o["strike"] == otm_call_strike), {})
    otm_put_iv   = (otm_put_row.get("put_iv")   or 0) / 100.0
    otm_call_iv  = (otm_call_row.get("call_iv") or 0) / 100.0
    skew = round(otm_put_iv - otm_call_iv, 4) if otm_put_iv and otm_call_iv else None

    # All expiry IVs for term structure
    all_options    = chain_data.get("options", [])
    expiry_dates   = chain_data.get("expiry_dates", [])
    term_structure = []
    for exp in expiry_dates[:4]:  # first 4 expiries
        exp_opts = [o for o in all_options if o.get("expiry", "") == exp]
        if not exp_opts:
            continue
        exp_atm = min(exp_opts, key=lambda o: abs(o["strike"] - spot))
        exp_iv  = (exp_atm.get("call_iv") or 0) / 100.0
        term_structure.append({"expiry": exp, "atm_iv": round(exp_iv, 4)})

    # Term structure shape
    ts_shape = "unavailable"
    if len(term_structure) >= 2:
        if term_structure[0]["atm_iv"] < term_structure[-1]["atm_iv"]:
            ts_shape = "contango"           # near IV < far IV (normal)
        elif term_structure[0]["atm_iv"] > term_structure[-1]["atm_iv"]:
            ts_shape = "backwardation"      # near IV > far IV (stress/event)
        else:
            ts_shape = "flat"

    # Regime classification
    if atm_iv == 0:
        regime = "unavailable"
    elif atm_iv < 0.10:
        regime = "compressed"
    elif atm_iv < 0.18:
        regime = "normal"
    elif atm_iv < 0.28:
        regime = "elevated"
    else:
        regime = "stressed"

    # Rough HV proxy: use realized vol estimate as ATM_IV * 0.85 (common empirical ratio)
    hv_proxy     = round(atm_iv * 0.85, 4) if atm_iv else None
    iv_hv_ratio  = round(atm_iv / hv_proxy, 3) if hv_proxy and hv_proxy > 0 else None

    return {
        "disclaimer":       DISCLAIMER,
        "symbol":           symbol.upper(),
        "spot":             spot,
        "expiry":           expiry_used,
        "atm_iv":           round(atm_iv, 4),
        "atm_iv_pct":       round(atm_iv * 100, 2),
        "hv_proxy":         hv_proxy,
        "hv_proxy_pct":     round(hv_proxy * 100, 2) if hv_proxy else None,
        "iv_hv_ratio":      iv_hv_ratio,
        "skew":             skew,
        "skew_label":       "put_premium" if (skew or 0) > 0.02 else "balanced" if (skew or 0) > -0.02 else "call_premium",
        "vol_regime":       regime,
        "term_structure":   term_structure,
        "term_structure_shape": ts_shape,
        "as_of":            datetime.utcnow().isoformat() + "Z",
        "data_stale":       chain_data.get("_cache_stale", False),
    }
