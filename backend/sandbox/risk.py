"""
Phase 14 — Risk Constraint Enforcement
----------------------------------------
All risk checks run BEFORE any simulated fill.
If any constraint is violated → order is REJECTED.
Rejection is the primary educational output of this sandbox.

Constraints enforced:
 1. Delta exposure cap
 2. Vega exposure cap
 3. Gamma exposure cap
 4. Max notional exposure
 5. Max single-expiry OI concentration

These are research-grade guardrails, not investment recommendations.
"""
from dataclasses import dataclass
from typing import List


@dataclass
class RiskViolation:
    constraint:    str
    current_value: float
    cap:           float
    explanation:   str

    def as_dict(self) -> dict:
        return {
            "constraint":    self.constraint,
            "current_value": round(self.current_value, 6),
            "cap":           round(self.cap, 6),
            "explanation":   self.explanation,
        }


@dataclass
class GreeksExposure:
    delta: float = 0.0
    gamma: float = 0.0
    vega:  float = 0.0
    theta: float = 0.0

    def as_dict(self) -> dict:
        return {
            "delta": round(self.delta, 6),
            "gamma": round(self.gamma, 6),
            "vega":  round(self.vega, 6),
            "theta": round(self.theta, 6),
        }


def check_delta(
    delta_after: float,
    cap: float,
) -> List[RiskViolation]:
    """Delta exposure check: |net delta| must be below cap."""
    violations = []
    if abs(delta_after) > cap:
        violations.append(RiskViolation(
            constraint="delta_exposure",
            current_value=abs(delta_after),
            cap=cap,
            explanation=(
                f"Net delta exposure ({abs(delta_after):.4f}) would exceed the δ-cap ({cap:.2f}). "
                f"This limit prevents excessive directional sensitivity. "
                f"Reduce position size or add an offsetting option to lower net delta."
            ),
        ))
    return violations


def check_vega(
    vega_after: float,
    cap: float,
) -> List[RiskViolation]:
    """Vega exposure check: net vega must be below cap."""
    violations = []
    if abs(vega_after) > cap:
        violations.append(RiskViolation(
            constraint="vega_exposure",
            current_value=abs(vega_after),
            cap=cap,
            explanation=(
                f"Net vega ({abs(vega_after):.4f}) would exceed the ν-cap ({cap:.2f}). "
                f"High vega sensitivity amplifies the impact of IV changes. "
                f"Consider a shorter-dated option or reduce quantity."
            ),
        ))
    return violations


def check_gamma(
    gamma_after: float,
    cap: float,
) -> List[RiskViolation]:
    """Gamma exposure check: net gamma must be below cap."""
    violations = []
    if abs(gamma_after) > cap:
        violations.append(RiskViolation(
            constraint="gamma_exposure",
            current_value=abs(gamma_after),
            cap=cap,
            explanation=(
                f"Net gamma ({abs(gamma_after):.4f}) exceeds the Γ-cap ({cap:.3f}). "
                f"Elevated gamma means the position's delta changes rapidly with spot moves. "
                f"Reduce quantity or choose a further OTM strike to lower convexity."
            ),
        ))
    return violations


def check_notional(
    spot:     float,
    quantity: int,
    cap:      float,
) -> List[RiskViolation]:
    """Notional exposure check: quantity × spot must be under cap."""
    violations = []
    notional = spot * quantity
    if notional > cap:
        violations.append(RiskViolation(
            constraint="max_notional",
            current_value=notional,
            cap=cap,
            explanation=(
                f"Notional exposure (qty × spot = {notional:,.0f} INR) exceeds the cap ({cap:,.0f} INR). "
                f"This limit prevents outsized absolute exposure in the simulator. "
                f"Reduce quantity to bring notional below {cap:,.0f} INR."
            ),
        ))
    return violations


def check_oi_concentration(
    order_oi:   float,
    total_oi:   float,
    cap_pct:    float = 0.50,
) -> List[RiskViolation]:
    """OI concentration check: single strike OI share must be below cap_pct."""
    violations = []
    if total_oi <= 0:
        return violations
    concentration = order_oi / total_oi
    if concentration > cap_pct:
        violations.append(RiskViolation(
            constraint="oi_concentration",
            current_value=concentration,
            cap=cap_pct,
            explanation=(
                f"Strike OI concentration ({concentration*100:.1f}%) exceeds the {cap_pct*100:.0f}% cap. "
                f"This strike holds an unusually large share of total chain OI. "
                f"Deep concentration at a single strike can indicate structural pinning risk."
            ),
        ))
    return violations


def run_all_checks(
    greeks_after: GreeksExposure,
    spot:         float,
    quantity:     int,
    order_oi:     float,
    total_oi:     float,
    delta_cap:    float,
    vega_cap:     float,
    gamma_cap:    float,
    notional_cap: float,
) -> List[RiskViolation]:
    """Run all 5 risk checks. Returns list of violations (empty = pass)."""
    violations = []
    violations.extend(check_delta(greeks_after.delta, delta_cap))
    violations.extend(check_vega(greeks_after.vega,   vega_cap))
    violations.extend(check_gamma(greeks_after.gamma,  gamma_cap))
    violations.extend(check_notional(spot, quantity,   notional_cap))
    violations.extend(check_oi_concentration(order_oi, total_oi))
    return violations
