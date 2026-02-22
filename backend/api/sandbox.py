"""
Phase 14 — Execution Sandbox API
----------------------------------
Read-path: GET /api/sandbox/constraints
Write-path: POST /api/sandbox/simulate (ephemeral — nothing persisted)

All endpoints require Bearer token authentication.
No trading. No execution. No capital interaction. Research-only simulation.
"""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from backend.db.database                      import validate_session
from backend.sandbox.order                    import SandboxOrder
from backend.sandbox.simulator                import simulate_order
from backend.sandbox.metrics                  import (
    SimulationResult, ConstraintDefinition,
    ConstraintCatalog, SANDBOX_DISCLAIMER,
)

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])


# ── Auth helper ──────────────────────────────────────────────────────────────

def _require_auth(authorization: Optional[str]) -> dict:
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    user = validate_session(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid.")
    return user


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/simulate", response_model=SimulationResult)
def simulate(
    order:         SandboxOrder,
    authorization: Optional[str] = Header(None),
):
    """
    Simulates execution of a hypothetical order.
    Nothing is persisted. Outputs are diagnostic only.
    No P&L, no performance, no trading advice.
    """
    _require_auth(authorization)
    try:
        result = simulate_order(order)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Simulation engine error: {e}")
    return result


@router.get("/constraints", response_model=ConstraintCatalog)
def get_constraints(authorization: Optional[str] = Header(None)):
    """
    Returns the definition of all 5 risk constraints enforced by the sandbox.
    Constraints may be partially adjusted within permitted ranges via the order payload.
    """
    _require_auth(authorization)
    return ConstraintCatalog(
        disclaimer=SANDBOX_DISCLAIMER,
        constraints=[
            ConstraintDefinition(
                name="delta_exposure",
                cap=0.50,
                unit="Δ (per unit × qty)",
                description="Maximum absolute net delta exposure. Controls directional sensitivity.",
                adjustable=True,
            ),
            ConstraintDefinition(
                name="vega_exposure",
                cap=0.30,
                unit="ν (per unit × qty)",
                description="Maximum net vega. Controls sensitivity to implied volatility changes.",
                adjustable=True,
            ),
            ConstraintDefinition(
                name="gamma_exposure",
                cap=0.10,
                unit="Γ (per unit × qty)",
                description="Maximum net gamma. Controls convexity — how rapidly delta changes with spot.",
                adjustable=True,
            ),
            ConstraintDefinition(
                name="max_notional",
                cap=1_000_000.0,
                unit="INR (qty × spot)",
                description="Maximum absolute notional exposure in Indian Rupees.",
                adjustable=True,
            ),
            ConstraintDefinition(
                name="oi_concentration",
                cap=0.50,
                unit="fraction of chain OI",
                description="Maximum fraction of total chain OI a single strike may represent.",
                adjustable=False,
            ),
        ],
    )
