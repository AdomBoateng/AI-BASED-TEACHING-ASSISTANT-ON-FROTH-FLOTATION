from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import auth_guard
from app.db.supabase import get_supabase
from app.models.models import AvatarSelectRequest

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/avatar")
def select_avatar(payload: AvatarSelectRequest, user=Depends(auth_guard)):
    supabase = get_supabase()

    b = (
        supabase.table("avatar_voice_bundles")
        .select("*")
        .eq("avatar_id", payload.avatar_id)
        .eq("is_active", True)
        .execute()
    )
    if not b.data:
        raise HTTPException(status_code=400, detail="Invalid avatar selection")

    bundle = b.data[0]

    supabase.table("users").update({
        "avatar_id": bundle["avatar_id"],
        "avatar_provider": bundle.get("avatar_provider", "d-id"),
        "avatar_gender": bundle["avatar_gender"],
        "voice_provider": bundle.get("voice_provider", "elevenlabs"),
        "voice_id": bundle["voice_id"],
        "voice_gender": bundle["voice_gender"],
    }).eq("id", user["id"]).execute()

    return {
        "status": "ok",
        "avatar_id": bundle["avatar_id"],
        "voice_id": bundle["voice_id"],
        "did_presenter_id": bundle["did_presenter_id"],
    }