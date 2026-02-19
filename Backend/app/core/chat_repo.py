from __future__ import annotations

from typing import List, Optional
from app.db.supabase import get_supabase


def ensure_session(session_id: str, user_id: str, current_mode: str = "learn") -> None:
    supabase = get_supabase()
    res = supabase.table("sessions").select("id,user_id").eq("id", session_id).execute()
    if not res.data:
        supabase.table("sessions").insert({
            "id": session_id,
            "user_id": user_id,
            "current_mode": current_mode,
            "prefers_video": False,
        }).execute()
        return

    # Ownership check (helps Swagger testing too)
    row = res.data[0]
    if row.get("user_id") and row["user_id"] != user_id:
        raise PermissionError("Session does not belong to user")


def get_session_prefers_video(session_id: str) -> bool:
    """
    Avoid .single() to prevent PGRST116 when 0 rows.
    """
    supabase = get_supabase()
    res = (
        supabase.table("sessions")
        .select("prefers_video")
        .eq("id", session_id)
        .execute()
    )
    if not res.data:
        return False
    return bool(res.data[0].get("prefers_video"))


def response_format_for_mode(session_id: str, mode: str) -> str:
    """
    Enforce:
    - review is text-only
    - learn/practice follow sessions.prefers_video
    """
    mode = (mode or "").lower().strip()
    if mode == "review":
        return "text"
    return "video" if get_session_prefers_video(session_id) else "text"


def load_memory(session_id: str, limit_pairs: int = 6) -> List[str]:
    supabase = get_supabase()
    history = (
        supabase.table("conversations")
        .select("user_input, tutor_response")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    mem: List[str] = []
    for row in history.data:
        mem.append(f"user: {row['user_input']}")
        mem.append(f"assistant: {row['tutor_response']}")
    return mem[-(limit_pairs * 2):]


def log_conversation(
    session_id: str,
    user_id: str,
    mode: str,
    user_input: str,
    tutor_response: str,
    response_format: str,
    video_url: Optional[str] = None,
    audio_url: Optional[str] = None,  # ✅ NEW
) -> None:
    supabase = get_supabase()
    payload = {
        "session_id": session_id,
        "user_id": user_id,
        "mode": mode,
        "user_input": user_input,
        "tutor_response": tutor_response,
        "response_format": response_format,
        "video_url": video_url,
        "audio_url": audio_url,  # ✅ store audio URL for tracing
    }
    supabase.table("conversations").insert(payload).execute()