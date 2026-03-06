import os
from supabase import create_client, Client, create_async_client, AsyncClient

from app.config import load_env

_supabase = None
_async_supabase = None

def get_supabase() -> Client:
    """Singleton sync Supabase client."""
    global _supabase
    if _supabase is None:
        load_env()
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        _supabase = create_client(url, key)
    return _supabase

async def get_async_supabase() -> AsyncClient:
    """Singleton async Supabase client."""
    global _async_supabase
    if _async_supabase is None:
        load_env()
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        # supabase-py uses httpx for async
        _async_supabase = await create_async_client(url, key)
    return _async_supabase
