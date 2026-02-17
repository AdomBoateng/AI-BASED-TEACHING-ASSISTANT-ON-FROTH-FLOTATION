import os
import requests
import time
from app.config import load_env

load_env()

DID_API_KEY = os.getenv("DID_API_KEY")
DID_BASE = os.getenv("DID_BASE_URL")

headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "authorization": f"Basic {DID_API_KEY}",
}

def create_talk_from_audio(presenter_id: str, audio_url: str, title: str = None) -> str:
    # https://docs.d-id.com/reference/talks-api
    payload = {
        "presenter_id": presenter_id,
        "script": {
            "type": "audio",
            "audio_url": audio_url
        },
        "config": {
            "stitch": True,         # REQUIRED: Matches high-res head to background for crispness
            "fluent": True,         # Smoother lip-sync transitions
            "pad_audio": 0.5,       # Natural buffer for the teacher's speech
            "result_format": "mp4",
        }
    }

    r = requests.post(DID_BASE, json=payload, headers=headers, timeout=60)
    r.raise_for_status()
    data = r.json()
    video_id = data.get("id") or data.get("url")  # depends on D-ID response
    return _wait_for_video(video_id)  # depends on D-ID response


def _wait_for_video(talk_id: str) -> str:
    status_url = f"{DID_BASE}/talks/{talk_id}"

    for _ in range(40):
        r = requests.get(status_url, headers=headers, timeout=60)
        r.raise_for_status()
        data = r.json()

        if data["status"] == "done":
            return data["result_url"]

        if data["status"] == "error":
            raise RuntimeError(f"D-ID processing error: {data}")

        time.sleep(2)

    raise TimeoutError("Avatar generation timed out")