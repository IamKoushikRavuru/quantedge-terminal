"""
Phase 14 — Execution Simulator
--------------------------------
Core simulation engine. Orchestrates:
  1. Market state loading (read-only via data_fetcher)
  2. Greek computation (Black-Scholes only — no ML, no signals)
  3. Risk constraint enforcement
  4. Fill probability estimation
  5. Slippage computation
  6. Latency bucket assignment
  7. Execution trace assembly

All outputs are diagnostic. No P&L. No performance metrics. No trading advice.
"""
import uuid
import math
from datetime import datetime, timezone
from typing import List

from backend.services.data_fetcher            import fetch_option_chain, fetch_spot
from backend.pricing.black_scholes            import black_scholes_greeks
from backend.sandbox.order                    import SandboxOrder
from backend.sandbox.slippage                 import compute_slippage, slippage_components
from backend.sandbox.risk                     import (
    GreeksExposure, RiskViolation,
    run_all_checks,
)
from backend.sandbox.metrics                  import (
    SimulationResult, RiskViolationSchema,
    GreeksExposureSchema, SlippageDetailSchema,
    ExecutionTraceStep, SANDBOX_DISCLAIMER,
)

# ── Constants ───────────────────────────────────────────────────────────────
_RISK_FREE_RATE  = 0.065   # INR risk-free proxy
_LOT_SIZE        = 75      # NIFTY lot size proxy; used for notional calculation
_MIN_FILL_RATIO  = 0.05    # never simulate 0% fill unless rejected


# ── Market state helpers ─────────────────────────────────────────────────────

def _synthetic_market(instrument: str, strike: float, opt_type: str) -> dict:
    """
    Generates a realistic synthetic market state when live data is unavailable.
    Used when NSE is closed or the data fetch fails/times out.
    Marks data as stale so the UI can show appropriate indicators.
    """
    spot_map  = {"NIFTY": 22419.0, "BANKNIFTY": 47538.0, "FINNIFTY": 21184.0}
    spot      = spot_map.get(instrument, 22419.0)
    atm_iv    = 14.8   # VIX proxy
    # Build 5 synthetic strikes around requested strike
    steps = [-200, -100, 0, 100, 200]
    base_k = round(strike / 50) * 50  # round to nearest 50
    opts = []
    for ds in steps:
        k = base_k + ds
        put_iv  = atm_iv + abs(ds) * 0.005   # slight smile
        call_iv = atm_iv + abs(ds) * 0.003
        opts.append({
            "strike": k, "expiry": "27 Feb 2026",
            "call_iv": call_iv, "put_iv": put_iv,
            "call_oi": 50000 - abs(ds) * 100,
            "put_oi":  60000 - abs(ds) * 80,
            "call_volume": 10000, "put_volume": 12000,
            "call_ltp": max(1.0, spot - k if opt_type == "CE" else k - spot + 20),
            "put_ltp":  max(1.0, k - spot if opt_type == "PE" else spot - k + 20),
        })
    return {
        "spot":        spot,
        "options":     opts,
        "all_options": opts,
        "stale":       True,
        "expiry":      "27 Feb 2026",
    }


def _load_market_state(order: SandboxOrder) -> dict:
    """
    Fetch current chain and spot with a 5-second timeout guard.
    Falls back to synthetic data when NSE is closed or unavailable.
    """
    try:
        import threading
        result = {}
        exc    = []

        def _fetch():
            try:
                chain   = fetch_option_chain(order.instrument)
                spot_d  = fetch_spot(order.instrument)
                spot    = spot_d.get("spot") or 0.0
                stale   = chain.get("_cache_stale", False)
                options = chain.get("options", [])
                first_exp   = options[0].get("expiry", "") if options else ""
                exp_options = [o for o in options if o.get("expiry", "") == first_exp]
                result.update({
                    "spot": spot, "options": exp_options,
                    "all_options": options, "stale": stale, "expiry": first_exp,
                })
            except Exception as e:
                exc.append(e)

        t = threading.Thread(target=_fetch, daemon=True)
        t.start()
        t.join(timeout=5.0)

        if not result or exc or not t.is_alive() is False:
            return _synthetic_market(order.instrument, order.strike, order.option_type)

        # Validate result has meaningful data
        if not result.get("spot") or not result.get("options"):
            return _synthetic_market(order.instrument, order.strike, order.option_type)

        return result

    except Exception:
        return _synthetic_market(order.instrument, order.strike, order.option_type)


def _find_option_row(options: list, strike: float, opt_type: str) -> dict:
    """Find the closest matching option row by strike."""
    ot = opt_type.upper()
    rows = [o for o in options if abs(o["strike"] - strike) < 50]
    if not rows:
        rows = options  # fallback: use all
    return min(rows, key=lambda o: abs(o["strike"] - strike)) if rows else {}


def _compute_greeks(spot: float, strike: float, iv: float, opt_type: str) -> GreeksExposure:
    """Compute Black-Scholes Greeks for one option. Returns GreeksExposure."""
    T   = max(7 / 365.0, 0.001)   # minimum 1 week proxy
    r   = _RISK_FREE_RATE
    iv_ = max(iv / 100.0, 0.001)
    ot  = "call" if opt_type == "CE" else "put"
    try:
        g = black_scholes_greeks(spot, strike, T, r, iv_, ot)
        return GreeksExposure(
            delta=g["delta"], gamma=g["gamma"],
            vega=g["vega"],   theta=g["theta"],
        )
    except Exception:
        return GreeksExposure()


def _scale_greeks(g: GreeksExposure, qty: int) -> GreeksExposure:
    """Scale unit Greeks by quantity (signed, per unit)."""
    return GreeksExposure(
        delta=g.delta * qty,
        gamma=g.gamma * qty,
        vega=g.vega   * qty,
        theta=g.theta * qty,
    )


# ── Fill probability estimation ──────────────────────────────────────────────

def _fill_probability(oi: float, quantity: int, order_type: str) -> float:
    """
    Estimates fill probability from OI depth proxy.
    Market orders: base 0.85, reduced by relative size.
    Limit orders:  base 0.60, further reduced by size (queue uncertainty).
    """
    base = 0.85 if order_type == "market" else 0.60
    if oi <= 0:
        return base * 0.5    # no OI data → pessimistic
    depth_ratio = min(quantity / max(oi, 1), 1.0)
    # Logarithmic decay: large orders face lower fill probability
    size_penalty = 0.0
    if depth_ratio > 0.001:
        size_penalty = 0.25 * math.log1p(depth_ratio * 100) / math.log1p(100)
    return max(_MIN_FILL_RATIO, round(base - size_penalty, 4))


def _latency_bucket(order_type: str, oi: float) -> str:
    """Assigns a latency bucket based on order type and OI depth."""
    if order_type == "market":
        if oi > 100_000:
            return "<100ms"
        elif oi > 10_000:
            return "100–250ms"
        else:
            return "250–500ms"
    else:  # limit
        if oi > 50_000:
            return "100–250ms"
        else:
            return "250–500ms"


# ── Execution trace assembly ─────────────────────────────────────────────────

def _build_trace(
    order:       SandboxOrder,
    fill_prob:   float,
    fill_ratio:  float,
    violations:  List[RiskViolation],
    slippage:    float,
    latency:     str,
    status:      str,
) -> List[ExecutionTraceStep]:
    trace = []
    t = 0

    trace.append(ExecutionTraceStep(
        step="ORDER_RECEIVED", timestamp_offset_ms=t, status="info",
        detail=f"Simulated {order.order_type.upper()} order received: {order.instrument} {order.strike} {order.option_type} × {order.quantity}",
    ))
    t += 5

    trace.append(ExecutionTraceStep(
        step="MARKET_STATE_LOADED", timestamp_offset_ms=t, status="info",
        detail="Option chain data loaded from NSE cache.",
    ))
    t += 10

    trace.append(ExecutionTraceStep(
        step="GREEKS_COMPUTED", timestamp_offset_ms=t, status="info",
        detail="Black-Scholes Greeks computed for strike/expiry pair.",
    ))
    t += 8

    # Risk checks
    if violations:
        for v in violations:
            trace.append(ExecutionTraceStep(
                step="RISK_CHECK_FAILED", timestamp_offset_ms=t, status="rejected",
                detail=f"Constraint '{v.constraint}' violated: {v.current_value:.4f} > cap {v.cap:.4f}",
            ))
            t += 3
        trace.append(ExecutionTraceStep(
            step="ORDER_REJECTED", timestamp_offset_ms=t, status="rejected",
            detail=f"Simulation rejected: {len(violations)} constraint violation(s). No fill simulated.",
        ))
        return trace

    trace.append(ExecutionTraceStep(
        step="RISK_CHECKS_PASSED", timestamp_offset_ms=t, status="ok",
        detail=f"All 5 risk constraints within limits.",
    ))
    t += 5

    trace.append(ExecutionTraceStep(
        step="FILL_PROBABILITY", timestamp_offset_ms=t, status="ok" if fill_prob > 0.5 else "warning",
        detail=f"Estimated fill probability: {fill_prob*100:.1f}% based on OI depth and order size.",
    ))
    t += 5

    # Slippage
    trace.append(ExecutionTraceStep(
        step="SLIPPAGE_COMPUTED", timestamp_offset_ms=t, status="ok",
        detail=f"Deterministic slippage: ₹{slippage:.3f}/unit (spread + vol + size components).",
    ))
    t += 5

    # Latency
    trace.append(ExecutionTraceStep(
        step="LATENCY_ASSIGNED", timestamp_offset_ms=t, status="info",
        detail=f"Simulated execution latency bucket: {latency}.",
    ))
    t += int(latency.split("ms")[0].replace("<", "").replace(">", "").replace("–", "").strip()[:3]) if "ms" in latency else 100

    # Fill outcome
    if status == "FILLED":
        trace.append(ExecutionTraceStep(
            step="FULL_FILL", timestamp_offset_ms=t, status="ok",
            detail=f"Full fill simulated: {order.quantity}/{order.quantity} units.",
        ))
    elif status == "PARTIAL_FILL":
        trace.append(ExecutionTraceStep(
            step="PARTIAL_FILL", timestamp_offset_ms=t, status="warning",
            detail=f"Partial fill simulated: {int(order.quantity * fill_ratio)}/{order.quantity} units. Remaining quantity not filled.",
        ))
    elif status == "LIMIT_NOT_MET":
        trace.append(ExecutionTraceStep(
            step="LIMIT_NOT_MET", timestamp_offset_ms=t, status="warning",
            detail=f"Limit price condition not met at current market price. Order remains open (simulated).",
        ))

    return trace


# ── Master simulate function ─────────────────────────────────────────────────

def simulate_order(order: SandboxOrder) -> SimulationResult:
    """
    Runs the full execution simulation for a SandboxOrder.
    Returns a SimulationResult with diagnostic outputs only.
    """
    now        = datetime.now(timezone.utc).isoformat()
    order_id   = str(uuid.uuid4())
    trace: List[ExecutionTraceStep] = []

    # ── Step 1: Load market state
    mkt = _load_market_state(order)
    spot      = mkt["spot"] or 22000.0  # fallback
    options   = mkt["options"]

    # ── Step 2: Find option row
    row     = _find_option_row(options, order.strike, order.option_type)
    iv_key  = "call_iv" if order.option_type == "CE" else "put_iv"
    iv      = row.get(iv_key) or 15.0   # fallback to 15% ATM IV
    oi      = (row.get("call_oi") if order.option_type == "CE" else row.get("put_oi")) or 0
    total_oi = sum((o.get("call_oi") or 0) + (o.get("put_oi") or 0) for o in options)
    mid_price = (row.get("call_ltp") if order.option_type == "CE" else row.get("put_ltp")) or (spot * 0.01)

    # ── Step 3: Compute Greeks (before)
    unit_greeks_before = _compute_greeks(spot, order.strike, iv, order.option_type)
    # "before" represents existing exposure — start from zero for single-order sandbox
    exposure_before = GreeksExposure()
    scaled_greeks   = _scale_greeks(unit_greeks_before, order.quantity)
    exposure_after  = GreeksExposure(
        delta=exposure_before.delta + scaled_greeks.delta,
        gamma=exposure_before.gamma + scaled_greeks.gamma,
        vega= exposure_before.vega  + scaled_greeks.vega,
        theta=exposure_before.theta + scaled_greeks.theta,
    )

    # ── Step 4: Risk checks
    violations: List[RiskViolation] = run_all_checks(
        greeks_after=exposure_after,
        spot=spot,
        quantity=order.quantity,
        order_oi=float(oi),
        total_oi=float(total_oi),
        delta_cap=order.delta_cap,
        vega_cap=order.vega_cap,
        gamma_cap=order.gamma_cap,
        notional_cap=order.notional_cap,
    )

    if violations:
        trace = _build_trace(order, 0.0, 0.0, violations, 0.0, "N/A", "REJECTED")
        return SimulationResult(
            order_id=order_id,
            status="REJECTED",
            fill_ratio=0.0,
            filled_quantity=0,
            avg_slippage=0.0,
            slippage_detail=SlippageDetailSchema(spread_component=0, size_component=0, total_slippage=0, order_type_factor=1.0),
            latency_bucket="N/A (rejected)",
            exposure_before=GreeksExposureSchema(**exposure_before.as_dict()),
            exposure_after=GreeksExposureSchema(**exposure_before.as_dict()),  # unchanged — rejected
            violations=[RiskViolationSchema(**v.as_dict()) for v in violations],
            execution_trace=trace,
            fill_probability=0.0,
            oi_depth_proxy=float(oi),
            disclaimer=SANDBOX_DISCLAIMER,
            simulated_at=now,
        )

    # ── Step 5: Fill probability + partial fill
    fill_prob = _fill_probability(float(oi), order.quantity, order.order_type)

    # Check limit price feasibility
    if order.order_type == "limit" and order.limit_price is not None:
        if order.limit_price < mid_price * 0.90 or order.limit_price > mid_price * 1.10:
            # Limit too far from market — simulate as not met
            trace = _build_trace(order, fill_prob, 0.0, [], 0.0, _latency_bucket(order.order_type, oi), "LIMIT_NOT_MET")
            return SimulationResult(
                order_id=order_id,
                status="LIMIT_NOT_MET",
                fill_ratio=0.0,
                filled_quantity=0,
                avg_slippage=0.0,
                slippage_detail=SlippageDetailSchema(spread_component=0, size_component=0, total_slippage=0, order_type_factor=0.30),
                latency_bucket=_latency_bucket(order.order_type, float(oi)),
                exposure_before=GreeksExposureSchema(**exposure_before.as_dict()),
                exposure_after=GreeksExposureSchema(**exposure_before.as_dict()),
                violations=[],
                execution_trace=trace,
                fill_probability=fill_prob,
                oi_depth_proxy=float(oi),
                disclaimer=SANDBOX_DISCLAIMER,
                simulated_at=now,
            )

    # Determine actual fill ratio
    fill_ratio    = fill_prob
    filled_qty    = int(math.floor(order.quantity * fill_ratio))
    status        = "FILLED" if fill_ratio >= 0.95 else "PARTIAL_FILL"

    # ── Step 6: Slippage
    slippage       = compute_slippage(mid_price, iv, order.quantity, order.order_type)
    slip_detail    = slippage_components(mid_price, iv, order.quantity, order.order_type)
    latency        = _latency_bucket(order.order_type, float(oi))

    # Recompute exposure_after based on actual filled quantity
    scaled_actual = _scale_greeks(unit_greeks_before, filled_qty)
    exposure_after_actual = GreeksExposure(
        delta=exposure_before.delta + scaled_actual.delta,
        gamma=exposure_before.gamma + scaled_actual.gamma,
        vega= exposure_before.vega  + scaled_actual.vega,
        theta=exposure_before.theta + scaled_actual.theta,
    )

    trace = _build_trace(order, fill_prob, fill_ratio, [], slippage, latency, status)

    return SimulationResult(
        order_id=order_id,
        status=status,
        fill_ratio=round(fill_ratio, 4),
        filled_quantity=filled_qty,
        avg_slippage=slippage,
        slippage_detail=SlippageDetailSchema(**slip_detail),
        latency_bucket=latency,
        exposure_before=GreeksExposureSchema(**exposure_before.as_dict()),
        exposure_after=GreeksExposureSchema(**exposure_after_actual.as_dict()),
        violations=[],
        execution_trace=trace,
        fill_probability=fill_prob,
        oi_depth_proxy=float(oi),
        disclaimer=SANDBOX_DISCLAIMER,
        simulated_at=now,
    )
