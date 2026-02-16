# app/mode_sessions/service.py
import json
import re
from typing import Any, Dict, List, Tuple, Optional, Callable, Awaitable

from app.ai.rag.claude import generate_response
from app.ai.rag.retriever import retrieve_context


# -------------------------
# JSON Robust Utilities
# -------------------------

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL | re.IGNORECASE)

def _strip_fences(text: str) -> str:
    raw = (text or "").strip()
    m = _JSON_FENCE_RE.search(raw)
    if m:
        raw = m.group(1).strip()
    return raw

def _extract_first_object(raw: str) -> Optional[str]:
    """
    Best-effort extraction of the first top-level JSON object using brace balancing.
    Returns None if it appears truncated.
    """
    raw = (raw or "").strip()
    start = raw.find("{")
    if start == -1:
        return None

    depth = 0
    in_str = False
    esc = False

    for i in range(start, len(raw)):
        ch = raw[i]

        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue

        if ch == '"':
            in_str = True
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return raw[start:i+1]

    return None  # likely truncated

async def safe_parse_json_with_retry(
    text: str,
    regenerate_json_fn: Optional[Callable[[], Awaitable[str]]] = None,
    label: str = "json",
) -> Dict[str, Any]:
    """
    Robust JSON parsing:
      - Handles fenced JSON
      - Handles extra text around JSON by extracting first {...}
      - If invalid/truncated and regenerate_json_fn provided: retries once
    """
    raw = _strip_fences(text)

    # 1) direct parse
    try:
        return json.loads(raw)
    except Exception:
        pass

    # 2) extract first object
    obj = _extract_first_object(raw)
    if obj:
        try:
            return json.loads(obj)
        except Exception:
            pass

    # 3) retry once (helps when model truncates output)
    if regenerate_json_fn is not None:
        retry_text = await regenerate_json_fn()
        raw2 = _strip_fences(retry_text)

        try:
            return json.loads(raw2)
        except Exception:
            obj2 = _extract_first_object(raw2)
            if obj2:
                try:
                    return json.loads(obj2)
                except Exception as e:
                    raise ValueError(f"Invalid {label} JSON after retry: {e}\nRaw:\n{retry_text}")

        raise ValueError(f"Invalid {label} JSON after retry.\nRaw:\n{retry_text}")

    raise ValueError(f"Invalid {label} JSON.\nRaw:\n{text}")


# -------------------------
# Difficulty
# -------------------------

def adjust_difficulty(current: str, score: float) -> str:
    levels = ["Basic", "Intermediate", "Advanced"]
    current = (current or "").strip().title()
    if current not in levels:
        current = "Basic"
    idx = levels.index(current)

    if score >= 0.85 and idx < 2:
        idx += 1
    elif score <= 0.60 and idx > 0:
        idx -= 1

    return levels[idx]


# -------------------------
# Small helpers to reduce truncation
# -------------------------

def _ensure_three_guided_questions(scenario: Dict[str, Any]) -> None:
    gq = scenario.get("guided_questions") or []
    if not isinstance(gq, list):
        raise ValueError("Scenario invalid: guided_questions must be a list")

    # Normalize to exactly 3
    if len(gq) < 3:
        raise ValueError("Scenario invalid: guided_questions must contain EXACTLY 3 questions")
    scenario["guided_questions"] = gq[:3]

def _ensure_expected_elements_shape(scenario: Dict[str, Any]) -> None:
    ee = scenario.get("expected_elements") or []
    if not isinstance(ee, list):
        raise ValueError("Scenario invalid: expected_elements must be a list")

    if len(ee) < 3:
        raise ValueError("Scenario invalid: expected_elements must be length 3 (one list per guided question)")
    scenario["expected_elements"] = ee[:3]

    # Ensure each inner list is short phrases
    for i in range(3):
        inner = scenario["expected_elements"][i]
        if not isinstance(inner, list):
            scenario["expected_elements"][i] = []
            inner = scenario["expected_elements"][i]

        # keep 3-5 bullets max
        inner = inner[:5]
        # shorten bullets (avoid paragraphs)
        cleaned = []
        for b in inner:
            s = str(b)
            s = re.sub(r"\s+", " ", s).strip()
            # hard cap length
            if len(s) > 120:
                s = s[:120].rsplit(" ", 1)[0] + "..."
            cleaned.append(s)
        scenario["expected_elements"][i] = cleaned


# -------------------------
# REVIEW GENERATORS
# -------------------------

async def generate_review_item(session_type: str, difficulty: str) -> Tuple[Dict[str, Any], List[str]]:
    session_type = (session_type or "").lower().strip()
    difficulty = (difficulty or "").strip().title() or "Basic"

    seed = f"Froth flotation review assessment question type={session_type}, difficulty={difficulty}"
    contexts = retrieve_context(query=seed, mode="review", top_k=6)

    if session_type == "mcq":
        prompt = f"""
You are generating a structured MCQ (objectives) review question for froth flotation.

Return ONLY raw JSON (no markdown, no fences, no extra text) in this schema:
{{
  "type": "mcq",
  "question_id": "REV-MCQ-XXXX",
  "difficulty": "{difficulty}",
  "category": "Surface Chemistry|Reagents|Process Variables|Troubleshooting",
  "question": "string",
  "options": {{"A":"...", "B":"...", "C":"...", "D":"..."}}
}}

Rules:
- Base content ONLY on REFERENCE MATERIAL.
- Do NOT include the answer.
- Options must be clearly distinct.
- Keep wording exam-like and concise.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
        raw = generate_response(prompt=prompt, mode="review", task="generate")
        item = await safe_parse_json_with_retry(
            raw,
            regenerate_json_fn=lambda: generate_response(
                prompt=prompt + "\n\nIMPORTANT: Output ONLY complete raw JSON. Do NOT wrap in markdown. Ensure it is COMPLETE.",
                mode="review", task="generate"
            ),
            label="review_mcq"
        )
        return item, contexts

    if session_type == "fill_blank":
        prompt = f"""
Generate a fill-in-the-blank review item for froth flotation.

Return ONLY raw JSON (no markdown) in this schema:
{{
  "type": "fill_blank",
  "item_id": "REV-FB-XXXX",
  "difficulty": "{difficulty}",
  "category": "Surface Chemistry|Reagents|Process Variables|Troubleshooting",
  "sentence_with_blank": "A sentence with ____ as the blank"
}}

Rules:
- Base ONLY on REFERENCE MATERIAL.
- Do NOT include the answer.
- Use exactly ONE blank (____).
- Keep it short.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
        raw = generate_response(prompt=prompt, mode="review", task="generate")
        item = await safe_parse_json_with_retry(
            raw,
            regenerate_json_fn=lambda: generate_response(
                prompt=prompt + "\n\nIMPORTANT: Output ONLY complete raw JSON, no markdown, no extra text.",
                mode="review", task="generate"
            ),
            label="review_fill_blank"
        )
        return item, contexts

    if session_type == "flashcard":
        prompt = f"""
Generate a flashcard review item for froth flotation.

Return ONLY raw JSON (no markdown) in this schema:
{{
  "type": "flashcard",
  "card_id": "REV-FC-XXXX",
  "difficulty": "{difficulty}",
  "front": "Concept/question prompt",
  "expected_points": ["point1", "point2", "point3"]
}}

Rules:
- Base ONLY on REFERENCE MATERIAL.
- expected_points must be 3-5 SHORT bullets (max 12 words each).
- Do NOT include a model answer paragraph.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
        raw = generate_response(prompt=prompt, mode="review", task="generate")
        item = await safe_parse_json_with_retry(
            raw,
            regenerate_json_fn=lambda: generate_response(
                prompt=prompt + "\n\nIMPORTANT: Output ONLY complete raw JSON, no markdown.",
                mode="review"
            ),
            label="review_flashcard"
        )
        return item, contexts

    # default: short_answer
    prompt = f"""
Generate a short-answer review question for froth flotation.

Return ONLY raw JSON (no markdown) in this schema:
{{
  "type": "short_answer",
  "question_id": "REV-SA-XXXX",
  "difficulty": "{difficulty}",
  "category": "Surface Chemistry|Reagents|Process Variables|Troubleshooting",
  "question": "string",
  "expected_points": ["point1", "point2", "point3"]
}}

Rules:
- Base ONLY on REFERENCE MATERIAL.
- expected_points should be 3-6 SHORT bullets (max 12 words each).
- Do NOT include the answer.
- Keep wording exam-like and concise.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
    raw = generate_response(prompt=prompt, mode="review", task="generate")
    item = await safe_parse_json_with_retry(
        raw,
        regenerate_json_fn=lambda: generate_response(
            prompt=prompt + "\n\nIMPORTANT: Output ONLY complete raw JSON, no markdown.",
            mode="review", task="generate"
        ),
        label="review_short_answer"
    )
    return item, contexts


async def evaluate_review_answer(item: Dict[str, Any], student_answer: str, contexts: List[str]) -> Dict[str, Any]:
    reference = "\n\n".join(contexts)
    itype = item.get("type")

    if itype == "mcq":
        qtext = item["question"]
        options = item["options"]
        qblock = qtext + "\nOptions:\n" + "\n".join([f"{k}) {v}" for k, v in options.items()])
    elif itype == "fill_blank":
        qblock = item["sentence_with_blank"]
    elif itype == "flashcard":
        qblock = item["front"]
    else:
        qblock = item.get("question", "")

    expected_points = item.get("expected_points", [])

    prompt = f"""
You are grading a student's REVIEW answer on froth flotation.

Item Type: {itype}
Prompt/Question:
{qblock}

Student Answer:
{student_answer}

Expected points (if provided):
{json.dumps(expected_points)}

REFERENCE MATERIAL:
{reference}

Rubric bands:
- Excellent (0.90–1.00)
- Good (0.75–0.89)
- Satisfactory (0.60–0.74)
- Needs Improvement (0.40–0.59)
- Unsatisfactory (0.00–0.39)

Rules:
- Grade ONLY using REFERENCE MATERIAL.
- If answer includes claims not supported by reference, list them.
- If MCQ: student_answer may be A/B/C/D; infer correctness from reference.

Return ONLY raw JSON:
{{
  "verdict": "correct|partial|incorrect",
  "score": 0.0,
  "rubric_level": "Excellent|Good|Satisfactory|Needs Improvement|Unsatisfactory",
  "feedback": "clear concise feedback",
  "missing_points": ["..."],
  "unsupported_claims": ["..."],
  "correct_answer": "optional - include if MCQ or fill_blank"
}}
"""
    raw = generate_response(prompt=prompt, mode="review", task="evaluate")
    return await safe_parse_json_with_retry(raw, label="review_evaluation")


def format_review_prompt(item: Dict[str, Any]) -> str:
    itype = item.get("type")

    if itype == "mcq":
        opts = item["options"]
        opt_lines = "\n".join([f"{k}) {v}" for k, v in opts.items()])
        return (
            f"### REVIEW (MCQ)\n"
            f"Question ID: {item.get('question_id','')}\n"
            f"Difficulty: {item.get('difficulty','')}\n"
            f"Category: {item.get('category','')}\n\n"
            f"**Question:**\n{item['question']}\n\n"
            f"**Options:**\n{opt_lines}\n"
            f"\nReply with A, B, C, or D."
        )

    if itype == "fill_blank":
        return (
            f"### REVIEW (Fill-in)\n"
            f"Item ID: {item.get('item_id','')}\n"
            f"Difficulty: {item.get('difficulty','')}\n"
            f"Category: {item.get('category','')}\n\n"
            f"**Fill the blank:**\n{item['sentence_with_blank']}\n"
        )

    if itype == "flashcard":
        return (
            f"### REVIEW (Flashcard)\n"
            f"Card ID: {item.get('card_id','')}\n"
            f"Difficulty: {item.get('difficulty','')}\n\n"
            f"**Front:**\n{item['front']}\n"
            f"\nExplain the concept in your own words."
        )

    return (
        f"### REVIEW (Short Answer)\n"
        f"Question ID: {item.get('question_id','')}\n"
        f"Difficulty: {item.get('difficulty','')}\n"
        f"Category: {item.get('category','')}\n\n"
        f"**Question:**\n{item.get('question','')}\n"
    )


# -------------------------
# PRACTICE GENERATORS
# -------------------------

async def generate_practice_scenario(session_type: str, difficulty: str) -> Tuple[Dict[str, Any], List[str]]:
    session_type = (session_type or "").lower().strip()
    difficulty = (difficulty or "").strip().title() or "Basic"

    seed = f"Froth flotation practice scenario type={session_type}, difficulty={difficulty}"
    contexts = retrieve_context(query=seed, mode="practice", top_k=6)

    prompt = f"""
You are generating a structured PRACTICE scenario for froth flotation.
Session type: {session_type}
Difficulty: {difficulty}

Return ONLY raw JSON (no markdown, no fences, no extra text) in this schema:
{{
  "type": "{session_type}",
  "scenario_id": "PRAC-XXXX",
  "title": "short title",
  "difficulty": "{difficulty}",
  "situation": "immersive narrative or plant scenario (max 140 words)",
  "available_data": ["...", "..."],
  "guided_questions": ["Q1", "Q2", "Q3"],
  "expected_elements": [
    ["short bullet", "short bullet", "short bullet"],
    ["short bullet", "short bullet", "short bullet"],
    ["short bullet", "short bullet", "short bullet"]
  ],
  "key_learning_points": ["short point", "short point"]
}}

Rules:
- Base all technical facts ONLY on REFERENCE MATERIAL.
- guided_questions MUST be EXACTLY 3.
- expected_elements MUST be length 3, each inner list 3–5 SHORT bullets.
- Each expected bullet MUST be <= 16 words. NO long sentences. NO paragraphs.
- Avoid inventing numeric values unless present in REFERENCE MATERIAL.
- Keep output concise to avoid truncation.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
    raw = generate_response(prompt=prompt, mode="practice", task="generate")
    scenario = await safe_parse_json_with_retry(
        raw,
        regenerate_json_fn=lambda: generate_response(
            prompt=prompt + "\n\nIMPORTANT: Output ONLY COMPLETE raw JSON (no markdown). Keep it concise. Ensure all strings are closed.",
            mode="practice", task="generate"
        ),
        label="practice_scenario"
    )

    # Normalize/validate
    scenario["type"] = session_type
    scenario["difficulty"] = difficulty
    _ensure_three_guided_questions(scenario)
    _ensure_expected_elements_shape(scenario)
    _ensure_expected_elements_shape(scenario)  # runs bullet shortening

    return scenario, contexts


async def evaluate_practice_answer(
    scenario: Dict[str, Any],
    step: int,
    student_answer: str,
    contexts: List[str]
) -> Dict[str, Any]:
    reference = "\n\n".join(contexts)
    idx = step - 1

    question = scenario["guided_questions"][idx]
    expected = scenario["expected_elements"][idx]
    expected_block = "\n".join([f"- {x}" for x in expected])

    prompt = f"""
You are evaluating a student's PRACTICE answer on froth flotation.

Scenario:
{scenario.get('situation','')}

Guided Question {step}:
{question}

Student Answer:
{student_answer}

Expected elements:
{expected_block}

REFERENCE MATERIAL:
{reference}

Rules:
- Grade ONLY using REFERENCE MATERIAL.
- Be supportive and corrective.
- List unsupported claims if the student goes beyond reference.

Return ONLY raw JSON:
{{
  "verdict": "correct|partial|incorrect",
  "score": 0.0,
  "feedback": "short clear feedback",
  "missing_points": ["..."],
  "unsupported_claims": ["..."]
}}
"""
    raw = generate_response(prompt=prompt, mode="review", task="evaluate")
    return await safe_parse_json_with_retry(raw, label="practice_evaluation")


def format_practice_prompt(scenario: Dict[str, Any], step: int) -> str:
    idx = step - 1
    data_lines = "\n".join([f"- {x}" for x in scenario.get("available_data", [])])
    q = scenario["guided_questions"][idx]

    return (
        f"### PRACTICE ({scenario.get('type','')})\n"
        f"Scenario ID: {scenario.get('scenario_id','')}\n"
        f"Title: {scenario.get('title','')}\n"
        f"Difficulty: {scenario.get('difficulty','')}\n\n"
        f"**SITUATION:**\n{scenario.get('situation','')}\n\n"
        f"**Available Data:**\n{data_lines}\n\n"
        f"**Guided Question {step}:**\n{q}\n"
    )
