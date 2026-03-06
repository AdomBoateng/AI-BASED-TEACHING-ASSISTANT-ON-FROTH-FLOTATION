import json
from typing import List, Dict, Any, Tuple, Union

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

    json_match = re.search(r"```(?:json)?\s*({.*?})\s*```", text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find JSON object anywhere in the text
    json_match = re.search(r"{[^{}]*(?:{[^{}]*}[^{}]*)*}", text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"Could not extract valid JSON from model output. Got: {text[:200]}"
    )


def _json_only(text: str) -> Dict[str, Any]:
    return _safe_json_loads(text)


def adjust_difficulty(current: str | None, score: float) -> str:
    levels = ["Basic", "Intermediate", "Advanced"]
    cur = current if current in levels else "Basic"
    i = levels.index(cur)

    if score >= 0.85 and i < 2:
        i += 1
    elif score <= 0.60 and i > 0:
        i -= 1
    return levels[i]


async def generate_practice_scenario(
    memory: List[str] | None = None,
) -> Tuple[Dict[str, Any], List[str]]:
    seed = "Generate a structured froth flotation practice scenario in JSON."

    contexts = await retrieve_context(query=seed, mode="practice", top_k=6)

    prompt = f"""
You are generating a structured PRACTICE scenario for froth flotation.

Output JSON ONLY in this schema:
{{
  "scenario_id": "PRAC-XXXX",
  "title": "short title",
  "difficulty": "Basic|Intermediate|Advanced",
  "situation": "industrial/plant scenario",
  "available_data": ["...", "..."],
  "guided_questions": ["Q1", "Q2", "Q3"],
  "expected_elements": [
    ["elements expected in Q1 answer"],
    ["elements expected in Q2 answer"],
    ["elements expected in Q3 answer"]
  ],
  "key_learning_points": ["...", "..."]
}}

Rules:
- Use ONLY information supported by REFERENCE MATERIAL.
- Do NOT invent numerical values unless present in REFERENCE MATERIAL.
- guided_questions must be EXACTLY 3.
- expected_elements must match length 3.
- Do not include answers.
- Return ONLY raw JSON. Do NOT wrap in ``` fences. Do NOT include any extra text.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
    raw = await generate_response(prompt=prompt, mode="practice")
    scenario = _json_only(raw)
    return scenario, contexts


def format_practice_prompt(scenario: Dict[str, Any], step: int) -> str:
    idx = step - 1
    data_lines = "\n".join([f"- {x}" for x in scenario.get("available_data", [])])
    question = scenario["guided_questions"][idx]

    return (
        f"### PRACTICE SCENARIO: {scenario.get('title','')}\n"
        f"Scenario ID: {scenario.get('scenario_id','')}\n"
        f"Difficulty: {scenario.get('difficulty','')}\n\n"
        f"**SITUATION:**\n{scenario.get('situation','')}\n\n"
        f"**Available Data:**\n{data_lines}\n\n"
        f"**Guided Question {step}:**\n{question}\n"
    )


async def evaluate_practice_answer(
    scenario: Dict[str, Any],
    step: int,
    student_answer: str,
    contexts: List[str],
) -> Dict[str, Any]:
    idx = step - 1
    question = scenario["guided_questions"][idx]
    expected = scenario["expected_elements"][idx]
    reference = "\n\n".join(contexts)
    expected_block = "\n".join([f"- {x}" for x in expected])

    prompt = f"""
You are evaluating a student's PRACTICE answer on froth flotation.

Question:
{question}

Student Answer:
{student_answer}

Expected elements:
{expected_block}

REFERENCE MATERIAL:
{reference}

Rules:
- Grade ONLY using the reference material.
- List unsupported claims if the student goes beyond the reference.
- Output JSON ONLY:
{{
  "verdict": "correct|partial|incorrect",
  "score": 0.0,
  "feedback": "short clear feedback",
  "missing_points": ["..."],
  "unsupported_claims": ["..."]
}}
- Return ONLY raw JSON. Do NOT wrap in ``` fences. Do NOT include any extra text.
"""
    raw = await generate_response(prompt=prompt, mode="review")  # deterministic
    return _json_only(raw)


async def generate_review_question(
    memory: List[str] | None = None, difficulty: str = "Basic"
) -> Tuple[Dict[str, Any], List[str]]:
    seed = f"Generate a structured froth flotation assessment question ({difficulty}) in JSON."
    contexts = await retrieve_context(query=seed, mode="review", top_k=6)

    prompt = f"""
You are generating a structured REVIEW assessment question.

Output JSON ONLY:
{{
  "question_id": "REV-XXXX",
  "difficulty": "Basic|Intermediate|Advanced",
  "category": "Surface Chemistry|Reagents|Process Variables|Troubleshooting",
  "question_type": "ShortAnswer",
  "question": "..."
}}

Rules:
- Make difficulty = "{difficulty}" (or closest).
- Base content ONLY on REFERENCE MATERIAL.
- Do NOT include the answer.
- Do NOT include grading.
- Return ONLY raw JSON. Do NOT wrap in ``` fences. Do NOT include any extra text.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
    raw = await generate_response(prompt=prompt, mode="review")
    qobj = _json_only(raw)
    return qobj, contexts


def format_review_prompt(qobj: Dict[str, Any]) -> str:
    return (
        f"### REVIEW ASSESSMENT\n"
        f"Question ID: {qobj.get('question_id','')}\n"
        f"Difficulty Level: {qobj.get('difficulty','')}\n"
        f"Category: {qobj.get('category','')}\n"
        f"Question Type: {qobj.get('question_type','ShortAnswer')}\n\n"
        f"**Question:**\n{qobj.get('question','')}\n"
    )


async def evaluate_review_answer(
    qobj: Dict[str, Any],
    student_answer: str,
    contexts: List[str],
) -> Dict[str, Any]:
    reference = "\n\n".join(contexts)

    prompt = f"""
You are grading a REVIEW answer on froth flotation.

Question:
{qobj.get('question','')}

Student Answer:
{student_answer}

REFERENCE MATERIAL:
{reference}

Rubric bands:
- Excellent (0.90–1.00)
- Good (0.75–0.89)
- Satisfactory (0.60–0.74)
- Needs Improvement (0.40–0.59)
- Unsatisfactory (0.00–0.39)

Rules:
- Grade ONLY using reference material.
- Output JSON ONLY:
{{
  "verdict": "correct|partial|incorrect",
  "score": 0.0,
  "rubric_level": "Excellent|Good|Satisfactory|Needs Improvement|Unsatisfactory",
  "feedback": "...",
  "missing_points": ["..."],
  "unsupported_claims": ["..."]
}}
- Return ONLY raw JSON. Do NOT wrap in ``` fences. Do NOT include any extra text.
"""
    raw = await generate_response(prompt=prompt, mode="review")
    return _json_only(raw)


async def query_rag(
    user_message: str, mode: str, memory: List[str] | None = None, top_k: int = 5
) -> Union[Dict[str, Any], Dict[str, str]]:
    """
    Query-time RAG:
    1) retrieve context from Pinecone (mode-aware namespace/filtering happens in retriever)
    2) build structured prompt (persona + domain + mode + memory + reference + user input)
    3) call Claude Opus with mode-specific config
    4) enforce JSON grading output for review mode
    """

    # 1️⃣ Retrieve context (Pinecone)
    context = await retrieve_context(query=user_message, mode=mode, top_k=top_k)

    # 2️⃣ Build prompt (your structured architecture)
    prompt = build_prompt(
        user_message=user_message, context=context, mode=mode, memory=memory
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
            raise ValueError(
                "Invalid feedback in review output (empty or not a string)."
            )

        return {
            "mode": mode,
            "verdict": verdict,
            "score": float(score),
            "feedback": feedback.strip(),
        }

    # 5️⃣ Learn/Practice normal response
    return {"mode": mode, "response": raw_output.strip()}
