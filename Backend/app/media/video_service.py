# app/media/video_service.py
from __future__ import annotations

import logging
from fastapi import HTTPException
from app.db.supabase import get_supabase
from app.media.text_cleaner import clean_for_tts
from app.media.tts_service import tts_to_mp3_bytes
from app.media.storage_service import upload_audio_and_get_url
from app.media.did_service import create_clip_from_audio

logger = logging.getLogger(__name__)


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
    - review ALWAYS returns text
    - voice_id + presenter_id pulled from DB bundle (prevents gender mismatch)
    """

    mode = (mode or "").lower().strip()

    # Policy: review text-only
    if mode == "review":
        return {"response_format": "text", "video_url": None, "audio_url": None}

    # Default is text unless explicitly video
    if response_format != "video":
        return {"response_format": "text", "video_url": None, "audio_url": None}

    supabase = get_supabase()

    # Load user profile (avatar + voice)
    u = (
        supabase.table("users")
        .select("avatar_id,voice_id,avatar_gender,voice_gender")
        .eq("id", user_id)
        .execute()
    )
    if not u.data:
        raise HTTPException(status_code=404, detail="User profile not found")

    user_row = u.data[0]
    avatar_id = user_row.get("avatar_id")
    voice_id = user_row.get("voice_id")
    avatar_gender = user_row.get("avatar_gender")
    voice_gender = user_row.get("voice_gender")

    if not avatar_id or not voice_id:
        raise HTTPException(
            status_code=400,
            detail="User must select an avatar (with bundled voice) before using video responses."
        )

    # Resolve presenter_id + canonical voice pairing from bundle
    b = (
        supabase.table("avatar_voice_bundles")
        .select("did_presenter_id,is_active,avatar_gender,voice_gender,voice_id")
        .eq("avatar_id", avatar_id)
        .eq("is_active", True)
        .execute()
    )
    if not b.data:
        raise HTTPException(status_code=400, detail="Avatar bundle not configured or inactive")

    bundle = b.data[0]
    presenter_id = bundle["did_presenter_id"]
    
    # Validate presenter_id
    if not presenter_id or not isinstance(presenter_id, str) or not presenter_id.strip():
        raise HTTPException(
            status_code=500, 
            detail=f"Invalid presenter_id in database: {presenter_id!r}"
        )

    # Extra safety: prevent gender mismatch if profile fields are missing/wrong
    bundle_avatar_gender = bundle.get("avatar_gender")
    bundle_voice_gender = bundle.get("voice_gender")
    bundle_voice_id = bundle.get("voice_id")

    # Bundle voice is canonical pairing (prevents female voice on male avatar, etc.)
    if bundle_voice_id and bundle_voice_id != voice_id:
        voice_id = bundle_voice_id

    if avatar_gender and bundle_avatar_gender and avatar_gender != bundle_avatar_gender:
        raise HTTPException(status_code=400, detail="Avatar gender mismatch vs bundle configuration")

    if voice_gender and bundle_voice_gender and voice_gender != bundle_voice_gender:
        raise HTTPException(status_code=400, detail="Voice gender mismatch vs bundle configuration")

    # Clean text for TTS (remove emojis/markdown/special chars)
    clean = clean_for_tts(text)
    if not clean:
        return {"response_format": "text", "video_url": None, "audio_url": None}

    # ElevenLabs TTS -> MP3 bytes
    mp3 = tts_to_mp3_bytes(clean, voice_id=voice_id)

    # Upload MP3 to Supabase Storage -> public/signed URL
    audio_url = upload_audio_and_get_url(user_id, session_id, mp3)
    
    # Validate audio_url is accessible
    if not audio_url or not audio_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=500,
            detail=f"Invalid audio_url generated: {audio_url!r}"
        )
    
    logger.info(f"Creating D-ID talk with presenter_id={presenter_id!r}, audio_url={audio_url!r}")

    # Create D-ID talk from audio using presenter_id
    # NOTE: create_talk_from_audio now returns:
    clip = create_clip_from_audio(
    presenter_id=presenter_id,
    audio_url=audio_url,
    title=f"{mode} response",
    timeout_seconds=360,
)

    # try common fields; keep entire payload as fallback
    video_url = clip.get("result_url") or clip.get("resultUrl") or clip.get("url") or clip.get("result")
    return {
        "response_format": "video",
        "audio_url": audio_url,
        "video_url": video_url,
        "did_payload": clip,  # optional: keep for debugging
    }