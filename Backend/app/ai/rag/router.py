from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import create_client
import os
import json

from .service import query_rag
from app.core.auth import auth_guard

router = APIRouter(prefix="/rag", tags=["RAG"])

supabase = create_client(
    os.getenv("SUPABASE_URL", "https://fdqilmfldmzqynpvyiql.supabase.co"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkcWlsbWZsZG16cXlucHZ5aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDAwMzI1MywiZXhwIjoyMDg1NTc5MjUzfQ.fzfAQrDACv1J4cItbI2F5Em-D-bAfq_gF-y75jLxmBg")
)


# ==========================
# Request Model
# ==========================

class QueryRequest(BaseModel):
    session_id: str
    message: str
    mode: str  # learn | practice | review
    response_format: str  # text | video


# ==========================
# ROUTE
# ==========================

@router.post("/query")
async def query(request: QueryRequest, user=Depends(auth_guard)):

    # 1️⃣ Ensure session exists
    session_check = supabase.table("sessions") \
        .select("id") \
        .eq("id", request.session_id) \
        .execute()
    
    if not session_check.data:
        if request.response_format == "video":
            # Auto-create session with prefers_video=True if not exist
            supabase.table("sessions").insert({
                "id": request.session_id,
                "user_id": user["id"],
                "prefers_video": True,
                "current_mode": request.mode
            }).execute()
        else:
            # Auto-create session with prefers_video=False if not exist
            supabase.table("sessions").insert({
                "id": request.session_id,
                "user_id": user["id"],
                "prefers_video": False,
                "current_mode": request.mode
            }).execute()
        
    # 2️⃣ Load memory
    history = supabase.table("conversations") \
        .select("user_input, tutor_response") \
        .eq("session_id", request.session_id) \
        .order("created_at") \
        .execute()

    memory = []
    for row in history.data:
        memory.append(f"user: {row['user_input']}")
        memory.append(f"assistant: {row['tutor_response']}")

    # 3️⃣ Run RAG
    result = await query_rag(
        user_message=request.message,
        mode=request.mode,
        memory=memory
    )

    # 4️⃣ Determine tutor_response content
    if request.mode == "review":
        # Keep structured grading internally
        tutor_response = result  # JSON dict
    else:
        tutor_response = result["response"]

    # 5️⃣ Save conversation
    supabase.table("conversations").insert({
        "session_id": request.session_id,
        "user_id": user["id"],
        "mode": request.mode,
        "user_input": request.message,
        "tutor_response": str(tutor_response),
        "response_format": request.response_format  # text or video
    }).execute()

    return result