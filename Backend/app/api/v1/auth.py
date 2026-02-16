from fastapi import APIRouter, HTTPException
from supabase import create_client
import os

from app.models.models import ForgotPasswordPayload, LoginPayload, SignUpPayload
from app.config import load_env

router = APIRouter(prefix="/auth", tags=["Auth (Supabase)"])

def _get_supabase_anon():
    load_env()
    url = os.getenv("SUPABASE_URL")
    anon = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not anon:
        raise RuntimeError(
            "Missing SUPABASE_URL or SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY environment variables."
        )
    return create_client(url, anon)

PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "http://127.0.0.1:8000")

@router.post("/signup")
def signup(payload: SignUpPayload):
    """Create auth user (email/password). Session may be None until email confirmed."""
    supabase_anon = _get_supabase_anon()
    try:
        res = supabase_anon.auth.sign_up({"email": payload.email, "password": payload.password})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    session = getattr(res, "session", None)
    user = getattr(res, "user", None)

    return {
        "user": {"id": getattr(user, "id", None), "email": getattr(user, "email", None)},
        "session": {
            "access_token": getattr(session, "access_token", None),
            "refresh_token": getattr(session, "refresh_token", None),
            "expires_in": getattr(session, "expires_in", None),
        },
        "note": "If access_token is null, email confirmation is likely required in Supabase Auth settings."
    }

@router.post("/login")
def login(payload: LoginPayload):
    """Login and return JWT access_token for Swagger Authorize."""
    supabase_anon = _get_supabase_anon()
    try:
        res = supabase_anon.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

    session = res.session
    user = res.user

    return {
        "user": {"id": user.id, "email": user.email},
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_in": session.expires_in,
        "token_type": "bearer",
    }

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordPayload):
    """Send password reset email (user completes in browser via redirect link)."""
    supabase_anon = _get_supabase_anon()
    redirect_to = payload.redirect_to or f"{PUBLIC_SITE_URL}/auth/reset-password"
    try:
        supabase_anon.auth.reset_password_for_email(payload.email, {"redirect_to": redirect_to})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "ok", "message": "Password reset email sent", "redirect_to": redirect_to}

@router.get("/google/url")
def google_login_url(redirect_to: str | None = None):
    """Return Google OAuth URL. Open in browser to complete login/signup."""
    supabase_anon = _get_supabase_anon()
    redirect_to = redirect_to or f"{PUBLIC_SITE_URL}/auth/google/callback"
    try:
        res = supabase_anon.auth.sign_in_with_oauth({"provider": "google", "options": {"redirect_to": redirect_to}})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    url = getattr(res, "url", None) or getattr(res, "data", {}).get("url")
    return {"url": url}

@router.get("/google/callback")
def google_callback(code: str | None = None):
    """Exchange OAuth code for session (works for both signup and login)."""
    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code")
    supabase_anon = _get_supabase_anon()
    try:
        try:
            res = supabase_anon.auth.exchange_code_for_session(code)
        except TypeError:
            res = supabase_anon.auth.exchange_code_for_session({"auth_code": code})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    session = getattr(res, "session", None)
    user = getattr(res, "user", None)
    return {
        "user": {"id": getattr(user, "id", None), "email": getattr(user, "email", None)},
        "session": {
            "access_token": getattr(session, "access_token", None),
            "refresh_token": getattr(session, "refresh_token", None),
            "expires_in": getattr(session, "expires_in", None),
        }
    }
