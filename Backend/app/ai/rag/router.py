from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import auth_guard
from app.core.chat_repo import ensure_session, load_memory, log_conversation, response_format_for_mode
from app.media.video_service import maybe_generate_video
from app.models.models import RagTurnRequest
from .service import query_rag

router = APIRouter(prefix="/rag", tags=["RAG"])

@router.post("/turn")
async def rag_turn(payload: RagTurnRequest, user=Depends(auth_guard)):
    mode = (payload.mode or "learn").lower().strip()
    if mode != "learn":
        raise HTTPException(
            status_code=400,
            detail="Practice/Review are handled by /mode-sessions. Use mode='learn' here."
        )

    ensure_session(payload.session_id, user["id"], current_mode="learn")
    memory = load_memory(payload.session_id)

    result = await query_rag(
        user_message=payload.message,
        mode="learn",
        memory=memory
    )
    tutor_text = result["response"]

    response_format = response_format_for_mode(payload.session_id, "learn")
    delivery = await maybe_generate_video(tutor_text, response_format)

    log_conversation(
        session_id=payload.session_id,
        user_id=user["id"],
        mode="learn",
        user_input=payload.message,
        tutor_response=tutor_text,
        response_format=response_format,
        video_url=delivery.get("video_url"),
    )

    return {"mode": "learn", "response": tutor_text, **delivery}