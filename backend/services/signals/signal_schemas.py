"""
Phase 13 — Signal Pydantic Schemas
All responses must include 'disclaimer'. Outputs are bounded and descriptive only.
"""
from pydantic import BaseModel
from typing import Literal, List, Optional

GLOBAL_DISCLAIMER = (
    "Analytical Only — Not Investment Advice. "
    "These signals describe statistical market conditions derived from public option chain data. "
    "They do not constitute a recommendation to buy, sell, or hold any instrument. "
    "Past structural conditions carry no guarantee of future outcomes."
)

ALLOWED_CATEGORIES = {
    "vol_structure",
    "positioning",
    "regime",
    "stress_anomaly",
}


class SignalDefinition(BaseModel):
    """Static metadata for one signal type."""
    id:                  str
    name:                str
    category:            Literal["vol_structure", "positioning", "regime", "stress_anomaly"]
    formula_summary:     str   # Human-readable formula
    formula_latex:       str   # LaTeX string for display
    description:         str
    unit:                str
    limitations:         str
    confidence_notes:    str
    regime_sensitivity:  str


class SignalResult(BaseModel):
    """One computed signal instance."""
    id:                  str
    name:                str
    category:            str
    symbol:              str
    value:               Optional[float]
    unit:                str
    severity:            Literal["normal", "elevated", "stressed", "anomalous", "unavailable"]
    confidence:          Literal["low", "medium", "high"]
    interpretation:      str   # descriptive only — no direction
    formula_summary:     str
    formula_latex:       str
    limitations:         str
    regime_sensitivity:  str
    disclaimer:          str   # always the global disclaimer
    computed_at:         str
    data_stale:          bool


class SignalSummaryResponse(BaseModel):
    symbol:      str
    disclaimer:  str
    computed_at: str
    signals:     List[SignalResult]
    data_stale:  bool


class SignalHistoryEntry(BaseModel):
    snapshot_ts: str
    value:       Optional[float]
    severity:    str
    confidence:  str


class SignalHistoryResponse(BaseModel):
    signal_id:   str
    symbol:      str
    disclaimer:  str
    history:     List[SignalHistoryEntry]
