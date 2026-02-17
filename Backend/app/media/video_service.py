# app/media/video_service.py
import os
from fastapi import HTTPException
from app.db.supabase import get_supabase
from app.media.text_cleaner import clean_for_tts
from app.media.tts_service import tts_to_mp3_bytes
from app.media.storage_service import upload_audio_and_get_url
from app.media.did_service import create_talk_from_audio

async def maybe_generate_video(
    *,
    text: str,
    response_format: str,
    user_id: str,
    session_id: str,
    mode: str,
):
    """
    Rules:
    - Only learn/practice may return video
    - review ALWAYS returns text (enforced here)
    - voice_id + presenter_id pulled from DB bundle
    """

    # Policy: review text-only
    if mode == "review":
        return {"response_format": "text", "video_url": None, "audio_url": None}

    # Default is text unless explicitly video
    if response_format != "video":
        return {"response_format": "text", "video_url": None, "audio_url": None}

    supabase = get_supabase()

    # Load user profile (avatar + bundled voice)
    u = (
        supabase.table("users")
        .select("avatar_id,voice_id,avatar_gender,voice_gender")
        .eq("id", user_id)
        .execute()
    )
    if not u.data:
        raise HTTPException(status_code=404, detail="User profile not found")

    avatar_id = u.data[0].get("avatar_id")
    voice_id = u.data[0].get("voice_id")

    if not avatar_id or not voice_id:
        raise HTTPException(
            status_code=400,
            detail="User must select an avatar before using video responses."
        )

    # Resolve presenter_id from bundle
    b = (
        supabase.table("avatar_voice_bundles")
        .select("did_presenter_id,is_active")
        .eq("avatar_id", avatar_id)
        .eq("is_active", True)
        .execute()
    )
    if not b.data:
        raise HTTPException(status_code=400, detail="Avatar bundle not configured")

    presenter_id = b.data[0]["did_presenter_id"]

    # Clean text for TTS (remove emojis/markdown)
    clean = clean_for_tts(text)
    if not clean:
        return {"response_format": "text", "video_url": None, "audio_url": None}

    # ElevenLabs TTS
    mp3 = tts_to_mp3_bytes(clean, voice_id=voice_id)

    # Upload MP3 to Supabase Storage -> URL
    audio_url = upload_audio_and_get_url(user_id, session_id, mp3)

    # Create D-ID talk from audio using presenter_id
    talk = create_talk_from_audio(
        presenter_id=presenter_id,
        audio_url=audio_url,
        title=f"{mode} response"
    )

    # D-ID returns id immediately; video URL may need polling later
    talk_id = talk.get("id") or talk.get("url")

    return {
        "response_format": "video",
        "audio_url": audio_url,
        "video_url": talk_id
    }
