from elevenlabs_tts import generate_tts
from did_test import create_avatar_video_from_audio

BASE_URL = "https://86e0196a8b01.ngrok-free.app"  # your ngrok URL

text = "The first move is what sets everything in motion."

audio_path = generate_tts(text, "speech.mp3")
audio_url = f"{BASE_URL}/audio/{audio_path.name}"

video_url = create_avatar_video_from_audio(audio_url)

print("Avatar video:", video_url)