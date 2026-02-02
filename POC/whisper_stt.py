from faster_whisper import WhisperModel
import torch
MODEL_SIZE = "small"

USE_GPU = torch.cuda.is_available()
DEVICE = "cuda" if USE_GPU else "cpu"
COMPUTE_TYPE = "float16" if USE_GPU else "int8"

print(f"Using device: {DEVICE} with compute type: {COMPUTE_TYPE}")

model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)


def transcribe(audio_path: str) -> str:
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        vad_filter=True
    )

    transcript = []
    for segment in segments:
        transcript.append(segment.text)
    
    return " ".join(transcript)

