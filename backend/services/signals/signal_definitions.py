"""
Phase 13 — Signal Definitions
-------------------------------
Pure mathematical definitions for all 14 research signals.
Each definition carries: formula, description, limitations, confidence notes.

These are observational/descriptive only. No directional implications.
"""
from .signal_schemas import SignalDefinition

_DEFINITIONS = [

    # ── 1. Volatility Structure ────────────────────────────────────────────────

    SignalDefinition(
        id="atm_iv_percentile",
        name="ATM IV Percentile",
        category="vol_structure",
        formula_summary="Rank of today's ATM IV within its rolling 30-day window",
        formula_latex=r"P_{IV} = \frac{\text{rank}(IV_{ATM,t},\ W_{30})}{|W_{30}|} \times 100",
        description=(
            "Estimates where the current at-the-money implied volatility sits relative to "
            "the past 30 trading days. A high percentile indicates historically elevated "
            "extrinsic premium; a low percentile indicates compressed pricing."
        ),
        unit="%",
        limitations=(
            "Percentile is computed over a short window and does not reflect multi-year regimes. "
            "HV estimation uses an empirical proxy, not realized vol from tick data."
        ),
        confidence_notes="Medium in liquid markets; Low when data is stale or NSE feed is delayed.",
        regime_sensitivity="More reliable in stable vol regimes; less informative during event-driven spikes.",
    ),

    SignalDefinition(
        id="iv_term_slope",
        name="IV Term Structure Slope",
        category="vol_structure",
        formula_summary="(Near ATM IV − Far ATM IV) / Near ATM IV",
        formula_latex=r"S_{term} = \frac{IV_{near} - IV_{far}}{IV_{near}}",
        description=(
            "Measures the slope of the implied volatility term structure across available expiries. "
            "Positive (backwardation): near-term IV > far-term IV, historically associated with "
            "near-term uncertainty. Negative (contango): normal carry structure."
        ),
        unit="ratio",
        limitations=(
            "Computed over only 2–4 expiry points from the NSE chain. "
            "Does not account for dividend or carry effects."
        ),
        confidence_notes="Higher confidence when at least 3 expiries are available.",
        regime_sensitivity="Backwardation is more common near major events or macro uncertainty.",
    ),

    SignalDefinition(
        id="skew_25d_rr",
        name="25Δ Risk Reversal (Skew)",
        category="vol_structure",
        formula_summary="IV(OTM Put) − IV(OTM Call) at roughly ±1 strike from ATM",
        formula_latex=r"RR_{25\Delta} = IV_{put,OTM} - IV_{call,OTM}",
        description=(
            "Approximates the 25-delta risk reversal by comparing OTM put IV against OTM call IV "
            "at one strike away from ATM. Positive values indicate put premium — historically "
            "associated with tail-risk hedging demand. Negative indicates call premium."
        ),
        unit="pp",
        limitations=(
            "True 25Δ requires delta computation from full IV smile; this is an approximation "
            "using adjacent strikes. Skew can persist or widen during stress without reversion."
        ),
        confidence_notes="Medium — improved if exact delta-strike mapping is available.",
        regime_sensitivity="Put premium is structurally elevated in equity indices; spikes during macro stress.",
    ),

    SignalDefinition(
        id="smile_convexity",
        name="Smile Convexity (Butterfly)",
        category="vol_structure",
        formula_summary="Average of OTM Put IV and OTM Call IV minus ATM IV",
        formula_latex=r"BF_{25} = \frac{IV_{put,OTM} + IV_{call,OTM}}{2} - IV_{ATM}",
        description=(
            "Measures the curvature ('smile') of the implied volatility surface around ATM. "
            "Elevated convexity indicates the market is pricing significant tail risk on both sides. "
            "Compressed convexity indicates a flat, low-premium surface."
        ),
        unit="pp",
        limitations=(
            "Approximation using nearest OTM strikes. True butterfly requires delta-neutral strikes. "
            "Convexity varies with DTE — not directly comparable across expiries."
        ),
        confidence_notes="Low to medium; accurate only with liquid OTM options.",
        regime_sensitivity="Elevated before elections, RBI events, or earnings seasons.",
    ),

    # ── 2. Positioning & Flow ──────────────────────────────────────────────────

    SignalDefinition(
        id="pcr_oi",
        name="Put/Call Ratio (OI-based)",
        category="positioning",
        formula_summary="Total Put Open Interest / Total Call Open Interest",
        formula_latex=r"PCR_{OI} = \frac{\sum OI_{put}}{\sum OI_{call}}",
        description=(
            "Measures the aggregate put-to-call open interest ratio across all strikes "
            "for the near expiry. Often discussed as a positioning indicator — high PCR "
            "indicates more open put contracts outstanding relative to calls."
        ),
        unit="ratio",
        limitations=(
            "OI reflects outstanding positions, not directional intent. Market-makers holding "
            "hedged books contribute to OI without directional positioning. "
            "PCR alone is insufficient to infer market direction."
        ),
        confidence_notes="High data quality from NSE; interpretation confidence is Low.",
        regime_sensitivity="PCR norms vary by market regime. Compare to 30-day average for context.",
    ),

    SignalDefinition(
        id="pcr_volume",
        name="Put/Call Ratio (Volume-based)",
        category="positioning",
        formula_summary="Total Put Volume / Total Call Volume (daily)",
        formula_latex=r"PCR_{vol} = \frac{\sum V_{put}}{\sum V_{call}}",
        description=(
            "Intra-day or daily put-to-call traded volume ratio. Volume-based PCR "
            "reflects daily activity more sensitively than OI. Spikes may indicate "
            "rapid protective hedging or speculative activity."
        ),
        unit="ratio",
        limitations=(
            "Volume includes market-maker activity and spreads. Cannot isolate directional "
            "intent. Subject to large single-trade distortion."
        ),
        confidence_notes="Data quality High; directional interpretation confidence Low.",
        regime_sensitivity="Volatile intra-day; more informative as a rolling 5-day average.",
    ),

    SignalDefinition(
        id="oi_concentration",
        name="OI Concentration (HHI)",
        category="positioning",
        formula_summary="Herfindahl-Hirschman Index on call + put OI distribution",
        formula_latex=r"HHI_{OI} = \sum_K \left(\frac{OI_K}{\sum OI}\right)^2 \times 10000",
        description=(
            "Measures how concentrated open interest is across strikes. "
            "A high HHI (>2500) indicates OI is concentrated at a few strikes (potential support/resistance). "
            "A low HHI (<500) indicates OI is broadly spread."
        ),
        unit="index",
        limitations="HHI from NSE data may reflect market-maker positioning dominance at round strikes.",
        confidence_notes="Medium — higher confidence during expiry week when OI patterns stabilise.",
        regime_sensitivity="OI concentration naturally increases approaching expiry.",
    ),

    SignalDefinition(
        id="gex_zone",
        name="Gamma Exposure Zone",
        category="positioning",
        formula_summary="Net GEX = Σ(Γ_call × OI_call) − Σ(Γ_put × OI_put) × lot_size",
        formula_latex=r"GEX_{net} = \sum_K \Gamma_K^{call} \cdot OI_K^{call} \cdot L - \sum_K \Gamma_K^{put} \cdot OI_K^{put} \cdot L",
        description=(
            "Aggregate gamma exposure from dealer hedging. Positive GEX: dealers are net long gamma "
            "(hedging stabilises markets). Negative GEX: dealers are net short gamma "
            "(hedging may amplify moves). Zone classification: Positive / Neutral / Negative."
        ),
        unit="zone",
        limitations=(
            "GEX assumes dealers are option sellers — this may not always hold. "
            "Retail and prop books also participate. Qualitative zone only; not a directional indicator."
        ),
        confidence_notes="Low — directional implication is NOT implied. Zone is structural only.",
        regime_sensitivity="More meaningful in high-OI environments near expiry.",
    ),

    # ── 3. Regime Classification ───────────────────────────────────────────────

    SignalDefinition(
        id="vol_regime",
        name="Volatility Regime",
        category="regime",
        formula_summary="3-class rule: Low (<p20 IV) / Normal / High (>p80 IV)",
        formula_latex=r"\text{regime} = \begin{cases} \text{low} & IV < P_{20} \\ \text{high} & IV > P_{80} \\ \text{normal} & \text{otherwise} \end{cases}",
        description=(
            "Classifies the current volatility environment into Low, Normal, or High "
            "based on ATM IV relative to its estimated historical distribution. "
            "High regime does NOT imply the market will fall; Low regime does NOT imply it will rally."
        ),
        unit="class",
        limitations="Percentile thresholds estimated from rolling 30-day HV proxy, not long-term history.",
        confidence_notes="Medium — longer historical data would improve threshold calibration.",
        regime_sensitivity="Self-referential: the regime classification is based on vol itself.",
    ),

    SignalDefinition(
        id="compression_regime",
        name="Volatility Compression",
        category="regime",
        formula_summary="5-day IV StdDev vs. 30-day baseline (estimated from ATM IV proxy)",
        formula_latex=r"C_{flag} = \mathbf{1}\left[\sigma_{5d}(IV) < P_{10}(\sigma_{30d}(IV))\right]",
        description=(
            "Flags conditions where implied volatility has been unusually stable "
            "over the last 5 trading sessions — compression. Historically, "
            "extended compression is followed by expansion (vol mean reversion), "
            "though timing and direction remain unresolvable."
        ),
        unit="flag",
        limitations=(
            "Cannot predict when compression resolves or in which direction. "
            "Compression can persist for extended periods."
        ),
        confidence_notes="Low — timing of resolution is not estimable from this signal alone.",
        regime_sensitivity="More relevant in low macro-event periods.",
    ),

    SignalDefinition(
        id="skew_stability",
        name="Skew Stability",
        category="regime",
        formula_summary="Bucket of rolling skew standard deviation vs. 30-day baseline",
        formula_latex=r"S_{stable} = \text{bucket}\left(\sigma_{roll}(RR_{25\Delta})\right)",
        description=(
            "Classifies whether the put/call skew (risk reversal) has been stable or unstable "
            "relative to its 30-day baseline. Stable skew indicates a consistent market structure; "
            "unstable skew may indicate changing hedging demand or structural dislocations."
        ),
        unit="class",
        limitations="Stability does not imply the skew level is normal — it only measures consistency.",
        confidence_notes="Low — computed from an approximated skew series.",
        regime_sensitivity="Skew instability is more common around dividends, corporate events, or macro shocks.",
    ),

    # ── 4. Stress & Anomaly Flags ─────────────────────────────────────────────

    SignalDefinition(
        id="iv_hv_divergence",
        name="IV−HV Divergence",
        category="stress_anomaly",
        formula_summary="(ATM IV − Estimated HV) / Estimated HV",
        formula_latex=r"D_{IV-HV} = \frac{IV_{ATM} - \hat{HV}_{30}}{\hat{HV}_{30}}",
        description=(
            "Measures the relative gap between implied volatility and estimated realized volatility. "
            "Positive values indicate options are pricing in more uncertainty than recently observed — "
            "structurally 'rich' extrinsic premium. Negative values indicate historically 'cheap' IV."
        ),
        unit="ratio",
        limitations=(
            "HV is approximated (IV × 0.85 empirical ratio), not computed from tick/OHLC data. "
            "IV richness alone does not imply a profitable short-vol opportunity."
        ),
        confidence_notes="Medium for qualitative classification; Low for precise magnitude interpretation.",
        regime_sensitivity="Divergence is elevated near scheduled macro events and earnings.",
    ),

    SignalDefinition(
        id="oi_shift_anomaly",
        name="OI Shift Anomaly",
        category="stress_anomaly",
        formula_summary="Net OI change magnitude vs. rolling baseline (estimated z-score)",
        formula_latex=r"Z_{OI} = \frac{\Delta OI_t - \mu_{10d}(\Delta OI)}{\sigma_{10d}(\Delta OI)}",
        description=(
            "Flags sessions where the net open interest change appears unusually large relative "
            "to a 10-day rolling estimate. Large OI shifts may indicate position building or "
            "unwinding events — neither is directly interpretable as directional."
        ),
        unit="z-score proxy",
        limitations=(
            "True ΔOI is not available from a single NSE snapshot; this uses OI concentration proxy. "
            "Z-score uses short window estimates and should be treated as qualitative."
        ),
        confidence_notes="Low — directional interpretation of OI shifts is unreliable.",
        regime_sensitivity="More meaningful near expiry when OI rolls are common.",
    ),

    SignalDefinition(
        id="skew_dislocation",
        name="Skew Dislocation",
        category="stress_anomaly",
        formula_summary="Current skew vs. 30-day estimated percentile",
        formula_latex=r"D_{skew} = \text{percentile}(RR_{25\Delta,t},\ W_{30d})",
        description=(
            "Identifies when the current put/call skew is at an extreme relative to recent history. "
            "Elevated skew (>p85) indicates unusually high put premium relative to calls — "
            "often associated with elevated hedging demand. Compressed skew (<p15) is anomalous."
        ),
        unit="%",
        limitations=(
            "Percentile is relative to a short 30-day window. "
            "Extreme skew can persist or intensify — regression to the mean is not guaranteed."
        ),
        confidence_notes="Medium — skew data from NSE chain is reliable; historical context window is short.",
        regime_sensitivity="Skew dislocation is more common during geopolitical events and RBI announcements.",
    ),
]

# Central registry: id → definition
SIGNAL_DEFINITIONS: dict[str, SignalDefinition] = {defn.id: defn for defn in _DEFINITIONS}

# Ordered list for consistent API output
SIGNAL_IDS_ORDERED = [defn.id for defn in _DEFINITIONS]
