from anthropic import Anthropic
import os
from typing import Dict, Optional

from app.config import load_env

load_env()

api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    raise RuntimeError("Missing ANTHROPIC_API_KEY environment variable.")

client = Anthropic(api_key=api_key)

MODEL_NAME = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-6")


def get_mode_config(mode: str, task: str = "chat") -> Dict[str, float | int]:
    """
    task:
      - "chat": normal tutoring response (learn flow)
      - "generate": create structured JSON items/scenarios (practice/review)
      - "evaluate": grading/evaluation JSON (practice/review evaluation)
    """

    mode = (mode or "").lower().strip()
    task = (task or "chat").lower().strip()

    if mode == "learn":
        # learn responses can be longer, but not massive
        if task == "chat":
            return {"temperature": 0.4, "max_tokens": 1200}
        if task == "generate":
            return {"temperature": 0.3, "max_tokens": 900}
        if task == "evaluate":
            return {"temperature": 0.1, "max_tokens": 500}

    if mode == "practice":
        # PRACTICE GENERATION is where truncation happens → give it room
        if task == "generate":
            return {"temperature": 0.4, "max_tokens": 1400}
        # practice chat prompt (scenario text / question)
        if task == "chat":
            return {"temperature": 0.4, "max_tokens": 900}
        # evaluation should be short and strict JSON
        if task == "evaluate":
            return {"temperature": 0.1, "max_tokens": 600}

    if mode == "review":
        # review items are smaller, but still can need room (MCQ + options)
        if task == "generate":
            return {"temperature": 0.2, "max_tokens": 900}
        # review prompts are usually small
        if task == "chat":
            return {"temperature": 0.1, "max_tokens": 500}
        # grading JSON should be short
        if task == "evaluate":
            return {"temperature": 0.1, "max_tokens": 650}

    raise ValueError(f"Invalid mode/task combination: mode={mode}, task={task}")


def generate_response(prompt: str, mode: str, task: str = "chat") -> str:
    """
    Synchronous call (Anthropic SDK is sync here).
    Keep function sync to avoid confusing 'async def' that isn't awaited properly.
    """
    cfg = get_mode_config(mode, task)

    resp = client.messages.create(
        model=MODEL_NAME,
        temperature=cfg["temperature"],
        max_tokens=cfg["max_tokens"],
        messages=[{"role": "user", "content": prompt}],
    )

    return resp.content[0].text
