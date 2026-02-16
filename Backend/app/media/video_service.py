from typing import Dict, Optional
from app.media.text_cleaner import clean_for_tts

async def maybe_generate_video(text: str, response_format: str) -> Dict[str, Optional[str]]:
    """
    If response_format == 'video', clean text for TTS and (later) run ElevenLabs -> D-ID.
    For now returns a graceful fallback with cleaned_text.
    """
    if response_format != "video":
        return {"response_format": "text", "video_url": None}

    cleaned = clean_for_tts(text)

    # TODO (paid-ready):
    # 1) ElevenLabs TTS -> audio bytes
    # 2) Upload audio to S3/public URL
    # 3) D-ID create talk using avatar_id + audio URL
    # 4) Return video_url

    return {"response_format": "video", "video_url": None, "cleaned_text": cleaned}
