from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from supabase import create_client
import os

router = APIRouter(prefix="/auth", tags=["Auth (Supabase)"])

supabase_anon = create_client(
    os.getenv("SUPABASE_URL", "https://fdqilmfldmzqynpvyiql.supabase.co"),
    os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkcWlsbWZsZG16cXlucHZ5aXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDMyNTMsImV4cCI6MjA4NTU3OTI1M30.rv8aik6voR1SbahnpNWQvqxjPOVxnXAyDZcjYQFiKVs")
)

PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "http://127.0.0.1:8000")


class SignUpPayload(BaseModel):
    email: EmailStr
    password: str


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordPayload(BaseModel):
    email: EmailStr
    redirect_to: str | None = None  # where user sets new password later


@router.post("/signup")
def signup(payload: SignUpPayload):
    """
    Creates an auth user (email/password).
    Your DB trigger will auto-create public.users.
    """
    try:
        res = supabase_anon.auth.sign_up({
            "email": payload.email,
            "password": payload.password
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Depending on Supabase settings, session may be None until email confirmed.
    session = getattr(res, "session", None)
    user = getattr(res, "user", None)

    return {
        "user": {
            "id": getattr(user, "id", None),
            "email": getattr(user, "email", None)
        },
        "session": {
            "access_token": getattr(session, "access_token", None),
            "refresh_token": getattr(session, "refresh_token", None),
            "expires_in": getattr(session, "expires_in", None)
        }
    }


@router.post("/login")
def login(payload: LoginPayload):
    """
    Logs user in and returns JWT access_token (this is what you paste into Swagger Authorize).
    """
    try:
        res = supabase_anon.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

    session = res.session
    user = res.user

    return {
        "user": {"id": user.id, "email": user.email},
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_in": session.expires_in,
        "token_type": "bearer"
    }


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordPayload):
    """
    Sends password reset email.
    User must click link in email (Swagger can't complete the reset itself).
    """
    redirect_to = payload.redirect_to or f"{PUBLIC_SITE_URL}/auth/reset-password"
    try:
        supabase_anon.auth.reset_password_for_email(
            payload.email,
            {"redirect_to": redirect_to}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "ok", "message": "Password reset email sent", "redirect_to": redirect_to}


@router.get("/google/url")
def google_login_url(redirect_to: str | None = None):
    """
    Returns the Google OAuth URL. Open it in a browser to complete login.
    """
    # This must be a URL you configured in Supabase Auth URL config.
    redirect_to = redirect_to or f"{PUBLIC_SITE_URL}/auth/google/callback"

    try:
        # In supabase-py, sign_in_with_oauth returns a URL you can open.
        res = supabase_anon.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {"redirect_to": redirect_to}
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # supabase-py returns an object with url in different versions; handle both
    url = getattr(res, "url", None) or getattr(res, "data", {}).get("url")
    return {"url": url, "note": "Open this URL in your browser to login with Google."}
