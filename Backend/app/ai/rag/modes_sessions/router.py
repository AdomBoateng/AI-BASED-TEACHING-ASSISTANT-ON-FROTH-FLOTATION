from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import auth_guard
from app.core.chat_repo import response_format_for_mode, log_conversation
from app.db.supabase import get_supabase
from app.media.video_service import maybe_generate_video
from app.models.models import ModeSessionStartRequest, ModeSessionTurnRequest

from .service import (
    generate_review_item,
    evaluate_review_answer,
    format_review_prompt,
    adjust_difficulty,
    generate_practice_scenario,
    evaluate_practice_answer,
    format_practice_prompt,
)

router = APIRouter(prefix="/mode-sessions", tags=["Mode Sessions"])


# -------------------------
# Helpers
# -------------------------

def _ensure_chat_session_ownership(session_id: str, user_id: str, default_mode: str = "learn"):
    """
    Ensures the chat session exists and belongs to the user.
    If it doesn't exist, create it (UX-friendly for Swagger testing).
    """
    supabase = get_supabase()
    s = (
        supabase.table("sessions")
        .select("id,user_id,prefers_video,current_mode")
        .eq("id", session_id)
        .execute()
    )

    # No rows -> create session
    if not s.data:
        supabase.table("sessions").insert({
            "id": session_id,
            "user_id": user_id,
            "current_mode": default_mode,
            "prefers_video": False
        }).execute()
        return

    # Multiple rows should never happen, but handle safely
    row = s.data[0]
    if row["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")



def _ensure_mode_session_ownership(mode_session_id: str, user_id: str):
    supabase = get_supabase()
    ms = (
        supabase.table("mode_sessions")
        .select("*")
        .eq("id", mode_session_id)
        .single()
        .execute()
    )
    if not ms.data:
        raise HTTPException(status_code=404, detail="Mode session not found")
    if ms.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return ms.data


# -------------------------
# Start endpoint
# -------------------------

@router.post("/start")
async def start_mode_session(payload: ModeSessionStartRequest, user=Depends(auth_guard)):
    supabase = get_supabase()

    mode = payload.mode.lower().strip()
    stype = payload.session_type.lower().strip()
    difficulty = payload.difficulty.strip().title()

    if mode not in ("practice", "review"):
        raise HTTPException(status_code=400, detail="mode must be practice or review")

    _ensure_chat_session_ownership(payload.session_id, user["id"], default_mode=mode)

    # Enforced policy: review is always text-only
    response_format = response_format_for_mode(payload.session_id, mode)

    # Create mode_session row
    ms = (
        supabase.table("mode_sessions")
        .insert({
            "session_id": payload.session_id,
            "user_id": user["id"],
            "mode": mode,
            "session_type": stype,
            "difficulty": difficulty,
            "total_items": (payload.total_items or 10) if mode == "review" else 3,
            "current_item": 1,
            "completed": False
        })
        .execute()
    )
    mode_session_id = ms.data[0]["id"]

    # Generate first item and store state keyed by mode_session_id
    if mode == "review":
        item, contexts = await generate_review_item(session_type=stype, difficulty=difficulty)
        prompt_text = format_review_prompt(item)

        supabase.table("session_state").upsert({
            "session_id": payload.session_id,
            "mode_session_id": mode_session_id,
            "pending_mode": "review",
            "pending_payload": item,
            "step": 1,
            "total_steps": 1,
            "difficulty": difficulty,
            "contexts": contexts
        }).execute()

        # Log start prompt (review text-only)
        log_conversation(
            session_id=payload.session_id,
            user_id=user["id"],
            mode="review",
            user_input=f"(system) start review [{stype}]",
            tutor_response=prompt_text,
            response_format="text",
            video_url=None
        )

        return {
            "mode_session_id": mode_session_id,
            "mode": "review",
            "session_type": stype,
            "difficulty": difficulty,
            "prompt": prompt_text,
            "response_format": "text",
            "video_url": None
        }

    # Practice start (video allowed)
    scenario, contexts = await generate_practice_scenario(session_type=stype, difficulty=difficulty)
    prompt_text = format_practice_prompt(scenario, step=1)

    supabase.table("session_state").upsert({
        "session_id": payload.session_id,
        "mode_session_id": mode_session_id,
        "pending_mode": "practice",
        "pending_payload": scenario,
        "step": 1,
        "total_steps": 3,
        "difficulty": difficulty,
        "contexts": contexts
    }).execute()

    delivery = await maybe_generate_video(prompt_text, response_format)

    log_conversation(
        session_id=payload.session_id,
        user_id=user["id"],
        mode="practice",
        user_input=f"(system) start practice [{stype}]",
        tutor_response=prompt_text,
        response_format=response_format,
        video_url=delivery.get("video_url")
    )

    return {
        "mode_session_id": mode_session_id,
        "mode": "practice",
        "session_type": stype,
        "difficulty": difficulty,
        "prompt": prompt_text,
        **delivery
    }


# -------------------------
# Turn endpoint
# -------------------------

@router.post("/{mode_session_id}/turn")
async def mode_session_turn(mode_session_id: str, payload: ModeSessionTurnRequest, user=Depends(auth_guard)):
    supabase = get_supabase()

    ms = _ensure_mode_session_ownership(mode_session_id, user["id"])
    session_id = ms["session_id"]
    mode = ms["mode"]
    stype = ms["session_type"]

    # Enforce policy: review is text-only; learn/practice follow session prefers_video
    response_format = response_format_for_mode(session_id, mode)

    st = (
        supabase.table("session_state")
        .select("*")
        .eq("mode_session_id", mode_session_id)
        .single()
        .execute()
    )
    if not st.data:
        raise HTTPException(status_code=409, detail="No active state for this mode session. Start again.")

    student_answer = payload.message.strip()
    if not student_answer:
        raise HTTPException(status_code=400, detail="message cannot be empty")

    pending_payload = st.data["pending_payload"]
    contexts = st.data.get("contexts") or []
    step = int(st.data.get("step", 1))
    total_steps = int(st.data.get("total_steps", 1))

    # -------------------------
    # PRACTICE
    # -------------------------
    if mode == "practice":
        eval_out = await evaluate_practice_answer(
            scenario=pending_payload,
            step=step,
            student_answer=student_answer,
            contexts=contexts
        )

        feedback_text = (
            f"Verdict: {eval_out['verdict']}\n"
            f"Score: {eval_out['score']}\n"
            f"Feedback: {eval_out['feedback']}"
        )

        delivery_eval = await maybe_generate_video(feedback_text, response_format)
        log_conversation(
            session_id=session_id,
            user_id=user["id"],
            mode="practice",
            user_input=student_answer,
            tutor_response=feedback_text,
            response_format=response_format,
            video_url=delivery_eval.get("video_url")
        )

        # next guided question?
        if step < total_steps:
            next_step = step + 1
            next_prompt = format_practice_prompt(pending_payload, next_step)

            supabase.table("session_state").update({"step": next_step}).eq("mode_session_id", mode_session_id).execute()
            supabase.table("mode_sessions").update({"current_item": next_step}).eq("id", mode_session_id).execute()

            delivery_next = await maybe_generate_video(next_prompt, response_format)
            log_conversation(
                session_id=session_id,
                user_id=user["id"],
                mode="practice",
                user_input="(system) next guided question",
                tutor_response=next_prompt,
                response_format=response_format,
                video_url=delivery_next.get("video_url")
            )

            return {
                "mode": "practice",
                "type": "evaluation",
                "evaluation": eval_out,
                "next_prompt": next_prompt,
                "delivery": delivery_eval,
                "next_delivery": delivery_next
            }

        # finished scenario (auto-end)
        key_points = pending_payload.get("key_learning_points", [])
        key_text = "Key Learning Points: " + " | ".join(key_points) if key_points else "Practice scenario completed."

        delivery_key = await maybe_generate_video(key_text, response_format)
        log_conversation(
            session_id=session_id,
            user_id=user["id"],
            mode="practice",
            user_input="(system) scenario complete",
            tutor_response=key_text,
            response_format=response_format,
            video_url=delivery_key.get("video_url")
        )

        supabase.table("mode_sessions").update({"completed": True, "ended_at": "now()"}).eq("id", mode_session_id).execute()
        supabase.table("session_state").delete().eq("mode_session_id", mode_session_id).execute()

        return {
            "mode": "practice",
            "type": "completed",
            "evaluation": eval_out,
            "key_learning_points": key_points,
            "summary": key_text,
            "delivery": delivery_eval,
            "key_delivery": delivery_key
        }

    # -------------------------
    # REVIEW (text-only)
    # -------------------------
    # No video generation here by design.
    difficulty = ms["difficulty"]
    total_items = int(ms.get("total_items") or 10)
    current_item = int(ms.get("current_item") or 1)

    eval_out = await evaluate_review_answer(
        item=pending_payload,
        student_answer=student_answer,
        contexts=contexts
    )

    score = float(eval_out.get("score", 0.0))
    next_difficulty = adjust_difficulty(difficulty, score)

    feedback_text = (
        f"Verdict: {eval_out['verdict']}\n"
        f"Score: {eval_out['score']}\n"
        f"Rubric: {eval_out.get('rubric_level','')}\n"
        f"Feedback: {eval_out['feedback']}"
    )

    log_conversation(
        session_id=session_id,
        user_id=user["id"],
        mode="review",
        user_input=student_answer,
        tutor_response=feedback_text,
        response_format="text",
        video_url=None
    )

    # Auto-end when done
    if current_item >= total_items:
        supabase.table("mode_sessions").update({"completed": True, "ended_at": "now()"}).eq("id", mode_session_id).execute()
        supabase.table("session_state").delete().eq("mode_session_id", mode_session_id).execute()

        return {
            "mode": "review",
            "type": "completed",
            "evaluation": eval_out,
            "response_format": "text",
            "video_url": None
        }

    # Next question
    item2, ctx2 = await generate_review_item(session_type=stype, difficulty=next_difficulty)
    next_prompt = format_review_prompt(item2)

    supabase.table("session_state").upsert({
        "mode_session_id": mode_session_id,
        "pending_mode": "review",
        "pending_payload": item2,
        "step": 1,
        "total_steps": 1,
        "difficulty": next_difficulty,
        "contexts": ctx2
    }).execute()

    supabase.table("mode_sessions").update({
        "difficulty": next_difficulty,
        "current_item": current_item + 1
    }).eq("id", mode_session_id).execute()

    log_conversation(
        session_id=session_id,
        user_id=user["id"],
        mode="review",
        user_input="(system) next question",
        tutor_response=next_prompt,
        response_format="text",
        video_url=None
    )

    return {
        "mode": "review",
        "type": "evaluation",
        "evaluation": eval_out,
        "next_prompt": next_prompt,
        "next_difficulty": next_difficulty,
        "response_format": "text",
        "video_url": None
    }


# -------------------------
# End endpoint
# -------------------------

@router.post("/{mode_session_id}/end")
async def end_mode_session(mode_session_id: str, user=Depends(auth_guard)):
    supabase = get_supabase()
    _ensure_mode_session_ownership(mode_session_id, user["id"])

    supabase.table("mode_sessions").update({"completed": True, "ended_at": "now()"}).eq("id", mode_session_id).execute()
    supabase.table("session_state").delete().eq("mode_session_id", mode_session_id).execute()

    return {"mode_session_id": mode_session_id, "status": "ended"}
