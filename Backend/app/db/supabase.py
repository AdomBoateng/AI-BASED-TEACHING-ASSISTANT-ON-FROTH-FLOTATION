from __future__ import annotations

import os
from supabase import create_client

from app.config import load_env

_supabase = None

def get_supabase():
    """Singleton Supabase client. Requires env vars; no hardcoded fallbacks."""
    global _supabase
    if _supabase is None:
        load_env()
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.")
        _supabase = create_client(url, key)
    return _supabase