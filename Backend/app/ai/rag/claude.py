# app/ai/rag/claude.py
from __future__ import annotations

import os
import asyncio
import random
from typing import Dict, Any

from anthropic import Anthropic
from anthropic._exceptions import OverloadedError, APIError, RateLimitError, APITimeoutError

from app.config import load_env

load_env()

api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    raise RuntimeError("Missing ANTHROPIC_API_KEY environment variable.")

MODEL_NAME = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-6")
client = Anthropic(api_key=api_key)


def get_mode_config(mode: str) -> Dict[str, Any]:
    mode = (mode or "").lower().strip()
    if mode == "learn":
        return {"temperature": 0.4, "max_tokens": 1000}
    if mode == "practice":
        return {"temperature": 0.5, "max_tokens": 1200}
    if mode == "review":
        return {"temperature": 0.1, "max_tokens": 400}
    raise ValueError("Invalid mode")


async def _call_anthropic(prompt: str, mode: str) -> str:
    """Run blocking SDK call in a worker thread."""
    config = get_mode_config(mode)

    def _blocking():
        resp = client.messages.create(
            model=MODEL_NAME,
            temperature=config["temperature"],
            max_tokens=config["max_tokens"],
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text

    return await asyncio.to_thread(_blocking)


async def generate_response(prompt: str, mode: str) -> str:
    """
    Safe Claude call with retries for transient outages/overload.
    Retries: 529 overloaded, 429 rate limit, timeouts, and some API errors.
    """
    max_attempts = int(os.getenv("ANTHROPIC_MAX_RETRIES", "4"))
    base_delay = float(os.getenv("ANTHROPIC_RETRY_BASE_DELAY", "0.8"))  # seconds

    last_err: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            return await _call_anthropic(prompt, mode)
        except (OverloadedError, RateLimitError, APITimeoutError, APIError) as e:
            last_err = e

            # exponential backoff + jitter
            sleep_s = base_delay * (2 ** (attempt - 1))
            sleep_s += random.uniform(0, 0.25)

            # last attempt -> re-raise
            if attempt == max_attempts:
                raise

            await asyncio.sleep(sleep_s)

    # should never reach, but defensive
    raise last_err or RuntimeError("Anthropic call failed")