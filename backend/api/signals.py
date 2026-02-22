"""
Phase 13 — Signal Research API
--------------------------------
Read-only endpoints. Idempotent. Cache-safe. Disclaimer in every response.
No buy/sell/entry/exit logic anywhere in this module.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List
from datetime import datetime
import collections

from backend.services.signals.signal_engine   import compute_all_signals
from backend.services.signals.signal_registry import get_definition, all_signal_ids
from backend.services.signals.signal_schemas  import (
    SignalSummaryResponse, SignalResult, SignalHistoryResponse,
    SignalHistoryEntry, GLOBAL_DISCLAIMER
)

router = APIRouter(prefix="/api/signals", tags=["signals"])

# ── Simple in-process history ring buffer (last 10 snapshots per symbol+signal)
_history: dict[str, collections.deque] = collections.defaultdict(lambda: collections.deque(maxlen=10))


def _store_history(symbol: str, signals: List[SignalResult]):
    ts = datetime.utcnow().isoformat() + "Z"
    for s in signals:
        key = f"{symbol.upper()}::{s.id}"
        _history[key].append(SignalHistoryEntry(
            snapshot_ts=ts, value=s.value, severity=s.severity, confidence=s.confidence,
        ))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=SignalSummaryResponse)
def signals_summary(symbol: str = Query("NIFTY", description="NSE index symbol")):
    """
    Returns all 14 research signals for the given symbol.
    Analytical only — not investment advice.
    """
    try:
        computed = compute_all_signals(symbol.upper())
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Signal computation failed: {e}")

    _store_history(symbol, computed)
    stale = any(s.data_stale for s in computed)

    return SignalSummaryResponse(
        symbol=symbol.upper(),
        disclaimer=GLOBAL_DISCLAIMER,
        computed_at=datetime.utcnow().isoformat() + "Z",
        signals=computed,
        data_stale=stale,
    )


@router.get("/{signal_id}", response_model=SignalResult)
def single_signal(
    signal_id: str,
    symbol:    str = Query("NIFTY", description="NSE index symbol"),
):
    """
    Returns a single signal with full definition context.
    """
    if signal_id not in all_signal_ids():
        raise HTTPException(status_code=404, detail=f"Signal '{signal_id}' not found. Available: {all_signal_ids()}")
    try:
        all_signals = compute_all_signals(symbol.upper())
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Signal computation failed: {e}")

    result = next((s for s in all_signals if s.id == signal_id), None)
    if result is None:
        raise HTTPException(status_code=500, detail="Signal not returned by engine.")

    _store_history(symbol, [result])
    return result


@router.get("/history", response_model=SignalHistoryResponse)
def signal_history(
    signal_id: str = Query(..., description="Signal ID to fetch history for"),
    symbol:    str = Query("NIFTY"),
):
    """
    Returns the last N snapshots of a given signal.
    History is in-process only (resets on server restart). Not persisted.
    """
    if signal_id not in all_signal_ids():
        raise HTTPException(status_code=404, detail=f"Unknown signal: {signal_id}")
    key     = f"{symbol.upper()}::{signal_id}"
    entries = list(_history.get(key, []))
    return SignalHistoryResponse(
        signal_id=signal_id,
        symbol=symbol.upper(),
        disclaimer=GLOBAL_DISCLAIMER,
        history=entries,
    )
