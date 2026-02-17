from openai import OpenAI
import os
import tempfile
from app.config import load_env

load_env()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def transcribe_audio(file_bytes: bytes, filename: str) -> str:
    # Write to temp file because OpenAI expects a file-like object
    suffix = "." + (filename.split(".")[-1] if "." in filename else "wav")
    with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp.flush()

        with open(tmp.name, "rb") as f:
            # OpenAI Whisper STT
            out = client.audio.transcriptions.create(
                model="gpt-4o-mini-transcribe",  # fast + good
                file=f
            )
    return out.text.strip()
