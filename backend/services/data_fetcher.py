"""
NSE Market Data Fetcher
-----------------------
Fetches Indian market data (NIFTY, BANKNIFTY, equity options) from NSE public APIs.
Falls back to Yahoo Finance if NSE is unavailable.
Caches results to disk with a configurable TTL so the platform always has data to show.

All fetching happens server-side. Browser-direct NSE requests fail due to CORS/cookie
restrictions and are explicitly prohibited by design.
"""

import json
import os
import time
import logging
from datetime import datetime, date
from typing import Optional, Dict, Any
import httpx
import yfinance as yf

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
CACHE_DIR = os.path.join(os.path.dirname(__file__), "../../data/cache")
CACHE_TTL_SECONDS = int(os.getenv("NSE_CACHE_TTL", "60"))  # 60 seconds default

NSE_BASE = "https://www.nseindia.com"
NSE_OPTION_CHAIN_URL = f"{NSE_BASE}/api/option-chain-indices"
NSE_QUOTE_URL = f"{NSE_BASE}/api/quote-equity"

# NSE requires browser-like headers or it returns 403
NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
    "Connection": "keep-alive",
}

# Yahoo Finance ticker mapping for fallback
YF_SYMBOL_MAP = {
    "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "NIFTY50": "^NSEI",
}

os.makedirs(CACHE_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Cache utilities
# ---------------------------------------------------------------------------
def _cache_path(key: str) -> str:
    return os.path.join(CACHE_DIR, f"{key}.json")


def _read_cache(key: str) -> Optional[Dict[str, Any]]:
    path = _cache_path(key)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            data = json.load(f)
        age = time.time() - data.get("_cached_at", 0)
        data["_cache_age_seconds"] = int(age)
        data["_is_cached"] = age < CACHE_TTL_SECONDS
        data["_cache_stale"] = age >= CACHE_TTL_SECONDS
        return data
    except Exception:
        return None


def _write_cache(key: str, data: Dict[str, Any]) -> None:
    data["_cached_at"] = time.time()
    data["_last_updated"] = datetime.utcnow().isoformat() + "Z"
    data["_is_cached"] = False
    data["_cache_stale"] = False
    try:
        with open(_cache_path(key), "w") as f:
            json.dump(data, f)
    except Exception as e:
        logger.warning(f"Failed to write cache for {key}: {e}")


def _stale_cache(key: str) -> Optional[Dict[str, Any]]:
    """Return cached data even if stale (for graceful degradation)."""
    path = _cache_path(key)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            data = json.load(f)
        data["_is_cached"] = True
        data["_cache_stale"] = True
        age = time.time() - data.get("_cached_at", 0)
        data["_cache_age_seconds"] = int(age)
        return data
    except Exception:
        return None


# ---------------------------------------------------------------------------
# NSE session (cookie-based)
# ---------------------------------------------------------------------------
_nse_client: Optional[httpx.Client] = None


def _get_nse_client() -> httpx.Client:
    """Returns an httpx client with a valid NSE session cookie."""
    global _nse_client
    if _nse_client is not None:
        return _nse_client
    try:
        client = httpx.Client(headers=NSE_HEADERS, timeout=15.0, follow_redirects=True)
        # Establish session by hitting the homepage first (sets cookies)
        client.get(NSE_BASE)
        _nse_client = client
        return client
    except Exception as e:
        logger.warning(f"Could not establish NSE session: {e}")
        raise


def _reset_nse_client() -> None:
    global _nse_client
    _nse_client = None


# ---------------------------------------------------------------------------
# Spot price fetching
# ---------------------------------------------------------------------------
def _fetch_spot_nse(symbol: str) -> Optional[float]:
    try:
        client = _get_nse_client()
        r = client.get(f"{NSE_OPTION_CHAIN_URL}?symbol={symbol}")
        r.raise_for_status()
        payload = r.json()
        return float(payload["records"]["underlyingValue"])
    except Exception as e:
        logger.warning(f"NSE spot fetch failed for {symbol}: {e}")
        _reset_nse_client()
        return None


def _fetch_spot_yf(symbol: str) -> Optional[float]:
    yf_ticker = YF_SYMBOL_MAP.get(symbol.upper())
    if not yf_ticker:
        yf_ticker = f"{symbol}.NS"
    try:
        ticker = yf.Ticker(yf_ticker)
        info = ticker.fast_info
        price = info.last_price or info.previous_close
        return float(price) if price else None
    except Exception as e:
        logger.warning(f"Yahoo Finance spot fetch failed for {symbol}: {e}")
        return None


def fetch_spot(symbol: str) -> Dict[str, Any]:
    """
    Returns current spot price for the given symbol.
    Tries NSE first, falls back to Yahoo Finance, then returns stale cache.
    """
    cache_key = f"spot_{symbol.upper()}"
    cached = _read_cache(cache_key)
    if cached and not cached.get("_cache_stale"):
        return cached

    price = _fetch_spot_nse(symbol)
    source = "nse"

    if price is None:
        price = _fetch_spot_yf(symbol)
        source = "yahoo_finance"

    if price is not None:
        data = {
            "symbol": symbol.upper(),
            "spot": price,
            "source": source,
            "as_of_date": date.today().isoformat(),
        }
        _write_cache(cache_key, data)
        return data

    # Graceful degradation: return stale cache if available
    stale = _stale_cache(cache_key)
    if stale:
        logger.warning(f"Returning stale cache for {symbol} spot price")
        return stale

    # Nothing available
    return {
        "symbol": symbol.upper(),
        "spot": None,
        "source": "unavailable",
        "error": "Could not fetch live or cached data.",
        "_is_cached": True,
        "_cache_stale": True,
    }


# ---------------------------------------------------------------------------
# Option chain fetching
# ---------------------------------------------------------------------------
def _parse_nse_option_chain(payload: Dict, symbol: str) -> Dict[str, Any]:
    records = payload.get("records", {})
    data = payload.get("filtered", {}).get("data", [])
    expiry_dates = records.get("expiryDates", [])
    underlying = records.get("underlyingValue", 0)

    options = []
    for row in data:
        call = row.get("CE", {})
        put = row.get("PE", {})
        strike = row.get("strikePrice", 0)
        expiry = row.get("expiryDate", "")

        options.append({
            "strike": strike,
            "expiry": expiry,
            "call_ltp": call.get("lastPrice", 0),
            "call_iv": call.get("impliedVolatility", 0),
            "call_oi": call.get("openInterest", 0),
            "call_volume": call.get("totalTradedVolume", 0),
            "call_delta": None,  # Will be computed server-side by pricing engine
            "put_ltp": put.get("lastPrice", 0),
            "put_iv": put.get("impliedVolatility", 0),
            "put_oi": put.get("openInterest", 0),
            "put_volume": put.get("totalTradedVolume", 0),
            "put_delta": None,
        })

    return {
        "symbol": symbol.upper(),
        "underlying": underlying,
        "expiry_dates": expiry_dates,
        "options": options,
    }


def fetch_option_chain(symbol: str, expiry: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns full option chain for the given NSE index or equity symbol.
    Expiry can be provided to filter (format: DD-MMM-YYYY, e.g. '27-Mar-2025').
    """
    cache_key = f"chain_{symbol.upper()}_{expiry or 'all'}"
    cached = _read_cache(cache_key)
    if cached and not cached.get("_cache_stale"):
        return cached

    try:
        client = _get_nse_client()
        url = f"{NSE_OPTION_CHAIN_URL}?symbol={symbol}"
        if expiry:
            url += f"&expiryDate={expiry}"
        r = client.get(url)
        r.raise_for_status()
        payload = r.json()
        data = _parse_nse_option_chain(payload, symbol)
        _write_cache(cache_key, data)
        return data
    except Exception as e:
        logger.warning(f"NSE option chain fetch failed for {symbol}: {e}")
        _reset_nse_client()

    stale = _stale_cache(cache_key)
    if stale:
        return stale

    return {
        "symbol": symbol.upper(),
        "underlying": None,
        "expiry_dates": [],
        "options": [],
        "error": "Could not fetch option chain data.",
        "_is_cached": True,
        "_cache_stale": True,
    }


# ---------------------------------------------------------------------------
# Market summary (Dashboard)
# ---------------------------------------------------------------------------
def fetch_market_summary() -> Dict[str, Any]:
    """Returns a snapshot of major Indian indices for the dashboard."""
    cache_key = "market_summary"
    cached = _read_cache(cache_key)
    if cached and not cached.get("_cache_stale"):
        return cached

    indices = {}
    for symbol in ["NIFTY", "BANKNIFTY"]:
        spot_data = fetch_spot(symbol)
        indices[symbol] = {
            "spot": spot_data.get("spot"),
            "source": spot_data.get("source"),
            "is_cached": spot_data.get("_is_cached", False),
            "last_updated": spot_data.get("_last_updated"),
        }

    data = {
        "indices": indices,
        "risk_free_rate": 0.065,  # RBI repo rate approximation (static for now)
        "market_session": _market_session_status(),
    }
    _write_cache(cache_key, data)
    return data


def _market_session_status() -> str:
    """Returns whether NSE is currently in a trading session (IST)."""
    from datetime import timezone
    import zoneinfo
    try:
        ist = zoneinfo.ZoneInfo("Asia/Kolkata")
        now_ist = datetime.now(ist)
        weekday = now_ist.weekday()  # 0=Monday, 6=Sunday
        if weekday >= 5:
            return "closed_weekend"
        hour = now_ist.hour
        minute = now_ist.minute
        total_mins = hour * 60 + minute
        # NSE pre-open: 9:00–9:15, regular: 9:15–15:30
        if 540 <= total_mins < 555:
            return "pre_open"
        elif 555 <= total_mins <= 930:
            return "open"
        else:
            return "closed"
    except Exception:
        return "unknown"
