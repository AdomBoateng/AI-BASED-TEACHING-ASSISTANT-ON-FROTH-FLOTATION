from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import auth_guard
from app.db.supabase import get_supabase
from app.models.models import SessionSurveyPayload, UserFeedbackPayload

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("/session-survey")
def submit_session_survey(payload: SessionSurveyPayload, user=Depends(auth_guard)):
    supabase = get_supabase()
    # basic ownership check
    s = supabase.table("sessions").select("id,user_id").eq("id", payload.session_id).execute()
    if not s.data:
        raise HTTPException(status_code=404, detail="Session not found")
    if s.data[0]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    ins = supabase.table("session_surveys").insert({
        "session_id": payload.session_id,
        "user_id": user["id"],
        "clarity_rating": payload.clarity_rating,
        "helpfulness_rating": payload.helpfulness_rating,
        "confidence_rating": payload.confidence_rating,
        "overall_rating": payload.overall_rating,
    }).execute()
    return {"status": "ok", "id": ins.data[0]["id"] if ins.data else None}

@router.post("/user-feedback")
def submit_user_feedback(payload: UserFeedbackPayload, user=Depends(auth_guard)):
    supabase = get_supabase()
    if payload.session_id:
        s = supabase.table("sessions").select("id,user_id").eq("id", payload.session_id).execute()
        if not s.data:
            raise HTTPException(status_code=404, detail="Session not found")
        if s.data[0]["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not allowed")

    ins = supabase.table("user_feedback").insert({
        "user_id": user["id"],
        "session_id": payload.session_id,
        "feedback_type": payload.feedback_type,
        "message": payload.message,
    }).execute()
    return {"status": "ok", "id": ins.data[0]["id"] if ins.data else None}