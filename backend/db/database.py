"""
QuantEdge — SQLite User Database
---------------------------------
Stores user accounts and session tokens.
No third-party auth libraries required — uses Python stdlib only.
Database file: data/quantedge_users.db
"""

import sqlite3
import hashlib
import secrets
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "../../data/quantedge_users.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db() -> None:
    """Create tables on first run."""
    with _conn() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                email        TEXT    UNIQUE NOT NULL COLLATE NOCASE,
                name         TEXT    NOT NULL DEFAULT '',
                password_hash TEXT   NOT NULL,
                created_at   TEXT    NOT NULL,
                last_login   TEXT
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token        TEXT    PRIMARY KEY,
                user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at   TEXT    NOT NULL,
                expires_at   TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS pricing_history (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                timestamp    TEXT    NOT NULL,
                model        TEXT    NOT NULL,
                symbol       TEXT    NOT NULL,
                option_type  TEXT    NOT NULL,
                strike       REAL    NOT NULL,
                expiry       TEXT    NOT NULL,
                spot         REAL,
                iv           REAL,
                result_price REAL,
                greeks_json  TEXT,
                params_json  TEXT
            );

            CREATE TABLE IF NOT EXISTS watchlist (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                symbol       TEXT    NOT NULL,
                strike       REAL    NOT NULL,
                option_type  TEXT    NOT NULL DEFAULT 'CE',
                expiry       TEXT    NOT NULL DEFAULT '',
                added_at     TEXT    NOT NULL,
                UNIQUE(user_id, symbol, strike, option_type)
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_history_user   ON pricing_history(user_id);
            CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);

            CREATE TABLE IF NOT EXISTS onboarding (
                user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                date_of_birth TEXT,
                age_group     TEXT,
                qualification TEXT,
                sub_choice    TEXT,
                purpose       TEXT,
                completed_at  TEXT
            );
        """)


# ── Password helpers ──────────────────────────────────────────────────────────

def _hash_password(password: str, salt: Optional[str] = None) -> str:
    if salt is None:
        salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
    return f"{salt}${h.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    salt, _ = stored.split("$", 1)
    return secrets.compare_digest(_hash_password(password, salt), stored)


# ── User operations ───────────────────────────────────────────────────────────

def create_user(email: str, password: str, name: str = "") -> Dict[str, Any]:
    """Register a new user. Raises ValueError if email already exists."""
    now = datetime.utcnow().isoformat()
    pw  = _hash_password(password)
    try:
        with _conn() as c:
            cur = c.execute(
                "INSERT INTO users (email, name, password_hash, created_at) VALUES (?,?,?,?)",
                (email.strip().lower(), name.strip(), pw, now),
            )
            return {"id": cur.lastrowid, "email": email.lower(), "name": name, "created_at": now}
    except sqlite3.IntegrityError:
        raise ValueError("Email already registered")


def save_onboarding(user_id: int, date_of_birth: str, age_group: str,
                    qualification: str, sub_choice: str, purpose: str) -> None:
    """Upsert onboarding data for a user."""
    from datetime import datetime as _dt
    now = _dt.utcnow().isoformat()
    with _conn() as c:
        c.execute("""
            INSERT INTO onboarding (user_id, date_of_birth, age_group, qualification, sub_choice, purpose, completed_at)
            VALUES (?,?,?,?,?,?,?)
            ON CONFLICT(user_id) DO UPDATE SET
                date_of_birth=excluded.date_of_birth,
                age_group=excluded.age_group,
                qualification=excluded.qualification,
                sub_choice=excluded.sub_choice,
                purpose=excluded.purpose,
                completed_at=excluded.completed_at
        """, (user_id, date_of_birth, age_group, qualification, sub_choice, purpose, now))


def get_onboarding(user_id: int) -> Optional[Dict[str, Any]]:
    """Return onboarding data for a user, or None if not completed."""
    with _conn() as c:
        row = c.execute("SELECT * FROM onboarding WHERE user_id=?", (user_id,)).fetchone()
    return dict(row) if row else None


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Return user dict if credentials valid, else None."""
    with _conn() as c:
        row = c.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),)).fetchone()
    if row and _verify_password(password, row["password_hash"]):
        # update last_login
        with _conn() as c:
            c.execute("UPDATE users SET last_login=? WHERE id=?",
                      (datetime.utcnow().isoformat(), row["id"]))
        return dict(row)
    return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with _conn() as c:
        row = c.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return dict(row) if row else None


# ── Session operations ────────────────────────────────────────────────────────

SESSION_TTL_HOURS = 24 * 7   # 7-day sessions


def create_session(user_id: int) -> str:
    """Create a new session token and return it."""
    token       = secrets.token_urlsafe(32)
    now         = datetime.utcnow()
    expires     = (now + timedelta(hours=SESSION_TTL_HOURS)).isoformat()
    with _conn() as c:
        c.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)",
            (token, user_id, now.isoformat(), expires),
        )
    return token


def validate_session(token: str) -> Optional[Dict[str, Any]]:
    """Return user dict if token is valid and not expired, else None."""
    now = datetime.utcnow().isoformat()
    with _conn() as c:
        row = c.execute(
            "SELECT s.user_id, s.expires_at, u.email, u.name, u.created_at "
            "FROM sessions s JOIN users u ON u.id=s.user_id "
            "WHERE s.token=? AND s.expires_at > ?",
            (token, now),
        ).fetchone()
    if row:
        return {"id": row["user_id"], "email": row["email"],
                "name": row["name"], "created_at": row["created_at"]}
    return None


def delete_session(token: str) -> None:
    with _conn() as c:
        c.execute("DELETE FROM sessions WHERE token=?", (token,))


def purge_expired_sessions() -> None:
    now = datetime.utcnow().isoformat()
    with _conn() as c:
        c.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))


# ── Pricing History ───────────────────────────────────────────────────────────

def add_pricing_history(user_id: int, model: str, symbol: str, option_type: str,
                        strike: float, expiry: str, spot: float = None,
                        iv: float = None, result_price: float = None,
                        greeks_json: str = None, params_json: str = None) -> int:
    now = datetime.utcnow().isoformat()
    with _conn() as c:
        cur = c.execute(
            """INSERT INTO pricing_history
               (user_id, timestamp, model, symbol, option_type, strike, expiry,
                spot, iv, result_price, greeks_json, params_json)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (user_id, now, model, symbol, option_type, strike, expiry,
             spot, iv, result_price, greeks_json, params_json),
        )
        return cur.lastrowid


def get_pricing_history(user_id: int, limit: int = 100) -> list:
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM pricing_history WHERE user_id=? ORDER BY timestamp DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def delete_pricing_history(user_id: int, record_id: int = None) -> None:
    with _conn() as c:
        if record_id:
            c.execute("DELETE FROM pricing_history WHERE id=? AND user_id=?", (record_id, user_id))
        else:
            c.execute("DELETE FROM pricing_history WHERE user_id=?", (user_id,))


# ── Watchlist ─────────────────────────────────────────────────────────────────

def add_watchlist_item(user_id: int, symbol: str, strike: float,
                       option_type: str = "CE", expiry: str = "") -> dict:
    now = datetime.utcnow().isoformat()
    try:
        with _conn() as c:
            cur = c.execute(
                "INSERT INTO watchlist (user_id, symbol, strike, option_type, expiry, added_at) VALUES (?,?,?,?,?,?)",
                (user_id, symbol.upper(), strike, option_type.upper(), expiry, now),
            )
            return {"id": cur.lastrowid, "symbol": symbol, "strike": strike,
                    "option_type": option_type, "expiry": expiry, "added_at": now}
    except Exception:
        raise ValueError("Item already in watchlist")


def get_watchlist(user_id: int) -> list:
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM watchlist WHERE user_id=? ORDER BY added_at DESC",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def remove_watchlist_item(user_id: int, item_id: int) -> None:
    with _conn() as c:
        c.execute("DELETE FROM watchlist WHERE id=? AND user_id=?", (item_id, user_id))


def get_user_stats(user_id: int) -> dict:
    with _conn() as c:
        history_count  = c.execute("SELECT COUNT(*) FROM pricing_history WHERE user_id=?", (user_id,)).fetchone()[0]
        watchlist_count = c.execute("SELECT COUNT(*) FROM watchlist WHERE user_id=?", (user_id,)).fetchone()[0]
        session_count  = c.execute("SELECT COUNT(*) FROM sessions WHERE user_id=?", (user_id,)).fetchone()[0]
        model_counts_rows = c.execute(
            "SELECT model, COUNT(*) as cnt FROM pricing_history WHERE user_id=? GROUP BY model",
            (user_id,),
        ).fetchall()
    return {
        "history_count":  history_count,
        "watchlist_count": watchlist_count,
        "session_count":  session_count,
        "models_used":    {r["model"]: r["cnt"] for r in model_counts_rows},
    }


# Initialise on import
init_db()
