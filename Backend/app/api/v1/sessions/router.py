from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import auth_guard
from app.db.supabase import get_supabase
from app.models.models import VideoToggle

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.patch("/{session_id}/video")
async def set_video_preference(session_id: str, payload: VideoToggle, user=Depends(auth_guard)):
    supabase = get_supabase()

    res = (
        supabase.table("sessions")
        .select("id,user_id,prefers_video")
        .eq("id", session_id)
        .single()
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")

    if res.data["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    (
        supabase.table("sessions")
        .update({"prefers_video": payload.prefers_video})
        .eq("id", session_id)
        .execute()
    )

    return {"session_id": session_id, "prefers_video": payload.prefers_video}
