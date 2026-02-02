from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
import os
from pathlib import Path

load_dotenv()

client = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY"),
)

AUDIO_DIR = Path("audio")
AUDIO_DIR.mkdir(exist_ok=True)


def generate_tts(text: str, filename: str = "speech.mp3") -> Path:
    """
    Generate TTS audio and save to disk
    """
    output_path = AUDIO_DIR / filename

    audio = client.text_to_speech.convert(
        text=text,
        voice_id="l30f87tf05uxyknGdDw6",
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )

    with open(output_path, "wb") as f:
        for chunk in audio:
            f.write(chunk)

    return output_path