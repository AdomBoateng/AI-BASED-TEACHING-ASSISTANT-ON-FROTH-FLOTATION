import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

DID_API_URL = "https://api.d-id.com/talks"
DID_API_KEY = os.getenv("DID_API_KEY")

PRESENTER_ID = "amy"

HEADERS = {
    "Authorization": f"Basic {DID_API_KEY}",
    "Content-Type": "application/json",
}


def create_avatar_video_from_audio(audio_url: str) -> str:
    payload = {
        "presenter_id": PRESENTER_ID,
        "script": {
            "type": "audio",
            "audio_url": audio_url,
        },
        "config": {
            "fluent": True,
            "pad_audio": 0.5,
            "stitch": True,         # Natural buffer for the teacher's speech
            "result_format": "mp4",
        },
    }

    response = requests.post(
        DID_API_URL,
        headers=HEADERS,
        json=payload,
        timeout=30,
    )

    if response.status_code != 201:
        raise RuntimeError(
            f"D-ID error [{response.status_code}]: {response.text}"
        )

    talk_id = response.json()["id"]
    return _wait_for_video(talk_id)


def _wait_for_video(talk_id: str) -> str:
    status_url = f"{DID_API_URL}/{talk_id}"

    for _ in range(40):
        r = requests.get(status_url, headers=HEADERS)
        r.raise_for_status()
        data = r.json()

        if data["status"] == "done":
            return data["result_url"]

        if data["status"] == "error":
            raise RuntimeError(f"D-ID processing error: {data}")

        time.sleep(2)

    raise TimeoutError("Avatar generation timed out")