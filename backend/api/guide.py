"""
Phase 15 — QuantEdge Concept Guide API
----------------------------------------
POST /api/guide/ask

Rule-based concept matcher — NO LLM, NO external API calls.
Deterministic: keyword match → pre-written definition or refusal.

HARD RULES:
  - No auth required (guide is public-facing)
  - Refuses trading, prediction, profit, strategy questions
  - Returns refused=True + section redirect when refusal triggered
  - Falls back to glossary redirect for unknown questions
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/guide", tags=["guide"])

# ── Schema ────────────────────────────────────────────────────────────────────

class GuideQuestion(BaseModel):
    question: str
    context:  Optional[str] = None  # Frontend routing path or internal feature key for auto-tutorials

class GuideAnswer(BaseModel):
    answer:           str
    refused:          bool
    redirect_section: Optional[str]  # e.g. "glossary", "section_7", "feature_walkthrough"

# ── Refuse list: keywords that indicate trading/prediction intent ──────────────

REFUSE_KEYWORDS = [
    "buy", "sell", "should i", "will it", "predict", "investment", "invest",
    "profit", "strategy", "trade", "trading", "returns", "best option",
    "entry", "exit", "long", "short", "position size", "when to", "whether to",
    "recommend", "advice", "perform", "outperform", "target", "stop loss", "stoploss",
]

REFUSE_RESPONSE = (
    "I can explain what any term or feature means, but I can't evaluate "
    "whether any position or action is good or bad. "
    "QuantEdge is an educational system — it describes market conditions, not decisions. "
    "Try Section 7 (How to Use Safely) for the ethical framing of this platform."
)

# ── Concept knowledge base ─────────────────────────────────────────────────────

CONCEPTS = {
    "implied volatility": (
        "Implied volatility (IV) is the market's expectation of future price movement, "
        "extracted from current option prices using a pricing model. "
        "Think of it like a storm forecast: a meteorologist looks at atmospheric pressure to estimate "
        "how turbulent tomorrow might be — IV does the same for a stock's expected movement. "
        "It does NOT tell you which direction prices will move, only how much movement the market expects. "
        "High IV means options are expensive; low IV means they're cheap — relative to historical norms.",
        "glossary"
    ),
    "iv": (
        "IV stands for Implied Volatility — the market's forward-looking estimate of price movement "
        "encoded in option prices. See the Glossary (Section 8) for a full definition.",
        "glossary"
    ),
    "delta": (
        "Delta (Δ) measures how much an option's price changes when the underlying stock moves by ₹1. "
        "A delta of 0.5 means the option gains ₹0.50 for every ₹1 upward move in the stock. "
        "Think of it like a shadow: as the sun (stock) moves, the shadow (option price) follows — "
        "but not always at the same speed. Delta tells you the speed of that shadow.",
        "glossary"
    ),
    "gamma": (
        "Gamma (Γ) measures how quickly delta itself changes as the stock moves. "
        "High gamma means delta changes rapidly — the option's price relationship to the stock is unstable. "
        "Think of gamma as acceleration: delta is speed, gamma is how fast that speed is changing. "
        "Near expiry, gamma spikes — small stock moves can massively change the option's behaviour.",
        "glossary"
    ),
    "vega": (
        "Vega (ν) measures how much an option's price changes when implied volatility shifts by 1%. "
        "If vega is 5, a 1% rise in IV increases the option price by ₹5. "
        "Vega is like a humidity sensor: higher humidity (IV) makes the 'atmosphere' more energetic, "
        "and vega tells you how sensitive your option is to that energy level.",
        "glossary"
    ),
    "theta": (
        "Theta (θ) measures how much value an option loses each day, purely from the passage of time. "
        "A theta of -2 means the option loses ₹2 per day, all else equal. "
        "Think of theta as a melting ice cube: even if nothing else changes, the cube shrinks every day. "
        "This is why options are sometimes described as 'wasting assets'.",
        "glossary"
    ),
    "skew": (
        "Volatility skew describes the difference in implied volatility across different strike prices. "
        "In practice, put options (downside protection) often have higher IV than call options "
        "at the same distance from the spot — this asymmetry is the skew. "
        "It reflects the market's uneven fear of downside vs upside moves.",
        "glossary"
    ),
    "smile": (
        "The volatility smile is a pattern where both deep in-the-money and deep out-of-the-money options "
        "have higher IV than at-the-money options, forming a U-shaped curve when plotted. "
        "It's called a 'smile' because the chart curve looks like one. "
        "It arises because the lognormal distribution assumed by Black-Scholes doesn't perfectly match reality.",
        "glossary"
    ),
    "term structure": (
        "Volatility term structure refers to how implied volatility varies across different expiry dates. "
        "Near-term options often have higher IV during uncertain periods; longer-dated options may be calmer. "
        "Think of it like a weather forecast: tomorrow might be stormy (high near-term IV) "
        "while next month looks clear (lower long-term IV).",
        "glossary"
    ),
    "residual": (
        "In ML Insights, a residual is the difference between what the Black-Scholes model predicts "
        "and what the market is actually pricing. "
        "Large residuals suggest the market is pricing in something the model doesn't capture. "
        "QuantEdge uses ML to describe these residuals — not to predict future prices.",
        "glossary"
    ),
    "slippage": (
        "Slippage is the difference between the expected price of a trade and the actual price received. "
        "In the Execution Sandbox, slippage is modelled deterministically from bid-ask width and order size. "
        "It's a diagnostic — higher slippage means execution is more 'expensive' in friction terms.",
        "glossary"
    ),
    "execution risk": (
        "Execution risk refers to the uncertainty in how, when, and at what price an order gets filled. "
        "In the Execution Sandbox, this is explored through fill probability, latency buckets, and slippage. "
        "It's separate from market risk — even a 'correct' analysis can suffer from poor execution.",
        "glossary"
    ),
    "pcr": (
        "PCR stands for Put-Call Ratio — the ratio of put option trading volume or open interest "
        "to call option trading volume or open interest. "
        "It's an aggregate sentiment indicator. A high PCR means more put activity; "
        "low PCR means more call activity. It does NOT tell you which direction prices will move.",
        "section_5"
    ),
    "open interest": (
        "Open interest (OI) is the total number of outstanding option contracts that haven't been settled. "
        "High OI at a strike often indicates that strike is significant to many participants — "
        "it's sometimes used to identify support/resistance clusters, but it's not predictive on its own.",
        "section_5"
    ),
    "black scholes": (
        "Black-Scholes is a mathematical model for pricing European options, assuming the underlying "
        "follows a lognormal process with constant volatility. "
        "It's the baseline model in QuantEdge — not because it's perfect, but because it's the "
        "standard reference that market participants use to communicate via implied volatility.",
        "section_5"
    ),
    "gex": (
        "Gamma Exposure (GEX) estimates the aggregate gamma position of option market makers — "
        "dealers who write options. A GEX near zero is considered 'neutral'; large GEX can create "
        "self-reinforcing hedging flows. It's a structural diagnostic, not a directional signal.",
        "glossary"
    ),
    "surface": (
        "The volatility surface is a 3D visualisation showing implied volatility across all strikes "
        "and expiries simultaneously. The axes are: strike on one horizontal axis, expiry on the other, "
        "and IV on the vertical axis. It reveals skew, smile, and term structure all at once.",
        "section_5"
    ),
    "option chain": (
        "An option chain is a table showing all available call and put options for a given underlying, "
        "organised by strike and expiry. Each row contains: strike, LTP, IV, delta, OI, and volume "
        "for both calls and puts. It's a real-time snapshot of the options market.",
        "section_5"
    ),
    "quantedge": (
        "QuantEdge is a quantitative research terminal built for understanding options pricing, "
        "volatility, and market structure. It does not provide trading advice, execute orders, "
        "or connect to any broker. Think of it as a high-resolution analytical microscope — "
        "not a decision-making tool.",
        "section_1"
    ),
    "sandbox": (
        "The Execution Sandbox is an isolated simulation environment where you can study how "
        "hypothetical option orders would behave — including fill probability, slippage, and risk constraint violations. "
        "It is not connected to any real market or broker. Its purpose is to teach why execution is difficult, "
        "not to optimise trades.",
        "section_5"
    ),

    # ── Tutorials & Feature Guides ────────────────────────────────────────────────
    "tutorial_dashboard": (
        "Welcome to the Dashboard! This is your high-level overview of the Indian Index Options market. "
        "Here you can see the current spot prices, macroeconomic indicators (like the 10Y Yield and USDINR), "
        "and overall session status. The 'Option Snapshot' blocks give you a quick reading of market sentiment via Max Pain and Put-Call Ratios.",
        "feature_walkthrough"
    ),
    "tutorial_chain": (
        "This is the Option Chain. It displays all available call and put contracts for the selected index and expiry.\n\n"
        "• Blue highlights indicate At-The-Money (ATM) strikes.\n"
        "• The horizontal bars show Open Interest (OI), illustrating where institutional positions are concentrated.\n"
        "• Hover over any row to see its exact Greeks (Delta, Gamma, Vega, Theta).",
        "feature_walkthrough"
    ),
    "tutorial_surface": (
        "Welcome to the Volatility Surface. This 3D graph plots Implied Volatility (vertical axis) against moneyness (strike) and time (expiry).\n\n"
        "• A U-shape across strikes is the 'Volatility Smile', showing higher demand for deep out-of-the-money puts.\n"
        "• Drag to rotate the surface and observe how near-term expiries (front months) usually have steeper curves than long-term ones (Term Structure).",
        "feature_walkthrough"
    ),
    "tutorial_models": (
        "This is Model Comparison. While Black-Scholes assumes constant volatility, real markets do not. "
        "This module prices exactly the same option using different mathematical models (like Heston, which allows volatility to fluctuate randomly, or Binomial Trees for American-style step pricing) "
        "so you can see how model assumptions change the theoretical fair value of a premium.",
        "feature_walkthrough"
    ),
    "tutorial_ml": (
        "Welcome to ML Insights. We use a Random Forest algorithm alongside the structural Black-Scholes model. "
        "Black-Scholes calculates the theoretical Greek exposures, and the ML model learns the 'Residuals' — the hidden pricing patterns (like weekend decay or localized supply/demand imbalances) "
        "that classical math fails to capture. It's structural analysis, not a crystal ball.",
        "feature_walkthrough"
    ),
    "tutorial_market-structure": (
        "This is Market Structure. It visualises aggregate dealer positioning. "
        "The Gamma Exposure (GEX) shows whether market makers are likely to buy or sell to hedge their books as the index moves. "
        "When aggregate Gamma is positive, dealer hedging tends to suppress market volatility. When negative, it can amplify moves.",
        "feature_walkthrough"
    ),
    "tutorial_scenario": (
        "Welcome to the Scenario Lab. Use the sliders to 'shock' the market environment.\n\n"
        "• Change the Spot price, bump up IV, or advance the clock forward by several days.\n"
        "• The matrix below instantly recruits the new expected Option Premium and Greek exposures under those hypothetical conditions, allowing you to stress-test abstract exposures.",
        "feature_walkthrough"
    ),
    "tutorial_research": (
        "This is the Research Signals module. It scans the entire chain for structural anomalies based on quantitative signatures—like massive IV divergence, heavy Gamma concentrations, or abnormal order-flow imbalances. "
        "These are mathematical observations of market stress, not directional buy/sell signals.",
        "feature_walkthrough"
    ),
    "tutorial_signals": (
        "Signal Validation module. Here you evaluate the statistical robustness of the Research Signals. "
        "It back-tests the 'hit rate' of specific volatility patterns to see if they hold up to mathematical scrutiny over time, separating genuine structural edges from random noise.",
        "feature_walkthrough"
    ),
    "tutorial_sandbox": (
        "Welcome to the Execution Sandbox. This is where theory meets reality.\n\n"
        "Configure a hypothetical trade of any size. The engine will evaluate it against strict institutional risk constraints (Delta/Vega limits, absolute Notional caps). "
        "If the trade passes risk checks, it calculates exact slippage and latency metrics based on order size and bid-ask spread liquidity.",
        "feature_walkthrough"
    )
}


def _normalise(text: str) -> str:
    return text.lower().strip()


def _check_refuse(question: str) -> bool:
    q = _normalise(question)
    return any(kw in q for kw in REFUSE_KEYWORDS)


def _match_concept(question: str) -> Optional[tuple]:
    q = _normalise(question)
    # Exact-ish match: check if any concept key appears in question
    best = None
    for key, (definition, section) in CONCEPTS.items():
        if key in q:
            # Prefer longer matches (more specific)
            if best is None or len(key) > len(best[0]):
                best = (key, definition, section)
    return best


@router.post("/ask", response_model=GuideAnswer)
def ask_guide(body: GuideQuestion):
    """
    Concept-only guide endpoint with Contextual Auto-Tutorials.
    """
    q = body.question.strip()
    q_norm = _normalise(q)

    # 1. Handle Auto-Tutorials and strict Replay queries first
    if body.context and (q_norm == "how to use this page" or q_norm == "tutorial"):
        ctx_key = f"tutorial_{body.context.strip('/')}"
        if ctx_key in CONCEPTS:
            return GuideAnswer(
                answer=CONCEPTS[ctx_key][0],
                refused=False,
                redirect_section=CONCEPTS[ctx_key][1]
            )

    if not q:
        return GuideAnswer(
            answer="Please type a question about a QuantEdge concept or feature.",
            refused=False,
            redirect_section="glossary"
        )

    # 2. Check refuse list (trading queries)
    # BUT explicitly allow specific tutorial queries to bypass refuse list
    is_tutorial_query = "how to use" in q_norm or "what does" in q_norm or "how does" in q_norm

    if not is_tutorial_query and _check_refuse(q):
        return GuideAnswer(
            answer=REFUSE_RESPONSE,
            refused=True,
            redirect_section="section_7"
        )

    # Try matching explicit dictionary concepts
    match = _match_concept(q)
    if match:
        _key, definition, section = match
        return GuideAnswer(
            answer=definition,
            refused=False,
            redirect_section=section
        )
        
    # Check if a natural language query maps to a known tutorial
    if "dashboard" in q_norm:
        return GuideAnswer(answer=CONCEPTS["tutorial_dashboard"][0], refused=False, redirect_section="feature_walkthrough")
    if "option chain" in q_norm or "chain" in q_norm:
        return GuideAnswer(answer=CONCEPTS["tutorial_chain"][0], refused=False, redirect_section="feature_walkthrough")
    if "surface" in q_norm or "3d" in q_norm:
        return GuideAnswer(answer=CONCEPTS["tutorial_surface"][0], refused=False, redirect_section="feature_walkthrough")
    if "scenario" in q_norm or "lab" in q_norm:
        return GuideAnswer(answer=CONCEPTS["tutorial_scenario"][0], refused=False, redirect_section="feature_walkthrough")
    if "ml" in q_norm or "machine learning" in q_norm or "insight" in q_norm:
        return GuideAnswer(answer=CONCEPTS["tutorial_ml"][0], refused=False, redirect_section="feature_walkthrough")

    # Fallback
    return GuideAnswer(
        answer=(
            "I don't have a specific answer for that, but the Glossary in Section 8 covers "
            "all major QuantEdge terms — IV, Delta, Gamma, Vega, Theta, Skew, Smile, and more. "
            "You can also use Section 5 for a feature-by-feature walkthrough."
        ),
        refused=False,
        redirect_section="glossary"
    )
