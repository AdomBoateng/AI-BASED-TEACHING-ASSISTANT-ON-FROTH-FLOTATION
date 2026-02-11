import json
from typing import List, Dict, Any, Union

from .retriever import retrieve_context
from .prompt_builder import build_prompt
from .claude import generate_response


def _safe_json_loads(text: str) -> Dict[str, Any]:
    """
    Extract and parse JSON from model output.
    Handles cases where model includes text before/after JSON.
    """
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON from markdown code blocks
    import re
    json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    
    # Try to find JSON object anywhere in the text
    json_match = re.search(r'{[^{}]*(?:{[^{}]*}[^{}]*)*}', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass
    
    raise ValueError(f"Could not extract valid JSON from model output. Got: {text[:200]}")


async def query_rag(
    user_message: str,
    mode: str,
    memory: List[str] | None = None,
    top_k: int = 5
) -> Union[Dict[str, Any], Dict[str, str]]:
    """
    Query-time RAG:
    1) retrieve context from Pinecone (mode-aware namespace/filtering happens in retriever)
    2) build structured prompt (persona + domain + mode + memory + reference + user input)
    3) call Claude Opus with mode-specific config
    4) enforce JSON grading output for review mode
    """

    # 1️⃣ Retrieve context (Pinecone)
    context = retrieve_context(query=user_message, mode=mode, top_k=top_k)

    # 2️⃣ Build prompt (your structured architecture)
    prompt = build_prompt(
        user_message=user_message,
        context=context,
        mode=mode,
        memory=memory
    )

    # 3️⃣ Call Claude Opus
    raw_output = await generate_response(prompt=prompt, mode=mode)

    # 4️⃣ Enforce structured output for review mode
    if mode == "review":
        grading = _safe_json_loads(raw_output)

        # Optional guardrails on the schema
        verdict = grading.get("verdict")
        score = grading.get("score")
        feedback = grading.get("feedback")

        if verdict not in ("correct", "partial", "incorrect"):
            raise ValueError(f"Invalid verdict in review output: {verdict}")

        # Score must be numeric between 0 and 1
        if not isinstance(score, (int, float)) or not (0 <= score <= 1):
            raise ValueError(f"Invalid score in review output: {score}")

        if not isinstance(feedback, str) or not feedback.strip():
            raise ValueError("Invalid feedback in review output (empty or not a string).")

        return {
            "mode": mode,
            "verdict": verdict,
            "score": float(score),
            "feedback": feedback.strip()
        }

    # 5️⃣ Learn/Practice normal response
    return {
        "mode": mode,
        "response": raw_output.strip()
    }

    
    