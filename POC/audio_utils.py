import sounddevice as sd
from scipy.io.wavfile import write
from datetime import datetime
from pathlib import Path

AUDIO_DIR = Path("recordings")
AUDIO_DIR.mkdir(exist_ok=True)

SAMPLE_RATE = 16000  # Sample rate in Hz

def record_audio(duration=5) -> Path:
    print(f"Recording for {duration} seconds...")
    
    try:
        recording = sd.rec(
            int(duration * SAMPLE_RATE), 
            samplerate=SAMPLE_RATE, 
            channels=1,
            dtype='int16'
        )
        sd.wait()
    except Exception as e:
        raise RuntimeError(f"An error occurred while recording audio: {e}")
    
    file_path = AUDIO_DIR / f"recording_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
    write(file_path, SAMPLE_RATE, recording)
    print("Recording complete.")
    print(f"Recording saved to {file_path}")
    return file_path

