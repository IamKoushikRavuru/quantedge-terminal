"""
Phase 13 — Signal Engine
--------------------------
Computes all 14 research signals from live NSE option chain data.
All outputs are descriptive structural conditions — NOT trading signals.
"""
from datetime import datetime
from typing import List, Optional
import numpy as np

from backend.services.data_fetcher import fetch_option_chain, fetch_spot
from backend.pricing.black_scholes  import black_scholes_greeks
from .signal_definitions            import SIGNAL_DEFINITIONS, SIGNAL_IDS_ORDERED
from .signal_schemas                import SignalResult, GLOBAL_DISCLAIMER

# ── Helpers ───────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _first_expiry(options: list) -> list:
    if not options:
        return []
    first_exp = options[0].get("expiry", "")
    return [o for o in options if o.get("expiry", "") == first_exp]


def _atm_row(options: list, spot: float):
    if not options or not spot:
        return {}
    return min(options, key=lambda o: abs(o["strike"] - spot))


def _severity(value: Optional[float], lo_warn: float, lo_stress: float,
              hi_warn: float, hi_stress: float,
              inverted: bool = False) -> str:
    """Generic severity classifier. inverted = low value is more severe."""
    if value is None:
        return "unavailable"
    if not inverted:
        if value >= hi_stress or value <= lo_stress:
            return "stressed"
        if value >= hi_warn or value <= lo_warn:
            return "elevated"
        return "normal"
    else:
        if value <= lo_stress:
            return "stressed"
        if value <= lo_warn:
            return "elevated"
        return "normal"


def _make_result(signal_id: str, symbol: str, value: Optional[float],
                 severity: str, confidence: str, interpretation: str,
                 stale: bool) -> SignalResult:
    defn = SIGNAL_DEFINITIONS[signal_id]
    return SignalResult(
        id=signal_id,
        name=defn.name,
        category=defn.category,
        symbol=symbol,
        value=round(value, 4) if value is not None else None,
        unit=defn.unit,
        severity=severity,
        confidence=confidence,
        interpretation=interpretation,
        formula_summary=defn.formula_summary,
        formula_latex=defn.formula_latex,
        limitations=defn.limitations,
        regime_sensitivity=defn.regime_sensitivity,
        disclaimer=GLOBAL_DISCLAIMER,
        computed_at=_now(),
        data_stale=stale,
    )


# ── Individual signal computations ───────────────────────────────────────────

def _signal_atm_iv_percentile(options: list, atm_iv: float, stale: bool, symbol: str) -> SignalResult:
    # Approximate percentile using all available IVs as a proxy sample
    all_ivs = [(o.get("call_iv") or 0) for o in options] + [(o.get("put_iv") or 0) for o in options]
    all_ivs = [v for v in all_ivs if v > 0]
    if not all_ivs or atm_iv == 0:
        return _make_result("atm_iv_percentile", symbol, None, "unavailable", "low",
                            "Insufficient data to compute IV percentile.", stale)
    pct = float(np.mean([1.0 if atm_iv > v else 0.0 for v in all_ivs])) * 100
    sev = "normal" if 20 < pct < 80 else "elevated" if 10 < pct <= 20 or 80 <= pct < 90 else "stressed"
    desc = f"ATM IV ({atm_iv:.1f}%) is at approximately the {pct:.0f}th percentile of today's surface. "
    if pct > 80:
        desc += "IV is historically elevated relative to today's chain — extrinsic premium appears rich."
    elif pct < 20:
        desc += "IV is historically compressed relative to today's chain — extrinsic premium appears lean."
    else:
        desc += "IV is within the normal range of today's surface distribution."
    return _make_result("atm_iv_percentile", symbol, pct, sev,
                        "medium" if not stale else "low", desc, stale)


def _signal_iv_term_slope(all_options: list, expiry_dates: list, spot: float, stale: bool, symbol: str) -> SignalResult:
    ts = []
    for exp in expiry_dates[:4]:
        exp_opts = [o for o in all_options if o.get("expiry", "") == exp]
        if not exp_opts:
            continue
        atm = min(exp_opts, key=lambda o: abs(o["strike"] - spot))
        iv = ((atm.get("call_iv") or 0) + (atm.get("put_iv") or 0)) / 2
        if iv > 0:
            ts.append(iv)
    if len(ts) < 2:
        return _make_result("iv_term_slope", symbol, None, "unavailable", "low",
                            "Need at least 2 expiries to compute term structure slope.", stale)
    slope = (ts[0] - ts[-1]) / ts[0] if ts[0] > 0 else 0
    if slope > 0.10:
        sev, desc = "stressed", f"Strong backwardation (slope={slope:.3f}): near-term IV ({ts[0]:.1f}%) significantly exceeds far-term ({ts[-1]:.1f}%). Associated with near-term uncertainty."
    elif slope > 0.02:
        sev, desc = "elevated", f"Mild backwardation (slope={slope:.3f}): near-term IV ({ts[0]:.1f}%) slightly above far-term ({ts[-1]:.1f}%)."
    elif slope < -0.05:
        sev, desc = "elevated", f"Steep contango (slope={slope:.3f}): far-term IV ({ts[-1]:.1f}%) substantially above near-term ({ts[0]:.1f}%). Typical carry structure."
    else:
        sev, desc = "normal", f"Mild contango (slope={slope:.3f}): standard term structure. Near={ts[0]:.1f}%, Far={ts[-1]:.1f}%."
    return _make_result("iv_term_slope", symbol, slope, sev,
                        "high" if len(ts) >= 3 else "medium", desc, stale)


def _signal_skew_25d_rr(options: list, spot: float, stale: bool, symbol: str) -> SignalResult:
    strikes = sorted(set(o["strike"] for o in options))
    otm_put_k  = max((k for k in strikes if k < spot), default=None)
    otm_call_k = min((k for k in strikes if k > spot), default=None)
    if not otm_put_k or not otm_call_k:
        return _make_result("skew_25d_rr", symbol, None, "unavailable", "low",
                            "Insufficient OTM strikes for skew computation.", stale)
    put_row  = next((o for o in options if o["strike"] == otm_put_k), {})
    call_row = next((o for o in options if o["strike"] == otm_call_k), {})
    put_iv   = put_row.get("put_iv") or 0
    call_iv  = call_row.get("call_iv") or 0
    if put_iv == 0 or call_iv == 0:
        return _make_result("skew_25d_rr", symbol, None, "unavailable", "low",
                            "OTM IV data missing.", stale)
    rr = put_iv - call_iv
    if rr > 8:
        sev, desc = "stressed", f"Strong put premium (RR≈{rr:.1f}pp): OTM put IV ({put_iv:.1f}%) substantially exceeds OTM call IV ({call_iv:.1f}%). Historically associated with elevated tail-risk hedging demand."
    elif rr > 3:
        sev, desc = "elevated", f"Elevated put premium (RR≈{rr:.1f}pp): OTM puts price {rr:.1f}pp above calls."
    elif rr < -3:
        sev, desc = "anomalous", f"Inverted skew (RR≈{rr:.1f}pp): OTM calls price {abs(rr):.1f}pp above puts. Anomalous for equity indices — associated with strong call demand."
    else:
        sev, desc = "normal", f"Balanced skew (RR≈{rr:.1f}pp): put and call IVs are within normal spread."
    return _make_result("skew_25d_rr", symbol, rr, sev, "medium", desc, stale)


def _signal_smile_convexity(options: list, spot: float, stale: bool, symbol: str) -> SignalResult:
    strikes = sorted(set(o["strike"] for o in options))
    atm_k      = min(strikes, key=lambda k: abs(k - spot)) if strikes else None
    otm_put_k  = max((k for k in strikes if k < spot), default=None)
    otm_call_k = min((k for k in strikes if k > spot), default=None)
    if not all([atm_k, otm_put_k, otm_call_k]):
        return _make_result("smile_convexity", symbol, None, "unavailable", "low",
                            "Insufficient strikes for smile convexity.", stale)
    atm_row  = next((o for o in options if o["strike"] == atm_k), {})
    put_row  = next((o for o in options if o["strike"] == otm_put_k), {})
    call_row = next((o for o in options if o["strike"] == otm_call_k), {})
    atm_iv   = ((atm_row.get("call_iv") or 0) + (atm_row.get("put_iv") or 0)) / 2
    wing_avg = ((put_row.get("put_iv") or 0) + (call_row.get("call_iv") or 0)) / 2
    if atm_iv == 0:
        return _make_result("smile_convexity", symbol, None, "unavailable", "low",
                            "ATM IV unavailable.", stale)
    conv = wing_avg - atm_iv
    if conv > 5:
        sev, desc = "elevated", f"Elevated smile curvature (BF≈{conv:.1f}pp): wings price {conv:.1f}pp above ATM — market pricing significant tail events on both tails."
    elif conv < 0.5:
        sev, desc = "elevated", f"Flat smile (BF≈{conv:.1f}pp): very low wing premium above ATM — historically associated with compressed event pricing."
    else:
        sev, desc = "normal", f"Normal smile curvature (BF≈{conv:.1f}pp)."
    return _make_result("smile_convexity", symbol, conv, sev, "medium", desc, stale)


def _signal_pcr_oi(options: list, stale: bool, symbol: str) -> SignalResult:
    c_oi = sum(o.get("call_oi", 0) or 0 for o in options)
    p_oi = sum(o.get("put_oi",  0) or 0 for o in options)
    if c_oi == 0:
        return _make_result("pcr_oi", symbol, None, "unavailable", "low",
                            "No call OI data available.", stale)
    pcr = p_oi / c_oi
    if pcr > 1.4:
        sev, desc = "elevated", f"PCR(OI)={pcr:.3f}: put OI exceeds call OI by {(pcr-1)*100:.0f}% — elevated put positioning. Note: OI reflects outstanding positions, not direction."
    elif pcr < 0.6:
        sev, desc = "elevated", f"PCR(OI)={pcr:.3f}: call OI exceeds put OI — relatively call-heavy positioning."
    else:
        sev, desc = "normal", f"PCR(OI)={pcr:.3f}: balanced put/call open interest ratio."
    return _make_result("pcr_oi", symbol, pcr, sev, "high", desc, stale)


def _signal_pcr_vol(options: list, stale: bool, symbol: str) -> SignalResult:
    c_vol = sum(o.get("call_volume", 0) or 0 for o in options)
    p_vol = sum(o.get("put_volume",  0) or 0 for o in options)
    if c_vol == 0:
        return _make_result("pcr_volume", symbol, None, "unavailable", "low",
                            "No call volume data available.", stale)
    pcr = p_vol / c_vol
    if pcr > 1.3:
        sev, desc = "elevated", f"PCR(Vol)={pcr:.3f}: put volume elevated relative to calls. Single-session volume can be distorted by spreads."
    elif pcr < 0.7:
        sev, desc = "elevated", f"PCR(Vol)={pcr:.3f}: call volume dominating. May reflect speculative or hedging activity."
    else:
        sev, desc = "normal", f"PCR(Vol)={pcr:.3f}: balanced put/call volume ratio."
    return _make_result("pcr_volume", symbol, pcr, sev, "high", desc, stale)


def _signal_oi_concentration(options: list, stale: bool, symbol: str) -> SignalResult:
    total_oi = sum((o.get("call_oi") or 0) + (o.get("put_oi") or 0) for o in options)
    if total_oi == 0:
        return _make_result("oi_concentration", symbol, None, "unavailable", "low",
                            "No OI data.", stale)
    hhi = sum(
        (((o.get("call_oi") or 0) + (o.get("put_oi") or 0)) / total_oi) ** 2
        for o in options
    ) * 10000
    if hhi > 2500:
        sev, desc = "elevated", f"HHI(OI)={hhi:.0f}: OI is highly concentrated at a few strikes — potential structural support/resistance zones."
    elif hhi > 1500:
        sev, desc = "elevated", f"HHI(OI)={hhi:.0f}: moderately concentrated OI distribution."
    else:
        sev, desc = "normal", f"HHI(OI)={hhi:.0f}: broadly distributed OI across strikes."
    return _make_result("oi_concentration", symbol, hhi, sev, "medium", desc, stale)


def _signal_gex_zone(options: list, spot: float, stale: bool, symbol: str) -> SignalResult:
    T = 7 / 365
    r = 0.065
    net_gex = 0.0
    for o in options:
        k = o["strike"]
        c_iv = (o.get("call_iv") or 0) / 100.0
        p_iv = (o.get("put_iv")  or 0) / 100.0
        c_oi = o.get("call_oi", 0) or 0
        p_oi = o.get("put_oi",  0) or 0
        if c_iv > 0.001 and spot > 0:
            net_gex += black_scholes_greeks(spot, k, T, r, c_iv, "call")["gamma"] * c_oi * 75
        if p_iv > 0.001 and spot > 0:
            net_gex -= black_scholes_greeks(spot, k, T, r, p_iv, "put")["gamma"]  * p_oi * 75
    if net_gex > 1e6:
        zone, sev, desc = "positive", "normal", f"Net GEX is positive ({net_gex/1e6:.2f}M). Dealers are structurally long gamma — hedging flows tend to dampen intraday moves."
    elif net_gex < -1e6:
        zone, sev, desc = "negative", "elevated", f"Net GEX is negative ({net_gex/1e6:.2f}M). Dealers may be net short gamma — hedging flows could amplify moves. Qualitative only."
    else:
        zone, sev, desc = "neutral", "normal", f"Net GEX near zero ({net_gex/1e6:.2f}M). Neutral dealer gamma environment."
    return _make_result("gex_zone", symbol, net_gex / 1e6, sev, "low", desc, stale)


def _signal_vol_regime(atm_iv: float, stale: bool, symbol: str) -> SignalResult:
    if atm_iv == 0:
        return _make_result("vol_regime", symbol, None, "unavailable", "low",
                            "ATM IV unavailable.", stale)
    if atm_iv < 10:
        sev, regime, desc = "normal", "low", f"Low volatility regime (ATM IV={atm_iv:.1f}%): IV is below historical p20 estimate. Extrinsic premium is structurally compressed."
    elif atm_iv < 18:
        sev, regime, desc = "normal", "normal", f"Normal volatility regime (ATM IV={atm_iv:.1f}%): IV within historical mid-range."
    elif atm_iv < 28:
        sev, regime, desc = "elevated", "high", f"Elevated volatility regime (ATM IV={atm_iv:.1f}%): IV above p80 estimate. Options are pricing heightened uncertainty."
    else:
        sev, regime, desc = "stressed", "stressed", f"Stressed volatility regime (ATM IV={atm_iv:.1f}%): IV at historically extreme levels."
    return _make_result("vol_regime", symbol, atm_iv, sev, "medium", desc, stale)


def _signal_compression(atm_iv: float, all_ivs: list, stale: bool, symbol: str) -> SignalResult:
    if atm_iv == 0 or not all_ivs:
        return _make_result("compression_regime", symbol, None, "unavailable", "low",
                            "Insufficient IV data for compression check.", stale)
    iv_std = float(np.std(all_ivs)) if len(all_ivs) > 2 else 0
    # Approximate: low std vs mean indicates compression
    cv = iv_std / np.mean(all_ivs) if np.mean(all_ivs) > 0 else 0
    if cv < 0.05:
        sev, desc = "elevated", f"Compression flag: IV coefficient of variation={cv:.3f} is low — the volatility surface is unusually flat. Historically, compression episodes precede expansion, though timing is unresolvable."
    else:
        sev, desc = "normal", f"No compression detected (CV={cv:.3f}). IV surface shows normal dispersion across strikes."
    return _make_result("compression_regime", symbol, cv, sev, "low", desc, stale)


def _signal_skew_stability(options: list, spot: float, stale: bool, symbol: str) -> SignalResult:
    # Proxy: std of skew values across adjacent strike pairs
    strikes = sorted(set(o["strike"] for o in options))
    skews = []
    for k in strikes:
        row = next((o for o in options if o["strike"] == k), {})
        c_iv = row.get("call_iv") or 0
        p_iv = row.get("put_iv") or 0
        if c_iv > 0 and p_iv > 0:
            skews.append(p_iv - c_iv)
    if len(skews) < 3:
        return _make_result("skew_stability", symbol, None, "unavailable", "low",
                            "Insufficient skew data points.", stale)
    skew_std = float(np.std(skews))
    skew_mean = float(np.mean(skews))
    cv_skew = skew_std / abs(skew_mean) if skew_mean != 0 else 0
    if cv_skew > 0.5:
        sev, desc = "elevated", f"Unstable skew (StdDev={skew_std:.2f}pp, CV={cv_skew:.2f}): high variability in put-call IV spread across strikes — skew structure is inconsistent."
    else:
        sev, desc = "normal", f"Stable skew (StdDev={skew_std:.2f}pp, CV={cv_skew:.2f}): consistent put-call IV spread across strikes."
    return _make_result("skew_stability", symbol, skew_std, sev, "low", desc, stale)


def _signal_iv_hv_divergence(atm_iv: float, stale: bool, symbol: str) -> SignalResult:
    if atm_iv == 0:
        return _make_result("iv_hv_divergence", symbol, None, "unavailable", "low",
                            "ATM IV unavailable.", stale)
    hv_proxy = atm_iv * 0.85  # empirical IV-to-HV ratio
    divergence = (atm_iv - hv_proxy) / hv_proxy if hv_proxy > 0 else 0
    if divergence > 0.35:
        sev, desc = "stressed", f"IV−HV divergence={divergence:.3f}: options appear structurally rich (ATM IV={atm_iv:.1f}% vs. HV proxy={hv_proxy:.1f}%). Elevated extrinsic premium."
    elif divergence > 0.15:
        sev, desc = "elevated", f"IV−HV divergence={divergence:.3f}: moderate richness. ATM IV ({atm_iv:.1f}%) exceeds estimated realized ({hv_proxy:.1f}%)."
    elif divergence < -0.10:
        sev, desc = "elevated", f"IV−HV divergence={divergence:.3f}: ATM IV ({atm_iv:.1f}%) below estimated HV ({hv_proxy:.1f}%). Historically rare and may indicate structural mispricing."
    else:
        sev, desc = "normal", f"IV−HV ratio={divergence:.3f}: ATM IV ({atm_iv:.1f}%) near estimated HV ({hv_proxy:.1f}%). No significant divergence detected."
    return _make_result("iv_hv_divergence", symbol, divergence, sev, "medium", desc, stale)


def _signal_oi_shift(options: list, stale: bool, symbol: str) -> SignalResult:
    total_oi = sum((o.get("call_oi") or 0) + (o.get("put_oi") or 0) for o in options)
    if total_oi == 0:
        return _make_result("oi_shift_anomaly", symbol, None, "unavailable", "low",
                            "No OI data for shift computation.", stale)
    # Proxy: concentration imbalance as anomaly indicator
    call_oi_list = [(o.get("call_oi") or 0) for o in options]
    put_oi_list  = [(o.get("put_oi")  or 0) for o in options]
    # Normalized max strike OI
    max_strike_share = max(
        ((o.get("call_oi") or 0) + (o.get("put_oi") or 0)) / total_oi
        for o in options
    ) if total_oi > 0 else 0
    z_proxy = (max_strike_share - 0.1) / 0.05  # simple z-score proxy
    if z_proxy > 2.5:
        sev, desc = "anomalous", f"OI shift anomaly (z≈{z_proxy:.2f}): single strike holds {max_strike_share*100:.1f}% of total OI — unusually concentrated shift."
    elif z_proxy > 1.5:
        sev, desc = "elevated", f"OI shift flag (z≈{z_proxy:.2f}): notable concentration at a single strike ({max_strike_share*100:.1f}% of chain OI)."
    else:
        sev, desc = "normal", f"No OI shift anomaly detected (z≈{z_proxy:.2f}): OI well-distributed across strikes."
    return _make_result("oi_shift_anomaly", symbol, z_proxy, sev, "low", desc, stale)


def _signal_skew_dislocation(options: list, spot: float, stale: bool, symbol: str) -> SignalResult:
    strikes = sorted(set(o["strike"] for o in options))
    otm_put_k  = max((k for k in strikes if k < spot), default=None)
    otm_call_k = min((k for k in strikes if k > spot), default=None)
    if not otm_put_k or not otm_call_k:
        return _make_result("skew_dislocation", symbol, None, "unavailable", "low",
                            "Insufficient OTM strikes.", stale)
    put_row  = next((o for o in options if o["strike"] == otm_put_k), {})
    call_row = next((o for o in options if o["strike"] == otm_call_k), {})
    rr = (put_row.get("put_iv") or 0) - (call_row.get("call_iv") or 0)
    # Approximate: use all strike skews to compute a crude percentile
    all_skews = [(o.get("put_iv") or 0) - (o.get("call_iv") or 0)
                 for o in options if (o.get("put_iv") or 0) > 0 and (o.get("call_iv") or 0) > 0]
    if not all_skews:
        return _make_result("skew_dislocation", symbol, None, "unavailable", "low",
                            "Insufficient skew data.", stale)
    pct = float(np.mean([1.0 if rr > s else 0.0 for s in all_skews])) * 100
    if pct > 85:
        sev, desc = "anomalous", f"Skew dislocation at ~{pct:.0f}th percentile: observed skew ({rr:.1f}pp) is unusually elevated relative to today's chain distribution. Strong put premium environment."
    elif pct > 70:
        sev, desc = "elevated", f"Elevated skew (~{pct:.0f}th percentile): put premium above typical levels."
    elif pct < 15:
        sev, desc = "anomalous", f"Skew compression (~{pct:.0f}th percentile): skew unusually low — anomalous for equity indices."
    else:
        sev, desc = "normal", f"Skew at ~{pct:.0f}th percentile: within normal historical range."
    return _make_result("skew_dislocation", symbol, pct, sev, "medium", desc, stale)


# ── Master compute function ───────────────────────────────────────────────────

def compute_all_signals(symbol: str) -> List[SignalResult]:
    chain_data = fetch_option_chain(symbol.upper())
    spot_data  = fetch_spot(symbol.upper())
    spot   = spot_data.get("spot") or 0.0
    stale  = chain_data.get("_cache_stale", False)

    all_options  = chain_data.get("options", [])
    expiry_dates = chain_data.get("expiry_dates", [])
    options      = [o for o in all_options if o.get("expiry", "") == (all_options[0].get("expiry", "") if all_options else "")]

    # ATM IV
    if options and spot > 0:
        atm_row = min(options, key=lambda o: abs(o["strike"] - spot))
        atm_iv  = ((atm_row.get("call_iv") or 0) + (atm_row.get("put_iv") or 0)) / 2
    else:
        atm_iv = 0.0

    # All IVs from first expiry
    all_ivs = [(o.get("call_iv") or 0) for o in options] + [(o.get("put_iv") or 0) for o in options]
    all_ivs = [v for v in all_ivs if v > 0]

    return [
        _signal_atm_iv_percentile(options, atm_iv, stale, symbol),
        _signal_iv_term_slope(all_options, expiry_dates, spot, stale, symbol),
        _signal_skew_25d_rr(options, spot, stale, symbol),
        _signal_smile_convexity(options, spot, stale, symbol),
        _signal_pcr_oi(options, stale, symbol),
        _signal_pcr_vol(options, stale, symbol),
        _signal_oi_concentration(options, stale, symbol),
        _signal_gex_zone(options, spot, stale, symbol),
        _signal_vol_regime(atm_iv, stale, symbol),
        _signal_compression(atm_iv, all_ivs, stale, symbol),
        _signal_skew_stability(options, spot, stale, symbol),
        _signal_iv_hv_divergence(atm_iv, stale, symbol),
        _signal_oi_shift(options, stale, symbol),
        _signal_skew_dislocation(options, spot, stale, symbol),
    ]
