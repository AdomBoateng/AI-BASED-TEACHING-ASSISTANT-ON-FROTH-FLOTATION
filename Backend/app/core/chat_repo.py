from __future__ import annotations

from typing import List, Optional
from uuid import UUID
from app.db.supabase import get_async_supabase


async def ensure_session(
    session_id: str, user_id: str, current_mode: str = "learn"
) -> None:
    try:
        UUID(str(session_id))
    except (ValueError, TypeError):
        raise ValueError("Invalid session_id format. Expected UUID.")

    supabase = await get_async_supabase()
    res = (
        await supabase.table("sessions")
        .select("id,user_id")
        .eq("id", session_id)
        .execute()
    )

    if not res.data:
        await supabase.table("sessions").insert(
            {
                "id": session_id,
                "user_id": user_id,
                "current_mode": current_mode,
                "prefers_video": False,
            }
        ).execute()
        return

    # Ownership check
    row = res.data[0]
    if row.get("user_id") and row["user_id"] != user_id:
        raise PermissionError("Session does not belong to user")


async def get_session_prefers_video(session_id: str) -> bool:
    supabase = await get_async_supabase()
    res = await (
        supabase.table("sessions")
        .select("prefers_video")
        .eq("id", session_id)
        .execute()
    )
    if not res.data:
        return False
    return bool(res.data[0].get("prefers_video"))


async def response_format_for_mode(session_id: str, mode: str) -> str:
    mode = (mode or "").lower().strip()
    if mode == "review":
        return "text"
    return "video" if await get_session_prefers_video(session_id) else "text"


async def load_memory(session_id: str, limit_pairs: int = 6) -> List[str]:
    supabase = await get_async_supabase()
    # Order by created_at descending to get latest, then reverse for the memory loop
    history = await (
        supabase.table("conversations")
        .select("user_input, tutor_response")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .limit(limit_pairs)
        .execute()
    )

    mem: List[str] = []
    # Data is in descending order, we want to process it so the output is ascending chronological
    for row in reversed(history.data):
        mem.append(f"user: {row['user_input']}")
        mem.append(f"assistant: {row['tutor_response']}")
    return mem


async def log_conversation(
    session_id: str,
    user_id: str,
    mode: str,
    user_input: str,
    tutor_response: str,
    response_format: str,
    video_url: Optional[str] = None,
    audio_url: Optional[str] = None,
) -> None:
    supabase = await get_async_supabase()
    payload = {
        "session_id": session_id,
        "user_id": user_id,
        "mode": mode,
        "user_input": user_input,
        "tutor_response": tutor_response,
        "response_format": response_format,
        "video_url": video_url,
        "audio_url": audio_url,
    }
    await supabase.table("conversations").insert(payload).execute()
