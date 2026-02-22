"""
QuantEdge Auth API
------------------
Register, login, logout, and session validation endpoints.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
from backend.db.database import (
    create_user, authenticate_user, create_session,
    validate_session, delete_session, get_user_by_id,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Request / Response models ─────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


def _user_public(user: dict) -> dict:
    """Strip sensitive fields before returning to client."""
    return {
        "id":         user["id"],
        "email":      user["email"],
        "name":       user.get("name", ""),
        "created_at": user.get("created_at", ""),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register")
def register(req: RegisterRequest):
    """Register a new user. Returns a session token immediately."""
    if len(req.password) < 6:
        raise HTTPException(422, "Password must be at least 6 characters")
    if "@" not in req.email or "." not in req.email.split("@")[-1]:
        raise HTTPException(422, "Invalid email address")
    try:
        user  = create_user(req.email, req.password, req.name)
        token = create_session(user["id"])
        return {"status": "ok", "token": token, "user": _user_public(user)}
    except ValueError as e:
        raise HTTPException(409, str(e))


@router.post("/login")
def login(req: LoginRequest):
    """Authenticate user. Returns a session token."""
    user = authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(401, "Invalid email or password")
    token = create_session(user["id"])
    return {"status": "ok", "token": token, "user": _user_public(user)}


@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    """Invalidate the current session token."""
    token = _extract_token(authorization)
    if token:
        delete_session(token)
    return {"status": "ok", "message": "Logged out"}


@router.get("/me")
def me(authorization: Optional[str] = Header(None)):
    """Return current user info if token is valid."""
    token = _extract_token(authorization)
    if not token:
        raise HTTPException(401, "No token provided")
    user = validate_session(token)
    if not user:
        raise HTTPException(401, "Session expired or invalid")
    return {"status": "ok", "user": _user_public(user)}


# ── Helper ────────────────────────────────────────────────────────────────────

def _extract_token(authorization: Optional[str]) -> Optional[str]:
    """Extract Bearer token from Authorization header."""
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None
