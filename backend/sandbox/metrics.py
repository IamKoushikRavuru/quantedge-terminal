"""
Phase 14 — Simulation Result Schemas
--------------------------------------
Pydantic models for all sandbox outputs.
FORBIDDEN fields: pnl, profit, loss, roi, return, win_rate, equity, performance.
All outputs are diagnostic — execution mechanics and risk exposure only.
"""
from pydantic import BaseModel
from typing import Literal, List, Optional

SANDBOX_DISCLAIMER = (
    "This module simulates order mechanics for research purposes only. "
    "No trading, advice, or performance evaluation is provided or implied. "
    "Simulation outputs describe execution behaviour under hypothetical conditions — "
    "not actual or expected financial outcomes."
)

LATENCY_BUCKET_LABELS = {
    "market": ["<100ms", "100–250ms", "250–500ms"],
    "limit":  ["100–250ms", "250–500ms", ">500ms"],
}


class RiskViolationSchema(BaseModel):
    constraint:    str
    current_value: float
    cap:           float
    explanation:   str


class GreeksExposureSchema(BaseModel):
    delta: float
    gamma: float
    vega:  float
    theta: float


class SlippageDetailSchema(BaseModel):
    spread_component: float
    size_component:   float
    total_slippage:   float
    order_type_factor: float


class ExecutionTraceStep(BaseModel):
    step:                str
    timestamp_offset_ms: int
    status:              Literal["ok", "warning", "rejected", "info"]
    detail:              str


class SimulationResult(BaseModel):
    order_id:         str
    status:           Literal["FILLED", "PARTIAL_FILL", "REJECTED", "LIMIT_NOT_MET"]
    fill_ratio:       float
    filled_quantity:  int
    avg_slippage:     float
    slippage_detail:  SlippageDetailSchema
    latency_bucket:   str
    exposure_before:  GreeksExposureSchema
    exposure_after:   GreeksExposureSchema
    violations:       List[RiskViolationSchema]
    execution_trace:  List[ExecutionTraceStep]
    fill_probability: float
    oi_depth_proxy:   float
    disclaimer:       str
    simulated_at:     str


class ConstraintDefinition(BaseModel):
    name:        str
    cap:         float
    unit:        str
    description: str
    adjustable:  bool


class ConstraintCatalog(BaseModel):
    constraints: List[ConstraintDefinition]
    disclaimer:  str
