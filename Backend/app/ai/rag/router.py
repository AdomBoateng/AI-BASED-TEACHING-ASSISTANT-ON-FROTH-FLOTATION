from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.core.auth import auth_guard
from app.core.chat_repo import (
    ensure_session,
    load_memory,
    log_conversation,
    response_format_for_mode,
)
from app.db.supabase import get_supabase
from app.media.video_service import maybe_generate_video
from app.media.stt_service import transcribe_audio
from app.models.models import RagTurnRequest
from .service import query_rag

router = APIRouter(prefix="/rag", tags=["RAG"])


def _set_session_mode(session_id: str, user_id: str, mode: str) -> None:
    """
    Keeps sessions.current_mode consistent with actual usage.
    Also enforces ownership.
    """
    supabase = get_supabase()
    res = supabase.table("sessions").select("id,user_id,current_mode").eq("id", session_id).execute()
    if not res.data:
        # session doesn't exist, ensure_session will create it
        return
    row = res.data[0]
    if row["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    if row.get("current_mode") != mode:
        supabase.table("sessions").update({"current_mode": mode}).eq("id", session_id).execute()


@router.post("/turn")
async def rag_turn(payload: RagTurnRequest, user=Depends(auth_guard)):
    # Enforce learn-only
    mode = (payload.mode or "learn").lower().strip()
    if mode != "learn":
        raise HTTPException(
            status_code=400,
            detail="Practice/Review are handled by /mode-sessions. Use mode='learn' here."
        )

    # Ensure session exists (Swagger-friendly) and belongs to user
    ensure_session(payload.session_id, user["id"], current_mode="learn")
    _set_session_mode(payload.session_id, user["id"], "learn")

    # Load memory for conversational grounding
    memory = load_memory(payload.session_id)

    # RAG query
    result = await query_rag(
        user_message=payload.message,
        mode="learn",
        memory=memory
    )
    tutor_text = result["response"]

    # Session-level video toggle
    response_format = response_format_for_mode(payload.session_id, "learn")

    # Text -> (optional) video pipeline
    delivery = await maybe_generate_video(
        text=tutor_text,
        response_format=response_format,
        user_id=user["id"],
        session_id=payload.session_id,
        mode="learn"
    )

    # Log full turn (✅ now logs audio_url too)
    log_conversation(
        session_id=payload.session_id,
        user_id=user["id"],
        mode="learn",
        user_input=payload.message,
        tutor_response=tutor_text,
        response_format=delivery.get("response_format", "text"),
        video_url=delivery.get("video_url"),
        audio_url=delivery.get("audio_url"),
    )

    return {
        "mode": "learn",
        "response": tutor_text,
        **delivery
    }


@router.post("/turn/voice")
async def rag_turn_voice(
    session_id: str,
    file: UploadFile = File(...),
    user=Depends(auth_guard),
):
    """
    Voice input for Learn mode: STT -> same /rag/turn logic.
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio upload")

    transcript = transcribe_audio(audio_bytes, file.filename)

    payload = RagTurnRequest(session_id=session_id, mode="learn", message=transcript)
    out = await rag_turn(payload, user)
    out["transcript"] = transcript
    return out
