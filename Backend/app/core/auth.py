from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db.supabase import supabase

security = HTTPBearer()

async def admin_guard(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    # 1. Validate token with Supabase
    user_response = supabase.auth.get_user(token)

    if not user_response or not user_response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user = user_response.user

    # 2. Fetch user profile (role lives here)
    profile = (
        supabase
        .table("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single()
        .execute()
        .data
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found"
        )

    # 3. Role check
    if profile["role"] not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )

    # 4. Return minimal trusted context
    return {
        "id": user.id,
        "role": profile["role"],
        "email": user.email
    }
