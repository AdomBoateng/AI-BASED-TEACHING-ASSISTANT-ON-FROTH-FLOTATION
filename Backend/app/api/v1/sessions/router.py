from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import auth_guard
from app.db.supabase import get_supabase
from app.models.models import VideoToggle, SessionModeUpdate

router = APIRouter(prefix="/sessions", tags=["Sessions"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/")  # ✅ FIX: must be "/" not ""
def create_session(user=Depends(auth_guard)):
    """Create a new chat session (frontend-friendly). Default mode is learn."""
    supabase = get_supabase()
    ins = supabase.table("sessions").insert({
        "user_id": user["id"],
        "current_mode": "learn",
        "prefers_video": False,
        "started_at": _now_iso(),
    }).execute()

    if not ins.data:
        raise HTTPException(status_code=500, detail="Failed to create session")

    row = ins.data[0]
    return {
        "session_id": row["id"],
        "current_mode": row["current_mode"],
        "prefers_video": row["prefers_video"],
        "started_at": row.get("started_at"),
    }


@router.get("/{session_id}")
def get_session(session_id: str, user=Depends(auth_guard)):
    supabase = get_supabase()
    res = (
        supabase.table("sessions")
        .select("id,user_id,current_mode,prefers_video,started_at,ended_at")
        .eq("id", session_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")

    row = res.data[0]
    if row["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    return {
        "session_id": row["id"],
        "current_mode": row["current_mode"],
        "prefers_video": row["prefers_video"],
        "started_at": row.get("started_at"),
        "ended_at": row.get("ended_at"),
    }


@router.patch("/{session_id}/mode")
def set_session_mode(session_id: str, payload: SessionModeUpdate, user=Depends(auth_guard)):
    """
    Update the session-level mode used by the UI (learn/practice/review).
    IMPORTANT: If switching to review, force prefers_video = false (review is text-only).
    """
    mode = (payload.current_mode or "").lower().strip()
    if mode not in ("learn", "practice", "review"):
        raise HTTPException(status_code=400, detail="current_mode must be learn|practice|review")

    supabase = get_supabase()
    res = supabase.table("sessions").select("id,user_id,prefers_video").eq("id", session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    if res.data[0]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    update_payload = {"current_mode": mode}

    # ✅ Enforce policy: review mode cannot be video
    if mode == "review":
        update_payload["prefers_video"] = False

    supabase.table("sessions").update(update_payload).eq("id", session_id).execute()

    # Return merged state for frontend convenience
    prefers_video = False if mode == "review" else res.data[0].get("prefers_video", False)
    if "prefers_video" in update_payload:
        prefers_video = update_payload["prefers_video"]

    return {"session_id": session_id, "current_mode": mode, "prefers_video": prefers_video}


@router.patch("/{session_id}/video")
def set_video_preference(session_id: str, payload: VideoToggle, user=Depends(auth_guard)):
    """
    Tick/untick video responses for THIS session only.
    Enforce: if session is in review mode, video must stay false.
    """
    supabase = get_supabase()

    res = (
        supabase.table("sessions")
        .select("id,user_id,current_mode,prefers_video")
        .eq("id", session_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")

    row = res.data[0]
    if row["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    # ✅ Enforce policy: review is text-only
    if row["current_mode"] == "review" and payload.prefers_video:
        raise HTTPException(status_code=400, detail="Review mode is text-only. Video responses are disabled.")

    supabase.table("sessions").update({"prefers_video": payload.prefers_video}).eq("id", session_id).execute()
    return {"session_id": session_id, "prefers_video": payload.prefers_video}


@router.post("/{session_id}/end")
def end_session(session_id: str, user=Depends(auth_guard)):
    """End a chat session (sets ended_at)."""
    supabase = get_supabase()

    res = supabase.table("sessions").select("id,user_id").eq("id", session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    if res.data[0]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    supabase.table("sessions").update({"ended_at": _now_iso()}).eq("id", session_id).execute()
    return {"session_id": session_id, "status": "ended", "ended_at": _now_iso()}
