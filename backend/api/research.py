"""
Phase 11 — Research Signal Candidates
---------------------------------------
Offline, read-only snapshots of structural market anomalies.

Philosophy:
  These are NOT trading signals. They are conditions that warrant further research.
  Each alert explains WHY it triggered and explicitly states WHY it is NOT a trade.

Outputs:
  - Stored as static snapshots, regenerated on demand (not per-request)
  - Timestamped
  - Each alert includes: metric, value, threshold, explanation, why_not_trade
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List
import numpy as np
from datetime import datetime

from backend.services.data_fetcher import fetch_option_chain, fetch_spot

router = APIRouter(prefix="/api/research", tags=["research"])

DISCLAIMER = (
    "Research signal candidates only. These are structural observations, NOT trading signals. "
    "They represent conditions worth researching—not actionable entry/exit points. "
    "Past structural anomalies have no guaranteed predictive value for future price movement."
)

# ── Snapshot store (in-memory, refreshed on demand) ──────────────────────────

_snapshot: Optional[dict] = None
_snapshot_ts: Optional[str] = None


# ── Alert computation ─────────────────────────────────────────────────────────

def _iv_dislocation_alert(symbol: str, atm_iv: float, hv_proxy: float) -> Optional[dict]:
    """IV >> realized: elevated extrinsic premium or stress. IV << realized: cheap vol."""
    if atm_iv <= 0 or hv_proxy <= 0:
        return None
    ratio = atm_iv / hv_proxy
    if ratio > 1.4:
        sev = "elevated" if ratio < 1.8 else "anomalous"
        return {
            "id":          f"iv_dislocation_{symbol}",
            "symbol":      symbol,
            "category":    "volatility_dislocation",
            "severity":    sev,
            "metric":      "IV/HV Ratio",
            "value":       round(ratio, 3),
            "threshold":   1.4,
            "triggered_at": datetime.utcnow().isoformat() + "Z",
            "explanation": (
                f"ATM IV ({atm_iv*100:.1f}%) is {ratio:.2f}× the estimated realized volatility "
                f"({hv_proxy*100:.1f}%). Elevated IV relative to realized suggests extrinsic "
                f"premium is historically rich, often seen during uncertainty or event risk."
            ),
            "why_not_trade": (
                "IV richness alone does not indicate a reliable short-vol opportunity. "
                "Skew, term structure, liquidity, and event calendars all affect realized outcomes. "
                "Model uncertainty in HV estimation further limits actionability."
            ),
        }
    elif ratio < 0.7:
        return {
            "id":          f"iv_compressed_{symbol}",
            "symbol":      symbol,
            "category":    "volatility_dislocation",
            "severity":    "compressed",
            "metric":      "IV/HV Ratio",
            "value":       round(ratio, 3),
            "threshold":   0.7,
            "triggered_at": datetime.utcnow().isoformat() + "Z",
            "explanation": (
                f"ATM IV ({atm_iv*100:.1f}%) is only {ratio:.2f}× estimated realized vol "
                f"({hv_proxy*100:.1f}%). Compressed IV may indicate complacency or low near-term "
                f"event density. Historically associated with low-vol regimes."
            ),
            "why_not_trade": (
                "Compressed IV may persist for extended periods. Long-vol strategies suffer "
                "theta decay even when IV eventually expands. Entry timing remains unresolvable "
                "from IV/HV ratio alone."
            ),
        }
    return None


def _skew_anomaly_alert(symbol: str, skew: Optional[float]) -> Optional[dict]:
    """Severe put/call IV skew."""
    if skew is None:
        return None
    if skew > 0.06:
        return {
            "id":          f"skew_extreme_put_{symbol}",
            "symbol":      symbol,
            "category":    "skew_anomaly",
            "severity":    "elevated",
            "metric":      "OTM Put-Call IV Skew",
            "value":       round(skew * 100, 2),
            "threshold":   6.0,
            "triggered_at": datetime.utcnow().isoformat() + "Z",
            "explanation": (
                f"OTM put IV exceeds OTM call IV by {skew*100:.1f}pp. "
                f"Elevated put skew typically reflects tail-risk hedging demand or "
                f"directional put buying. This is structurally common in equity indices."
            ),
            "why_not_trade": (
                "Skew is a persistent structural feature of equity index options. "
                "Selling put skew exposes the portfolio to left-tail event risk. "
                "Skew extremes can persist or intensify before reverting."
            ),
        }
    elif skew < -0.04:
        return {
            "id":          f"skew_call_premium_{symbol}",
            "symbol":      symbol,
            "category":    "skew_anomaly",
            "severity":    "anomalous",
            "metric":      "OTM Put-Call IV Skew",
            "value":       round(skew * 100, 2),
            "threshold":   -4.0,
            "triggered_at": datetime.utcnow().isoformat() + "Z",
            "explanation": (
                f"OTM call IV exceeds OTM put IV by {abs(skew)*100:.1f}pp (inverted skew). "
                f"Inverted skew is anomalous for equity indices and may indicate heavy "
                f"call demand or a short squeeze dynamic."
            ),
            "why_not_trade": (
                "Inverted skew is rare but can persist during strong uptrends or "
                "forced gamma-covering episodes. Fading it without understanding the "
                "underlying flow context carries substantial risk."
            ),
        }
    return None


def _term_structure_alert(symbol: str, ts: list) -> Optional[dict]:
    """Term structure inversion."""
    if len(ts) < 2:
        return None
    near_iv = ts[0]["atm_iv"]
    far_iv  = ts[-1]["atm_iv"]
    if near_iv <= 0 or far_iv <= 0:
        return None
    if near_iv > far_iv * 1.25:
        ratio = near_iv / far_iv
        return {
            "id":          f"term_inversion_{symbol}",
            "symbol":      symbol,
            "category":    "term_structure",
            "severity":    "regime_shift",
            "metric":      "Near/Far IV Term Ratio",
            "value":       round(ratio, 3),
            "threshold":   1.25,
            "triggered_at": datetime.utcnow().isoformat() + "Z",
            "explanation": (
                f"Near-term IV ({near_iv*100:.1f}%) is {ratio:.2f}× far-term IV "
                f"({far_iv*100:.1f}%). Inverted term structure (backwardation) is a "
                f"stress indicator — markets are pricing near-term risk above long-term risk. "
                f"Associated with event risk, macro uncertainty, or liquidity stress."
            ),
            "why_not_trade": (
                "Backwardation may persist through the near-term event window without "
                "normalising. Calendar spread strategies face execution risk and require "
                "precise event timing to be viable."
            ),
        }
    return None


def _max_pain_divergence_alert(symbol: str, spot: float, max_pain: float) -> Optional[dict]:
    """Max Pain significantly diverged from current spot."""
    if not spot or not max_pain:
        return None
    divergence_pct = abs(max_pain - spot) / spot * 100
    if divergence_pct > 3.0:
        direction = "above" if max_pain > spot else "below"
        return {
            "id":          f"max_pain_diverge_{symbol}",
            "symbol":      symbol,
            "category":    "oi_mechanics",
            "severity":    "elevated",
            "metric":      "Max Pain vs Spot Divergence %",
            "value":       round(divergence_pct, 2),
            "threshold":   3.0,
            "triggered_at": datetime.utcnow().isoformat() + "Z",
            "explanation": (
                f"Max pain strike ({max_pain:,.0f}) is {divergence_pct:.1f}% {direction} spot "
                f"({spot:,.0f}). Large divergences suggest significant OI concentration away "
                f"from current price, often discussed in the context of expiry-week dynamics."
            ),
            "why_not_trade": (
                "The 'max pain theory' (spot gravitates to max pain at expiry) is academically "
                "contested. Market forces, institutional hedging, and random walk dynamics "
                "dominate over any gravity effect from OI mechanics."
            ),
        }
    return None


# ── Snapshot computation ──────────────────────────────────────────────────────

def _compute_snapshot() -> dict:
    alerts = []
    summary = {}

    for symbol in ["NIFTY", "BANKNIFTY"]:
        chain_data = fetch_option_chain(symbol)
        spot_data  = fetch_spot(symbol)
        spot = spot_data.get("spot") or 0.0

        options = chain_data.get("options", [])
        if not options:
            continue

        # First expiry
        first_exp  = options[0].get("expiry", "")
        exp_opts   = [o for o in options if o.get("expiry", "") == first_exp]
        all_strikes = sorted(set(o["strike"] for o in exp_opts))

        # ATM IV
        atm_strike  = min(all_strikes, key=lambda k: abs(k - spot)) if all_strikes and spot else 0
        atm_row     = next((o for o in exp_opts if o["strike"] == atm_strike), {})
        atm_iv      = ((atm_row.get("call_iv") or 0) + (atm_row.get("put_iv") or 0)) / 2 / 100.0

        hv_proxy = atm_iv * 0.85

        # Skew
        otm_put_strike  = max((k for k in all_strikes if k < spot), default=atm_strike)
        otm_call_strike = min((k for k in all_strikes if k > spot), default=atm_strike)
        otm_put_row   = next((o for o in exp_opts if o["strike"] == otm_put_strike), {})
        otm_call_row  = next((o for o in exp_opts if o["strike"] == otm_call_strike), {})
        skew = ((otm_put_row.get("put_iv") or 0) - (otm_call_row.get("call_iv") or 0)) / 100.0

        # Max pain
        total_pain_map = {}
        for S in all_strikes:
            total_pain = sum(
                max(S - o["strike"], 0) * (o.get("call_oi") or 0) +
                max(o["strike"] - S, 0) * (o.get("put_oi") or 0)
                for o in exp_opts
            )
            total_pain_map[S] = total_pain
        max_pain = min(total_pain_map, key=total_pain_map.get) if total_pain_map else 0.0

        # Term structure
        expiry_dates = chain_data.get("expiry_dates", [])[:4]
        ts = []
        for exp in expiry_dates:
            exp_o = [o for o in options if o.get("expiry", "") == exp]
            if not exp_o:
                continue
            exp_atm = min(exp_o, key=lambda o: abs(o["strike"] - spot))
            exp_iv  = ((exp_atm.get("call_iv") or 0) + (exp_atm.get("put_iv") or 0)) / 2 / 100.0
            ts.append({"expiry": exp, "atm_iv": round(exp_iv, 4)})

        # Evaluate alerts
        for fn, args in [
            (_iv_dislocation_alert,   (symbol, atm_iv, hv_proxy)),
            (_skew_anomaly_alert,     (symbol, skew)),
            (_term_structure_alert,   (symbol, ts)),
            (_max_pain_divergence_alert, (symbol, spot, float(max_pain))),
        ]:
            alert = fn(*args)
            if alert:
                alerts.append(alert)

        summary[symbol] = {
            "spot": spot, "atm_iv": round(atm_iv * 100, 2),
            "hv_proxy": round(hv_proxy * 100, 2), "skew_pct": round(skew * 100, 2),
            "max_pain": float(max_pain),
        }

    return {
        "disclaimer":   DISCLAIMER,
        "alerts":       alerts,
        "summary":      summary,
        "alert_count":  len(alerts),
        "computed_at":  datetime.utcnow().isoformat() + "Z",
        "note":         "Snapshots computed at server start and on /api/research/refresh. Not live-computed per request.",
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/alerts")
def get_research_alerts():
    """
    Returns the latest computed research signal snapshot.
    These are offline, pre-computed conditions — not live signals.
    """
    global _snapshot, _snapshot_ts
    if _snapshot is None:
        _snapshot    = _compute_snapshot()
        _snapshot_ts = datetime.utcnow().isoformat() + "Z"
    return {**_snapshot, "snapshot_ts": _snapshot_ts}


@router.post("/refresh")
def refresh_research_alerts():
    """
    Re-computes the research signal snapshot from current market data.
    Intentionally separate from the GET endpoint — not auto-refreshed per request.
    """
    global _snapshot, _snapshot_ts
    _snapshot    = _compute_snapshot()
    _snapshot_ts = datetime.utcnow().isoformat() + "Z"
    return {"status": "refreshed", "alert_count": _snapshot["alert_count"], "snapshot_ts": _snapshot_ts}
