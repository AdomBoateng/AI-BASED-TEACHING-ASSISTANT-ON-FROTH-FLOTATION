from anthropic import Anthropic
import os

from app.config import load_env

load_env()
api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    raise RuntimeError("Missing ANTHROPIC_API_KEY environment variable.")
client = Anthropic(api_key=api_key)

def get_mode_config(mode: str):
    if mode == "learn":
        return {"temperature": 0.4, "max_tokens": 1000}
    elif mode == "practice":
        return {"temperature": 0.5, "max_tokens": 700}
    elif mode == "review":
        return {"temperature": 0.1, "max_tokens": 400}
    else:
        raise ValueError("Invalid mode")


async def generate_response(prompt: str, mode: str):
    config = get_mode_config(mode)

    response = client.messages.create(
        model="claude-opus-4-6",
        temperature=config["temperature"],
        max_tokens=config["max_tokens"],
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.content[0].text